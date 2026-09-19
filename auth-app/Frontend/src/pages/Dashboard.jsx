import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2,
  LogOut,
  Sparkles,
  Download,
  Terminal,
  FileSearch,
  GitCompare,
  Code,
  MessageSquareCode,
  AlertCircle,
  GraduationCap,
  Play,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';
import Loading from '../components/Loading';
import CodeEditor from '../components/CodeEditor';
import FileUploader from '../components/FileUploader';
import ReviewSummary from '../components/ReviewSummary';
import ReviewFilters from '../components/ReviewFilters';
import IssueCard from '../components/IssueCard';
import DiffViewer from '../components/DiffViewer';
import Copilot from '../components/Copilot';
import authApi from '../services/authApi';
import reviewApi from '../services/reviewApi';

const JAVA_SAMPLE_CODE = `// Sample Java Service with SQL injection and security vulnerabilities
import java.sql.Connection;
import java.sql.Statement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class UserAuthenticationService {
    // CRITICAL: Hardcoded administrative secret exposed in source
    private static final String ADMIN_TOKEN = "super_insecure_hardcoded_admin_jwt_secret_998877";

    public User authenticateUser(Connection connection, String username, String password) throws SQLException {
        // CRITICAL: SQL Injection vulnerability via unparameterized query concatenation
        String query = "SELECT id, username, email, role FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
        
        Statement stmt = connection.createStatement();
        ResultSet rs = stmt.executeQuery(query);

        if (rs.next()) {
            return new User(
                rs.getInt("id"),
                rs.getString("username"),
                rs.getString("email"),
                rs.getString("role")
            );
        }
        return null;
    }
}`;

const SUPPORTED_LANGUAGES = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

