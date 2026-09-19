import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import authApi from '../services/authApi';

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email] = useState(
    () =>
      location.state?.email ||
      sessionStorage.getItem('registrationEmail') ||
      sessionStorage.getItem('auth_registration_email') ||
      ''
  );
  const [verificationToken] = useState(
    () =>
      location.state?.verificationToken ||
      sessionStorage.getItem('registrationVerificationToken') ||
      sessionStorage.getItem('auth_verification_token') ||
      ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Registration email missing. Please start registration from the beginning.');
      return;
    }

    if (!verificationToken) {
      setError('Email verification is required. Please verify your email first.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.completeRegistration({
        email,
        password,
        confirmPassword,
        verificationToken,
      });

      if (response && response.success) {
        // Clear all registration-related session data
        sessionStorage.removeItem('registrationEmail');
        sessionStorage.removeItem('registrationVerificationToken');
        sessionStorage.removeItem('auth_registration_email');
        sessionStorage.removeItem('auth_verification_token');

        // Navigate to login with success feedback
        navigate('/login', {
          replace: true,
          state: {
            successMessage:
              response.message || 'Account created successfully! Please log in.',
          },
        });
      } else {
        setError(response?.message || 'Failed to set password.');
      }
    } catch (err) {
      setError(err.message || 'Unable to complete account registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set your password"
      subtitle="Choose a secure password to complete your account setup."
      footer={
        <p className="auth-footer-text">
          Want to cancel?{' '}
          <Link to="/login" className="auth-link">
            Return to login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {error && (
          <div className="alert alert-error" role="alert">
            <svg
              className="alert-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {(!email || !verificationToken) && (
          <div className="alert alert-warning" role="alert">
            <span>
              {!email
                ? 'Registration email not found. '
                : 'Email verification required. '}
              <Link to="/register" className="alert-link">
                Restart registration
              </Link>
            </span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            required
            disabled={isLoading || !email}
          />
          <span className="form-hint">Must be at least 8 characters long</span>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="form-input"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={isLoading || !email}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={isLoading || !email}
        >
          {isLoading ? (
            <span className="btn-loading-content">
              <span className="btn-spinner" aria-hidden="true" />
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
