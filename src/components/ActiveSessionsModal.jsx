import React from 'react';
import { X, Terminal, Trash2, ExternalLink, Cpu, Network, Shield, AlertTriangle } from 'lucide-react';
import { LLM_ENGINES, AGENT_FRAMEWORKS } from '../config/agentConfig';

export default function ActiveSessionsModal({
  isOpen,
  onClose,
  tabs,
  activeTabId,
  setActiveTabId,
  onRemoveTab
}) {
  if (!isOpen) return null;

  return (
    <div className="aether-modal-overlay">
      <div className="aether-modal-content" style={{ maxWidth: '960px', width: '90%' }}>
        
        {/* Header Modal */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Terminal className="animate-pulse" style={{ width: '18px', height: '18px', color: 'var(--color-cyan)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '800', letterSpacing: '0.05em' }}>
                AETHERIS OS: SESSIONS MONITOR
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8.5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>
                เฝ้าระวังเซสชันการทำงานจริงและ PTY Subprocesses แบบ Real-Time
              </span>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Sessions Grid */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '6px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            padding: '4px'
          }}>
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId;
              const llmObj = LLM_ENGINES.find(l => l.id === tab.llm) || LLM_ENGINES[0];
              const frameworkObj = AGENT_FRAMEWORKS.find(f => f.id === tab.framework) || AGENT_FRAMEWORKS[0];

              return (
                <div
                  key={tab.id}
                  className="sidebar-card"
                  style={{
                    position: 'relative',
                    borderColor: isActive ? 'rgba(6, 182, 212, 0.45)' : 'rgba(255, 255, 255, 0.05)',
                    boxShadow: isActive ? '0 0 16px rgba(6, 182, 212, 0.15)' : 'none',
                    background: isActive ? 'rgba(6, 182, 212, 0.02)' : 'rgba(255, 255, 255, 0.015)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '220px'
                  }}
                >
                  {/* Card Header */}
                  <div>
                    <div className="sidebar-card-header" style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className={`tab-status-dot ${tab.connected ? 'tab-status-dot-active' : ''}`}></div>
                        <span 
                          className="sidebar-card-name" 
                          style={{ 
                            fontSize: '15px', 
                            color: isActive ? 'var(--color-cyan)' : 'var(--text-primary)',
                            fontWeight: '800' 
                          }}
                        >
                          {tab.name}
                        </span>
                      </div>
                      <span className="sidebar-card-badge" style={{ fontSize: '8px' }}>
                        {tab.connected ? 'ACTIVE' : 'OFFLINE'}
                      </span>
                    </div>

                    {/* Metadata specs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <Cpu style={{ width: '12px', height: '12px', color: llmObj.color || 'var(--text-muted)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>Engine:</span>
                        <strong style={{ color: llmObj.color }}>{llmObj.name}</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <Network style={{ width: '12px', height: '12px', color: frameworkObj.color || 'var(--text-muted)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>Framework:</span>
                        <strong style={{ color: frameworkObj.color }}>{frameworkObj.name}</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <Shield style={{ width: '12px', height: '12px', color: 'var(--color-emerald)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)' }}>Blocks Ran:</span>
                        <strong style={{ color: 'var(--color-emerald)' }}>{tab.blocks.length} commands</strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                    paddingTop: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    {/* Path Tooltip */}
                    <div 
                      style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '9px', 
                        color: 'var(--text-muted)',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={tab.currentDir}
                    >
                      {tab.currentDir ? tab.currentDir.split('\\').pop() : 'Sandbox'}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Close Tab Button */}
                      {tabs.length > 1 && (
                        <button
                          onClick={() => onRemoveTab(tab.id)}
                          className="btn-block-action btn-block-action-rose"
                          style={{ padding: '6px' }}
                          title="ปิดและทำลายโปรเซสนี้ / Terminate Session"
                        >
                          <Trash2 style={{ width: '12px', height: '12px' }} />
                        </button>
                      )}

                      {/* Connect / Switch Tab */}
                      <button
                        onClick={() => {
                          setActiveTabId(tab.id);
                          onClose();
                        }}
                        className="btn-status-action"
                        style={{
                          padding: '5px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '9px',
                          borderColor: isActive ? 'var(--color-cyan)' : undefined,
                          backgroundColor: isActive ? 'rgba(6, 182, 212, 0.15)' : undefined
                        }}
                      >
                        <ExternalLink style={{ width: '10px', height: '10px' }} />
                        <span>{isActive ? 'ACTIVE' : 'SWITCH'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Warning */}
        <div style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
          paddingTop: '18px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          color: 'var(--color-amber)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)'
        }}>
          <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span>
            คำเตือน: การกดลบเซสชัน (Trash) จะย้ายเซสชันเข้าถังขยะชั่วคราวโดยไม่ตัดการเชื่อมต่อทันที หากต้องการลบและทำลายโปรเซสอย่างถาวร กรุณาลบเซสชันจากถังขยะในหน้า Dashboard
          </span>
        </div>

      </div>
    </div>
  );
}
