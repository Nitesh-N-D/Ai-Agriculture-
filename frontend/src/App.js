import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AlertsModal from './components/AlertsModal';
import HistoryModal from './components/HistoryModal';
import SettingsModal from './components/SettingsModal';

import Dashboard from './pages/Dashboard';
import Disease from './pages/Disease';
import Crop from './pages/Crop';
import Yield from './pages/Yield';
import Report from './pages/Report';
import FarmAssistant from './pages/FarmAssistant';
import Login from './pages/Login';

const Layout = ({ children, onOpenAlerts, onOpenHistory, onOpenSettings }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070e09] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-white">
      {/* Persistent Left Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        onOpenAlerts={onOpenAlerts}
        onOpenHistory={onOpenHistory}
        onOpenSettings={onOpenSettings}
      />

      {/* Main App Container */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Sticky Header */}
        <Header
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenAlerts={onOpenAlerts}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const location = useLocation();

  // Modal dialog states
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Layout
      onOpenAlerts={() => setAlertsOpen(true)}
      onOpenHistory={() => setHistoryOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <Dashboard
                onOpenHistory={() => setHistoryOpen(true)}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                onOpenHistory={() => setHistoryOpen(true)}
              />
            }
          />
          <Route path="/disease" element={<Disease />} />
          <Route path="/crop" element={<Crop />} />
          <Route path="/yield" element={<Yield />} />
          <Route path="/report" element={<Report />} />
          <Route path="/farm-assistant" element={<FarmAssistant />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </AnimatePresence>

      {/* Global Interactive Modals */}
      <AlertsModal isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />
      <HistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  );
}

const AppWrapper = () => (
  <Router>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Router>
);

export default AppWrapper;
