import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import { spawn, execSync } from 'child_process';
import pty from 'node-pty';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getSetting, setSetting, getAllSettings,
  getRecentDirs, addRecentDir, removeRecentDir,
  getSessions, getSession, upsertSession, deleteSession, trashSession,
  getBlocks, insertBlock, updateBlock, deleteBlock, clearBlocks
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Map of active terminal sessions
// sessionId -> { process, currentDir }
const activeSessions = new Map();
const activePreviewSessions = new Map();

// Helper to clean output
const PATH_TOKEN_START = '__PATH__:';
const CMD_END_TOKEN = '__CMD_END_TOKEN__';
const CONTROL_UI_PORT = Number(process.env.ATHENA_UI_PORT || 4310);
const CONTROL_API_PORT = Number(process.env.ATHENA_BACKEND_PORT || 4311);
const SESSION_PREVIEW_PORT_BASE = 6100;
const SESSION_PREVIEW_PORT_SPAN = 700;

const AGENT_CLI_COMMANDS = {
  Codex: {
    binary: 'codex',
    args: (prompt, projectDir, model) => [
      '--no-alt-screen',
      ...(model ? ['-m', model] : []),
      '-C',
      projectDir,
      prompt
    ]
  },
  'Gemini-CLI': {
    binary: 'gemini',
    args: (prompt, _projectDir, model) => [
      ...(model ? ['-m', model] : []),
      prompt
    ]
  },
  'Claude-Code': {
    binary: 'claude',
    args: (prompt, _projectDir, model) => [
      ...(model ? ['--model', model] : []),
      prompt
    ]
  },
  'Qwen-CLI': {
    binary: 'qwen',
    args: (prompt, _projectDir, model) => [
      ...(model ? ['-m', model] : []),
      prompt
    ]
  }
};

function getSessionFolderName(session) {
  const base = String(session.name || session.id || 'agent-session')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'agent-session';
  const suffix = String(session.id || 'session').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(-24);
  return `${base}-${suffix}`;
}

function ensureSessionWorkspace(session, workspaceOverride = '') {
  const workspaceDir = getSetting('workspace_dir') || workspaceOverride;
  if (!workspaceDir) return session;

  const sandboxDir = path.join(workspaceDir, 'Aetheris', 'Sandbox');
  const defaultProjectDir = path.join(sandboxDir, getSessionFolderName(session));
  const projectRelativePath = session.projectDir ? path.relative(sandboxDir, session.projectDir) : '';
  const projectDirInsideSandbox = projectRelativePath
    && !projectRelativePath.startsWith('..')
    && !path.isAbsolute(projectRelativePath);
  const projectDir = projectDirInsideSandbox ? session.projectDir : defaultProjectDir;
  fs.mkdirSync(projectDir, { recursive: true });

  const currentRelativePath = session.currentDir ? path.relative(projectDir, session.currentDir) : '';
  const currentDirInsideProject = currentRelativePath && !currentRelativePath.startsWith('..') && !path.isAbsolute(currentRelativePath);
  const currentDir = session.currentDir && currentDirInsideProject && fs.existsSync(session.currentDir)
    ? session.currentDir
    : projectDir;
  const ensured = { ...session, projectDir, currentDir };

  if (ensured.projectDir !== session.projectDir || ensured.currentDir !== session.currentDir) {
    upsertSession(ensured);
  }

  return ensured;
}

function getSessionPreviewPort(sessionId) {
  const hash = String(sessionId || 'session').split('').reduce((value, char) => {
    return ((value * 31) + char.charCodeAt(0)) >>> 0;
  }, 7);

  return SESSION_PREVIEW_PORT_BASE + (hash % SESSION_PREVIEW_PORT_SPAN);
}

function getAgentPrompt(session, prompt) {
  const projectDir = session.projectDir || session.currentDir;
  const previewPort = getSessionPreviewPort(session.id);
  
  // Compact single-line format for Windows compatibility
  const context = `[CONTEXT: ProjectDir=${projectDir}, PreviewPort=${previewPort}, ReservedPorts=${CONTROL_UI_PORT}/${CONTROL_API_PORT}]`;
  const cleanPrompt = String(prompt || '').replace(/\r?\n/g, ' ').trim();
  
  return `${context} User Prompt: ${cleanPrompt}`;
}

function getPreviewUrl(sessionId) {
  return `http://127.0.0.1:${getSessionPreviewPort(sessionId)}`;
}

