import React, { useEffect, useState } from 'react';
import apiClient, { errorMessage } from '../api/apiClient';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-4 text-sm py-1 border-b border-white/5 last:border-0">
    <span className="text-slate-400">{label}</span>
    <span className="text-slate-100 font-medium text-right">{value}</span>
  </div>
);

const Card = ({ title, m, children }) => {
  const ok = m.loaded || m.configured;
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {ok ? (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
            <CheckCircle className="w-4 h-4" /> {m.configured !== undefined ? 'Configured' : 'Loaded'}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-400 text-sm font-bold">
            <XCircle className="w-4 h-4" /> Model unavailable
          </span>
        )}
      </div>
      {!ok && m.reason && <p className="text-sm text-red-300 mb-3">Reason: {m.reason}</p>}
      {children}
    </div>
  );
};

const ModelStatus = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ml/status', { timeout: 8000 });
      setData(res.data.models);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, 'Backend unreachable - no models can be reported as loaded.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const d = data?.disease;
  const c = data?.crop;
  const y = data?.yield;
  const g = data?.gemini;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="p-8 lg:p-12 max-w-5xl mx-auto text-slate-100 relative z-10"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white">ML Pipeline Status</h2>
          <p className="text-slate-400 text-sm mt-1">
            Live state of the trained models behind every prediction.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {error && <p className="text-red-300 mb-6">{error}</p>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Disease Model (Deep Learning)" m={d}>
            {d.loaded && (
              <>
                <Row label="Architecture" value={d.type} />
                <Row label="Classes" value={d.num_classes} />
                <Row label="Input" value={d.input_size} />
                <Row label="Device" value={d.device} />
                <Row label="Grad-CAM" value={d.gradcam ? 'Available' : 'Unavailable'} />
                <Row
                  label="Secondary ensemble"
                  value={d.secondary_ensemble?.loaded ? 'Loaded' : 'Not trained'}
                />
                <p className="text-xs text-slate-500 mt-2">{d.secondary_ensemble?.note}</p>
              </>
            )}
          </Card>

          <Card title="Crop Model (Ensemble)" m={c}>
            {c.loaded && (
              <>
                <Row label="Type" value={c.type} />
                {Object.entries(c.members || {}).map(([k, v]) => (
                  <Row
                    key={k}
                    label={`${k.toUpperCase()} (weight ${(c.weights?.[k] ?? 0).toFixed(2)})`}
                    value={`${v} ✓`}
                  />
                ))}
                <Row label="Crop classes" value={c.num_classes} />
                <Row label="Input features" value={c.num_features} />
              </>
            )}
          </Card>

          <Card title="Yield Model (Regression)" m={y}>
            {y.loaded && (
              <>
                <Row label="Type" value={y.type} />
                <Row label="Input features" value={(y.features || []).length} />
                <Row label="States / Crops" value={`${y.num_areas} / ${y.num_crops}`} />
                <Row label="Native output unit" value={y.native_unit} />
                <Row label="API unit" value={`${y.api_unit} (explicit x10,000 conversion)`} />
              </>
            )}
          </Card>

          <Card title="Gemini (Generative AI)" m={g}>
            <Row label="Role" value="Advisory / explanation only" />
            <Row label="API key" value={g.configured ? 'Configured' : 'Missing'} />
            <p className="text-xs text-slate-500 mt-2">
              Gemini never produces a disease, crop or yield prediction.
            </p>
          </Card>
        </div>
      )}
    </motion.div>
  );
};

export default ModelStatus;
