import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Trash2, Check } from 'lucide-react';

/**
 * Normalizes language names for Monaco editor
 */
function getMonacoLanguage(lang) {
  const map = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    csharp: 'csharp',
    'c#': 'csharp',
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

export default function CodeEditor({
  code,
  language,
  onChange,
  onClear,
  targetLine = null,
  readOnly = false,
  height = '100%',
}) {
  const editorRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  // Scroll to and highlight line if requested
  useEffect(() => {
    if (editorRef.current && targetLine && typeof targetLine === 'number' && targetLine > 0) {
      editorRef.current.revealLineInCenter(targetLine);
      editorRef.current.setPosition({ lineNumber: targetLine, column: 1 });
      editorRef.current.focus();
    }
  }, [targetLine]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code ? code.length : 0;
  const monacoLang = getMonacoLanguage(language);

  return (
    <div className="monaco-wrapper">
      <div className="editor-top-toolbar">
        <div className="editor-meta">
          <span className="lang-tag">{language === 'auto' ? 'Auto-Detect' : language}</span>
          <span className="editor-stat-pill">{lineCount} lines</span>
          <span className="editor-stat-pill">{charCount.toLocaleString()} chars</span>
        </div>

        <div className="editor-btn-group">
          <button
            type="button"
            onClick={handleCopy}
            className="editor-tool-btn"
            disabled={!code}
            title="Copy code to clipboard"
          >
            {copied ? <Check size={13} className="text-success icon-mr" /> : <Copy size={13} className="icon-mr" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {!readOnly && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="editor-tool-btn editor-tool-btn-danger"
              disabled={!code}
              title="Clear editor contents"
            >
              <Trash2 size={13} className="icon-mr" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="monaco-inner-container">
        <Editor
          height={height}
          language={monacoLang}
          value={code}
          theme="vs-dark"
          onChange={(val) => onChange?.(val || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: 2,
            wordWrap: 'on',
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>
    </div>
  );
}
