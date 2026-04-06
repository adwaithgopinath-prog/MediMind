import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Navigation, AlertTriangle, Loader } from 'lucide-react';

const EMERGENCY_NUMBERS = {
  IN: { number: '112', ambulance: '108', label: 'India Emergency' },
  US: { number: '911', ambulance: '911', label: 'US Emergency' },
  GB: { number: '999', ambulance: '999', label: 'UK Emergency' },
  AU: { number: '000', ambulance: '000', label: 'AU Emergency' },
  default: { number: '112', ambulance: '112', label: 'International Emergency' },
};

function detectCountry() {
  // Simple timezone-based detection
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz.includes('Asia/Kolkata') || tz.includes('Asia/Calcutta')) return 'IN';
  if (tz.includes('America/')) return 'US';
  if (tz.includes('Europe/London')) return 'GB';
  if (tz.includes('Australia/')) return 'AU';
  return 'default';
}

export default function EmergencyModal({ triage, onClose }) {
  const [location, setLocation] = useState(null);
  const [locError, setLocError] = useState('');
  const [locLoading, setLocLoading] = useState(true);
  const country = EMERGENCY_NUMBERS[detectCountry()];

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by your browser.');
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
      },
      () => {
        setLocError('Could not get your location. Please allow location access.');
        setLocLoading(false);
      },
      { timeout: 8000 }
    );
  }, []);

  const mapsUrl = location
    ? `https://www.google.com/maps/search/emergency+room+hospital/@${location.lat},${location.lng},14z`
    : `https://www.google.com/maps/search/emergency+room+hospital+near+me`;

  const directionsUrl = location
    ? `https://www.google.com/maps/dir/?api=1&destination=nearest+emergency+room&origin=${location.lat},${location.lng}`
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', border: '2px solid rgba(244,63,94,0.5)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '520px',
        boxShadow: '0 0 60px rgba(244,63,94,0.3)', animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', background: 'rgba(244,63,94,0.15)',
          borderBottom: '1px solid rgba(244,63,94,0.3)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(244,63,94,0.2)', border: '2px solid var(--accent-rose)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 1.5s infinite',
          }}>
            <AlertTriangle size={22} color="var(--accent-rose)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent-rose)' }}>
              🔴 Emergency Protocol Activated
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {triage?.reason || 'Symptoms may require immediate medical attention'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '4px',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Call Emergency */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Call Emergency Services
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={`tel:${country.number}`}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '14px', background: 'rgba(244,63,94,0.15)',
                  border: '1px solid rgba(244,63,94,0.4)', borderRadius: 'var(--radius-lg)',
                  color: 'var(--accent-rose)', fontWeight: 800, fontSize: '20px',
                  textDecoration: 'none', transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(244,63,94,0.25)'}
                onMouseLeave={e => e.target.style.background = 'rgba(244,63,94,0.15)'}
              >
                <Phone size={20} /> {country.number}
              </a>
              {country.ambulance !== country.number && (
                <a
                  href={`tel:${country.ambulance}`}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '14px', background: 'rgba(244,63,94,0.1)',
                    border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-lg)',
                    color: 'var(--accent-rose)', fontWeight: 700, fontSize: '18px',
                    textDecoration: 'none',
                  }}
                >
                  🚑 {country.ambulance}
                </a>
              )}
            </div>
          </div>

          {/* Nearest ER */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Find Nearest Emergency Room
            </div>

            {locLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '14px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <Loader size={16} className="spin" /> Getting your location...
              </div>
            ) : locError ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '10px' }}>
                ⚠️ {locError}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--accent-emerald)', marginBottom: '10px', padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)' }}>
                <MapPin size={14} /> Location detected ✓
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '12px', background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px',
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
              >
                <MapPin size={16} color="var(--accent-indigo)" /> View ERs on Map
              </a>
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', padding: '12px', background: 'var(--gradient-primary)',
                    borderRadius: 'var(--radius-md)', color: 'white',
                    fontWeight: 600, fontSize: '14px', textDecoration: 'none',
                  }}
                >
                  <Navigation size={16} /> Get Directions
                </a>
              )}
            </div>
          </div>

          {/* What to do while waiting */}
          <div style={{
            padding: '14px', background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-amber)', marginBottom: '8px' }}>
              ⏳ While Waiting for Help:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              <li>Stay calm and sit or lie down comfortably</li>
              <li>Do not eat or drink anything</li>
              <li>Inform someone nearby about your situation</li>
              <li>Keep your phone charged and nearby</li>
              <li>Have your medical documents / ID ready</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ⚕️ AI triage — not a substitute for emergency services
          </span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); } 50% { box-shadow: 0 0 0 8px rgba(244,63,94,0); } }`}</style>
    </div>
  );
}
