import { DiffEditor } from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

function getMonacoLanguage(lang) {
  const map = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    csharp: 'csharp',
    go: 'go',
    rust: 'rust',
    php: 'php',
    ruby: 'ruby',
    swift: 'swift',
    kotlin: 'kotlin',
    sql: 'sql',
    html: 'html',
    css: 'css',
  };
  const key = String(lang || '').toLowerCase().trim();
  return map[key] || 'javascript';
}

export default function DiffViewer({
  originalCode,
  refactoredCode,
  language,
  height = '100%',
}) {
  const navigate = useNavigate();
  const monacoLang = getMonacoLanguage(language);

  const handleOpenInCompiler = () => {
    if (!refactoredCode) return;
    navigate('/compiler', {
      state: {
        code: refactoredCode,
        language,
      },
    });
  };

  return (
    <div className="diff-viewer-wrapper">
      <div className="diff-header-bar">
        <div className="diff-header-info">
          <h4 className="diff-title">Suggested Refactor</h4>
          <span className="diff-subtitle">
            Side-by-side comparison between your original code and the AI refactored version
          </span>
        </div>

        <div className="diff-legend" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {refactoredCode && (
            <button
              type="button"
              onClick={handleOpenInCompiler}
              className="btn-toolbar"
              style={{ background: 'var(--dev-accent)', color: '#ffffff', borderColor: 'var(--dev-accent)', padding: '4px 10px', fontSize: '12px' }}
              title="Open and run this refactored code in the Compiler"
            >
              <Play size={12} className="icon-mr fill-current" />
              Open in Compiler
            </button>
          )}

          <span className="legend-item legend-removed">
            <span className="legend-dot dot-removed" /> - Original
          </span>
          <span className="legend-item legend-added">
            <span className="legend-dot dot-added" /> + Refactored
          </span>
        </div>
      </div>

      <div className="diff-inner-container">
        <DiffEditor
          height={height}
          language={monacoLang}
          original={originalCode || '// No original code provided'}
          modified={refactoredCode || '// No refactored code generated'}
          theme="vs-dark"
          options={{
            readOnly: true,
            renderSideBySide: true,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            diffWordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
