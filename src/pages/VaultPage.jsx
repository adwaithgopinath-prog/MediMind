import React, { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { extractPDFText, translateLabReport, chatWithMediMind } from '../services/geminiService';
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle, X, Eye, Beaker, Loader, Search, MessageCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function DocPreviewModal({ doc, onClose }) {
  const [jargon, setJargon] = useState('');
  const [jargonLoading, setJargonLoading] = useState(false);
  const [jargonResult, setJargonResult] = useState('');

  const handleTranslateJargon = async () => {
    const selected = window.getSelection().toString().trim();
    if (!selected) {
      setJargon('Please highlight a word in the text first.');
      setJargonResult('');
      return;
    }
    if (selected.length > 50) {
      setJargon('Please select a single word or short phrase.');
      return;
    }
    setJargon(selected);
    setJargonLoading(true);
    setJargonResult('');
    try {
      const { explainMedicalJargon } = await import('../services/geminiService');
      const res = await explainMedicalJargon(selected);
      setJargonResult(res);
    } catch {
      setJargonResult('Error translating jargon.');
    } finally {
      setJargonLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '700px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={20} color="var(--accent-rose)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{doc.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatBytes(doc.size)} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        {/* Jargon Translator Bar */}
        <div style={{ padding: '12px 24px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-primary btn-sm" onClick={handleTranslateJargon} disabled={jargonLoading}>
            {jargonLoading ? 'Translating...' : '🪄 Explain Selected Word'}
          </button>
          <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)' }}>
            {jargonResult ? (
              <div><strong style={{color:'var(--accent-indigo)'}}>{jargon}:</strong> {jargonResult}</div>
            ) : (
              jargon || 'Highlight a scary medical word and click explain'
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <pre style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
            {doc.content || 'No text content extracted from this document.'}
          </pre>
        </div>
      </div>
    </div>
  );
}

function LabTranslatorModal({ doc, vitals, onClose }) {
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runTranslation = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await translateLabReport(doc.content, { vitals });
      setTranslation(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '760px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Beaker size={20} color="var(--accent-indigo)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Lab Report Translator</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{doc.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {!translation && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>🔬</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>
                Translate Your Lab Report
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.7' }}>
                MediMind will explain every test result in plain English — what each number means, what's normal, and what needs attention.
              </div>
              <button className="btn btn-primary" onClick={runTranslation} id="translate-lab-btn">
                <Beaker size={16} /> Translate to Plain English
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 2s ease-in-out infinite' }}>🧬</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                Translating your lab results...
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                Reading numbers, checking ranges, writing plain English explanations
              </div>
              <div className="processing-bar" style={{ maxWidth: '280px', margin: '0 auto' }}>
                <div className="processing-bar-fill" />
              </div>
            </div>
          )}

          {error && <div className="alert alert-danger"><AlertCircle size={16} /> {error}</div>}

          {translation && (
            <div className="fade-in" style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{translation}</ReactMarkdown>
            </div>
          )}
        </div>

        {translation && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={runTranslation} disabled={loading}>
              ↻ Re-translate
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CompareTrendsModal({ docs, onClose }) {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function run() {
      try {
        const { compareHealthTrends } = await import('../services/geminiService');
        const res = await compareHealthTrends(docs[0], docs[1]);
        setResult(res);
      } catch (err) {
        setResult('Error comparing trends: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [docs]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '700px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '15px' }}>
            <span style={{ fontSize: '20px' }}>📈</span> Health Trend Analysis
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader size={24} className="spin" style={{ marginBottom: '16px' }} />
              <div>Comparing your most recent reports...</div>
            </div>
          ) : (
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function VaultPage() {
  const { documents, addDocument, removeDocument, vitals, vitalsHistory } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingName, setProcessingName] = useState('');
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [translateDoc, setTranslateDoc] = useState(null);
  const [compareDocs, setCompareDocs] = useState(null);
  const inputRef = useRef(null);
  const [dpdpConsent, setDpdpConsent] = useState(false);

  // RAG Search
  const [searchQuery, setSearchQuery] = useState('');
  const [ragResult, setRagResult] = useState('');
  const [ragLoading, setRagLoading] = useState(false);

  const handleRagSearch = async () => {
    if (!searchQuery.trim()) return;
    setRagLoading(true);
    setRagResult('');
    try {
      const res = await chatWithMediMind(
        `[HEALTH ARCHIVIST SEARCH]: ${searchQuery}. Search my uploaded medical history across all documents and tell me if there are any borderlines, flags, or relevant historical data points specifically related to this question.`,
        { documents, vitals, vitalsHistory }
      );
      setRagResult(res);
    } catch (err) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setRagLoading(false);
    }
  };

  const processFile = useCallback(async (file) => {
    if (!dpdpConsent) {
      setError('Please agree to the DPDP Consent before uploading.');
      return;
    }
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf') && !file.type.startsWith('image/')) {
      setError('Only PDF and Image files (JPG, PNG, WEBP) are supported currently.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) { setError('File too large. Maximum 50MB allowed.'); return; }

    setError('');
    setProcessing(true);
    setProcessingName(file.name);

    try {
      const content = await extractPDFText(file);
      addDocument({
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        content,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
      });
    } catch (err) {
      setError(`Failed to process ${file.name}: ${err.message}`);
    } finally {
      setProcessing(false);
      setProcessingName('');
    }
  }, [addDocument, dpdpConsent]);

  const handleFiles = useCallback((files) => { Array.from(files).forEach(processFile); }, [processFile]);
  const handleDrop  = useCallback((e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);

  const totalSize = documents.reduce((sum, d) => sum + (d.size || 0), 0);

  return (
    <div className="page-scroll">
      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card indigo">
            <div className="stat-icon indigo"><FileText size={20} /></div>
            <div className="stat-value">{documents.length}</div>
            <div className="stat-label">Documents Uploaded</div>
          </div>
          <div className="stat-card cyan">
            <div className="stat-icon cyan"><CheckCircle size={20} /></div>
            <div className="stat-value">{documents.filter(d => d.status === 'ready').length}</div>
            <div className="stat-label">Ready for Analysis</div>
          </div>
          <div className="stat-card emerald">
            <div className="stat-icon emerald"><Upload size={20} /></div>
            <div className="stat-value">{formatBytes(totalSize)}</div>
            <div className="stat-label">Total Storage Used</div>
          </div>
        </div>

        {/* Health Archivist RAG Search */}
        <div className="card" style={{ marginBottom: '28px', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(16,185,129,0.05))', borderColor: 'var(--border-accent)' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} color="var(--accent-indigo)" /> Personal Health Knowledge Base (RAG)
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
             <input 
              type="text" className="input-field" style={{ flex: 1 }} 
              placeholder="e.g., 'Were my iron levels low in previous reports?' or 'Any signs of high BP last year?'"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRagSearch()}
             />
             <button className="btn btn-primary" onClick={handleRagSearch} disabled={ragLoading || !searchQuery.trim() || documents.length === 0}>
                {ragLoading ? <Loader size={16} className="spin" /> : <><MessageCircle size={16} /> Search Archivist</>}
             </button>
          </div>
          {ragResult && (
            <div className="fade-in" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '14px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-indigo)', fontWeight: 600, fontSize: '12px' }}>
                   <Info size={14} /> AI ARCHIVIST INSIGHT
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{ragResult}</ReactMarkdown>
            </div>
          )}
          {documents.length === 0 && !ragResult && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              💡 Upload medical documents below to enable the Searchable Knowledge Base.
            </div>
          )}
        </div>

        {/* DPDP Consent Form */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <input 
            type="checkbox" 
            id="dpdp-consent" 
            checked={dpdpConsent} 
            onChange={(e) => setDpdpConsent(e.target.checked)} 
            style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <label htmlFor="dpdp-consent" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: '1.6' }}>
            <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>I Agree to Terms of Processing (DPDP Compliance)</strong>
            I grant consent to process my uploaded documents locally using Sovereign Zero-Knowledge Encryption.
          </label>
        </div>

        {/* Upload Zone */}
        <div
          className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${!dpdpConsent ? 'disabled' : ''}`}
          style={{ marginBottom: '28px', opacity: dpdpConsent ? 1 : 0.5, cursor: dpdpConsent ? 'pointer' : 'not-allowed' }}
          onDrop={dpdpConsent ? handleDrop : undefined}
          onDragOver={(e) => { e.preventDefault(); if (dpdpConsent) setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => { if (dpdpConsent) inputRef.current?.click(); else setError('You must agree to the DPDP privacy terms before uploading.'); }}
        >
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} id="vault-upload-input" />
          <span className="upload-icon">📄</span>
          <div className="upload-title">
            {processing ? `Processing ${processingName}...` : 'Drop your medical PDFs or Images here'}
          </div>
          <p className="upload-desc">
            {processing ? 'Gemini 1.5 Pro is analyzing clinical markers...' : 'Supports blood tests, prescriptions, scan reports &bull; Up to 50MB'}
          </p>
          {processing && <div className="processing-bar" style={{ marginTop: '20px', maxWidth: '300px', margin: '20px auto 0' }}><div className="processing-bar-fill" /></div>}
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {/* Document list */}
        {documents.length > 0 ? (
          <>
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  <div className="section-title">Historical Records</div>
                  <div className="section-subtitle">Indexed for AI Retrieval-Augmented Generation (RAG)</div>
                </div>
                {documents.length >= 2 && (
                  <button className="btn btn-primary btn-sm" onClick={() => setCompareDocs([documents[0], documents[1]])}>
                    📈 Longitudinal Trend Analysis
                  </button>
                )}
              </div>
            </div>
            <div className="doc-list">
              {documents.map(doc => (
                <div key={doc.id} className="doc-item">
                  <div className="doc-icon"><FileText size={20} /></div>
                  <div className="doc-info">
                    <div className="doc-name">{doc.name}</div>
                    <div className="doc-meta">{formatBytes(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  </div>
                  <div className={`doc-status ${doc.status}`}>
                    {doc.status === 'ready' ? <><CheckCircle size={11} /> Indexed</> : <><Clock size={11} /> Profiling</>}
                  </div>
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setTranslateDoc(doc)} title="Explain Lab Results"><Beaker size={14} /></button>
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setPreviewDoc(doc)} title="View Content"><Eye size={14} /></button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeDocument(doc.id)} title="Delete"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </>
        ) : (
          !processing && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">Your Medical Archivist is Empty</div>
              <div className="empty-state-desc">Upload reports to unlock Personal Health Knowledge Base search.</div>
            </div>
          )
        )}
      </div>

      {previewDoc && <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      {translateDoc && <LabTranslatorModal doc={translateDoc} vitals={vitals} onClose={() => setTranslateDoc(null)} />}
      {compareDocs && <CompareTrendsModal docs={compareDocs} onClose={() => setCompareDocs(null)} />}
    </div>
  );
}
