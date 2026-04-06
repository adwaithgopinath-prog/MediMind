import React from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageCircle, Upload, Calendar, Activity,
  Shield, X, Camera, LayoutDashboard, Heart
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: <LayoutDashboard size={18} />, label: 'Dashboard',           section: 'Overview' },
  { id: 'chat',        icon: <MessageCircle size={18} />,   label: 'Sick-Bay Chat',       section: 'Overview' },
  { id: 'vault',       icon: <Upload size={18} />,          label: 'Medical Vault',        section: 'Overview', showDocBadge: true },
  { id: 'vitals',      icon: <Activity size={18} />,        label: 'Vitals Dashboard',    section: 'Tools' },
  { id: 'recovery',    icon: <Calendar size={18} />,        label: 'Recovery Planner',    section: 'Tools' },
  { id: 'interaction', icon: <Shield size={18} />,          label: 'Drug Interactions',   section: 'Tools' },
  { id: 'diagnostic',  icon: <Camera size={18} />,          label: 'Visual Diagnostic',   section: 'Tools', badge: 'AI' },
];

const SECTIONS = ['Overview', 'Tools'];

export default function Sidebar() {
  const { activePage, setActivePage, documents, vitals, vitalsHistory, sidebarOpen, setSidebarOpen } = useApp();

  const handleNavClick = (id) => {
    setActivePage(id);
    setSidebarOpen(false);
  };

  // Health status indicator
  const hasVitals = vitals.heartRate || vitals.spo2;
  const lastHR = vitals.heartRate ? parseFloat(vitals.heartRate) : null;
  const hrOk = lastHR ? lastHR >= 60 && lastHR <= 100 : null;
  const statusColor = !hasVitals ? 'var(--text-muted)' : hrOk ? 'var(--accent-emerald)' : 'var(--accent-rose)';
  const statusLabel = !hasVitals ? 'No vitals logged' : hrOk ? 'Vitals Normal' : 'Vitals: Check';

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150, backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">⚕️</div>
          <div style={{ flex: 1 }}>
            <div className="logo-text">MediMind AI</div>
            <div className="logo-tagline">Personal Health Assistant</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'none' }}
            className="sidebar-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Health Status Pill */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)', padding: '7px 12px',
          }}>
            <Heart size={13} style={{ color: statusColor }} fill={hasVitals ? statusColor : 'none'} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor }}>{statusLabel}</span>
            <span style={{
              marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)',
            }}>
              {vitalsHistory.length} reading{vitalsHistory.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {SECTIONS.map(section => {
            const items = NAV_ITEMS.filter(i => i.section === section);
            return (
              <React.Fragment key={section}>
                <span className="nav-section-label">{section}</span>
                {items.map(item => (
                  <button
                    key={item.id}
                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.showDocBadge && documents.length > 0 && (
                      <span className="nav-item-badge">{documents.length}</span>
                    )}
                    {item.badge && (
                      <span style={{
                        fontSize: '9px', background: 'var(--gradient-primary)', color: 'white',
                        padding: '2px 6px', borderRadius: 'var(--radius-full)',
                        fontWeight: 700, marginLeft: 'auto',
                      }}>{item.badge}</span>
                    )}
                  </button>
                ))}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '4px',
            fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: 'var(--accent-emerald)' }}>●</span>
              Data stored locally on your device
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: 'var(--accent-indigo)' }}>●</span>
              MediMind AI v2.0 — Powered by Groq
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
