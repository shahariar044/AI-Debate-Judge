import { ReactFlowProvider } from 'reactflow'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'

const STRENGTH_COLOR = {
  strong:         '#6C63FF',
  weak:           '#F59E0B',
  missing_link:   '#EF4444',
  false_causation:'#EC4899',
}

const STRENGTH_LABEL = {
  strong:         'Strong Causal Link',
  weak:           'Weak Causal Link',
  missing_link:   'Missing Link',
  false_causation:'False Causation',
}

function FlowCanvas({ nodes, edges }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
    >
      <Background color="#1A1E2A" gap={20} size={1} />
      <Controls style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} />
      <MiniMap
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        nodeColor={() => '#6C63FF'}
      />
    </ReactFlow>
  )
}

export default function CausalGraph({ graphData, causal, side }) {
  const nodes = graphData?.nodes || []
  const edges  = graphData?.edges  || []

  if (nodes.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ fontSize: 40 }}>🔗</p>
        <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: 14 }}>
          No causal chains found for the <strong>{side}</strong> side.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
          This may mean the argument did not contain explicit cause-effect relationships.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Graph Canvas — wrapped in ReactFlowProvider to avoid context errors */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', height: 480 }}>
        <ReactFlowProvider>
          <FlowCanvas nodes={nodes} edges={edges} />
        </ReactFlowProvider>
      </div>

      {/* Legend */}
      <div className="card">
        <h4 style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>
          EDGE LEGEND
        </h4>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {Object.entries(STRENGTH_COLOR).map(([k, c]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 3, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {STRENGTH_LABEL[k] || k.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Causal chain list */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h4 style={{ fontWeight: 700 }}>Causal Chains — {side}</h4>
          <span className="badge badge-accent">{causal.causal_chains.length} chains</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {causal.causal_chains.map((c, i) => {
            const col = STRENGTH_COLOR[c.strength] || '#888'
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--radius)',
                background: `${col}11`, border: `1px solid ${col}33`,
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, width: 20 }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--text-primary)' }}>{c.cause}</span>
                <span style={{ color: col, fontSize: 20, flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 13, flex: 1, color: 'var(--text-secondary)' }}>{c.effect}</span>
                <span className="badge" style={{ background: `${col}22`, color: col, minWidth: 100, justifyContent: 'center', flexShrink: 0 }}>
                  {(STRENGTH_LABEL[c.strength] || c.strength).replace(/_/g, ' ')}
                </span>
              </div>
            )
          })}
        </div>

        {causal.issues.length > 0 && (
          <>
            <div className="divider" style={{ margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ color: 'var(--warning)', fontSize: 13, fontWeight: 700 }}>⚠️ Causal Issues</h4>
              <span className="badge badge-warning">{causal.issues.length}</span>
            </div>
            {causal.issues.map((iss, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '8px 12px',
                background: 'rgba(245,158,11,0.06)', borderRadius: 8,
                border: '1px solid rgba(245,158,11,0.15)', marginBottom: 6,
              }}>
                <span style={{ color: 'var(--warning)', flexShrink: 0 }}>•</span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{iss}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
