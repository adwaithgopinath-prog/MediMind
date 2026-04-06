import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { checkMedicineInteraction } from '../services/geminiService';
import { Shield, Search, AlertTriangle, Loader, Plus, Trash2, Pill, CheckCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '../components/Toast';

const COMMON_MEDS = ['Ibuprofen', 'Paracetamol', 'Aspirin', 'Amoxicillin', 'Metformin', 'Atorvastatin', 'Lisinopril', 'Omeprazole'];

export default function InteractionPage() {
  const { documents, vitals, vitalsHistory, moodHistory, medications, addMedication, removeMedication } = useApp();
  const toast = useToast();
  const [medicine, setMedicine] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '' });

  const check = async (med) => {
    const m = med || medicine;
    if (!m.trim()) { setError('Please enter a medicine name.'); return; }

    setError('');
    setResult('');
    setLoading(true);

    try {
      const { getDrugMetadata } = await import('../services/geminiService');
      const [aiRes, apiMeta] = await Promise.all([
        checkMedicineInteraction(m, { documents, vitals, vitalsHistory, moodHistory }),
        getDrugMetadata(m)
      ]);
      setResult(aiRes);
      setMeta(apiMeta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMed = async () => {
    if (!newMed.name) return;
    setLoading(true);
    try {
      // Automatic safety check before adding
      const safetyCheck = await checkMedicineInteraction(newMed.name, { documents, vitals, vitalsHistory, moodHistory });
      const isDangerous = safetyCheck.includes('❌') || safetyCheck.toLowerCase().includes('avoid') || safetyCheck.toLowerCase().includes('danger');
      
      addMedication({ ...newMed });
      
      if (isDangerous) {
        toast.warning('Medication Added with Warning', `MediMind detected potential risks for ${newMed.name}. Please review the interaction report.`);
        setResult(safetyCheck);
        setMedicine(newMed.name);
      } else {
        toast.success('Medication Added', `${newMed.name} has been added to your tracker.`);
      }
      
      setNewMed({ name: '', dosage: '', frequency: '' });
      setShowAddForm(false);
    } catch (err) {
       toast.error('Error', 'Failed to perform safety check.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-content">
        <div className="warning-banner" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.1))' }}>
          <span className="warning-banner-icon">🛡️</span>
          <div className="warning-banner-text">
            <h4 style={{ color: 'var(--accent-indigo)' }}>Medication Safety & Management</h4>
            <p>Track your medications and run agentic safety checks against your medical history. MediMind uses its clinical knowledge base to predict adverse reactions with your unique health profile.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          <div className="left-col">
            {/* Search / Checker */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={18} color="var(--accent-indigo)" /> Safety Check Agent
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input-field"
                  style={{ flex: 1, minWidth: '200px' }}
                  placeholder="Enter medicine name e.g., Aspirin..."
                  value={medicine}
                  onChange={e => setMedicine(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && check()}
                  id="medicine-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => check()}
                  disabled={loading || !medicine.trim()}
                  id="check-interaction-btn"
                >
                  {loading ? <><Loader size={16} className="spin" /> Thinking...</> : <><Shield size={16} /> Run Analysis</>}
                </button>
              </div>

              {/* Quick select */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent / Common:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COMMON_MEDS.map(m => (
                    <button key={m} className="quick-prompt-btn" onClick={() => { setMedicine(m); check(m); }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginTop: '14px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
                </div>
              )}
            </div>

            {/* Interaction Report */}
            {result && !loading && (
              <div className="fade-in">
                {/* AI Insights Card */}
                <div className="card" style={{ marginBottom: '20px', borderColor: 'var(--border-accent)', background: 'rgba(99,102,241,0.03)' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={18} color="var(--accent-indigo)" />
                    AI Predictive Analysis: {medicine}
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                  </div>
                </div>

                {/* Clinical API Data Card */}
                {meta && (meta.fda || meta.rxnorm) && (
                  <div className="card" style={{ background: 'rgba(6,182,212,0.03)', borderColor: 'rgba(6,182,212,0.2)' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={18} color="var(--accent-cyan)" />
                      Verified Clinical Metadata
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      {meta.rxnorm && (
                        <div className="api-data-pill">
                          <div className="api-data-label">RxNorm Standard Name</div>
                          <div className="api-data-value">{meta.rxnorm.name}</div>
                          <div className="api-data-source">Source: {meta.rxnorm.source}</div>
                        </div>
                      )}
                      {meta.drugcentral && (
                        <div className="api-data-pill">
                          <div className="api-data-label">Chemical Category</div>
                          <div className="api-data-value">{meta.drugcentral.chemicalClass}</div>
                          <div className="api-data-source">Source: {meta.drugcentral.source}</div>
                        </div>
                      )}
                    </div>

                    {meta.fda && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         <div className="clinical-section">
                           <div className="clinical-label">📋 Official Indications</div>
                           <div className="clinical-text">{meta.fda.indications || 'Information not available.'}</div>
                         </div>
                         <div className="clinical-section">
                           <div className="clinical-label">⚠️ FDA Boxed Warnings</div>
                           <div className="clinical-text" style={{ color: 'var(--accent-rose)' }}>{meta.fda.warnings || 'No major warnings listed.'}</div>
                         </div>
                         <div className="clinical-section">
                           <div className="clinical-label">🧪 Known Adverse Reactions</div>
                           <div className="clinical-text">{meta.fda.sideEffects || 'Standard side effects apply.'}</div>
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--text-muted)' }}>
                            <span>API Status: Healthy</span>
                            <span>Last Sync: {new Date(meta.updatedAt).toLocaleString()}</span>
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {loading && !showAddForm && (
               <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div className="typing-indicator" style={{ margin: '0 auto 16px' }}>
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>MediMind Agent is scanning your medical history for contraindications...</div>
               </div>
            )}
          </div>

          <div className="right-col">
            {/* My Medications Tracker */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pill size={18} color="var(--accent-rose)" /> My Medications
                </div>
                {!showAddForm && (
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowAddForm(true)}>
                    <Plus size={14} /> Add New
                  </button>
                )}
              </div>

              {showAddForm && (
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input 
                      className="input-field" placeholder="Medication Name (e.g. Metformin)" 
                      value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input 
                        className="input-field" placeholder="Dosage (e.g. 500mg)" 
                        value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})}
                      />
                      <input 
                        className="input-field" placeholder="Frequency (e.g. 2x Daily)" 
                        value={newMed.frequency} onChange={e => setNewMed({...newMed, frequency: e.target.value})}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddMed} disabled={loading || !newMed.name}>
                        {loading ? 'Performing Safety Check...' : 'Run Safety Check & Add'}
                      </button>
                      <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {medications.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <div className="empty-state-icon" style={{ fontSize: '32px' }}>📦</div>
                  <div className="empty-state-desc">No medications being tracked.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {medications.map(med => (
                    <div key={med.id} className="med-item" style={{ 
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-md)' 
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-rose)' }}>
                         <Pill size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{med.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{med.dosage} • {med.frequency}</div>
                      </div>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        onClick={() => removeMedication(med.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.1)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                 <CheckCircle size={16} color="var(--accent-emerald)" style={{ marginTop: '2px' }} />
                 <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                   <strong>Agentic Safety Check:</strong> MediMind automatically verifies every new medication against your "Zero-Knowledge" health vault before adding it to your schedule.
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
