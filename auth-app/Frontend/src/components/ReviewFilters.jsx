export default function ReviewFilters({
  activeSeverity,
  onSeverityChange,
  activeCategory,
  onCategoryChange,
  counts = {},
}) {
  const severities = [
    { key: 'all', label: 'All', count: counts.total ?? 0 },
    { key: 'critical', label: 'Critical', count: counts.critical ?? 0 },
    { key: 'warning', label: 'Warnings', count: counts.warning ?? 0 },
    { key: 'suggestion', label: 'Suggestions', count: counts.suggestion ?? 0 },
  ];

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'bug', label: 'Bug' },
    { key: 'security', label: 'Security' },
    { key: 'performance', label: 'Performance' },
    { key: 'code_smell', label: 'Code Smell' },
    { key: 'maintainability', label: 'Maintainability' },
  ];

  return (
    <div className="filters-container">
      <div className="filter-group">
        <span className="filter-label">Severity</span>
        <div className="filter-pills">
          {severities.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSeverityChange(key)}
              className={`filter-pill ${activeSeverity === key ? 'filter-pill-active' : ''} filter-pill-${key}`}
            >
              <span>{label}</span>
              <span className="filter-count-badge">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Category</span>
        <div className="filter-pills">
          {categories.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(key)}
              className={`filter-pill ${activeCategory === key ? 'filter-pill-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
