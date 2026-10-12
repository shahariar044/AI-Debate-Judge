import { useState } from 'react';
import { useToast } from './ToastProvider';
import jsPDF from 'jspdf';

export default function ExportButton({ result }) {
  const [exporting, setExporting] = useState(false);
  const addToast = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const htmlContent = generateReportHTML(result);
      const container = document.createElement('div');
      // Use standard styling for the container, ensuring it's not hidden with display:none
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      
      // Allow fonts and layout to settle
      await new Promise(r => setTimeout(r, 500));

      const pdf = new jsPDF('p', 'pt', 'a4');
      
      await pdf.html(container, {
        margin: [30, 0, 30, 0], // Top, Right, Bottom, Left margins
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 595, // A4 width in pt
        windowWidth: 794, // Matches the container width
      });

      pdf.save(`debate_analysis_${result.id.slice(0, 8)}.pdf`);
      document.body.removeChild(container);
      
      if (addToast) addToast('PDF report downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      if (addToast) addToast('Failed to generate PDF report', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}
      onClick={handleExport} disabled={exporting}>
      {exporting ? '⏳ Generating PDF...' : '📄 Download Report'}
    </button>
  );
}

/* ── helpers ── */
const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sectionTitle(icon, text) {
  return `<h2 style="font-size:16px;color:#312e81;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:24px 0 12px;page-break-inside:avoid;break-inside:avoid;">${icon} ${text}</h2>`;
}

function sidePill(label, color) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;color:#fff;background:${color};margin-bottom:8px;">${label}</span>`;
}

function card(content, extra = '') {
  return `<div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:12px;page-break-inside:avoid;break-inside:avoid;${extra}">${content}</div>`;
}

function bulletList(items) {
  if (!items || items.length === 0) return '<p style="color:#9ca3af;font-style:italic;font-size:12px;">None</p>';
  return items.map(i => `<div style="display:flex;gap:8px;margin:4px 0;page-break-inside:avoid;break-inside:avoid;"><span style="color:#6366f1;flex-shrink:0;">•</span><span style="font-size:12px;color:#374151;">${esc(i)}</span></div>`).join('');
}

