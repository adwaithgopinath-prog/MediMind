import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ─── Toast Context ─────────────────────────────── */
const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: 'var(--accent-emerald)', bar: 'var(--accent-emerald)' },
  error:   { bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.35)',  color: 'var(--accent-rose)',    bar: 'var(--accent-rose)'    },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: 'var(--accent-amber)',   bar: 'var(--accent-amber)'   },
  info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', color: 'var(--accent-indigo)',  bar: 'var(--accent-indigo)'  },
};

function ToastItem({ id, type = 'info', title, message, duration = 4500, onRemove }) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const c = COLORS[type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct === 0) {
        clearInterval(intervalRef.current);
        handleDismiss();
      }
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(id), 350);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        minWidth: '300px',
        maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.9)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px' }}>
        <span style={{ color: c.color, flexShrink: 0, marginTop: '1px' }}>{ICONS[type]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: message ? '3px' : 0 }}>{title}</div>}
          {message && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</div>}
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>
      {/* Progress Bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: c.bar, transition: 'width 50ms linear', borderRadius: '0 2px 2px 0' }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((type, title, message, duration) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const api = {
    success: (title, message, dur) => toast('success', title, message, dur),
    error:   (title, message, dur) => toast('error',   title, message, dur),
    warning: (title, message, dur) => toast('warning', title, message, dur),
    info:    (title, message, dur) => toast('info',    title, message, dur),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast Portal */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem {...t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
