import React from 'react';
import { X, Clock, Leaf, Sprout, Wheat, Bot, FileText } from 'lucide-react';

const HistoryModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const historyItems = [
    {
      id: 1,
      type: 'Disease Analysis',
      title: 'Leaf image analyzed (Tomato Leaf)',
      details: 'Identified Leaf Spot (Cercospora) with 92.6% confidence.',
      time: '10:25 AM',
      date: 'Today',
      icon: Leaf,
      color: 'text-rose-400 bg-rose-500/20'
    },
    {
      id: 2,
      type: 'Crop Recommendation',
      title: 'Crop recommendation generated',
      details: 'Evaluated N:90 P:42 K:43 pH:6.5 → Maize, Sugarcane, Cotton recommended.',
      time: '09:40 AM',
      date: 'Today',
      icon: Sprout,
      color: 'text-emerald-400 bg-emerald-500/20'
    },
    {
      id: 3,
      type: 'Yield Forecasting',
      title: 'Yield forecast completed',
      details: 'Area: Coimbatore, Tamil Nadu — Maize (Kharif 2025): 2.45 tons/ha.',
      time: '04:15 PM',
      date: 'Yesterday',
      icon: Wheat,
      color: 'text-sky-400 bg-sky-500/20'
    },
    {
      id: 4,
      type: 'AI Agronomist',
      title: 'AI advisory generated',
      details: 'Gemini LLM synthesized fertilizer split schedule and neem oil protocol.',
      time: '02:30 PM',
      date: 'Yesterday',
      icon: Bot,
      color: 'text-amber-400 bg-amber-500/20'
    },
    {
      id: 5,
      type: 'Report Generated',
      title: 'Full Farm Intelligence Audit',
      details: 'Consolidated report generated for Tamil Nadu agriculture board submission.',
      time: '11:00 AM',
      date: 'May 19, 2025',
      icon: FileText,
      color: 'text-purple-400 bg-purple-500/20'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e1c13] border border-[#1a3624] rounded-3xl shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#183120]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Farm Activity History</h2>
              <p className="text-xs text-slate-400">Complete historical record of AI inferences & telemetry</p>
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
          {historyItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-[#122418] border border-[#1b3a26] hover:border-[#285739] transition-all flex items-start gap-3.5"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{item.details}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/40 text-emerald-300 font-medium">
                      {item.type}
                    </span>
                    <span className="text-[9px] text-slate-500">{item.date}</span>
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
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
