import { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  Bug,
  Shield,
  Zap,
  Sparkles,
  Wrench,
  Navigation,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const CATEGORY_CONFIG = {
  bug: { label: 'Bug', icon: Bug, colorClass: 'badge-bug' },
  security: { label: 'Security', icon: Shield, colorClass: 'badge-security' },
  performance: { label: 'Performance', icon: Zap, colorClass: 'badge-performance' },
  code_smell: { label: 'Code Smell', icon: Sparkles, colorClass: 'badge-smell' },
  maintainability: { label: 'Maintainability', icon: Wrench, colorClass: 'badge-maint' },
};

const SEVERITY_CONFIG = {
  critical: { label: 'CRITICAL', icon: ShieldAlert, colorClass: 'badge-critical' },
  warning: { label: 'WARNING', icon: AlertTriangle, colorClass: 'badge-warning' },
  suggestion: { label: 'SUGGESTION', icon: Lightbulb, colorClass: 'badge-suggestion' },
};

export default function IssueCard({ issue, onSelectLine }) {
  const [expanded, setExpanded] = useState(false);

  const {
    severity = 'warning',
    category = 'bug',
    title,
    line,
    description,
    whyItMatters,
    suggestedFix,
    timeComplexity,
    spaceComplexity,
  } = issue;

  const sev = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.warning;
  const cat = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.bug;

  const SevIcon = sev.icon;
  const CatIcon = cat.icon;

  return (
    <div className={`issue-card issue-card-${severity} ${expanded ? 'issue-card-expanded' : ''}`}>
      {/* Clickable Header for Fast Toggling */}
      <div className="issue-card-header" onClick={() => setExpanded((prev) => !prev)}>
        <div className="issue-header-top">
          <div className="issue-badges-row">
            <span className={`badge ${sev.colorClass}`}>
              <SevIcon size={12} className="icon-mr" />
              {sev.label}
            </span>

            <span className={`badge ${cat.colorClass}`}>
              <CatIcon size={12} className="icon-mr" />
              {cat.label}
            </span>

            {line !== null && line !== undefined && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLine?.(line);
                }}
                className="line-tag-btn"
                title={`Jump to line ${line} in editor`}
              >
                <Navigation size={11} className="icon-mr" />
                Line {line}
              </button>
            )}
          </div>

          <button
            type="button"
            className="issue-toggle-btn"
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>

        <h3 className="issue-title">{title}</h3>

        {/* Compact summary line when collapsed */}
        {!expanded && (
          <p className="issue-preview-text">
            {description.length > 120 ? `${description.slice(0, 120)}...` : description}
          </p>
        )}
      </div>

      {/* Expanded Details Body */}
      {expanded && (
        <div className="issue-card-body">
          <div className="issue-section">
            <span className="issue-field-label">Description</span>
            <p className="issue-field-text">{description}</p>
          </div>

          {whyItMatters && (
            <div className="issue-section">
              <span className="issue-field-label">Why It Matters</span>
              <p className="issue-field-text issue-impact-text">{whyItMatters}</p>
            </div>
          )}

          {suggestedFix && (
            <div className="issue-section fix-section">
              <span className="issue-field-label text-success">Suggested Fix</span>
              <p className="issue-field-text fix-code-text">{suggestedFix}</p>
            </div>
          )}

          {(timeComplexity || spaceComplexity) && (
            <div className="complexity-row">
              {timeComplexity && (
                <div className="complexity-badge">
                  <span className="complexity-label">Time:</span>
                  <code className="complexity-val">{timeComplexity}</code>
                </div>
              )}
              {spaceComplexity && (
                <div className="complexity-badge">
                  <span className="complexity-label">Space:</span>
                  <code className="complexity-val">{spaceComplexity}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
