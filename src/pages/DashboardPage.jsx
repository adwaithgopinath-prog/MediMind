import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Activity, FileText, MessageCircle, Heart, TrendingUp, TrendingDown, Minus, Calendar, Brain, Shield, Zap, AlertTriangle, Search } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

/* ─── Helpers ─────────────────────────── */
function getHealthScore(vitals, documents, chatHistory, moodHistory) {
  let score = 60; // baseline

  if (vitals.heartRate) {
    const hr = parseFloat(vitals.heartRate);
    score += (hr >= 60 && hr <= 100) ? 8 : (hr >= 50 && hr <= 110) ? 4 : 0;
  }
  if (vitals.spo2) {
    const spo2 = parseFloat(vitals.spo2);
    score += spo2 >= 97 ? 8 : spo2 >= 95 ? 5 : spo2 >= 90 ? 2 : 0;
  }
  if (vitals.temperature) {
    const temp = parseFloat(vitals.temperature);
    score += (temp >= 97 && temp <= 99.5) ? 7 : (temp >= 96 && temp <= 101) ? 3 : 0;
  }
  if (vitals.bp) {
    const [sys] = vitals.bp.split('/').map(Number);
    score += (sys >= 90 && sys <= 120) ? 7 : (sys >= 80 && sys <= 130) ? 3 : 0;
  }

  if (moodHistory.length > 0) {
    const avgMood = moodHistory.slice(-7).reduce((a, m) => a + m.mood, 0) / Math.min(moodHistory.length, 7);
    score += Math.round(avgMood);
  }

  return Math.min(100, Math.max(0, score));
}

function getScoreLabel(score) {
  if (score >= 85) return { label: 'Excellent', color: '#10b981', emoji: '🟢' };
  if (score >= 70) return { label: 'Good',      color: '#06b6d4', emoji: '🔵' };
  if (score >= 55) return { label: 'Fair',      color: '#f59e0b', emoji: '🟡' };
  return              { label: 'Needs Care',  color: '#f43f5e', emoji: '🔴' };
}

/* ─── Components ───────────────────── */
function HealthGauge({ score }) {
  const [displayed, setDisplayed] = useState(0);
  const { label, color } = getScoreLabel(score);
  const R = 54, C = Math.PI * 2 * R;
  const offset = C - (displayed / 100) * C;

  useEffect(() => {
    let start = 0;
    const step = score / 60;
    const timer = setInterval(() => {
      start = Math.min(score, start + step);
      setDisplayed(Math.round(start));
      if (start >= score) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: 128, height: 128 }}>
        <svg width={128} height={128} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={64} cy={64} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx={64} cy={64} r={R} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={C} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.1s linear', filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color, lineHeight: 1 }}>
            {displayed}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>/ 100</span>
        </div>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color }}>{label}</div>
    </div>
  );
}