function killProcessTree(child) {
  if (!child) return;

  try {
    if (process.platform === 'win32' && child.pid) {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    try {
      child.kill();
    } catch {}
  }
}

function getManagedPreviewStatus(sessionId) {
  const preview = activePreviewSessions.get(sessionId);
  if (!preview) {
    return {
      running: false,
      port: getSessionPreviewPort(sessionId),
      url: getPreviewUrl(sessionId),
      output: ''
    };
  }

  return {
    running: !preview.exited,
    port: preview.port,
    url: preview.url,
    output: preview.output,
    startedAt: preview.startedAt,
    exitCode: preview.exitCode ?? null
  };
}

function writeWrappedShellCommand(shellProc, command) {
  shellProc.stdin.write(`${command}; Write-Output "\`${PATH_TOKEN_START}$((Get-Location).Path)${CMD_END_TOKEN}"\r\n`);
}

function getCliPaths(binary) {
  try {
    const output = execSync(`where.exe ${binary}`, {
      timeout: 3000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return output
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getCliLaunch(cli, prompt, projectDir, model = '') {
  const paths = getCliPaths(cli.binary);
  console.log(`[CLI Discovery] Found paths for "${cli.binary}":`, paths);
  const executablePath = paths.find(candidate => candidate.toLowerCase().endsWith('.exe'));
  const cmdShimPath = paths.find(candidate => candidate.toLowerCase().endsWith('.cmd'));
  const resolvedPath = process.platform === 'win32'
    ? (cmdShimPath || executablePath || paths[0])
    : (executablePath || paths[0]);

  if (!resolvedPath) {
    console.error(`[CLI Discovery] Could not resolve binary: ${cli.binary}`);
    return null;
  }
  console.log(`[CLI Discovery] Resolved path: ${resolvedPath}`);

  if (process.platform === 'win32' && resolvedPath.toLowerCase().endsWith('.cmd')) {
    return {
      file: 'cmd.exe',
      args: ['/d', '/s', '/c', resolvedPath, ...cli.args(prompt, projectDir, model)],
      label: resolvedPath
    };
  }

  return {
    file: resolvedPath,
    args: cli.args(prompt, projectDir, model),
    label: resolvedPath
  };
}

function isCliAvailable(binary) {
  return getCliPaths(binary).length > 0;
}

function startAgentCli(session, cli, prompt, send, terminalSize = {}, model = '') {
  if (session.agentProcess) {
    send({
      type: 'error',
      output: '\r\nAn agent CLI task is already running in this session. Reply to it or wait for it to finish.\r\n\r\n',
      currentDir: session.currentDir,
      completed: true
    });
    return;
  }

  const projectDir = session.projectDir || session.currentDir;
  const previewPort = getSessionPreviewPort(session.id);
  const launch = getCliLaunch(cli, getAgentPrompt(session, prompt), projectDir, model);
  if (!launch) {
    send({
      type: 'error',
      output: `\r\n[Agent PTY] Could not resolve "${cli.binary}" on PATH.\r\n\r\n`,
      currentDir: session.currentDir,
      completed: true,
      agentRunning: false
    });
    return;
  }

  console.log(`[Agent PTY] Spawning: ${launch.file} ${launch.args.join(' ')}`);

  let child;
  try {
    child = pty.spawn(launch.file, launch.args, {
      cwd: projectDir,
      env: {
        ...process.env,
        ATHENA_SESSION_PROJECT_DIR: projectDir,
        ATHENA_SESSION_PREVIEW_PORT: String(previewPort),
        PORT: String(previewPort),
        BROWSER: 'none',
        TERM: 'xterm-256color'
      },
      name: 'xterm-256color',
      cols: Number(terminalSize.cols) || 100,
      rows: Number(terminalSize.rows) || 28
    });
  } catch (err) {
    console.error(`[Agent PTY] Spawn error:`, err);
    send({
      type: 'error',
      output: `\r\n[Agent PTY] Failed to start "${launch.label}": ${err.message}\r\n\r\n`,
      currentDir: session.currentDir,
      completed: true,
      agentRunning: false
    });
    return;
  }

  session.agentProcess = child;

  send({
    type: 'agent_state',
    agentRunning: true,
    output: `\r\n[Agent PTY] Started ${launch.label}${model ? ` with model ${model}` : ''}. Use the live terminal pane for realtime output and interactive keys.\r\n[Agent PTY] Session preview port: ${previewPort}. Athena control ports ${CONTROL_UI_PORT}/${CONTROL_API_PORT} are reserved.\r\n`,
    currentDir: session.currentDir,
    completed: false
  });

  child.onData((data) => {
    send({
      type: 'agent_pty_output',
      output: data,
      currentDir: session.currentDir,
      completed: false,
      agentRunning: true
    });
  });

  child.onExit(({ exitCode }) => {
    if (session.agentProcess === child) {
      session.agentProcess = null;
    }

    send({
      type: exitCode === 0 ? 'output' : 'error',
      output: `\r\n[Agent PTY] Process exited with code ${exitCode ?? 'unknown'}.\r\n`,
      currentDir: session.currentDir,
      completed: true,
      agentRunning: false
    });
  });
}

// Helper to parse LLM/Framework to simulated responses if no real API Key
const SIMULATED_AGENTS = {
  suggest: (prompt, llm, reviewer, framework) => {
    const p = prompt.toLowerCase().trim();
    let commands = [];
    let explanation = '';
    let explanationTH = '';
    let reasoning = [];

    // Define pipeline agents dynamically based on user selections
    const devAgent = llm;
    const reviewerAgent = reviewer || 'Gemini-CLI';
    const operatorAgent = framework || 'thclaws';

    // Dynamic headers based on chosen LLM/Framework
    const pipelineHeader = [
      `Write-Output "========================================================================="`,
      `Write-Output "  🤖 AETHERIS COGNITIVE PIPELINE: MULTI-AGENT COLLABORATION FLOW"`,
      `Write-Output "========================================================================="`,
      `Write-Output "  ✦ DEVELOPER AGENT  : ${devAgent} [Phase: Command Scaffolding & Writing]"`,
      `Write-Output "  ✦ REVIEWER AGENT   : ${reviewerAgent} [Phase: Syntax Audit & Safety Verification]"`,
      `Write-Output "  ✦ OPERATOR AGENT   : ${operatorAgent} [Phase: PTY Shell Sandboxed Execution]"`,
      `Write-Output "-------------------------------------------------------------------------"`
    ];

    let actualCommands = [];
    let taskName = '';
    let taskNameEN = '';

    if (p.includes('folder') || p.includes('โฟลเดอร์') || p.includes('mkdir')) {
      const match = prompt.match(/(?:folder|โฟลเดอร์)\s*ชื่อ?\s*([a-zA-Z0-9_-]+)/i) || prompt.match(/mkdir\s+([a-zA-Z0-9_-]+)/i);
      const name = match ? match[1] : 'my-agent-folder';
      taskName = `สร้างโฟลเดอร์ไดเรกทอรีชื่อ '${name}'`;
      taskNameEN = `Scaffold directory '${name}'`;
      actualCommands = [
        `mkdir "${name}"`,
        `cd "${name}"`,
        `Get-Item .`
      ];
      explanation = `Creates a new directory named '${name}', changes the current location into it, and displays its details.`;
      explanationTH = `สร้างโฟลเดอร์ใหม่ชื่อ '${name}' ย้ายตำแหน่งการทำงานเข้าไปในโฟลเดอร์นั้น และแสดงรายละเอียดของโฟลเดอร์`;
      reasoning = [
        `[DEVELOPER - ${devAgent}] วิเคราะห์และสังเคราะห์คำสั่งสร้างโฟลเดอร์: mkdir "${name}"`,
        `[REVIEWER - ${reviewerAgent}] ตรวจสอบความปลอดภัยชื่อโฟลเดอร์เพื่อป้องกัน Code Injection`,
        `[OPERATOR - ${operatorAgent}] ทำงานจริงบนเครื่องสับเปลี่ยนไดเรกทอรีด้วย cd และเรียก Get-Item ยืนยันผล`
      ];
    } else if (p.includes('file') || p.includes('ไฟล์') || p.includes('hello') || p.includes('เขียน') || p.includes('สร้างไฟล์')) {
      const match = prompt.match(/(?:file|ไฟล์)\s*ชื่อ?\s*([a-zA-Z0-9_.-]+)/i) || prompt.match(/(?:สร้างไฟล์|เขียนไฟล์)\s*([a-zA-Z0-9_.-]+)/i);
      const filename = match ? match[1] : 'hello.txt';
      taskName = `เขียนไฟล์ทดสอบระบบ '${filename}'`;
      taskNameEN = `Write system-test file '${filename}'`;
      actualCommands = [
        `New-Item -Path "${filename}" -Value "Hello from Aetheris AI Agentic OS! Created via ${llm} + ${framework} pipeline." -Force`,
        `Get-Content "${filename}"`
      ];
      explanation = `Creates a new file named '${filename}' with customized LLM pipeline metadata and reads its content.`;
      explanationTH = `สร้างไฟล์ใหม่ชื่อ '${filename}' พร้อมบันทึกข้อมูลเมตาดาต้าของรุ่น LLM/Framework ที่คุณเลือก และอ่านเนื้อหาออกมาแสดงผล`;
      reasoning = [
        `[DEVELOPER - ${devAgent}] เขียนโครงสร้างคำสั่ง New-Item พร้อมเตรียมข้อมูลข้อความต้อนรับ`,
        `[REVIEWER - ${reviewerAgent}] ตรวจสอบเนื้อหาไฟล์และสิทธิ์การเขียนไฟล์เพื่อหลีกเลี่ยงการเขียนทับระบบหลัก`,
        `[OPERATOR - ${operatorAgent}] รันคำสั่งเขียนลงดิสก์จริงและใช้ Get-Content โหลดข้อมูลขึ้นมาตรวจสอบ`
      ];
    } else if (p.includes('ip') || p.includes('network') || p.includes('เน็ต') || p.includes('ping')) {
      taskName = `ทดสอบการเชื่อมต่ออินเทอร์เน็ตและดูค่า IP`;
      taskNameEN = `Verify network connectivity and local IP adapters`;
      actualCommands = [
        `ipconfig`,
        `ping -n 3 8.8.8.8`
      ];
      explanation = `Checks the local network configuration and sends 3 ping packets to Google DNS to test internet connectivity.`;
      explanationTH = `ตรวจสอบการตั้งค่าเครือข่ายภายในเครื่อง และส่งแพ็กเก็ต Ping 3 ครั้งไปยัง Google DNS เพื่อทดสอบการเชื่อมต่ออินเทอร์เน็ต`;
      reasoning = [
        `[DEVELOPER - ${devAgent}] ร่างคำสั่งตรวจสอบเครือข่าย ipconfig และชุดทดสอบความเสถียร ICMP ping`,
        `[REVIEWER - ${reviewerAgent}] ตรวจสอบพารามิเตอร์ของ Ping เพื่อให้แน่ใจว่าไม่เกิดลูปค้าง (infinite loop) และไม่ระบุไอพีอันตราย`,
        `[OPERATOR - ${operatorAgent}] รันคำสั่งตรวจสอบการ์ดเน็ตเวิร์กและตรวจสอบความหน่วง Latency จริงของระบบเครือข่าย`
      ];
    } else if (p.includes('sys') || p.includes('เครื่อง') || p.includes('สเปค') || p.includes('cpu')) {
      taskName = `ตรวจสอบประสิทธิภาพทรัพยากรระบบปฏิบัติการ`;
      taskNameEN = `Query operating system specs and process loads`;
      actualCommands = [
        `Get-ComputerInfo | Select-Object OsName, OsVersion, CsSystemType`,
        `Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 ProcessName, CPU`
      ];
      explanation = `Retrieves system details (OS, Architecture) and lists the top 5 running processes consuming the most CPU.`;
      explanationTH = `ดึงข้อมูลระบบปฏิบัติการและสถาปัตยกรรมเครื่อง พร้อมแสดงโปรเซสที่กำลังทำงานและกินทรัพยากร CPU สูงสุด 5 อันดับแรก`;
      reasoning = [
        `[DEVELOPER - ${devAgent}] สังเคราะห์คำสั่งวัตถุระบบด้วย Get-ComputerInfo และ Get-Process เพื่อดูปริมาณโหลดของระบบ`,
        `[REVIEWER - ${reviewerAgent}] กรองผลลัพธ์คำสั่งเพื่อให้แน่ใจว่าจะไม่ไปดึงความลับคีย์ระบบหรือรหัสผ่านเครื่องออกมา`,
        `[OPERATOR - ${operatorAgent}] ยิงคำสั่งเข้าสู่ PowerShell ย่อย โหลดตาราง OS และจัดอันดับทราฟฟิกกระบวนการทำงาน`
      ];
    } else {
      // Custom task / custom code generation (like landing page or whatever prompt they typed!)
      taskName = `ประมวลผลเป้าหมายเฉพาะกิจ: "${prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}"`;
      taskNameEN = `Process custom goal: "${prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}"`;
      
      // If prompt contains "page" or "landing" or "web", write a beautiful page styled with Google colors inside the workspace!
      if (p.includes('page') || p.includes('landing') || p.includes('web') || p.includes('เว็บ') || p.includes('html') || p.includes('site')) {
        const folderName = 'aetheris-google-page';
        actualCommands = [
          `mkdir -Force "${folderName}"`,
          `Write-Output ">>> [SCAFFOLD] Creating web page directory: ${folderName}"`,
          `Write-Output ">>> [SCAFFOLD] Writing HTML/CSS/JS files via Node.js fs engine (bypassing PowerShell string limits)"`,
          `Write-Output ">>> [SCAFFOLD] Agents: DEV=${devAgent}, REV=${reviewerAgent}, OPS=${operatorAgent}"`,
          `Write-Output ">>> [SCAFFOLD] HTML scaffold written successfully to ${folderName}/index.html"`,
          `Write-Output ">>> [SCAFFOLD] Preview available from the local Athena backend workspace preview."`,
          `Write-Output ">>> [HTML GENERATOR SUCCESS] Web page creation pipeline complete!"`
        ];
        explanation = `Generates a beautiful Google-themed HTML landing page and writes it directly to the workspace directory using the Node.js file engine. Preview it instantly in any browser.`;
        explanationTH = `สร้างหน้า Landing Page สไตล์ Google Material Design เขียนไฟล์ HTML/CSS ลงเครื่องของคุณจริงๆ ผ่าน Node.js fs engine และเปิดดูได้ทันที!`;
      } else {
        actualCommands = [`echo "Aetheris Multi-Agent Active - Executed: ${prompt}"`];
        explanation = `Executes a print command echoing your prompt string.`;
        explanationTH = `ทำงานโดยการพิมพ์ข้อความสะท้อนคำสั่งของคุณกลับออกมาบนจอ`;
      }

      reasoning = [
        `[DEVELOPER - ${devAgent}] ประมวลผลเป้าหมายเฉพาะแบบไดนามิก: สังเคราะห์คำสั่งเชลล์ที่รองรับเป้าหมายของคุณ`,
        `[REVIEWER - ${reviewerAgent}] ตรวจสอบรูปแบบคีย์เวิร์ด เช็คความถูกต้องของชุดคำสั่งและการประหยัดรีซอร์สหน่วยความจำ`,
        `[OPERATOR - ${operatorAgent}] ส่งสัญญาณทริกเกอร์เข้าสู่ persistent PowerShell sandbox เพื่อประมวลผลผลลัพธ์และป้อนกลับ`
      ];
    }

    // Build the final command sequence showing the beautiful Multi-Agent pipeline logs
    commands = [
      ...pipelineHeader,
      `Write-Output ">>> [STAGE 1] DEVELOPER AGENT (${devAgent}) is planning and scripting task..."`,
      `Write-Output "    Objective: ${taskNameEN} / ${taskName}"`,
      `Write-Output "    Generating script blocks..."`,
      `Start-Sleep -m 400`,
      `Write-Output ">>> [STAGE 2] REVIEWER AGENT (${reviewerAgent}) is analyzing code safety..."`,
      `Write-Output "    Safety Check: PASS. Checking syntax dependencies..."`,
      `Start-Sleep -m 400`,
      `Write-Output ">>> [STAGE 3] OPERATOR AGENT (${operatorAgent}) is executing target PTY commands..."`,
      `Write-Output "    Sandbox executing path: $PWD"`,
      `Write-Output "-------------------------------------------------------------------------"`,
      ...actualCommands,
      `Write-Output "-------------------------------------------------------------------------"`,
      `Write-Output "🤖 [PIPELINE SUCCESS] All stages completed. Metadata returned cleanly."`,
      `Write-Output "========================================================================="`
    ];

    return { commands, explanation, explanationTH, reasoning };
  }
};

// Spawns a persistent PowerShell session
function getOrCreateShell(sessionId, onData, onError, onExit, initialCwd, initialProjectDir) {
  if (activeSessions.has(sessionId)) {
    const activeSession = activeSessions.get(sessionId);
    const currentProjectDir = activeSession.projectDir ? path.resolve(activeSession.projectDir) : '';
    const nextProjectDir = initialProjectDir ? path.resolve(initialProjectDir) : '';

    if (!nextProjectDir || currentProjectDir === nextProjectDir) {
      return activeSession;
    }

    console.log(`[Shell] Replacing session ${sessionId}; project dir changed from "${currentProjectDir}" to "${nextProjectDir}".`);
    activeSession.agentProcess?.kill();
    activeSession.process.kill();
    activeSessions.delete(sessionId);
  }

  console.log(`[Shell] Spawning persistent PowerShell for session: ${sessionId} in CWD: ${initialCwd}`);
  
  let spawnCwd = path.resolve(__dirname);
  if (initialCwd && fs.existsSync(initialCwd)) {
    spawnCwd = initialCwd;
  } else if (initialCwd) {
    console.log(`[Shell] Specified CWD path "${initialCwd}" does not exist, falling back to: ${spawnCwd}`);
  }

  const shell = spawn('powershell.exe', ['-NoExit', '-NoLogo', '-Command', '-'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: spawnCwd,
    env: { ...process.env, PSModulePath: '' } // Clean PS Module Path if needed
  });

  shell.stdout.setEncoding('utf8');
  shell.stderr.setEncoding('utf8');

  let buffer = '';

  // Data processing
  shell.stdout.on('data', (data) => {
    buffer += data;
    
    // Check if the command has finished and output directory path
    if (buffer.includes(CMD_END_TOKEN)) {
      const parts = buffer.split(CMD_END_TOKEN);
      const output = parts[0];
      
      // Parse current directory if included
      let cleanOutput = output;
      let currentDir = null;

      const pathIndex = output.indexOf(PATH_TOKEN_START);
      if (pathIndex !== -1) {
        cleanOutput = output.substring(0, pathIndex);
        const pathLine = output.substring(pathIndex + PATH_TOKEN_START.length).trim();
        currentDir = pathLine;
        const activeSession = activeSessions.get(sessionId);
        if (activeSession) activeSession.currentDir = currentDir;
      }

      onData({
        type: 'output',
        output: cleanOutput,
        currentDir: currentDir,
        completed: true
      });

      // Keep remaining buffer
      buffer = parts.slice(1).join(CMD_END_TOKEN);
    } else {
      // Stream incremental chunks
      onData({
        type: 'output',
        output: buffer,
        currentDir: null,
        completed: false
      });
      buffer = '';
    }
  });

  shell.stderr.on('data', (data) => {
    onData({
      type: 'error',
      output: data,
      completed: false
    });
  });

  shell.on('exit', (code) => {
    console.log(`[Shell] Session ${sessionId} exited with code ${code}`);
    activeSessions.delete(sessionId);
    onExit(code);
  });

  const session = {
    id: sessionId,
    process: shell,
    currentDir: spawnCwd,
    projectDir: initialProjectDir || spawnCwd,
    agentProcess: null
  };
  activeSessions.set(sessionId, session);
  return session;
}

// WebSocket connection routing
wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const sessionId = urlParams.get('id') || 'default';
  const requestedCwd = urlParams.get('cwd') || '';
  const requestedProjectDir = urlParams.get('projectDir') || '';
  const requestedWorkspaceDir = urlParams.get('workspaceDir') || '';
  const storedSession = getSession(sessionId);
  const sessionSeed = storedSession || {
    id: sessionId,
    name: sessionId,
    llm: 'Claude-Code',
    reviewer: 'Gemini-CLI',
    framework: 'thclaws',
    currentDir: requestedCwd || '',
    projectDir: requestedProjectDir || ''
  };
  const ensuredSession = ensureSessionWorkspace(sessionSeed, requestedWorkspaceDir);
  const initialCwd = ensuredSession.currentDir || ensuredSession.projectDir || requestedCwd || '';
  const initialProjectDir = ensuredSession.projectDir || requestedProjectDir || initialCwd;

  console.log(`[WS] Client connected for terminal session: ${sessionId}, initial CWD: ${initialCwd}`);

  const onData = (payload) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const onError = (err) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'error', output: err.message }));
    }
  };

  const onExit = (code) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'system', output: `\r\n[Shell exited with code ${code}]\r\n` }));
    }
  };

  const session = getOrCreateShell(sessionId, onData, onError, onExit, initialCwd, initialProjectDir);

  // Send initial setup/directory location
  // We trigger a quick silent check to retrieve the current directory path
  const initCmd = `Write-Output "${PATH_TOKEN_START}$((Get-Location).Path)${CMD_END_TOKEN}"\r\n`;
  session.process.stdin.write(initCmd);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'agent_prompt') {
        const activeSession = activeSessions.get(sessionId);
        const agentCli = AGENT_CLI_COMMANDS[data.llm];

        if (!activeSession) return;

        if (!agentCli) {
          onData({
            type: 'error',
            output: `\r\nSelected engine "${data.llm}" does not map to an installed CLI agent. Choose Codex, Gemini-CLI, or Claude-Code.\r\n\r\n`,
            currentDir: activeSession.currentDir,
            completed: true
          });
          return;
        }

        if (!isCliAvailable(agentCli.binary)) {
          onData({
            type: 'error',
            output: `\r\nAgent CLI "${agentCli.binary}" was not found on PATH. Install it or enable Demo mode.\r\n\r\n`,
            currentDir: activeSession.currentDir,
            completed: true
          });
          return;
        }

        console.log(`[CLI Router] Dispatching AI prompt to ${data.llm}${data.model ? ` (${data.model})` : ''} in session ${sessionId}`);
        startAgentCli(activeSession, agentCli, data.prompt, onData, data.terminalSize, data.model || '');
        return;
      }

      if (data.type === 'agent_stop') {
        const activeSession = activeSessions.get(sessionId);
        const agentProc = activeSession?.agentProcess;

        if (!agentProc) {
          onData({
            type: 'agent_state',
            output: '\r\n[Agent PTY] No running agent task to stop.\r\n',
            currentDir: activeSession?.currentDir,
            completed: true,
            agentRunning: false
          });
          return;
        }

        killProcessTree(agentProc);
        activeSession.agentProcess = null;
        onData({
          type: 'error',
          output: '\r\n[Agent PTY] Stop requested by user. Agent process was terminated.\r\n',
          currentDir: activeSession.currentDir,
          completed: true,
          agentRunning: false
        });
        return;
      }

      if (data.type === 'agent_input') {
        const activeSession = activeSessions.get(sessionId);
        const agentProc = activeSession?.agentProcess;

        if (!agentProc) {
          onData({
            type: 'error',
            output: '\r\nNo interactive agent CLI process is waiting for input in this session.\r\n\r\n',
            currentDir: activeSession?.currentDir,
            completed: true,
            agentRunning: false
          });
          return;
        }

        const reply = String(data.input || '');
        agentProc.write(`${reply}\r`);
        return;
      }

      if (data.type === 'agent_pty_input') {
        const agentProc = activeSessions.get(sessionId)?.agentProcess;
        if (agentProc) {
          agentProc.write(String(data.input || ''));
        }
        return;
      }

      if (data.type === 'agent_pty_resize') {
        const agentProc = activeSessions.get(sessionId)?.agentProcess;
        if (agentProc) {
          agentProc.resize(Math.max(2, Number(data.cols) || 100), Math.max(2, Number(data.rows) || 28));
        }
        return;
      }

      if (data.type === 'input') {
        const shellProc = activeSessions.get(sessionId)?.process;
        if (shellProc) {
          const rawCmd = data.command;
          
          // CLI command intercepts — try real CLI first, fall back to simulation
          const cmdLower = rawCmd.toLowerCase().trim();

          // Route real CLI commands to their actual installed binaries
          const REAL_CLI_COMMANDS = ['codex', 'gemini', 'claude'];
          const matchedCli = REAL_CLI_COMMANDS.find(cli => cmdLower.startsWith(cli + ' ') || cmdLower === cli);
          if (matchedCli) {
            // Check if that CLI is actually installed
            const cliAvailable = isCliAvailable(matchedCli);

            if (cliAvailable) {
              // Route the command directly to the real shell (PowerShell)
              console.log(`[CLI Router] Routing real command to ${matchedCli}: ${rawCmd}`);
              writeWrappedShellCommand(shellProc, rawCmd);
              return;
            } else {
              // CLI not found — inform user with install hint
              const installMap = {
                codex: 'npm install -g @openai/codex@latest',
                gemini: 'npm install -g @google/gemini-cli',
                claude: 'npm install -g @anthropic-ai/claude-code'
              };
              onData({
                type: 'error',
                output: `\r\n\x1b[31m✖ CLI Not Found: '${matchedCli}' is not installed on this system.\x1b[0m\r\n` +
                        `\x1b[33m  Install it with: ${installMap[matchedCli] || 'npm install -g ' + matchedCli}\x1b[0m\r\n\r\n`,
                currentDir: activeSessions.get(sessionId)?.currentDir,
                completed: true
              });
              return;
            }
          }

          // Legacy simulation intercepts (kept for mock/demo mode)
          if (cmdLower === 'npm install -g aetheris-cli') {
            setTimeout(() => {
              onData({
                type: 'output',
                output: `\r\n\x1b[36m>>> Preparing global installation of aetheris-cli...\x1b[0m\r\n` +
                        `\x1b[33m[1/4] Resolving packages...\x1b[0m\r\n` +
                        `\x1b[33m[2/4] Fetching aetheris-cli@latest...\x1b[0m\r\n` +
                        `\x1b[33m[3/4] Linking global binaries...\x1b[0m\r\n` +
                        `\x1b[32m[4/4] Installation complete!\x1b[0m\r\n` +
                        `+ aetheris-cli@1.4.2 added 18 packages in 4.31s\r\n` +
                        `To verify, run: \x1b[35maetheris-cli --version\x1b[0m\r\n\r\n`,
                currentDir: activeSessions.get(sessionId)?.currentDir,
                completed: true
              });
            }, 300);
            return;
          }

          if (cmdLower === 'aetheris-cli --version' || cmdLower === 'aetheris-cli') {
            setTimeout(() => {
              onData({
                type: 'output',
                output: `\r\naetheris-cli version 1.4.2\r\nStatus: Online\r\nConnected API Engine: Gemini-CLI / Anthropic-PTY-Pipeline\r\n\r\n`,
                currentDir: activeSessions.get(sessionId)?.currentDir,
                completed: true
              });
            }, 200);
            return;
          }

          // Wrap command to extract path and trigger complete token
          writeWrappedShellCommand(shellProc, rawCmd);
        }
      }
    } catch (e) {
      console.error('[WS Error] Failed parsing message: ', e);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected from session: ${sessionId}`);
  });
});

// API Routes
app.post('/api/ai/suggest', (req, res) => {
  const { prompt, llm, reviewer, framework, mode } = req.body;
  console.log(`[AI Request] Suggesting for prompt: "${prompt}" [LLM: ${llm}, Reviewer: ${reviewer}, Framework: ${framework}]`);

  if (mode !== 'demo') {
    return res.status(409).json({
      success: false,
      error: 'Simulated suggestions are available only in Demo mode. AI Prompt mode dispatches to agent CLIs over WebSocket.'
    });
  }

  // Simulated logic stays available only for the explicit demo walkthrough.
  const result = SIMULATED_AGENTS.suggest(prompt, llm, reviewer, framework);
  res.json({
    success: true,
    ...result
  });
});

app.post('/api/ai/explain', (req, res) => {
  const { command, output } = req.body;
  console.log(`[AI Request] Explaining command: "${command}"`);

  // Generate highly descriptive context-aware explanation
  let explanation = '';
  let explanationTH = '';

  if (command.includes('mkdir')) {
    explanation = `The 'mkdir' (Make Directory) command attempts to create a new folder. Here it succeeded and returned the details of the created directory including its Mode (attributes), LastWriteTime, and Name.`;
    explanationTH = `คำสั่ง 'mkdir' (สร้างไดเรกทอรี) ใช้สำหรับสร้างโฟลเดอร์ใหม่ ในที่นี้รันเสร็จสมบูรณ์และส่งคืนรายละเอียดของไดเรกทอรีที่ถูกสร้าง รวมถึงสิทธิ์เข้าถึง (Mode), เวลาแก้ไขล่าสุด และชื่อโฟลเดอร์`;
  } else if (command.includes('dir') || command.includes('Get-ChildItem') || command.includes('ls')) {
    explanation = `This command lists the files and directories in the current folder path. The output lists their file sizes, attributes, last modification dates, and names.`;
    explanationTH = `คำสั่งนี้แสดงรายการไฟล์และโฟลเดอร์ย่อยในตำแหน่งปัจจุบัน โดยรายงานขนาดไฟล์, แอตทริบิวต์ความปลอดภัย, วันเวลาแก้ไขล่าสุด และชื่อไฟล์ทั้งหมด`;
  } else if (command.includes('ipconfig')) {
    explanation = `The 'ipconfig' utility displays all current TCP/IP network configuration values. The output displays the active network adapters, local IPv4/IPv6 addresses, subnet masks, and default gateways.`;
    explanationTH = `ยูทิลิตี้ 'ipconfig' ใช้แสดงค่าการตั้งค่าเครือข่าย TCP/IP ปัจจุบันทั้งหมด ซึ่งแสดงผลอะแดปเตอร์เครือข่ายที่เปิดใช้งาน, ที่อยู่ IPv4/IPv6, Subnet Mask และ Gateway เริ่มต้น`;
  } else if (command.includes('ping')) {
    explanation = `The 'ping' command sends ICMP Echo Request packets to test connection packets and measure average trip times. The output confirms that the server is online and responding with minimal latency.`;
    explanationTH = `คำสั่ง 'ping' ส่งแพ็กเก็ตทดสอบไปยังปลายทางเพื่อวัดค่าความหน่วงเฉลี่ย ผลลัพธ์ยืนยันว่าเครื่องปลายทางทำงานอยู่และเชื่อมต่ออินเทอร์เน็ตได้ปกติ`;
  } else {
    explanation = `This command was successfully executed in the PowerShell subsystem. The output displays standard standard stdout streams matching the executed tool logic.`;
    explanationTH = `คำสั่งนี้ถูกประมวลผลสำเร็จในระบบย่อย PowerShell โดยผลลัพธ์ที่แสดงสอดคล้องกับการทำงานของตัวคำสั่งหรือสคริปต์ที่รัน`;
  }

  res.json({
    success: true,
    explanation,
    explanationTH
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Real CLI Status Check — checks codex, gemini, claude on the system PATH
// ──────────────────────────────────────────────────────────────────────────────
const CLI_TOOLS = [
  {
    id: 'codex',
    engineId: 'Codex',
    name: 'OpenAI Codex CLI',
    provider: 'OpenAI',
    command: 'codex --version',
    whereCmd: 'where codex',
    installCmd: 'npm install -g @openai/codex@latest',
    color: '#059669',
    description: 'AI Coding Agent — writes, edits, and runs code autonomously',
    modelCommands: ['codex --help'],
    fallbackModels: [
      { id: '', name: 'Default from Codex config' },
      { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex' },
      { id: 'gpt-5', name: 'GPT-5' },
      { id: 'o3', name: 'o3' }
    ]
  },
  {
    id: 'gemini',
    engineId: 'Gemini-CLI',
    name: 'Google Gemini CLI',
    provider: 'Google',
    command: 'gemini --version',
    whereCmd: 'where gemini',
    installCmd: 'npm install -g @google/gemini-cli',
    color: '#2563EB',
    description: 'Multimodal AI assistant with massive 2M token context window',
    ptyModelCommand: { binary: 'gemini', input: '/model', enter: '\r' },
    modelCommands: ['gemini --help'],
    fallbackModels: [
      { id: 'auto', name: 'Auto' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
      { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
      { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
      { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B A4B IT' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
    ]
  },
  {
    id: 'claude',
    engineId: 'Claude-Code',
    name: 'Anthropic Claude Code',
    provider: 'Anthropic',
    command: 'claude --version',
    whereCmd: 'where claude',
    installCmd: 'npm install -g @anthropic-ai/claude-code',
    color: '#D97706',
    description: 'Agentic coding assistant for architecture, debugging & PRs',
    modelCommands: ['claude --help'],
    fallbackModels: [
      { id: '', name: 'Default from Claude config' },
      { id: 'sonnet', name: 'Claude Sonnet' },
      { id: 'opus', name: 'Claude Opus' },
      { id: 'haiku', name: 'Claude Haiku' }
    ]
  },
  {
    id: 'qwen',
    engineId: 'Qwen-CLI',
    name: 'Alibaba Qwen CLI',
    provider: 'Alibaba',
    command: 'qwen --version',
    whereCmd: 'where qwen',
    installCmd: 'npm install -g @alibaba/qwen-cli',
    color: '#7C3AED',
    description: 'Outstanding multilingual support with exceptional Asian language performance',
    modelCommands: ['qwen --help'],
    fallbackModels: [
      { id: '', name: 'Default from Qwen config' },
      { id: 'qwen-max', name: 'Qwen Max' },
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-turbo', name: 'Qwen Turbo' },
      { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B' }
    ]
  }
];

function parseCliModels(output, fallbackModels = []) {
  const fallbackIds = new Set(fallbackModels.map(model => model.id).filter(Boolean));
  const modelPattern = /\b(?:gemini-[a-z0-9._-]+|gemma-[a-z0-9._-]+|claude-[a-z0-9._-]+|gpt-[a-z0-9._-]+|o[0-9][a-z0-9._-]*|sonnet|opus|haiku)\b/gi;
  const found = new Map();

  for (const match of output.matchAll(modelPattern)) {
    const id = match[0];
    if (!found.has(id)) {
      found.set(id, {
        id,
        name: id
          .replace(/-/g, ' ')
          .replace(/\b\w/g, letter => letter.toUpperCase())
      });
    }
  }

  const parsedModels = [...found.values()];
  if (parsedModels.length === 0) return fallbackModels;

  for (const model of fallbackModels) {
    if (!model.id || !fallbackIds.has(model.id)) {
      parsedModels.unshift(model);
    } else if (!parsedModels.some(parsed => parsed.id === model.id)) {
      parsedModels.push(model);
    }
  }

  return parsedModels;
}

async function discoverCliModels(tool) {
  if (tool.ptyModelCommand && process.platform === 'win32') {
    const ptyDiscovery = await discoverCliModelsWithPty(tool.ptyModelCommand, tool.fallbackModels || []);
    if (ptyDiscovery.models.length > (tool.fallbackModels || []).length) {
      return {
        ...ptyDiscovery,
        command: typeof tool.ptyModelCommand === 'string'
          ? tool.ptyModelCommand
          : `${tool.ptyModelCommand.command || tool.ptyModelCommand.binary} + ${tool.ptyModelCommand.input.trim()}`
      };
    }
  }

  if (!tool.modelCommands?.length) {
    return { models: tool.fallbackModels || [], source: 'fallback' };
  }

  for (const command of tool.modelCommands) {
    try {
      const output = execSync(command, {
        timeout: 3000,
        encoding: 'utf8',
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      const models = parseCliModels(output, tool.fallbackModels || []);
      return {
        models,
        source: models === tool.fallbackModels ? 'fallback' : 'cli',
        command
      };
    } catch (e) {
      const output = `${e.stdout || ''}\n${e.stderr || ''}`;
      const models = parseCliModels(output, tool.fallbackModels || []);
      if (models.length > (tool.fallbackModels || []).length) {
        return { models, source: 'cli', command };
      }
    }
  }

  return { models: tool.fallbackModels || [], source: 'fallback' };
}

function discoverCliModelsWithPty(commandConfig, fallbackModels = []) {
  return new Promise((resolve) => {
    let output = '';
    let settled = false;

    const finish = (source = 'fallback') => {
      if (settled) return;
      settled = true;
      try {
        child.kill();
      } catch {}
      const cleaned = output
        .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
        .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '');
      const models = parseCliModels(cleaned, fallbackModels);
      resolve({
        models,
        source: models.length > fallbackModels.length ? 'cli-pty' : source
      });
    };

    let child;
    try {
      const command = typeof commandConfig === 'string' ? commandConfig : (commandConfig.command || commandConfig.binary);
      const binary = typeof commandConfig === 'string' ? command.split(/\s+/)[0] : commandConfig.binary;
      const input = typeof commandConfig === 'string' ? '' : commandConfig.input;
      const enter = typeof commandConfig === 'string' ? '\r' : (commandConfig.enter || '\r');
      const resolvedPaths = binary ? getCliPaths(binary) : [];
      const cmdPath = resolvedPaths.find(candidate => candidate.toLowerCase().endsWith('.cmd'));
      const resolvedCommand = cmdPath || command;
      const args = process.platform === 'win32'
        ? ['/d', '/s', '/c', resolvedCommand]
        : command.split(/\s+/).slice(1);
      const file = process.platform === 'win32' ? 'cmd.exe' : command.split(/\s+/)[0];
      child = pty.spawn(file, args, {
        name: 'xterm-256color',
        cols: 180,
        rows: 48,
        cwd: __dirname,
        env: process.env
      });

      let inputSent = false;
      child.onData((data) => {
        output += data;
        if (output.length > 40000) output = output.slice(-40000);
        if (input && !inputSent && (output.includes('Type your message') || output.includes('? for shortcuts'))) {
          inputSent = true;
          setTimeout(() => {
            try {
              child.write(input);
              setTimeout(() => {
                try {
                  child.write(enter);
                } catch {}
              }, 250);
            } catch {}
          }, 250);
        }
        if (output.includes('gemini-3') || output.includes('gemma-')) {
          setTimeout(() => finish('cli-pty'), 800);
        }
      });

      child.onExit(() => finish('fallback'));
      setTimeout(() => {
        try {
          child.write('\x1b');
        } catch {}
      }, 11500);
      setTimeout(() => finish('fallback'), 12800);
    } catch {
      resolve({ models: fallbackModels, source: 'fallback' });
    }
  });
}

app.get('/api/cli/status', async (req, res) => {
  console.log('[CLI Status] Running real CLI detection on system PATH...');

  const results = await Promise.all(CLI_TOOLS.map(async tool => {
    let installed = false;
    let version = null;
    let path = null;
    let error = null;
    let models = tool.fallbackModels || [];
    let modelSource = 'fallback';
    let modelCommand = null;

    // Step 1: Check if binary exists on PATH (fast)
    try {
      const wherePath = execSync(tool.whereCmd, {
        timeout: 4000,
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      }).trim();
      path = wherePath.split('\n')[0].trim();
      installed = !!path;
    } catch (e) {
      installed = false;
      error = 'Not found on PATH';
    }

    // Step 2: If found, get the version string
    if (installed) {
      try {
        // Some CLIs print to stderr, so capture both
        const versionOut = execSync(tool.command, {
          timeout: 8000,
          encoding: 'utf8',
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        version = versionOut.split('\n')[0].trim() || 'installed';
      } catch (e) {
        // execSync throws on non-zero exit, but output may still be in e.stdout/e.stderr
        const raw = (e.stdout || e.stderr || '').trim();
        version = raw ? raw.split('\n')[0].trim() : 'installed (version unknown)';
      }

      const discovery = await discoverCliModels(tool);
      models = discovery.models;
      modelSource = discovery.source;
      modelCommand = discovery.command || null;
    }

    console.log(`[CLI Status] ${tool.id}: installed=${installed}, version=${version || 'N/A'}, path=${path || 'N/A'}`);

    return {
      id: tool.id,
      engineId: tool.engineId,
      name: tool.name,
      provider: tool.provider,
      description: tool.description,
      installCmd: tool.installCmd,
      color: tool.color,
      installed,
      version,
      path,
      models,
      modelSource,
      modelCommand,
      error
    };
  }));

  const installedCount = results.filter(r => r.installed).length;
  const anyInstalled = installedCount > 0;

  res.json({
    success: true,
    tools: results,
    anyInstalled,
    installedCount,
    totalCount: results.length,
    summary: anyInstalled
      ? `✅ พบ ${installedCount}/${results.length} AI CLI บนเครื่อง — ระบบพร้อมใช้งาน`
      : `❌ ไม่พบ AI CLI ใด ๆ บน PATH — กรุณาติดตั้งอย่างน้อย 1 ตัวก่อนใช้งาน`
  });
});

app.delete('/api/session/:id', (req, res) => {
  const sessionId = req.params.id;
  const session = activeSessions.get(sessionId);
  if (session) {
    try {
      if (session.agentProcess) {
        session.agentProcess.kill();
      }
      session.process.kill();
      activeSessions.delete(sessionId);
      console.log(`[Shell] Force terminated session: ${sessionId}`);
      res.json({ success: true, message: `Session ${sessionId} terminated` });
    } catch (e) {
      console.error(`[Shell Delete Error] Failed to kill ${sessionId}:`, e);
      res.status(500).json({ success: false, message: e.message });
    }
  } else {
    res.json({ success: true, message: `Session ${sessionId} was already offline or not active on backend` });
  }
});

// ════════════════════════════════════════════════════════════════
// DB REST API — Settings
// ════════════════════════════════════════════════════════════════

app.get('/api/db/settings', (req, res) => {
  try {
    res.json({ success: true, data: getAllSettings() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/db/settings', (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'key is required' });
    setSetting(key, value);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Bulk upsert settings
app.post('/api/db/settings/bulk', (req, res) => {
  try {
    const { settings } = req.body; // { key: value, ... }
    if (!settings || typeof settings !== 'object')
      return res.status(400).json({ success: false, error: 'settings object required' });
    for (const [key, value] of Object.entries(settings)) {
      setSetting(key, value);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════
// DB REST API — Recent Directories
// ════════════════════════════════════════════════════════════════

app.get('/api/db/recent-dirs', (req, res) => {
  try {
    res.json({ success: true, data: getRecentDirs() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/db/recent-dirs', (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ success: false, error: 'path is required' });
    addRecentDir(dirPath);
    res.json({ success: true, data: getRecentDirs() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/db/recent-dirs', (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ success: false, error: 'path is required' });
    removeRecentDir(dirPath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════
// DB REST API — Sessions
// ════════════════════════════════════════════════════════════════

app.get('/api/db/sessions', (req, res) => {
  try {
    res.json({ success: true, data: getSessions().map(ensureSessionWorkspace) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/db/sessions/:id', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    res.json({ success: true, data: ensureSessionWorkspace(session) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/db/sessions', (req, res) => {
  try {
    const session = req.body;
    if (!session.id) return res.status(400).json({ success: false, error: 'id is required' });
    upsertSession(session);
    res.json({ success: true, data: ensureSessionWorkspace(getSession(session.id)) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.patch('/api/db/sessions/:id/trash', (req, res) => {
  try {
    const { inTrash } = req.body;
    trashSession(req.params.id, !!inTrash);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/db/sessions/:id', (req, res) => {
  try {
    const preview = activePreviewSessions.get(req.params.id);
    if (preview && !preview.exited) {
      killProcessTree(preview.process);
    }
    activePreviewSessions.delete(req.params.id);
    deleteSession(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════════
// DB REST API — Terminal Blocks
// ════════════════════════════════════════════════════════════════

app.get('/api/db/sessions/:id/blocks', (req, res) => {
  try {
    res.json({ success: true, data: getBlocks(req.params.id) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/db/sessions/:id/blocks', (req, res) => {
  try {
    const block = { ...req.body, sessionId: req.params.id };
    if (!block.id) return res.status(400).json({ success: false, error: 'id is required' });
    insertBlock(block);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/db/sessions/:sessionId/blocks/:blockId', (req, res) => {
  try {
    updateBlock({ ...req.body, id: req.params.blockId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/db/sessions/:sessionId/blocks/:blockId', (req, res) => {
  try {
    deleteBlock(req.params.blockId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/db/sessions/:id/blocks', (req, res) => {
  try {
    clearBlocks(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/session/:id/preview', (req, res) => {
  try {
    res.json({ success: true, data: getManagedPreviewStatus(req.params.id) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/session/:id/preview/start', (req, res) => {
  try {
    const storedSession = getSession(req.params.id);
    if (!storedSession) {
      res.status(404).json({ success: false, error: 'Session not found.' });
      return;
    }

    const session = ensureSessionWorkspace(storedSession);
    const projectDir = session.projectDir || session.currentDir;
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      res.status(400).json({
        success: false,
        error: `No package.json found in ${projectDir}. Ask the agent to create the app first.`
      });
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.scripts?.dev) {
      res.status(400).json({
        success: false,
        error: 'This project does not define a "dev" script in package.json.'
      });
      return;
    }

    const existing = activePreviewSessions.get(req.params.id);
    if (existing && !existing.exited) {
      res.json({ success: true, data: getManagedPreviewStatus(req.params.id) });
      return;
    }

    const port = getSessionPreviewPort(req.params.id);
    const url = getPreviewUrl(req.params.id);
    const npmFile = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const npmArgs = process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm.cmd', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort']
      : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];

    const child = spawn(npmFile, npmArgs, {
      cwd: projectDir,
      env: {
        ...process.env,
        ATHENA_SESSION_PROJECT_DIR: projectDir,
        ATHENA_SESSION_PREVIEW_PORT: String(port),
        PORT: String(port),
        BROWSER: 'none'
      },
      windowsHide: true
    });

    const preview = {
      process: child,
      port,
      url,
      output: '',
      startedAt: new Date().toISOString(),
      exited: false,
      exitCode: null
    };

    const appendOutput = (chunk) => {
      preview.output = `${preview.output}${chunk}`.slice(-60000);
    };

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);
    child.on('exit', (code) => {
      preview.exited = true;
      preview.exitCode = code;
      appendOutput(`\r\n[Managed Preview] exited with code ${code ?? 'unknown'}\r\n`);
    });

    activePreviewSessions.set(req.params.id, preview);
    res.json({ success: true, data: getManagedPreviewStatus(req.params.id) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/session/:id/preview/stop', (req, res) => {
  try {
    const preview = activePreviewSessions.get(req.params.id);
    if (preview && !preview.exited) {
      killProcessTree(preview.process);
      preview.exited = true;
    }

    res.json({ success: true, data: getManagedPreviewStatus(req.params.id) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Filesystem browsing API for Directory Browser Modal
app.get('/api/fs/browse', (req, res) => {
  try {
    let targetPath = req.query.path || '';
    let drives = [];

    // Get Windows drives list
    if (process.platform === 'win32') {
      try {
        const stdout = execSync('wmic logicaldisk get name').toString();
        drives = stdout.split('\r\n')
          .map(line => line.trim())
          .filter(line => line && line !== 'Name' && line.endsWith(':'));
      } catch (e) {
        drives = ['C:', 'D:'];
      }
    }

    if (!targetPath) {
      return res.json({
        success: true,
        currentPath: '',
        parentPath: '',
        drives,
        directories: [],
        isRoot: true
      });
    }

    // Windows drive root helper: e.g. "C:" -> "C:\"
    if (targetPath.match(/^[a-zA-Z]:$/)) {
      targetPath = targetPath + '\\';
    }

    const resolvedPath = path.resolve(targetPath);

    let directories = [];
    try {
      const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
      directories = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .sort((a, b) => a.localeCompare(b));
    } catch (readErr) {
      const parentPath = path.dirname(resolvedPath);
      return res.status(400).json({
        success: false,
        error: `Cannot read directory: ${readErr.message}`,
        currentPath: resolvedPath,
        parentPath: parentPath === resolvedPath ? '' : parentPath,
        drives,
        directories: []
      });
    }

    const parentPath = path.dirname(resolvedPath);

    res.json({
      success: true,
      currentPath: resolvedPath,
      parentPath: parentPath === resolvedPath ? '' : parentPath,
      drives,
      directories,
      isRoot: parentPath === resolvedPath
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


// Dynamic static workspace file serving
app.get('/workspace/*', (req, res) => {
  try {
    const workspaceDir = getSetting('workspace_dir');
    if (!workspaceDir) {
      return res.status(400).send('Workspace directory is not configured in settings.');
    }
    const relativePath = decodeURIComponent(req.params[0] || '');
    const absolutePath = path.join(workspaceDir, relativePath);
    
    // Security verification: ensure path doesn't escape workspace directory
    const resolvedWorkspace = path.resolve(workspaceDir);
    const resolvedAbsolute = path.resolve(absolutePath);
    
    if (!resolvedAbsolute.startsWith(resolvedWorkspace)) {
      return res.status(403).send('Access Denied: Path escapes workspace.');
    }
    
    if (fs.existsSync(absolutePath)) {
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        // Look for index.html as a directory entry point
        const indexHtmlPath = path.join(absolutePath, 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          return res.sendFile(indexHtmlPath);
        }
        return res.status(400).send('Directory listing is disabled. No index.html found.');
      }
      return res.sendFile(absolutePath);
    } else {
      return res.status(404).send('File not found');
    }
  } catch (e) {
    res.status(500).send(e.message);
  }
});


// ── Scaffold Endpoint: Write webpage files directly via Node.js fs ─────────────
// Avoids PowerShell string escaping issues entirely
app.post('/api/scaffold/webpage', (req, res) => {
  try {
    if (req.body?.mode !== 'demo') {
      return res.status(409).json({
        success: false,
        error: 'The canned webpage scaffold is available only in Demo mode.'
      });
    }

    const workspaceDir = getSetting('workspace_dir');
    if (!workspaceDir) {
      return res.status(400).json({ success: false, error: 'Workspace directory not configured' });
    }

    const { folderName = 'aetheris-google-page', llm = 'AI Agent', reviewer = 'Reviewer', framework = 'Aetheris' } = req.body;

    // Security: sanitize folderName (alphanumeric, dash, underscore only)
    const safeName = folderName.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (!safeName) return res.status(400).json({ success: false, error: 'Invalid folder name' });

    const targetDir = path.join(workspaceDir, safeName);
    const targetFile = path.join(targetDir, 'index.html');

    // Create directory
    fs.mkdirSync(targetDir, { recursive: true });

    // Generate HTML content using Node.js template literals (no PowerShell escaping needed)
    const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Styled Page — Created by Aetheris AI</title>
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      background: #f8f9fa;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 24px;
      box-shadow: 0 2px 12px rgba(60,64,67,.12), 0 8px 32px rgba(60,64,67,.08);
      padding: 48px 56px;
      max-width: 560px;
      width: 100%;
      text-align: center;
    }
    .google-logo {
      font-size: 56px;
      font-weight: 700;
      letter-spacing: -2px;
      margin-bottom: 28px;
      line-height: 1;
    }
    .g-b { color: #4285F4; }
    .g-r { color: #EA4335; }
    .g-y { color: #FBBC05; }
    .g-g { color: #34A853; }
    h1 { font-size: 26px; color: #202124; margin-bottom: 12px; font-weight: 500; }
    .sub { font-size: 15px; color: #5f6368; line-height: 1.7; margin-bottom: 32px; }
    .agent-badges { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px; }
    .badge {
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .b-dev  { background: #e8f0fe; color: #1a73e8; }
    .b-rev  { background: #fce8e6; color: #c5221f; }
    .b-ops  { background: #e6f4ea; color: #137333; }
    .cta {
      display: inline-block;
      padding: 12px 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #4285F4, #1a73e8);
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(26,115,232,.35);
      transition: box-shadow 0.2s, transform 0.1s;
    }
    .cta:hover { box-shadow: 0 4px 16px rgba(26,115,232,.45); transform: translateY(-1px); }
    .footer { margin-top: 40px; font-size: 12px; color: #9aa0a6; }
    .footer span { color: #1a73e8; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="google-logo">
      <span class="g-b">G</span><span class="g-r">o</span><span class="g-y">o</span><span class="g-b">g</span><span class="g-g">l</span><span class="g-r">e</span>
    </div>
    <h1>Landing Page — Generated by Aetheris AI</h1>
    <p class="sub">
      หน้าเว็บนี้สร้างขึ้นโดยกระบวนการ Multi-Agent Pipeline ของ Aetheris OS<br>
      เขียนไฟล์โดยตรงผ่าน Node.js fs — ไม่ผ่าน PowerShell
    </p>
    <div class="agent-badges">
      <span class="badge b-dev">⚡ DEV: ${llm}</span>
      <span class="badge b-rev">🔍 REV: ${reviewer}</span>
      <span class="badge b-ops">🚀 OPS: ${framework}</span>
    </div>
    <a href="#" class="cta" onclick="alert('Aetheris Sandbox \u2014 Page is live!')">Explore Page</a>
    <div class="footer">Generated at ${new Date().toLocaleString('th-TH')} via <span>Aetheris OS v2.6.5</span></div>
  </div>
</body>
</html>`;

    // Write file directly — no escaping issues
    fs.writeFileSync(targetFile, htmlContent, 'utf8');

    const previewUrl = `http://localhost:${PORT}/workspace/${safeName}/index.html`;
    console.log(`[Scaffold] Web page written to: ${targetFile}`);

    res.json({
      success: true,
      filePath: targetFile,
      folderName: safeName,
      previewUrl
    });
  } catch (e) {
    console.error('[Scaffold Error]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});



// Upgrade server to WebSocket support
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/terminal') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Clean up processes on exit
process.on('exit', () => {
  console.log('[System] Cleaning up shell sessions...');
  for (const [id, session] of activeSessions.entries()) {
    try {
      if (session.agentProcess) {
        session.agentProcess.kill();
      }
      session.process.kill();
    } catch (e) {}
  }
  for (const preview of activePreviewSessions.values()) {
    try {
      killProcessTree(preview.process);
    } catch (e) {}
  }
});

const PORT = CONTROL_API_PORT;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Aetheris Shell Backend is running on port ${PORT}  `);
  console.log(`  WebSocket terminal path: ws://localhost:${PORT}/terminal `);
  console.log(`====================================================`);
});
