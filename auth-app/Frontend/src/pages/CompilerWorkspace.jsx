import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Play,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Download,
  Terminal,
  Code,
  AlertTriangle,
  Cpu,
  Clock,
  Sparkles,
  Zap,
  GripVertical,
  CheckCircle2,
} from 'lucide-react';
import CodeEditor from '../components/CodeEditor';
import compilerApi from '../services/compilerApi';

const DEFAULT_TEMPLATES = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n\n    cout << "Sum = " << a + b << endl;\n\n    return 0;\n}`,
  java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n\n        System.out.println("Sum = " + (a + b));\n    }\n}`,
  python: `a = int(input())\nb = int(input())\n\nprint("Sum =", a + b)`,
};

const LANGUAGE_OPTIONS = [
  { label: 'C++', value: 'cpp', filename: 'main.cpp' },
  { label: 'Java', value: 'java', filename: 'Main.java' },
  { label: 'Python', value: 'python', filename: 'main.py' },
];

function normalizeLanguageKey(lang) {
  const map = {
    'c++': 'cpp',
    cpp: 'cpp',
    java: 'java',
    python: 'python',
    python3: 'python',
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    c: 'c',
    'c#': 'csharp',
    csharp: 'csharp',
    go: 'go',
    rust: 'rust',
    php: 'php',
    ruby: 'ruby',
  };
  const key = String(lang || '').toLowerCase().trim();
  return map[key] || 'cpp';
}

