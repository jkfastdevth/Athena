import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, HelpCircle, X, Globe, Copy, Check, ExternalLink } from 'lucide-react';

export default function CustomDialog({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  linkUrl,
  linkText,
  copyText,
  confirmText,
  cancelText
}) {
  const dialogRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  };

  const handleCopy = () => {
    if (!copyText) return;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine color and icons based on title/type
  let neonColor = 'var(--color-cyan)';
  let glowColor = 'var(--color-cyan-glow)';
  let icon = <Info style={{ width: '22px', height: '22px', color: 'var(--color-cyan)' }} />;

  const lowerTitle = (title || '').toLowerCase();
  const lowerMsg = (message || '').toLowerCase();
  if (
    lowerTitle.includes('delete') || 
    lowerTitle.includes('remove') || 
    lowerTitle.includes('warning') || 
    lowerTitle.includes('alert') || 
    lowerMsg.includes('ลบ') || 
    lowerMsg.includes('พัง') || 
    lowerMsg.includes('ก่อน') ||
    lowerTitle.includes('error')
  ) {
    neonColor = 'var(--color-rose)';
    glowColor = 'var(--color-rose-glow)';
    icon = <AlertTriangle style={{ width: '22px', height: '22px', color: 'var(--color-rose)' }} />;
  } else if (type === 'confirm') {
    neonColor = 'var(--color-violet)';
    glowColor = 'var(--color-violet-glow)';
    icon = <HelpCircle style={{ width: '22px', height: '22px', color: 'var(--color-violet)' }} />;
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 3, 10, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        fontFamily: 'var(--font-sans, "Outfit", sans-serif)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          background: '#0d0d11',
          border: `1px solid ${neonColor}`,
          borderRadius: '12px',
          width: '480px',
          maxWidth: '92vw',
          padding: '24px 24px 20px',
          boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 15px ${glowColor}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'ws-slide-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {icon}
            <h3 style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '1px',
              fontFamily: 'var(--font-display, "Orbitron", sans-serif)',
              textTransform: 'uppercase',
            }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'none'; }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Message */}
        <div style={{
          fontSize: '13.5px',
          color: 'rgba(255,255,255,0.8)',
          lineHeight: '1.6',
          whiteSpace: 'pre-line',
          padding: '4px 0',
        }}>
          {message}
        </div>

        {/* Premium Preview Link Component */}
        {linkUrl && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(6, 182, 212, 0.04)',
            border: '1px solid rgba(6, 182, 212, 0.15)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.5px' }}>
              <Globe style={{ width: '12px', height: '12px', color: 'var(--color-cyan)' }} />
              <span>ลิงก์เข้าชมผลงาน / PREVIEW WEB LINK</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-cyan)',
                  textDecoration: 'none',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-all',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                <span>{linkText || linkUrl}</span>
                <ExternalLink style={{ width: '13px', height: '13px', flexShrink: 0 }} />
              </a>
              {copyText && (
                <button
                  onClick={handleCopy}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: copied ? 'var(--color-emerald)' : 'rgba(255,255,255,0.7)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  {copied ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
                  <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Safe Copy Path Component (shown if copyText is present and linkUrl is absent) */}
        {!linkUrl && copyText && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(139, 92, 246, 0.04)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '0.5px' }}>
              เส้นทางไฟล์บนเครื่อง / LOCAL FILE PATH
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{
                color: 'var(--color-violet)',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                wordBreak: 'break-all',
              }}>
                {copyText}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: copied ? 'var(--color-emerald)' : 'rgba(255,255,255,0.7)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                {copied ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              style={{
                background: '#14141a',
                border: '1px solid #252530',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: '6px',
                padding: '8px 20px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1d1d27'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#14141a'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              {cancelText || 'ยกเลิก / Cancel'}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              background: `linear-gradient(135deg, ${neonColor}, rgba(${neonColor === 'var(--color-rose)' ? '244,63,94' : neonColor === 'var(--color-violet)' ? '217,70,239' : '6,182,212'}, 0.8))`,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 24px',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${glowColor}`,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 6px 18px ${glowColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${glowColor}`;
            }}
          >
            {confirmText || 'ตกลง / Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