export default function Dashboard() {
  const navigate = useNavigate();

  // Authentication state
  const [isValidating, setIsValidating] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Editor and Input State
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('java');
  const [filename, setFilename] = useState('');
  const [juniorMode, setJuniorMode] = useState(false);
  const [targetLine, setTargetLine] = useState(null);

  // Review State
  const [isReviewing, setIsReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewError, setReviewError] = useState('');

  // Review Navigation & Filters
  const [activeTab, setActiveTab] = useState('issues'); // 'issues' | 'diff' | 'refactor' | 'copilot'
  const [activeSeverity, setActiveSeverity] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');

  // Refactored tab copy state
  const [copiedRefactor, setCopiedRefactor] = useState(false);

  // Verify auth on mount
  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      try {
        const res = await authApi.getMe();
        if (!isMounted) return;

        if (!res || !res.success) {
          navigate('/login', { replace: true });
        } else {
          setUserEmail(res.user?.email || '');
          setIsValidating(false);
        }
      } catch {
        if (isMounted) {
          navigate('/login', { replace: true });
        }
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/login', { replace: true });
    }
  };

  // File Upload Handlers
  const handleFileUpload = ({ code: uploadedCode, filename: uploadedName, inferredLanguage }) => {
    setCode(uploadedCode);
    setFilename(uploadedName);
    if (inferredLanguage) {
      setLanguage(inferredLanguage);
    }
    setReviewError('');
  };

  const handleClearFile = () => {
    setFilename('');
  };

  const handleClearCode = () => {
    setCode('');
    setFilename('');
    setReview(null);
    setReviewError('');
    setTargetLine(null);
  };

  const handleLoadSample = () => {
    setCode(JAVA_SAMPLE_CODE);
    setLanguage('java');
    setFilename('UserAuthenticationService.java');
    setReviewError('');
  };

  // Download code helper
  const handleDownload = (contentToDownload, defaultName = 'code.txt') => {
    if (!contentToDownload) return;
    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyRefactored = async () => {
    if (!review?.refactoredCode) return;
    try {
      await navigator.clipboard.writeText(review.refactoredCode);
      setCopiedRefactor(true);
      setTimeout(() => setCopiedRefactor(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Submit code for review
  const handleReviewCode = async () => {
    setReviewError('');
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setReviewError('Source code cannot be empty. Please paste code or upload a file.');
      return;
    }

    if (trimmedCode.length > 100000) {
      setReviewError('Source code exceeds the maximum 100,000 character limit.');
      return;
    }

    setIsReviewing(true);

    try {
      const response = await reviewApi.reviewCode({
        code: trimmedCode,
        language,
        juniorMode,
      });

      if (response && response.success && response.review) {
        setReview(response.review);
        setActiveTab('issues');
        setActiveSeverity('all');
        setActiveCategory('all');
      } else {
        setReviewError(response?.message || 'Failed to review code.');
      }
    } catch (err) {
      setReviewError(err.message || 'An error occurred during code analysis.');
    } finally {
      setIsReviewing(false);
    }
  };

  // Jump to line in Monaco editor
  const handleSelectLine = useCallback((line) => {
    if (line) {
      setTargetLine(line);
    }
  }, []);

  const handleOpenInCompiler = (codeToRun) => {
    const targetCode = codeToRun || review?.refactoredCode || code;
    if (!targetCode) return;
    navigate('/compiler', {
      state: {
        code: targetCode,
        language: language,
      },
    });
  };

  // Filter issues based on active severity and category
  const filteredIssues = (review?.issues || []).filter((issue) => {
    const matchesSeverity = activeSeverity === 'all' || issue.severity === activeSeverity;
    const matchesCategory = activeCategory === 'all' || issue.category === activeCategory;
    return matchesSeverity && matchesCategory;
  });

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code ? code.length : 0;

  if (isValidating) {
    return <Loading message="Loading AI Code Reviewer workspace..." />;
  }

  return (
    <div className="dashboard-layout">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo-box" aria-hidden="true">
            <Code2 size={18} />
          </div>
          <div className="header-titles">
            <div className="header-title-row">
              <h1 className="header-title">AI Code Reviewer</h1>
              <span className="header-tag">PRO</span>
            </div>
            <p className="header-subtitle">AI-powered code quality, security & refactoring</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Active Language Pill */}
          <div className="header-pill">
            <Code size={13} className="header-pill-icon" />
            <span>{language === 'auto' ? 'Auto Detect' : language}</span>
          </div>

          {/* Junior Mode Pill (Visible when active) */}
          {juniorMode && (
            <div className="header-pill header-pill-junior">
              <GraduationCap size={13} className="header-pill-icon" />
              <span>Junior Mode</span>
            </div>
          )}

          {/* User Email Pill */}
          {userEmail && (
            <div className="user-email-pill" title={userEmail}>
              <span className="user-status-dot" />
              <span className="user-email-text">{userEmail}</span>
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="btn-header-logout"
            disabled={isLoggingOut}
            title="Sign out"
          >
            <LogOut size={13} className="icon-mr" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: 2-Column Split (Left 55% / Right 45%) */}
      <main className="workspace-main">
        {/* Left Column: Code Workspace */}
        <section className="workspace-pane pane-editor">
          {/* Top Toolbar */}
          <div className="pane-header">
            <div className="pane-title-group">
              <Terminal size={15} className="pane-header-icon" />
              <h2 className="pane-title">Source Code</h2>
            </div>

            <div className="pane-header-actions">
              {/* Language Selector */}
              <select
                id="lang-select"
                className="toolbar-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isReviewing}
                aria-label="Programming Language"
              >
                {SUPPORTED_LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Upload File */}
              <FileUploader
                filename={filename}
                onFileSelect={handleFileUpload}
                onClearFile={handleClearFile}
                disabled={isReviewing}
              />

              {/* Load Sample Button */}
              <button
                type="button"
                onClick={handleLoadSample}
                className="btn-toolbar"
                title="Load sample vulnerable Java code"
                disabled={isReviewing}
              >
                <Sparkles size={13} className="icon-mr text-accent" />
                Sample
              </button>

              {/* Clear Editor */}
              {code && (
                <button
                  type="button"
                  onClick={handleClearCode}
                  className="btn-toolbar btn-toolbar-danger"
                  title="Clear source code"
                  disabled={isReviewing}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Monaco Code Editor Main Area */}
          <div className="editor-box">
            <CodeEditor
              code={code}
              language={language}
              onChange={setCode}
              onClear={handleClearCode}
              targetLine={targetLine}
            />
          </div>

          {/* Review Error Notice Banner */}
          {reviewError && (
            <div className="workspace-alert" role="alert">
              <AlertCircle size={15} className="alert-icon" />
              <div className="alert-content">
                <strong>Analysis Notice:</strong> {reviewError}
              </div>
            </div>
          )}

          {/* Action / Status Bottom Bar */}
          <div className="editor-bottom-bar">
            {/* Status Left */}
            <div className="editor-status-left">
              <span className="status-item-pill">
                <Code size={12} className="icon-mr" />
                {language}
              </span>
              <span className="status-item-text">{lineCount} lines</span>
              <span className="status-item-divider">•</span>
              <span className="status-item-text">{charCount.toLocaleString()} / 100,000 chars</span>
            </div>

            {/* Actions Right: Junior Mode Switch + Review Button */}
            <div className="editor-status-right">
              <label
                className="toggle-label"
                title="Explain findings like I'm a junior developer with intuitive guidance"
              >
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={juniorMode}
                  onChange={(e) => setJuniorMode(e.target.checked)}
                  disabled={isReviewing}
                />
                <span className="toggle-switch" />
                <GraduationCap size={14} className="toggle-icon" />
                <span className="toggle-text">Junior Mode</span>
              </label>

              <button
                type="button"
                onClick={handleReviewCode}
                className="btn-review-primary"
                disabled={isReviewing || !code.trim()}
              >
                {isReviewing ? (
                  <span className="btn-loading-content">
                    <span className="btn-spinner" aria-hidden="true" />
                    Analyzing...
                  </span>
                ) : (
                  <>
                    <Play size={13} className="icon-mr fill-current" />
                    Review Code
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: AI Review Panel */}
        <section className="workspace-pane pane-review">
          {/* Top Panel Header */}
          <div className="pane-header">
            <div className="pane-title-group">
              <Shield size={15} className="pane-header-icon" />
              <h2 className="pane-title">AI Review</h2>
            </div>

            <div className="pane-header-status">
              {isReviewing ? (
                <span className="status-badge status-badge-running">
                  <span className="status-dot-pulse" />
                  Analyzing codebase...
                </span>
              ) : review ? (
                <span className="status-badge status-badge-complete">
                  <span className="status-dot-complete" />
                  Analysis complete
                </span>
              ) : (
                <span className="status-badge status-badge-ready">
                  <span className="status-dot-ready" />
                  Ready to analyze
                </span>
              )}
            </div>
          </div>

          {/* State 1: Review in Progress */}
          {isReviewing ? (
            <div className="review-loading-view">
              <div className="loading-spinner-lg" aria-hidden="true" />
              <h3 className="loading-headline">Analyzing your code...</h3>
              <p className="loading-sub">Groq AI is conducting a comprehensive 4-dimensional audit:</p>

              <div className="loading-steps-list">
                <div className="loading-step-item">
                  <CheckCircle2 size={15} className="text-accent icon-mr" />
                  <span>Scanning for bugs, syntax errors, and edge cases</span>
                </div>
                <div className="loading-step-item">
                  <CheckCircle2 size={15} className="text-accent icon-mr" />
                  <span>Auditing OWASP Top 10 vulnerabilities & injection risks</span>
                </div>
                <div className="loading-step-item">
                  <CheckCircle2 size={15} className="text-accent icon-mr" />
                  <span>Evaluating Big-O time and space complexity bottlenecks</span>
                </div>
                <div className="loading-step-item">
                  <CheckCircle2 size={15} className="text-accent icon-mr" />
                  <span>Generating clean, production-ready refactored code</span>
                </div>
              </div>
            </div>
          ) : review ? (
            /* State 2: Review Results Available */
            <div className="review-results-view">
              {/* Review Tabs Bar */}
              <div className="review-tabs-bar">
                <button
                  type="button"
                  onClick={() => setActiveTab('issues')}
                  className={`review-tab-btn ${activeTab === 'issues' ? 'tab-btn-active' : ''}`}
                >
                  <FileSearch size={14} className="icon-mr" />
                  Issues
                  <span className="tab-count-pill">{review.summary?.total ?? 0}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('diff')}
                  className={`review-tab-btn ${activeTab === 'diff' ? 'tab-btn-active' : ''}`}
                >
                  <GitCompare size={14} className="icon-mr" />
                  Diff
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('refactor')}
                  className={`review-tab-btn ${activeTab === 'refactor' ? 'tab-btn-active' : ''}`}
                >
                  <Code size={14} className="icon-mr" />
                  Refactored
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('copilot')}
                  className={`review-tab-btn ${activeTab === 'copilot' ? 'tab-btn-active' : ''}`}
                >
                  <MessageSquareCode size={14} className="icon-mr" />
                  Copilot
                </button>
              </div>

              {/* Tab 1: Issues & Audit */}
              {activeTab === 'issues' && (
                <div className="tab-content-panel">
                  {/* Compact Review Summary */}
                  <ReviewSummary
                    summary={review.summary}
                    overallExplanation={review.overallExplanation}
                  />

                  {/* Compact Filter Controls */}
                  <ReviewFilters
                    activeSeverity={activeSeverity}
                    onSeverityChange={setActiveSeverity}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    counts={review.summary}
                  />

                  {/* Scannable Issue Cards */}
                  <div className="issues-list">
                    {filteredIssues.length > 0 ? (
                      filteredIssues.map((issue) => (
                        <IssueCard
                          key={issue.id}
                          issue={issue}
                          onSelectLine={handleSelectLine}
                        />
                      ))
                    ) : (
                      <div className="empty-filter-box">
                        <p>No findings match the selected severity and category filters.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSeverity('all');
                            setActiveCategory('all');
                          }}
                          className="btn-toolbar"
                        >
                          Reset Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Side-by-Side Diff */}
              {activeTab === 'diff' && (
                <div className="tab-content-panel diff-tab-panel">
                  <DiffViewer
                    originalCode={code}
                    refactoredCode={review.refactoredCode}
                    language={language}
                  />
                </div>
              )}

              {/* Tab 3: Refactored Code */}
              {activeTab === 'refactor' && (
                <div className="tab-content-panel refactor-tab-panel">
                  <div className="refactor-toolbar">
                    <span className="refactor-note">
                      Production-ready drop-in replacement resolving identified security and performance issues.
                    </span>

                    <div className="refactor-actions">
                      <button
                        type="button"
                        onClick={() => handleOpenInCompiler(review.refactoredCode)}
                        className="btn-toolbar"
                        title="Open and run this refactored code in the Compiler"
                        style={{ background: 'var(--dev-accent)', color: '#ffffff', borderColor: 'var(--dev-accent)' }}
                      >
                        <Play size={13} className="icon-mr fill-current" />
                        Open & Run in Compiler
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyRefactored}
                        className="btn-toolbar"
                        title="Copy refactored code"
                      >
                        {copiedRefactor ? (
                          <Check size={13} className="text-success icon-mr" />
                        ) : (
                          <Copy size={13} className="icon-mr" />
                        )}
                        {copiedRefactor ? 'Copied' : 'Copy'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            review.refactoredCode,
                            filename ? `refactored_${filename}` : 'refactored_code.txt'
                          )
                        }
                        className="btn-toolbar"
                        title="Download refactored code"
                      >
                        <Download size={13} className="icon-mr" />
                        Download
                      </button>
                    </div>
                  </div>

                  <div className="refactor-editor-wrapper">
                    <CodeEditor
                      code={review.refactoredCode || '// No refactored code generated'}
                      language={language}
                      readOnly
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Code Copilot */}
              {activeTab === 'copilot' && (
                <div className="tab-content-panel copilot-tab-panel">
                  <Copilot
                    code={code}
                    language={language}
                    review={review}
                    refactoredCode={review.refactoredCode}
                  />
                </div>
              )}
            </div>
          ) : (
            /* State 3: Empty State Before Review */
            <div className="review-empty-state">
              <div className="empty-state-badge" aria-hidden="true">
                <Sparkles size={24} />
              </div>

              <h3 className="empty-state-title">AI Code Review</h3>
              <p className="empty-state-text">
                Paste your code or upload a file to get started.
              </p>

              <div className="empty-features-grid">
                <div className="empty-feature-card">
                  <div className="empty-feature-icon">
                    <Layers size={15} />
                  </div>
                  <div className="empty-feature-content">
                    <h4>Bug detection</h4>
                    <p>Syntax errors, logic flaws & edge cases</p>
                  </div>
                </div>

                <div className="empty-feature-card">
                  <div className="empty-feature-icon">
                    <Shield size={15} />
                  </div>
                  <div className="empty-feature-content">
                    <h4>Security analysis</h4>
                    <p>OWASP Top 10, SQL injection & secrets</p>
                  </div>
                </div>

                <div className="empty-feature-card">
                  <div className="empty-feature-icon">
                    <Zap size={15} />
                  </div>
                  <div className="empty-feature-content">
                    <h4>Performance</h4>
                    <p>Big-O complexity & bottleneck analysis</p>
                  </div>
                </div>

                <div className="empty-feature-card">
                  <div className="empty-feature-icon">
                    <GitCompare size={15} />
                  </div>
                  <div className="empty-feature-content">
                    <h4>Refactoring</h4>
                    <p>Idiomatic code & side-by-side git diff</p>
                  </div>
                </div>
              </div>

              <div className="empty-state-action">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="btn-review-secondary"
                >
                  <Sparkles size={14} className="icon-mr text-accent" />
                  Try with Sample Vulnerable Code
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
