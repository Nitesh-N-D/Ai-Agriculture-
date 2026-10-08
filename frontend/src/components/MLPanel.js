import React from 'react';
import { Cpu } from 'lucide-react';

/**
 * Small "ML pipeline" card shown under every prediction so it is obvious
 * which trained model produced the number (and that Gemini only explains it).
 * rows: [{ label, value }]  - rows with empty values are skipped.
 */
const MLPanel = ({ title, rows }) => {
  const visible = (rows || []).filter(
    (r) => r.value !== undefined && r.value !== null && r.value !== ''
  );
  if (visible.length === 0) return null;
  return (
    <div className="mt-6 w-full rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 relative z-10">
      <h4 className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-widest mb-3 border-b border-sky-500/20 pb-2">
        <Cpu className="w-4 h-4" /> {title}
      </h4>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {visible.map((r, i) => (
          <div key={i} className="flex justify-between gap-3">
            <dt className="text-slate-400">{r.label}</dt>
            <dd className="text-slate-100 font-semibold text-right">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[10px] text-slate-500 mt-3">
        Prediction produced by the trained model. Generative AI only explains the result.
      </p>
    </div>
  );
};

export default MLPanel;
