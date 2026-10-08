// Single source of truth for the backend address.
// Create React App exposes env vars prefixed REACT_APP_ (set in frontend/.env).
export const API_BASE =
  (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export const TOKEN_KEY = 'smart_farm_token';
export const UNAUTHORIZED_EVENT = 'sfa:unauthorized';
