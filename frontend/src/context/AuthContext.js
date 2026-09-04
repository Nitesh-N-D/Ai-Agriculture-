import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = 'http://127.0.0.1:8000';

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
    return localStorage.getItem('smart_farm_token') || null;
  });

  useEffect(() => {
    if (user && token) {
      localStorage.setItem('smart_farm_user', JSON.stringify(user));
      localStorage.setItem('smart_farm_token', token);
    } else {
      localStorage.removeItem('smart_farm_user');
      localStorage.removeItem('smart_farm_token');
    }
  }, [user, token]);

  const login = async (username, password) => {
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, {
        username: username.trim(),
        password: password
      });

      if (data.status === 'success') {
        setUser(data.user);
        setToken(data.token);
        return { success: true, user: data.user, message: data.message };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'Login failed';
      return { success: false, message: msg };
    }
  };

  const register = async (username, password, fullName = '') => {
    try {
      const { data } = await axios.post(`${API_BASE}/auth/register`, {
        username: username.trim(),
        password: password,
        full_name: fullName.trim()
      });

      if (data.status === 'success') {
        setUser(data.user);
        setToken(data.token);
        return { success: true, user: data.user, message: data.message };
      }
      return { success: false, message: data.message || 'Sign up failed' };
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.message || err.message || 'Sign up failed';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('smart_farm_user');
    localStorage.removeItem('smart_farm_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        logout
      }}
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
