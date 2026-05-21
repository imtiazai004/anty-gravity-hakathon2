import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { speakText } from '../hooks/useAudio';

const SEV = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)', icon: '🔴' },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', icon: '🟠' },
  MEDIUM:   { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.30)',  icon: '🔵' },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)', icon: '🟢' },
};

const PRI = {
  IMMEDIATE:  { color: '#ef4444', label: 'IMMEDIATE' },
  SHORT_TERM: { color: '#f59e0b', label: 'SHORT-TERM' },
  LONG_TERM:  { color: '#10b981', label: 'LONG-TERM' },
};

const AREA_ICON = {
  ports: '⚓', inventory: '📦', cost: '💰',
  transportation: '🚢', suppliers: '🏭', demand: '📈', operations: '⚙️',
};

const LOADING_STEPS = [
  'Parsing unstructured content...',
  'Mapping supply chain nodes...',
  'Assessing multi-vector impact...',
  'Quantifying risk exposure...',
  'Generating prioritised action plan...',
];

/**
 * DeepAnalysisPanel
 * Full-screen overlay that shows:
 *  - loading animation while Gemini reasons
 *  - structured analysis: Executive Summary → Impact → Risks → Action Plan
 *
 * Props:
 *  analysis      – the parsed analysis object (null while loading)
 *  isAnalyzing   – true while the API call is in-flight
 *  onClose       – called when user dismisses the panel
 */
