import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { errorMessage } from '../api/apiClient';
import { TOKEN_KEY, UNAUTHORIZED_EVENT } from '../api/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('smart_farm_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user && token) {
        localStorage.setItem('smart_farm_user', JSON.stringify(user));
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem('smart_farm_user');
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // storage unavailable
    }
  }, [user, token]);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('smart_farm_user');
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }, []);

  // The API client fires this when the server rejects our token (expired / revoked).
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, clearSession);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, clearSession);
  }, [clearSession]);

  const authenticate = async (path, body, failMsg) => {
    try {
      const { data } = await apiClient.post(path, body);
      if (data.status === 'success') {
        // Store the token first so the very next request is already authenticated.
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
        setUser(data.user);
        setToken(data.token);
        return { success: true, user: data.user, message: data.message };
      }
      return { success: false, message: data.message || failMsg };
    } catch (err) {
      return { success: false, message: errorMessage(err, failMsg) };
    }
  };

  const login = (username, password) =>
    authenticate('/auth/login', { username: username.trim(), password }, 'Login failed');

  const register = (username, password, fullName = '') =>
    authenticate(
      '/auth/register',
      { username: username.trim(), password, full_name: fullName.trim() },
      'Sign up failed'
    );

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // the local session is cleared regardless
    }
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user && !!token, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
