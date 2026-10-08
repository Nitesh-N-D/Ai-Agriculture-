import axios from 'axios';
import { API_BASE, TOKEN_KEY, UNAUTHORIZED_EVENT } from './config';

/**
 * Shared axios instance: base URL, bearer token, consistent errors.
 * Pages must use this instead of hard-coding http://127.0.0.1:8000.
 */
const apiClient = axios.create({ baseURL: API_BASE, timeout: 30000 });

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // storage unavailable - continue anonymously
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired/invalid session: let AuthContext sign the user out.
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(err);
  }
);

/** Human-readable message for any API failure (401/403/404/422/5xx/network). */
export function errorMessage(err, fallback = 'Something went wrong.') {
  if (!err) return fallback;
  if (!err.response) {
    return err.code === 'ECONNABORTED'
      ? 'The request timed out. The AI backend may be busy.'
      : 'Unable to reach the AI backend. Check that it is running.';
  }
  const { status, data } = err.response;
  const d = data?.detail;
  let msg = (d && typeof d === 'object' && !Array.isArray(d) && d.message) || data?.message || data?.error;
  if (!msg && typeof d === 'string') msg = d;
  if (!msg && Array.isArray(d)) msg = d.map((x) => `${(x.loc || []).slice(-1)[0]}: ${x.msg}`).join('; ');
  if (msg) return typeof msg === 'string' ? msg : JSON.stringify(msg);
  if (status === 401) return 'Please sign in to continue.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'Not found.';
  if (status === 422) return 'Some input values are invalid.';
  if (status === 503) return 'A required ML model is currently unavailable. Check ML Status.';
  return status >= 500 ? 'The server hit an error.' : fallback;
}

export default apiClient;
