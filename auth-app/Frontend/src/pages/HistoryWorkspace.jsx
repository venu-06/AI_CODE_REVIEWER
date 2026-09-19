import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Trash2,
  Save,
  Check,
  Play,
  Sparkles,
  Download,
  Copy,
  Terminal,
  Shield,
  FileSearch,
  GitCompare,
  Code,
  MessageSquareCode,
  GraduationCap,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileCode2,
  ArrowLeft,
  ChevronDown,
  Upload,
  GripHorizontal,
  X,
} from 'lucide-react';
import CodeEditor from '../components/CodeEditor';
import FileUploader from '../components/FileUploader';
import ReviewSummary from '../components/ReviewSummary';
import ReviewFilters from '../components/ReviewFilters';
import IssueCard from '../components/IssueCard';
import DiffViewer from '../components/DiffViewer';
import Copilot from '../components/Copilot';
import reviewPersistenceApi from '../services/reviewPersistenceApi';

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

function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

/**
 * Group reviews by relative date for ChatGPT-style sidebar
 */
function groupReviewsByDate(reviewsList) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterday = today - oneDayMs;
  const sevenDaysAgo = today - 6 * oneDayMs;

  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  reviewsList.forEach((review) => {
    const d = new Date(review.updatedAt || review.createdAt || Date.now());
    const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    if (itemDay >= today) {
      groups.today.push(review);
    } else if (itemDay >= yesterday) {
      groups.yesterday.push(review);
    } else if (itemDay >= sevenDaysAgo) {
      groups.previous7Days.push(review);
    } else {
      groups.older.push(review);
    }
  });

  return [
    { id: 'today', title: 'TODAY', items: groups.today },
    { id: 'yesterday', title: 'YESTERDAY', items: groups.yesterday },
    { id: 'previous7Days', title: 'PREVIOUS 7 DAYS', items: groups.previous7Days },
    { id: 'older', title: 'OLDER', items: groups.older },
  ].filter((group) => group.items.length > 0);
}

