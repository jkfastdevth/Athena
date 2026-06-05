import React, { Suspense, lazy, useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Terminal as ShellIcon, Eye, EyeOff, Cpu, Brain, Network, Award, HelpCircle, CheckSquare, Layers, Shield, Play, Square, ExternalLink, Trash2 } from 'lucide-react';
import { LLM_ENGINES, AGENT_FRAMEWORKS, CLI_MODEL_OPTIONS, getDefaultCliModel } from '../config/agentConfig';
import { API_BASE } from '../config/runtime';
import TerminalBlock from './TerminalBlock';

const AgentPtyTerminal = lazy(() => import('./AgentPtyTerminal'));

export default function TerminalGUI({
  tab,
  onSendCommand,
  onSendAgentPrompt,
  onStopAgent,
  onSendAgentInput,
  onSendAgentPtyInput,
  onResizeAgentPty,
  onStartPreview,
  onStopPreview,
  onExplainBlock,
  onRemoveBlock,
  onClearBlocks,
  onTriggerAgentPrompt,
  cliModelOptions,
  activeTheme,
  globalStats,
  setGlobalStats,
  apiKeys,
  setApiKeys,
  cliInstalled,
  setCliInstalled,
  demoMode,
  isAiActive,
  onOpenActivation,
  onUpdateTab,
  workspaceDir,
  showAlert,
  showConfirm
}) {
  const [input, setInput] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agentThinking, setAgentThinking] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [agentPrompts, setAgentPrompts] = useState({
    developer: '',
    reviewer: '',
    operator: ''
  });

  const consoleEndRef = useRef(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab.blocks, agentThinking, thinkingSteps]);

  const llmObj = LLM_ENGINES.find(l => l.id === tab.llm) || LLM_ENGINES[0];
  const reviewerObj = LLM_ENGINES.find(l => l.id === tab.reviewer) || LLM_ENGINES.find(l => l.id === 'Gemini-CLI') || LLM_ENGINES[1];
  const cliEngines = LLM_ENGINES.filter(engine => ['Codex', 'Gemini-CLI', 'Claude-Code', 'Qwen-CLI'].includes(engine.id));
  const frameworkObj = AGENT_FRAMEWORKS.find(f => f.id === tab.framework) || AGENT_FRAMEWORKS[0];

  const getModelOptions = (engineId) => cliModelOptions?.[engineId] || CLI_MODEL_OPTIONS[engineId] || [{ id: '', name: 'Default model' }];

  const updateAgentEngine = (engineField, modelField, engineId) => {
    onUpdateTab(tab.id, {
      [engineField]: engineId,
      [modelField]: getDefaultCliModel(engineId)
    });
  };

  const updateAgentPrompt = (key, value) => {
    setAgentPrompts(prev => ({ ...prev, [key]: value }));
  };

  const sendSidebarAgentPrompt = (key, role, model) => {
    let promptText = agentPrompts[key]?.trim();
    if (tab.agentRunning) return;

    // If empty, use a test prompt to verify CLI connectivity
    if (!promptText) {
      promptText = `[TEST PROMPT] Hello! Please confirm you are working correctly by responding with "System Ready" and your current version/identity info.`;
    }

    const modelField = key === 'reviewer' ? 'reviewerModel' : 'llmModel';
    const modelName = tab[modelField] ?? getDefaultCliModel(model);
    const routedPrompt = key === 'operator'
      ? `[Operator Framework: ${frameworkObj.name} / ${frameworkObj.type}]\n${promptText}`
      : promptText;
    onSendAgentPrompt(tab.id, routedPrompt, { agentRole: role, llm: model, model: modelName });
    updateAgentPrompt(key, '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (tab.agentRunning && !demoMode) {
      onSendAgentInput(tab.id, input);
    } else if (aiMode) {
      console.log('[TerminalGUI] AI Mode submit, isAiActive:', isAiActive(), 'prompt:', input);
      handleAiPrompt(input);
    } else {
      onSendCommand(tab.id, input);
    }
    setInput('');
  };

  const handleAiPrompt = async (promptText) => {
    console.log('[TerminalGUI] handleAiPrompt called with:', promptText);
    setAgentThinking(true);
    setThinkingSteps([]);
    setActiveStepIndex(0);

    try {
      if (!demoMode) {
        if (!cliInstalled) {
          onOpenActivation();
          return;
        }

        const steps = [
          `[AGENT CLI - ${llmObj.name}] Preparing a real non-interactive CLI prompt... / กำลังเตรียม prompt สำหรับ CLI จริง...`,
          `[WORKSPACE] Dispatching the task in the active shell session... / กำลังส่งงานเข้า shell session ปัจจุบัน...`
        ];

        for (let i = 0; i < steps.length; i++) {
          setThinkingSteps(prev => [...prev, steps[i]]);
          setActiveStepIndex(i);
          await new Promise(r => setTimeout(r, 350));
        }

        onSendAgentPrompt(tab.id, promptText, { agentRole: 'Developer Agent', llm: tab.llm, model: tab.llmModel ?? getDefaultCliModel(tab.llm) });
        return;
      }

      const steps = [
        `[STAGE 1: DEVELOPER - ${llmObj.name}] Analyzing prompt and crafting shell blueprint... / กำลังวิเคราะห์และเขียนสคริปต์แบบร่าง...`,
        `[STAGE 2: REVIEWER - ${reviewerObj.name}] Reviewing code safety, integrity, and security policies... / กำลังตรวจสอบความปลอดภัยและโครงสร้างคำสั่ง...`,
        `[STAGE 3: OPERATOR - ${frameworkObj.name}] Initializing local shell environment, spawning sandbox process... / กำลังสร้าง Process ใน Sandbox และเตรียมรันคำสั่ง...`
      ];

      for (let i = 0; i < steps.length; i++) {
        setThinkingSteps(prev => [...prev, steps[i]]);
        setActiveStepIndex(i);
        await new Promise(r => setTimeout(r, 1000));
      }

      const response = await fetch(`${API_BASE}/api/ai/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          llm: tab.llm,
          reviewer: tab.reviewer || 'Gemini-CLI',
          framework: tab.framework,
          mode: 'demo'
        })
      });
      const data = await response.json();
      console.log('[TerminalGUI] AI suggest response:', data.success, 'commands:', data.commands?.length);

      if (data.success && data.commands.length > 0) {
        const tokensGenerated = Math.floor(200 + Math.random() * 300);
        const addedCost = ((tokensGenerated / 1000000) * llmObj.costPerMillion) + ((tokensGenerated / 2 / 1000000) * reviewerObj.costPerMillion);
        setGlobalStats(prev => ({
          totalTokens: prev.totalTokens + tokensGenerated,
          totalCost: prev.totalCost + addedCost
        }));

        for (const cmd of data.commands) {
          onSendCommand(tab.id, cmd);
          await new Promise(r => setTimeout(r, 1200));
        }

        // Demo mode can still expose the older scaffold helper for its canned walkthrough.
        const commandsText = data.commands.join('\n').toLowerCase();
        
        const createdWebPage = commandsText.includes('aetheris-google-page') || 
                               commandsText.includes('scaffold') ||
                               commandsText.includes('index.html');

        const createdFile = !createdWebPage && (
                               commandsText.includes('new-item') || 
                               commandsText.includes('set-content') ||
                               commandsText.includes('out-file'));

        console.log('[TerminalGUI] Output detection → createdWebPage:', createdWebPage, 'createdFile:', createdFile);

        if (createdWebPage) {
          const folderName = 'aetheris-google-page';
          
          // Call Node.js scaffold API to write the HTML file directly (no PowerShell escaping issues)
          try {
            const scaffoldRes = await fetch(`${API_BASE}/api/scaffold/webpage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                folderName,
                llm: tab.llm || 'AI Agent',
                reviewer: tab.reviewer || 'Reviewer',
                framework: tab.framework || 'Aetheris',
                mode: 'demo'
              })
            });
            const scaffoldData = await scaffoldRes.json();
            console.log('[TerminalGUI] Scaffold result:', scaffoldData);
            
            const pagePath = scaffoldData.filePath || `${workspaceDir || ''}\\${folderName}\\index.html`;
            const previewUrl = scaffoldData.previewUrl || `${API_BASE}/workspace/${folderName}/index.html`;

            setTimeout(() => {
              if (showConfirm) {
                showConfirm(
                  `🎉 สร้างหน้าเว็บสำเร็จแล้ว!\n\nไฟล์ HTML ถูกเขียนลง workspace จริงแล้ว คลิกลิงก์ด้านล่างเพื่อเปิดดูผลงานได้เลย`,
                  () => {
                    onSendCommand(tab.id, `Start-Process "${folderName}\\index.html"`);
                  },
                  'WEB PAGE CREATED ✓',
                  {
                    linkUrl: previewUrl,
                    linkText: `เปิดดูเว็บ → ${previewUrl}`,
                    copyText: pagePath,
                    confirmText: '🚀 Launch ใน Browser',
                    cancelText: 'ปิด'
                  }
                );
              }
            }, 500);

          } catch (scaffoldErr) {
            console.error('[TerminalGUI] Scaffold API error:', scaffoldErr);
            // Fallback: show dialog with info even if scaffold failed
            setTimeout(() => {
              if (showConfirm) {
                showConfirm(
                  `⚠️ เอเจนต์รันคำสั่งเสร็จแล้ว แต่เกิดข้อผิดพลาดในการเขียนไฟล์\n\nError: ${scaffoldErr.message}`,
                  () => {},
                  'SCAFFOLD ERROR',
                  { confirmText: 'รับทราบ', cancelText: 'ปิด' }
                );
              }
            }, 500);
          }

        } else if (createdFile) {

          // Extract filename from commands
          const filenameMatch = data.commands
            .join('\n')
            .match(/(?:New-Item|Set-Content|Out-File)\s+["-]?(?:Path\s+"?)?([a-zA-Z0-9_.\-\\\/]+\.[a-zA-Z0-9]+)/i);
          const filename = filenameMatch ? filenameMatch[1].replace(/"/g, '') : 'output.txt';
          const filePath = workspaceDir ? `${workspaceDir}\\${filename}` : filename;

          setTimeout(() => {
            if (showConfirm) {
              showConfirm(
                `📝 สร้างไฟล์สำเร็จแล้ว!\n\nคัดลอก path ด้านล่าง หรือกด "Open" เพื่อเปิดดูเนื้อหาด้วย Notepad`,
                () => {
                  onSendCommand(tab.id, `notepad.exe "${filename}"`);
                },
                'FILE CREATED ✓',
                {
                  copyText: filePath,
                  confirmText: '📂 เปิดใน Notepad',
                  cancelText: 'ปิด'
                }
              );
            }
          }, 1500);

        } else {
          // Generic completion — show simple done dialog
          setTimeout(() => {
            if (showConfirm) {
              showConfirm(
                `✅ Demo pipeline ทำงานเสร็จสมบูรณ์!\n\nรันชุดคำสั่งจำลอง ${data.commands.length} คำสั่งใน PowerShell เรียบร้อย`,
                () => {},
                'TASK COMPLETE',
                {
                  confirmText: 'รับทราบ / OK',
                  cancelText: 'ปิด'
                }
              );
            }
          }, 1500);
        }

      }
    } catch (err) {
      console.error('[AI Trigger Error] ', err);
    } finally {
      setAgentThinking(false);
    }
  };

  const triggerPresetGoal = () => {
    if (!isAiActive()) {
      onOpenActivation();
      return;
    }
    if (tab.initialGoal && tab.initialGoal !== 'Standby for commands') {
      handleAiPrompt(tab.initialGoal);
    }
  };

  return (
    <div className="aether-terminal-gui" style={{ background: activeTheme.bg }}>
      
      {/* Left Workspace viewport */}
      <div className="terminal-workspace-container">
        
        {/* Workspace Active status header */}
        <div className="terminal-status-bar">
          <div className="status-left">
            <div className="status-pulse-led"></div>
            <span className="status-label">SESSION:</span>
            <span className="status-value">{tab.id}</span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <span className="status-label">PATH:</span>
            <span className="status-path-value">{tab.currentDir}</span>
          </div>

          <div className="status-right">
            <div className="preview-controls">
              {tab.preview?.running ? (
                <>
                  <button
                    type="button"
                    onClick={() => window.open(tab.preview.url, '_blank', 'noopener,noreferrer')}
                    className="btn-status-action btn-status-preview-live"
                    title={tab.preview.url}
                  >
                    <ExternalLink style={{ width: '12px', height: '12px' }} />
                    Preview {tab.preview.port}
                  </button>
                  <button
                    type="button"
                    onClick={() => onStopPreview(tab.id)}
                    disabled={tab.preview?.loading}
                    className="btn-status-action btn-status-preview-stop"
                  >
                    <Square style={{ width: '11px', height: '11px' }} />
                    Stop
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartPreview(tab.id)}
                  disabled={tab.preview?.loading}
                  className="btn-status-action"
                  title="Start this session's dev server on its managed preview port"
                >
                  <Play style={{ width: '12px', height: '12px' }} />
                  {tab.preview?.loading ? 'Starting...' : 'Run Preview'}
                </button>
              )}
            </div>

            {tab.initialGoal && tab.initialGoal !== 'Standby for commands' && (
              <button
                onClick={triggerPresetGoal}
                disabled={agentThinking}
                className="btn-status-action"
              >
                รันแผนงานเริ่มต้น / Run Goal
              </button>
            )}

            {tab.blocks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (showConfirm) {
                    showConfirm(
                      'ล้าง block ทั้งหมดของ session นี้เพื่อเริ่มรันแผนงานใหม่ด้วยหน้าจอสะอาด?',
                      () => onClearBlocks(tab.id),
                      'CLEAR SESSION OUTPUT',
                      {
                        confirmText: 'Clear All',
                        cancelText: 'Cancel'
                      }
                    );
                  } else {
                    onClearBlocks(tab.id);
                  }
                }}
                disabled={tab.agentRunning}
                className="btn-status-action btn-status-clear"
                title="Clear all terminal blocks in this session"
              >
                <Trash2 style={{ width: '12px', height: '12px' }} />
                Clear All
              </button>
            )}

            {tab.agentRunning && !demoMode && (
              <button
                type="button"
                onClick={() => onStopAgent(tab.id)}
                className="btn-status-action btn-status-preview-stop"
                title="หยุด agent CLI ที่กำลังรันอยู่"
              >
                <Square style={{ width: '11px', height: '11px' }} />
                Stop Agent
              </button>
            )}

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-status-toggle-side"
            >
              {sidebarOpen ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
              <span>{sidebarOpen ? "Hide Drawer" : "Show Drawer"}</span>
            </button>
          </div>
        </div>

        {/* Console Viewport list of cards */}
        <div className="terminal-blocks-viewport">
          {tab.blocks.length === 0 ? (
            <div className="terminal-empty-placeholder">
              <ShellIcon className="placeholder-icon" style={{ width: '48px', height: '48px' }} />
              <h3 className="placeholder-title">
                Aetheris Persistent Shell Sandbox
              </h3>
              <p className="placeholder-desc">
                ป้อนคำสั่งเชลล์โดยตรงทางบรรทัดสั่งการ หรือเปลี่ยนไปใช้ <strong style={{ color: 'var(--color-cyan)' }}>AI Prompt Mode</strong> ด้านล่าง เพื่อสั่งการให้เอเจนต์เขียนโค้ดและช่วยรันคำสั่งโดยอัตโนมัติ
              </p>
              
              {tab.initialGoal && tab.initialGoal !== 'Standby for commands' && (
                <div className="placeholder-goal-card">
                  <div className="goal-card-header">
                    <Brain style={{ width: '14px', height: '14px' }} />
                    <span>เป้าหมายแผนงานนี้ / Objective Goal</span>
                  </div>
                  <p className="goal-card-body">{tab.initialGoal}</p>
                  <button
                    onClick={triggerPresetGoal}
                    className="cyber-btn cyber-btn-cyan btn-goal-trigger"
                  >
                    <Sparkles style={{ width: '14px', height: '14px' }} />
                    เริ่มวางแผนและประมวลผลเอเจนต์อัตโนมัติ
                  </button>
                </div>
              )}

              {!isAiActive() && (
                <div style={{
                  marginTop: '16px',
                  background: 'rgba(239, 68, 68, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  maxWidth: '500px',
                  margin: '16px auto 0 auto',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>
                    <Shield style={{ width: '15px', height: '15px' }} />
                    <span>AI SUBSYSTEM INACTIVE (กรุณาเปิดใช้งาน AI)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                    ในการใช้งานฟีเจอร์ AI Prompt จำเป็นต้องมีการเพิ่ม API Key หรือการติดตั้ง AI CLI บน Shell ก่อนใช้การทำงานแบบเอเจนต์
                  </p>
                  <button
                    type="button"
                    onClick={onOpenActivation}
                    className="cyber-btn"
                    style={{
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      fontSize: '11px',
                      padding: '6px 12px',
                      alignSelf: 'flex-start',
                      marginTop: '4px'
                    }}
                  >
                    ตั้งค่าการเปิดใช้งานระบบ AI / Activate Subsystem
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {(tab.agentRunning || tab.agentPtyOutput) && !demoMode && (
                <Suspense fallback={<div className="agent-pty-loading">Loading live agent terminal...</div>}>
                  <AgentPtyTerminal
                    output={tab.agentPtyOutput || ''}
                    running={!!tab.agentRunning}
                    onData={(data) => onSendAgentPtyInput(tab.id, data)}
                    onResize={(cols, rows) => onResizeAgentPty(tab.id, cols, rows)}
                  />
                </Suspense>
              )}
              {tab.blocks.map(block => (
                <TerminalBlock
                  key={block.id}
                  block={block}
                  onExplain={(blockId) => onExplainBlock(tab.id, blockId)}
                  onRemove={(blockId) => onRemoveBlock(tab.id, blockId)}
                  activeTheme={activeTheme}
                  workspaceDir={workspaceDir}
                />
              ))}
            </>
          )}

          {/* Autonomous Thinking Screen overlay */}
          {agentThinking && (
            <div className="aether-neural-block">
              <div className="neural-header">
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--color-cyan)', borderTopColor: 'transparent', animation: 'logo-orbit 1s linear infinite' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="neural-title">
                    AETHERIS AGENT NEURAL THINKING
                  </span>
                  <span className="neural-subtitle">
                    Framework: {frameworkObj.name} • Engine: {llmObj.name}
                  </span>
                </div>
              </div>

              <div className="neural-steps-container">
                {thinkingSteps.map((step, idx) => {
                  const isActive = idx === activeStepIndex;
                  return (
                    <div
                      key={idx}
                      className={`neural-step ${isActive ? 'neural-step-active' : ''}`}
                    >
                      <div className="neural-step-bullet">
                        {idx < activeStepIndex ? (
                          <CheckSquare style={{ width: '14px', height: '14px', color: 'var(--color-emerald)' }} />
                        ) : (
                          <div className="neural-step-bullet-active" style={{ width: '10px', height: '10px', display: isActive ? 'block' : 'none' }}></div>
                        )}
                      </div>
                      <p>{step}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div ref={consoleEndRef} />
        </div>

        {/* Warp Float bottom Input system */}
        <form onSubmit={handleSubmit}>
          <div className={`aether-input-bar ${aiMode ? 'aether-input-bar-ai' : ''}`}>
            
            {/* Left prompt indicator */}
            <div className="input-dir-pill">
              {tab.currentDir ? tab.currentDir.split('\\').pop() : 'Athena'}
            </div>

            {/* Input field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                tab.agentRunning && !demoMode
                  ? `ตอบ ${llmObj.name} CLI ที่กำลังรอ input อยู่...`
                  : aiMode
                    ? demoMode
                  ? "Demo prompt mode: พิมพ์งานตัวอย่างเพื่อใช้ pipeline จำลอง..."
                  : `ส่งงานเข้า ${llmObj.name} CLI จริงใน workspace นี้...`
                  : "พิมพ์คำสั่งเชลล์โดยตรงที่นี่ (เช่น dir, ipconfig, cd ..) แล้วกด Enter..."
              }
              className="input-text-field"
              disabled={agentThinking}
            />

            {/* Actions docks */}
            <div className="input-actions-dock">
              {tab.agentRunning && !demoMode && (
                <span
                  title="ข้อความถัดไปจะถูกส่งเป็น stdin ไปยัง agent CLI ที่กำลังทำงาน"
                  style={{
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '6px',
                    color: 'var(--color-emerald)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '5px 7px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  CLI INPUT
                </span>
              )}

              {/* AI toggle */}
              <button
                type="button"
                onClick={() => {
                  // The submit path decides whether this dispatches to a CLI or the explicit demo pipeline.
                  setAiMode(!aiMode);
                }}
                className={`btn-mode-toggle ${aiMode ? 'btn-mode-toggle-active' : ''}`}
                title={isAiActive() ? "สลับโหมดคำสั่งธรรมดา / AI Prompt" : "ตั้งค่า AI CLI หรือเปิด Demo mode ก่อนใช้งาน"}
                style={{
                  borderColor: !isAiActive() && aiMode ? 'rgba(251, 191, 36, 0.4)' : undefined,
                  background: !isAiActive() && aiMode ? 'rgba(251, 191, 36, 0.04)' : undefined
                }}
              >
                <Sparkles style={{ width: '12px', height: '12px', color: (!isAiActive() && aiMode) ? '#fbbf24' : undefined }} />
                <span>{demoMode ? 'Demo Prompt' : 'AI Prompt'}{!isAiActive() && aiMode ? ' *' : ''}</span>
              </button>

              {/* Submit trigger */}
              <button
                type="submit"
                disabled={!input.trim() || agentThinking}
                className={`btn-input-submit ${input.trim() && !agentThinking ? 'btn-input-submit-active' : ''}`}
              >
                <Send style={{ width: '12px', height: '12px' }} />
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Right Drawer Agent details panel */}
      {sidebarOpen && (
        <aside className="aether-sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Section: Agent Prompt Controls */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">
                <Cpu style={{ width: '14px', height: '14px', color: 'var(--color-cyan)' }} />
                <span>1. Developer Agent Prompt</span>
              </h3>
              <div className="sidebar-card agent-prompt-card">
                <div className="agent-prompt-row">
                  <label>CLI MODEL</label>
                  <select
                    value={tab.llm}
                    onChange={(e) => updateAgentEngine('llm', 'llmModel', e.target.value)}
                    className="agent-model-select"
                    style={{ color: llmObj.color }}
                  >
                    {cliEngines.map(engine => (
                      <option key={engine.id} value={engine.id}>
                        {engine.name} ({engine.provider})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="agent-prompt-row">
                  <label>MODEL</label>
                  <select
                    value={tab.llmModel ?? getDefaultCliModel(tab.llm)}
                    onChange={(e) => onUpdateTab(tab.id, { llmModel: e.target.value })}
                    className="agent-model-select"
                  >
                    {getModelOptions(tab.llm).map(model => (
                      <option key={model.id || 'default'} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={agentPrompts.developer}
                  onChange={(e) => updateAgentPrompt('developer', e.target.value)}
                  className="agent-prompt-textarea"
                  placeholder="Prompt สำหรับ agent เขียนโค้ด/แก้ไฟล์..."
                />
                <button
                  type="button"
                  onClick={() => sendSidebarAgentPrompt('developer', 'Developer Agent', tab.llm)}
                  disabled={tab.agentRunning || agentThinking}
                  className="cyber-btn cyber-btn-cyan agent-prompt-send"
                  title={!agentPrompts.developer.trim() ? "คลิกเพื่อส่ง Test Prompt ทดสอบการเชื่อมต่อ CLI" : "ส่ง Prompt ให้ Developer Agent"}
                >
                  <Send style={{ width: '12px', height: '12px' }} />
                  {agentPrompts.developer.trim() ? "ส่ง Developer Prompt" : "ทดสอบ CLI (Test Prompt)"}
                </button>
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">
                <Eye style={{ width: '14px', height: '14px', color: 'var(--color-emerald)' }} />
                <span>2. Reviewer Agent Prompt</span>
              </h3>
              <div className="sidebar-card agent-prompt-card">
                <div className="agent-prompt-row">
                  <label>CLI MODEL</label>
                  <select
                    value={tab.reviewer || 'Gemini-CLI'}
                    onChange={(e) => updateAgentEngine('reviewer', 'reviewerModel', e.target.value)}
                    className="agent-model-select"
                    style={{ color: reviewerObj.color }}
                  >
                    {cliEngines.map(engine => (
                      <option key={engine.id} value={engine.id}>
                        {engine.name} ({engine.provider})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="agent-prompt-row">
                  <label>MODEL</label>
                  <select
                    value={tab.reviewerModel ?? getDefaultCliModel(tab.reviewer || 'Gemini-CLI')}
                    onChange={(e) => onUpdateTab(tab.id, { reviewerModel: e.target.value })}
                    className="agent-model-select"
                  >
                    {getModelOptions(tab.reviewer || 'Gemini-CLI').map(model => (
                      <option key={model.id || 'default'} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={agentPrompts.reviewer}
                  onChange={(e) => updateAgentPrompt('reviewer', e.target.value)}
                  className="agent-prompt-textarea"
                  placeholder="Prompt สำหรับ agent ตรวจโค้ด/รีวิว/เสนอแก้..."
                />
                <button
                  type="button"
                  onClick={() => sendSidebarAgentPrompt('reviewer', 'Reviewer Agent', tab.reviewer || 'Gemini-CLI')}
                  disabled={tab.agentRunning || agentThinking}
                  className="cyber-btn cyber-btn-cyan agent-prompt-send"
                  title={!agentPrompts.reviewer.trim() ? "คลิกเพื่อส่ง Test Prompt ทดสอบการเชื่อมต่อ CLI" : "ส่ง Prompt ให้ Reviewer Agent"}
                >
                  <Send style={{ width: '12px', height: '12px' }} />
                  {agentPrompts.reviewer.trim() ? "ส่ง Reviewer Prompt" : "ทดสอบ CLI (Test Prompt)"}
                </button>
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">
                <Network style={{ width: '14px', height: '14px', color: 'var(--color-violet)' }} />
                <span>3. Operator Agent Prompt</span>
              </h3>
              <div className="sidebar-card agent-prompt-card">
                <div className="agent-prompt-row">
                  <label>FRAMEWORK</label>
                  <select
                    value={tab.framework}
                    onChange={(e) => onUpdateTab(tab.id, { framework: e.target.value })}
                    className="agent-model-select"
                    style={{ color: frameworkObj.color }}
                  >
                    {AGENT_FRAMEWORKS.map(framework => (
                      <option key={framework.id} value={framework.id}>
                        {framework.name} ({framework.type})
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={agentPrompts.operator}
                  onChange={(e) => updateAgentPrompt('operator', e.target.value)}
                  className="agent-prompt-textarea"
                  placeholder="Prompt สำหรับ agent สั่งรัน/ทดสอบ/จัดการ preview..."
                />
                <button
                  type="button"
                  onClick={() => sendSidebarAgentPrompt('operator', `Operator Agent (${frameworkObj.name})`, tab.llm)}
                  disabled={tab.agentRunning || agentThinking}
                  className="cyber-btn cyber-btn-cyan agent-prompt-send"
                  title={!agentPrompts.operator.trim() ? "คลิกเพื่อส่ง Test Prompt ทดสอบการเชื่อมต่อ CLI" : "ส่ง Prompt ให้ Operator Agent"}
                >
                  <Send style={{ width: '12px', height: '12px' }} />
                  {agentPrompts.operator.trim() ? "ส่ง Operator Prompt" : "ทดสอบ CLI (Test Prompt)"}
                </button>
                {tab.agentRunning && !demoMode && (
                  <button
                    type="button"
                    onClick={() => onStopAgent(tab.id)}
                    className="cyber-btn agent-stop-wide"
                  >
                    <Square style={{ width: '12px', height: '12px' }} />
                    หยุดงาน Agent ที่กำลังรัน
                  </button>
                )}
              </div>
            </div>

            {/* Section: AI Subsystem Status */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">
                <Shield style={{ width: '14px', height: '14px', color: '#06b6d4' }} />
                <span>AI Subsystem Status</span>
              </h3>
              <div className="sidebar-card" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>STATUS:</span>
                    <span style={{ color: isAiActive() ? '#34a853' : '#ef4444', fontWeight: 'bold' }}>
                      {isAiActive() ? 'ACTIVATED' : 'INACTIVE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>API KEYS:</span>
                    <span style={{ color: (apiKeys.gemini || apiKeys.claude || apiKeys.openai) ? '#34a853' : '#ef4444' }}>
                      {(apiKeys.gemini || apiKeys.claude || apiKeys.openai) ? 'CONFIGURED' : 'MISSING'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>AI CLI:</span>
                    <span style={{ color: cliInstalled ? '#34a853' : '#ef4444' }}>
                      {cliInstalled ? 'INSTALLED' : 'MISSING'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenActivation}
                    className="cyber-btn"
                    style={{
                      width: '100%',
                      padding: '6px',
                      fontSize: '11px',
                      borderColor: 'rgba(6, 182, 212, 0.3)',
                      background: 'rgba(6, 182, 212, 0.05)',
                      justifyContent: 'center',
                      marginTop: '4px'
                    }}
                  >
                    ตั้งค่าการเปิดใช้งาน AI / Setup
                  </button>
                </div>
              </div>
            </div>

            {/* Section: Memory Context */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">
                <Brain style={{ width: '14px', height: '14px', color: '#ec4899' }} />
                <span>Memory Context</span>
              </h3>
              <div className="sidebar-memory-list">
                <div className="memory-pill">
                  <span className="memory-key">HOST_OS:</span>
                  <span className="memory-val">Windows_10_Pro</span>
                </div>
                <div className="memory-pill">
                  <span className="memory-key">DEFAULT_SHELL:</span>
                  <span className="memory-val">powershell.exe</span>
                </div>
                {tab.currentDir && (
                  <div className="memory-pill">
                    <span className="memory-key">ACTIVE_PATH:</span>
                    <span className="memory-val" title={tab.currentDir}>Athena\{tab.currentDir.split('\\').pop()}</span>
                  </div>
                )}
                {tab.blocks.length > 0 && (
                  <div className="memory-pill">
                    <span className="memory-key">LAST_CMD:</span>
                    <span className="memory-val">{tab.blocks[tab.blocks.length - 1].command}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Isolation Footer */}
          <div className="sidebar-footer">
            <div className="footer-row">
              <span>SANDBOX:</span>
              <span className="footer-val-green">SECURE LOCAL</span>
            </div>
            <div className="footer-row">
              <span>PTY SHELL:</span>
              <span className="footer-val-cyan">ACTIVE STREAM</span>
            </div>
          </div>
        </aside>
      )}

    </div>
  );
}
