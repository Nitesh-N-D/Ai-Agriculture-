import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

const API_BASE = 'http://127.0.0.1:8000';

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();

  const [farmLocation, setFarmLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_farm_location');
      if (saved !== null) return saved;
      // Default to Coimbatore, Tamil Nadu on initial install
      return 'Coimbatore, Tamil Nadu';
    } catch {
      return 'Coimbatore, Tamil Nadu';
    }
  });

  const [yieldUnit, setYieldUnit] = useState(() => {
    try {
      return localStorage.getItem('smart_farm_yield_unit') || 'tons/ha';
    } catch {
      return 'tons/ha';
    }
  });

  const [tempUnit, setTempUnit] = useState(() => {
    try {
      return localStorage.getItem('smart_farm_temp_unit') || 'celsius';
    } catch {
      return 'celsius';
    }
  });

  const [autoSync, setAutoSync] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_farm_auto_sync');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Synchronize when authenticated user changes
  useEffect(() => {
    if (user) {
      if (user.farm_location !== undefined && user.farm_location !== null) {
        setFarmLocation(user.farm_location);
        try {
          localStorage.setItem('smart_farm_location', user.farm_location);
        } catch {
          // ignore storage error
        }
      }
      if (user.settings) {
        if (user.settings.yieldUnit) setYieldUnit(user.settings.yieldUnit);
        if (user.settings.tempUnit) setTempUnit(user.settings.tempUnit);
        if (user.settings.autoSync !== undefined) setAutoSync(user.settings.autoSync);
      }
    }
  }, [user]);

  const updateSettings = async ({
    farmLocation: newLoc,
    yieldUnit: newYieldUnit,
    tempUnit: newTempUnit,
    autoSync: newAutoSync
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
      // ignore storage error
    }

    // Persist to backend database if user is authenticated
    if (user?.username) {
      try {
        await axios.put(`${API_BASE}/auth/settings`, {
          username: user.username,
          farm_location: loc,
          settings: {
            yieldUnit: yUnit,
            tempUnit: tUnit,
            autoSync: aSync
          }
        });
      } catch (err) {
        console.warn('Could not persist settings to backend profile:', err.message);
      }
    }
  };

  const updateFarmLocation = (loc) => {
    updateSettings({ farmLocation: loc });
  };

  return (
    <SettingsContext.Provider
      value={{
        farmLocation,
        yieldUnit,
        tempUnit,
        autoSync,
        updateSettings,
        updateFarmLocation
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
