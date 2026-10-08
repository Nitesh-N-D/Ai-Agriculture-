import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { prettyLabel, formatDateTime, timeAgo, convertYield, formatYield } from '../utils/format';
import {
  Leaf, Sprout, Wheat, Sparkles, MessageSquare, Clock, Eye, Upload, Database, Cpu, Activity,
  FileText, Loader2, CloudSun, AlertCircle, LogIn,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell,
} from 'recharts';

// Chart styling only (not data).
const PIE_COLORS = ['#ef4444', '#f59e0b', '#06b6d4', '#22c55e', '#a855f7', '#ec4899', '#84cc16', '#64748b'];
const TOOLTIP_STYLE = {
  backgroundColor: '#0e1c13', borderColor: '#1e3f2b', borderRadius: '0.75rem', fontSize: '11px', color: '#fff',
};
const ACTIVITY = {
  disease: { icon: Leaf, cls: 'bg-sky-500/20 text-sky-400', title: 'Leaf analysed' },
  crop: { icon: Sprout, cls: 'bg-amber-500/20 text-amber-400', title: 'Crop recommendation' },
  yield: { icon: Wheat, cls: 'bg-emerald-500/20 text-emerald-400', title: 'Yield forecast' },
  report: { icon: FileText, cls: 'bg-purple-500/20 text-purple-400', title: 'Farm report' },
};

const Empty = ({ title, hint, action }) => (
  <div className="py-6 text-center">
    <p className="text-sm font-semibold text-white">{title}</p>
    {hint && <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{hint}</p>}
    {action}
  </div>
);

