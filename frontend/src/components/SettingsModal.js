import React, { useState, useEffect } from 'react';
import { X, Settings, MapPin } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { LOCATION_GROUPS, ALL_LOCATIONS } from '../config/locations';

// Suggestions come from config/locations.js (grouped by state); any "City, State" can be typed as custom.
const PRESET_LOCATIONS = [{ value: '', label: '-- None (Unconfigured) --' }];

const SettingsModal = ({ isOpen, onClose }) => {
  const {
    farmLocation: savedLocation,
    yieldUnit: savedYieldUnit,
    tempUnit: savedTempUnit,
    autoSync: savedAutoSync,
    updateSettings
  } = useSettings();

  const [selectedPreset, setSelectedPreset] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [yieldUnit, setYieldUnit] = useState('tons/ha');
  const [tempUnit, setTempUnit] = useState('celsius');
  const [autoSync, setAutoSync] = useState(true);

  // Sync state whenever modal opens or saved values change
  useEffect(() => {
    if (isOpen) {
      const loc = savedLocation || '';
      const isPreset = PRESET_LOCATIONS.some((p) => p.value === loc) || ALL_LOCATIONS.includes(loc);
      if (isPreset) {
        setSelectedPreset(loc);
        setIsCustom(false);
        setCustomLocation('');
      } else if (loc) {
        setSelectedPreset('custom');
        setIsCustom(true);
        setCustomLocation(loc);
      } else {
        setSelectedPreset('');
        setIsCustom(false);
        setCustomLocation('');
      }
      setYieldUnit(savedYieldUnit || 'tons/ha');
      setTempUnit(savedTempUnit || 'celsius');
      setAutoSync(savedAutoSync !== undefined ? savedAutoSync : true);
    }
  }, [isOpen, savedLocation, savedYieldUnit, savedTempUnit, savedAutoSync]);

  if (!isOpen) return null;

  const handlePresetChange = (val) => {
    if (val === 'custom') {
      setSelectedPreset('custom');
      setIsCustom(true);
      if (!customLocation && savedLocation) {
        setCustomLocation(savedLocation);
      }
    } else {
      setSelectedPreset(val);
      setIsCustom(false);
    }
  };

  const handleSave = () => {
    const finalLocation = isCustom ? customLocation.trim() : selectedPreset;
    updateSettings({
      farmLocation: finalLocation,
      yieldUnit,
      tempUnit,
      autoSync
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e1c13] border border-[#1a3624] rounded-3xl shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#183120]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Settings className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Farm System Settings</h2>
              <p className="text-xs text-slate-400">Configure regional telemetry, units, and notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Farm Location */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Primary Farm Region / City
            </label>
            <select
              value={isCustom ? 'custom' : selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#122418] border border-[#1e3f2b] text-white focus:outline-none focus:border-emerald-500"
            >
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
              {LOCATION_GROUPS.map((g) => (
                <optgroup key={g.state} label={g.state}>
                  {g.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </optgroup>
              ))}
              <option value="custom">-- Custom Location (Type city / state) --</option>
            </select>

            {isCustom && (
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="e.g. Salem, Tamil Nadu or City, State"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#162c1e] border border-[#234b33] text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <span className="block text-[10px] text-slate-400 mt-1">
                  Enter "City, State" or city name for live telemetry lookup.
                </span>
              </div>
            )}
          </div>

          {/* Units */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Yield Unit</label>
              <select
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#122418] border border-[#1e3f2b] text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="tons/ha">tons / hectare (tons/ha)</option>
                <option value="hg/ha">hectograms / hectare (hg/ha)</option>
                <option value="kg/acre">kilograms / acre (kg/acre)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Temperature</label>
              <select
                value={tempUnit}
                onChange={(e) => setTempUnit(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#122418] border border-[#1e3f2b] text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>

          {/* Sync & Telemetry Toggle */}
          <div className="p-3 rounded-2xl bg-[#122418] border border-[#1e3f2b] flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Automated Soil Telemetry Sync</div>
              <div className="text-[11px] text-slate-400">Stream live weather and soil sensor updates</div>
            </div>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                autoSync ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoSync ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#183120] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#122418] border border-[#1e3f2b] text-slate-300 text-xs font-semibold hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#22c55e] text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