export default function HistoryWorkspace() {
  const { reviewId } = useParams();
  const navigate = useNavigate();

  // Column 1: Review List State
  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);

  // Column 2: Active Review State
  const [activeReviewId, setActiveReviewId] = useState(reviewId || null);
  const [activeReview, setActiveReview] = useState(null);
  const [loadingActive, setLoadingActive] = useState(false);

  // Editable Editor State (Loaded from MongoDB activeReview)
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('untitled.js');
  const [language, setLanguage] = useState('javascript');
  const [juniorMode, setJuniorMode] = useState(false);
  const [targetLine, setTargetLine] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Save Status State
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const debounceTimerRef = useRef(null);

  // Review Execution State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Column 3: Tab State & Filters
  const [activeTab, setActiveTab] = useState('issues');
  const [activeSeverity, setActiveSeverity] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedRefactor, setCopiedRefactor] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Editor / AI Review Vertical Resizer State
  const [editorHeightPercent, setEditorHeightPercent] = useState(() => {
    const saved = localStorage.getItem('editorHeightPercent');
    return saved ? Math.max(10, Math.min(85, Number(saved))) : 50;
  });
  const [isRowResizing, setIsRowResizing] = useState(false);
  const mainWorkspaceRef = useRef(null);

  // Floating Copilot Resizer State (Width & Height)
  const [copilotDimensions, setCopilotDimensions] = useState(() => {
    const savedW = localStorage.getItem('copilotWidth');
    const savedH = localStorage.getItem('copilotHeight');
    return {
      width: savedW ? Math.max(300, Math.min(700, Number(savedW))) : 380,
      height: savedH ? Math.max(300, Math.min(800, Number(savedH))) : 520,
    };
  });
  const [copilotResizing, setCopilotResizing] = useState(null); // null | 'top' | 'left' | 'top-left'

  // Row Resizer Handler (Editor vs AI Review)
  const handleRowMouseDown = (e) => {
    e.preventDefault();
    setIsRowResizing(true);
  };

  useEffect(() => {
    if (!isRowResizing) return;

    const handleMouseMove = (e) => {
      if (!mainWorkspaceRef.current) return;
      const rect = mainWorkspaceRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const newPercent = (relativeY / rect.height) * 100;
      // Enforce limits: Editor between 10% and 85% (AI Review between 15% and 90%)
      const clampedPercent = Math.max(10, Math.min(85, newPercent));
      setEditorHeightPercent(clampedPercent);
    };

    const handleMouseUp = () => {
      setIsRowResizing(false);
      localStorage.setItem('editorHeightPercent', editorHeightPercent);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isRowResizing, editorHeightPercent]);

  // Copilot Resizer Handler
  const handleCopilotResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setCopilotResizing({
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startW: copilotDimensions.width,
      startH: copilotDimensions.height,
    });
  };

  useEffect(() => {
    if (!copilotResizing) return;

    const handleMouseMove = (e) => {
      const { direction, startX, startY, startW, startH } = copilotResizing;
      let newW = startW;
      let newH = startH;

      if (direction === 'left' || direction === 'top-left') {
        const deltaX = startX - e.clientX;
        newW = Math.max(300, Math.min(700, Math.min(window.innerWidth - 32, startW + deltaX)));
      }

      if (direction === 'top' || direction === 'top-left') {
        const deltaY = startY - e.clientY;
        const maxH = Math.floor(window.innerHeight * 0.85);
        newH = Math.max(300, Math.min(maxH, startH + deltaY));
      }

      setCopilotDimensions({ width: newW, height: newH });
    };

    const handleMouseUp = () => {
      localStorage.setItem('copilotWidth', copilotDimensions.width);
      localStorage.setItem('copilotHeight', copilotDimensions.height);
      setCopilotResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [copilotResizing, copilotDimensions]);

  // Delete Confirmation Modal State
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Helper to re-order and move updated review to top of reviews list
  const promoteReviewInList = useCallback((updatedDoc) => {
    setReviews((prev) => {
      const filtered = prev.filter((r) => r._id !== updatedDoc._id);
      const updatedItem = {
        ...(prev.find((r) => r._id === updatedDoc._id) || {}),
        ...updatedDoc,
        updatedAt: updatedDoc.updatedAt || new Date().toISOString(),
      };
      return [updatedItem, ...filtered];
    });
  }, []);

  // 1. Fetch Review List on mount / search change
  useEffect(() => {
    let isMounted = true;

    async function loadReviews() {
      setLoadingList(true);
      try {
        const res = await reviewPersistenceApi.getReviews(searchQuery);
        if (!isMounted) return;

        if (res && res.success) {
          const list = res.reviews || [];
          setReviews(list);

          if (list.length > 0) {
            // Determine active review: use route param if valid, else pick first (newest)
            const targetId = reviewId && list.some((r) => r._id === reviewId)
              ? reviewId
              : list[0]._id;

            setActiveReviewId(targetId);
            if (!reviewId || reviewId !== targetId) {
              navigate(`/history/${targetId}`, { replace: true });
            }
          } else {
            setActiveReviewId(null);
            setActiveReview(null);
            setCode('');
            setFileName('untitled.js');
            setLanguage('javascript');
          }
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        if (isMounted) {
          setLoadingList(false);
        }
      }
    }

    loadReviews();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, reviewId, navigate]);

  // 2. Load Single Active Review Document when activeReviewId changes
  useEffect(() => {
    if (!activeReviewId) return;

    // Clear any pending autosave for prior reviews
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    let isMounted = true;
    async function loadReviewDoc() {
      setLoadingActive(true);
      setReviewError('');
      try {
        const res = await reviewPersistenceApi.getReview(activeReviewId);
        if (!isMounted) return;

        if (res && res.success && res.review) {
          const rev = res.review;
          setActiveReview(rev);
          setCode(rev.sourceCode || '');
          setFileName(rev.fileName || 'untitled.js');
          setLanguage(rev.language || 'javascript');
          setJuniorMode(Boolean(rev.juniorMode));
          setSaveStatus('saved');
        }
      } catch (err) {
        if (isMounted) {
          setReviewError(err.message || 'Failed to load review.');
        }
      } finally {
        if (isMounted) {
          setLoadingActive(false);
        }
      }
    }

    loadReviewDoc();

    return () => {
      isMounted = false;
    };
  }, [activeReviewId]);

  // 3. Create New Review Document
  const handleCreateNewReview = async () => {
    setCreating(true);
    setReviewError('');
    try {
      const res = await reviewPersistenceApi.createReview({
        title: 'New Code Review',
        fileName: 'untitled.js',
        language: 'javascript',
        sourceCode: '',
      });

      if (res && res.success && res.review) {
        const newReview = res.review;
        const newId = newReview._id;
        setReviews((prev) => [newReview, ...prev]);
        setActiveReviewId(newId);
        setActiveReview(newReview);
        setCode('');
        setFileName('untitled.js');
        setLanguage('javascript');
        setJuniorMode(false);
        setSaveStatus('saved');
        navigate(`/history/${newId}`);
      }
    } catch (err) {
      setReviewError(err.message || 'Failed to create new review.');
    } finally {
      setCreating(false);
    }
  };

  // 4. Save Changes to MongoDB (Debounced or Explicit)
  const performSave = useCallback(
    async (codeToSave, nameToSave, langToSave, juniorToSave) => {
      if (!activeReviewId) return;
      setSaveStatus('saving');

      try {
        const res = await reviewPersistenceApi.updateReview(activeReviewId, {
          sourceCode: codeToSave,
          fileName: nameToSave,
          language: langToSave,
          juniorMode: juniorToSave,
        });

        if (res && res.success && res.review) {
          setSaveStatus('saved');
          promoteReviewInList(res.review);
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Save error:', err);
        setSaveStatus('error');
      }
    },
    [activeReviewId, promoteReviewInList]
  );

  // Trigger debounced autosave on code change
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setSaveStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave(newCode, fileName, language, juniorMode);
    }, 1000);
  };

  // Explicit Save handler
  const handleExplicitSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    performSave(code, fileName, language, juniorMode);
  };

  // Keyboard shortcut: Ctrl+S or Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExplicitSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // 5. Run AI Analysis on the SAME Review Document
  const handleRunAnalysis = async () => {
    if (!activeReviewId) return;
    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setReviewError('Source code cannot be empty. Please enter code to review.');
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsReviewing(true);
    setReviewError('');

    try {
      await performSave(trimmedCode, fileName, language, juniorMode);

      const res = await reviewPersistenceApi.analyzeReview(activeReviewId, {
        sourceCode: trimmedCode,
        language,
        juniorMode,
      });

      if (res && res.success && res.review) {
        setActiveReview(res.review);
        setActiveTab('issues');
        setActiveSeverity('all');
        setActiveCategory('all');
        setSaveStatus('saved');
        promoteReviewInList(res.review);
      } else {
        setReviewError(res?.message || 'Failed to review code.');
      }
    } catch (err) {
      setReviewError(err.message || 'An error occurred during code analysis.');
    } finally {
      setIsReviewing(false);
    }
  };

  // 6. Delete Review Handler
  const handleDeleteReview = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);

    try {
      await reviewPersistenceApi.deleteReview(deleteTargetId);
      const remaining = reviews.filter((r) => r._id !== deleteTargetId);
      setReviews(remaining);
      const wasActive = deleteTargetId === activeReviewId;
      setDeleteTargetId(null);

      if (wasActive) {
        if (remaining.length > 0) {
          const nextId = remaining[0]._id;
          setActiveReviewId(nextId);
          navigate(`/history/${nextId}`);
        } else {
          setActiveReviewId(null);
          setActiveReview(null);
          setCode('');
          setFileName('untitled.js');
          setLanguage('javascript');
          navigate('/history');
        }
      }
    } catch (err) {
      setReviewError(err.message || 'Failed to delete review.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper actions
  const handleLoadSample = () => {
    setCode(JAVA_SAMPLE_CODE);
    setFileName('UserAuthenticationService.java');
    setLanguage('java');
    setReviewError('');
    performSave(JAVA_SAMPLE_CODE, 'UserAuthenticationService.java', 'java', juniorMode);
  };

  const handleClearCode = () => {
    setCode('');
    setReviewError('');
    setTargetLine(null);
    performSave('', fileName, language, juniorMode);
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyRefactored = async () => {
    if (!activeReview?.refactoredCode) return;
    try {
      await navigator.clipboard.writeText(activeReview.refactoredCode);
      setCopiedRefactor(true);
      setTimeout(() => setCopiedRefactor(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = (content, defaultName = 'code.txt') => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectLine = useCallback((line) => {
    if (line) {
      setTargetLine(line);
    }
  }, []);

  const handleOpenInCompiler = (codeToRun) => {
    const targetCode = codeToRun || activeReview?.refactoredCode || code;
    if (!targetCode) return;
    navigate('/compiler', {
      state: {
        code: targetCode,
        language: language,
      },
    });
  };

  const filteredIssues = (activeReview?.issues || []).filter((issue) => {
    const matchesSeverity = activeSeverity === 'all' || issue.severity === activeSeverity;
    const matchesCategory = activeCategory === 'all' || issue.category === activeCategory;
    return matchesSeverity && matchesCategory;
  });

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code ? code.length : 0;

  const groupedReviews = useMemo(() => groupReviewsByDate(reviews), [reviews]);

  return (
    <div className="history-page-root">
      {/* ========================================================= */}
      {/* TOP NAVBAR (SCREENSHOT HEADER)                            */}
      {/* ========================================================= */}
      <header className="history-top-navbar">
        <div className="nav-left-group">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-nav-dashboard"
          >
            <ArrowLeft size={15} />
            <span>Dashboard</span>
          </button>

          <div className="nav-page-title">
            <Clock size={16} className="text-accent" />
            <span>History</span>
          </div>
        </div>

        <div className="nav-right-group">
          <button
            type="button"
            onClick={handleCreateNewReview}
            className="btn-new-review-top"
            disabled={creating}
          >
            <Plus size={15} />
            <span>New Code Review</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN BODY AREA: SIDEBAR + SPLIT WORKSPACE                 */}
      {/* ========================================================= */}
      <div className="history-page-body">
        {/* ------------------------------------------------------- */}
        {/* LEFT SIDEBAR: REVIEWS LIST & SEARCH                      */}
        {/* ------------------------------------------------------- */}
        <aside className="history-sidebar">
          <div className="sidebar-header-bar">
            <div className="sidebar-title-group">
              <Clock size={15} className="text-accent" />
              <h3 className="sidebar-header-title">Reviews</h3>
            </div>

            <button
              type="button"
              onClick={handleCreateNewReview}
              className="btn-sidebar-add-plus"
              disabled={creating}
              title="Create new code review"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="sidebar-search-container">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sidebar-reviews-scroll">
            {loadingList ? (
              <div className="col-loading-state">
                <span className="btn-spinner" />
                <span>Loading reviews...</span>
              </div>
            ) : groupedReviews.length > 0 ? (
              groupedReviews.map((group) => (
                <div key={group.id} className="history-date-group">
                  <span className="history-group-header">{group.title}</span>
                  {group.items.map((rev) => {
                    const isActive = rev._id === activeReviewId;
                    const totalIssues = rev.summary?.total || 0;
                    const criticalCount = rev.summary?.critical || 0;

                    return (
                      <div
                        key={rev._id}
                        className={`review-history-card ${isActive ? 'card-active' : ''}`}
                        onClick={() => {
                          if (rev._id !== activeReviewId) {
                            setActiveReviewId(rev._id);
                            navigate(`/history/${rev._id}`);
                          }
                        }}
                      >
                        <div className="card-top-row">
                          <span className="card-filename" title={rev.fileName || rev.title}>
                            {rev.fileName || rev.title || 'untitled.js'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(rev._id);
                            }}
                            className="card-delete-btn"
                            title="Delete review"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="card-meta-row">
                          <span className="card-lang-badge">
                            {(rev.language || 'java').toUpperCase()}
                          </span>
                          <span className="card-issues-count">
                            {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
                          </span>
                          {criticalCount > 0 && (
                            <span className="card-critical-pill">
                              {criticalCount} crit
                            </span>
                          )}
                        </div>

                        <div className="card-footer-row">
                          <span className="card-timestamp">
                            Updated {getRelativeTime(rev.updatedAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="col-empty-state">
                <p>No code reviews found.</p>
                <button
                  type="button"
                  onClick={handleCreateNewReview}
                  className="btn btn-secondary btn-sm mt-2"
                  disabled={creating}
                >
                  <Plus size={13} className="icon-mr" />
                  New Code Review
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ------------------------------------------------------- */}
        {/* RIGHT WORKSPACE: SPLIT EDITOR + AI REVIEW PANEL         */}
        {/* ------------------------------------------------------- */}
        {/* ------------------------------------------------------- */}
        {/* RIGHT WORKSPACE: SPLIT EDITOR + AI REVIEW PANEL         */}
        {/* ------------------------------------------------------- */}
        <main
          className="history-main-workspace"
          ref={mainWorkspaceRef}
          style={{ userSelect: (isRowResizing || copilotResizing) ? 'none' : 'auto' }}
        >
          {reviews.length === 0 && !loadingList ? (
            <div className="workspace-empty-center">
              <div className="workspace-empty-badge">
                <FileCode2 size={28} />
              </div>
              <h2 className="workspace-empty-title">No Code Reviews Yet</h2>
              <p className="workspace-empty-desc">
                Create your first code review to audit source code for security risks, bugs, Big-O complexity, and production fixes.
              </p>
              <button
                type="button"
                onClick={handleCreateNewReview}
                className="btn-hero-primary"
                disabled={creating}
              >
                <Plus size={15} className="icon-mr" />
                {creating ? 'Creating...' : 'Create Your First Review'}
              </button>
            </div>
          ) : (
            <>
              {/* =================================================== */}
              {/* TOP HALF: CODE EDITOR SECTION                      */}
              {/* =================================================== */}
              <section
                className="editor-panel-section"
                style={{ height: `${editorHeightPercent}%`, flex: 'none' }}
              >
                {/* 1. Main Header Toolbar */}
                <div className="editor-header-toolbar">
                  <div className="editor-header-left">
                    <span className="breadcrumb-chevron">&gt;</span>
                    <input
                      type="text"
                      className="filename-input"
                      value={fileName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setFileName(newName);
                        performSave(code, newName, language, juniorMode);
                      }}
                      placeholder="untitled.js"
                      title="Click to rename file"
                      disabled={!activeReviewId || isReviewing}
                    />
                  </div>

                  <div className="editor-header-actions">
                    {/* Language Dropdown */}
                    <div className="select-wrapper">
                      <select
                        className="toolbar-select"
                        value={language}
                        onChange={(e) => {
                          const newLang = e.target.value;
                          setLanguage(newLang);
                          performSave(code, fileName, newLang, juniorMode);
                        }}
                        disabled={!activeReviewId || isReviewing}
                      >
                        {SUPPORTED_LANGUAGES.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="select-arrow" />
                    </div>

                    {/* Upload File */}
                    <FileUploader
                      filename={fileName}
                      onFileSelect={({ code: upCode, filename: upName, inferredLanguage }) => {
                        setCode(upCode);
                        setFileName(upName);
                        const langToUse = inferredLanguage || language;
                        if (inferredLanguage) setLanguage(inferredLanguage);
                        performSave(upCode, upName, langToUse, juniorMode);
                      }}
                      onClearFile={() => {
                        setFileName('untitled.js');
                        performSave(code, 'untitled.js', language, juniorMode);
                      }}
                      disabled={!activeReviewId || isReviewing}
                    />

                    {/* File Tab Chip */}
                    <div className="active-file-chip" title={fileName}>
                      <span>{fileName.length > 18 ? `${fileName.slice(0, 18)}...` : fileName}</span>
                      <button
                        type="button"
                        onClick={handleClearCode}
                        className="chip-close-btn"
                        title="Close/clear code"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* Sample Code Button */}
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="btn-toolbar-chip"
                      title="Load sample Java code with vulnerabilities"
                      disabled={!activeReviewId || isReviewing}
                    >
                      <Sparkles size={13} className="icon-mr text-accent" />
                      Sample
                    </button>

                    {/* Save Status & Button */}
                    <span className={`save-status-indicator status-${saveStatus}`}>
                      {saveStatus === 'saving' && 'Saving...'}
                      {saveStatus === 'saved' && 'Saved'}
                      {saveStatus === 'unsaved' && 'Unsaved'}
                      {saveStatus === 'error' && 'Save failed'}
                    </span>

                    <button
                      type="button"
                      onClick={handleExplicitSave}
                      className="btn-toolbar-chip"
                      title="Save code (Ctrl+S)"
                      disabled={!activeReviewId || saveStatus === 'saved' || isReviewing}
                    >
                      <Save size={13} className="icon-mr" />
                      Save
                    </button>

                    {/* Clear Button */}
                    {code && (
                      <button
                        type="button"
                        onClick={handleClearCode}
                        className="btn-toolbar-chip btn-toolbar-danger"
                        title="Clear code"
                        disabled={!activeReviewId || isReviewing}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Secondary Code Stats Header */}
                <div className="editor-sub-header">
                  <div className="sub-header-left">
                    <span className="code-info-pill">{(language || 'java').toUpperCase()}</span>
                    <span className="code-info-meta">{lineCount} lines</span>
                    <span className="code-info-divider">•</span>
                    <span className="code-info-meta">{charCount.toLocaleString()} chars</span>
                  </div>

                  <div className="sub-header-right">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="btn-code-action"
                      title="Copy source code"
                    >
                      {copiedCode ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearCode}
                      className="btn-code-action"
                      title="Clear editor code"
                    >
                      <Trash2 size={13} />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* 3. Code Editor Box */}
                <div className="editor-monaco-wrapper">
                  {loadingActive ? (
                    <div className="col-loading-state">
                      <span className="btn-spinner" />
                      <span>Loading saved code...</span>
                    </div>
                  ) : (
                    <CodeEditor
                      code={code}
                      language={language}
                      onChange={handleCodeChange}
                      onClear={handleClearCode}
                      targetLine={targetLine}
                    />
                  )}
                </div>

                {/* Review Error Banner */}
                {reviewError && (
                  <div className="workspace-alert" role="alert">
                    <AlertCircle size={15} className="alert-icon" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* 4. Bottom Control Bar */}
                <div className="editor-bottom-bar">
                  <div className="bottom-bar-left">
                    <span className="code-info-pill">{(language || 'java').toUpperCase()}</span>
                    <span className="code-info-meta">{lineCount} lines</span>
                    <span className="code-info-divider">•</span>
                    <span className="code-info-meta">{charCount.toLocaleString()} chars</span>
                  </div>

                  <div className="bottom-bar-right">
                    <label className="toggle-label" title="Explain findings in intuitive terms for junior developers">
                      <input
                        type="checkbox"
                        className="toggle-checkbox"
                        checked={juniorMode}
                        onChange={(e) => {
                          const newJunior = e.target.checked;
                          setJuniorMode(newJunior);
                          performSave(code, fileName, language, newJunior);
                        }}
                        disabled={!activeReviewId || isReviewing}
                      />
                      <span className="toggle-switch" />
                      <GraduationCap size={14} className="toggle-icon" />
                      <span className="toggle-text">Junior Mode</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      className="btn-review-purple"
                      disabled={isReviewing || loadingActive || !code || !code.trim() || !activeReviewId}
                    >
                      {isReviewing ? (
                        <span className="btn-loading-content">
                          <span className="btn-spinner" aria-hidden="true" />
                          Analyzing...
                        </span>
                      ) : (
                        <>
                          <Play size={14} className="fill-current" />
                          <span>Review Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* Resize Handle Separator */}
              <div
                className={`split-resize-handle ${isRowResizing ? 'resizing' : ''}`}
                onMouseDown={handleRowMouseDown}
                title="Drag up or down to adjust split size"
              >
                <GripHorizontal size={14} />
              </div>

              {/* =================================================== */}
              {/* BOTTOM HALF: AI REVIEW PANEL                       */}
              {/* =================================================== */}
              <section
                className="ai-review-section"
                style={{ height: `calc(${100 - editorHeightPercent}% - 8px)`, flex: 'none' }}
              >
                {/* 1. Header Bar */}
                <div className="ai-review-header">
                  <div className="ai-title-group">
                    <Shield size={16} className="text-accent" />
                    <h3 className="ai-header-title">AI Review</h3>
                  </div>

                  <div className="ai-status-badge" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {activeReview && (activeReview.issues?.length > 0 || activeReview.overallExplanation) && (
                      <button
                        type="button"
                        onClick={() => {
                          const summary = activeReview.summary || {};
                          const issues = activeReview.issues || [];
                          const score = activeReview.summary?.codeHealthScore ?? 100;

                          let md = `# AI Code Review & Refactoring Report\n\n`;
                          md += `**File Name:** \`${fileName}\`  \n`;
                          md += `**Language:** \`${language.toUpperCase()}\`  \n`;
                          md += `**Date:** ${new Date().toLocaleString()}  \n`;
                          md += `**Code Health Score:** **${score}/100**  \n\n`;

                          md += `## 1. Executive Audit Summary\n`;
                          md += `- **Total Findings:** ${summary.total || 0}\n`;
                          md += `- **Critical Vulnerabilities:** ${summary.critical || 0}\n`;
                          md += `- **Warnings:** ${summary.warning || 0}\n`;
                          md += `- **Suggestions:** ${summary.suggestion || 0}\n\n`;
                          md += `> ${activeReview.overallExplanation || 'No overall explanation provided.'}\n\n`;

                          md += `## 2. Severity-Tagged Issue Breakdown\n\n`;
                          issues.forEach((issue, idx) => {
                            md += `### ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n`;
                            md += `- **Category:** ${issue.category}\n`;
                            md += `- **Line Reference:** ${issue.line ?? 'N/A'}\n`;
                            md += `- **Description:** ${issue.description}\n`;
                            md += `- **Why It Matters:** ${issue.whyItMatters}\n`;
                            md += `- **Suggested Fix:** ${issue.suggestedFix}\n\n`;
                          });

                          md += `## 3. Recommended Refactored Code\n\n\`\`\`${language}\n${activeReview.refactoredCode || code}\n\`\`\`\n`;

                          const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `report_${fileName.replace(/\.[^/.]+$/, '')}.md`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                        className="btn-toolbar-chip"
                        title="Export complete audit report as Markdown (.md)"
                      >
                        <Download size={13} className="icon-mr" />
                        <span>Export Report (.md)</span>
                      </button>
                    )}

                    {isReviewing ? (
                      <span className="status-badge status-badge-running">
                        <span className="status-dot-pulse" />
                        Analyzing...
                      </span>
                    ) : activeReview?.reviewStatus === 'reviewed' ? (
                      <span className="status-badge status-badge-complete">
                        <span className="status-dot-complete" />
                        Audit complete
                      </span>
                    ) : (
                      <span className="status-badge status-badge-ready">
                        <span className="status-dot-ready" />
                        Ready to review
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Navigation Tabs Bar */}
                <div className="ai-review-tabs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('issues')}
                    className={`ai-tab-btn ${activeTab === 'issues' ? 'active-tab' : ''}`}
                  >
                    <FileSearch size={14} />
                    <span>Issues</span>
                    <span className="tab-pill-badge">{activeReview?.summary?.total || 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('diff')}
                    className={`ai-tab-btn ${activeTab === 'diff' ? 'active-tab' : ''}`}
                  >
                    <GitCompare size={14} />
                    <span>Diff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('refactor')}
                    className={`ai-tab-btn ${activeTab === 'refactor' ? 'active-tab' : ''}`}
                  >
                    <Code size={14} />
                    <span>Refactored</span>
                  </button>
                </div>

                {/* 3. Tab Content Container */}
                <div className="ai-review-content-scroll">
                  {isReviewing ? (
                    <div className="review-loading-view">
                      <div className="loading-spinner-lg" />
                      <h3 className="loading-headline">Analyzing your code...</h3>
                      <p className="loading-sub">Groq AI is auditing bugs, security risks, Big-O, and refactoring:</p>
                      <div className="loading-steps-list">
                        <div className="loading-step-item">
                          <CheckCircle2 size={14} className="text-accent icon-mr" />
                          <span>Scanning syntax & edge cases</span>
                        </div>
                        <div className="loading-step-item">
                          <CheckCircle2 size={14} className="text-accent icon-mr" />
                          <span>Auditing OWASP vulnerabilities</span>
                        </div>
                        <div className="loading-step-item">
                          <CheckCircle2 size={14} className="text-accent icon-mr" />
                          <span>Generating refactored code & diff</span>
                        </div>
                      </div>
                    </div>
                  ) : activeReview && (activeReview.reviewStatus === 'reviewed' || activeReview.refactoredCode || (activeReview.issues && activeReview.issues.length > 0)) ? (
                    <>
                      {/* Tab 1: Issues View */}
                      {(activeTab === 'issues' || activeTab === 'copilot') && (
                        <div className="tab-pane-issues">
                          <ReviewSummary
                            summary={activeReview.summary}
                            overallExplanation={activeReview.overallExplanation}
                          />

                          <ReviewFilters
                            activeSeverity={activeSeverity}
                            onSeverityChange={setActiveSeverity}
                            activeCategory={activeCategory}
                            onCategoryChange={setActiveCategory}
                            counts={activeReview.summary}
                          />

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
                                <p>No findings match the active filters.</p>
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

                      {/* Tab 2: Diff View */}
                      {activeTab === 'diff' && (
                        <div className="tab-pane-diff">
                          <DiffViewer
                            originalCode={activeReview.originalCode || activeReview.sourceCode || code}
                            refactoredCode={activeReview.refactoredCode}
                            language={language}
                          />
                        </div>
                      )}

                      {/* Tab 3: Refactored View */}
                      {activeTab === 'refactor' && (
                        <div className="tab-pane-refactor">
                          <div className="refactor-toolbar">
                            <span className="refactor-note">
                              Production-ready replacement code fixing identified issues.
                            </span>

                            <div className="refactor-actions">
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeReview?.refactoredCode) {
                                    setCode(activeReview.refactoredCode);
                                    performSave(activeReview.refactoredCode, fileName, language, juniorMode);
                                  }
                                }}
                                className="btn-toolbar-purple"
                                title="Apply AI suggested refactored code directly into the code editor"
                              >
                                <Sparkles size={13} className="icon-mr text-accent" />
                                <span>Apply Fix to Editor</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenInCompiler(activeReview.refactoredCode)}
                                className="btn-toolbar-purple"
                                title="Open and run this refactored code in the Compiler"
                              >
                                <Play size={13} className="fill-current" />
                                <span>Open & Run in Compiler</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleCopyRefactored}
                                className="btn-toolbar-chip"
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
                                    activeReview.refactoredCode,
                                    fileName ? `refactored_${fileName}` : 'refactored_code.txt'
                                  )
                                }
                                className="btn-toolbar-chip"
                                title="Download refactored code"
                              >
                                <Download size={13} className="icon-mr" />
                                Download
                              </button>
                            </div>
                          </div>

                          <div className="refactor-editor-wrapper">
                            <CodeEditor
                              code={activeReview.refactoredCode || '// No refactored code generated yet.\n// Click "Review Code" to run Groq AI analysis.'}
                              language={language}
                              readOnly
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="review-empty-state">
                      <div className="empty-state-badge">
                        <Sparkles size={22} />
                      </div>
                      <h4 className="empty-state-title">No Audit Performed Yet</h4>
                      <p className="empty-state-text">
                        Enter your code above and click <strong>Review Code</strong> to trigger an in-depth Groq AI audit.
                      </p>
                      <div className="empty-state-action">
                        <button
                          type="button"
                          onClick={handleLoadSample}
                          className="btn-review-secondary"
                          disabled={!activeReviewId || isReviewing}
                        >
                          <Sparkles size={13} className="icon-mr text-accent" />
                          Try Sample Vulnerable Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="modal-backdrop" onClick={() => setDeleteTargetId(null)}>
          <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title text-critical">Delete Review</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete this code review? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="btn btn-secondary btn-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReview}
                className="btn btn-primary btn-sm btn-danger-action"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING COPILOT CHATBOT PANEL */}
      <div
        className={`floating-copilot-container ${isCopilotOpen ? 'copilot-open' : 'copilot-closed'}`}
        style={{
          width: `${copilotDimensions.width}px`,
          height: `${copilotDimensions.height}px`,
        }}
      >
        {/* Resize Handles */}
        <div
          className={`copilot-resize-handle handle-top-left ${copilotResizing?.direction === 'top-left' ? 'active' : ''}`}
          onMouseDown={(e) => handleCopilotResizeStart(e, 'top-left')}
          title="Drag to resize width and height"
        />
        <div
          className={`copilot-resize-handle handle-top ${copilotResizing?.direction === 'top' ? 'active' : ''}`}
          onMouseDown={(e) => handleCopilotResizeStart(e, 'top')}
          title="Drag to resize height"
        />
        <div
          className={`copilot-resize-handle handle-left ${copilotResizing?.direction === 'left' ? 'active' : ''}`}
          onMouseDown={(e) => handleCopilotResizeStart(e, 'left')}
          title="Drag to resize width"
        />

        <Copilot
          key={activeReview?._id || 'default-copilot'}
          reviewId={activeReview?._id}
          code={code}
          language={language}
          review={activeReview}
          refactoredCode={activeReview?.refactoredCode}
          onClose={() => setIsCopilotOpen(false)}
        />
      </div>

      {/* FLOATING COPILOT TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsCopilotOpen((prev) => !prev)}
        className={`floating-copilot-trigger ${isCopilotOpen ? 'trigger-active' : ''}`}
        title="Code Copilot"
        aria-label="Toggle Code Copilot Chatbot"
      >
        {isCopilotOpen ? <X size={20} /> : <MessageSquareCode size={20} />}
      </button>
    </div>
  );
}
