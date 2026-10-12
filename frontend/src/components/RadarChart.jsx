/**
 * Radar / Spider chart for comparing FOR vs AGAINST scores across 6 dimensions.
 * Pure SVG — no extra dependencies needed.
 */

const CRITERIA = [
  { key: 'claim_clarity',     label: 'Claim Clarity',     max: 15 },
  { key: 'reasoning_quality', label: 'Reasoning',         max: 20 },
  { key: 'causal_strength',   label: 'Causal Strength',   max: 25 },
  { key: 'evidence_quality',  label: 'Evidence',          max: 20 },
  { key: 'rebuttal',          label: 'Rebuttal',          max: 10 },
  { key: 'clarity',           label: 'Clarity',           max: 10 },
]

const W = 420
const H = 380
const CX = W / 2
const CY = H / 2 - 10
const R = 130

function polarToXY(angle, radius) {
  const rad = (angle - 90) * (Math.PI / 180)
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  }
}

function buildPath(values) {
  const n = values.length
  const points = values.map((v, i) => {
    const angle = (360 / n) * i
    const pt = polarToXY(angle, v * R)
    return `${pt.x},${pt.y}`
  })
  return `M${points.join('L')}Z`
}

export default function RadarChart({ forScore, againstScore }) {
  const n = CRITERIA.length

  // Normalise scores to 0-1
  const forVals   = CRITERIA.map(c => (forScore.breakdown[c.key]   || 0) / c.max)
  const agaVals   = CRITERIA.map(c => (againstScore.breakdown[c.key] || 0) / c.max)

  // Grid rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]

  // Axis endpoints
  const axes = CRITERIA.map((_, i) => polarToXY((360 / n) * i, R))

  // Label positions (slightly beyond R)
  const labelRadius = R + 24
  const labels = CRITERIA.map((c, i) => {
    const pt = polarToXY((360 / n) * i, labelRadius)
    return { ...pt, label: c.label }
  })

  return (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15 }}>📡 Score Comparison Radar</h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(16,185,129,0.7)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>FOR ({forScore.score})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(239,68,68,0.7)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>AGAINST ({againstScore.score})</span>
          </div>
        </div>
      </div>

      <svg width={W} height={H} style={{ overflow: 'visible', maxWidth: '100%' }}>
        {/* Grid rings */}
        {rings.map(r => {
          const pts = CRITERIA.map((_, i) => {
            const pt = polarToXY((360 / n) * i, r * R)
            return `${pt.x},${pt.y}`
          })
          return (
            <polygon key={r} points={pts.join(' ')}
              fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
          )
        })}

        {/* Percentage labels on grid */}
        {rings.map(r => {
          const pt = polarToXY(0, r * R)
          return (
            <text key={`pct-${r}`} x={pt.x + 4} y={pt.y}
              fontSize={8} fill="rgba(0,0,0,0.25)" dominantBaseline="middle">
              {Math.round(r * 100)}%
            </text>
          )
        })}

        {/* Axis lines */}
        {axes.map((pt, i) => (
          <line key={i} x1={CX} y1={CY} x2={pt.x} y2={pt.y}
            stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
        ))}

        {/* AGAINST polygon */}
        <path d={buildPath(agaVals)}
          fill="rgba(239,68,68,0.12)"
          stroke="rgba(239,68,68,0.7)"
          strokeWidth={2}
          style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.4))' }}
        />

        {/* FOR polygon */}
        <path d={buildPath(forVals)}
          fill="rgba(16,185,129,0.12)"
          stroke="rgba(16,185,129,0.8)"
          strokeWidth={2}
          style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }}
        />

        {/* Data points — FOR */}
        {forVals.map((v, i) => {
          const pt = polarToXY((360 / n) * i, v * R)
          return <circle key={`f-${i}`} cx={pt.x} cy={pt.y} r={4} fill="var(--success)" />
        })}
        {/* Data points — AGAINST */}
        {agaVals.map((v, i) => {
          const pt = polarToXY((360 / n) * i, v * R)
          return <circle key={`a-${i}`} cx={pt.x} cy={pt.y} r={4} fill="var(--danger)" />
        })}

        {/* Center dot */}
        <circle cx={CX} cy={CY} r={3} fill="rgba(0,0,0,0.2)" />

        {/* Labels */}
        {labels.map(({ x, y, label }, i) => {
          const anchor = x < CX - 5 ? 'end' : x > CX + 5 ? 'start' : 'middle'
          return (
            <text key={i} x={x} y={y} textAnchor={anchor}
              fontSize={11} fill="var(--text-secondary)" fontWeight="600"
              dominantBaseline="middle" fontFamily="Inter, sans-serif">
              {label}
            </text>
          )
        })}
      </svg>

      {/* Criteria breakdown mini-table */}
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {CRITERIA.map(c => {
          const fv = forScore.breakdown[c.key] || 0
          const av = againstScore.breakdown[c.key] || 0
          const forWins = fv >= av
          return (
            <div key={c.key} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border)',
            }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: forWins ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {fv}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>vs</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: !forWins ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {av}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/{c.max}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
