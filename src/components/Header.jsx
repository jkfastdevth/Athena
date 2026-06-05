import React, { useEffect, useState } from 'react';
import { Terminal, Cpu, Database, DollarSign, Activity, Monitor, Palette, Plus, LayoutGrid, Settings } from 'lucide-react';
import { WARP_THEMES } from '../config/agentConfig';

export default function Header({
  theme,
  setTheme,
  crtActive,
  setCrtActive,
  tabs,
  activeTabId,
  setActiveTabId,
  onAddTab,
  globalStats,
  onShowMonitor,
  viewMode,
  setViewMode,
  onOpenSettings
}) {
  const [tickerCpu, setTickerCpu] = useState(12.4);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [memKib, setMemKib] = useState(14248);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerCpu(prev => {
        const diff = (Math.random() - 0.5) * 2.2;
        return parseFloat(Math.min(Math.max(prev + diff, 4), 48).toFixed(1));
      });
      setMemKib(prev => {
        const diff = Math.floor((Math.random() - 0.5) * 80);
        return Math.min(Math.max(prev + diff, 12000), 18000);
      });
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const activeThemeObj = WARP_THEMES.find(t => t.id === theme) || WARP_THEMES[0];

  return (
    <header className="aether-header">
      <div 
        className="aether-brand" 
        onClick={() => setViewMode('dashboard')}
        style={{ cursor: 'pointer' }}
        title="กลับหน้าแรกแดชบอร์ด / Back to Dashboard"
      >
        <div className="aether-logo-icon">
          <Terminal style={{ width: '20px', height: '20px', color: '#d946ef' }} />
          <div className="aether-logo-glow"></div>
        </div>
        <div className="aether-title-group">
          <h1>AETHERIS OS</h1>
          <p>AI Agentic Terminal Subsystem • v2.6.5</p>
        </div>
      </div>

      <div className="aether-tickers">
        <div 
          className="ticker-item" 
          onClick={onShowMonitor}
          style={{ cursor: 'pointer' }}
          title="เปิดระบบเฝ้าระวังเซสชันทั้งหมด / Open Sessions Monitor"
        >
          <Activity style={{ width: '13px', height: '13px', color: 'var(--color-cyan)' }} />
          <span className="ticker-label">SHELLS:</span>
          <span className="ticker-value" style={{ color: 'var(--color-cyan)' }}>{tabs.length}</span>
        </div>

        <div className="ticker-item-separator"></div>

        <div className="ticker-item">
          <Database style={{ width: '13px', height: '13px', color: 'var(--color-emerald)' }} />
          <span className="ticker-label">VEC-MEM:</span>
          <span className="ticker-value" style={{ color: 'var(--color-emerald)' }}>{memKib.toLocaleString()} KiB</span>
        </div>

        <div className="ticker-item-separator"></div>

        <div className="ticker-item">
          <Cpu style={{ width: '13px', height: '13px', color: 'var(--color-amber)' }} />
          <span className="ticker-label">CPU-SIM:</span>
          <span className="ticker-value" style={{ color: 'var(--color-amber)' }}>{tickerCpu}%</span>
        </div>

        <div className="ticker-item-separator"></div>

        <div className="ticker-item">
          <DollarSign style={{ width: '13px', height: '13px', color: 'var(--color-violet)' }} />
          <span className="ticker-label">TOKENS:</span>
          <span className="ticker-value" style={{ color: 'var(--color-violet)' }}>{globalStats.totalTokens.toLocaleString()}</span>
        </div>

        <div className="ticker-item-separator"></div>

        <div className="ticker-item">
          <span className="ticker-label">COST:</span>
          <span className="ticker-value" style={{ color: 'var(--color-emerald)' }}>${globalStats.totalCost.toFixed(5)}</span>
        </div>
      </div>

      {/* Controls: Tab capsules + Tools */}
      <div className="aether-controls">

        <div className="tabs-container">
          {/* Dashboard Toggle Button */}
          <button
            onClick={() => setViewMode('dashboard')}
            className={`tab-btn ${viewMode === 'dashboard' ? 'tab-btn-active' : ''}`}
            style={{
              borderColor: viewMode === 'dashboard' ? 'rgba(6, 182, 212, 0.45)' : undefined,
              boxShadow: viewMode === 'dashboard' ? '0 0 10px rgba(6, 182, 212, 0.15)' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="ไปที่ Dashboard แดชบอร์ด"
          >
            <LayoutGrid style={{ width: '12px', height: '12px', color: 'var(--color-cyan)' }} />
            <span>Dashboard</span>
          </button>

          {tabs.map(tab => {
            const isActive = viewMode === 'terminal' && activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setViewMode('terminal');
                }}
                className={`tab-btn ${isActive ? 'tab-btn-active' : ''}`}
                style={{
                  borderColor: isActive ? activeThemeObj.borderColor + '55' : undefined,
                  boxShadow: isActive ? `0 0 10px ${activeThemeObj.borderColor}25` : undefined
                }}
              >
                <div className={`tab-status-dot ${tab.connected ? 'tab-status-dot-active' : ''}`}></div>
                {tab.name}
              </button>
            );
          })}

          <button
            onClick={onAddTab}
            className="btn-add-tab"
            title="เพิ่ม Terminal ใหม่"
          >
            <Plus style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        <div className="tools-group">
          <button
            onClick={() => setCrtActive(!crtActive)}
            className={`btn-tool ${crtActive ? 'btn-tool-active' : ''}`}
            title="เปิด-ปิดจอ CRT Scanlines"
          >
            <Monitor style={{ width: '15px', height: '15px' }} />
          </button>

          <button
            onClick={onOpenSettings}
            className="btn-tool"
            title="ตั้งค่าการเปิดใช้งาน AI และระบบทำงาน / AI & System Settings"
            style={{
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-cyan)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <Settings style={{ width: '15px', height: '15px' }} />
          </button>

          <div className="palette-dropdown">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              className="btn-tool"
              title="เปลี่ยนธีมหน้าต่าง"
            >
              <Palette style={{ width: '15px', height: '15px' }} />
            </button>

            {dropdownOpen && (
              <div className="palette-menu">
                <div className="palette-title">Warp Themes / ธีมระบบ</div>
                {WARP_THEMES.map(t => (
                  <button
                    key={t.id}
                    onMouseDown={() => setTheme(t.id)}
                    className={`palette-item ${theme === t.id ? 'palette-item-active' : ''}`}
                  >
                    {t.name}
                    <div className="palette-dot" style={{ backgroundColor: t.borderColor, boxShadow: `0 0 6px ${t.borderColor}` }}></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
