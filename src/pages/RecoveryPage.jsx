import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateRecoveryPlan } from '../services/geminiService';
import { Calendar, Utensils, Pill, Moon, AlertTriangle, Droplets, Clock, Loader, ChevronRight } from 'lucide-react';

const SEVERITY_COLORS = {
  mild: 'var(--accent-emerald)',
  moderate: 'var(--accent-amber)',
  severe: 'var(--accent-rose)',
};

function PlanSection({ icon, title, iconBg, children }) {
  return (
    <div className="plan-card">
      <div className="plan-card-header">
        <div className="plan-card-icon" style={{ background: iconBg }}>{icon}</div>
        <div className="plan-card-title">{title}</div>
      </div>
      <div className="plan-card-body">{children}</div>
    </div>
  );
}

export default function RecoveryPage() {
  const { documents, vitals } = useApp();
  const [symptoms, setSymptoms] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dietMode, setDietMode] = useState('veg'); // 'veg' | 'nonveg'

  const generatePlan = async () => {
    if (!symptoms.trim()) { setError('Please describe your symptoms first.'); return; }

    setError('');
    setLoading(true);
    setPlan(null);

    try {
      const result = await generateRecoveryPlan(symptoms, { documents, vitals, dietMode });
      setPlan({ ...result, dietMode });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-content">
        {/* Input Card */}
        <div className="card" style={{ marginBottom: '28px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div className="section-title">🩺 Describe Your Symptoms</div>
            <div className="section-subtitle" style={{ marginTop: '4px' }}>MediMind will generate a personalized recovery plan based on your symptoms and medical history</div>
          </div>
          <textarea
            className="input-field"
            style={{ width: '100%', resize: 'vertical', minHeight: '100px' }}
            placeholder="E.g., I have a fever of 101°F, body aches, sore throat, and I feel very tired since yesterday morning..."
            value={symptoms}
            onChange={e => setSymptoms(e.target.value)}
            id="symptoms-input"
          />

          {/* Diet Mode Toggle */}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>🍽️ Diet Preference:</span>
            <div style={{
              display: 'flex', background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-full)', padding: '3px',
              border: '1px solid var(--border-medium)',
            }}>
              <button
                id="diet-veg-btn"
                onClick={() => setDietMode('veg')}
                style={{
                  padding: '6px 18px', borderRadius: 'var(--radius-full)', border: 'none',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                  background: dietMode === 'veg' ? 'var(--accent-emerald)' : 'transparent',
                  color: dietMode === 'veg' ? 'white' : 'var(--text-muted)',
                  boxShadow: dietMode === 'veg' ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
                }}
              >
                🥦 Vegetarian
              </button>
              <button
                id="diet-nonveg-btn"
                onClick={() => setDietMode('nonveg')}
                style={{
                  padding: '6px 18px', borderRadius: 'var(--radius-full)', border: 'none',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                  background: dietMode === 'nonveg' ? 'var(--accent-rose)' : 'transparent',
                  color: dietMode === 'nonveg' ? 'white' : 'var(--text-muted)',
                  boxShadow: dietMode === 'nonveg' ? '0 2px 8px rgba(244,63,94,0.4)' : 'none',
                }}
              >
                🍗 Non-Vegetarian
              </button>
            </div>
            <span style={{ fontSize: '12px', color: dietMode === 'veg' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
              {dietMode === 'veg' ? '✓ Plant-based meals only' : '✓ Includes meat, fish & eggs'}
            </span>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginTop: '12px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
          <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={generatePlan}
              disabled={loading || !symptoms.trim()}
              id="generate-plan-btn"
            >
              {loading ? <><Loader size={16} className="spin" /> Generating Plan...</> : <><Calendar size={16} /> Generate Recovery Plan</>}
            </button>
            {plan && (
              <button className="btn btn-secondary" onClick={() => { setPlan(null); setSymptoms(''); }}>
                Start Over
              </button>
            )}
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {documents.length > 0 ? `✓ Using ${documents.length} document(s) for context` : '💡 Upload medical records for better accuracy'}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 2s ease-in-out infinite' }}>🧬</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Analyzing your symptoms...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              MediMind is cross-referencing with your medical history
            </div>
            <div className="processing-bar" style={{ maxWidth: '300px', margin: '0 auto' }}>
              <div className="processing-bar-fill" />
            </div>
          </div>
        )}

        {/* Recovery Plan */}
        {plan && (
          <div className="fade-in">
            {/* Summary */}
            <div className="card" style={{ marginBottom: '24px', borderColor: SEVERITY_COLORS[plan.severity] + '40' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px' }}>Assessment Summary</h3>
                    <span className="tag" style={{ 
                      background: SEVERITY_COLORS[plan.severity] + '20', 
                      color: SEVERITY_COLORS[plan.severity],
                      textTransform: 'capitalize', fontSize: '12px',
                    }}>
                      {plan.severity} condition
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.7' }}>{plan.summary}</p>
                </div>
                <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px 20px', flexShrink: 0 }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>⏱️</div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{plan.duration}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expected Recovery</div>
                </div>
              </div>

              {/* Warning Flags */}
              {plan.warningFlags?.length > 0 && (
                <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} /> Seek Emergency Care If:
                  </div>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {plan.warningFlags.map((flag, i) => (
                      <li key={i} style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '4px' }}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hydration */}
              {plan.hydration && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(6,182,212,0.08)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--accent-cyan)' }}>
                  <Droplets size={16} />
                  <span>{plan.hydration}</span>
                </div>
              )}
            </div>

            {/* Plan Grid */}
            <div className="plan-grid">
              {/* Meals */}
              <PlanSection
                icon={plan.dietMode === 'nonveg' ? '🍗' : '🥦'}
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Diet Plan
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: plan.dietMode === 'nonveg' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                      color: plan.dietMode === 'nonveg' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                    }}>
                      {plan.dietMode === 'nonveg' ? '🍗 Non-Veg' : '🥦 Vegetarian'}
                    </span>
                  </span>
                }
                iconBg={plan.dietMode === 'nonveg' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)'}
              >
                {plan.meals?.map((meal, i) => (
                  <div key={i} className="meal-item">
                    <div>
                      <span className="meal-time">{meal.time}</span>
                    </div>
                    <div>
                      <div className="meal-name">{meal.name}</div>
                      <div className="meal-note">{meal.note}</div>
                    </div>
                  </div>
                ))}
              </PlanSection>

              {/* Medications */}
              <PlanSection icon="💊" title="Medication Schedule" iconBg="rgba(139,92,246,0.15)">
                {plan.medications?.length > 0 ? plan.medications.map((med, i) => (
                  <div key={i} className="meal-item">
                    <div>
                      <span className="meal-time" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent-violet)' }}>{med.time}</span>
                    </div>
                    <div>
                      <div className="meal-name">{med.name}</div>
                      <div className="meal-note">{med.note}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '10px 0' }}>
                    No specific medications recommended. Consult your doctor if symptoms persist.
                  </div>
                )}
              </PlanSection>

              {/* Rest Schedule */}
              <PlanSection icon="😴" title="Rest & Activity" iconBg="rgba(6,182,212,0.15)">
                {plan.restSchedule?.map((s, i) => (
                  <div key={i} className="meal-item">
                    <div>
                      <span className="meal-time" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)' }}>{s.period}</span>
                    </div>
                    <div className="meal-name">{s.activity}</div>
                  </div>
                ))}
              </PlanSection>
            </div>

            {/* Disclaimer */}
            <div className="warning-banner" style={{ marginTop: '24px' }}>
              <span className="warning-banner-icon">⚕️</span>
              <div className="warning-banner-text">
                <h4>Medical Disclaimer</h4>
                <p>This recovery plan is generated by an AI for informational purposes only and does NOT constitute medical advice. Always consult a qualified healthcare professional before starting any treatment. If you experience severe or worsening symptoms, go to the emergency room immediately.</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!plan && !loading && (
          <div className="empty-state" style={{ marginTop: '20px' }}>
            <div className="empty-state-icon">🗓️</div>
            <div className="empty-state-title">No Recovery Plan Yet</div>
            <div className="empty-state-desc">Describe your symptoms above and MediMind will create a personalized plan with diet, medication, and rest schedule</div>
          </div>
        )}
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
