import React from 'react';
import { X, AlertTriangle, Droplets, Bug, ThermometerSun, ShieldCheck, Cpu, TrendingDown, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { timeAgo, SEVERITY_STYLE } from '../utils/format';

const ICONS = { weather: ThermometerSun, disease: Bug, yield: TrendingDown, system: Cpu };

const AlertsModal = ({ isOpen, onClose }) => {
  const { isAuthenticated } = useAuth();
  const { alerts, status, error, dashboard, markAlertsSeen, refresh } = useData();
  if (!isOpen) return null;

  const close = () => {
    if (isAuthenticated && alerts.some((a) => a.unread)) markAlertsSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e1c13] border border-[#1a3624] rounded-3xl shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#183120]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Farm Alerts</h2>
              <p className="text-xs text-slate-400">
                Generated from your weather, ML predictions and model status
                {isAuthenticated && status === 'ready' ? ` (${alerts.length} active)` : ''}
              </p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto dash-scroll pr-1">
          {!isAuthenticated && (
            <p className="text-xs text-slate-400 py-6 text-center">Sign in to see alerts for your farm.</p>
          )}
          {isAuthenticated && status === 'loading' && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading alerts...
            </div>
          )}
          {isAuthenticated && status === 'error' && (
            <div className="text-xs text-rose-300 py-4 text-center">
              {error || 'Unable to load alerts.'}{' '}
              <button onClick={refresh} className="underline">Retry</button>
            </div>
          )}
          {isAuthenticated && status === 'ready' && alerts.length === 0 && (
            <div className="text-center py-8">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white font-semibold">No alerts at this time.</p>
              <p className="text-xs text-slate-400 mt-1">Your farm currently has no detected risks.</p>
            </div>
          )}
          {isAuthenticated && status === 'ready' && dashboard?.weather_error && (
            <p className="text-[11px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5">
              Weather alerts unavailable: {dashboard.weather_error}
            </p>
          )}
          {isAuthenticated && alerts.map((a) => {
            const Icon = ICONS[a.type] || Droplets;
            const sty = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.low;
            return (
              <div key={a.id} className={`p-4 rounded-2xl border ${sty.bg} ${sty.border} transition-all`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-black/30 flex-shrink-0">
                    <Icon className={`w-5 h-5 ${sty.text}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-white">
                        {a.title}
                        {a.unread && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle" />}
                      </h3>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(a.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{a.message}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full bg-black/40 font-bold uppercase ${sty.text}`}>{a.severity}</span>
                      <span className="text-[9px] text-slate-500">source: {a.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-[#183120] flex justify-end">
          <button
            onClick={close}
            className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#22c55e] text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all"
          >
            {alerts.some((a) => a.unread) ? 'Mark all as read' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsModal;
