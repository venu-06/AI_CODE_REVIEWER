import { ShieldAlert, AlertTriangle, Lightbulb, CheckCircle, Activity } from 'lucide-react';

export default function ReviewSummary({ summary, overallExplanation }) {
  const { total = 0, critical = 0, warning = 0, suggestion = 0 } = summary || {};

  const healthScore = summary?.codeHealthScore ?? Math.max(0, Math.min(100, 100 - (critical * 25 + warning * 10 + suggestion * 3)));

  let scoreColorClass = 'text-success';
  let scoreBadgeClass = 'badge-success';
  if (healthScore < 50) {
    scoreColorClass = 'text-critical';
    scoreBadgeClass = 'badge-critical';
  } else if (healthScore < 80) {
    scoreColorClass = 'text-warning';
    scoreBadgeClass = 'badge-warning';
  }

  return (
    <div className="review-summary-container">
      <div className="summary-cards-grid">
        {/* Code Health Score Card */}
        <div className="summary-stat-card stat-score" style={{ borderLeft: '4px solid currentColor' }}>
          <div className="stat-content">
            <span className="stat-label">Code Health Score</span>
            <span className={`stat-value ${scoreColorClass}`} style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {healthScore}%
            </span>
          </div>
          <div className="stat-icon-box">
            <Activity size={20} className={scoreColorClass} />
          </div>
        </div>

        <div className="summary-stat-card stat-total">
          <div className="stat-content">
            <span className="stat-label">Total Issues</span>
            <span className="stat-value">{total}</span>
          </div>
          <div className="stat-icon-box">
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="summary-stat-card stat-critical">
          <div className="stat-content">
            <span className="stat-label">Critical</span>
            <span className="stat-value">{critical}</span>
          </div>
          <div className="stat-icon-box">
            <ShieldAlert size={18} />
          </div>
        </div>

        <div className="summary-stat-card stat-warning">
          <div className="stat-content">
            <span className="stat-label">Warnings</span>
            <span className="stat-value">{warning}</span>
          </div>
          <div className="stat-icon-box">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="summary-stat-card stat-suggestion">
          <div className="stat-content">
            <span className="stat-label">Suggestions</span>
            <span className="stat-value">{suggestion}</span>
          </div>
          <div className="stat-icon-box">
            <Lightbulb size={18} />
          </div>
        </div>
      </div>

      {overallExplanation && (
        <div className="overall-explanation-box">
          <div className="overall-header">
            <h4 className="overall-title">Overall Review Summary</h4>
            <span className={`overall-badge ${scoreBadgeClass}`}>Health: {healthScore}/100</span>
          </div>
          <p className="overall-text">{overallExplanation}</p>
        </div>
      )}
    </div>
  );
}
