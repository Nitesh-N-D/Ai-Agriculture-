import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient, { errorMessage } from '../api/apiClient';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

const DataContext = createContext(null);

const REFRESH_MS = 5 * 60 * 1000; // weather-driven alerts change slowly; no aggressive polling

/**
 * One shared copy of the signed-in user's /dashboard payload (predictions,
 * statistics, charts, alerts, weather, model status).  Pages call refresh()
 * after a successful prediction so the dashboard, history and the alert badge
 * all update without a manual reload.
 *
 * status: 'anonymous' | 'loading' | 'ready' | 'error'
 */
export const DataProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { settingsVersion } = useSettings();

  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState('anonymous');
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0); // bumped on every successful load (history refetches on it)
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setDashboard(null);
      setStatus('anonymous');
      return;
    }
    const id = ++reqId.current;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const { data } = await apiClient.get('/dashboard');
      if (id !== reqId.current) return; // a newer request superseded this one
      setDashboard(data);
      setError(null);
      setStatus('ready');
      setVersion((v) => v + 1);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(errorMessage(err, 'Unable to load dashboard data.'));
      setStatus((s) => (s === 'ready' ? 'ready' : 'error')); // keep showing last good data
    }
  }, [isAuthenticated]);

  // Initial load + whenever the account or saved farm location changes.
  useEffect(() => {
    setDashboard(null);
    load();
  }, [load, user?.id, settingsVersion]);

  // Gentle periodic refresh while signed in.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, load]);

  const markAlertsSeen = useCallback(async () => {
    try {
      await apiClient.post('/alerts/seen');
      setDashboard((d) =>
        d ? { ...d, unread_alerts: 0, alerts: d.alerts.map((a) => ({ ...a, unread: false })) } : d
      );
    } catch {
      // badge simply stays; not critical
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        dashboard,
        status,
        error,
        version,
        refresh: load,
        markAlertsSeen,
        unreadAlerts: dashboard?.unread_alerts ?? 0,
        alerts: dashboard?.alerts ?? [],
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};
