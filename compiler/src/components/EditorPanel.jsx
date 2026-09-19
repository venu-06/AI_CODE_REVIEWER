import Editor from "@monaco-editor/react";

export default function EditorPanel({ language, code, onCodeChange }) {
  return (
    <section className="editor-panel">
      <div className="panel-header">
        <span>Editor</span>
        <span className="status-pill">{language.toUpperCase()}</span>
      </div>

      <div className="editor-stage">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => onCodeChange(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            padding: { top: 14, bottom: 14 },
            wordWrap: "on",
          }}
        />
      </div>
    </section>
  );
}
