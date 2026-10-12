/**
 * DebateHistory — slide-in drawer showing past debates from the current session.
 * Fetches summaries from GET /api/history (in-memory session store).
 */
import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8005/api'

const DOMAIN_COLORS = {
  education:   'var(--accent-light)',
  environment: 'var(--success)',
  policy:      'var(--warning)',
  technology:  'var(--cyan)',
  social:      'var(--pink)',
  health:      '#34D399',
  economy:     '#FBBF24',
  other:       'var(--text-muted)',
}

const DOMAIN_ICONS = {
  education: '🎓', environment: '🌿', policy: '📋',
  technology: '💻', social: '🤝', health: '🏥',
  economy: '💰', other: '🌐',
}

function formatTime(isoString) {
  try {
    // The backend stores UTC ISO strings. Add 'Z' if not already present.
    const s = isoString.endsWith('Z') ? isoString : isoString + 'Z'
    return new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatDate(isoString) {
  try {
    const s = isoString.endsWith('Z') ? isoString : isoString + 'Z'
    return new Date(s).toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function DebateHistory({ onClose, onSelect }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API}/history`, { timeout: 5000 })
        setHistory(res.data)
      } catch {
        setError('Could not load history — is the backend running?')
        setHistory([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const handleSelect = async (id) => {
    try {
      const res = await axios.get(`${API}/results/${id}`)
      onSelect(res.data)
    } catch {
      alert('Could not load that result — it may have expired (history is session-only).')
    }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0,
          background: 'var(--bg-secondary)',
          backdropFilter: 'blur(12px)',
          zIndex: 1,
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>🕐 Debate History</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {history.length > 0 ? `${history.length} debate${history.length > 1 ? 's' : ''} this session` : 'Current session results'}
            </p>
          </div>
          <button className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 13 }} onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading history...</p>
            </div>
          )}

          {!loading && error && (
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--radius)',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--danger)', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No debates analyzed yet this session.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                Run an analysis on the main page to see it here.
              </p>
            </div>
          )}

          {history.map((item) => {
            const forWins     = item.winner === 'FOR'
            const domainColor = DOMAIN_COLORS[item.domain] || DOMAIN_COLORS.other
            const domainIcon  = DOMAIN_ICONS[item.domain]  || '🌐'
            const scoreDiff   = Math.abs((item.for_score || 0) - (item.against_score || 0))

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'block',
                  padding: '14px 16px', borderRadius: 'var(--radius)',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  transition: 'all 0.2s ease', textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border-accent)'
                  e.currentTarget.style.background  = 'var(--bg-card-hover)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background  = 'var(--bg-card)'
                }}
              >
                {/* Domain + time */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: domainColor,
                    background: `${domainColor}18`, padding: '3px 8px',
                    borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {domainIcon} {item.domain}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {formatDate(item.created_at)} {formatTime(item.created_at)}
                  </span>
                </div>

                {/* Topic */}
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.4 }}>
                  {item.topic.length > 72 ? item.topic.slice(0, 72) + '…' : item.topic}
                </p>

                {/* Scores + winner + margin */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--success)' }}>
                      FOR: {item.for_score}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>vs</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--danger)' }}>
                      AGN: {item.against_score}
                    </span>
                    {scoreDiff > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        (+{scoreDiff})
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                    background: forWins ? 'var(--success-glow)' : 'var(--danger-glow)',
                    color:      forWins ? 'var(--success)'     : 'var(--danger)',
                    border: `1px solid ${forWins ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    flexShrink: 0,
                  }}>
                    {forWins ? '✅ FOR wins' : '❌ AGAINST wins'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            💾 History is stored in server memory during this session only.
          </p>
        </div>
      </div>
    </>
  )
}