/* ── main generator ── */
function generateReportHTML(result) {
  const {
    topic, topic_context, explanation, for_score, against_score,
    for_fallacies, against_fallacies, for_evidence, against_evidence,
    for_structure, against_structure, for_causal, against_causal,
    pipeline_metadata,
  } = result;

  const forWins = explanation.winner === 'FOR';
  const winClr = forWins ? '#10b981' : '#ef4444';
  const winScore = forWins ? for_score.score : against_score.score;
  const confidence = explanation.confidence_score || 75;

  const breakdownRows = [
    ['Claim Clarity', 'claim_clarity'], ['Reasoning Quality', 'reasoning_quality'],
    ['Causal Strength', 'causal_strength'], ['Evidence Quality', 'evidence_quality'],
    ['Rebuttal', 'rebuttal'], ['Clarity', 'clarity'],
  ];

  const fallacyCards = (fallacies) => {
    if (!fallacies || fallacies.length === 0) return '<p style="color:#9ca3af;font-style:italic;font-size:12px;">No fallacies detected</p>';
    return fallacies.map(f => `
      <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:8px 12px;margin:6px 0;border-radius:4px;page-break-inside:avoid;break-inside:avoid;">
        <strong style="color:#92400e;font-size:13px;">${esc(f.type)}</strong>
        <p style="margin:2px 0;color:#374151;font-size:12px;">"${esc(f.sentence)}"</p>
        <p style="margin:2px 0;color:#6b7280;font-size:11px;font-style:italic;">${esc(f.explanation)}</p>
      </div>`).join('');
  };

  const evidenceScoreRows = (scores) => {
    if (!scores) return '';
    return Object.entries(scores).map(([k, v]) =>
      `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;page-break-inside:avoid;break-inside:avoid;">
        <span style="font-size:12px;color:#374151;text-transform:capitalize;">${k}</span>
        <span style="font-size:12px;font-weight:700;color:#4338ca;">${v}/10</span>
      </div>`).join('');
  };

  const causalSection = (causal) => {
    let html = '<p style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;">Causal Chains:</p>';
    if (causal.causal_chains.length === 0) {
      html += '<p style="color:#9ca3af;font-style:italic;font-size:12px;">No chains identified</p>';
    } else {
      html += causal.causal_chains.map(c =>
        `<div style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px;page-break-inside:avoid;break-inside:avoid;">
          <span style="background:#eff6ff;padding:3px 8px;border-radius:4px;color:#1e40af;">${esc(c.cause)}</span>
          <span style="color:#9ca3af;">→</span>
          <span style="background:#f0fdf4;padding:3px 8px;border-radius:4px;color:#065f46;">${esc(c.effect)}</span>
          <span style="font-size:10px;padding:2px 6px;border-radius:99px;background:${c.strength === 'strong' ? '#dcfce7' : c.strength === 'weak' ? '#fef9c3' : '#fee2e2'};color:${c.strength === 'strong' ? '#166534' : c.strength === 'weak' ? '#854d0e' : '#991b1b'};">${c.strength}</span>
        </div>`).join('');
    }
    if (causal.issues.length > 0) {
      html += '<p style="font-size:12px;font-weight:600;color:#dc2626;margin:10px 0 4px;">Issues:</p>';
      html += causal.issues.map(i => `<p style="font-size:11px;color:#7f1d1d;margin:2px 0;">⚠ ${esc(i)}</p>`).join('');
    }
    return html;
  };

  const improvementsList = (improvements) => {
    if (!improvements || improvements.length === 0) return '';
    return improvements.map(imp => `
      <div style="display:flex;gap:8px;margin:6px 0;align-items:flex-start;">
        <span style="font-size:10px;padding:2px 6px;border-radius:99px;font-weight:700;flex-shrink:0;background:${imp.priority === 'high' ? '#fee2e2' : imp.priority === 'medium' ? '#fef9c3' : '#f0fdf4'};color:${imp.priority === 'high' ? '#991b1b' : imp.priority === 'medium' ? '#854d0e' : '#166534'};">${imp.priority}</span>
        <div><span style="font-size:11px;font-weight:600;color:#4338ca;">[${esc(imp.side)}]</span> <span style="font-size:12px;color:#374151;">${esc(imp.suggestion)}</span></div>
      </div>`).join('');
  };

  return `<div style="font-family:'Segoe UI',Arial,sans-serif;padding:36px 32px;color:#1f2937;line-height:1.6;max-width:794px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #6366f1;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#312e81;">🧠 DebateLens</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;letter-spacing:0.5px;">Comprehensive Multi-Agent Analysis Report</p>
    </div>

    <!-- Topic -->
    <div style="background:#f0f0ff;padding:14px 18px;border-radius:8px;margin-bottom:20px;border:1px solid #c7d2fe;">
      <h2 style="margin:0 0 4px;font-size:15px;color:#4338ca;">📋 Topic</h2>
      <p style="margin:0;font-size:14px;font-weight:600;color:#1e1b4b;">${esc(topic)}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">Domain: ${esc(topic_context.domain)} &nbsp;|&nbsp; Intent: ${esc(topic_context.debate_intent)}</p>
      <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">Key Entities: ${topic_context.entities.map(e => esc(e)).join(', ')}</p>
    </div>

    <!-- Winner -->
    <div style="background:${winClr};color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.85;">Winner</p>
      <h2 style="margin:4px 0;font-size:20px;font-weight:700;">🏆 ${explanation.winner} Side — ${winScore}/100</h2>
      <p style="margin:4px 0 0;font-size:11px;opacity:0.85;">AI Confidence: ${confidence}%</p>
    </div>

    <!-- Verdict -->
    ${sectionTitle('⚖️', 'Verdict & Explanation')}
    <p style="font-size:13px;color:#374151;margin-bottom:10px;">${esc(explanation.winner_reason)}</p>
    <div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:10px 14px;border-radius:4px;margin-bottom:6px;">
      <p style="margin:0;font-size:11px;color:#1e40af;font-weight:600;">Counterfactual Reasoning</p>
      <p style="margin:4px 0 0;font-size:12px;color:#374151;font-style:italic;">${esc(explanation.counterfactual)}</p>
    </div>

    <!-- Argument Structures (Both Sides) -->
    ${sectionTitle('📝', 'Argument Structures — Both Sides')}
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        ${sidePill('FOR', '#059669')}
        ${card(`
          <p style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:6px;">Claim</p>
          <p style="font-size:12px;color:#374151;margin-bottom:10px;">${esc(for_structure.claim)}</p>
          <p style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:4px;">Reasons</p>
          ${bulletList(for_structure.reasons)}
          <p style="font-size:12px;font-weight:700;color:#065f46;margin:10px 0 4px;">Evidence</p>
          ${bulletList(for_structure.evidence)}
          <p style="font-size:12px;font-weight:700;color:#065f46;margin:10px 0 4px;">Assumptions</p>
          ${bulletList(for_structure.assumptions)}
          <p style="font-size:12px;font-weight:700;color:#065f46;margin:10px 0 4px;">Conclusion</p>
          <p style="font-size:12px;color:#374151;">${esc(for_structure.conclusion)}</p>
        `, 'border-left:3px solid #059669;')}
      </div>
      <div style="flex:1;">
        ${sidePill('AGAINST', '#dc2626')}
        ${card(`
          <p style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:6px;">Claim</p>
          <p style="font-size:12px;color:#374151;margin-bottom:10px;">${esc(against_structure.claim)}</p>
          <p style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:4px;">Reasons</p>
          ${bulletList(against_structure.reasons)}
          <p style="font-size:12px;font-weight:700;color:#991b1b;margin:10px 0 4px;">Evidence</p>
          ${bulletList(against_structure.evidence)}
          <p style="font-size:12px;font-weight:700;color:#991b1b;margin:10px 0 4px;">Assumptions</p>
          ${bulletList(against_structure.assumptions)}
          <p style="font-size:12px;font-weight:700;color:#991b1b;margin:10px 0 4px;">Conclusion</p>
          <p style="font-size:12px;color:#374151;">${esc(against_structure.conclusion)}</p>
        `, 'border-left:3px solid #dc2626;')}
      </div>
    </div>

    <!-- Strongest & Weakest Sentences -->
    ${sectionTitle('💪', 'Key Sentences Analysis')}
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        ${sidePill('FOR', '#059669')}
        ${card(`
          <p style="font-size:11px;font-weight:700;color:#065f46;margin-bottom:4px;">✅ Strongest</p>
          <p style="font-size:12px;color:#374151;font-style:italic;">"${esc(explanation.strongest_sentence_for)}"</p>
          <p style="font-size:11px;font-weight:700;color:#991b1b;margin:10px 0 4px;">❌ Weakest</p>
          <p style="font-size:12px;color:#374151;font-style:italic;">"${esc(explanation.weakest_sentence_for)}"</p>
        `)}
      </div>
      <div style="flex:1;">
        ${sidePill('AGAINST', '#dc2626')}
        ${card(`
          <p style="font-size:11px;font-weight:700;color:#065f46;margin-bottom:4px;">✅ Strongest</p>
          <p style="font-size:12px;color:#374151;font-style:italic;">"${esc(explanation.strongest_sentence_against)}"</p>
          <p style="font-size:11px;font-weight:700;color:#991b1b;margin:10px 0 4px;">❌ Weakest</p>
          <p style="font-size:12px;color:#374151;font-style:italic;">"${esc(explanation.weakest_sentence_against)}"</p>
        `)}
      </div>
    </div>

    <!-- Final Scores -->
    ${sectionTitle('📊', 'Final Scores')}
    <div style="display:flex;gap:14px;margin-bottom:8px;">
      <div style="flex:1;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#065f46;font-weight:600;">FOR</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#059669;">${for_score.score}</p>
        <p style="margin:0;font-size:10px;color:#6b7280;">/100</p>
      </div>
      <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#991b1b;font-weight:600;">AGAINST</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#dc2626;">${against_score.score}</p>
        <p style="margin:0;font-size:10px;color:#6b7280;">/100</p>
      </div>
    </div>

    <!-- Score Breakdown Table -->
    ${sectionTitle('📈', 'Score Breakdown')}
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="text-align:left;padding:7px 10px;border:1px solid #e5e7eb;">Dimension</th>
        <th style="text-align:center;padding:7px 10px;border:1px solid #e5e7eb;color:#059669;">FOR</th>
        <th style="text-align:center;padding:7px 10px;border:1px solid #e5e7eb;color:#dc2626;">AGAINST</th>
      </tr></thead>
      <tbody>
        ${breakdownRows.map(([label, key]) => `<tr>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:500;">${label}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;font-weight:600;color:#059669;">${for_score.breakdown[key]}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;font-weight:600;color:#dc2626;">${against_score.breakdown[key]}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <!-- Causal Analysis (Both Sides) -->
    ${sectionTitle('🔗', 'Causal Analysis — Both Sides')}
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        ${sidePill('FOR', '#059669')}
        ${card(causalSection(for_causal, '#059669'), 'border-left:3px solid #059669;')}
      </div>
      <div style="flex:1;">
        ${sidePill('AGAINST', '#dc2626')}
        ${card(causalSection(against_causal, '#dc2626'), 'border-left:3px solid #dc2626;')}
      </div>
    </div>

    <!-- Fallacies (Both Sides) -->
    ${sectionTitle('⚠️', 'Logical Fallacies — Both Sides')}
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        ${sidePill(`FOR (${for_fallacies.length})`, '#059669')}
        ${fallacyCards(for_fallacies)}
      </div>
      <div style="flex:1;">
        ${sidePill(`AGAINST (${against_fallacies.length})`, '#dc2626')}
        ${fallacyCards(against_fallacies)}
      </div>
    </div>

    <!-- Evidence Quality (Both Sides) -->
    ${sectionTitle('🔍', 'Evidence Quality — Both Sides')}
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        ${sidePill('FOR — ' + for_evidence.quality, '#059669')}
        ${card(`
          <p style="font-size:12px;color:#374151;margin-bottom:8px;">${esc(for_evidence.reason)}</p>
          <p style="font-size:11px;font-weight:700;color:#4338ca;margin-bottom:6px;">Detailed Scores</p>
          ${evidenceScoreRows(for_evidence.scores)}
        `)}
      </div>
      <div style="flex:1;">
        ${sidePill('AGAINST — ' + against_evidence.quality, '#dc2626')}
        ${card(`
          <p style="font-size:12px;color:#374151;margin-bottom:8px;">${esc(against_evidence.reason)}</p>
          <p style="font-size:11px;font-weight:700;color:#4338ca;margin-bottom:6px;">Detailed Scores</p>
          ${evidenceScoreRows(against_evidence.scores)}
        `)}
      </div>
    </div>

    <!-- Improvements -->
    ${explanation.improvements && explanation.improvements.length > 0 ? `
      ${sectionTitle('💡', 'Suggested Improvements')}
      ${card(improvementsList(explanation.improvements))}
    ` : ''}

    <!-- Pipeline Metadata -->
    ${pipeline_metadata ? `
      ${sectionTitle('⚡', 'Pipeline Performance')}
      <div style="display:flex;gap:12px;margin-bottom:10px;">
        <div style="flex:1;text-align:center;background:#f0f0ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px;">
          <p style="font-size:22px;font-weight:800;color:#4338ca;margin:0;">${pipeline_metadata.total_time_seconds || '—'}s</p>
          <p style="font-size:10px;color:#6b7280;margin:2px 0 0;">Total Time</p>
        </div>
        <div style="flex:1;text-align:center;background:#f0f0ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px;">
          <p style="font-size:22px;font-weight:800;color:#4338ca;margin:0;">${pipeline_metadata.provider_used || 'groq'}</p>
          <p style="font-size:10px;color:#6b7280;margin:2px 0 0;">Provider</p>
        </div>
        <div style="flex:1;text-align:center;background:#f0f0ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px;">
          <p style="font-size:22px;font-weight:800;color:#4338ca;margin:0;">8</p>
          <p style="font-size:10px;color:#6b7280;margin:2px 0 0;">Agents</p>
        </div>
      </div>
      ${pipeline_metadata.agent_timings ? `<table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:5px 8px;border:1px solid #e5e7eb;">Agent</th><th style="text-align:right;padding:5px 8px;border:1px solid #e5e7eb;">Time (s)</th></tr></thead>
        <tbody>${Object.entries(pipeline_metadata.agent_timings).map(([a, t]) => `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;">${esc(a)}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${t}s</td></tr>`).join('')}</tbody>
      </table>` : ''}
    ` : ''}

    <!-- Footer -->
    <div style="text-align:center;padding-top:18px;border-top:2px solid #e5e7eb;margin-top:24px;">
      <p style="margin:0;font-size:10px;color:#9ca3af;">Generated by <strong>DebateLens</strong> — Multi-Agent Analysis Platform</p>
      <p style="margin:3px 0 0;font-size:9px;color:#d1d5db;">${new Date().toLocaleString()}</p>
    </div>
  </div>`;
}
