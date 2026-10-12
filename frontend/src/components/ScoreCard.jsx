import { useEffect, useState } from 'react'

const CRITERIA = [
  { key: 'claim_clarity',     label: 'Claim Clarity',     max: 15, icon: '🎯' },
  { key: 'reasoning_quality', label: 'Reasoning Quality', max: 20, icon: '🧠' },
  { key: 'causal_strength',   label: 'Causal Strength',   max: 25, icon: '🔗' },
  { key: 'evidence_quality',  label: 'Evidence Quality',  max: 20, icon: '📊' },
  { key: 'rebuttal',          label: 'Rebuttal',          max: 10, icon: '🛡️' },
  { key: 'clarity',           label: 'Clarity',           max: 10, icon: '✏️' },
]

const EV_COLOR = {
  strong: 'var(--success)',
  medium: 'var(--warning)',
  weak:   'var(--danger)',
}

const EV_TINT = {
  strong: 'var(--success-tint)',
  medium: 'var(--warning-tint)',
  weak:   'var(--danger-tint)',
}

const EV_BORDER = {
  strong: 'var(--success-border)',
  medium: 'rgba(249, 226, 175, 0.25)',
  weak:   'var(--danger-border)',
}

function AnimatedBar({ value, max, color, delay = 0 }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / max) * 100), 100 + delay)
    return () => clearTimeout(t)
  }, [value, max, delay])
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${width}%`, background: color }} />
    </div>
  )
}

function AnimatedNumber({ target, color }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const step = Math.ceil(target / 20)
    const t = setInterval(() => {
      start = Math.min(start + step, target)
      setDisplay(start)
      if (start >= target) clearInterval(t)
    }, 40)
    return () => clearInterval(t)
  }, [target])
  return <span style={{ color }}>{display}</span>
}

export default function ScoreCard({ side, score, color, evidence }) {
  const forSide = side === 'FOR'
  return (
    <div className="card fade-in-up" style={{ borderColor: 'var(--mocha-surface1)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 800, color, fontSize: 18, marginBottom: 4 }}>
            <span style={{ fontSize: '0.9em' }}>{forSide ? '✅' : '❌'}</span> {forSide ? 'FOR' : 'AGAINST'}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Debate Score</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>
            <AnimatedNumber target={score.score} color={color} />
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>/100 points</p>
        </div>
      </div>

      {/* Total progress bar */}
      <AnimatedBar value={score.score} max={100} color={color} />

      <div className="divider" style={{ margin: '20px 0' }} />

      {/* Criteria breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {CRITERIA.map(({ key, label, max, icon }, i) => {
          const val = score.breakdown[key] || 0
          const pct = Math.round((val / max) * 100)
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{val}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{max}</span></span>
                </div>
              </div>
              <AnimatedBar value={val} max={max} color={color} delay={i * 80} />
            </div>
          )
        })}
      </div>

      {/* Evidence quality panel */}
      <div style={{
        marginTop: 20, padding: '16px', borderRadius: 'var(--radius)',
        background: 'var(--mocha-mantle)', border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            📊 EVIDENCE QUALITY
          </span>
          <span className="badge" style={{
            background: EV_TINT[evidence.quality],
            color: EV_COLOR[evidence.quality],
            border: `1px solid ${EV_BORDER[evidence.quality]}`,
          }}>
            {evidence.quality}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
          {evidence.reason}
        </p>
        {evidence.scores && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Object.entries(evidence.scores).map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--mocha-surface1)' }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: EV_COLOR[evidence.quality] }}>{v}</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{k.slice(0, 5)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
