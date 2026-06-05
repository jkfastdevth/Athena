import React, { useState } from 'react';
import { Copy, Sparkles, AlertCircle, CheckCircle2, Trash2, Globe, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function TerminalBlock({
  block,
  onExplain,
  onRemove,
  activeTheme,
  workspaceDir
}) {
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(block.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(block.output);
  };

  const stripAnsi = (text) => {
    if (!text) return '';
    // Strip ANSI escape codes
    let cleaned = text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
    // Strip OSC sequences
    cleaned = cleaned.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '');
    // Handle carriage returns by taking the last part of each "line" that ends with \r
    // This isn't perfect for all TUIs but avoids showing artifacts from progress bars
    cleaned = cleaned.replace(/[^\n\r]*\r/g, (match) => match.split('\r').pop());
    return cleaned;
  };

  const formatOutput = (text) => {
    if (!text) return '';
    
    const cleanedText = stripAnsi(text);
    const lines = cleanedText.split('\n');
    return lines.map((line, i) => {
      const lower = line.toLowerCase();
      if (lower.includes('error') || lower.includes('fail') || lower.includes('exception') || lower.includes('access denied') || lower.includes('cannot be loaded')) {
        return (
          <div 
            key={i} 
            style={{ 
              minHeight: '1.2rem', 
              whiteSpace: 'pre-wrap', 
              fontWeight: 'bold', 
              color: 'var(--color-rose)' 
            }}
          >
            {line}
          </div>
        );
      } else if (lower.includes('warning')) {
        return (
          <div 
            key={i} 
            style={{ 
              minHeight: '1.2rem', 
              whiteSpace: 'pre-wrap', 
              fontWeight: '600', 
              color: 'var(--color-amber)' 
            }}
          >
            {line}
          </div>
        );
      } else if (line.trim().startsWith('+') && !line.trim().startsWith('+++')) {
        return (
          <div 
            key={i} 
            style={{ 
              minHeight: '1.2rem', 
              whiteSpace: 'pre-wrap', 
              color: 'var(--color-cyan)' 
            }}
          >
            {line}
          </div>
        );
      }

      return (
        <div 
          key={i} 
          style={{ 
            minHeight: '1.2rem', 
            whiteSpace: 'pre-wrap', 
            color: 'var(--text-secondary)' 
          }}
        >
          {line}
        </div>
      );
    });
  };

  const getStatusIcon = () => {
    if (block.status === 'running') {
      return (
        <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" style={{ width: '16px', height: '16px', border: '2px solid var(--color-cyan)', borderTopColor: 'transparent' }}></div>
      );
    }
    if (block.status === 'error') {
      return <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--color-rose)' }} />;
    }
    return <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--color-emerald)' }} />;
  };

  const formattedDir = block.dir
    ? (block.dir.includes(':') ? block.dir : `${workspaceDir || 'D:\\Project\\AI\\Athena'}\\${block.dir}`)
    : (workspaceDir || 'D:\\Project\\AI\\Athena');

  return (
    <div
      className={`aether-block ${
        block.status === 'error' ? 'aether-block-error' : block.status === 'running' ? 'aether-block-active' : ''
      }`}
      style={{
        border: 'none',
        background: 'transparent',
        boxShadow: 'none',
        marginBottom: '4px'
      }}
    >
      {/* Block Header / Command line prompt */}
      <div className="block-header" style={{ background: 'transparent', borderBottom: 'none', padding: '4px 0' }}>
        <div className="block-header-left" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="block-status-indicator" style={{ marginRight: '8px' }}>{getStatusIcon()}</div>
          
          <span style={{ color: 'var(--color-cyan)', fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '13px', marginRight: '6px' }}>PS</span>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '13px', marginRight: '6px' }}>{formattedDir}</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontFamily: 'var(--font-mono)', fontSize: '13px', marginRight: '8px' }}>&gt;</span>

          <span className="block-cmd-text" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#fff', fontWeight: 'bold' }}>{block.command}</span>
        </div>

        {/* Action Panel */}
        <div className="block-header-right">
          <span className="block-time">
            <Clock style={{ width: '12px', height: '12px' }} />
            {block.time}
          </span>

          {/* Explain with AI */}
          {block.output && block.status !== 'running' && (
            <button
              onClick={() => onExplain(block.id)}
              className="btn-block-action btn-block-action-purple"
              title="อธิบายคำสั่งด้วย AI"
            >
              <Sparkles style={{ width: '12px', height: '12px' }} />
              <span>Explain</span>
            </button>
          )}

          {/* Copy Command */}
          <button
            onClick={handleCopyCommand}
            className="btn-block-action"
            title={copied ? "Copied!" : "คัดลอกคำสั่ง"}
          >
            <Copy style={{ width: '12px', height: '12px' }} />
          </button>

          {/* Remove block */}
          <button
            onClick={() => onRemove(block.id)}
            className="btn-block-action btn-block-action-rose"
            title="ลบบล็อกนี้"
          >
            <Trash2 style={{ width: '12px', height: '12px' }} />
          </button>
        </div>
      </div>

      {/* Block Output Screen */}
      <div className="block-console">
        {block.output ? (
          <div>{formatOutput(block.output)}</div>
        ) : block.status === 'running' ? (
          <div className="console-running-stream">
            <span>Executing shell process...</span>
            <span className="terminal-cursor"></span>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No console output returned.</div>
        )}
      </div>

      {/* AI Explanation Sub-Panel */}
      {block.aiExplanation && (
        <div className="block-ai-drawer">
          <div className="ai-drawer-header">
            <div className="ai-drawer-title-group">
              <Sparkles className="animate-pulse" style={{ width: '14px', height: '14px' }} />
              <span>Aetheris AI Insights / การวิเคราะห์ผลลัพธ์</span>
            </div>
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="ai-drawer-toggle-btn"
            >
              {showExplanation ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
            </button>
          </div>

          {showExplanation && (
            <div className="ai-drawer-body">
              {/* Thai explanation */}
              <div className="ai-lang-block ai-lang-block-th">
                <div className="ai-lang-label">
                  <Globe style={{ width: '12px', height: '12px', color: 'var(--color-violet)' }} />
                  <span>คำอธิบายภาษาไทย</span>
                </div>
                <p className="ai-lang-text">{block.aiExplanation.explanationTH}</p>
              </div>

              {/* English explanation */}
              <div className="ai-lang-block ai-lang-block-en">
                <div className="ai-lang-label">
                  <Globe style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
                  <span>English Breakdown</span>
                </div>
                <p className="ai-lang-text ai-lang-text-italic">{block.aiExplanation.explanation}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
