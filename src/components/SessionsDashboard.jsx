import React, { useState } from 'react';
import { Plus, Terminal, Trash2, ExternalLink, Cpu, Network, Shield, Sparkles, Activity, PlusCircle, Eye, RotateCcw } from 'lucide-react';
import { LLM_ENGINES, AGENT_FRAMEWORKS } from '../config/agentConfig';

export default function SessionsDashboard({
  tabs,
  activeTabId,
  setActiveTabId,
  onRemoveTab,
  onRestoreTab,
  onPermanentDelete,
  onAddClick,
  onEnterSession,
  showConfirm
}) {
  const [showTrash, setShowTrash] = useState(false);
  const activeTabs = tabs.filter(t => !t.inTrash);
  const trashedTabs = tabs.filter(t => t.inTrash);
  const displayTabs = showTrash ? trashedTabs : activeTabs;
  return (
    <div style={{
      width: '100%',
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      
      {/* Dashboard Cosmic Header Banner */}
      <div style={{
        position: 'relative',
        padding: '32px',
        borderRadius: '16px',
        background: 'radial-gradient(ellipse at top left, rgba(217, 70, 239, 0.08) 0%, rgba(6, 182, 212, 0.03) 50%, rgba(0, 0, 0, 0) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'hidden'
      }}>
        {/* Orbital Background Glows */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.1)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '20%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(217, 70, 239, 0.05)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)'
          }}>
            <Activity className="animate-pulse" style={{ width: '22px', height: '22px', color: 'var(--color-cyan)' }} />
          </div>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: '900',
              letterSpacing: '0.08em',
              background: 'linear-gradient(90deg, #fff 0%, var(--color-cyan) 50%, #d946ef 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase'
            }}>
              AETHERIS CONTROL DECK
            </h2>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginTop: '4px'
            }}>
              ระบบควบคุมและติดตามการทำงานของ AI Agent Subprocesses และ PTY Shell Sandbox
            </p>
          </div>
        </div>
      </div>

      {/* Grid Card List */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal style={{ width: '15px', height: '15px', color: showTrash ? 'var(--color-rose)' : 'var(--color-cyan)' }} />
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: '800',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              {showTrash ? `TRASHED SESSIONS (${trashedTabs.length})` : `ACTIVE SHELL SESSIONS (${activeTabs.length})`}
            </h3>
          </div>

          {/* Toggle Button Group */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '3px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => setShowTrash(false)}
              className="cyber-btn"
              style={{
                background: !showTrash ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                borderColor: !showTrash ? 'rgba(6, 182, 212, 0.4)' : 'transparent',
                color: !showTrash ? 'var(--color-cyan)' : 'var(--text-muted)',
                boxShadow: !showTrash ? '0 0 10px rgba(6, 182, 212, 0.1)' : 'none',
                padding: '5px 14px',
                fontSize: '10px',
                fontWeight: '700',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease-in-out',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <span>Active</span>
              <span style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '10px',
                background: !showTrash ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: !showTrash ? '#fff' : 'var(--text-muted)'
              }}>{activeTabs.length}</span>
            </button>
            
            <button
              onClick={() => setShowTrash(true)}
              className="cyber-btn"
              style={{
                background: showTrash ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                borderColor: showTrash ? 'rgba(244, 63, 94, 0.4)' : 'transparent',
                color: showTrash ? 'var(--color-rose)' : 'var(--text-muted)',
                boxShadow: showTrash ? '0 0 10px rgba(244, 63, 94, 0.1)' : 'none',
                padding: '5px 14px',
                fontSize: '10px',
                fontWeight: '700',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease-in-out',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <span>Trash Bin</span>
              <span style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '10px',
                background: showTrash ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: showTrash ? '#fff' : 'var(--text-muted)'
              }}>{trashedTabs.length}</span>
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {/* Empty Placeholders */}
          {showTrash && displayTabs.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              border: '1px dashed rgba(244, 63, 94, 0.15)',
              borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.005)',
              color: 'var(--text-muted)',
              gap: '12px'
            }}>
              <Trash2 style={{ width: '32px', height: '32px', color: 'rgba(244, 63, 94, 0.3)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  TRASH BIN IS EMPTY / ถังขยะว่างเปล่า
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: '4px' }}>
                  ไม่มีเซสชันเทอร์มินัลที่ถูกลบชั่วคราวอยู่ในถังขยะ
                </p>
              </div>
            </div>
          )}

          {!showTrash && displayTabs.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              border: '1px dashed rgba(6, 182, 212, 0.15)',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.005)',
              color: 'var(--text-muted)',
              gap: '12px'
            }}>
              <Terminal style={{ width: '32px', height: '32px', color: 'rgba(6, 182, 212, 0.3)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  NO ACTIVE SESSIONS / ไม่มีเซสชันที่กำลังรันอยู่
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: '4px' }}>
                  กรุณากดปุ่มสร้างเซสชันเทอร์มินัลด้านล่าง หรือกู้คืนเซสชันเดิมจากถังขยะ
                </p>
              </div>
            </div>
          )}

          {displayTabs.map(tab => {
            const isTabActive = tab.id === activeTabId;
            const llmObj = LLM_ENGINES.find(l => l.id === tab.llm) || LLM_ENGINES[0];
            const reviewerObj = LLM_ENGINES.find(l => l.id === (tab.reviewer || 'Gemini-CLI')) || LLM_ENGINES[1];
            const frameworkObj = AGENT_FRAMEWORKS.find(f => f.id === tab.framework) || AGENT_FRAMEWORKS[0];

            return (
              <div
                key={tab.id}
                className="sidebar-card"
                style={{
                  position: 'relative',
                  borderColor: showTrash ? 'rgba(244, 63, 94, 0.15)' : (isTabActive ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255, 255, 255, 0.04)'),
                  boxShadow: showTrash ? 'none' : (isTabActive ? '0 0 20px rgba(6, 182, 212, 0.08)' : 'none'),
                  background: showTrash ? 'rgba(244, 63, 94, 0.015)' : (isTabActive ? 'rgba(6, 182, 212, 0.015)' : 'rgba(255, 255, 255, 0.01)'),
                  padding: '24px',
                  borderRadius: '12px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '270px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Active Indicator Border Strip */}
                {!showTrash && isTabActive && (
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '20px',
                    right: '20px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, var(--color-cyan), transparent)',
                    boxShadow: '0 0 8px var(--color-cyan)'
                  }} />
                )}

                {/* Card Top Information */}
                <div>
                  <div className="sidebar-card-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className={`tab-status-dot ${tab.connected ? 'tab-status-dot-active' : ''}`} style={{ width: '7px', height: '7px' }}></div>
                      <span 
                        style={{ 
                          fontFamily: 'var(--font-display)',
                          fontSize: '16px', 
                          color: !showTrash && isTabActive ? 'var(--color-cyan)' : 'var(--text-primary)',
                          fontWeight: '800',
                          letterSpacing: '0.03em'
                        }}
                      >
                        {tab.name}
                      </span>
                    </div>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-mono)',
                        fontSize: '8px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: showTrash ? 'rgba(244, 63, 94, 0.1)' : (tab.connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                        color: showTrash ? 'var(--color-rose)' : (tab.connected ? 'var(--color-emerald)' : 'var(--color-rose)'),
                        border: `1px solid ${showTrash ? 'rgba(244, 63, 94, 0.2)' : (tab.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')}`,
                        letterSpacing: '0.08em'
                      }}
                    >
                      {showTrash ? 'TRASHED' : (tab.connected ? 'ACTIVE' : 'OFFLINE')}
                    </span>
                  </div>

                  {/* Goal Text Area */}
                  {tab.initialGoal && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(255, 255, 255, 0.03)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '16px',
                      lineHeight: '1.4',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Goal:</span> {tab.initialGoal}
                    </div>
                  )}

                  {/* 3-Stage Pipeline Flow Visual */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(10, 6, 21, 0.5)',
                    border: '1px solid rgba(217, 70, 239, 0.15)',
                    marginBottom: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '7px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DEV</span>
                      <strong style={{ color: llmObj.color, textShadow: `0 0 4px ${llmObj.glowColor}` }}>{llmObj.name}</strong>
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.15)', fontSize: '12px' }}>&rarr;</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '7px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>REVIEW</span>
                      <strong style={{ color: reviewerObj.color, textShadow: `0 0 4px ${reviewerObj.glowColor}` }}>{reviewerObj.name}</strong>
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.15)', fontSize: '12px' }}>&rarr;</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '7px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EXEC</span>
                      <strong style={{ color: frameworkObj.color, textShadow: `0 0 4px ${frameworkObj.glowColor}` }}>{frameworkObj.name}</strong>
                    </div>
                  </div>

                  {/* Session Metadata grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Cpu style={{ width: '12px', height: '12px', color: llmObj.color || 'var(--text-muted)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', width: '85px', flexShrink: 0 }}>Developer:</span>
                      <strong style={{ color: llmObj.color }}>{llmObj.name}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Eye style={{ width: '12px', height: '12px', color: reviewerObj.color || 'var(--text-muted)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', width: '85px', flexShrink: 0 }}>Reviewer:</span>
                      <strong style={{ color: reviewerObj.color }}>{reviewerObj.name}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Network style={{ width: '12px', height: '12px', color: frameworkObj.color || 'var(--text-muted)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', width: '85px', flexShrink: 0 }}>Operator:</span>
                      <strong style={{ color: frameworkObj.color }}>{frameworkObj.name}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Shield style={{ width: '12px', height: '12px', color: 'var(--color-emerald)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', width: '85px', flexShrink: 0 }}>Blocks Ran:</span>
                      <strong style={{ color: 'var(--color-emerald)' }}>{tab.blocks.length} commands</strong>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ 
                  borderTop: '1px solid rgba(255, 255, 255, 0.04)', 
                  paddingTop: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  {/* Active working directory path */}
                  <div 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '9px', 
                      color: 'var(--text-muted)',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={tab.currentDir}
                  >
                    {tab.currentDir ? tab.currentDir : 'Sandbox'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {showTrash ? (
                      <>
                        {/* Restore Button */}
                        <button
                          onClick={() => onRestoreTab(tab.id)}
                          className="btn-status-action"
                          style={{
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '10px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            borderColor: 'var(--color-cyan)',
                            backgroundColor: 'rgba(6, 182, 212, 0.12)',
                            boxShadow: '0 0 10px rgba(6, 182, 212, 0.15)',
                            cursor: 'pointer'
                          }}
                          title="กู้คืนเซสชันนี้กลับมาทำงาน / Restore Session"
                        >
                          <RotateCcw style={{ width: '12px', height: '12px' }} />
                          <span>RESTORE</span>
                        </button>

                        {/* Permanent Delete Button */}
                        <button
                          onClick={() => {
                            showConfirm(
                              `คุณต้องการลบเซสชัน "${tab.name}" และทำลายโปรเซสเบื้องหลังอย่างถาวรใช่หรือไม่?\nWarning: This will terminate the shell backend process permanently.`,
                              () => onPermanentDelete(tab.id),
                              'CONFIRM DELETION / ยืนยันการลบถาวร'
                            );
                          }}
                          className="btn-block-action btn-block-action-rose"
                          style={{
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '10px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          title="ลบออกถาวรและทำลายโปรเซส / Delete Permanently"
                        >
                          <Trash2 style={{ width: '12px', height: '12px' }} />
                          <span>DELETE</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Close Tab Button */}
                        <button
                          onClick={() => onRemoveTab(tab.id)}
                          className="btn-block-action btn-block-action-rose"
                          style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
                          title="ย้ายเซสชันเข้าถังขยะ / Move to Trash"
                        >
                          <Trash2 style={{ width: '14px', height: '14px' }} />
                        </button>

                        {/* Connect / Enter Terminal GUI */}
                        <button
                          onClick={() => onEnterSession(tab.id)}
                          className="btn-status-action"
                          style={{
                            padding: '6px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '10px',
                            fontWeight: '700',
                            borderRadius: '6px',
                            borderColor: isTabActive ? 'var(--color-cyan)' : 'rgba(255, 255, 255, 0.1)',
                            backgroundColor: isTabActive ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            boxShadow: isTabActive ? '0 0 10px rgba(6, 182, 212, 0.15)' : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <ExternalLink style={{ width: '12px', height: '12px' }} />
                          <span>{isTabActive ? 'ENTER ACTIVE' : 'OPEN TERMINAL'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* "+ CREATE TERMINAL GUI & AI AGENT" Card */}
          {!showTrash && (
            <div
              onClick={onAddClick}
              style={{
                position: 'relative',
                cursor: 'pointer',
                border: '2px dashed rgba(6, 182, 212, 0.25)',
                background: 'rgba(6, 182, 212, 0.01)',
                padding: '24px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '250px',
                gap: '16px',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.6)';
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.03)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(6, 182, 212, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.25)';
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.01)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Spinning decorative background grid */}
              <div style={{
                position: 'absolute',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '1px dashed rgba(6, 182, 212, 0.1)',
                animation: 'logo-orbit 20s linear infinite',
                pointerEvents: 'none'
              }} />

              <div style={{
                padding: '16px',
                borderRadius: '50%',
                background: 'rgba(6, 182, 212, 0.06)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.05)'
              }}>
                <PlusCircle style={{ width: '28px', height: '28px', color: 'var(--color-cyan)' }} />
              </div>

              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  fontWeight: '900',
                  letterSpacing: '0.08em',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase'
                }}>
                  CREATE TERMINAL GUI & AI AGENT
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4'
                }}>
                  สร้างเซสชันเทอร์มินัล PTY ใหม่ พร้อมตั้งค่า AI Agent เพื่อสั่งงานอัตโนมัติ
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