function StatTile({ icon, label, value, unit, color, history, field }) {
  const chartData = useMemo(() => {
    const last7 = history.slice(-7).map(h => parseFloat(h[field])).filter(v => !isNaN(v));
    return {
      labels: last7.map((_, i) => i),
      datasets: [{
        data: last7,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        backgroundColor: `${color}10`,
        tension: 0.4,
      }]
    };
  }, [history, field, color]);

  const chartOptions = {
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
    maintainAspectRatio: false,
    responsive: true,
  };

  return (
    <div className="stat-tile">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        <div style={{ height: '30px', width: '60px' }}>
          {history.length > 1 && <Line data={chartData} options={chartOptions} />}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: value ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1, marginBottom: '4px' }}>
        {value || '—'} {value && <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function ActionCard({ icon, label, desc, onClick, accent }) {
  return (
    <button className="action-card" onClick={onClick} style={{ '--card-accent': accent }}>
      <div className="action-card-icon" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
      <div className="action-card-label">{label}</div>
      <div className="action-card-desc">{desc}</div>
    </button>
  );
}

/* ─── Dashboard ─────────────────────── */
export default function DashboardPage() {
  const { documents, vitals, vitalsHistory, chatHistory, moodHistory, setActivePage } = useApp();

  const score = getHealthScore(vitals, documents, chatHistory, moodHistory);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Longitudinal Trend Analysis (Detect Anomalies)
  const driftAlert = useMemo(() => {
    if (vitalsHistory.length < 5) return null;
    const lastReading = parseFloat(vitalsHistory[vitalsHistory.length - 1].heartRate);
    const prevReadings = vitalsHistory.slice(-6, -1).map(h => parseFloat(h.heartRate)).filter(v => !isNaN(v));
    if (prevReadings.length < 3) return null;
    
    const avg = prevReadings.reduce((a, b) => a + b, 0) / prevReadings.length;
    const drift = ((lastReading - avg) / avg) * 100;

    if (Math.abs(drift) >= 15) {
      return {
        type: drift > 0 ? 'increase' : 'decrease',
        value: Math.abs(drift).toFixed(1),
        field: 'Heart Rate'
      };
    }
    return null;
  }, [vitalsHistory]);

  return (
    <div className="page-scroll">
      <div className="page-content">
        
        {driftAlert && (
          <div className="card fade-in" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', marginBottom: '24px', padding: '14px 20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertTriangle color="var(--accent-rose)" size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-rose)' }}>Health Trend Alert: Abnormal Drift Detected</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Your resting <strong>{driftAlert.field}</strong> has {driftAlert.type}d by <strong>{driftAlert.value}%</strong> compared to your 7-day average. 
                Please consider logging your symptoms in the Sick-Bay Chat.
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('chat')}>Talk to Agent</button>
          </div>
        )}

        {/* Hero Row */}
        <div className="dashboard-hero">
          <div className="dashboard-hero-left">
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} /> {today}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '420px' }}>
              {documents.length > 0
                ? `You have ${documents.length} medical document${documents.length > 1 ? 's' : ''} index and ${vitalsHistory.length} readings tracked.`
                : 'Upload medical records to the vault to unlock the Personal Health Archivist.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              <span className="status-pill" style={{ '--pill-color': '#10b981' }}>🔒 Local & Encrypted</span>
              <span className="status-pill" style={{ '--pill-color': '#6366f1' }}>🤖 Gemini & Llama Agent</span>
              <span className="status-pill" style={{ '--pill-color': '#f59e0b' }}>📶 Offline-Ready PWA</span>
            </div>
          </div>

          <div className="dashboard-hero-score">
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px' }}>Personal Health Score</div>
            <HealthGauge score={score} />
          </div>
        </div>

        {/* Vitals Quick Stats */}
        <div style={{ marginBottom: '28px' }}>
          <div className="section-label">7-Day Real-time Trends</div>
          <div className="stat-tiles-grid">
            <StatTile icon={<Heart size={18} />}    label="Heart Rate"    value={vitals.heartRate}   unit="bpm"  color="#f43f5e" history={vitalsHistory} field="heartRate" />
            <StatTile icon={<Activity size={18} />} label="Blood Oxygen"  value={vitals.spo2}        unit="%"    color="#06b6d4" history={vitalsHistory} field="spo2" />
            <StatTile icon={<Zap size={18} />}      label="BP (Systolic)" value={vitals.bp?.split('/')[0]} unit="mmHg" color="#8b5cf6" history={vitalsHistory} field="systolic" />
            <StatTile icon={<Brain size={18} />}    label="Mood"          value={moodHistory.length ? moodHistory[moodHistory.length-1].mood : null} unit="/10" color="#10b981" history={moodHistory} field="mood" />
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '28px' }}>
          <div className="section-label">Agentic Action Center</div>
          <div className="action-cards-grid">
            <ActionCard
              icon={<MessageCircle size={20} />} label="Symptom Triage"
              desc="Agentic analysis with source transparency" onClick={() => setActivePage('chat')} accent="#6366f1"
            />
            <ActionCard
              icon={<Search size={20} />} label="Health Archivist"
              desc="Search your personal vault (RAG)" onClick={() => setActivePage('vault')} accent="#06b6d4"
            />
            <ActionCard
              icon={<Shield size={20} />} label="Interaction Safety"
              desc="Check medication safety against history" onClick={() => setActivePage('interaction')} accent="#8b5cf6"
            />
            <ActionCard
              icon={<FileText size={20} />} label="Doctor's Brief"
              desc="Generate one-page clinical PDF" onClick={() => setActivePage('vitals')} accent="#10b981"
            />
          </div>
        </div>

        <div className="warning-banner" style={{ opacity: 0.7 }}>
          <span className="warning-banner-icon">⚕️</span>
          <div className="warning-banner-text">
            <p style={{ margin: 0, fontSize: '12px' }}>MediMind is an AI educational project. It does not provide medical diagnoses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
