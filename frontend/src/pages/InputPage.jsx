import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useToast } from '../components/ToastProvider'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8005/api'

const SAMPLE_DEBATES = [
  {
    icon: '🎓',
    label: 'AI in Exams',
    topic: 'AI tools should be allowed in university exams in Bangladesh',
    for_argument: `Allowing AI tools in university exams in Bangladesh would significantly enhance the quality of student output and better prepare graduates for the modern workforce. Research from MIT and Stanford shows that students who use AI assistance produce work that is 40% more comprehensive and demonstrates higher-order thinking. In Bangladesh's rapidly digitalizing economy, where technology companies like BJIT, DataSoft, and Pathao are growing rapidly, graduates who are comfortable using AI tools will have a decisive competitive advantage. Furthermore, AI tools level the playing field—students from rural areas with less access to premium coaching centers can now access the same knowledge as their urban counterparts. The purpose of university education is not to test memorization but to evaluate problem-solving ability, analytical thinking, and the capacity to leverage available resources effectively. Banning AI in exams creates an artificial environment that does not reflect real professional settings. Countries like Finland and Singapore already allow AI-assisted examinations with great success, showing measurable improvements in graduate employability.`,
    against_argument: `Permitting AI tools in university examinations fundamentally undermines the core purpose of academic assessment in Bangladesh. Exams are designed to measure individual understanding, critical thinking, and the depth of knowledge a student has genuinely acquired through study and effort. When AI tools are allowed, it becomes impossible to distinguish between a student's own intellectual capability and the machine's output, rendering grades meaningless. This is particularly dangerous in high-stakes professional fields like medicine, engineering, and law, where practitioners must think independently in emergencies. Bangladesh's educational institutions already face credibility challenges internationally; allowing AI in exams would further devalue Bangladeshi degrees. Moreover, economically disadvantaged students who cannot afford premium AI subscriptions would be systematically disadvantaged. Studies from the University of Dhaka indicate that over 60% of students report reduced motivation to deeply learn material when AI shortcuts are available.`,
  },
  {
    icon: '♻️',
    label: 'Plastic Ban',
    topic: 'Bangladesh should implement a complete ban on single-use plastics',
    for_argument: `Bangladesh must implement an immediate and comprehensive ban on single-use plastics to protect its rivers, coastal ecosystems, and public health. The Buriganga, Turag, and Shitalakhya rivers are among the most polluted in the world, with plastic waste being a primary contributor. The Bangladesh River Research Institute documented over 200,000 tonnes of plastic entering waterways annually, directly causing fish mortality rates to increase by 35% over the past decade. Single-use plastics also clog drainage systems, directly worsening urban flooding in Dhaka during monsoon season. Bangladesh was the first country in the world to ban thin polythene bags in 2002, demonstrating the political will to act decisively. Jute, Bangladesh's golden fiber, provides an economically superior and already-established alternative for packaging needs.`,
    against_argument: `A complete ban on single-use plastics in Bangladesh would create severe economic and social disruptions the country is not equipped to handle. Bangladesh's small-scale plastic manufacturing sector employs approximately 2 million workers, predominantly from low-income backgrounds. An abrupt ban without adequate transition and economic safety nets would result in mass unemployment. The practical alternatives—biodegradable packaging, jute, glass—are 3 to 5 times more expensive, inaccessible to most Bangladeshi consumers. Furthermore, the cold chain and food safety infrastructure relies heavily on plastic packaging to prevent contamination. The 2002 polythene bag ban is widely acknowledged to have failed due to poor enforcement, with plastic bags still ubiquitous across markets.`,
  },
  {
    icon: '⚡',
    label: 'Transit Feasibility',
    topic: 'Dhaka should transition to fully electric public transport within 5 years',
    for_argument: `Dhaka should switch all public transport to electric vehicles within five years because electric buses are cleaner and modern. Other cities have started using electric buses, so Dhaka should do the same quickly. Air pollution is a serious problem, and electric transport would help reduce smoke from diesel buses. The city already has some experience with electric trains through the Metrorail, which shows that people are willing to use modern transport. If the government commits to the change, the city can become greener and more advanced. A fast transition would also show that Bangladesh is serious about climate action and technological progress.`,
    against_argument: `A five-year full transition to electric public transport in Dhaka is not realistic because the proposal ignores infrastructure, financing, grid capacity, and workforce disruption. Electric buses require reliable charging depots, upgraded distribution lines, spare-parts supply chains, trained mechanics, and route-level energy planning; Dhaka does not currently have those systems at the scale needed for thousands of vehicles. The upfront cost would also be extremely high: even a 5,000-bus replacement program could require more than $1 billion before accounting for charging infrastructure, land acquisition, battery replacement, and maintenance contracts. Bangladesh's power grid still faces peak-load pressure, so adding large overnight bus-charging demand without phased grid upgrades could shift pollution and reliability problems rather than solve them. A more defensible policy is a phased 10- to 15-year transition that starts with high-ridership corridors, depot pilots, grid upgrades, domestic technician training, and targeted subsidies. That approach captures environmental benefits while reducing fiscal risk, service disruption, and harm to workers in the existing bus and CNG transport ecosystem.`,
  },
]