export default function CompilerWorkspace() {
  const location = useLocation();

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(DEFAULT_TEMPLATES.cpp);
  const [stdin, setStdin] = useState('10\n20');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [executionTime, setExecutionTime] = useState(null);
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadedFromReviewNotice, setLoadedFromReviewNotice] = useState(false);

  // Column Resizing State (Editor vs Console)
  const [editorWidthPercent, setEditorWidthPercent] = useState(60);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // Drag Resizer Handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth >= 20 && newWidth <= 80) {
        setEditorWidthPercent(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Sync refactored code if navigated from AI Review
  useEffect(() => {
    if (location.state && location.state.code) {
      setCode(location.state.code);
      if (location.state.language) {
        setLanguage(normalizeLanguageKey(location.state.language));
      }
      setOutput('');
      setError('');
      setExecutionTime(null);
      setMemory(null);
      setLoadedFromReviewNotice(true);
      setTimeout(() => setLoadedFromReviewNotice(false), 6000);
    }
  }, [location.state]);

  // Switch language and update starter code template
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setCode(DEFAULT_TEMPLATES[newLanguage] || '');
    setOutput('');
    setError('');
    setExecutionTime(null);
    setMemory(null);
  };

  // Dry-Run Syntax Pre-Check Handler
  const handleDryRunCheck = async () => {
    if (!code.trim()) {
      setError('Please enter code before running dry check.');
      return;
    }

    setLoading(true);
    setOutput('');
    setError('');

    try {
      const res = await compilerApi.compileCode({
        language,
        code,
        stdin,
        dryRun: true,
      });

      if (res) {
        setOutput(res.stdout || (res.valid ? 'Syntax Dry-Run passed successfully! Code structure and brackets are valid.' : ''));
        setError(res.stderr || '');
      }
    } catch (err) {
      setError(err.message || 'Syntax dry run check failed.');
    } finally {
      setLoading(false);
    }
  };

  // Run/compile code via backend API
  const handleRunCode = async () => {
    if (!code.trim()) {
      setError('Please enter code before running.');
      return;
    }

    setLoading(true);
    setOutput('');
    setError('');
    setExecutionTime(null);
    setMemory(null);

    try {
      const res = await compilerApi.compileCode({
        language,
        code,
        stdin,
      });

      if (res) {
        setOutput(res.stdout || '');
        setError(res.stderr || '');
        setExecutionTime(res.executionTime ?? null);
        setMemory(res.memory ?? null);

        if (!res.stdout && !res.stderr && res.success) {
          setOutput('Program completed successfully with no output.');
        }
      }
    } catch (err) {
      console.error('Compilation error:', err);
      setError(
        err.message || 'Could not connect to compiler backend service. Please check your network or server logs.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetCode = () => {
    setCode(DEFAULT_TEMPLATES[language] || '');
    setOutput('');
    setError('');
    setExecutionTime(null);
    setMemory(null);
  };

  const handleClearOutput = () => {
    setOutput('');
    setError('');
    setExecutionTime(null);
    setMemory(null);
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadCode = () => {
    if (!code) return;
    const currentLang = LANGUAGE_OPTIONS.find((l) => l.value === language);
    const fname = currentLang ? currentLang.filename : 'code.txt';

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentLangObj = LANGUAGE_OPTIONS.find((l) => l.value === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className="compiler-workspace-container">
      {loadedFromReviewNotice && (
        <div className="alert alert-success" style={{ margin: '8px 12px' }} role="alert">
          <Sparkles size={16} className="alert-icon text-accent" />
          <span>Refactored code loaded into compiler! Click <strong>Run Code</strong> to execute.</span>
        </div>
      )}

      {/* Main Workspace: Resizable 2-Column Split (Left Code / Right Console) */}
      <main
        className="workspace-main workspace-resizable"
        ref={containerRef}
        style={{ userSelect: isResizing ? 'none' : 'auto' }}
      >
        {/* Left Column: Code Editor */}
        <section
          className="workspace-pane pane-editor"
          style={{ width: `${editorWidthPercent}%`, flexShrink: 0 }}
        >
          {/* Top Toolbar */}
          <div className="pane-header">
            <div className="pane-title-group">
              <Terminal size={15} className="pane-header-icon text-accent" />
              <h2 className="pane-title">{currentLangObj.filename}</h2>
            </div>

            <div className="pane-header-actions">
              {/* Language Selector */}
              <select
                className="toolbar-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={loading}
                aria-label="Programming Language"
              >
                {LANGUAGE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Reset Code Button */}
              <button
                type="button"
                onClick={handleResetCode}
                className="btn-toolbar"
                title="Reset code to default template"
                disabled={loading}
              >
                <RotateCcw size={13} className="icon-mr" />
                Reset
              </button>

              {/* Copy Code */}
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn-toolbar"
                title="Copy code to clipboard"
                disabled={!code}
              >
                {copied ? <Check size={13} className="text-success icon-mr" /> : <Copy size={13} className="icon-mr" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              {/* Download Code */}
              <button
                type="button"
                onClick={handleDownloadCode}
                className="btn-toolbar"
                title="Download code file"
                disabled={!code}
              >
                <Download size={13} className="icon-mr" />
                Download
              </button>
            </div>
          </div>

          {/* Code Editor Main Box */}
          <div className="editor-box">
            <CodeEditor
              code={code}
              language={language}
              onChange={setCode}
              onClear={handleResetCode}
            />
          </div>

          {/* Action / Status Bottom Bar */}
          <div className="editor-bottom-bar">
            <div className="editor-status-left">
              <span className="status-item-pill">
                <Code size={12} className="icon-mr" />
                {language.toUpperCase()}
              </span>
              <span className="status-item-text">
                {code ? code.split('\n').length : 0} lines
              </span>
              <span className="status-item-divider">•</span>
              <span className="status-item-text">
                {code ? code.length.toLocaleString() : 0} chars
              </span>
            </div>

            <div className="editor-status-right" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleDryRunCheck}
                className="btn-toolbar-chip"
                title="Pre-flight syntax & bracket balance check"
                disabled={loading || !code.trim()}
              >
                <CheckCircle2 size={13} className="icon-mr text-accent" />
                Syntax Dry-Run
              </button>

              <button
                type="button"
                onClick={handleRunCode}
                className="btn-review-primary"
                disabled={loading || !code.trim()}
              >
                {loading ? (
                  <span className="btn-loading-content">
                    <span className="btn-spinner" aria-hidden="true" />
                    Running...
                  </span>
                ) : (
                  <>
                    <Play size={13} className="icon-mr fill-current" />
                    Run Code
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Vertical Resizer Handle */}
        <div
          className={`col-resizer-handle ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleMouseDown}
          title="Drag left or right to resize editor and console"
        >
          <GripVertical size={14} />
        </div>

        {/* Right Column: Console & Execution Panels */}
        <section className="workspace-pane pane-review" style={{ flex: 1, minWidth: 0 }}>
          {/* Top Panel Header */}
          <div className="pane-header">
            <div className="pane-title-group">
              <Zap size={15} className="pane-header-icon text-accent" />
              <h2 className="pane-title">Console Output</h2>
            </div>

            <div className="pane-header-actions">
              {(output || error) && (
                <button
                  type="button"
                  onClick={handleClearOutput}
                  className="btn-toolbar btn-toolbar-danger"
                  title="Clear console output"
                >
                  <Trash2 size={13} className="icon-mr" />
                  Clear Output
                </button>
              )}
            </div>
          </div>

          {/* Console Content Stack */}
          <div className="compiler-console-panel">
            {/* STDIN Card */}
            <div className="console-card-box">
              <div className="console-card-header">
                <span>STDIN (Input)</span>
              </div>
              <textarea
                className="console-stdin-input"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter standard input here..."
                rows={4}
                spellCheck="false"
              />
            </div>

            {/* STDOUT Card */}
            <div className="console-card-box">
              <div className="console-card-header">
                <span style={{ color: '#86efac' }}>STDOUT (Output)</span>
                {executionTime !== null && (
                  <span style={{ color: 'var(--dev-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {executionTime} ms
                  </span>
                )}
              </div>
              <pre className={`console-pre-block ${!output && !loading ? 'console-pre-empty' : ''}`}>
                {output || (loading ? 'Running code...' : 'Program output will appear here...')}
              </pre>
            </div>

            {/* Error Display Panel */}
            <div className={`console-card-box ${error ? 'console-card-error' : ''}`}>
              <div className="console-card-header">
                <span style={{ color: error ? '#f87171' : 'var(--dev-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {error && <AlertTriangle size={13} />} Errors / Standard Error
                </span>
              </div>
              <pre className={`console-pre-block ${error ? 'console-pre-error' : 'console-pre-empty'}`}>
                {error || 'No errors detected.'}
              </pre>
            </div>

            {/* Performance Metrics */}
            {(executionTime !== null || memory !== null) && (
              <div className="compiler-metrics-row">
                {executionTime !== null && (
                  <div className="compiler-metric-card">
                    <Clock size={16} className="text-accent" />
                    <div>
                      <div className="metric-title">Execution Time</div>
                      <div className="metric-val">{executionTime} ms</div>
                    </div>
                  </div>
                )}
                {memory !== null && (
                  <div className="compiler-metric-card">
                    <Cpu size={16} className="text-accent" />
                    <div>
                      <div className="metric-title">Memory Used</div>
                      <div className="metric-val">{(memory / 1024).toFixed(2)} KB</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
