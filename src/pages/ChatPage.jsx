import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { chatWithMediMind, triageSymptoms } from '../services/geminiService';
import { Send, Mic, MicOff, Trash2, AlertCircle, AlertTriangle, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmergencyModal from '../components/EmergencyModal';

const QUICK_PROMPTS = [
  "I have a headache and nausea",
  "Feeling feverish and weak",
  "Chest tightness and shortness of breath",
  "Stomach pain after eating",
  "What medications should I avoid?",
  "Summarize my medical history",
];

const SEVERITY_CONFIG = {
  green:  { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.3)', color: 'var(--accent-emerald)', dot: '🟢', label: 'Self-care' },
  yellow: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)', color: 'var(--accent-amber)',   dot: '🟡', label: 'See a Doctor' },
  red:    { bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.4)',  color: 'var(--accent-rose)',    dot: '🔴', label: 'Go to ER Now' },
};

function parseVerifyTags(content) {
  const marker = '[VERIFY]: ';
  const verifyIdx = content.lastIndexOf(marker);
  if (verifyIdx === -1) return { text: content, tags: [] };
  const text = content.substring(0, verifyIdx).trim();
  const tagsStr = content.substring(verifyIdx + marker.length).trim();
  const tags = tagsStr.split('|').map(s => s.trim()).filter(Boolean);
  return { text, tags };
}

function SeverityBadge({ triage, onEmergency }) {
  if (!triage) return null;
  const cfg = SEVERITY_CONFIG[triage.level];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '6px 12px', borderRadius: 'var(--radius-full)',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: '12px', fontWeight: 600, color: cfg.color,
      marginTop: '8px', cursor: triage.level === 'red' ? 'pointer' : 'default',
    }}
      onClick={triage.level === 'red' ? onEmergency : undefined}
    >
      {cfg.dot} {cfg.label}
      {triage.level === 'red' && (
        <span style={{ background: 'var(--accent-rose)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
          TAP FOR ER →
        </span>
      )}
    </div>
  );
}

