import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Microscope, Sprout, TrendingUp, Bot,
  FileText, Bell, Clock, Settings, CloudRain, Leaf, X
} from 'lucide-react';

const Sidebar = ({
  mobileOpen,
  setMobileOpen,
  onOpenAlerts,
  onOpenHistory,
  onOpenSettings
}) => {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { label: t('nav_dashboard'), path: '/', icon: LayoutDashboard, type: 'link' },
    { label: t('nav_disease'), path: '/disease', icon: Microscope, type: 'link' },
    { label: t('nav_crop'), path: '/crop', icon: Sprout, type: 'link' },
    { label: t('nav_yield'), path: '/yield', icon: TrendingUp, type: 'link' },
    { label: t('nav_assistant'), path: '/farm-assistant', icon: Bot, type: 'link' },
    { label: t('nav_report'), path: '/report', icon: FileText, type: 'link' },
    { label: t('nav_alerts'), action: onOpenAlerts, icon: Bell, type: 'action', badge: '4' },
    { label: t('nav_history'), action: onOpenHistory, icon: Clock, type: 'action' },
    { label: t('nav_settings'), action: onOpenSettings, icon: Settings, type: 'action' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 dash-sidebar border-r flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-[#152b1d]">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-transform">
              <Leaf className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-tight">
                {t('app_title')}
              </div>
              <div className="text-xs font-semibold text-emerald-400 tracking-wide">
                {t('app_subtitle')}
              </div>
            </div>
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 dash-scroll space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.type === 'link' && location.pathname === item.path;

            if (item.type === 'action') {
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.action) item.action();
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-emerald-400 hover:bg-[#122418] transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#16a34a] text-white shadow-[0_0_15px_rgba(22,163,74,0.45)]'
                    : 'text-slate-300 hover:text-emerald-400 hover:bg-[#122418]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Weather Widget */}
        <div className="p-3 border-t border-[#152b1d]">
          <div className="p-3 rounded-2xl bg-[#0e1c13] border border-[#193523]">
            <div className="text-[11px] text-slate-400 font-medium mb-1 truncate">
              {t('weather_location')}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <CloudRain className="w-5 h-5 text-cyan-400" />
              <span className="text-base font-bold text-white">28°C</span>
              <span className="text-xs text-slate-300">{t('weather_condition')}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#173020] text-center">
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">{t('weather_humidity')}</div>
                <div className="text-[11px] font-semibold text-slate-200">78%</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">{t('weather_wind')}</div>
                <div className="text-[11px] font-semibold text-slate-200">12 km/h</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">{t('weather_rainfall')}</div>
                <div className="text-[11px] font-semibold text-slate-200">2.4 mm</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
