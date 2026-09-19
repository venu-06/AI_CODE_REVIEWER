export default function Sidebar({
  language,
  onLanguageChange,
  onResetCode,
  onClearConsole,
  loading,
  languageOptions,
}) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">C</div>
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Compiler</h1>
        </div>
      </div>

      <div className="nav-group">
        <p className="section-label">Languages</p>
        <div className="language-pills">
          {languageOptions.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`language-pill ${language === value ? "active" : ""}`}
              onClick={() => onLanguageChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="nav-group">
        <p className="section-label">Actions</p>
        <button type="button" className="secondary-button" onClick={onResetCode}>
          Reset code
        </button>
        <button type="button" className="secondary-button" onClick={onClearConsole}>
          Clear output
        </button>
      </div>

      <div className="nav-group meta-card">
        <p className="section-label">Status</p>
        <div className="status-row">
          <span className="status-dot" />
          <span>{loading ? "Running" : "Ready"}</span>
        </div>
      </div>
    </aside>
  );
}
