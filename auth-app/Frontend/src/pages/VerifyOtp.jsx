import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import authApi from '../services/authApi';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email] = useState(
    () =>
      location.state?.email ||
      sessionStorage.getItem('registrationEmail') ||
      sessionStorage.getItem('auth_registration_email') ||
      ''
  );
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOtpChange = (e) => {
    // Keep only digits, up to 6 characters
    const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(cleanValue);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!email) {
      setError('Registration email is missing. Please start over.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.verifyOtp({
        email,
        otp: trimmedOtp,
      });

      if (response && response.success) {
        // Save server-issued cryptographic verification token
        if (response.verificationToken) {
          sessionStorage.setItem(
            'registrationVerificationToken',
            response.verificationToken
          );
        }

        navigate('/set-password', {
          state: {
            email,
            verificationToken: response.verificationToken || '',
          },
        });
      } else {
        setError(response?.message || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={
        email ? (
          <span>
            We sent a 6-digit verification code to{' '}
            <strong className="auth-highlight">{email}</strong>
          </span>
        ) : (
          'Please enter the 6-digit verification code sent to your email.'
        )
      }
      footer={
        <p className="auth-footer-text">
          Wrong email or didn't receive code?{' '}
          <Link to="/register" className="auth-link">
            Start over
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

        {!email && (
          <div className="alert alert-warning" role="alert">
            <span>
              No registration email found.{' '}
              <Link to="/register" className="alert-link">
                Click here to register your email first.
              </Link>
            </span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="otp" className="form-label">
            6-digit verification code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            className="form-input otp-input"
            placeholder="······"
            value={otp}
            onChange={handleOtpChange}
            autoFocus
            required
            disabled={isLoading || !email}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={isLoading || otp.length !== 6 || !email}
        >
          {isLoading ? (
            <span className="btn-loading-content">
              <span className="btn-spinner" aria-hidden="true" />
              Verifying code...
            </span>
          ) : (
            'Verify OTP'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
