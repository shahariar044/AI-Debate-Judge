import { useState } from 'react'

const FALLACY_META = {
  ad_hominem:           { icon: '👤', label: 'Ad Hominem',           color: '#EF4444' },
  strawman:             { icon: '🌾', label: 'Strawman',             color: '#F59E0B' },
  false_cause:          { icon: '🔗', label: 'False Cause',          color: '#EC4899' },
  slippery_slope:       { icon: '📉', label: 'Slippery Slope',       color: '#8B5CF6' },
  emotional_appeal:     { icon: '💔', label: 'Emotional Appeal',     color: '#06B6D4' },
  hasty_generalization: { icon: '⚡', label: 'Hasty Generalization', color: '#F97316' },
  false_dichotomy:      { icon: '⚖️', label: 'False Dichotomy',     color: '#10B981' },
  circular_reasoning:   { icon: '🔄', label: 'Circular Reasoning',  color: '#6C63FF' },
  appeal_to_authority:  { icon: '👑', label: 'Appeal to Authority', color: '#FBBF24' },
  bandwagon:            { icon: '🚌', label: 'Bandwagon',            color: '#34D399' },
}

function FallacyCard({ f, index }) {
  const [expanded, setExpanded] = useState(false)
  const meta = FALLACY_META[f.type] || { icon: '⚠️', label: f.type, color: '#94A3B8' }

  return (
    <div style={{
      padding: '16px', borderRadius: 'var(--radius)',
      background: 'var(--mocha-mantle)',
      border: `1px solid var(--mocha-surface1)`,
      transition: 'all 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = meta.color}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--mocha-surface1)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: 'var(--mocha-surface0)',
          border: `1px solid var(--mocha-surface2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 10, fontWeight: 800, color: meta.color,
              background: 'var(--mocha-surface1)', padding: '3px 9px',
              borderRadius: 99, letterSpacing: '0.06em',
            }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{index + 1}</span>
          </div>
        </div>
      </div>

      {/* Offending sentence */}
      {f.sentence && (
        <div style={{
          padding: '9px 12px',
          borderLeft: `3px solid ${meta.color}`,
          background: 'var(--mocha-surface0)',
          borderRadius: '0 8px 8px 0',
          marginBottom: 10,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.55 }}>
            "{f.sentence.length > 140 ? f.sentence.slice(0, 140) + '…' : f.sentence}"
          </p>
        </div>
      )}

      {/* Explanation */}
      <p style={{
        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
        display: !expanded && f.explanation.length > 100 ? '-webkit-box' : 'block',
        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: !expanded && f.explanation.length > 100 ? 'hidden' : 'visible',
      }}>
        {f.explanation}
      </p>
      {f.explanation.length > 100 && (
        <button onClick={() => setExpanded(!expanded)} style={{
          all: 'unset', cursor: 'pointer', fontSize: 11, color: meta.color,
          marginTop: 5, fontWeight: 600,
        }}>
          {expanded ? '▲ Less' : '▼ More'}
        </button>
      )}
    </div>
  )
}

export default function FallacyList({ side, fallacies, color }) {
  if (!fallacies || fallacies.length === 0) {
    return (
      <div className="card fade-in-up" style={{ borderColor: `${color}20` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color, fontWeight: 800, fontSize: 15 }}>
            {side === 'FOR' ? '✅ FOR' : '❌ AGAINST'} Fallacies
          </h3>
          <span className="badge badge-success">Clean ✓</span>
        </div>
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 50, marginBottom: 12 }}>🛡️</div>
          <p style={{ color: 'var(--success)', fontWeight: 700, fontSize: 15 }}>No fallacies detected!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>This argument is logically sound.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card fade-in-up" style={{ borderColor: `${color}20` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color, fontWeight: 800, fontSize: 15 }}>
          {side === 'FOR' ? '✅ FOR' : '❌ AGAINST'} Fallacies
        </h3>
        <span className="badge badge-danger">{fallacies.length} found</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fallacies.map((f, i) => <FallacyCard key={i} f={f} index={i} />)}
      </div>
    </div>
  )
}
