import React from 'react';
import { X, AlertTriangle, Droplets, Bug, ThermometerSun, ShieldCheck } from 'lucide-react';

const AlertsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const alerts = [
    {
      id: 1,
      title: 'Low Soil Moisture Detected',
      desc: 'Sector 3 (Maize Field) moisture dropped to 18%. Irrigation recommended within 6 hours.',
      severity: 'high',
      icon: Droplets,
      time: '12 mins ago',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30'
    },
    {
      id: 2,
      title: 'Fungal Leaf Spot Risk',
      desc: 'High ambient humidity (82%) and warm temperature (28°C) increase Cercospora risk. Preventive neem spray advised.',
      severity: 'moderate',
      icon: Bug,
      time: '1 hour ago',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30'
    },
    {
      id: 3,
      title: 'Temperature Heat Spike Forecast',
      desc: 'Temperature projected to peak at 34°C tomorrow noon. Ensure morning canal watering.',
      severity: 'info',
      icon: ThermometerSun,
      time: '3 hours ago',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30'
    },
    {
      id: 4,
      title: 'Optimal Harvest Window Approaching',
      desc: 'Kharif Maize crop has achieved 91.2% maturity index. Anticipated harvest in 12-14 days.',
      severity: 'success',
      icon: ShieldCheck,
      time: '1 day ago',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e1c13] border border-[#1a3624] rounded-3xl shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#183120]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Active Farm Alerts</h2>
              <p className="text-xs text-slate-400">Real-time agronomic warning triggers (4 active)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto dash-scroll pr-1">
          {alerts.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border ${a.bg} ${a.border} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-black/30 flex-shrink-0">
                    <Icon className={`w-5 h-5 ${a.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white">{a.title}</h3>
                      <span className="text-[10px] text-slate-400">{a.time}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-[#183120] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#22c55e] text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all"
          >
            Acknowledge All
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsModal;
