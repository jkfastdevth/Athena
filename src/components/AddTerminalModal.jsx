import React, { useState } from 'react';
import { X, Sparkles, Command, Cpu, Eye, ShieldCheck } from 'lucide-react';
import { LLM_ENGINES, AGENT_FRAMEWORKS, PRESET_GOALS } from '../config/agentConfig';

export default function AddTerminalModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState(`Agent-${Math.floor(100 + Math.random() * 900)}`);
  const [selectedLlm, setSelectedLlm] = useState(LLM_ENGINES[0].id);
  const [selectedReviewer, setSelectedReviewer] = useState(LLM_ENGINES[1].id); // Defaults to Gemini-CLI
  const [selectedFramework, setSelectedFramework] = useState(AGENT_FRAMEWORKS[0].id);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');

  if (!isOpen) return null;

  const handlePresetSelect = (goal) => {
    setSelectedGoal(goal.id);
    setCustomGoal(goal.prompt);
  };

  const currentLlmObj = LLM_ENGINES.find(l => l.id === selectedLlm);
  const currentReviewerObj = LLM_ENGINES.find(l => l.id === selectedReviewer);
  const currentFrameworkObj = AGENT_FRAMEWORKS.find(f => f.id === selectedFramework);

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      name: name || 'Agent-Session',
      llm: selectedLlm,
      reviewer: selectedReviewer,
      framework: selectedFramework,
      initialGoal: customGoal || 'Standby for commands'
    });
    setName(`Agent-${Math.floor(100 + Math.random() * 900)}`);
    setSelectedGoal('');
    setCustomGoal('');
    onClose();
  };

  return (
    <div className="aether-modal-overlay">
      <div className="aether-modal-content">
        
        {/* Header modal */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Sparkles style={{ width: '18px', height: '18px', color: 'var(--color-cyan)' }} />
            <span>สร้าง TERMINAL GUI & AI AGENT PIPELINE</span>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Modal Form inputs */}
        <form onSubmit={handleSubmit} className="modal-form">
          
          {/* Tab Name at the top */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            <label className="form-label" style={{ color: 'var(--color-cyan)', fontWeight: 'bold' }}>
              ✦ CONFIGURATION BLUEPRINT NAME / ชื่อแท็บตัวทำงาน
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input-text"
              required
              placeholder="e.g. Code-Pipeline-Primary"
            />
          </div>

          <div style={{
            borderBottom: '1px dashed rgba(255,255,255,0.06)',
            paddingBottom: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px'
          }}>
            <Sparkles style={{ width: '12px', height: '12px', color: 'var(--color-violet)' }} />
            <span>1. Configure Multi-Agent Collaboration Pipeline</span>
          </div>

          {/* 3-Column Pipeline Section */}
          <div className="form-grid-3">
            
            {/* Column 1: Developer Agent */}
            <div className="form-section" style={{ background: 'rgba(255,255,255,0.005)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <Cpu style={{ width: '13px', height: '13px', color: 'var(--color-cyan)' }} />
                <span>Developer Agent (เขียนสคริปต์)</span>
              </label>
              <select
                value={selectedLlm}
                onChange={(e) => setSelectedLlm(e.target.value)}
                className="form-select"
                style={{ marginTop: '6px' }}
              >
                {LLM_ENGINES.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.provider})</option>
                ))}
              </select>

              {currentLlmObj && (
                <div
                  className="form-info-card"
                  style={{ borderColor: currentLlmObj.color + '40', marginTop: '12px' }}
                >
                  <div className="info-card-header">
                    <span className="info-card-badge" style={{ backgroundColor: currentLlmObj.color }}>
                      {currentLlmObj.provider}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                      Context: <strong>{currentLlmObj.contextWindow}</strong>
                    </span>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                      {currentLlmObj.descriptionTH}
                    </p>
                    <p className="info-card-desc-en" style={{ fontSize: '10px' }}>
                      {currentLlmObj.description}
                    </p>
                  </div>
                  <div className="sidebar-card-specs" style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '9px' }}>
                    <div>SPEED: <span style={{ color: 'var(--text-primary)' }}>{currentLlmObj.speed}</span></div>
                    <div>COST/1M: <span style={{ color: 'var(--color-emerald)' }}>${currentLlmObj.costPerMillion.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Reviewer Agent */}
            <div className="form-section" style={{ background: 'rgba(255,255,255,0.005)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <Eye style={{ width: '13px', height: '13px', color: 'var(--color-violet)' }} />
                <span>Reviewer Agent (ตรวจความปลอดภัย)</span>
              </label>
              <select
                value={selectedReviewer}
                onChange={(e) => setSelectedReviewer(e.target.value)}
                className="form-select"
                style={{ marginTop: '6px' }}
              >
                {LLM_ENGINES.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.provider})</option>
                ))}
              </select>

              {currentReviewerObj && (
                <div
                  className="form-info-card"
                  style={{ borderColor: currentReviewerObj.color + '40', marginTop: '12px' }}
                >
                  <div className="info-card-header">
                    <span className="info-card-badge" style={{ backgroundColor: currentReviewerObj.color }}>
                      {currentReviewerObj.provider}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                      Context: <strong>{currentReviewerObj.contextWindow}</strong>
                    </span>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                      {currentReviewerObj.descriptionTH}
                    </p>
                    <p className="info-card-desc-en" style={{ fontSize: '10px' }}>
                      {currentReviewerObj.description}
                    </p>
                  </div>
                  <div className="sidebar-card-specs" style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '9px' }}>
                    <div>SPEED: <span style={{ color: 'var(--text-primary)' }}>{currentReviewerObj.speed}</span></div>
                    <div>COST/1M: <span style={{ color: 'var(--color-emerald)' }}>${currentReviewerObj.costPerMillion.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Column 3: Operator Agent */}
            <div className="form-section" style={{ background: 'rgba(255,255,255,0.005)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <ShieldCheck style={{ width: '13px', height: '13px', color: 'var(--color-emerald)' }} />
                <span>Operator Agent (ใช้งานจริง)</span>
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="form-select"
                style={{ marginTop: '6px' }}
              >
                {AGENT_FRAMEWORKS.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
                ))}
              </select>

              {currentFrameworkObj && (
                <div
                  className="form-info-card"
                  style={{ borderColor: currentFrameworkObj.color + '40', marginTop: '12px' }}
                >
                  <div className="info-card-header">
                    <span className="info-card-badge" style={{ backgroundColor: currentFrameworkObj.color }}>
                      {currentFrameworkObj.type}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                      Autonomy: <strong>{currentFrameworkObj.autonomyRating}%</strong>
                    </span>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                      {currentFrameworkObj.primaryUseTH}
                    </p>
                    <p className="info-card-desc-en" style={{ fontSize: '10px' }}>
                      {currentFrameworkObj.primaryUse}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div style={{
            borderBottom: '1px dashed rgba(255,255,255,0.06)',
            paddingBottom: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px'
          }}>
            <Command style={{ width: '12px', height: '12px', color: 'var(--color-cyan)' }} />
            <span>2. Define Sandbox Initial Goal / กำหนดเป้าหมาย</span>
          </div>

          {/* Preset Goals & Custom Goal Textarea */}
          <div className="form-grid-2">
            <div>
              <label className="form-label">Objective Presets / เลือกเป้าหมายสเปคด่วน</label>
              <div className="preset-goals-grid" style={{ marginTop: '6px' }}>
                {PRESET_GOALS.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handlePresetSelect(g)}
                    className={`preset-goal-btn ${selectedGoal === g.id ? 'preset-goal-btn-active' : ''}`}
                  >
                    <div className="preset-goal-title-th">{g.title}</div>
                    <div className="preset-goal-title-en">{g.titleEN}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Custom Goal Prompt / แผนงานที่จะให้ประมวลผลด่วน</label>
              <textarea
                value={customGoal}
                onChange={(e) => {
                  setSelectedGoal('');
                  setCustomGoal(e.target.value);
                }}
                placeholder="ตัวอย่าง: สร้างโฟลเดอร์ทดสอบ และช่วยดึงสถานะเครื่องคอมพิวเตอร์มาวิเคราะห์..."
                className="form-textarea"
                style={{ marginTop: '6px', height: '110px' }}
              />
            </div>
          </div>

          {/* Footer modal buttons */}
          <div className="modal-footer" style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="cyber-btn cyber-btn-flat"
            >
              Cancel / ยกเลิก
            </button>
            <button
              type="submit"
              className="cyber-btn cyber-btn-cyan"
            >
              <Command style={{ width: '14px', height: '14px' }} />
              Initialize Shell / เริ่มต้นทำงาน
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
