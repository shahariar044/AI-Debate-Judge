import { useState, useEffect } from 'react'
import ScoreCard from '../components/ScoreCard'
import FallacyList from '../components/FallacyList'
import CausalGraph from '../components/CausalGraph'
import ExplanationPanel from '../components/ExplanationPanel'
import ImprovementPanel from '../components/ImprovementPanel'
import RadarChart from '../components/RadarChart'
import Confetti from '../components/Confetti'
import ImprovementModal from '../components/ImprovementModal'
import ExportButton from '../components/ExportButton'

const TABS = [
  { icon: '🏆', label: 'Overview' },
  { icon: '📊', label: 'Scores' },
  { icon: '📡', label: 'Radar' },
  { icon: '⚠️', label: 'Fallacies' },
  { icon: '🔗', label: 'Causal' },
  { icon: '💡', label: 'Improvements' },
  { icon: '⚡', label: 'Performance' },
]

const DOMAIN_ICON = {
  education:   '🎓', environment: '🌿', policy:     '📋',
  technology:  '💻', social:      '🤝', health:     '🏥',
  economy:     '💰', other:       '🌐',
}

export default function ResultsPage({ result: resultsArray, onBack }) {
  const [modelIdx,    setModelIdx]    = useState(0)
  const result = Array.isArray(resultsArray) ? resultsArray[modelIdx] : resultsArray
  const isComparison = Array.isArray(resultsArray) && resultsArray.length > 1

  const [tab,         setTab]         = useState(0)
  const [graphSide,   setGraphSide]   = useState('for')
  const [showConfetti,setShowConfetti]= useState(true)
  const [improvModal, setImprovModal] = useState(null) // 'FOR' | 'AGAINST' | null

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(t)
  }, [])

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  const {
    id, topic, topic_context,
    for_score, against_score, explanation,
    for_fallacies, against_fallacies,
    for_causal, against_causal,
    for_evidence, against_evidence,
    for_structure, against_structure,
    causal_graph_for, causal_graph_against,
    pipeline_metadata,
  } = result

  const forWins        = explanation.winner === 'FOR'
  const winnerScore    = forWins ? for_score.score : against_score.score
  const totalFallacies = for_fallacies.length + against_fallacies.length
  const totalChains    = for_causal.causal_chains.length + against_causal.causal_chains.length
  const domainIcon     = DOMAIN_ICON[topic_context.domain] || '🌐'
  const winnerColor    = forWins ? 'var(--success)' : 'var(--danger)'
  const confidence     = explanation.confidence_score || 75
  const confidenceColor = confidence >= 80 ? 'var(--success)' : confidence >= 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showConfetti && <Confetti />}
      {improvModal && (
        <ImprovementModal
          resultId={id}
          side={improvModal}
          onClose={() => setImprovModal(null)}
        />
      )}

      {/* ── Sticky Header ──────────────────────────── */}
      <header style={{
        padding: '14px 40px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--glass)',
        backdropFilter: 'blur(18px)',
        boxShadow: 'var(--shadow-glass)',
        display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }} onClick={onBack}>
          ← New Debate
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Topic</p>
          <p style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <span className="badge badge-accent hide-mobile">{domainIcon} {topic_context.domain}</span>
          <span className="badge badge-cyan hide-mobile">8 Agents</span>
          <ExportButton result={result} />
        </div>
      </header>

      {/* ── Model Comparison Tabs ─────────────────── */}
      {isComparison && (
        <div style={{
          padding: '16px 40px',
          background: 'var(--soft-cloud)',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center',
          animation: 'fadeInUp 0.4s ease'
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>COMPARING MODELS:</span>
          {resultsArray.map((r, i) => (
            <button
              key={i}
              onClick={() => setModelIdx(i)}
              className={`btn ${modelIdx === i ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                padding: '10px 28px',
                borderRadius: 99,
                fontWeight: modelIdx === i ? 800 : 600,
                border: modelIdx === i ? 'none' : '1px solid var(--border-accent)',
                boxShadow: modelIdx === i ? '0 10px 24px var(--rausch-glow)' : 'none',
                transform: modelIdx === i ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {r.provider === 'groq' ? '🦙 Groq (LLaMA-3)' : '✨ Gemini Model'}
            </button>
          ))}
        </div>
      )}

      {/* ── Winner Banner ─────────────────────────── */}
      <div style={{
        padding: '40px 40px 32px',
        background: forWins
          ? 'linear-gradient(160deg, var(--success-tint) 0%, transparent 100%)'
          : 'linear-gradient(160deg, var(--danger-tint) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
        animation: 'fadeInUp 0.6s ease',
      }}>
        {/* BG glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 200,
          background: `radial-gradient(ellipse, ${forWins ? 'var(--success-tint)' : 'var(--danger-tint)'} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.12em', fontWeight: 700 }}>
            🏆 WINNER DECLARED
          </p>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              <span style={{ color: winnerColor }}>
                <span style={{ fontSize: '0.8em' }}>{forWins ? '✅' : '❌'}</span> {forWins ? 'FOR' : 'AGAINST'}
              </span>
              {' '}wins with{' '}
              <span className="gradient-text-gold">{winnerScore}/100</span>
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 680, margin: '0 auto 24px', fontSize: 15, lineHeight: 1.7 }}>
            {explanation.winner_reason}
          </p>

          {/* Score bar visual */}
          <div style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: 'var(--success)' }}>FOR: {for_score.score}</span>
              <span style={{ color: 'var(--danger)' }}>AGAINST: {against_score.score}</span>
            </div>
            <div style={{ height: 12, borderRadius: 99, background: 'var(--mocha-surface1)', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${(for_score.score / (for_score.score + against_score.score)) * 100}%`,
                background: 'linear-gradient(90deg, var(--mocha-teal), var(--success))',
                borderRadius: 99,
                transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: '0 0 14px rgba(166, 227, 161, 0.32)',
              }} />
            </div>
          </div>

          {/* Stats row */}
          <div className="winner-stats" style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'FOR Score',       value: for_score.score,     color: 'var(--success)',      suffix: '/100' },
              { label: 'AGAINST Score',   value: against_score.score, color: 'var(--danger)',        suffix: '/100' },
              { label: 'AI Confidence',   value: confidence,          color: confidenceColor,        suffix: '%' },
              { label: 'Fallacies Found', value: totalFallacies,      color: 'var(--warning)',       suffix: '' },
              { label: 'Causal Chains',   value: totalChains,         color: 'var(--accent-light)',  suffix: '' },
            ].map(({ label, value, color, suffix }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p className="winner-scores" style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 900, color, lineHeight: 1, animation: 'countUp 0.6s ease' }}>
                  {value}{suffix}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Agent 8 Quick-Action Bar ──────────────── */}
      <div style={{
        padding: '14px 40px',
        background: 'var(--soft-cloud)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0 }}>
          ✨ AGENT 8:
        </span>
        <button className="btn btn-success" style={{ padding: '8px 18px', fontSize: 12 }}
          onClick={() => setImprovModal('FOR')}>
          ✅ Improve FOR Argument
        </button>
        <button className="btn btn-danger" style={{ padding: '8px 18px', fontSize: 12 }}
          onClick={() => setImprovModal('AGAINST')}>
          ❌ Improve AGAINST Argument
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          AI rewrites the argument to score significantly higher
        </span>
      </div>

      {/* ── Sticky Tab Bar ───────────────────────── */}
      <div style={{
        padding: '12px 40px 0',
        background: 'var(--glass)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 72, zIndex: 40,
        backdropFilter: 'blur(16px)',
      }}>
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={i} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────── */}
      <div style={{ flex: 1, padding: '32px 40px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>

        {/* ── Overview ── */}
        {tab === 0 && (
          <div className="tab-panel stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Topic context */}
            <div className="card fade-in-up">
              <h3 style={{ marginBottom: 16, fontWeight: 700, fontSize: 15 }}>📌 Topic Analysis</h3>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>DOMAIN</p>
                  <span className="badge badge-accent">{domainIcon} {topic_context.domain}</span>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>DEBATE INTENT</p>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{topic_context.debate_intent}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em' }}>KEY ENTITIES</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {topic_context.entities.slice(0, 8).map((e, i) => (
                      <span key={i} className="badge badge-warning">{e}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Claims side by side */}
            <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { side: 'FOR',     color: 'var(--success)', struct: for_structure,     score: for_score.score },
                { side: 'AGAINST', color: 'var(--danger)',  struct: against_structure, score: against_score.score },
              ].map(({ side, color, struct, score }) => (
                <div key={side} className="card fade-in-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>{side} CLAIM</p>
                    <span className="badge" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
                      {score}/100
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, color, marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>{struct.claim}</p>
                  <div className="divider" />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.06em' }}>KEY REASONS</p>
                  {struct.reasons.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <span style={{ color, flexShrink: 0, marginTop: 2 }}>•</span>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r}</p>
                    </div>
                  ))}
                  {struct.evidence.length > 0 && (
                    <>
                      <div className="divider" />
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.06em' }}>EVIDENCE</p>
                      {struct.evidence.slice(0, 2).map((ev, i) => (
                        <div key={i} style={{
                          padding: '6px 10px',
                          background: `${color}08`,
                          borderLeft: `3px solid ${color}`,
                          borderRadius: '0 6px 6px 0',
                          marginBottom: 6,
                        }}>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{ev}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Explanation */}
            <ExplanationPanel explanation={explanation} forScore={for_score.score} againstScore={against_score.score} />
          </div>
        )}

        {/* ── Scores ── */}
        {tab === 1 && (
          <div className="tab-panel score-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <ScoreCard side="FOR"     score={for_score}     color="var(--success)" evidence={for_evidence} />
            <ScoreCard side="AGAINST" score={against_score} color="var(--danger)"  evidence={against_evidence} />
          </div>
        )}

        {/* ── Radar ── */}
        {tab === 2 && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <RadarChart forScore={for_score} againstScore={against_score} />
            <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { side: 'FOR',     ev: for_evidence,     color: 'var(--success)' },
                { side: 'AGAINST', ev: against_evidence, color: 'var(--danger)'  },
              ].map(({ side, ev, color }) => (
                <div key={side} className="card fade-in-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ fontWeight: 700, color }}>{side === 'FOR' ? '✅' : '❌'} {side} Evidence</h4>
                    <span className="badge" style={{ color, background: `${color}18` }}>{ev.quality}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{ev.reason}</p>
                  {Object.entries(ev.scores).map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{k}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{v}/10</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${v * 10}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Fallacies ── */}
        {tab === 3 && (
          <div className="tab-panel grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <FallacyList side="FOR"     fallacies={for_fallacies}     color="var(--success)" />
            <FallacyList side="AGAINST" fallacies={against_fallacies} color="var(--danger)" />
          </div>
        )}

        {/* ── Causal Graph ── */}
        {tab === 4 && (
          <div className="tab-panel">
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className={`btn ${graphSide === 'for' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => setGraphSide('for')} style={{ padding: '9px 18px', fontSize: 13 }}>
                ✅ FOR Graph
              </button>
              <button className={`btn ${graphSide === 'against' ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => setGraphSide('against')} style={{ padding: '9px 18px', fontSize: 13 }}>
                ❌ AGAINST Graph
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                {[
                  { label: 'Chains', v: (graphSide === 'for' ? for_causal : against_causal).causal_chains.length, color: 'var(--accent-light)' },
                  { label: 'Issues', v: (graphSide === 'for' ? for_causal : against_causal).issues.length,       color: 'var(--warning)' },
                ].map(({ label, v, color }) => (
                  <div key={label} className="card" style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color }}>{v}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Causal {label}</p>
                  </div>
                ))}
              </div>
            </div>
            <CausalGraph
              graphData={graphSide === 'for' ? causal_graph_for : causal_graph_against}
              causal={graphSide === 'for' ? for_causal : against_causal}
              side={graphSide.toUpperCase()}
            />
          </div>
        )}

        {/* ── Improvements ── */}
        {tab === 5 && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Counterfactual callout */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--accent-glow), transparent)',
              borderColor: 'var(--mocha-surface2)',
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 32, flexShrink: 0 }}>🔮</span>
                <div>
                  <h3 style={{ marginBottom: 8, fontWeight: 700 }}>Counterfactual Explanation</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, fontStyle: 'italic', fontSize: 15 }}>
                    "{explanation.counterfactual}"
                  </p>
                </div>
              </div>
            </div>

            {/* Agent 8 CTA */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--success-tint), var(--accent-glow))',
              borderColor: 'var(--mocha-surface2)',
              display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>✨ Agent 8: Auto-Improve Arguments</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Use AI to rewrite either argument using the identified weaknesses to score significantly higher.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button className="btn btn-success" style={{ padding: '10px 18px', fontSize: 13 }} onClick={() => setImprovModal('FOR')}>
                  ✅ Improve FOR
                </button>
                <button className="btn btn-danger" style={{ padding: '10px 18px', fontSize: 13 }} onClick={() => setImprovModal('AGAINST')}>
                  ❌ Improve AGAINST
                </button>
              </div>
            </div>

            <ImprovementPanel improvements={explanation.improvements} />
          </div>
        )}

        {/* ── Performance ── */}
        {tab === 6 && (
          <div className="tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* AI Confidence Meter */}
            <div className="card fade-in-up" style={{
              background: 'linear-gradient(135deg, var(--accent-glow), var(--mocha-surface0))',
              borderColor: 'var(--mocha-surface2)',
            }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', flexShrink: 0,
                  background: `conic-gradient(${confidenceColor} ${confidence * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 30px ${confidenceColor}30`,
                }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--mocha-surface0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: confidenceColor }}>{confidence}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: -2 }}>/ 100</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>🧠 AI Confidence Score</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 10 }}>
                    {confidence >= 80
                      ? 'The AI is highly confident in this verdict. One side presented significantly stronger arguments with better evidence and causal reasoning.'
                      : confidence >= 60
                      ? 'The AI is moderately confident. Both sides presented reasonable arguments, but one edge out the other on key criteria.'
                      : 'This was a very close debate. The AI verdict is marginal — small improvements to the losing side could have reversed the outcome.'}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge" style={{
                      background: `${confidenceColor}15`,
                      color: confidenceColor,
                      border: `1px solid ${confidenceColor}30`,
                    }}>
                      {confidence >= 80 ? '🟢 High Certainty' : confidence >= 60 ? '🟡 Moderate Certainty' : '🔴 Low Certainty'}
                    </span>
                    <span className="badge badge-accent">Meta-Cognitive XAI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Timing Waterfall */}
            {pipeline_metadata && (
              <div className="card fade-in-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>⏱️ Pipeline Execution Breakdown</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Real-time per-agent execution metrics (v{pipeline_metadata.pipeline_version || '2.1.0'})
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-light)', lineHeight: 1 }}>
                      {pipeline_metadata.total_time_seconds || '—'}s
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>total pipeline time</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pipeline_metadata.agent_timings && Object.entries(pipeline_metadata.agent_timings).map(([agent, seconds]) => {
                    const maxTime = Math.max(...Object.values(pipeline_metadata.agent_timings), 1);
                    const pct = Math.round((seconds / maxTime) * 100);
                    const barColor = seconds > 15 ? 'var(--danger)' : seconds > 8 ? 'var(--warning)' : 'var(--accent-light)';
                    return (
                      <div key={agent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{agent}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{seconds}s</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="divider" />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--mocha-mantle)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-light)' }}>7</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Active Agents</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--mocha-mantle)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)' }}>{pipeline_metadata.provider_used || 'groq'}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Model Provider</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--mocha-mantle)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{pipeline_metadata.pipeline_version || '2.1.0'}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pipeline Version</p>
                  </div>
                </div>
              </div>
            )}

            {/* Score Margin Analysis */}
            <div className="card fade-in-up">
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>📐 Score Margin Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: 16, borderRadius: 'var(--radius)', background: 'var(--mocha-mantle)', border: '1px solid var(--mocha-surface2)' }}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-light)' }}>{Math.abs(for_score.score - against_score.score)}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Point Margin</p>
                </div>
                <div style={{ textAlign: 'center', padding: 16, borderRadius: 'var(--radius)', background: 'var(--mocha-mantle)', border: '1px solid var(--success-border)' }}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)' }}>{Math.round((for_score.score / (for_score.score + against_score.score)) * 100)}%</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>FOR Share</p>
                </div>
                <div style={{ textAlign: 'center', padding: 16, borderRadius: 'var(--radius)', background: 'var(--mocha-mantle)', border: '1px solid var(--danger-border)' }}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--danger)' }}>{Math.round((against_score.score / (for_score.score + against_score.score)) * 100)}%</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>AGAINST Share</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
