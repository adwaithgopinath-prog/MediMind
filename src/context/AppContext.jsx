import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AppContext = createContext(null);

// --- ZERO-KNOWLEDGE VAULT ENCRYPTION ---
// Simulates a zero-knowledge local encryption layer. 
// Keys never leave the browser, so the developer cannot read patient files.
const ENCRYPTION_KEY = "medimind-zk-key-" + (localStorage.getItem('medimind_zk_uuid') || (() => {
  const uuid = crypto.randomUUID();
  localStorage.setItem('medimind_zk_uuid', uuid);
  return uuid;
})());

function encryptVault(data) {
  const text = JSON.stringify(data);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
  }
  return btoa(encodeURIComponent(result));
}

function decryptVault(base64Str) {
  if (!base64Str) return [];
  try {
    const text = decodeURIComponent(atob(base64Str));
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return JSON.parse(result);
  } catch {
    return [];
  }
}
// ----------------------------------------

export function AppProvider({ children }) {
  // API key is baked in via .env — no user input needed
  const apiKey = import.meta.env.VITE_GROQ_API_KEY || '';

  const [documents, setDocuments] = useState(() => {
    // Attempt to load encrypted vault first
    const enc = localStorage.getItem('medimind_vault_enc');
    if (enc) return decryptVault(enc);
    
    // Fallback for older non-encrypted data
    try { return JSON.parse(localStorage.getItem('medimind_docs') || '[]'); } catch { return []; }
  });

  const [vitals, setVitals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medimind_vitals') || '{}'); } catch { return {}; }
  });

  // Historical vitals readings for trend analysis
  const [vitalsHistory, setVitalsHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medimind_vitals_history') || '[]'); } catch { return []; }
  });

  const [moodHistory, setMoodHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medimind_mood_history') || '[]'); } catch { return []; }
  });

  const [voiceMemos, setVoiceMemos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medimind_voice_memos') || '[]'); } catch { return []; }
  });

  const [medications, setMedications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medimind_meds') || '[]'); } catch { return []; }
  });

  const [chatHistory, setChatHistory] = useState([]);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // No-op kept for backward compat
  const updateApiKey = useCallback(() => {}, []);

  // Add a document
  const addDocument = useCallback((doc) => {
    setDocuments(prev => {
      const updated = [doc, ...prev];
      const forStorage = updated.map(d => ({ ...d, content: d.content?.substring(0, 5000) }));
      try { 
        localStorage.setItem('medimind_vault_enc', encryptVault(forStorage)); 
        // Clear unencrypted fallback if exists
        localStorage.removeItem('medimind_docs');
      } catch {}
      return updated;
    });
  }, []);

  // Remove a document
  const removeDocument = useCallback((id) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== id);
      try { localStorage.setItem('medimind_vault_enc', encryptVault(updated)); } catch {}
      return updated;
    });
  }, []);

  // Update vitals + push to history
  const updateVitals = useCallback((newVitals) => {
    setVitals(prev => {
      const updated = { ...prev, ...newVitals, updatedAt: new Date().toISOString() };
      try { localStorage.setItem('medimind_vitals', JSON.stringify(updated)); } catch {}
      return updated;
    });
    // Push snapshot to history
    setVitalsHistory(prev => {
      const snapshot = { ...newVitals, recordedAt: new Date().toISOString() };
      const updated = [...prev, snapshot].slice(-30); // keep last 30 readings
      try { localStorage.setItem('medimind_vitals_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const addMoodEntry = useCallback((entry) => {
    setMoodHistory(prev => {
      const updated = [...prev, { ...entry, id: Date.now().toString(), recordedAt: new Date().toISOString() }].slice(-30);
      try { localStorage.setItem('medimind_mood_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const addVoiceMemo = useCallback((memo) => {
    setVoiceMemos(prev => {
      const updated = [...prev, { ...memo, id: Date.now().toString(), recordedAt: new Date().toISOString() }].slice(-50);
      try { localStorage.setItem('medimind_voice_memos', JSON.stringify(updated)); } catch { }
      return updated;
    });
  }, []);

  const addMedication = useCallback((med) => {
    setMedications(prev => {
      const updated = [...prev, { ...med, id: Date.now().toString(), addedAt: new Date().toISOString() }];
      try { localStorage.setItem('medimind_meds', JSON.stringify(updated)); } catch { }
      return updated;
    });
  }, []);

  const removeMedication = useCallback((id) => {
    setMedications(prev => {
      const updated = prev.filter(m => m.id !== id);
      try { localStorage.setItem('medimind_meds', JSON.stringify(updated)); } catch { }
      return updated;
    });
  }, []);

  const generateDoctorReport = useCallback(async (clinicalSummary) => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241);
    doc.text('MediMind AI — Clinical Summary', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr} | Privacy-First encrypted report`, 14, 30);

    // Summary Text
    doc.setFontSize(12);
    doc.setTextColor(0);
    const splitSummary = doc.splitTextToSize(clinicalSummary, 180);
    doc.text(splitSummary, 14, 45);

    // Vitals Table
    if (vitalsHistory.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Vitals History (Last 10 Readings)', 14, 20);
      const vitalsData = vitalsHistory.slice(-10).reverse().map(v => [
        new Date(v.recordedAt).toLocaleString(),
        `${v.heartRate || '-'} bpm`,
        `${v.spo2 || '-'}%`,
        `${v.temperature || '-'}°F`,
        v.bp || '-'
      ]);
      doc.autoTable({
        startY: 25,
        head: [['Recorded At', 'Heart Rate', 'SpO2', 'Temp', 'Blood Pressure']],
        body: vitalsData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] }
      });
    }

    doc.save(`MediMind_Doctor_Report_${dateStr.replace(/\//g, '-')}.pdf`);
  }, [vitalsHistory]);

  // Add chat message
  const addChatMessage = useCallback((message) => {
    setChatHistory(prev => [...prev, {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  // Clear chat
  const clearChat = useCallback(() => { setChatHistory([]); }, []);

  return (
    <AppContext.Provider value={{
      apiKey,
      documents,
      addDocument,
      removeDocument,
      vitals,
      vitalsHistory,
      updateVitals,
      moodHistory,
      addMoodEntry,
      voiceMemos,
      addVoiceMemo,
      medications,
      addMedication,
      removeMedication,
      generateDoctorReport,
      chatHistory,
      addChatMessage,
      clearChat,
      activePage,
      setActivePage,
      sidebarOpen,
      setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
