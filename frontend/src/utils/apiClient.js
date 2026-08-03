const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function getAuthToken() {
  try {
    return (
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token') ||
      null
    );
  } catch {
    return null;
  }
}

function buildHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getAuthToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export const apiClient = {
  async post(url, body) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: buildHeaders({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data?.message || 'Request failed');
      err.response = {
        data,
        status: res.status
      };
      throw err;
    }

    return { data };
  }
};