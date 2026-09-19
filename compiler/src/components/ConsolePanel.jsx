export default function ConsolePanel({ stdin, output, error, onStdinChange }) {
  return (
    <aside className="console-panel">
      <div className="console-card stdin-card">
        <div className="panel-header">
          <span>STDIN</span>
        </div>
        <textarea
          value={stdin}
          onChange={(event) => onStdinChange(event.target.value)}
          placeholder="Enter input here..."
          spellCheck="false"
        />
      </div>

      <div className={`console-card output-card ${error ? "warning" : ""}`}>
        <div className="panel-header">
          <span>STDOUT</span>
        </div>
        <pre>{output || "Program output will appear here..."}</pre>
      </div>

      <div className={`console-card error-card ${error ? "has-error" : ""}`}>
        <div className="panel-header">
          <span>Errors</span>
        </div>
        <pre>{error || "No errors detected."}</pre>
      </div>
    </aside>
  );
}
