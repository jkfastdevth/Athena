import React, { useState, useEffect, useRef } from 'react';
import { Folder, ChevronRight, CornerLeftUp, X, RefreshCw, AlertCircle, HardDrive } from 'lucide-react';
import { dbBrowseDirectory } from '../api';

export default function DirectoryBrowserModal({ isOpen, initialPath, onSelect, onClose }) {
  const [currentPath, setCurrentPath] = useState(initialPath || 'C:\\');
  const [directories, setDirectories] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualPath, setManualPath] = useState(currentPath);

  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadPath(initialPath || 'C:\\');
    }
  }, [isOpen, initialPath]);

  if (!isOpen) return null;

  async function loadPath(path) {
    setLoading(true);
    setError('');
    try {
      const res = await dbBrowseDirectory(path);
      if (res.success) {
        setCurrentPath(res.currentPath);
        setManualPath(res.currentPath);
        setDirectories(res.directories || []);
        if (res.drives && res.drives.length > 0) {
          setDrives(res.drives);
        }
      } else {
        setError(res.error || 'Failed to load directory');
      }
    } catch (err) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectDrive = (drive) => {
    loadPath(drive);
  };

  const handleNavigateFolder = (folderName) => {
    const separator = currentPath.includes('/') ? '/' : '\\';
    const isTrailing = currentPath.endsWith('/') || currentPath.endsWith('\\');
    const newPath = currentPath + (isTrailing ? '' : separator) + folderName;
    loadPath(newPath);
  };

  const handleGoUp = () => {
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    if (parts.length <= 1) {
      if (currentPath.match(/^[a-zA-Z]:[\\/]?$/)) {
        loadPath('');
      } else {
        loadPath('/');
      }
    } else {
      parts.pop();
      const separator = currentPath.includes('/') ? '/' : '\\';
      let parent = parts.join(separator);
      if (currentPath.match(/^[a-zA-Z]:/)) {
        parent = parent + (parent.endsWith(':') ? separator : '');
      }
      loadPath(parent);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualPath.trim()) {
      loadPath(manualPath.trim());
    }
  };

  const handleConfirmSelect = () => {
    if (currentPath) {
      onSelect(currentPath);
      onClose();
    }
  };

  const renderBreadcrumbs = () => {
    if (!currentPath) return <span style={{ color: 'rgba(255,255,255,0.4)' }}>My Computer</span>;
    const separator = currentPath.includes('/') ? '/' : '\\';
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    
    let accumulatedPath = '';
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', fontSize: '12px' }}>
        <button
          onClick={() => loadPath('')}
          style={{
            background: 'none', border: 'none', color: 'var(--color-cyan)',
            cursor: 'pointer', fontSize: '12px', padding: '2px 4px', borderRadius: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          Root
        </button>
        {parts.map((part, index) => {
          if (index === 0 && currentPath.match(/^[a-zA-Z]:/)) {
            accumulatedPath = part + ':';
          } else {
            accumulatedPath += (accumulatedPath ? separator : '') + part;
          }
          const thisPath = accumulatedPath;
          return (
            <React.Fragment key={index}>
              <ChevronRight style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,0.3)' }} />
              <button
                onClick={() => loadPath(thisPath)}
                style={{
                  background: 'none', border: 'none', color: index === parts.length - 1 ? '#fff' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: '12px', padding: '2px 4px', borderRadius: '4px',
                  fontWeight: index === parts.length - 1 ? '700' : 'normal'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 3, 10, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: 'var(--font-sans, "Outfit", sans-serif)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0d0d11',
          border: '1px solid var(--color-cyan)',
          borderRadius: '14px',
          width: '540px',
          height: '480px',
          maxWidth: '92vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.9), 0 0 15px var(--color-cyan-glow)',
          animation: 'ws-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1f1f28',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Folder style={{ width: '18px', height: '18px', color: 'var(--color-cyan)' }} />
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '850',
              fontFamily: 'var(--font-display, "Orbitron", sans-serif)',
              letterSpacing: '1px',
              color: '#ffffff',
            }}>
              DIRECTORY BROWSER
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', padding: '4px', borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Path and drives selector */}
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #1f1f28', background: 'rgba(0,0,0,0.15)' }}>
          {/* Breadcrumbs */}
          <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '2px' }}>
            {renderBreadcrumbs()}
          </div>

          {/* Drives List */}
          {drives.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
              <HardDrive style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', marginRight: '4px' }}>DRIVES:</span>
              {drives.map(drive => {
                const isActive = currentPath.toLowerCase().startsWith(drive.toLowerCase());
                return (
                  <button
                    key={drive}
                    onClick={() => handleSelectDrive(drive)}
                    style={{
                      background: isActive ? 'rgba(6, 182, 212, 0.12)' : '#14141a',
                      border: `1px solid ${isActive ? 'var(--color-cyan)' : '#252530'}`,
                      borderRadius: '4px',
                      color: isActive ? 'var(--color-cyan)' : 'rgba(255,255,255,0.6)',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = '#252530'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
                  >
                    {drive}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Directory Explorer Viewport */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Subheader: Go Up Button */}
          <div style={{ display: 'flex', padding: '6px 14px', borderBottom: '1px solid #14141d', background: '#09090d', alignItems: 'center' }}>
            <button
              onClick={handleGoUp}
              disabled={!currentPath}
              style={{
                background: 'none', border: 'none',
                color: currentPath ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                cursor: currentPath ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 'bold',
                padding: '4px 8px', borderRadius: '4px'
              }}
              onMouseEnter={(e) => { if (currentPath) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (currentPath) e.currentTarget.style.background = 'none'; }}
            >
              <CornerLeftUp style={{ width: '13px', height: '13px' }} />
              <span>ขึ้นไปหนึ่งระดับ / Go Up</span>
            </button>
          </div>

          {/* Directory List Container */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: 'rgba(255,255,255,0.4)' }}>
                <RefreshCw className="spin" style={{ width: '24px', height: '24px', color: 'var(--color-cyan)' }} />
                <span style={{ fontSize: '12px' }}>กำลังโหลดข้อมูล...</span>
              </div>
            ) : error ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                margin: '20px'
              }}>
                <AlertCircle style={{ width: '20px', height: '20px', color: 'var(--color-rose)', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 'bold' }}>ข้อผิดพลาด / Error</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{error}</span>
                  <button
                    onClick={handleGoUp}
                    style={{
                      marginTop: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '4px 10px', cursor: 'pointer'
                    }}
                  >
                    ย้อนกลับ / Go Back
                  </button>
                </div>
              </div>
            ) : directories.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.25)', fontSize: '12.5px', gap: '8px' }}>
                <Folder style={{ width: '28px', height: '28px', opacity: 0.3 }} />
                <span>โฟลเดอร์นี้ว่างเปล่า / Empty Directory</span>
              </div>
            ) : (
              directories.map(folder => (
                <button
                  key={folder}
                  onClick={() => handleNavigateFolder(folder)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: '1px solid transparent',
                    borderRadius: '6px',
                    color: 'rgba(255,255,255,0.75)',
                    textAlign: 'left',
                    fontSize: '12.5px',
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                  }}
                >
                  <Folder style={{ width: '16px', height: '16px', color: 'var(--color-cyan)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer manual path and confirm */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #1f1f28',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Manual input */}
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="Path..."
              style={{
                flex: 1,
                background: '#13131a',
                border: '1px solid #252530',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: '#1b1b22', border: '1px solid #252530', borderRadius: '6px',
                color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '0 12px', cursor: 'pointer'
              }}
            >
              Go
            </button>
          </form>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: '#14141a', border: '1px solid #252530', borderRadius: '6px',
                color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 'bold', padding: '8px 16px', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelect}
              disabled={!currentPath}
              style={{
                background: 'linear-gradient(135deg, var(--color-cyan), #0891b2)',
                color: '#fff', border: 'none', borderRadius: '6px',
                fontSize: '12px', fontWeight: 'bold', padding: '8px 20px', cursor: 'pointer',
                boxShadow: '0 4px 12px var(--color-cyan-glow)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px var(--color-cyan-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px var(--color-cyan-glow)';
              }}
            >
              Select Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
