import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Activity, Save, TrendingUp, Clock, Brain, Loader, Download, FileText } from 'lucide-react';
import { analyzeVitalsTrend, generateClinicalSummary } from '../services/geminiService';

const VITAL_RANGES = {
  heartRate:   { min: 60,  max: 100,  unit: 'bpm', label: 'Heart Rate',      icon: '❤️',  color: 'var(--accent-rose)',    type: 'heart' },
  spo2:        { min: 95,  max: 100,  unit: '%',   label: 'Blood Oxygen',    icon: '💨',  color: 'var(--accent-cyan)',    type: 'oxygen' },
  temperature: { min: 97,  max: 99.5, unit: '°F',  label: 'Temperature',     icon: '🌡️', color: 'var(--accent-amber)',   type: 'temp' },
  systolic:    { min: 90,  max: 120,  unit: 'mmHg',label: 'Systolic BP',     icon: '💜',  color: 'var(--accent-violet)',  type: 'bp' },
  diastolic:   { min: 60,  max: 80,   unit: 'mmHg',label: 'Diastolic BP',    icon: '💜',  color: 'var(--accent-violet)',  type: 'bp' },
};

function getStatus(value, min, max) {
  if (!value || isNaN(value)) return null;
  const v = parseFloat(value);
  if (v >= min && v <= max) return 'normal';
  return 'warning';
}

