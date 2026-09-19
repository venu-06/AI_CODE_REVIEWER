/**
 * Persistent Review & Dashboard API Client
 * Uses credentials: 'include' for HttpOnly JWT authentication
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
    if (err.status) {
      throw err;
    }
    const networkError = new Error(
      'Unable to connect to the backend server. Please make sure it is running.'
    );
    networkError.original = err;
    throw networkError;
  }
}

export const reviewPersistenceApi = {
  /**
   * Fetch aggregated dashboard statistics
   * @param {number} days
   */
  async getDashboardData(days = 30) {
    return request(`/api/reviews/dashboard?days=${days}`);
  },

  /**
   * Fetch all saved reviews for current user
   * @param {string} search
   */
  async getReviews(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/api/reviews${query}`);
  },

  /**
   * Fetch single review by ID
   * @param {string} id
   */
  async getReview(id) {
    return request(`/api/reviews/${id}`);
  },

  /**
   * Create a new review document
   * @param {{ title?: string, fileName?: string, language?: string, sourceCode?: string, juniorMode?: boolean }} payload
   */
  async createReview(payload = {}) {
    return request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update review document (autosave or metadata update)
   * @param {string} id
   * @param {{ title?: string, fileName?: string, language?: string, sourceCode?: string, juniorMode?: boolean }} payload
   */
  async updateReview(id, payload) {
    return request(`/api/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a review
   * @param {string} id
   */
  async deleteReview(id) {
    return request(`/api/reviews/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Run AI analysis on an existing review document
   * @param {string} id
   * @param {{ sourceCode?: string, language?: string, juniorMode?: boolean }} payload
   */
  async analyzeReview(id, payload = {}) {
    return request(`/api/reviews/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Ask Copilot a question with review context
   * @param {string} id
   * @param {{ question: string }} payload
   */
  async chatWithReview(id, { question }) {
    return request(`/api/reviews/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },
};

export default reviewPersistenceApi;