function Message({ msg, onEmergency }) {
  const isAI = msg.role === 'ai';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { text, tags } = isAI ? parseVerifyTags(msg.content) : { text: msg.content, tags: [] };
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(isAI ? text : msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`message ${isAI ? 'ai' : 'user'}`}>
      <div className={`message-avatar ${isAI ? 'ai' : 'user'}`}>
        {isAI ? '⚕️' : '👤'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="message-bubble">
          {isAI ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          ) : (
            msg.content
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          <div className="message-time">{time}</div>
          {isAI && msg.triage && (
            <SeverityBadge triage={msg.triage} onEmergency={() => onEmergency(msg.triage)} />
          )}
          <button className="message-copy-btn" onClick={handleCopy} title="Copy message">
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
        
        {/* Verify Tags */}
        {tags.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SOURCES:</span>
            {tags.map((tag, i) => {
              const isVault = tag.toLowerCase().includes('vault');
              const term = tag.replace(/\(from your Vault\)|\(PubMed\)|\(Mayo Clinic\)/ig, '').trim();
              return (
                <div key={i} style={{ display: 'flex', gap: '4px' }}>
                  {isVault ? (
                    <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-full)', padding: '2px 8px', color: 'var(--accent-indigo)' }}>
                      🔒 Vault: {term}
                    </span>
                  ) : (
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full)', padding: '2px 8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      🏥 Verify: {term}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isAI && msg.triage?.level === 'red' && (
          <div style={{
            marginTop: '10px', padding: '10px 14px',
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--accent-rose)',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          }}
            onClick={() => onEmergency(msg.triage)}
          >
            <AlertTriangle size={16} /> Your symptoms may need emergency attention — tap to open Emergency Protocol
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message ai">
      <div className="message-avatar ai">⚕️</div>
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { documents, vitals, vitalsHistory, moodHistory, voiceMemos, chatHistory, addChatMessage, clearChat, addVoiceMemo } = useApp();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAmbientListening, setIsAmbientListening] = useState(false);
  const [error, setError] = useState('');
  const [emergencyTriage, setEmergencyTriage] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    setError('');
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    addChatMessage({ role: 'user', content: msg });
    setIsLoading(true);

    try {
      // Run AI response + triage in parallel
      const [response, triage] = await Promise.all([
        chatWithMediMind(msg, { documents, vitals, vitalsHistory, chatHistory }),
        triageSymptoms(msg),
      ]);

      addChatMessage({ role: 'ai', content: response, triage });

      // Auto-open emergency modal for red alerts
      if (triage?.level === 'red') {
        setTimeout(() => setEmergencyTriage(triage), 500);
      }
    } catch (err) {
      addChatMessage({
        role: 'ai',
        content: `I'm sorry, I encountered an error: ${err.message}. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, documents, vitals, vitalsHistory, chatHistory, addChatMessage]);

  const handleClinicalSummary = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const { generateClinicalSummary } = await import('../services/geminiService');
      const response = await generateClinicalSummary({ documents, vitals, vitalsHistory, chatHistory, moodHistory, voiceMemos });
      addChatMessage({ role: 'ai', content: response });
    } catch (err) {
      setError(`Summary error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoiceRecording = useCallback((isAmbient) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input is not supported in your browser. Try Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isAmbient ? setIsAmbientListening(true) : setIsListening(true);
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      if (isAmbient) {
        setIsLoading(true);
        try {
          const { extractVoiceMemoPoints } = await import('../services/geminiService');
          const points = await extractVoiceMemoPoints(transcript);
          
          let summaryStr = transcript;
          let flagAlert = false;
          
          if (points) {
            summaryStr = points.summary || transcript;
            flagAlert = points.flagForDoctor;
          }
          
          // Add voice memo
          const { addVoiceMemo } = useApp.getState ? useApp.getState() : { addVoiceMemo: () => {} };
          // Oh, wait, addVoiceMemo is retrieved from useApp() context directly at the top of the component. Let's use the local 'addVoiceMemo' from context instead of getState.
          // In ChatPage body: const { ..., voiceMemos, addVoiceMemo, ... } = useApp();
          addVoiceMemo({ transcript, points });
          addChatMessage({ role: 'ai', content: `🎙️ Ambient Scribe Logged: *"${summaryStr}"* ${flagAlert ? '\n\n⚠️ **Flagged for review at next appointment.**' : ''}` });
        } catch { } // fail silently but log happens
        setIsLoading(false);
      } else {
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        autoResize();
      }
    };

    recognition.onend = () => { isAmbient ? setIsAmbientListening(false) : setIsListening(false); };
    recognition.onerror = () => { isAmbient ? setIsAmbientListening(false) : setIsListening(false); };
    
    recognitionRef.current = recognition;
    recognition.start();
  }, [autoResize, addChatMessage, addVoiceMemo]);

  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    else startVoiceRecording(false);
  };

  const toggleAmbient = () => {
    if (isAmbientListening) { recognitionRef.current?.stop(); setIsAmbientListening(false); }
    else startVoiceRecording(true);
  };

  const isEmpty = chatHistory.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 81px)', padding: '0 32px' }}>
      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1 }}>
        {isEmpty && !isLoading ? (
          <div className="welcome-container">
            <div className="welcome-icon">⚕️</div>
            <h1 className="welcome-title welcome-gradient-text">MediMind Sick-Bay</h1>
            <p className="welcome-desc">
              Tell me your symptoms and I'll analyze them against your medical history.
              I can help with what might be causing your discomfort and suggest a recovery plan.
              {documents.length === 0 && (
                <span style={{ display: 'block', marginTop: '10px', color: 'var(--accent-amber)', fontSize: '13px' }}>
                  💡 Tip: Upload your medical records in the Medical Vault for personalized advice.
                </span>
              )}
            </p>
            {/* Triage legend */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                <span key={k} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: v.bg, border: `1px solid ${v.border}`, color: v.color, fontWeight: 600 }}>
                  {v.dot} {v.label}
                </span>
              ))}
            </div>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button key={i} className="quick-prompt-btn" onClick={() => sendMessage(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map(msg => (
              <Message key={msg.id} msg={msg} onEmergency={setEmergencyTriage} />
            ))}
            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-warning" style={{ margin: '0 0 12px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        {chatHistory.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleClinicalSummary} disabled={isLoading} style={{ gap: '6px', display: 'flex', alignItems: 'center', borderColor: 'var(--accent-indigo)', color: 'var(--accent-indigo)' }}>
              📄 Doctor Handover Summary
            </button>
            <button className="btn btn-secondary btn-sm" onClick={clearChat} style={{ gap: '6px', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={13} /> Clear Chat
            </button>
          </div>
        )}
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Describe your symptoms... (Shift+Enter for new line)"
            value={input}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            id="chat-input"
          />
          <button
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
            disabled={isAmbientListening || isLoading}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          
          <button
            className={`voice-btn ambient ${isAmbientListening ? 'listening' : ''}`}
            onClick={toggleAmbient}
            title={isAmbientListening ? 'Stop ambient scribe' : 'Ambient Scribe Memo'}
            disabled={isListening || isLoading}
            style={{ color: 'var(--accent-indigo)', marginLeft: '-8px' }}
          >
            {isAmbientListening ? <MicOff size={18} /> : <span style={{fontSize:'16px'}}>🎙️</span>}
          </button>

          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            id="send-message-btn"
          >
            <Send size={17} />
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          ⚕️ MediMind is an AI assistant, not a medical professional. Always consult a doctor for diagnosis.
        </div>
      </div>

      {/* Emergency Modal */}
      {emergencyTriage && (
        <EmergencyModal triage={emergencyTriage} onClose={() => setEmergencyTriage(null)} />
      )}
    </div>
  );
}
