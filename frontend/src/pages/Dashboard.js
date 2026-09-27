import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import {
  Leaf, Sprout, Wheat, Sparkles, MessageSquare, Clock, Eye, Upload, Database, Cpu, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';

const Dashboard = ({ onOpenHistory }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { farmLocation } = useSettings();

  // Season yield trend data (May to Sep)
  const seasonYieldData = [
    { month: 'May', yield: 0.8 },
    { month: 'Jun', yield: 1.2 },
    { month: 'Jul', yield: 1.6 },
    { month: 'Aug', yield: 2.1 },
    { month: 'Sep', yield: 2.45 },
  ];

  // 6 seasons yield historical trend (2020 to 2025)
  const multiYearYieldData = [
    { year: '2020', yield: 1.2 },
    { year: '2021', yield: 1.5 },
    { year: '2022', yield: 1.6 },
    { year: '2023', yield: 1.9 },
    { year: '2024', yield: 2.15 },
    { year: '2025', yield: 2.45 },
  ];

  // Disease distribution data for donut
  const diseaseDistData = [
    { name: t('dash_disease_leaf_spot'), value: 40, count: 2, color: '#ef4444' },
    { name: t('dash_blight'), value: 33, count: 1, color: '#f59e0b' },
    { name: t('dash_powdery_mildew'), value: 27, count: 1, color: '#06b6d4' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ══════════════════════════════════════════════════════════════
          MAIN CARDS ROW 1 (DISEASE, CROP, YIELD)
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. AI Disease Detection (Latest) */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_disease_title')}</h2>
              <button
                onClick={() => navigate('/disease')}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {t('dash_view_all')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Leaf Image with Detection Bounding Box */}
              <div className="relative rounded-2xl overflow-hidden border border-[#1f422b] bg-[#070e09] aspect-square max-w-[200px] mx-auto sm:mx-0">
                <img
                  src="/assets/crop_leaf_disease.jpg"
                  alt="Crop Leaf Disease Scan"
                  className="w-full h-full object-cover"
                />
                {/* Visual Bounding Box Indicator */}
                <div className="absolute top-[35%] left-[32%] w-[38%] h-[38%] border-2 border-emerald-400 rounded-lg shadow-[0_0_12px_rgba(52,211,153,0.7)] pointer-events-none">
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white" />
                </div>
              </div>

              {/* Disease Metadata */}
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-slate-400">{t('dash_disease_label')}</div>
                  <div className="text-base font-bold text-[#ef4444]">{t('dash_disease_leaf_spot')}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{t('dash_confidence')}</div>
                  <div className="text-sm font-bold text-white">92.6%</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{t('dash_severity')}</div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {t('dash_moderate')}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{t('dash_detected_on')}</div>
                  <div className="text-xs text-slate-300">May 21, 2025</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-3 border-t border-[#183120]">
            <button
              onClick={() => navigate('/disease')}
              className="dash-btn-secondary py-2 px-3 text-xs text-center flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('dash_view_details')}</span>
            </button>
            <button
              onClick={() => navigate('/disease')}
              className="dash-btn-secondary py-2 px-3 text-xs text-center flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('dash_upload_new')}</span>
            </button>
          </div>
        </div>

        {/* 2. Top 3 Crop Recommendations */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_crop_title')}</h2>
              <button
                onClick={() => navigate('/crop')}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {t('dash_view_all')}
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] font-medium text-slate-400 pb-2 border-b border-[#183120]">
              <span className="col-span-5">{t('dash_crop_col_crop')}</span>
              <span className="col-span-3">{t('dash_crop_col_score')}</span>
              <span className="col-span-4">{t('dash_crop_col_suitability')}</span>
            </div>

            {/* Crop List */}
            <div className="space-y-4 mt-3">
              {/* Crop 1: Maize */}
              <div className="grid grid-cols-12 items-center text-xs">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-base">🌽</span>
                  <span className="font-bold text-white">{t('dash_crop_maize')}</span>
                </div>
                <div className="col-span-3 font-semibold text-slate-200">95%</div>
                <div className="col-span-4">
                  <div className="h-2 w-full bg-[#16291d] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[95%]" />
                  </div>
                </div>
              </div>

              {/* Crop 2: Sugarcane */}
              <div className="grid grid-cols-12 items-center text-xs">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-base">🌾</span>
                  <span className="font-bold text-white">{t('dash_crop_sugarcane')}</span>
                </div>
                <div className="col-span-3 font-semibold text-slate-200">89%</div>
                <div className="col-span-4">
                  <div className="h-2 w-full bg-[#16291d] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[89%]" />
                  </div>
                </div>
              </div>

              {/* Crop 3: Cotton */}
              <div className="grid grid-cols-12 items-center text-xs">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-base">🌿</span>
                  <span className="font-bold text-white">{t('dash_crop_cotton')}</span>
                </div>
                <div className="col-span-3 font-semibold text-slate-200">82%</div>
                <div className="col-span-4">
                  <div className="h-2 w-full bg-[#16291d] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[82%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-3 border-t border-[#183120]">
            <button
              onClick={() => navigate('/crop')}
              className="dash-btn-primary w-full py-2.5 text-xs text-center"
            >
              {t('dash_btn_get_rec')}
            </button>
          </div>
        </div>

        {/* 3. Yield Forecast (This Season) */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_yield_title')}</h2>
              <button
                onClick={() => navigate('/yield')}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {t('dash_view_details')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Left Details */}
              <div className="sm:col-span-5 space-y-2 text-xs">
                <div>
                  <div className="text-[11px] text-slate-400">{t('dash_yield_predicted')}</div>
                  <div className="text-lg font-bold text-white">
                    2.45 <span className="text-xs font-normal text-slate-400">{t('dash_yield_tons_ha')}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{t('dash_confidence')}</div>
                  <div className="font-semibold text-emerald-400">91.2%</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{t('dash_yield_area')}</div>
                  <div className="text-slate-300 font-medium text-[11px] truncate">
                    {farmLocation || t('weather_location')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1">
                  <div>
                    <div className="text-[10px] text-slate-400">{t('dash_yield_crop')}</div>
                    <div className="text-slate-200 font-semibold text-[11px]">{t('dash_crop_maize')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{t('dash_yield_season')}</div>
                    <div className="text-slate-200 font-semibold text-[11px]">{t('dash_yield_kharif')}</div>
                  </div>
                </div>
              </div>

              {/* Right Line Chart */}
              <div className="sm:col-span-7 h-36 w-full">
                <div className="text-right text-[10px] text-slate-500 mb-1">{t('dash_yield_tons_ha')}</div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={seasonYieldData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      stroke="#4b5563"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 3.0]}
                      ticks={[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]}
                      stroke="#4b5563"
                      fontSize={9}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0e1c13',
                        borderColor: '#1e3f2b',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="yield"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#22c55e', stroke: '#14532d', strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: '#4ade80', stroke: '#ffffff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#183120] flex items-center justify-between text-[11px] text-slate-400">
            <span>{t('dash_yield_model')}</span>
            <span className="text-emerald-400 font-medium">{t('dash_yield_accuracy')}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CARDS ROW 2 (AI ADVISORY, RECENT ACTIVITY)
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. AI Advisory (Gemini) */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 dash-card-header">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white">{t('dash_advisory_title')}</h2>
            </div>

            <div className="space-y-3">
              {/* Advisory 1 */}
              <div className="p-3 rounded-xl bg-[#122418] border border-[#1b3a26]">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                  <span className="text-sm">🧪</span>
                  <span>{t('dash_adv_fert_title')}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {t('dash_adv_fert_desc')}
                </p>
              </div>

              {/* Advisory 2 */}
              <div className="p-3 rounded-xl bg-[#122418] border border-[#1b3a26]">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                  <span className="text-sm">🛡️</span>
                  <span>{t('dash_adv_prev_title')}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {t('dash_adv_prev_desc')}
                </p>
              </div>

              {/* Advisory 3 */}
              <div className="p-3 rounded-xl bg-[#122418] border border-[#1b3a26]">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                  <span className="text-sm">💧</span>
                  <span>{t('dash_adv_irri_title')}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {t('dash_adv_irri_desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#183120]">
            <button
              onClick={() => navigate('/farm-assistant')}
              className="dash-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('dash_btn_ask_ai')}</span>
            </button>
          </div>
        </div>

        {/* 2. Recent Activity */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_recent_activity')}</h2>
            </div>

            <div className="space-y-4">
              {/* Event 1 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Leaf className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate">{t('dash_act_leaf_analyzed')}</span>
                    <span className="text-[10px] text-slate-400">10:25 AM</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{t('dash_act_leaf_sub')}</div>
                </div>
              </div>

              {/* Event 2 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sprout className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate">{t('dash_act_crop_rec')}</span>
                    <span className="text-[10px] text-slate-400">09:40 AM</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{t('dash_act_crop_sub')}</div>
                </div>
              </div>

              {/* Event 3 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wheat className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate">{t('dash_act_yield_comp')}</span>
                    <span className="text-[10px] text-slate-400">{t('dash_yesterday')}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{t('dash_act_yield_sub')}</div>
                </div>
              </div>

              {/* Event 4 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate">{t('dash_act_advisory_gen')}</span>
                    <span className="text-[10px] text-slate-400">{t('dash_yesterday')}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{t('dash_act_advisory_sub')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#183120] text-center">
            <button
              onClick={() => {
                if (onOpenHistory) onOpenHistory();
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors"
            >
              {t('dash_view_all_history')}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CARDS ROW 3 (DISTRIBUTION, 6-SEASONS, SYSTEM)
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Disease Distribution */}
        <div className="dash-card p-5">
          <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
            <h2 className="text-sm font-bold text-white">{t('dash_disease_dist')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            {/* Donut Chart with Center Number */}
            <div className="sm:col-span-6 relative h-40 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diseaseDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {diseaseDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0e1c13" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Total Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-white">3</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t('dash_total')}</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="sm:col-span-6 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-300">{t('dash_disease_leaf_spot')}</span>
                </div>
                <span className="font-semibold text-slate-200">40% (2)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-300">{t('dash_blight')}</span>
                </div>
                <span className="font-semibold text-slate-200">33% (1)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-300">{t('dash_powdery_mildew')}</span>
                </div>
                <span className="font-semibold text-slate-200">27% (1)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Yield Trend (Last 6 Seasons) */}
        <div className="dash-card p-5">
          <div className="flex items-center justify-between pb-2 mb-2 dash-card-header">
            <h2 className="text-sm font-bold text-white">{t('dash_yield_trend')}</h2>
            <div className="text-[10px] text-slate-500">{t('dash_tons_ha')}</div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={multiYearYieldData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="yieldGreenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis
                  domain={[0, 3.0]}
                  ticks={[0, 1.0, 2.0, 3.0]}
                  stroke="#4b5563"
                  fontSize={10}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e1c13',
                    borderColor: '#1e3f2b',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="yield"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#yieldGreenGradient)"
                  dot={{ r: 3, fill: '#22c55e', stroke: '#14532d', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#4ade80', stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. System Status */}
        <div className="dash-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 dash-card-header">
              <h2 className="text-sm font-bold text-white">{t('dash_system_status')}</h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <span>{t('dash_ai_models')}</span>
                </div>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('dash_operational')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span>{t('dash_data_sources')}</span>
                </div>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('dash_connected')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span>{t('dash_api_services')}</span>
                </div>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('dash_healthy_status')}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#183120] flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('dash_last_updated')}</span>
            </div>
            <span className="text-slate-300 font-medium">May 21, 2025 10:30 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