export function DeepAnalysisPanel({ analysis, isAnalyzing, onClose }) {
  if (!isAnalyzing && !analysis) return null;

  const sev = analysis
    ? (SEV[analysis.supplyChainImpact?.severity] || SEV.MEDIUM)
    : SEV.MEDIUM;

  return (
    <AnimatePresence>
      {(isAnalyzing || analysis) && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget && !isAnalyzing) onClose(); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.80)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflowY: 'auto',
          }}
        >
          <motion.div
            key="card"
            initial={{ y: 50, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={{
              background: 'rgba(10,18,38,0.98)',
              border: '1px solid rgba(6,182,212,0.35)',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '880px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 0 80px rgba(6,182,212,0.15), 0 0 160px rgba(59,130,246,0.08)',
              padding: '2rem',
            }}
          >

            {/* ── LOADING STATE ── */}
            {isAnalyzing && !analysis && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '3rem 1rem' }}>
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  style={{ fontSize: '3.5rem' }}
                >
                  🧠
                </motion.div>
                <div style={{ color: '#06b6d4', fontWeight: '800', letterSpacing: '0.12em', fontSize: '0.85rem' }}>
                  DEEP REASONING IN PROGRESS…
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start', width: '100%', maxWidth: '360px' }}>
                  {LOADING_STEPS.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.55, duration: 0.4 }}
                      style={{ color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }}
                        style={{ color: '#06b6d4' }}
                      >▶</motion.span>
                      {step}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ANALYSIS RESULT ── */}
            {analysis && (
              <>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: '800', letterSpacing: '0.16em', marginBottom: '0.5rem' }}>
                      🧠 DEEP INTELLIGENCE ANALYSIS
                    </div>
                    <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0, lineHeight: '1.35', wordBreak: 'break-word' }}>
                      {analysis.supplyChainImpact?.headline || 'Supply Chain Impact Assessment'}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexShrink: 0 }}>
                    {/* Severity badge */}
                    <span style={{
                      padding: '0.3rem 0.7rem', borderRadius: '20px',
                      fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.08em',
                      background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color,
                    }}>
                      {sev.icon} {analysis.supplyChainImpact?.severity}
                    </span>

                    {/* Speak briefing */}
                    <button
                      onClick={() => speakText(analysis.spokenBriefing)}
                      title="Speak briefing"
                      style={{
                        background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.3)',
                        color: '#06b6d4', padding: '0.3rem 0.7rem', borderRadius: '20px',
                        fontSize: '0.65rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      🔊 Brief me
                    </button>

                    {/* Close */}
                    <button
                      onClick={onClose}
                      style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#94a3b8', padding: '0.3rem 0.55rem', borderRadius: '8px',
                        fontSize: '0.9rem', cursor: 'pointer', lineHeight: 1,
                      }}
                    >✕</button>
                  </div>
                </div>

                {/* Executive Summary */}
                <div style={{
                  background: 'rgba(30,41,59,0.55)', border: '1px solid rgba(6,182,212,0.15)',
                  borderRadius: '10px', padding: '1rem 1.1rem', marginBottom: '1.1rem',
                }}>
                  <div style={{ fontSize: '0.62rem', color: '#06b6d4', fontWeight: '800', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
                    📋 EXECUTIVE SUMMARY
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: '1.65', margin: 0 }}>
                    {analysis.executiveSummary}
                  </p>
                </div>

                {/* Impact block */}
                <div style={{
                  background: sev.bg, border: `1px solid ${sev.border}`,
                  borderRadius: '10px', padding: '1rem 1.1rem', marginBottom: '1.1rem',
                }}>
                  <div style={{ fontSize: '0.62rem', color: sev.color, fontWeight: '800', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
                    ⚡ SUPPLY CHAIN IMPACT
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: '1.65', margin: 0 }}>
                    {analysis.supplyChainImpact?.description}
                  </p>
                </div>

                {/* Risk cards grid */}
                {analysis.risks?.length > 0 && (
                  <div style={{ marginBottom: '1.1rem' }}>
                    <div style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: '800', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
                      🚨 IDENTIFIED RISK VECTORS — {analysis.risks.length} DETECTED
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem' }}>
                      {analysis.risks.map((risk, i) => {
                        const rs = SEV[risk.severity] || SEV.MEDIUM;
                        return (
                          <div key={i} style={{
                            background: rs.bg, border: `1px solid ${rs.border}`,
                            borderRadius: '9px', padding: '0.85rem',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '1rem' }}>{AREA_ICON[risk.affectedArea] || '⚠️'}</span>
                              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: rs.color }}>{risk.title}</span>
                            </div>
                            <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0 0 0.45rem', lineHeight: '1.45' }}>
                              {risk.description}
                            </p>
                            <span style={{
                              fontSize: '0.6rem', fontWeight: '800', padding: '0.12rem 0.4rem',
                              borderRadius: '4px', background: rs.bg, border: `1px solid ${rs.border}`, color: rs.color,
                            }}>
                              {risk.severity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action plan */}
                {analysis.actionPlan?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: '800', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
                      🎯 RECOMMENDED ACTION PLAN — {analysis.actionPlan.length} STEPS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {analysis.actionPlan.map((item, i) => {
                        const pri = PRI[item.priority] || PRI.SHORT_TERM;
                        const priRgb = item.priority === 'IMMEDIATE' ? '239,68,68'
                          : item.priority === 'SHORT_TERM' ? '245,158,11'
                          : '16,185,129';
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            style={{
                              display: 'flex', gap: '0.85rem', alignItems: 'flex-start',
                              background: 'rgba(30,41,59,0.45)', border: '1px solid rgba(16,185,129,0.15)',
                              borderRadius: '9px', padding: '0.85rem',
                            }}
                          >
                            {/* Step number bubble */}
                            <div style={{
                              minWidth: '28px', height: '28px', borderRadius: '50%',
                              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.72rem', fontWeight: '800', color: '#10b981', flexShrink: 0,
                            }}>
                              {item.step}
                            </div>

                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: '#f8fafc' }}>{item.action}</span>
                                <span style={{
                                  fontSize: '0.58rem', fontWeight: '800', padding: '0.12rem 0.4rem',
                                  borderRadius: '4px',
                                  background: `rgba(${priRgb},0.12)`,
                                  border: `1px solid rgba(${priRgb},0.35)`,
                                  color: pri.color,
                                }}>
                                  {pri.label}
                                </span>
                                <span style={{ fontSize: '0.63rem', color: '#64748b' }}>⏱ {item.timeline}</span>
                              </div>
                              <p style={{ fontSize: '0.79rem', color: '#94a3b8', margin: 0, lineHeight: '1.45' }}>
                                {item.detail || item.rationale}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
