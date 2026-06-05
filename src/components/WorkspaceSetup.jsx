import React, { useState, useEffect, useRef } from 'react';
import { Folder, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { dbGetRecentDirs, dbAddRecentDir } from '../api';

const RECENTS_KEY = 'aetheris_recent_dirs';
const MAX_RECENTS = 5;

function loadRecents() {
  try {
    const saved = localStorage.getItem(RECENTS_KEY);
    return saved ? JSON.parse(saved) : ['D:\\Project\\AI\\Athena', 'D:\\Project\\AI\\thClaws'];
  } catch {
    return ['D:\\Project\\AI\\Athena', 'D:\\Project\\AI\\thClaws'];
  }
}

function saveToRecents(dir) {
  try {
    const existing = loadRecents();
    // Put new dir first, remove duplicates, keep max
    const updated = [dir, ...existing.filter(d => d !== dir)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch {}
}

export default function WorkspaceSetup({ onStart, activeTheme, openDirectoryBrowser, showAlert }) {
  const [directory, setDirectory] = useState('');
  const [error, setError] = useState('');
  const [recents, setRecents] = useState(loadRecents);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input and load recent dirs from DB on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);

    async function fetchRecents() {
      try {
        const res = await dbGetRecentDirs();
        if (res.success && Array.isArray(res.data)) {
          setRecents(res.data);
          localStorage.setItem(RECENTS_KEY, JSON.stringify(res.data));
        }
      } catch (err) {
        console.error('[WorkspaceSetup] Failed to load recents from DB: ', err);
      }
    }
    fetchRecents();
  }, []);

  const handleStart = async (e) => {
    e?.preventDefault();
    const trimmed = directory.trim();
    if (!trimmed) {
      setError('กรุณาระบุ Working Directory ก่อนเริ่มต้นใช้งาน');
      inputRef.current?.focus();
      return;
    }
    try {
      await dbAddRecentDir(trimmed);
    } catch (err) {
      console.error('[WorkspaceSetup] Failed to add recent to DB: ', err);
    }
    saveToRecents(trimmed);
    onStart(trimmed);
  };

  const handleSelectRecent = (path) => {
    setDirectory(path);
    setError('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleStart(e);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 3, 10, 0.97)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      {/* Card */}
      <div style={{
        background: '#0d0d11',
        border: '1px solid #1f1f28',
        borderRadius: '14px',
        width: '520px',
        maxWidth: '92vw',
        padding: '30px 28px 26px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        animation: 'ws-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
            borderRadius: '9px',
            padding: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0,
          }}>
            <Folder style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '0.3px',
              lineHeight: 1.2,
            }}>
              Working Directory
            </h2>
          </div>
        </div>

        {/* Subtitle */}
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.42)',
          lineHeight: '1.65',
          marginTop: '-6px',
        }}>
          thClaws will operate inside this directory. All file tools are sandboxed to it. Change it now if needed.
        </p>

        {/* Input + Browse */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
          <input
            ref={inputRef}
            type="text"
            value={directory}
            onChange={(e) => { setDirectory(e.target.value); setError(''); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="เช่น  D:\Project\AI\Athena"
            spellCheck={false}
            style={{
              flex: 1,
              background: '#13131a',
              border: `1px solid ${focused ? '#10b981' : (error ? '#ef4444' : '#252530')}`,
              borderRadius: '7px',
              padding: '11px 14px',
              color: '#ffffff',
              fontSize: '13.5px',
              fontFamily: 'var(--font-mono, "Cascadia Code", "Fira Code", monospace)',
              outline: 'none',
              transition: 'border-color 0.18s',
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={() => {
              openDirectoryBrowser(directory, (path) => {
                setDirectory(path);
                setError('');
              });
            }}
            style={{
              background: '#1b1b22',
              border: '1px solid #252530',
              borderRadius: '7px',
              padding: '11px 18px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.18s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#23232d'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1b1b22'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            Browse
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: '7px',
            padding: '9px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12.5px',
            color: '#fca5a5',
            marginTop: '-6px',
          }}>
            <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Recent */}
        {recents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock style={{ width: '11px', height: '11px', color: 'rgba(255,255,255,0.25)' }} />
              <span style={{
                fontSize: '10.5px',
                fontWeight: '700',
                color: 'rgba(255,255,255,0.28)',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
              }}>
                RECENT
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {recents.map((path) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => handleSelectRecent(path)}
                  style={{
                    background: directory === path ? 'rgba(16,185,129,0.07)' : '#14141a',
                    border: `1px solid ${directory === path ? 'rgba(16,185,129,0.22)' : '#1d1d25'}`,
                    borderRadius: '7px',
                    padding: '10px 14px',
                    color: directory === path ? '#10b981' : 'rgba(255,255,255,0.65)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono, "Cascadia Code", "Fira Code", monospace)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (directory !== path) {
                      e.currentTarget.style.background = '#1b1b24';
                      e.currentTarget.style.borderColor = '#2a2a35';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (directory !== path) {
                      e.currentTarget.style.background = '#14141a';
                      e.currentTarget.style.borderColor = '#1d1d25';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                    }
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {path}
                  </span>
                  <ChevronRight style={{ width: '14px', height: '14px', flexShrink: 0, opacity: 0.4 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            onClick={handleStart}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.28)',
              transition: 'all 0.18s',
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.42)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.28)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Start
          </button>
        </div>
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes ws-slide-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
