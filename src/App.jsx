import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import ChatPage from './pages/ChatPage';
import VaultPage from './pages/VaultPage';
import RecoveryPage from './pages/RecoveryPage';
import VitalsPage from './pages/VitalsPage';
import InteractionPage from './pages/InteractionPage';
import DiagnosticPage from './pages/DiagnosticPage';
import DashboardPage from './pages/DashboardPage';
import { Menu, MessageCircle, Upload, Calendar, Activity, Shield, Camera, LayoutDashboard } from 'lucide-react';

const PAGE_TITLES = {
  dashboard:  { title: 'Health Dashboard',        subtitle: 'Your personalized health overview',                   icon: <LayoutDashboard size={20} /> },
  chat:       { title: 'Sick-Bay Chat',            subtitle: 'Talk to MediMind about your symptoms',               icon: <MessageCircle size={20} /> },
  vault:      { title: 'Medical Vault',            subtitle: 'Manage your uploaded medical documents',             icon: <Upload size={20} /> },
  recovery:   { title: 'Recovery Planner',         subtitle: 'Generate a personalized recovery plan',             icon: <Calendar size={20} /> },
  vitals:     { title: 'Vitals Dashboard',         subtitle: 'Track vitals & view AI trend analysis',             icon: <Activity size={20} /> },
  interaction:{ title: 'Drug Interaction Checker', subtitle: 'Check medicine safety based on your history',       icon: <Shield size={20} /> },
  diagnostic: { title: 'Visual Diagnostic',        subtitle: 'AI-powered analysis of skin, pills & medical images', icon: <Camera size={20} /> },
};

function AppShell() {
  const { activePage, setSidebarOpen, documents, vitals } = useApp();
  const { title, subtitle, icon } = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':   return <DashboardPage />;
      case 'chat':        return <ChatPage />;
      case 'vault':       return <VaultPage />;
      case 'recovery':    return <RecoveryPage />;
      case 'vitals':      return <VitalsPage />;
      case 'interaction': return <InteractionPage />;
      case 'diagnostic':  return <DiagnosticPage />;
      default:            return <DashboardPage />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              className="mobile-menu-btn"
            >
              <Menu size={22} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'var(--gradient-primary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
                boxShadow: 'var(--shadow-glow)',
              }}>
                {icon}
              </div>
              <div>
                <div className="page-title">{title}</div>
                <div className="page-subtitle">{subtitle}</div>
              </div>
            </div>
          </div>

          {/* Header Stats */}
          <div className="header-actions">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)', padding: '6px 14px', fontSize: '12px',
            }}>
              <span style={{ color: documents.length > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {documents.length > 0 ? '●' : '○'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{documents.length} doc{documents.length !== 1 ? 's' : ''}</span>
            </div>
            {vitals.heartRate && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: 'var(--radius-full)', padding: '6px 14px', fontSize: '12px',
                color: 'var(--accent-rose)',
              }}>
                ❤️ {vitals.heartRate} bpm
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
