import React, { useState, useEffect } from 'react';
import { X, Key, Terminal, Shield, Copy, Check, RotateCw, Play, Sparkles, Eye, EyeOff, AlertTriangle, CheckCircle, XCircle, ExternalLink, Folder } from 'lucide-react';
import { API_BASE } from '../config/runtime';

export default function AiActivationModal({
  isOpen,
  onClose,
  apiKeys,
  setApiKeys,
  cliInstalled,
  setCliInstalled,
  demoMode,
  setDemoMode,
  setCliModelOptions,
  activeTheme,
  activeTabId,
  onSendCommand,
  workspaceDir,
  setWorkspaceDir,
  showAlert,
  openDirectoryBrowser
}) {
  const [activeTab, setActiveTab] = useState('keys'); // 'keys' | 'cli' | 'workspace'
  const [localKeys, setLocalKeys] = useState({ ...apiKeys });
  const [showKey, setShowKey] = useState({ gemini: false, claude: false, openai: false });
  const [copied, setCopied] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [cliTools, setCliTools] = useState(null); // null = not checked yet
  const [verifyError, setVerifyError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [localWorkspaceDir, setLocalWorkspaceDir] = useState(workspaceDir || '');
  const [workspaceSaveSuccess, setWorkspaceSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalWorkspaceDir(workspaceDir || '');
    }
  }, [workspaceDir, isOpen]);

  if (!isOpen) return null;

  const handleSaveWorkspace = (e) => {
    e.preventDefault();
    setWorkspaceDir(localWorkspaceDir);
    setWorkspaceSaveSuccess(true);
    setTimeout(() => {
      setWorkspaceSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleSaveKeys = (e) => {
    e.preventDefault();
    setApiKeys(localKeys);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [id]: false })), 2000);
  };

  const handleRunInstallInTerminal = (cmd) => {
    if (activeTabId && onSendCommand) {
      onSendCommand(activeTabId, cmd);
      onClose();
    } else {
      if (showAlert) {
        showAlert('กรุณาสร้างเซสชันเทอร์มินัลก่อนส่งคำสั่ง!', 'SESSION REQUIRED');
      } else {
        alert('กรุณาสร้างเซสชันเทอร์มินัลก่อนส่งคำสั่ง!');
      }
    }
  };

  // Real CLI detection — calls /api/cli/status endpoint
  const handleVerifyCli = async () => {
    setVerifying(true);
    setCliTools(null);
    setVerifyError(null);

    try {
      const res = await fetch(`${API_BASE}/api/cli/status`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      setCliTools(data.tools);

      const nextModelOptions = {};
      for (const tool of data.tools || []) {
        if (tool.engineId && Array.isArray(tool.models) && tool.models.length > 0) {
          nextModelOptions[tool.engineId] = tool.models;
        }
      }
      if (setCliModelOptions && Object.keys(nextModelOptions).length > 0) {
        setCliModelOptions(prev => ({ ...prev, ...nextModelOptions }));
      }

      if (data.anyInstalled) {
        setCliInstalled(true);
      }
    } catch (err) {
      setVerifyError(`ไม่สามารถเชื่อมต่อ Backend ได้: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleDemoUnlock = () => {
    setDemoMode(!demoMode);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handleResetActivation = () => {
    setLocalKeys({ gemini: '', claude: '', openai: '' });
    setApiKeys({ gemini: '', claude: '', openai: '' });
    setCliInstalled(false);
    setDemoMode(false);
    setCliTools(null);
    setVerifyError(null);
  };

  const installedCount = cliTools ? cliTools.filter(t => t.installed).length : 0;
  return (
    <div className="aether-modal-overlay" style={{ zIndex: 1000 }}>
      <div
        className="aether-modal-window"
        style={{
          maxWidth: '600px',
          borderColor: activeTheme.borderColor,
          boxShadow: activeTheme.glowColor ? `0 0 25px ${activeTheme.borderColor}40` : undefined,
          background: 'rgba(10, 8, 16, 0.97)'
        }}
      >
        {/* Header */}
        <div className="aether-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="glow-icon-box" style={{ color: activeTheme.borderColor }}>
              <Shield style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                AI SUBSYSTEM ACTIVATION CENTER
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                AI Prompt mode uses installed agent CLIs. Demo mode keeps the older simulated walkthrough isolated.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close-modal">
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setActiveTab('keys')}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'none',
              color: activeTab === 'keys' ? '#06b6d4' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === 'keys' ? 'bold' : 'normal',
              borderBottom: activeTab === 'keys' ? '2px solid #06b6d4' : 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px'
            }}
          >
            <Key style={{ width: '14px', height: '14px' }} />
            <span>Option A: API Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'none',
              color: activeTab === 'cli' ? '#a855f7' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === 'cli' ? 'bold' : 'normal',
              borderBottom: activeTab === 'cli' ? '2px solid #a855f7' : 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px'
            }}
          >
            <Terminal style={{ width: '14px', height: '14px' }} />
            <span>Option B: AI CLI</span>
            {cliInstalled && (
              <span style={{ background: 'rgba(52,168,83,0.2)', color: '#34a853', fontSize: '9px', padding: '1px 4px', borderRadius: '10px', border: '1px solid rgba(52,168,83,0.3)', marginLeft: '4px' }}>
                ON
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'none',
              color: activeTab === 'workspace' ? '#ec4899' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === 'workspace' ? 'bold' : 'normal',
              borderBottom: activeTab === 'workspace' ? '2px solid #ec4899' : 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px'
            }}
          >
            <Folder style={{ width: '14px', height: '14px' }} />
            <span>Workspace Settings</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', maxHeight: '420px', overflowY: 'auto' }}>
          {/* ───── OPTION A: API KEYS ───── */}
          {activeTab === 'keys' && (
            <form onSubmit={handleSaveKeys} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.15)',
                padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5'
              }}>
                🔑 <strong>API key storage is reserved for provider integrations.</strong> AI Prompt mode now dispatches to installed CLI agents; use the CLI tab or Demo mode below.
              </div>

              {[
                { id: 'gemini', label: 'GOOGLE GEMINI API KEY', placeholder: 'AIzaSy...' },
                { id: 'claude', label: 'ANTHROPIC CLAUDE API KEY', placeholder: 'sk-ant-api03-...' },
                { id: 'openai', label: 'OPENAI API KEY', placeholder: 'sk-proj-...' },
              ].map(({ id, label, placeholder }) => (
                <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>{label}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showKey[id] ? 'text' : 'password'}
                      value={localKeys[id]}
                      onChange={(e) => setLocalKeys({ ...localKeys, [id]: e.target.value })}
                      placeholder={placeholder}
                      style={{
                        width: '100%', padding: '10px 40px 10px 12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px', color: '#ffffff', fontSize: '13px', fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey({ ...showKey, [id]: !showKey[id] })}
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                    >
                      {showKey[id] ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" className="cyber-btn cyber-btn-cyan" style={{ flex: 1, padding: '12px', fontSize: '12px', justifyContent: 'center' }}>
                  {saveSuccess ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check style={{ width: '14px', height: '14px' }} />
                      <span>บันทึก API Keys สำเร็จ!</span>
                    </div>
                  ) : (
                    <span>บันทึกและเปิดใช้งาน / Save &amp; Activate</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ───── OPTION B: AI CLI ───── */}
          {activeTab === 'cli' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.15)',
                padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5'
              }}>
                💻 <strong>เปิดใช้งานผ่าน AI CLI ที่ติดตั้งบนเครื่อง</strong>: ระบบจะตรวจสอบ PATH ของเครื่องคุณเพื่อหา <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>codex</code>, <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>gemini</code>, <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px' }}>claude</code>
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerifyCli}
                disabled={verifying}
                className="cyber-btn"
                style={{
                  padding: '12px 16px', fontSize: '13px', fontWeight: 'bold',
                  borderColor: 'rgba(168, 85, 247, 0.6)', background: 'rgba(168, 85, 247, 0.08)',
                  justifyContent: 'center', gap: '8px'
                }}
              >
                {verifying ? (
                  <>
                    <RotateCw style={{ width: '14px', height: '14px', animation: 'logo-orbit 1s linear infinite' }} />
                    <span>กำลังสแกนระบบ PATH หา AI CLI ...</span>
                  </>
                ) : (
                  <>
                    <Terminal style={{ width: '14px', height: '14px' }} />
                    <span>🔍 ตรวจสอบ AI CLI บนเครื่องจริง (Scan System PATH)</span>
                  </>
                )}
              </button>

              {/* Error state */}
              {verifyError && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '6px', padding: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start'
                }}>
                  <AlertTriangle style={{ width: '14px', height: '14px', color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.5' }}>{verifyError}</span>
                </div>
              )}

              {/* CLI Status Grid — shown after scan */}
              {cliTools && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Summary bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: installedCount > 0 ? 'rgba(52,168,83,0.06)' : 'rgba(239,68,68,0.04)',
                    border: `1px solid ${installedCount > 0 ? 'rgba(52,168,83,0.2)' : 'rgba(239,68,68,0.15)'}`,
                    borderRadius: '6px', padding: '10px 14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {installedCount > 0
                        ? <CheckCircle style={{ width: '15px', height: '15px', color: '#34a853' }} />
                        : <XCircle style={{ width: '15px', height: '15px', color: '#ef4444' }} />
                      }
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: installedCount > 0 ? '#34a853' : '#ef4444' }}>
                        {installedCount > 0
                          ? `พบ ${installedCount}/${cliTools.length} AI CLI — ระบบพร้อมใช้งาน`
                          : `ไม่พบ AI CLI ใดเลย — กรุณาติดตั้งอย่างน้อย 1 ตัว`
                        }
                      </span>
                    </div>
                    {cliInstalled && (
                      <span style={{ background: 'rgba(52,168,83,0.15)', color: '#34a853', fontSize: '11px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(52,168,83,0.3)' }}>
                        ✓ ACTIVATED
                      </span>
                    )}
                  </div>

                  {/* Per-tool cards */}
                  {cliTools.map(tool => (
                    <div key={tool.id} style={{
                      background: tool.installed ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.2)',
                      border: `1px solid ${tool.installed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                      borderLeft: `3px solid ${tool.installed ? tool.color : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: '6px', padding: '12px 14px',
                      display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                      {/* Tool header row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: tool.installed ? `${tool.color}20` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${tool.installed ? tool.color + '40' : 'rgba(255,255,255,0.06)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 'bold',
                            color: tool.installed ? tool.color : 'rgba(255,255,255,0.3)'
                          }}>
                            {tool.id[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: tool.installed ? '#ffffff' : 'rgba(255,255,255,0.5)' }}>
                              {tool.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{tool.provider}</div>
                          </div>
                        </div>
                        <div style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold',
                          background: tool.installed ? 'rgba(52,168,83,0.12)' : 'rgba(239,68,68,0.08)',
                          color: tool.installed ? '#34a853' : '#ef4444',
                          border: `1px solid ${tool.installed ? 'rgba(52,168,83,0.25)' : 'rgba(239,68,68,0.2)'}`,
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          {tool.installed
                            ? <><CheckCircle style={{ width: '10px', height: '10px' }} /> INSTALLED</>
                            : <><XCircle style={{ width: '10px', height: '10px' }} /> NOT FOUND</>
                          }
                        </div>
                      </div>

                      {/* Version / Path info */}
                      {tool.installed && tool.version && (
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', paddingLeft: '38px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>version › </span>
                          <span style={{ color: tool.color }}>{tool.version}</span>
                        </div>
                      )}
                      {tool.installed && tool.path && (
                        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', paddingLeft: '38px' }}>
                          <span>path › {tool.path}</span>
                        </div>
                      )}
                      {tool.installed && Array.isArray(tool.models) && tool.models.length > 0 && (
                        <div style={{
                          marginLeft: '38px',
                          marginTop: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px'
                        }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                            models › {tool.modelSource === 'cli' ? `from ${tool.modelCommand}` : 'fallback presets'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {tool.models.map(model => (
                              <span
                                key={model.id || 'default'}
                                style={{
                                  fontSize: '10px',
                                  fontFamily: 'monospace',
                                  padding: '3px 7px',
                                  borderRadius: '999px',
                                  color: tool.color,
                                  background: `${tool.color}12`,
                                  border: `1px solid ${tool.color}35`
                                }}
                              >
                                {model.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Not installed — show install command */}
                      {!tool.installed && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px',
                          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '4px', padding: '7px 10px'
                        }}>
                          <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                            {tool.installCmd}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tool.installCmd, `copy-${tool.id}`)}
                            title="Copy install command"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied[`copy-${tool.id}`] ? '#34a853' : 'rgba(255,255,255,0.4)', padding: '2px' }}
                          >
                            {copied[`copy-${tool.id}`] ? <Check style={{ width: '13px', height: '13px' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRunInstallInTerminal(tool.installCmd)}
                            title="Run install in active terminal tab"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', padding: '2px' }}
                          >
                            <Play style={{ width: '13px', height: '13px' }} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Initial state — not scanned yet */}
              {!cliTools && !verifying && !verifyError && (
                <div style={{
                  textAlign: 'center', padding: '24px 16px',
                  background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px'
                }}>
                  <Terminal style={{ width: '28px', height: '28px', color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.6' }}>
                    กด <strong style={{ color: '#a855f7' }}>Scan System PATH</strong> เพื่อตรวจสอบว่า<br />
                    ติดตั้ง AI CLI ตัวใดไว้บนเครื่องแล้วบ้าง
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ───── WORKSPACE SETTINGS ───── */}
          {activeTab === 'workspace' && (
            <form onSubmit={handleSaveWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(236, 72, 153, 0.04)', border: '1px solid rgba(236, 72, 153, 0.15)',
                padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#e2e8f0', lineHeight: '1.5'
              }}>
                📂 <strong>การตั้งค่า Working Directory (ไดเรกทอรีทำงานหลัก)</strong>: โฟลเดอร์หลักที่ระบุจะถูกใช้เป็น Workspace ตั้งต้นสำหรับเซสชันและ Agent ทุกตัวในการเขียนไฟล์ รันคำสั่ง หรือวิเคราะห์โค้ด
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>
                  WORKING DIRECTORY PATH (ไดเรกทอรีที่ทำงานบนเครื่องของคุณ)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <input
                    type="text"
                    value={localWorkspaceDir}
                    onChange={(e) => setLocalWorkspaceDir(e.target.value)}
                    placeholder="เช่น D:\Project\AI\Athena"
                    style={{
                      flex: 1, padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px', color: '#ffffff', fontSize: '13px', fontFamily: 'monospace',
                      minWidth: 0
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (openDirectoryBrowser) {
                        openDirectoryBrowser(localWorkspaceDir, (path) => {
                          setLocalWorkspaceDir(path);
                        });
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '4px',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '0 14px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.4)'; e.currentTarget.style.color = '#ec4899'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                  >
                    <Folder style={{ width: '13px', height: '13px' }} />
                    Browse
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.4' }}>
                  ⚠️ *หมายเหตุ: การเปลี่ยน Working Directory จะมีผลกับเซสชันเทอร์มินัลที่เปิดขึ้นใหม่เท่านั้น
                </span>
              </div>


              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" className="cyber-btn" style={{ flex: 1, padding: '12px', fontSize: '12px', justifyContent: 'center', borderColor: 'rgba(236,72,153,0.5)', background: 'rgba(236,72,153,0.06)', color: '#ec4899' }}>
                  {workspaceSaveSuccess ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check style={{ width: '14px', height: '14px' }} />
                      <span>บันทึกไดเรกทอรีทำงานสำเร็จ!</span>
                    </div>
                  ) : (
                    <span>บันทึกไดเรกทอรีทำงาน / Save Workspace</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="aether-modal-footer" style={{
          borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={handleResetActivation}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
              fontSize: '11px', cursor: 'pointer', textDecoration: 'underline'
            }}
          >
            รีเซ็ตสถานะ / Reset Activation
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDemoUnlock}
              className="cyber-btn"
              style={{ fontSize: '11px', padding: '7px 12px', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', gap: '4px' }}
              title="เปิด pipeline จำลองและ scaffold demo แบบเดิม"
            >
              <Sparkles style={{ width: '12px', height: '12px', color: '#fbbf24' }} />
              <span>{demoMode ? 'Demo Mode On' : 'Demo Mode'}</span>
            </button>
            <button
              onClick={onClose}
              className="cyber-btn"
              style={{ fontSize: '11px', padding: '7px 14px', borderColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
            >
              ปิด / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