// Mini Sparkline Chart (pure SVG)
function Sparkline({ history, field, color, min, max }) {
  const values = history.slice(-10).map(h => parseFloat(h[field])).filter(v => !isNaN(v));
  if (values.length < 2) return null;

  const w = 100, h = 32, pad = 2;
  const lo = Math.min(...values, min) - 2;
  const hi = Math.max(...values, max) + 2;
  const xStep = (w - pad * 2) / (values.length - 1);
  const yScale = (v) => h - pad - ((v - lo) / (hi - lo)) * (h - pad * 2);
  const points = values.map((v, i) => `${pad + i * xStep},${yScale(v)}`).join(' ');

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {/* Last point dot */}
      <circle cx={pad + (values.length - 1) * xStep} cy={yScale(values[values.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

function VitalCard({ field, icon, label, value, unit, status, color, type, history }) {
  const trend = (() => {
    const vals = history.slice(-3).map(h => parseFloat(h[field])).filter(v => !isNaN(v));
    if (vals.length < 2) return null;
    const diff = vals[vals.length - 1] - vals[0];
    if (Math.abs(diff) < 1) return '→ Stable';
    return diff > 0 ? '↑ Rising' : '↓ Falling';
  })();

  return (
    <div className={`vital-card ${type}`}>
      <div className="vital-icon-ring">{icon}</div>
      <div className="vital-value">{value || '—'}<span style={{ fontSize: '14px', fontWeight: 400 }}> {value ? unit : ''}</span></div>
      <div className="vital-label">{label}</div>
      {status && <div className={`vital-status ${status}`}>{status === 'normal' ? '✓ Normal' : '⚠ Check'}</div>}
      {trend && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{trend}</div>}
      <div style={{ marginTop: '6px' }}>
        <Sparkline history={history} field={field} color={color} min={VITAL_RANGES[field]?.min || 0} max={VITAL_RANGES[field]?.max || 100} />
      </div>
    </div>
  );
}

export default function VitalsPage() {
  const { documents, vitals, vitalsHistory, updateVitals, moodHistory, addMoodEntry, chatHistory, voiceMemos, generateDoctorReport } = useApp();
  const [form, setForm] = useState({
    heartRate: vitals.heartRate || '',
    spo2: vitals.spo2 || '',
    temperature: vitals.temperature || '',
    systolic: vitals.systolic || '',
    diastolic: vitals.diastolic || '',
    mood: '5',
    stress: '5',
  });
  const [saved, setSaved] = useState(false);
  const [trendInsights, setTrendInsights] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);

  // What-If
  const [scenario, setScenario] = useState('');
  const [whatIfResult, setWhatIfResult] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Correlation
  const [correlations, setCorrelations] = useState(null);
  const [corrLoading, setCorrLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    updateVitals({
      heartRate: form.heartRate,
      spo2: form.spo2,
      temperature: form.temperature,
      bp: form.systolic && form.diastolic ? `${form.systolic}/${form.diastolic}` : '',
    });
    addMoodEntry({
      mood: parseInt(form.mood, 10),
      stress: parseInt(form.stress, 10)
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fetchTrendInsights = async () => {
    if (vitalsHistory.length < 2) return;
    setTrendLoading(true);
    try {
      const { analyzeVitalsTrend, correlateMindBody } = await import('../services/geminiService');
      const insights = await analyzeVitalsTrend(vitalsHistory, vitals);
      setTrendInsights(insights);

      if (moodHistory.length >= 3) {
        setCorrLoading(true);
        const corr = await correlateMindBody(moodHistory, vitalsHistory, chatHistory);
        setCorrelations(corr);
        setCorrLoading(false);
      }
    } catch { /* silent fail */ }
    setTrendLoading(false);
  };

  const handleSimulate = async () => {
    if (!scenario.trim() || whatIfLoading) return;
    setWhatIfLoading(true);
    try {
      const { simulateWhatIf } = await import('../services/geminiService');
      const res = await simulateWhatIf(scenario, { documents, vitals, vitalsHistory, moodHistory });
      setWhatIfResult(res);
    } catch { }
    setWhatIfLoading(false);
  };

  const [reportLoading, setReportLoading] = useState(false);
  const handleGenerateDoctorReport = async () => {
    setReportLoading(true);
    try {
      const clinicalSummary = await generateClinicalSummary({ documents, vitals, vitalsHistory, chatHistory, moodHistory, voiceMemos });
      await generateDoctorReport(clinicalSummary);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (vitalsHistory.length >= 2) fetchTrendInsights();
  }, []); // eslint-disable-line

  const hrStatus   = getStatus(form.heartRate, 60, 100);
  const spo2Status = getStatus(form.spo2, 95, 100);
  const tempStatus = getStatus(form.temperature, 97, 99.5);
  const bpStatus   = (() => {
    if (!form.systolic || !form.diastolic) return null;
    if (+form.systolic >= 90 && +form.systolic <= 120 && +form.diastolic >= 60 && +form.diastolic <= 80) return 'normal';
    return 'warning';
  })();
  const bpDisplay = form.systolic && form.diastolic ? `${form.systolic}/${form.diastolic}` : '';

  return (
    <div className="page-scroll">
      <div className="page-content">
        {/* Vitals Cards */}
        <div className="vitals-grid" style={{ marginBottom: '28px' }}>
          <VitalCard field="heartRate"   icon="❤️"  label="Heart Rate"    value={form.heartRate}   unit="bpm"  status={hrStatus}   color="var(--accent-rose)"   type="heart"  history={vitalsHistory} />
          <VitalCard field="spo2"        icon="💨"  label="Blood Oxygen"  value={form.spo2}         unit="%"    status={spo2Status} color="var(--accent-cyan)"   type="oxygen" history={vitalsHistory} />
          <VitalCard field="temperature" icon="🌡️" label="Temperature"   value={form.temperature}  unit="°F"   status={tempStatus} color="var(--accent-amber)"  type="temp"   history={vitalsHistory} />
          <VitalCard field="systolic"    icon="💜"  label="Blood Pressure" value={bpDisplay}        unit="mmHg" status={bpStatus}   color="var(--accent-violet)" type="bp"     history={vitalsHistory} />
        </div>

        {/* AI Trend Insights */}
        {vitalsHistory.length >= 2 && (
          <div className="card" style={{ marginBottom: '28px', borderColor: 'rgba(99,102,241,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '15px' }}>
                <Brain size={18} color="var(--accent-indigo)" />
                AI Trend Analysis
                <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-indigo)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  {vitalsHistory.length} readings
                </span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetchTrendInsights} disabled={trendLoading}>
                {trendLoading ? <Loader size={13} className="spin" /> : '↻'} Refresh
              </button>
            </div>

            {trendLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <Loader size={16} className="spin" /> Analyzing your vitals trend...
              </div>
            ) : trendInsights ? (
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {trendInsights.map((insight, i) => (
                  <li key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Save at least 2 readings to see AI trend analysis.
              </div>
            )}
            {/* Mind-Body Correlation Insights */}
            {moodHistory.length >= 3 && correlations && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--accent-rose)' }}>
                  🧠 Mind-Body Correlations (AI Detected)
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {correlations.map((c, i) => (
                    <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <span>{c.emoji}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{c.pattern}</strong>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', paddingLeft: '24px' }}>
                        💡 {c.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Digital Twin Simulator */}
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🔮
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Digital Twin: What-If Simulator</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Predict health outcomes based on your historical baseline</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ flex: 1 }} 
              placeholder="e.g., If I sleep 8 hours a night for a month, how will my BP change?"
              value={scenario}
              onChange={e => setScenario(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSimulate()}
            />
            <button className="btn btn-primary" onClick={handleSimulate} disabled={whatIfLoading || !scenario.trim()}>
              {whatIfLoading ? <Loader size={16} className="spin" /> : 'Simulate'}
            </button>
          </div>

          {whatIfResult && (
            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
              <div dangerouslySetInnerHTML={{ __html: whatIfResult.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          )}
        </div>

        {/* History Timeline */}
        {vitalsHistory.length > 0 && (
          <div className="card" style={{ marginBottom: '28px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--accent-cyan)" /> Readings History
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Last {Math.min(vitalsHistory.length, 7)} of {vitalsHistory.length}</span>
              <button
                className="export-btn"
                style={{ marginLeft: 'auto' }}
                onClick={handleGenerateDoctorReport}
                disabled={reportLoading}
              >
                {reportLoading ? <Loader size={13} className="spin" /> : <FileText size={13} />} Doctor's Brief (PDF)
              </button>
              <button
                className="export-btn"
                style={{ marginLeft: '8px' }}
                onClick={() => {
                  const header = ['Date', 'Heart Rate (bpm)', 'SpO2 (%)', 'Temperature (°F)', 'Blood Pressure'];
                  const rows = vitalsHistory.map(v => [
                    new Date(v.recordedAt).toLocaleString(),
                    v.heartRate || '',
                    v.spo2 || '',
                    v.temperature || '',
                    v.bp || '',
                  ]);
                  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'medimind-vitals.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Date & Time', '❤️ HR', '💨 SpO₂', '🌡️ Temp', '💜 BP'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vitalsHistory.slice(-7).reverse().map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', opacity: i === 0 ? 1 : 0.7 }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(v.recordedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--accent-rose)', fontWeight: 600 }}>{v.heartRate || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{v.spo2 ? `${v.spo2}%` : '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--accent-amber)', fontWeight: 600 }}>{v.temperature ? `${v.temperature}°F` : '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--accent-violet)', fontWeight: 600 }}>{v.bp || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reference Ranges */}
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ fontWeight: 700, marginBottom: '16px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--accent-cyan)" /> Healthy Ranges Reference
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { label: '❤️ Heart Rate', range: '60–100 bpm', color: 'var(--accent-rose)' },
              { label: '💨 SpO₂', range: '95–100%', color: 'var(--accent-cyan)' },
              { label: '🌡️ Temperature', range: '97–99.5°F', color: 'var(--accent-amber)' },
              { label: '💜 Blood Pressure', range: '90/60–120/80', color: 'var(--accent-violet)' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="vitals-input">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Activity size={18} color="var(--accent-indigo)" />
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Log Your Vitals</div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Enter your current measurements. Each save creates a historical snapshot for trend analysis.
          </div>

          <div className="vital-input-row">
            {[
              { field: 'heartRate', id: 'hr-input', label: 'Heart Rate (bpm)', placeholder: 'e.g., 72', min: 30, max: 220, step: 1 },
              { field: 'spo2', id: 'spo2-input', label: 'SpO₂ (%)', placeholder: 'e.g., 98', min: 70, max: 100, step: 1 },
              { field: 'temperature', id: 'temp-input', label: 'Temperature (°F)', placeholder: 'e.g., 98.6', min: 90, max: 115, step: 0.1 },
              { field: 'systolic', id: 'systolic-input', label: 'Systolic BP (mmHg)', placeholder: 'e.g., 120', min: 60, max: 250, step: 1 },
              { field: 'diastolic', id: 'diastolic-input', label: 'Diastolic BP (mmHg)', placeholder: 'e.g., 80', min: 40, max: 150, step: 1 },
            ].map(({ field, id, label, placeholder, min, max, step }) => (
              <div className="input-group" key={field}>
                <label className="input-label" htmlFor={id}>{label}</label>
                <input
                  id={id} type="number" className="input-field"
                  placeholder={placeholder} min={min} max={max} step={step}
                  value={form[field]}
                  onChange={e => handleChange(field, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="vital-input-row" style={{ marginTop: '16px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '16px' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="mood-input">Mood (1-10)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{form.mood < 4 ? '😔' : form.mood > 7 ? '😄' : '😐'}</span>
                <input
                  id="mood-input" type="range" className="input-field"
                  style={{ padding: 0, height: '4px' }}
                  min={1} max={10} step={1}
                  value={form.mood}
                  onChange={e => handleChange('mood', e.target.value)}
                />
                <span style={{ fontSize: '12px', width: '20px' }}>{form.mood}</span>
              </div>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="stress-input">Stress Level (1-10)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{form.stress > 7 ? '😫' : form.stress < 4 ? '😌' : '😟'}</span>
                <input
                  id="stress-input" type="range" className="input-field"
                  style={{ padding: 0, height: '4px' }}
                  min={1} max={10} step={1}
                  value={form.stress}
                  onChange={e => handleChange('stress', e.target.value)}
                />
                <span style={{ fontSize: '12px', width: '20px' }}>{form.stress}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleSave} id="save-vitals-btn">
              <Save size={16} /> Save Vitals
            </button>
            {saved && (
              <span className="tag tag-emerald" style={{ animation: 'fadeIn 0.3s ease' }}>
                ✓ Saved! Snapshot added to trend history.
              </span>
            )}
          </div>
        </div>

        {vitals.updatedAt && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Clock size={13} /> Last updated: {new Date(vitals.updatedAt).toLocaleString()}
          </div>
        )}

        {/* Warning */}
        {(hrStatus === 'warning' || spo2Status === 'warning' || tempStatus === 'warning' || bpStatus === 'warning') && (
          <div className="warning-banner" style={{ marginTop: '24px' }}>
            <span className="warning-banner-icon">⚠️</span>
            <div className="warning-banner-text">
              <h4>Vitals Outside Normal Range</h4>
              <p>
                {hrStatus === 'warning' && `Heart rate of ${form.heartRate} bpm is outside the normal range (60-100 bpm). `}
                {spo2Status === 'warning' && `SpO₂ of ${form.spo2}% is below normal (95-100%). Seek attention if below 90%. `}
                {tempStatus === 'warning' && `Temperature of ${form.temperature}°F suggests ${parseFloat(form.temperature) > 99.5 ? 'a fever' : 'hypothermia'}. `}
                {bpStatus === 'warning' && `Blood pressure of ${bpDisplay} is outside normal range. `}
                Please consult a healthcare professional about these readings.
              </p>
            </div>
          </div>
        )}
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
