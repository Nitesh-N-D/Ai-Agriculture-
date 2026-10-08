import React, { useEffect, useState } from 'react';
import { X, Clock, Leaf, Sprout, Wheat, FileText, Loader2 } from 'lucide-react';
import apiClient, { errorMessage } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { prettyLabel, formatDateTime, formatYield } from '../utils/format';

const TYPES = {
  disease: { label: 'Disease Analysis', icon: Leaf, color: 'text-rose-400 bg-rose-500/20' },
  crop: { label: 'Crop Recommendation', icon: Sprout, color: 'text-emerald-400 bg-emerald-500/20' },
  yield: { label: 'Yield Forecast', icon: Wheat, color: 'text-sky-400 bg-sky-500/20' },
  report: { label: 'Farm Report', icon: FileText, color: 'text-purple-400 bg-purple-500/20' },
};
const FILTERS = [['', 'All'], ['disease', 'Disease'], ['crop', 'Crop'], ['yield', 'Yield'], ['report', 'Report']];

const describe = (item, yieldUnit) => {
  switch (item.type) {
    case 'disease':
      return `${prettyLabel(item.label)}${item.confidence != null ? ` · ${item.confidence.toFixed(1)}% confidence` : ''}`;
    case 'crop':
      return `${item.label}${item.confidence != null ? ` · ${item.confidence.toFixed(1)}% ensemble probability` : ''}`;
    case 'yield':
      return `${item.label} (${item.inputs?.season || ''} ${item.inputs?.year || ''}): ${formatYield(item.value, yieldUnit)}`;
    default:
      return item.value != null ? `${item.label} · ${formatYield(item.value, yieldUnit)}` : item.label;
  }
};

const HistoryModal = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAuth();
  const { version } = useData();
  const { yieldUnit } = useSettings();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refetch when opened, when the filter changes, and after any new prediction (version bump).
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return undefined;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/history', { params: { limit: 30, ...(filter ? { type: filter } : {}) } })
      .then(({ data }) => {
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(errorMessage(e, 'Unable to load history.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, isAuthenticated, filter, version]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e1c13] border border-[#1a3624] rounded-3xl shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 mb-3 border-b border-[#183120]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Prediction History</h2>
              <p className="text-xs text-slate-400">Your stored ML predictions, newest first</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAuthenticated && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {FILTERS.map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  filter === val ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-[#1b3a26] text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 max-h-[55vh] overflow-y-auto dash-scroll pr-1">
          {!isAuthenticated && <p className="text-xs text-slate-400 py-6 text-center">Sign in to keep a history of your predictions.</p>}
          {isAuthenticated && loading && items.length === 0 && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading history...
            </div>
          )}
          {isAuthenticated && error && <p className="text-xs text-rose-300 py-4 text-center">{error}</p>}
          {isAuthenticated && !loading && !error && items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-white font-semibold">No predictions yet.</p>
              <p className="text-xs text-slate-400 mt-1">Run a disease scan, crop recommendation or yield forecast to start your history.</p>
            </div>
          )}
          {isAuthenticated && items.map((item) => {
            const meta = TYPES[item.type] || TYPES.report;
            const Icon = meta.icon;
            return (
              <div key={item.id} className="p-3.5 rounded-2xl bg-[#122418] border border-[#1b3a26] hover:border-[#285739] transition-all flex items-start gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white truncate">{meta.label}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{formatDateTime(item.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{describe(item, yieldUnit)}</p>
                  {item.model && (
                    <div className="mt-1.5">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/40 text-emerald-300 font-medium">{item.model}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-[#183120] flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#22c55e] text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all">
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
