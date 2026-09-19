/**
 * Centralized Compiler API Service
 * Communicates with /api/compile using credentials: 'include' for authenticated execution.
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
        (data && data.stderr) ||
        (data && data.message) ||
        `Compiler request failed with status ${response.status}`;
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
      'Could not connect to the compiler server. Please ensure the backend is running.'
    );
    networkError.original = err;
    throw networkError;
  }
}

export const compilerApi = {
  /**
   * Execute/Compile code via OneCompiler API backend proxy
   * @param {{ code: string, language: string, stdin?: string }} params
   */
  async compileCode({ code, language, stdin = '' }) {
    return request('/api/compile', {
      method: 'POST',
      body: JSON.stringify({
        code,
        language,
        stdin,
      }),
    });
  },
};

export default compilerApi;