const Dashboard = ({ onOpenHistory }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { yieldUnit } = useSettings();
  const { isAuthenticated } = useAuth();
  const { dashboard: d, status, error, refresh } = useData();

  const unitInfo = convertYield(1, yieldUnit);
  const unitLabel = unitInfo ? unitInfo.unit : 'tons/ha';

  // Chart data is derived from the API response only.
  const yieldSeries = useMemo(() => {
    if (!d) return [];
    return d.yield_history.map((y, i) => ({
      label: new Date(y.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      name: `${y.crop || y.label} · ${y.state || ''} ${y.season || ''} ${y.year || ''}`.trim(),
      yield: Number(convertYield(y.yield_hg_ha, yieldUnit).value.toFixed(3)),
      i,
    }));
  }, [d, yieldUnit]);

  const yearSeries = useMemo(() => {
    if (!d) return [];
    return d.yield_by_year.map((y) => ({
      year: String(y.year),
      yield: Number(convertYield(y.avg_yield_t_ha * 10000, yieldUnit).value.toFixed(3)),
      count: y.count,
    }));
  }, [d, yieldUnit]);

  const pieData = useMemo(
    () => (d ? d.disease_distribution.map((x, i) => ({
      name: prettyLabel(x.disease), value: x.count, pct: x.percentage, color: PIE_COLORS[i % PIE_COLORS.length],
    })) : []),
    [d]
  );

  // ── Gate states ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="dash-card p-10 max-w-xl mx-auto text-center mt-10">
        <LogIn className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">{t('dash_signin_title', 'Sign in to see your farm dashboard')}</h2>
        <p className="text-xs text-slate-400 mt-2">
          {t('dash_signin_hint', 'Your predictions, history, charts and alerts are saved to your account.')}
        </p>
        <Link to="/login" className="dash-btn-primary inline-block mt-5 px-6 py-2.5 text-xs">{t('dash_signin_btn', 'Sign in / Create account')}</Link>
      </div>
    );
  }
  if (status === 'loading' || (status === 'anonymous') || (!d && status !== 'error')) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-24">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('dash_loading', 'Loading dashboard...')}
      </div>
    );
  }
  if (!d) {
    return (
      <div className="dash-card p-10 max-w-xl mx-auto text-center mt-10">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">{t('dash_error_title', 'Unable to load dashboard data.')}</h2>
        <p className="text-xs text-slate-400 mt-2">{error || 'Check that the AI backend is running.'}</p>
        <button onClick={refresh} className="dash-btn-primary mt-5 px-6 py-2.5 text-xs">{t('dash_retry', 'Retry')}</button>
      </div>
    );
  }

  const ld = d.latest_predictions.disease;
  const lc = d.latest_predictions.crop;
  const ly = d.latest_predictions.yield;
  const cropRows = lc?.result?.top_recommendations || [];
  const ms = d.model_status;
  const ev = d.model_evaluation || {};
  const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);

  const StatusRow = ({ icon: Icon, label, m, extra }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-300">
        <Icon className="w-4 h-4 text-slate-400" />
        <span>{label}</span>
      </div>
      {m ? (
        <span className={`${m.loaded || m.configured ? 'text-emerald-400' : 'text-rose-400'} font-semibold flex items-center gap-1.5 text-right`}>
          <span className={`w-1.5 h-1.5 rounded-full ${m.loaded || m.configured ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          {m.loaded || m.configured ? (extra || 'Loaded') : 'Unavailable'}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {status === 'error' && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          {error} Showing the last data that loaded. <button onClick={refresh} className="underline">Retry</button>
        </div>
      )}

      {/* ═══ ROW 1: DISEASE, CROP, YIELD (latest real predictions) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Latest disease */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_disease_title')}</h2>
              <button onClick={() => navigate('/disease')} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                {t('dash_view_all')}
              </button>
            </div>
            {!ld ? (
              <Empty
                title={t('dash_no_disease', 'No disease predictions yet.')}
                hint={t('dash_no_disease_hint', 'Upload a leaf image to start disease detection.')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {ld.result?.thumbnail ? (
                  <div className="rounded-2xl overflow-hidden border border-[#1f422b] bg-[#070e09] aspect-square max-w-[200px] mx-auto sm:mx-0 relative">
                    <img src={`data:image/jpeg;base64,${ld.result.thumbnail}`} alt="Grad-CAM of the analysed leaf" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-emerald-300">Grad-CAM</span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#1f422b] bg-[#070e09] aspect-square max-w-[200px] mx-auto sm:mx-0 flex items-center justify-center text-[11px] text-slate-500 text-center p-3">
                    No Grad-CAM image for this prediction
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-400">{t('dash_disease_label')}</div>
                    <div className="text-base font-bold text-[#ef4444] break-words">{prettyLabel(ld.label)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{t('dash_confidence')}</div>
                    <div className="text-sm font-bold text-white">{ld.confidence != null ? `${ld.confidence.toFixed(1)}%` : '—'}</div>
                  </div>
                  {ld.result?.severity?.level && (
                    <div>
                      <div className="text-[11px] text-slate-400">{t('dash_severity')}</div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {ld.result.severity.level}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] text-slate-400">{t('dash_detected_on')}</div>
                    <div className="text-xs text-slate-300">{formatDateTime(ld.timestamp)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Model: {ld.model}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5 pt-3 border-t border-[#183120]">
            <button onClick={() => navigate('/disease')} className="dash-btn-secondary py-2 px-3 text-xs text-center flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" /><span>{t('dash_view_details')}</span>
            </button>
            <button onClick={() => navigate('/disease')} className="dash-btn-secondary py-2 px-3 text-xs text-center flex items-center justify-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-400" /><span>{t('dash_upload_new')}</span>
            </button>
          </div>
        </div>

        {/* 2. Latest crop recommendation (ensemble probabilities) */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_crop_title')}</h2>
              <button onClick={() => navigate('/crop')} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                {t('dash_view_all')}
              </button>
            </div>
            {!lc ? (
              <Empty
                title={t('dash_no_crop', 'No crop recommendations yet.')}
                hint={t('dash_no_crop_hint', 'Enter soil and weather values to get a recommendation.')}
              />
            ) : (
              <>
                <div className="grid grid-cols-12 text-[11px] font-medium text-slate-400 pb-2 border-b border-[#183120]">
                  <span className="col-span-5">{t('dash_crop_col_crop')}</span>
                  <span className="col-span-3">Probability</span>
                  <span className="col-span-4">{t('dash_crop_col_suitability')}</span>
                </div>
                <div className="space-y-4 mt-3">
                  {cropRows.map((r) => (
                    <div key={r.crop} className="grid grid-cols-12 items-center text-xs">
                      <div className="col-span-5 flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white capitalize">{r.crop}</span>
                      </div>
                      <div className="col-span-3 font-semibold text-slate-200">{r.confidence}%</div>
                      <div className="col-span-4">
                        <div className="h-2 w-full bg-[#16291d] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, r.confidence)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-[10px] text-slate-500 leading-relaxed">
                  Based on N {lc.inputs.N}, P {lc.inputs.P}, K {lc.inputs.K}, {lc.inputs.temperature}°C,
                  {' '}{lc.inputs.humidity}% humidity, pH {lc.inputs.ph}, {lc.inputs.rainfall} mm rain
                  · {formatDateTime(lc.timestamp)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Model: {lc.model}</div>
              </>
            )}
          </div>
          <div className="mt-6 pt-3 border-t border-[#183120]">
            <button onClick={() => navigate('/crop')} className="dash-btn-primary w-full py-2.5 text-xs text-center">
              {t('dash_btn_get_rec')}
            </button>
          </div>
        </div>

        {/* 3. Latest yield forecast */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_yield_title')}</h2>
              <button onClick={() => navigate('/yield')} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
                {t('dash_view_details')}
              </button>
            </div>
            {!ly ? (
              <Empty
                title={t('dash_no_yield', 'No yield forecasts yet.')}
                hint={t('dash_no_yield_hint', 'Run a yield prediction to build your trend chart.')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-5 space-y-2 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">{t('dash_yield_predicted')}</div>
                    <div className="text-lg font-bold text-white">{formatYield(ly.value, yieldUnit)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Yield level</div>
                    <div className="font-semibold text-emerald-400">{ly.result?.yield_level || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">{t('dash_yield_area')}</div>
                    <div className="text-slate-300 font-medium text-[11px] truncate">{ly.result?.area}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <div>
                      <div className="text-[10px] text-slate-400">{t('dash_yield_crop')}</div>
                      <div className="text-slate-200 font-semibold text-[11px]">{ly.result?.crop}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">{t('dash_yield_season')}</div>
                      <div className="text-slate-200 font-semibold text-[11px]">{ly.result?.season} {ly.result?.year}</div>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-7 h-36 w-full">
                  <div className="text-right text-[10px] text-slate-500 mb-1">{unitLabel}</div>
                  {yieldSeries.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={yieldSeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <XAxis dataKey="label" stroke="#4b5563" fontSize={10} tickLine={false} />
                        <YAxis domain={['auto', 'auto']} stroke="#4b5563" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} ${unitLabel}`, 'Yield']} labelFormatter={(_, p) => p?.[0]?.payload?.name || ''} />
                        <Line type="monotone" dataKey="yield" stroke="#22c55e" strokeWidth={2.5}
                          dot={{ r: 3, fill: '#22c55e', stroke: '#14532d', strokeWidth: 1.5 }}
                          activeDot={{ r: 5, fill: '#4ade80', stroke: '#ffffff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[11px] text-slate-500 pt-6 text-center">Not enough prediction history yet. Make more yield predictions to see trends.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-[#183120] flex items-center justify-between text-[11px] text-slate-400">
            <span>{ly ? `Model: ${ly.model}` : t('dash_yield_model')}</span>
            {ev.yield && <span className="text-emerald-400 font-medium">{ev.yield.metric}: {ev.yield.value}</span>}
          </div>
        </div>
      </div>

      {/* ═══ ROW 2: ADVISORY (explains stored ML results), RECENT ACTIVITY ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 dash-card-header">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white">{t('dash_advisory_title')}</h2>
            </div>
            {d.advisory.length === 0 ? (
              <Empty
                title={t('dash_no_advisory', 'No advisory yet.')}
                hint={t('dash_no_advisory_hint', 'Advice appears here after you run a prediction.')}
              />
            ) : (
              <div className="space-y-3">
                {d.advisory.map((a) => (
                  <div key={a.kind} className="p-3 rounded-xl bg-[#122418] border border-[#1b3a26]">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                      <span>{prettyLabel(a.title)}</span>
                      <span className="text-[9px] font-normal text-slate-500">{timeAgo(a.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">{a.text}</p>
                    <p className="text-[9px] text-slate-500 mt-1">{a.source}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5 pt-3 border-t border-[#183120]">
            <button onClick={() => navigate('/farm-assistant')} className="dash-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" /><span>{t('dash_btn_ask_ai')}</span>
            </button>
          </div>
        </div>

        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_recent_activity')}</h2>
              <span className="text-[10px] text-slate-500">{d.statistics.total} total predictions</span>
            </div>
            {d.recent_activity.length === 0 ? (
              <Empty title={t('dash_no_activity', 'No predictions yet.')} hint={t('dash_no_activity_hint', 'Your activity will appear here.')} />
            ) : (
              <div className="space-y-4">
                {d.recent_activity.map((ev2) => {
                  const m = ACTIVITY[ev2.type] || ACTIVITY.report;
                  const Icon = m.icon;
                  const sub = ev2.type === 'yield' ? `${ev2.label}: ${formatYield(ev2.value, yieldUnit)}`
                    : ev2.type === 'disease' ? `${prettyLabel(ev2.label)}${ev2.confidence != null ? ` · ${ev2.confidence.toFixed(1)}%` : ''}`
                    : ev2.type === 'crop' ? `${ev2.label}${ev2.confidence != null ? ` · ${ev2.confidence.toFixed(1)}%` : ''}`
                    : ev2.label;
                  return (
                    <div key={ev2.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${m.cls}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate">{m.title}</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{timeAgo(ev2.timestamp)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-5 pt-3 border-t border-[#183120] text-center">
            <button onClick={() => onOpenHistory && onOpenHistory()} className="text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors">
              {t('dash_view_all_history')}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: DISTRIBUTION, YEARLY TREND, SYSTEM ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dash-card p-5">
          <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
            <h2 className="text-sm font-bold text-white">{t('dash_disease_dist')}</h2>
          </div>
          {pieData.length === 0 ? (
            <Empty title={t('dash_no_disease', 'No disease predictions yet.')} hint={t('dash_no_disease_hint', 'Upload a leaf image to start disease detection.')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-6 relative h-40 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="#0e1c13" strokeWidth={2} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-white">{d.statistics.disease}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t('dash_total')}</span>
                </div>
              </div>
              <div className="sm:col-span-6 space-y-2.5 text-xs">
                {pieData.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                      <span className="text-slate-300 truncate">{e.name}</span>
                    </div>
                    <span className="font-semibold text-slate-200 flex-shrink-0">{e.pct}% ({e.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dash-card p-5">
          <div className="flex items-center justify-between pb-2 mb-2 dash-card-header">
            <h2 className="text-sm font-bold text-white">{t('dash_yield_trend')}</h2>
            <div className="text-[10px] text-slate-500">{unitLabel}</div>
          </div>
          <div className="h-44 w-full">
            {yearSeries.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearSeries} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yieldGreenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" stroke="#4b5563" fontSize={10} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#4b5563" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, _n, p) => [`${v} ${unitLabel} (avg of ${p.payload.count})`, 'Yield']} />
                  <Area type="monotone" dataKey="yield" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#yieldGreenGradient)"
                    dot={{ r: 3, fill: '#22c55e', stroke: '#14532d', strokeWidth: 1.5 }} activeDot={{ r: 5, fill: '#4ade80', stroke: '#ffffff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty title={t('dash_no_trend', 'Not enough prediction history yet.')} hint={t('dash_no_trend_hint', 'Make yield predictions for different years to see trends.')} />
            )}
          </div>
        </div>

        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_system_status')}</h2>
              <button onClick={() => navigate('/ml-status')} className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">Details</button>
            </div>
            <div className="space-y-3.5 text-xs">
              <StatusRow icon={Cpu} label="Disease CNN" m={ms.disease} extra={ms.disease.type} />
              <StatusRow icon={Database} label="Crop ensemble" m={ms.crop} extra="RF + XGB + LGBM" />
              <StatusRow icon={Activity} label="Yield model" m={ms.yield} extra="XGBoost" />
              <StatusRow icon={Sparkles} label="Gemini advisor" m={ms.gemini} extra="Configured" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-slate-300">
                  <CloudSun className="w-4 h-4 text-slate-400" /><span>Weather</span>
                </div>
                {d.weather ? (
                  <span className="text-slate-200 font-medium text-right">
                    {d.weather.temperature}°C · {d.weather.condition} · {d.weather.humidity}% RH
                  </span>
                ) : (
                  <span className="text-amber-300 text-right">Unavailable</span>
                )}
              </div>
              {d.weather && <div className="text-[10px] text-slate-500 text-right -mt-2">{d.weather.location} ({d.weather.source})</div>}
              {!d.weather && d.weather_error && <div className="text-[10px] text-slate-500 text-right -mt-2">{d.weather_error}</div>}
            </div>
            {Object.keys(ev).length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#183120] text-[10px] text-slate-500 space-y-0.5">
                <div className="uppercase tracking-wider text-slate-400 mb-1">Model evaluation (held-out, not prediction confidence)</div>
                {ev.disease && <div>Disease {ev.disease.metric}: <span className="text-slate-300">{pct(ev.disease.value)}</span></div>}
                {ev.crop && <div>Crop {ev.crop.metric}: <span className="text-slate-300">{pct(ev.crop.value)}</span></div>}
                {ev.yield && <div>Yield {ev.yield.metric}: <span className="text-slate-300">{ev.yield.value}</span></div>}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-[#183120] flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" /><span>{t('dash_last_updated')}</span>
            </div>
            <span className="text-slate-300 font-medium">{formatDateTime(d.last_updated)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
