import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Globe, ChevronDown, Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Header = ({ onToggleSidebar, onOpenAlerts }) => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const langRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) setShowLangMenu(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifMenu(false);
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchItems = [
    { title: 'AI Disease Detection', path: '/disease', category: 'Tool' },
    { title: 'Crop Recommendation Ensemble', path: '/crop', category: 'Tool' },
    { title: 'Harvest Yield Prediction', path: '/yield', category: 'Tool' },
    { title: 'Farm AI Chat Assistant', path: '/farm-assistant', category: 'AI' },
    { title: 'Generate Full Farm Report', path: '/report', category: 'Report' },
    { title: 'Leaf Spot Diagnosis', path: '/disease', category: 'Disease' },
    { title: 'Maize Cultivation Advisory', path: '/crop', category: 'Crop' },
    { title: 'Kharif Season Forecast', path: '/yield', category: 'Yield' },
  ];

  const filteredSearch = searchQuery.trim()
    ? searchItems.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectSearch = (path) => {
    navigate(path);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const changeLanguage = (code) => {
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(code);
    }
    setShowLangMenu(false);
  };

  const displayName = user?.full_name || user?.username || t('header_farmer');

  return (
    <header className="sticky top-0 z-30 h-20 dash-header border-b px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left Greeting & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-[#122418] border border-[#1d3d27]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
            {t('header_welcome')}, {displayName}! 👋
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            {t('header_subtitle')}
          </p>
        </div>
      </div>

      {/* Right Controls: Search, Notifications, Language, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Bar */}
        <div ref={searchRef} className="relative hidden md:block w-56 lg:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#0e1c13] border border-[#1a3624] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && filteredSearch.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0e1c13] border border-[#1a3624] rounded-xl shadow-2xl p-1.5 z-50">
              {filteredSearch.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSearch(item.path)}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-[#152e1f] transition-all text-xs text-slate-200"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2.5 rounded-xl bg-[#0e1c13] border border-[#1a3624] text-slate-300 hover:text-white hover:border-[#234d32] transition-all"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.7)]">
              3
            </span>
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#0e1c13] border border-[#1a3624] rounded-2xl shadow-2xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#183120]">
                <span className="font-bold text-white">{t('notifications')}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">3 {t('notifications_new')}</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 rounded-xl bg-[#122418] border border-[#1b3a26]">
                  <div className="font-semibold text-emerald-300">Soil Moisture Optimal</div>
                  <div className="text-[11px] text-slate-400">Sector 1 moisture calibrated at 78%.</div>
                  <div className="text-[9px] text-slate-500 mt-1">10 mins ago</div>
                </div>
                <div className="p-2 rounded-xl bg-[#122418] border border-[#1b3a26]">
                  <div className="font-semibold text-amber-300">Leaf Spot Detected</div>
                  <div className="text-[11px] text-slate-400">Moderate leaf spot flagged on Tomato.</div>
                  <div className="text-[9px] text-slate-500 mt-1">1 hour ago</div>
                </div>
                <div className="p-2 rounded-xl bg-[#122418] border border-[#1b3a26]">
                  <div className="font-semibold text-sky-300">Yield Forecast Updated</div>
                  <div className="text-[11px] text-slate-400">Maize projected harvest set at 2.45 t/ha.</div>
                  <div className="text-[9px] text-slate-500 mt-1">3 hours ago</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNotifMenu(false);
                  if (onOpenAlerts) onOpenAlerts();
                }}
                className="w-full mt-2.5 py-1.5 rounded-lg bg-[#162d1e] text-emerald-400 text-center font-medium hover:bg-[#1a3926] transition-colors"
              >
                {t('notifications_view_all')}
              </button>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#0e1c13] border border-[#1a3624] text-xs font-semibold text-slate-300 hover:text-white hover:border-[#234d32] transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{(i18n.language || 'EN').toUpperCase()}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 top-full mt-2 w-32 bg-[#0e1c13] border border-[#1a3624] rounded-xl shadow-2xl p-1 z-50 text-xs">
              <button
                onClick={() => changeLanguage('en')}
                className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-[#162d1e] text-slate-200 flex items-center justify-between"
              >
                <span>English</span>
                <span className="text-[10px] text-emerald-400 font-bold">EN</span>
              </button>
              <button
                onClick={() => changeLanguage('ta')}
                className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-[#162d1e] text-slate-200 flex items-center justify-between"
              >
                <span>Tamil</span>
                <span className="text-[10px] text-emerald-400 font-bold">TA</span>
              </button>
              <button
                onClick={() => changeLanguage('hi')}
                className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-[#162d1e] text-slate-200 flex items-center justify-between"
              >
                <span>Hindi</span>
                <span className="text-[10px] text-emerald-400 font-bold">HI</span>
              </button>
            </div>
          )}
        </div>

        {/* User Profile Chip */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 pr-3 rounded-2xl bg-[#0e1c13] border border-[#1a3624] hover:border-[#234d32] transition-all group"
          >
            <img
              src="/assets/farmer_avatar.jpg"
              alt="Farmer Profile"
              className="w-8 h-8 rounded-xl object-cover border border-emerald-500/40"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">
                {displayName}
              </div>
              <div className="text-[10px] font-semibold text-emerald-400">
                {t('profile_active_farmer')}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0e1c13] border border-[#1a3624] rounded-2xl shadow-2xl p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#183120] mb-1">
                <div className="font-bold text-white truncate">{displayName}</div>
                <div className="text-[10px] text-emerald-400">{t('profile_verified_farmer')}</div>
              </div>
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('profile_sign_out')}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate('/login');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-400 hover:bg-[#152e1f] transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t('profile_sign_in')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
