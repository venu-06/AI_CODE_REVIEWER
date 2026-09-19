/**
 * AI Code Review API Client
 * Sends requests with credentials: 'include'
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

export const reviewApi = {
  /**
   * Submit code for AI review
   * @param {{ code: string, language?: string, juniorMode?: boolean }} params
   */
  async reviewCode({ code, language = 'auto', juniorMode = false }) {
    return request('/api/review', {
      method: 'POST',
      body: JSON.stringify({ code, language, juniorMode }),
    });
  },

  /**
   * Ask follow-up question to the code copilot
   * @param {{ code: string, language?: string, review: object, refactoredCode: string, question: string }} params
   */
  async askAboutCode({ code, language = 'auto', review, refactoredCode, question }) {
    return request('/api/review/chat', {
      method: 'POST',
      body: JSON.stringify({
        code,
        language,
        review,
        refactoredCode,
        question,
      }),
    });
  },
};

export default reviewApi;
