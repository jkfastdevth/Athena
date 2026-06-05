import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import TerminalGUI from './components/TerminalGUI';
import AddTerminalModal from './components/AddTerminalModal';
import ActiveSessionsModal from './components/ActiveSessionsModal';
import SessionsDashboard from './components/SessionsDashboard';
import AiActivationModal from './components/AiActivationModal';
import WorkspaceSetup from './components/WorkspaceSetup';
import CustomDialog from './components/CustomDialog';
import DirectoryBrowserModal from './components/DirectoryBrowserModal';
import { WARP_THEMES, CLI_MODEL_OPTIONS, getDefaultCliModel } from './config/agentConfig';
import { API_BASE, WS_BASE } from './config/runtime';
import { Terminal, Settings, Play, Server, WifiOff, Wifi } from 'lucide-react';
import {
  dbGetSettings,
  dbSetSetting,
  dbGetSessions,
  dbUpsertSession,
  dbTrashSession,
  dbDeleteSession,
  dbGetBlocks,
  dbInsertBlock,
  dbUpdateBlock,
  dbDeleteBlock,
  dbClearBlocks,
  previewStatus,
  previewStart,
  previewStop
} from './api';

export default function App() {
  const [theme, setTheme] = useState('cyberpunk-neon');
  const [crtActive, setCrtActive] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard');
  const [globalStats, setGlobalStats] = useState({
    totalTokens: 142050,
    totalCost: 0.1784
  });

  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('aetheris_api_keys');
      return saved ? JSON.parse(saved) : { gemini: '', claude: '', openai: '' };
    } catch (e) {
      return { gemini: '', claude: '', openai: '' };
    }
  });

  const [cliInstalled, setCliInstalled] = useState(() => {
    return localStorage.getItem('aetheris_cli_installed') === 'true';
  });

  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('aetheris_demo_mode') === 'true';
  });

  const [cliModelOptions, setCliModelOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('aetheris_cli_model_options');
      return saved ? JSON.parse(saved) : CLI_MODEL_OPTIONS;
    } catch {
      return CLI_MODEL_OPTIONS;
    }
  });

  const [workspaceDir, setWorkspaceDir] = useState(() => {
    return localStorage.getItem('aetheris_workspace_dir') || '';
  });

  // Custom styled dialogs state
  const [customDialog, setCustomDialog] = useState(null); 
  // { type: 'alert' | 'confirm', title: string, message: string, onConfirm: () => void, onCancel: () => void }

  // Directory Browser state
  const [dirBrowser, setDirBrowser] = useState(null); 
  // { initialPath: string, onSelect: (path: string) => void }

  const showAlert = (message, title = 'SYSTEM NOTIFICATION') => {
    return new Promise((resolve) => {
      setCustomDialog({
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setCustomDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setCustomDialog(null);
          resolve(false);
        }
      });
    });
  };

  const showConfirm = (message, onConfirm, title = 'CONFIRM ACTION', options = {}) => {
    setCustomDialog({
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setCustomDialog(null);
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setCustomDialog(null);
      },
      ...options
    });
  };

  const openDirectoryBrowser = (initialPath, onSelect) => {
    setDirBrowser({
      initialPath: initialPath || workspaceDir || 'C:\\',
      onSelect
    });
  };

  const dbLoadedRef = useRef(false);

  // Sync settings state to DB & localStorage
  useEffect(() => {
    localStorage.setItem('aetheris_api_keys', JSON.stringify(apiKeys));
    if (dbLoadedRef.current) {
      dbSetSetting('api_keys', JSON.stringify(apiKeys)).catch(err => console.error(err));
    }
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('aetheris_cli_installed', String(cliInstalled));
    if (dbLoadedRef.current) {
      dbSetSetting('cli_installed', String(cliInstalled)).catch(err => console.error(err));
    }
  }, [cliInstalled]);

  useEffect(() => {
    localStorage.setItem('aetheris_demo_mode', String(demoMode));
    if (dbLoadedRef.current) {
      dbSetSetting('demo_mode', String(demoMode)).catch(err => console.error(err));
    }
  }, [demoMode]);

  useEffect(() => {
    localStorage.setItem('aetheris_cli_model_options', JSON.stringify(cliModelOptions));
  }, [cliModelOptions]);

  useEffect(() => {
    localStorage.setItem('aetheris_workspace_dir', workspaceDir);
    if (dbLoadedRef.current) {
      dbSetSetting('workspace_dir', workspaceDir).catch(err => console.error(err));
    }
  }, [workspaceDir]);

  const isAiActive = () => {
    return !!(cliInstalled || demoMode);
  };

  const [tabs, setTabs] = useState([
    {
      id: 'session-main',
      name: 'Agent-Core',
      llm: 'Claude-Code',
              reviewer: 'Gemini-CLI', // Default reviewer stage
              operator: 'Codex',
      llmModel: getDefaultCliModel('Claude-Code'),
      reviewerModel: getDefaultCliModel('Gemini-CLI'),
      operatorModel: getDefaultCliModel('Codex'),
              framework: 'thclaws',
      initialGoal: 'สร้างโฟลเดอร์ชื่อ my-athena-app แล้วลองย้ายตำแหน่งการทำงานเข้าไปในนั้น เพื่อดึงข้อมูลสถานะโฟลเดอร์',
      currentDir: '',
      blocks: [],
      connected: false,
      inTrash: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('session-main');
  const [backendConnected, setBackendConnected] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  const wsMap = useRef(new Map());

  const activeThemeObj = WARP_THEMES.find(t => t.id === theme) || WARP_THEMES[0];

  // Hydrate settings and sessions on mount
  useEffect(() => {
    async function initDbState() {
      try {
        // 1. Load settings
        const settingsRes = await dbGetSettings();
        if (settingsRes.success && settingsRes.data) {
          const s = settingsRes.data;
          if (s.workspace_dir !== undefined) {
            setWorkspaceDir(s.workspace_dir || '');
            localStorage.setItem('aetheris_workspace_dir', s.workspace_dir || '');
          }
          if (s.cli_installed !== undefined) {
            const val = s.cli_installed === 'true';
            setCliInstalled(val);
            localStorage.setItem('aetheris_cli_installed', String(val));
          }
          if (s.demo_mode !== undefined) {
            const val = s.demo_mode === 'true';
            setDemoMode(val);
            localStorage.setItem('aetheris_demo_mode', String(val));
          }
          if (s.api_keys !== undefined) {
            try {
              const keys = JSON.parse(s.api_keys);
              setApiKeys(keys);
              localStorage.setItem('aetheris_api_keys', JSON.stringify(keys));
            } catch (e) {}
          }
        }

        // 2. Load sessions & blocks
        const sessionsRes = await dbGetSessions();
        if (sessionsRes.success && sessionsRes.data) {
          const dbSessions = sessionsRes.data;
          if (dbSessions.length > 0) {
            const hydrated = await Promise.all(
              dbSessions.map(async (sess) => {
                const blocksRes = await dbGetBlocks(sess.id);
                return {
                  ...sess,
                  blocks: blocksRes.success ? blocksRes.data : [],
                  connected: false
                };
              })
            );
            setTabs(hydrated);
            const firstActive = hydrated.find(t => !t.inTrash) || hydrated[0];
            if (firstActive) {
              setActiveTabId(firstActive.id);
            }
          } else {
            // Seed DB with the default session if empty
            const defaultTab = {
              id: 'session-main',
              name: 'Agent-Core',
              llm: 'Claude-Code',
              reviewer: 'Gemini-CLI',
              operator: 'Codex',
              llmModel: getDefaultCliModel('Claude-Code'),
              reviewerModel: getDefaultCliModel('Gemini-CLI'),
              operatorModel: getDefaultCliModel('Codex'),
              framework: 'thclaws',
              initialGoal: 'สร้างโฟลเดอร์ชื่อ my-athena-app แล้วลองย้ายตำแหน่งการทำงานเข้าไปในนั้น เพื่อดึงข้อมูลสถานะโฟลเดอร์',
              currentDir: '',
              blocks: [],
              connected: false,
              inTrash: false
            };
            const savedDefault = await dbUpsertSession(defaultTab);
            setTabs([savedDefault.success && savedDefault.data ? { ...savedDefault.data, blocks: [], connected: false } : defaultTab]);
            setActiveTabId('session-main');
          }
        }
      } catch (err) {
        console.error('[DB Hydration Error] ', err);
      } finally {
        dbLoadedRef.current = true;
        setDbReady(true);
      }
    }
    initDbState();
  }, []);

  // Global heartbeat to check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ai/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'test', output: 'test' })
        });
        if (res.ok) setBackendConnected(true);
      } catch (e) {
        setBackendConnected(false);
      }
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  const stripAnsi = (text) => {
    if (!text) return '';
    // Strip ANSI escape codes
    let cleaned = text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
    // Strip OSC sequences
    cleaned = cleaned.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '');
    // Handle backspaces
    while (cleaned.includes('\b')) {
      cleaned = cleaned.replace(/[^\b]\b/g, '');
      cleaned = cleaned.replace(/^\b/g, '');
    }
    // Handle carriage returns (approximate for static display)
    cleaned = cleaned.replace(/[^\n\r]*\r/g, (match) => {
      const parts = match.split('\r');
      return parts[parts.length - 1];
    });
    return cleaned;
  };

  // WebSocket Orchestration for all active tabs
  useEffect(() => {
    if (!dbReady || !workspaceDir) return; // Wait until sessions and workspace directory are configured.

    tabs.forEach(tab => {
      if (wsMap.current.has(tab.id)) return; // already connecting/connected

      const hasAbsoluteWindowsPath = /^[a-zA-Z]:[\\/]/.test(tab.currentDir || '');
      const sessionCwd = hasAbsoluteWindowsPath ? tab.currentDir : (tab.projectDir || workspaceDir);
      const projectDir = tab.projectDir || '';
      console.log(`[App] Initializing WebSocket connection for: ${tab.id} in ${sessionCwd}`);
      const ws = new WebSocket(`${WS_BASE}/terminal?id=${tab.id}&cwd=${encodeURIComponent(sessionCwd)}&projectDir=${encodeURIComponent(projectDir)}&workspaceDir=${encodeURIComponent(workspaceDir)}`);
      wsMap.current.set(tab.id, ws);

      ws.onopen = () => {
        setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, connected: true } : t));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setTabs(prev => {
            return prev.map(t => {
              if (t.id !== tab.id) return t;

              let updatedBlocks = [...t.blocks];
              let nextPtyOutput = t.agentPtyOutput || '';

              if (data.type === 'agent_pty_output') {
                nextPtyOutput = `${nextPtyOutput}${data.output || ''}`.slice(-240000);
                
                return {
                  ...t,
                  agentPtyOutput: nextPtyOutput,
                  agentRunning: data.agentRunning === undefined ? t.agentRunning : data.agentRunning
                };
              }

              if (data.type === 'output' || data.type === 'error' || data.type === 'agent_state') {
                // Find most recent running block or create one
                let runBlockIndex = updatedBlocks.findIndex(b => b.status === 'running');
                
                const cleanedChunk = stripAnsi(data.output || '');

                if (runBlockIndex === -1) {
                  // Fallback: create a system command block if none is active
                  const newBlockId = 'block-' + Date.now();
                  const newBlock = {
                    id: newBlockId,
                    command: 'system-stream',
                    output: cleanedChunk,
                    status: data.completed ? 'completed' : 'running',
                    time: new Date().toLocaleTimeString(),
                    dir: t.currentDir
                  };
                  dbInsertBlock(tab.id, newBlock).catch(err => console.error(err));
                  updatedBlocks.push(newBlock);
                } else {
                  // Append to active block
                  const block = updatedBlocks[runBlockIndex];
                  
                  // Handle Windows CRLF backspaces/carriage returns
                  let newOutput = `${block.output || ''}${cleanedChunk}`;
                  const status = data.completed ? (data.type === 'error' ? 'error' : 'completed') : 'running';
                  const dir = data.completed && data.currentDir ? data.currentDir : block.dir;

                  const updatedBlock = {
                    ...block,
                    output: newOutput,
                    status,
                    dir
                  };

                  // Stream outputs are written to DB only when finished to avoid hitting the API on every character chunk
                  if (data.completed) {
                    dbUpdateBlock(tab.id, block.id, {
                      output: newOutput,
                      status,
                      dir
                    }).catch(err => console.error(err));
                  }

                  updatedBlocks[runBlockIndex] = updatedBlock;
                }
              }

              return {
                ...t,
                blocks: updatedBlocks,
                currentDir: data.currentDir || t.currentDir,
                agentRunning: data.agentRunning === undefined ? t.agentRunning : data.agentRunning
              };
            });
          });

        } catch (e) {
          console.error('[WS Parse Error] ', e);
        }
      };

      ws.onerror = (e) => {
        console.error(`[WS Error] Tab ${tab.id}: `, e);
        setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, connected: false } : t));
      };

      ws.onclose = () => {
        console.log(`[WS Close] Connection closed for tab: ${tab.id}`);
        wsMap.current.delete(tab.id);
        setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, connected: false } : t));
      };
    });

    // Cleanup: close tabs that were deleted (not in list)
    const tabIds = new Set(tabs.map(t => t.id));
    for (const [id, ws] of wsMap.current.entries()) {
      if (!tabIds.has(id)) {
        console.log(`[App] Closing discarded socket for: ${id}`);
        ws.close();
        wsMap.current.delete(id);
      }
    }
  }, [dbReady, tabs, workspaceDir]);

  // Reconnect websockets if workspaceDir changes
  const prevWorkspaceDir = useRef(workspaceDir);
  useEffect(() => {
    if (prevWorkspaceDir.current !== workspaceDir) {
      console.log(`[App] Workspace directory changed from "${prevWorkspaceDir.current}" to "${workspaceDir}". Reconnecting terminals...`);
      prevWorkspaceDir.current = workspaceDir;
      
      // Close all active connections to force reconnection in the new directory
      wsMap.current.forEach(ws => {
        try { ws.close(); } catch(e) {}
      });
      wsMap.current.clear();
      
      // Reset connected status so they display the connecting loaders properly
      setTabs(prev => prev.map(t => ({ ...t, connected: false })));
    }
  }, [workspaceDir]);

  // Clean up all sockets on unmount
  useEffect(() => {
    return () => {
      wsMap.current.forEach(ws => ws.close());
    };
  }, []);

  const previewPollKey = tabs.map(t => t.id).join('|');
  useEffect(() => {
    if (!dbReady || tabs.length === 0) return undefined;

    let cancelled = false;
    const syncPreviewStatuses = async () => {
      const activeTabs = tabs.filter(t => !t.inTrash);
      const statuses = await Promise.all(
        activeTabs.map(async (tab) => {
          try {
            const response = await previewStatus(tab.id);
            return response.success ? [tab.id, response.data] : null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;
      const statusMap = new Map(statuses.filter(Boolean));
      setTabs(prev => prev.map(tab => {
        const preview = statusMap.get(tab.id);
        return preview ? { ...tab, preview: { ...(tab.preview || {}), ...preview, loading: false } } : tab;
      }));
    };

    syncPreviewStatuses();
    const interval = setInterval(syncPreviewStatuses, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dbReady, previewPollKey]);

  const handleSendCommand = (tabId, commandText) => {
    const ws = wsMap.current.get(tabId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[App] Shell connection is offline.');
      return;
    }

    const blockId = 'block-' + Date.now();
    const targetTab = tabs.find(t => t.id === tabId);
    const dir = targetTab ? targetTab.currentDir : '';

    const newBlock = {
      id: blockId,
      command: commandText,
      output: '',
      status: 'running',
      time: new Date().toLocaleTimeString(),
      dir: dir
    };

    dbInsertBlock(tabId, newBlock).catch(err => console.error(err));

    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      return {
        ...t,
        blocks: [...t.blocks, newBlock]
      };
    }));

    // Send payload to backend shell
    ws.send(JSON.stringify({ type: 'input', command: commandText }));
  };

  const handleSendAgentPrompt = (tabId, promptText, options = {}) => {
    const ws = wsMap.current.get(tabId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[App] Agent shell connection is offline.');
      return;
    }

    const blockId = 'block-' + Date.now();
    const targetTab = tabs.find(t => t.id === tabId);
    const dir = targetTab ? targetTab.currentDir : '';
    const agentName = options.llm || targetTab?.llm || 'Agent CLI';
    const agentModel = options.model ?? targetTab?.llmModel ?? '';
    const agentRole = options.agentRole || 'Agent';

    const newBlock = {
      id: blockId,
      command: `${agentRole} Prompt -> ${agentName}${agentModel ? ` (${agentModel})` : ''}: ${promptText}`,
      output: '',
      status: 'running',
      time: new Date().toLocaleTimeString(),
      dir
    };

    dbInsertBlock(tabId, newBlock).catch(err => console.error(err));
    setTabs(prev => prev.map(t => t.id === tabId ? {
      ...t,
      agentRunning: true,
      agentPtyOutput: '',
      blocks: [...t.blocks, newBlock]
    } : t));

    ws.send(JSON.stringify({
      type: 'agent_prompt',
      llm: agentName,
      model: agentModel,
      prompt: promptText,
      terminalSize: { cols: 100, rows: 28 }
    }));
  };

  const handleStopAgent = (tabId) => {
    const ws = wsMap.current.get(tabId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'agent_stop' }));
    }
  };

  const handleSendAgentInput = (tabId, inputText) => {
    const ws = wsMap.current.get(tabId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[App] Agent shell connection is offline.');
      return;
    }

    ws.send(JSON.stringify({
      type: 'agent_input',
      input: inputText
    }));
  };

  const handleSendAgentPtyInput = (tabId, inputText) => {
    const ws = wsMap.current.get(tabId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'agent_pty_input', input: inputText }));
    }
  };

  const handleResizeAgentPty = (tabId, cols, rows) => {
    const ws = wsMap.current.get(tabId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'agent_pty_resize', cols, rows }));
    }
  };

  const handleStartPreview = async (tabId) => {
    setTabs(prev => prev.map(t => t.id === tabId ? {
      ...t,
      preview: { ...(t.preview || {}), loading: true, error: '' }
    } : t));

    try {
      const response = await previewStart(tabId);
      setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t,
        preview: {
          ...(response.data || {}),
          loading: false,
          error: response.success ? '' : (response.error || 'Unable to start preview.')
        }
      } : t));
    } catch (err) {
      setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t,
        preview: { ...(t.preview || {}), loading: false, error: err.message || 'Unable to start preview.' }
      } : t));
    }
  };

  const handleStopPreview = async (tabId) => {
    setTabs(prev => prev.map(t => t.id === tabId ? {
      ...t,
      preview: { ...(t.preview || {}), loading: true, error: '' }
    } : t));

    try {
      const response = await previewStop(tabId);
      setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t,
        preview: {
          ...(response.data || {}),
          loading: false,
          error: response.success ? '' : (response.error || 'Unable to stop preview.')
        }
      } : t));
    } catch (err) {
      setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t,
        preview: { ...(t.preview || {}), loading: false, error: err.message || 'Unable to stop preview.' }
      } : t));
    }
  };

  const handleExplainBlock = async (tabId, blockId) => {
    const targetTab = tabs.find(t => t.id === tabId);
    if (!targetTab) return;

    const targetBlock = targetTab.blocks.find(b => b.id === blockId);
    if (!targetBlock) return;

    try {
      const response = await fetch(`${API_BASE}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: targetBlock.command, output: targetBlock.output })
      });
      const data = await response.json();

      if (data.success) {
        dbUpdateBlock(tabId, blockId, {
          output: targetBlock.output,
          status: targetBlock.status,
          dir: targetBlock.dir,
          aiExplanation: data
        }).catch(err => console.error(err));

        setTabs(prev => prev.map(t => {
          if (t.id !== tabId) return t;
          return {
            ...t,
            blocks: t.blocks.map(b => b.id === blockId ? { ...b, aiExplanation: data } : b)
          };
        }));
      }
    } catch (err) {
      console.error('[Explain Error] ', err);
    }
  };

  const handleRemoveBlock = (tabId, blockId) => {
    dbDeleteBlock(tabId, blockId).catch(err => console.error(err));

    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      return {
        ...t,
        blocks: t.blocks.filter(b => b.id !== blockId)
      };
    }));
  };

  const handleClearBlocks = (tabId) => {
    dbClearBlocks(tabId).catch(err => console.error(err));

    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      return {
        ...t,
        blocks: [],
        agentPtyOutput: ''
      };
    }));
  };

  const handleAddTab = async (config) => {
    const newId = 'session-' + Math.floor(1000 + Math.random() * 9000);
    const newTab = {
      id: newId,
      name: config.name,
      llm: config.llm,
      reviewer: config.reviewer || 'Gemini-CLI',
      operator: config.operator || 'Codex',
      llmModel: config.llmModel ?? getDefaultCliModel(config.llm),
      reviewerModel: config.reviewerModel ?? getDefaultCliModel(config.reviewer || 'Gemini-CLI'),
      operatorModel: config.operatorModel ?? getDefaultCliModel(config.operator || 'Codex'),
      framework: config.framework,
      initialGoal: config.initialGoal,
      currentDir: '',
      blocks: [],
      connected: false,
      inTrash: false
    };

    try {
      const savedSession = await dbUpsertSession(newTab);
      setTabs(prev => [...prev, savedSession.success && savedSession.data ? { ...savedSession.data, blocks: [], connected: false } : newTab]);
    } catch (err) {
      console.error(err);
      setTabs(prev => [...prev, newTab]);
    }
    setActiveTabId(newId);
    setViewMode('terminal');
  };

  const handleMoveToTrash = (tabId) => {
    dbTrashSession(tabId, true).catch(err => console.error(err));

    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, inTrash: true } : t));
    
    if (activeTabId === tabId) {
      const remainingActive = tabs.filter(t => t.id !== tabId && !t.inTrash);
      if (remainingActive.length > 0) {
        setActiveTabId(remainingActive[0].id);
      } else {
        setViewMode('dashboard');
      }
    }
  };

  const handleRestoreTab = (tabId) => {
    dbTrashSession(tabId, false).catch(err => console.error(err));

    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, inTrash: false } : t));
    setActiveTabId(tabId);
  };

  const handlePermanentDelete = async (tabId) => {
    // Clean up websocket ref immediately
    const ws = wsMap.current.get(tabId);
    if (ws) {
      try {
        ws.close();
      } catch (e) {}
      wsMap.current.delete(tabId);
    }

    setTabs(prev => prev.filter(t => t.id !== tabId));

    try {
      await dbDeleteSession(tabId);
      await fetch(`${API_BASE}/api/session/${tabId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error(`[App] Failed to notify backend to kill session: ${tabId}`, e);
    }
  };

  const handleUpdateTab = (tabId, updates) => {
    setTabs(prev => {
      return prev.map(t => {
        if (t.id === tabId) {
          const updated = { ...t, ...updates };
          dbUpsertSession(updated).catch(err => console.error(err));
          return updated;
        }
        return t;
      });
    });
  };

  const activeTab = tabs.find(t => t.id === activeTabId && !t.inTrash) || tabs.find(t => !t.inTrash);

  return (
    <div className={`crt-container ${crtActive ? 'crt-filter' : ''}`} style={{ backgroundColor: activeThemeObj.bg }}>
      <div className="crt-scanline"></div>
      
      <div className="dashboard-grid">
        
        {/* Header Navigation & Global Tickers */}
        <Header
          theme={theme}
          setTheme={setTheme}
          crtActive={crtActive}
          setCrtActive={setCrtActive}
          tabs={tabs.filter(t => !t.inTrash)}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          onAddTab={() => setModalOpen(true)}
          globalStats={globalStats}
          onShowMonitor={() => setMonitorOpen(true)}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenSettings={() => setActivationOpen(true)}
        />
 
        {/* Local connection warning bar */}
        {!backendConnected && (
          <div className="connection-banner banner-offline">
            <div className="banner-content">
              <WifiOff style={{ width: '15px', height: '15px' }} />
              <span>
                <strong>AETHERIS SERVER OFFLINE:</strong> Local terminal subsystem is currently disconnected. Sockets will re-establish once backend is live.
              </span>
            </div>
            <div className="banner-content">
              <span>Run: <code className="banner-cmd-badge">npm run start</code> to activate local backend.</span>
            </div>
          </div>
        )}

        {backendConnected && (
          <div className="connection-banner banner-online">
            <div className="banner-content">
              <Wifi className="animate-pulse" style={{ width: '14px', height: '14px' }} />
              <span>
                AETHERIS LOCAL SUBPROCESS NETWORK IS ONLINE. ALL SYSTEMS RUNNING STABLY.
              </span>
            </div>
          </div>
        )}

        {/* Tab GUI viewport workspace */}
        <main className="aether-main-workspace">
          {viewMode === 'dashboard' ? (
            <SessionsDashboard
              tabs={tabs}
              activeTabId={activeTabId}
              setActiveTabId={setActiveTabId}
              onRemoveTab={handleMoveToTrash}
              onRestoreTab={handleRestoreTab}
              onPermanentDelete={handlePermanentDelete}
              onAddClick={() => setModalOpen(true)}
              onEnterSession={(tabId) => {
                setActiveTabId(tabId);
                setViewMode('terminal');
              }}
              showConfirm={showConfirm}
            />
          ) : (
            activeTab && (
              <TerminalGUI
                key={activeTab.id}
                tab={activeTab}
                onSendCommand={handleSendCommand}
                onSendAgentPrompt={handleSendAgentPrompt}
                onStopAgent={handleStopAgent}
                onSendAgentInput={handleSendAgentInput}
                onSendAgentPtyInput={handleSendAgentPtyInput}
                onResizeAgentPty={handleResizeAgentPty}
                onStartPreview={handleStartPreview}
                onStopPreview={handleStopPreview}
                onExplainBlock={handleExplainBlock}
                onRemoveBlock={handleRemoveBlock}
                onClearBlocks={handleClearBlocks}
                cliModelOptions={cliModelOptions}
                activeTheme={activeThemeObj}
                globalStats={globalStats}
                setGlobalStats={setGlobalStats}
                apiKeys={apiKeys}
                setApiKeys={setApiKeys}
                cliInstalled={cliInstalled}
                setCliInstalled={setCliInstalled}
                demoMode={demoMode}
                isAiActive={isAiActive}
                onOpenActivation={() => setActivationOpen(true)}
                onUpdateTab={handleUpdateTab}
                workspaceDir={workspaceDir}
                showAlert={showAlert}
                showConfirm={showConfirm}
              />
            )
          )}
        </main>

        {/* Settings Modal (Add tab) */}
        <AddTerminalModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAdd={handleAddTab}
        />

        {/* Sessions Monitor Modal */}
        <ActiveSessionsModal
          isOpen={monitorOpen}
          onClose={() => setMonitorOpen(false)}
          tabs={tabs.filter(t => !t.inTrash)}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          onRemoveTab={handleMoveToTrash}
        />

        {/* AI Activation Modal */}
        <AiActivationModal
          isOpen={activationOpen}
          onClose={() => setActivationOpen(false)}
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
          cliInstalled={cliInstalled}
          setCliInstalled={setCliInstalled}
          demoMode={demoMode}
          setDemoMode={setDemoMode}
          setCliModelOptions={setCliModelOptions}
          activeTheme={activeThemeObj}
          activeTabId={activeTabId}
          onSendCommand={handleSendCommand}
          workspaceDir={workspaceDir}
          setWorkspaceDir={setWorkspaceDir}
          showAlert={showAlert}
          openDirectoryBrowser={openDirectoryBrowser}
        />

        {/* Workspace Setup Screen */}
        {!workspaceDir && (
          <WorkspaceSetup
            onStart={(dir) => setWorkspaceDir(dir)}
            activeTheme={activeThemeObj}
            openDirectoryBrowser={openDirectoryBrowser}
            showAlert={showAlert}
          />
        )}

        {/* Custom dialog alert/confirm overlay */}
        <CustomDialog
          isOpen={!!customDialog}
          {...customDialog}
        />

        {/* Custom Directory Browser Modal overlay */}
        <DirectoryBrowserModal
          isOpen={!!dirBrowser}
          initialPath={dirBrowser?.initialPath}
          onSelect={dirBrowser?.onSelect}
          onClose={() => setDirBrowser(null)}
        />

      </div>
    </div>
  );
}