const PIPELINE_STEPS = [
  { icon: '🌐', label: 'Topic Context Agent',      desc: 'Classifying domain & entities' },
  { icon: '🔍', label: 'Argument Extraction',      desc: 'Parsing claims, reasons & evidence' },
  { icon: '🔗', label: 'Causal Reasoning Agent',   desc: 'Mapping cause-effect chains' },
  { icon: '⚠️', label: 'Fallacy Detection',        desc: 'Identifying logical weaknesses' },
  { icon: '📊', label: 'Evidence Quality Agent',   desc: 'Scoring specificity & credibility' },
  { icon: '🏆', label: 'Scoring Agent',             desc: 'Evaluating 6 debate dimensions' },
  { icon: '💡', label: 'Explanation & Improvement', desc: 'Generating insights & winner' },
  { icon: '✨', label: 'Argument Improvement',     desc: 'AI rewriting weak arguments (on demand)' },
]

export default function InputPage({ onSubmit, onHistoryOpen }) {
  const [topic,      setTopic]    = useState('')
  const [forArg,     setForArg]   = useState('')
  const [againstArg, setAgainst]  = useState('')
  const [loading,    setLoading]  = useState(false)
  const [error,      setError]    = useState('')
  const [step,       setStep]     = useState(-1)
  const [pct,        setPct]      = useState(0)
  const [backendOk,  setBackendOk]= useState(true)
  const [provider,   setProvider] = useState('both')
  const [providers,  setProviders]= useState({ groq: true, gemini: false })

  const addToast = useToast()

  useEffect(() => {
    axios.get(`${API}/health`, { timeout: 4000 })
      .then((res) => {
        setBackendOk(true)
        const available = res.data?.providers || { groq: true, gemini: Boolean(res.data?.gemini_key_loaded) }
        setProviders(available)
        setProvider((current) => {
          if (available.groq && available.gemini) return 'both'
          if (available[current]) return current
          return available.groq ? 'groq' : 'gemini'
        })
      })
      .catch(() => setBackendOk(false))
  }, [])

  useEffect(() => {
    if (!loading) return
    let i = 0
    const STEP_MS = 7000
    const tick = setInterval(() => {
      i++
      if (i < 7) {
        setStep(i - 1)
        setPct(Math.round((i / 7) * 95))
      }
    }, STEP_MS)
    return () => clearInterval(tick)
  }, [loading])

  const loadSample = useCallback((s) => {
    setTopic(s.topic)
    setForArg(s.for_argument)
    setAgainst(s.against_argument)
    setError('')
  }, [])

  const wordCount = (t) => t.split(/\s+/).filter(Boolean).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim() || !forArg.trim() || !againstArg.trim()) {
      setError('Please fill in all three fields before analysing.')
      return
    }
    if (wordCount(forArg) < 30 || wordCount(againstArg) < 30) {
      setError('Each argument should be at least 30 words for meaningful analysis.')
      return
    }
    setLoading(true)
    setStep(-1)
    setPct(0)
    setError('')
    try {
      if (provider === 'both') {
        const p1 = axios.post(`${API}/analyze-debate`, { topic, for_argument: forArg, against_argument: againstArg, provider: 'groq' })
        const p2 = axios.post(`${API}/analyze-debate`, { topic, for_argument: forArg, against_argument: againstArg, provider: 'gemini' })
        const settled = await Promise.allSettled([p1, p2])
        const successful = settled
          .filter(({ status }) => status === 'fulfilled')
          .map(({ value }) => value)
        if (successful.length === 0) {
          const messages = settled.map(({ reason }) => reason?.response?.data?.detail || reason?.message).filter(Boolean)
          throw new Error(messages.join(' | ') || 'Both providers failed.')
        }
        setPct(98)
        const fullResults = await Promise.all(
          successful.map((res) => axios.get(`${API}/results/${res.data.id}`))
        )
        setPct(100)
        await new Promise(r => setTimeout(r, 400))
        if (addToast && successful.some((res) => res.data.cached)) addToast('⚡ Retrieved instantly from cache!', 'success')
        if (addToast && successful.length < 2) addToast('One provider failed; showing the completed result.', 'error')
        onSubmit(fullResults.map((res) => res.data))
      } else {
        const res = await axios.post(`${API}/analyze-debate`, {
          topic, for_argument: forArg, against_argument: againstArg, provider
        })
        const { id, cached } = res.data
        if (cached && addToast) addToast('⚡ Retrieved instantly from cache!', 'success')
        setPct(98)
        const full = await axios.get(`${API}/results/${id}`)
        setPct(100)
        await new Promise(r => setTimeout(r, 400))
        onSubmit([full.data])
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Something went wrong. Is the backend running?'
      setError(detail)
    } finally {
      setLoading(false)
      setStep(-1)
      setPct(0)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>

      {/* ── Header ──────────────────────────────────── */}
      <header style={{
        padding: '0 40px',
        height: 72,
        borderBottom: '1px solid rgba(137, 180, 250, 0.22)',
        background: 'var(--glass)',
        backdropFilter: 'blur(18px)',
        boxShadow: 'var(--shadow-glass)',
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--r-sm)',
          background: 'linear-gradient(145deg, var(--mocha-surface0), var(--mocha-mantle))',
          border: '1px solid rgba(137, 180, 250, 0.28)',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(205, 214, 244, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          color: 'var(--mocha-blue)',
        }}>⚖️</div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', letterSpacing: 0 }}>
            DebateLens
          </div>
          <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>8-agent causal analysis</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mocha-overlay0)' }} />
            <span>Groq + Gemini</span>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Backend status */}
          <span className="badge" style={{
            background: backendOk ? 'var(--success-tint)' : 'var(--danger-tint)',
            color: backendOk ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${backendOk ? 'var(--success-border)' : 'var(--danger-border)'}`,
          }}>
            <span style={{ fontSize: 8 }}>{backendOk ? '●' : '●'}</span>
            {backendOk ? 'Backend Online' : 'Backend Offline'}
          </span>

          <button
            className="btn btn-ghost"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={onHistoryOpen}
          >
            History
          </button>
        </div>
      </header>

      {/* ── Backend offline warning ─────────────────── */}
      {!backendOk && (
        <div style={{
          padding: '12px 40px',
          background: 'var(--danger-tint)',
          borderBottom: '1px solid var(--danger-border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>Backend server is not reachable</p>
            <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 2 }}>
              Start the backend with:{' '}
              <code style={{ background: 'var(--soft-cloud)', padding: '2px 8px', borderRadius: 4, fontSize: 11, border: '1px solid var(--hairline)' }}>
                uvicorn backend.main:app --reload
              </code>
            </p>
          </div>
        </div>
      )}

      {/* ── Hero ────────────────────────────────────── */}
      <div className="hero-section" style={{
        textAlign: 'center',
        padding: '72px 24px 52px',
        background: 'linear-gradient(180deg, rgba(24, 24, 37, 0.98), rgba(17, 17, 27, 0.96))',
        borderBottom: '1px solid rgba(137, 180, 250, 0.22)',
      }}>
        {/* Breadcrumb-style label */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--ash)', fontWeight: 500,
          marginBottom: 24, letterSpacing: 0,
        }}>
          <span style={{ color: 'var(--rausch)', fontSize: 10 }}>●</span>
          Debate analysis for policy, education, and social issues
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 60px)',
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: 20,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          textShadow: '0 12px 36px rgba(0, 0, 0, 0.28)',
        }}>
          Judge debate arguments<br />
          <span style={{ color: 'var(--rausch)' }}>with evidence.</span>
        </h1>

        <p style={{
          color: 'var(--ash)',
          fontSize: 16,
          maxWidth: 520,
          margin: '0 auto 36px',
          lineHeight: 1.7,
          fontWeight: 500,
        }}>
          Submit two opposing arguments. The analysis extracts claims, checks causal chains, reviews evidence, scores both sides, and explains the result.
        </p>

        {/* Agent pill strip */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 680, margin: '0 auto' }}>
          {['Topic', 'Extract', 'Causal', 'Fallacy', 'Evidence', 'Score', 'Explain', 'Improve'].map(a => (
            <span key={a} className="badge badge-neutral" style={{
              fontSize: 11,
              padding: '5px 12px',
              background: 'rgba(49, 50, 68, 0.54)',
              borderColor: 'rgba(137, 180, 250, 0.24)',
              color: 'var(--mocha-subtext1)',
            }}>{a}</span>
          ))}
        </div>
      </div>

      {/* ── Sample Debates ─────────────────────────── */}
      <div className="page-padding" style={{ padding: '24px 40px 0', maxWidth: 1120, margin: '0 auto', width: '100%' }}>
        <p style={{ fontSize: 12, color: 'var(--ash)', marginBottom: 10, fontWeight: 600 }}>
          Load a sample debate
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SAMPLE_DEBATES.map((s, i) => (
            <button
              key={i}
              className="btn btn-ghost btn-pill sample-chip"
              style={{ fontSize: 13, padding: '8px 18px' }}
              onClick={() => loadSample(s)}
              disabled={loading}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Form ───────────────────────────────── */}
      <div style={{ flex: 1, padding: '24px 40px 80px', maxWidth: 1120, margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleSubmit}>

          {/* Topic field */}
          <div className="card" style={{ marginBottom: 16 }}>
            <label>Debate Topic / Motion</label>
            <input
              type="text"
              id="topic-input"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. AI tools should be allowed in university exams in Bangladesh"
              disabled={loading}
            />
          </div>

          {/* Provider Selection */}
          <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ margin: 0, whiteSpace: 'nowrap', color: 'var(--ink)', fontWeight: 600 }}>AI Model</label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              disabled={loading}
              style={{ flex: 1, minWidth: 200 }}
            >
              <option value="groq">🦙 Groq (LLaMA-3.3-70B)</option>
              <option value="gemini" disabled={!providers.gemini}>
                ✨ Gemini Model{providers.gemini ? '' : ' (not configured)'}
              </option>
              <option value="both" disabled={!providers.groq || !providers.gemini}>
                ⚖️ Compare Both{providers.gemini ? '' : ' (Gemini not configured)'}
              </option>
            </select>
          </div>

          {/* Arguments grid */}
          <div className="grid-2col page-padding" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* FOR */}
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ margin: 0, color: 'var(--success)', fontWeight: 600 }}>
                  ✅ FOR — Supporting Argument
                </label>
                <span style={{
                  fontSize: 11, color: wordCount(forArg) < 30 ? 'var(--danger)' : 'var(--ash)',
                  fontWeight: 500,
                }}>
                  {wordCount(forArg)} words{wordCount(forArg) < 30 && wordCount(forArg) > 0 ? ' · min 30' : ''}
                </span>
              </div>
              <textarea
                id="for-arg"
                value={forArg}
                onChange={e => setForArg(e.target.value)}
                placeholder="Enter the argument in favour of the motion..."
                disabled={loading}
                style={{ minHeight: 240 }}
              />
            </div>

            {/* AGAINST */}
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ margin: 0, color: 'var(--danger)', fontWeight: 600 }}>
                  ❌ AGAINST — Opposing Argument
                </label>
                <span style={{
                  fontSize: 11, color: wordCount(againstArg) < 30 ? 'var(--danger)' : 'var(--ash)',
                  fontWeight: 500,
                }}>
                  {wordCount(againstArg)} words{wordCount(againstArg) < 30 && wordCount(againstArg) > 0 ? ' · min 30' : ''}
                </span>
              </div>
              <textarea
                id="against-arg"
                value={againstArg}
                onChange={e => setAgainst(e.target.value)}
                placeholder="Enter the argument against the motion..."
                disabled={loading}
                style={{ minHeight: 240 }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '14px 18px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--danger-tint)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              marginBottom: 16,
              fontSize: 14,
              fontWeight: 500,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="card" style={{ padding: '32px 40px' }}>
              {/* Progress bar */}
              <div className="progress-bar" style={{ marginBottom: 24 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <div className="spinner" style={{ flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
                    Running 8-Agent Pipeline
                    <span style={{ color: 'var(--rausch)', marginLeft: 8 }}>{pct}%</span>
                  </p>
                  <p style={{ color: 'var(--ash)', fontSize: 13, marginBottom: 20 }}>
                    This takes 45–90 seconds — each agent calls the selected AI model
                  </p>

                  {/* Step list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {PIPELINE_STEPS.slice(0, 7).map((s, i) => {
                      const done    = i < step
                      const current = i === step
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          opacity: done ? 1 : current ? 1 : 0.4,
                          transition: 'opacity 0.3s ease',
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: done ? 'var(--success)' : current ? 'var(--rausch)' : 'var(--mocha-surface1)',
                            border: `1px solid ${done ? 'transparent' : current ? 'transparent' : 'var(--mocha-surface2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, flexShrink: 0,
                            transition: 'background 0.3s ease',
                          }}>
                            {done ? '✓' : s.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: current ? 'var(--ink)' : 'var(--ash)' }}>
                              {s.label}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 1 }}>{s.desc}</div>
                          </div>
                          {current && <div className="spinner-sm" style={{ marginLeft: 'auto' }} />}
                          {done && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Done</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <button
                id="analyze-btn"
                type="submit"
                className="btn btn-primary btn-pill"
                style={{ padding: '16px 56px', fontSize: 16, fontWeight: 600 }}
                disabled={!backendOk}
              >
                Analyze Debate →
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
