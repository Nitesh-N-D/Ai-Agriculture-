import React, { useState } from 'react';
import { X, Settings, MapPin } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  const [farmLocation, setFarmLocation] = useState('Coimbatore, Tamil Nadu');
  const [yieldUnit, setYieldUnit] = useState('tons/ha');
  const [tempUnit, setTempUnit] = useState('celsius');
  const [autoSync, setAutoSync] = useState(true);

  if (!isOpen) return null;

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
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Primary Farm Region
            </label>
            <select
              value={farmLocation}
              onChange={(e) => setFarmLocation(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#122418] border border-[#1e3f2b] text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Coimbatore, Tamil Nadu">Coimbatore, Tamil Nadu</option>
              <option value="Thanjavur, Tamil Nadu">Thanjavur, Tamil Nadu</option>
              <option value="Madurai, Tamil Nadu">Madurai, Tamil Nadu</option>
              <option value="Erode, Tamil Nadu">Erode, Tamil Nadu</option>
              <option value="Guntur, Andhra Pradesh">Guntur, Andhra Pradesh</option>
              <option value="Mandya, Karnataka">Mandya, Karnataka</option>
            </select>
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
            className="px-4 py-2 rounded-xl bg-[#122418] border border-[#1e3f2b] text-slate-300 text-xs font-semibold hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
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
