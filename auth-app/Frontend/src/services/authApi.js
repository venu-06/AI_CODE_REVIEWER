/**
 * Centralized Authentication API Service
 * Uses credentials: 'include' for cookie-based session/JWT authentication.
 * Proxied via Vite to http://localhost:5000 in development.
 */

async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && data.message) ||
        `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    // If it's already an error from above, rethrow
    if (err.status) {
      throw err;
    }
    // Network or server unreachable error
    const networkError = new Error(
      'Unable to connect to the server. Please ensure the backend is running.'
    );
    networkError.original = err;
    throw networkError;
  }
}

export const authApi = {
  /**
   * Send registration OTP to email
   * @param {{ email: string }} params
   */
  async register({ email }) {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Verify email OTP
   * @param {{ email: string, otp: string }} params
   */
  async verifyOtp({ email, otp }) {
    return request('/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  /**
   * Complete registration and create user password
   * @param {{ email: string, password: string, confirmPassword: string, verificationToken?: string }} params
   */
  async completeRegistration({ email, password, confirmPassword, verificationToken }) {
    const body = {
      email,
      password,
      confirmPassword,
    };
    if (verificationToken) {
      body.verificationToken = verificationToken;
    }
    return request('/api/auth/register/complete', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Login with email and password
   * @param {{ email: string, password: string }} params
   */
  async login({ email, password }) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Get current authenticated user
   */
  async getMe() {
    return request('/api/auth/me', {
      method: 'GET',
    });
  },

  /**
   * Logout user and clear JWT cookie
   */
  async logout() {
    return request('/api/auth/logout', {
      method: 'POST',
    });
  },
};

export default authApi;
