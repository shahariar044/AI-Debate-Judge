/**
 * ImprovementModal — Agent 8 UI.
 * Shows a modal that calls POST /api/improve-argument and streams the result.
 */
import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8005/api'

export default function ImprovementModal({ resultId, side, onClose }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)

  const sideColor = side === 'FOR' ? 'var(--success)' : 'var(--danger)'

  const handleImprove = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await axios.post(`${API}/improve-argument`, { result_id: resultId, side })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Agent 8 failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result?.improved_argument) {
      navigator.clipboard.writeText(result.improved_argument)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 300,
        animation: 'fadeIn 0.2s ease',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw', maxWidth: 720,
        maxHeight: '88vh',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-xl)',
        zIndex: 301,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'scaleIn 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          background: 'rgba(79,70,229,0.04)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>✨</span>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Agent 8: Argument Improvement</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Rewriting the{' '}
              <strong style={{ color: sideColor }}>
                {side === 'FOR' ? '✅ FOR' : '❌ AGAINST'}
              </strong>{' '}
              argument using AI to score significantly higher
            </p>
          </div>
          <button className="btn btn-ghost" style={{ padding: '8px 12px', flexShrink: 0 }} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Start button */}
          {!result && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🤖</div>
              <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Ready to Improve</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 420, margin: '0 auto 28px' }}>
                Agent 8 will analyze the weaknesses identified in the{' '}
                <strong style={{ color: sideColor }}>{side}</strong> argument
                and produce a significantly stronger rewrite with specific explanations.
              </p>
              <button className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 15 }}
                onClick={handleImprove}>
                ✨ Generate Improved Argument
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div className="spinner" style={{ margin: '0 auto 20px' }} />
              <p style={{ fontWeight: 600, fontSize: 15 }}>Agent 8 is rewriting your argument...</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                Fixing fallacies, strengthening evidence, improving causal claims
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: 16, borderRadius: 'var(--radius)',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--danger)', marginBottom: 20,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Score boost banner */}
              <div style={{
                padding: '16px 20px', borderRadius: 'var(--radius)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(79,70,229,0.06))',
                border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ORIGINAL SCORE</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{result.original_score}/100</p>
                </div>
                <div style={{ fontSize: 28 }}>→</div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>PREDICTED BOOST</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{result.predicted_score_boost}</p>
                </div>
              </div>

              {/* Improved argument */}
              <div className="card" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ fontWeight: 700 }}>✅ Improved Argument</h4>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleCopy}>
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {result.improved_argument}
                </p>
              </div>

              {/* Changes made */}
              {result.changes_made?.length > 0 && (
                <div className="card">
                  <h4 style={{ fontWeight: 700, marginBottom: 14 }}>🔧 Changes Made ({result.changes_made.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.changes_made.map((c, i) => (
                      <div key={i} style={{
                        padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(79,70,229,0.04)', border: '1px solid rgba(79,70,229,0.12)',
                      }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 4 }}>
                          {c.change}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {c.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key additions */}
              {result.key_additions?.length > 0 && (
                <div className="card">
                  <h4 style={{ fontWeight: 700, marginBottom: 12 }}>📌 Key Additions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.key_additions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 1 }}>✦</span>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Re-run */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleImprove}>
                  🔄 Re-generate
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleCopy}>
                  📋 {copied ? 'Copied!' : 'Copy Improved Argument'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
