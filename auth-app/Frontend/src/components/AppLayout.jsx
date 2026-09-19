import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Code2,
  LayoutDashboard,
  Clock,
  LogOut,
  Settings,
  Menu,
  X,
  Sparkles,
  Shield,
  Cpu,
  Terminal,
} from 'lucide-react';
import authApi from '../services/authApi';

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const res = await authApi.getMe();
        if (isMounted && res && res.success) {
          setUserEmail(res.user?.email || '');
        }
      } catch {
        // Handled by ProtectedRoute
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close mobile drawer helper
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

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

  const username = userEmail ? userEmail.split('@')[0] : 'Developer';

  const isHistoryPage = location.pathname.startsWith('/history');

  if (isHistoryPage) {
    return (
      <div className="app-shell-fullhistory">
        {children}
      </div>
    );
  }

  return (
    <div className="app-shell-container">
      {/* Mobile Top Header */}
      <header className="mobile-shell-header">
        <div className="shell-brand">
          <div className="shell-logo-box">
            <Code2 size={16} />
          </div>
          <span className="shell-brand-text">AI Code Reviewer</span>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="btn-mobile-menu"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Main Sidebar */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'app-sidebar-mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-section">
          <div className="sidebar-brand-box">
            <div className="sidebar-logo">
              <Code2 size={18} />
            </div>
            <div className="sidebar-brand-info">
              <div className="sidebar-title-row">
                <span className="sidebar-title">AI Code Reviewer</span>
                <span className="sidebar-badge">PRO</span>
              </div>
              <span className="sidebar-subtitle">Groq 120B Inference</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">WORKSPACE</div>

          <NavLink
            to="/dashboard"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <LayoutDashboard size={16} className="nav-item-icon" />
            <span className="nav-item-text">Dashboard</span>
          </NavLink>

          <NavLink
            to="/history"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive || location.pathname.startsWith('/history') ? 'nav-item-active' : ''}`
            }
          >
            <Clock size={16} className="nav-item-icon" />
            <span className="nav-item-text">History</span>
          </NavLink>

          <NavLink
            to="/compiler"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <Terminal size={16} className="nav-item-icon" />
            <span className="nav-item-text">Compiler</span>
          </NavLink>
        </nav>

        {/* User Profile & Footer Section */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card" title={userEmail}>
            <div className="user-avatar-circle">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span className="user-display-name">{username}</span>
              <span className="user-display-email">{userEmail}</span>
            </div>
          </div>

          <div className="sidebar-actions-row">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="btn-sidebar-action"
              title="Settings & Engine Info"
            >
              <Settings size={14} className="icon-mr" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="btn-sidebar-action btn-sidebar-logout"
              disabled={isLoggingOut}
              title="Sign out"
            >
              <LogOut size={14} className="icon-mr" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Workspace */}
      <main className="app-main-content">
        {children}
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Settings size={18} className="text-accent icon-mr" />
                <h3 className="modal-title">Workspace Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="btn-modal-close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="settings-group">
                <label className="settings-label">User Account</label>
                <div className="settings-val-box">
                  <span>{userEmail || 'Authenticated Developer'}</span>
                  <span className="badge badge-suggestion">Verified</span>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">AI Engine Configuration</label>
                <div className="settings-val-box">
                  <div className="engine-info">
                    <Cpu size={14} className="text-accent" />
                    <strong>Groq Cloud Inference</strong>
                  </div>
                  <code>openai/gpt-oss-120b</code>
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-label">Privacy & Isolation</label>
                <p className="settings-desc">
                  All your code reviews and audit findings are isolated to your account and stored securely in MongoDB.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
