import { useToast } from './ToastProvider';

export default function ExplanationPanel({ explanation, forScore, againstScore }) {
  const forWins = explanation.winner === 'FOR';
  const addToast = useToast();

  const handleCopyVerdict = () => {
    const text = `Winner: ${explanation.winner}\nScore: ${forWins ? forScore : againstScore}/100\n\nReason: ${explanation.winner_reason}\n\nCounterfactual: ${explanation.counterfactual}`;
    navigator.clipboard.writeText(text).then(() => {
      if(addToast) addToast('Verdict copied to clipboard!', 'success');
    }).catch(() => {
      if(addToast) addToast('Failed to copy verdict', 'error');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Counterfactual */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--accent-glow), transparent)',
        borderColor: 'var(--mocha-surface1)',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--mocha-surface1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            border: '1px solid var(--mocha-surface2)',
          }}>🔮</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Counterfactual Explanation</h3>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={handleCopyVerdict}>
                📋 Copy Verdict
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, fontStyle: 'italic', fontSize: 14 }}>
              "{explanation.counterfactual}"
            </p>
          </div>
        </div>
      </div>

      {/* Strongest / Weakest sentences */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {[
          { side: 'FOR', color: 'var(--success)', strongest: explanation.strongest_sentence_for, weakest: explanation.weakest_sentence_for },
          { side: 'AGAINST', color: 'var(--danger)', strongest: explanation.strongest_sentence_against, weakest: explanation.weakest_sentence_against },
        ].map(({ side, color, strongest, weakest }) => (
          <div key={side} className="card">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>{side === 'FOR' ? '✅' : '❌'}</span>
              <h4 style={{ color, fontWeight: 700 }}>{side} — Key Sentences</h4>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--success)', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 800, letterSpacing: '0.08em' }}>STRONGEST SENTENCE</span>
              </div>
              <div style={{
                padding: '10px 14px',
                borderLeft: '3px solid var(--success)',
                background: 'var(--mocha-mantle)',
                borderRadius: '0 8px 8px 0',
              }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
                  "{strongest || 'N/A'}"
                </p>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--danger)', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 800, letterSpacing: '0.08em' }}>WEAKEST SENTENCE</span>
              </div>
              <div style={{
                padding: '10px 14px',
                borderLeft: '3px solid var(--danger)',
                background: 'var(--mocha-mantle)',
                borderRadius: '0 8px 8px 0',
              }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
                  "{weakest || 'N/A'}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
