import React, { useState, useRef, useCallback } from 'react';
import { analyzeImage } from '../services/geminiService';
import { Camera, Upload, X, Loader, Eye, Pill, Scan } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ANALYSIS_TYPES = [
  { id: 'skin', icon: '🩺', label: 'Skin & Rash', prompt: 'Analyze this skin condition or rash. Describe what you see, possible causes, and whether it looks concerning. Note color, texture, spread pattern, and any notable features.' },
  { id: 'pill', icon: '💊', label: 'Pill Identifier', prompt: 'Identify this pill or medication. Describe its color, shape, size, and any visible imprints or markings. If identifiable, state what it likely is and its typical use. Warn about risks of taking unidentified medications.' },
  { id: 'wound', icon: '🩹', label: 'Wound / Injury', prompt: 'Analyze this wound or injury. Describe its appearance, depth, and any signs of infection (redness, swelling, discharge). Advise on first aid and whether medical attention is needed.' },
  { id: 'scan', icon: '🔬', label: 'Medical Image', prompt: 'Analyze this medical image (X-ray, MRI, scan report, or lab result photo). Describe what is visible and what it might indicate in plain English.' },
  { id: 'waste', icon: '🚽', label: 'Hydration / Digestion', prompt: 'Analyze this medical waste sample (stool or urine). For urine: assess hydration levels or possible infection based on color/cloudiness. For stool: assess digestive health or possible issues based on the Bristol scale (color and form). Provide a gentle, clinical assessment and advise if a doctor is needed.' },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DiagnosticPage() {
  const [selectedType, setSelectedType] = useState('skin');
  const [image, setImage] = useState(null); // { file, url, base64, mimeType }
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Maximum 10MB allowed.');
      return;
    }
    setError('');
    setResult('');
    const base64 = await fileToBase64(file);
    const url = URL.createObjectURL(file);
    setImage({ file, url, base64, mimeType: file.type });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const type = ANALYSIS_TYPES.find(t => t.id === selectedType);
      const analysis = await analyzeImage(image.base64, image.mimeType, type.prompt);
      setResult(analysis);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult('');
    setError('');
  };

  return (
    <div className="page-scroll">
      <div className="page-content">
        {/* Info Banner */}
        <div className="warning-banner" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', borderColor: 'rgba(99,102,241,0.25)', marginBottom: '24px' }}>
          <span className="warning-banner-icon">🔬</span>
          <div className="warning-banner-text">
            <h4 style={{ color: 'var(--accent-indigo)' }}>Visual AI Diagnostic</h4>
            <p>Upload a photo of a skin condition, unidentified pill, wound, medical scan, or waste sample. MediMind's AI will analyze the image and provide clinical observations. <strong>This does not replace a doctor's diagnosis.</strong></p>
          </div>
        </div>

        {/* Analysis Type Selector */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {ANALYSIS_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: 'var(--radius-lg)',
                border: selectedType === type.id ? '2px solid var(--accent-indigo)' : '1px solid var(--border-medium)',
                background: selectedType === type.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                color: selectedType === type.id ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                fontWeight: selectedType === type.id ? 700 : 500,
                fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: image ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
          {/* Upload Zone */}
          <div>
            {!image ? (
              <div
                className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
                style={{ marginBottom: 0, minHeight: '280px' }}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
                  id="diagnostic-image-input"
                />
                <span className="upload-icon">📸</span>
                <div className="upload-title">Drop image or tap to upload</div>
                <p className="upload-desc">
                  {ANALYSIS_TYPES.find(t => t.id === selectedType)?.icon}{' '}
                  {ANALYSIS_TYPES.find(t => t.id === selectedType)?.label} — JPG, JPEG, PNG, WEBP • Max 10MB
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                    📷 Camera supported on mobile
                  </span>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={image.url}
                    alt="Uploaded for diagnosis"
                    style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', background: '#000', display: 'block' }}
                  />
                  <button
                    onClick={reset}
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                      width: 32, height: 32, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ padding: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{image.file.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {(image.file.size / 1024).toFixed(0)} KB • {ANALYSIS_TYPES.find(t => t.id === selectedType)?.label}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleAnalyze}
                    disabled={loading}
                    id="analyze-image-btn"
                  >
                    {loading
                      ? <><Loader size={16} className="spin" /> Analyzing...</>
                      : <><Eye size={16} /> Analyze Image</>
                    }
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger" style={{ marginTop: '12px' }}>
                {error}
              </div>
            )}

            {/* Tips */}
            <div className="card" style={{ marginTop: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>📸 Tips for Best Results</div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                <li>Use good lighting — natural light works best</li>
                <li>Keep the camera steady and close to the subject</li>
                <li>For skin: include a coin for scale reference</li>
                <li>For pills: photograph both sides if possible</li>
                <li>Ensure the image is in focus and not blurry</li>
              </ul>
            </div>
          </div>

          {/* Result */}
          {(loading || result) && (
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 2s ease-in-out infinite' }}>🔬</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                    Analyzing image...
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                    AI is examining the visual details
                  </div>
                  <div className="processing-bar" style={{ maxWidth: '260px', margin: '0 auto' }}>
                    <div className="processing-bar-fill" />
                  </div>
                </div>
              ) : (
                <div className="card fade-in">
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={18} color="var(--accent-indigo)" />
                    Visual Analysis Report
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={reset}>
                      Upload New Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
