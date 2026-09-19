import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileCheck2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Code,
  Sparkles,
  Layers,
  Bug,
  Zap,
  Wrench,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import reviewPersistenceApi from '../services/reviewPersistenceApi';
import authApi from '../services/authApi';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

export default function DashboardHome() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [error, setError] = useState('');

  // Fetch current user and aggregated dashboard data
  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const [userRes, statsRes] = await Promise.all([
          authApi.getMe(),
          reviewPersistenceApi.getDashboardData(days),
        ]);

        if (!isMounted) return;

        if (userRes && userRes.success) {
          const email = userRes.user?.email || '';
          setUserName(email.split('@')[0] || 'Developer');
        }

        if (statsRes && statsRes.success) {
          setStatsData(statsRes.stats);
        } else {
          setError(statsRes?.message || 'Failed to load dashboard statistics.');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to connect to dashboard analytics.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [days]);

  // Create new review and navigate directly to History workspace
  const handleCreateNewReview = async () => {
    setCreating(true);
    try {
      const res = await reviewPersistenceApi.createReview({
        title: 'New Code Review',
        fileName: 'untitled.js',
        language: 'javascript',
        sourceCode: '',
      });

      if (res && res.success && res.review) {
        navigate(`/history/${res.review._id}`);
      } else {
        setError(res?.message || 'Failed to create review.');
      }
    } catch (err) {
      setError(err.message || 'Error creating new review.');
    } finally {
      setCreating(false);
    }
  };

  const stats = statsData || {
    totalReviews: 0,
    totalIssues: 0,
    criticalIssues: 0,
    securityIssues: 0,
    issueDistribution: { security: 0, bug: 0, performance: 0, code_smell: 0, maintainability: 0 },
    reviewsOverTime: [],
    recentReviews: [],
    recentActivity: [],
  };

  const greeting = getGreeting();
  const maxIssuesOverTime = Math.max(
    1,
    ...(stats.reviewsOverTime || []).map((t) => Math.max(t.reviews, t.issues))
  );

  const totalCategorized = Object.values(stats.issueDistribution || {}).reduce((a, b) => a + b, 0);

  const categories = [
    { key: 'security', label: 'Security', count: stats.issueDistribution?.security || 0, icon: ShieldAlert, colorClass: 'meter-security' },
    { key: 'bug', label: 'Bugs', count: stats.issueDistribution?.bug || 0, icon: Bug, colorClass: 'meter-bug' },
    { key: 'performance', label: 'Performance', count: stats.issueDistribution?.performance || 0, icon: Zap, colorClass: 'meter-performance' },
    { key: 'code_smell', label: 'Code Smells', count: stats.issueDistribution?.code_smell || 0, icon: Sparkles, colorClass: 'meter-smell' },
    { key: 'maintainability', label: 'Maintainability', count: stats.issueDistribution?.maintainability || 0, icon: Wrench, colorClass: 'meter-maint' },
  ];

  return (
    <div className="dashboard-home-container">
      {/* 1. Welcome Hero Section */}
      <section className="dashboard-hero-card">
        <div className="hero-text-content">
          <div className="hero-badge">
            <Sparkles size={12} className="text-accent" />
            <span>AI Code Review Platform</span>
          </div>
          <h1 className="hero-title">
            {greeting}, <span className="hero-name-highlight">{userName}</span> 👋
          </h1>
          <p className="hero-subtitle">
            Here's your real-time code quality overview, security posture, and review activity.
          </p>
        </div>

        <div className="hero-actions">
          <button
            type="button"
            onClick={handleCreateNewReview}
            className="btn-hero-primary"
            disabled={creating}
          >
            {creating ? (
              <span className="btn-loading-content">
                <span className="btn-spinner" />
                Creating...
              </span>
            ) : (
              <>
                <Plus size={16} className="icon-mr" />
                New Code Review
              </>
            )}
          </button>
        </div>
      </section>

      {error && (
        <div className="alert alert-error mb-4" role="alert">
          <AlertTriangle size={15} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Key Statistics Cards Grid */}
      <section className="dashboard-stats-grid">
        <div className="dash-stat-card stat-card-total">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Reviews</span>
            <div className="stat-card-icon-box box-total">
              <FileCheck2 size={16} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-num">{stats.totalReviews}</span>
            <span className="stat-card-trend">Across all files</span>
          </div>
        </div>

        <div className="dash-stat-card stat-card-issues">
          <div className="stat-card-header">
            <span className="stat-card-label">Issues Found</span>
            <div className="stat-card-icon-box box-issues">
              <Layers size={16} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-num">{stats.totalIssues}</span>
            <span className="stat-card-trend">4D code findings</span>
          </div>
        </div>

        <div className="dash-stat-card stat-card-critical">
          <div className="stat-card-header">
            <span className="stat-card-label">Critical Issues</span>
            <div className="stat-card-icon-box box-critical">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-num">{stats.criticalIssues}</span>
            <span className="stat-card-trend text-critical">Requires attention</span>
          </div>
        </div>

        <div className="dash-stat-card stat-card-security">
          <div className="stat-card-header">
            <span className="stat-card-label">Security Risks</span>
            <div className="stat-card-icon-box box-security">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-num">{stats.securityIssues}</span>
            <span className="stat-card-trend text-security">OWASP & Injection</span>
          </div>
        </div>
      </section>

      {/* 3. Middle Section: Quality Overview Chart + Issue Distribution */}
      <div className="dashboard-charts-row">
        {/* Left Chart: Activity Over Time */}
        <section className="dash-panel-card activity-chart-panel">
          <div className="dash-panel-header">
            <div className="panel-header-left">
              <TrendingUp size={15} className="text-accent" />
              <h3 className="dash-panel-title">Code Quality & Review Activity</h3>
            </div>

            <div className="range-selector">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`range-btn ${days === d ? 'range-btn-active' : ''}`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <div className="activity-chart-container">
            {loading ? (
              <div className="chart-loading-state">
                <RefreshCw size={20} className="spinner-icon" />
                <span>Aggregating timeline data...</span>
              </div>
            ) : stats.reviewsOverTime && stats.reviewsOverTime.length > 0 ? (
              <div className="custom-timeline-chart">
                <div className="timeline-bars-track">
                  {stats.reviewsOverTime.map((item, idx) => {
                    const heightPercent = Math.max(
                      6,
                      Math.round(((item.issues || item.reviews) / maxIssuesOverTime) * 100)
                    );
                    return (
                      <div
                        key={idx}
                        className="timeline-col"
                        title={`${item.date}: ${item.reviews} reviews, ${item.issues} issues`}
                      >
                        <div className="bar-wrapper">
                          <div
                            className="timeline-bar"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        {idx % Math.ceil(stats.reviewsOverTime.length / 7) === 0 && (
                          <span className="timeline-date-label">
                            {item.date.slice(5)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="chart-legend-row">
                  <span className="chart-legend-item">
                    <span className="legend-box-accent" /> Review Activity & Issues Detected
                  </span>
                </div>
              </div>
            ) : (
              <div className="chart-empty-state">
                <p>No activity recorded in the selected timeframe.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Chart: Issue Category Distribution */}
        <section className="dash-panel-card distribution-panel">
          <div className="dash-panel-header">
            <div className="panel-header-left">
              <Layers size={15} className="text-accent" />
              <h3 className="dash-panel-title">Issue Distribution</h3>
            </div>
            <span className="panel-badge-meta">{totalCategorized} findings</span>
          </div>

          <div className="distribution-body">
            {categories.map(({ key, label, count, icon: Icon, colorClass }) => {
              const pct = totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0;
              return (
                <div key={key} className="distribution-row">
                  <div className="dist-row-label">
                    <Icon size={13} className="dist-row-icon" />
                    <span>{label}</span>
                  </div>

                  <div className="dist-meter-track">
                    <div
                      className={`dist-meter-fill ${colorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="dist-row-stats">
                    <span className="dist-count">{count}</span>
                    <span className="dist-pct">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 4. Bottom Section: Recent Reviews & Recent Activity */}
      <div className="dashboard-bottom-row">
        {/* Recent Reviews List */}
        <section className="dash-panel-card recent-reviews-panel">
          <div className="dash-panel-header">
            <div className="panel-header-left">
              <Code size={15} className="text-accent" />
              <h3 className="dash-panel-title">Recent Code Reviews</h3>
            </div>

            <button
              type="button"
              onClick={() => navigate('/history')}
              className="btn-link-action"
            >
              View All History <ArrowRight size={13} className="icon-mr" />
            </button>
          </div>

          <div className="recent-reviews-list">
            {stats.recentReviews && stats.recentReviews.length > 0 ? (
              stats.recentReviews.map((rev) => (
                <div
                  key={rev._id}
                  className="recent-review-row"
                  onClick={() => navigate(`/history/${rev._id}`)}
                >
                  <div className="rev-info-col">
                    <div className="rev-filename-row">
                      <span className="rev-filename">{rev.fileName || 'untitled.js'}</span>
                      <span className="rev-lang-tag">{rev.language}</span>
                    </div>
                    <span className="rev-time-text">
                      Updated {getRelativeTime(rev.updatedAt)}
                    </span>
                  </div>

                  <div className="rev-metrics-col">
                    <div className="rev-issues-pill">
                      <span>{rev.summary?.total || 0} issues</span>
                    </div>

                    {rev.summary?.critical > 0 && (
                      <span className="badge badge-critical">
                        {rev.summary.critical} crit
                      </span>
                    )}

                    <ChevronRight size={16} className="rev-arrow-icon" />
                  </div>
                </div>
              ))
            ) : (
              <div className="panel-empty-state">
                <p>No reviews created yet.</p>
                <button
                  type="button"
                  onClick={handleCreateNewReview}
                  className="btn btn-secondary btn-sm mt-2"
                >
                  <Plus size={13} className="icon-mr" />
                  Start Your First Review
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity Feed */}
        <section className="dash-panel-card recent-activity-panel">
          <div className="dash-panel-header">
            <div className="panel-header-left">
              <Clock size={15} className="text-accent" />
              <h3 className="dash-panel-title">Activity Feed</h3>
            </div>
          </div>

          <div className="activity-feed-list">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((act) => (
                <div key={act.id} className="activity-feed-item">
                  <span className="activity-timeline-dot" />
                  <div className="activity-item-content">
                    <p className="activity-desc">{act.description}</p>
                    <span className="activity-timestamp">
                      {formatDate(act.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="panel-empty-state">
                <p>No recent activity recorded.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
