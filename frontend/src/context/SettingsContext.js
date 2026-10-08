import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

const readStore = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
};

/**
 * Farm location / units.
 *  - Signed in: the server profile (users table) is the source of truth; it is
 *    what weather, alerts and the dashboard use on the backend.
 *  - Signed out: localStorage is only a per-browser preference; nothing server
 *    side depends on it.
 * There is no hard-coded default city: until a location is chosen it is ''.
 */
export const SettingsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [farmLocation, setFarmLocation] = useState(() => readStore('smart_farm_location', ''));
  const [yieldUnit, setYieldUnit] = useState(() => readStore('smart_farm_yield_unit', 'tons/ha'));
  const [tempUnit, setTempUnit] = useState(() => readStore('smart_farm_temp_unit', 'celsius'));
  const [autoSync, setAutoSync] = useState(() => {
    try {
      return JSON.parse(readStore('smart_farm_auto_sync', 'true'));
    } catch {
      return true;
    }
  });
  // Bumped after the server has stored new settings, so data views can refetch.
  const [settingsVersion, setSettingsVersion] = useState(0);

  // Adopt the server profile when the signed-in user changes.
  useEffect(() => {
    if (!user) return;
    if (user.farm_location !== undefined && user.farm_location !== null) {
      setFarmLocation(user.farm_location);
      try {
        localStorage.setItem('smart_farm_location', user.farm_location);
      } catch {
        // ignore
      }
    }
    if (user.settings) {
      if (user.settings.yieldUnit) setYieldUnit(user.settings.yieldUnit);
      if (user.settings.tempUnit) setTempUnit(user.settings.tempUnit);
      if (user.settings.autoSync !== undefined) setAutoSync(user.settings.autoSync);
    }
  }, [user]);

  const updateSettings = async ({
    farmLocation: newLoc,
    yieldUnit: newYieldUnit,
    tempUnit: newTempUnit,
    autoSync: newAutoSync,
  }) => {
    const loc = newLoc !== undefined ? newLoc.trim() : farmLocation;
    const yUnit = newYieldUnit !== undefined ? newYieldUnit : yieldUnit;
    const tUnit = newTempUnit !== undefined ? newTempUnit : tempUnit;
    const aSync = newAutoSync !== undefined ? newAutoSync : autoSync;

    setFarmLocation(loc);
    setYieldUnit(yUnit);
    setTempUnit(tUnit);
    setAutoSync(aSync);

    try {
      localStorage.setItem('smart_farm_location', loc);
      localStorage.setItem('smart_farm_yield_unit', yUnit);
      localStorage.setItem('smart_farm_temp_unit', tUnit);
      localStorage.setItem('smart_farm_auto_sync', JSON.stringify(aSync));
    } catch {
      // ignore storage errors
    }

    if (isAuthenticated) {
      try {
        // The server identifies the user from the bearer token.
        await apiClient.put('/auth/settings', {
          farm_location: loc,
          settings: { yieldUnit: yUnit, tempUnit: tUnit, autoSync: aSync },
        });
      } catch (err) {
        console.warn('Could not persist settings to backend profile:', err.message);
      }
    }
    setSettingsVersion((v) => v + 1);
  };

  const updateFarmLocation = (loc) => updateSettings({ farmLocation: loc });

  return (
    <SettingsContext.Provider
      value={{
        farmLocation,
        yieldUnit,
        tempUnit,
        autoSync,
        settingsVersion,
        updateSettings,
        updateFarmLocation,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
