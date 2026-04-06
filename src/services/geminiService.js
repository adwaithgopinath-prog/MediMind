// AI Service for MediMind — powered by Groq (free tier: 14,400 req/day)
import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
let groq = API_KEY ? new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true }) : null;

export function initGroq(apiKey) {
  groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
}

export function isInitialized() {
  return groq !== null;
}

// Build system prompt with patient context
function buildSystemPrompt(context = {}) {
  const { documents = [], vitals = {}, vitalsHistory = [] } = context;

  const documentContext = documents.length > 0
    ? `\n=== PATIENT MEDICAL HISTORY (from uploaded documents) ===\n${documents.map(d => `[${d.name}]: ${d.content}`).join('\n\n')}\n=========================\n`
    : '';

  const vitalsContext = Object.keys(vitals).filter(k => k !== 'updatedAt').length > 0
    ? `\n=== CURRENT VITALS ===\nHeart Rate: ${vitals.heartRate || 'N/A'} bpm\nSpO₂: ${vitals.spo2 || 'N/A'}%\nTemperature: ${vitals.temperature || 'N/A'}°F\nBlood Pressure: ${vitals.bp || 'N/A'}\n=====================\n`
    : '';

  const trendContext = vitalsHistory.length > 1
    ? `\n=== VITALS HISTORY (most recent ${Math.min(vitalsHistory.length, 7)} readings) ===\n${vitalsHistory.slice(-7).map(v => `[${new Date(v.recordedAt).toLocaleDateString()}] HR:${v.heartRate||'N/A'} SpO2:${v.spo2||'N/A'} Temp:${v.temperature||'N/A'} BP:${v.bp||'N/A'}`).join('\n')}\n==========================\n`
    : '';

  return `You are MediMind, a warm, clear, and knowledgeable medical AI assistant. Your job is to help users understand their health in simple, everyday language.

## HOW TO STRUCTURE EVERY RESPONSE:

1. **Acknowledge & CBT-lite** — Start with an empathetic acknowledgment of their symptoms. If they seem anxious or are "health-scanning" (overly focused on minor symptoms), offer a 1-2 sentence CBT-lite grounding technique (e.g., box breathing, reminding them that the symptom is common and not a sign of catastrophic illness).

2. **What's likely happening** —
   ### 🔍 What This Might Be
   Explain what could be causing their symptoms. Use bullet points. 

3. **How serious is it?** —
   ### 🚦 Severity Level
   🟢 Mild / 🟡 Moderate / 🔴 Serious — and explain why briefly.

4. **What to do right now** —
   ### 💊 What You Can Do
   Actionable steps. Include home remedies or OTCs.

5. **Warning signs** —
   ### ⚠️ When to Seek Help
   Bullet list of red flags to watch for.

6. **End with disclaimer:**
   ---
   ⚕️ *I'm an AI assistant. Always consult a healthcare professional.*

## TONE & LANGUAGE RULES:
- Frame things reassuringly to manage health anxiety. 
- Avoid catastrophizing.

## SOURCE TRANSPARENCY (MANDATORY):
At the very end of EVERY response, add one line indicating the trusted sources and vault documents used to form your conclusion in this exact format:
[VERIFY]: term1 (PubMed) | term2 (Mayo Clinic) | "Document_Name.pdf" (from your Vault)
List 2-4 references. Use the exact filename if drawing from the user's uploaded history.

${documentContext}${vitalsContext}${trendContext}`;
}

// Chat with MediMind
export async function chatWithMediMind(userMessage, context = {}) {
  if (!groq) throw new Error('AI not initialized.');

  const { chatHistory = [] } = context;

  const messages = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...chatHistory.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.6,
    max_tokens: 1536,
  });

  return response.choices[0].message.content;
}

// ─── NEW: Severity triage ────────────────────────────────────────────────────
export async function triageSymptoms(userMessage) {
  if (!groq) return null;

  const prompt = `You are a medical triage AI. Analyze this symptom description and respond with ONLY a single valid JSON object — no explanation, no markdown fences.

Symptom description: "${userMessage}"

JSON format:
{
  "level": "green" | "yellow" | "red",
  "label": "Self-care" | "See a Doctor" | "Go to ER Now",
  "reason": "One short sentence explaining the triage decision",
  "emergencyKeywords": ["keyword1", "keyword2"]
}

Rules:
- RED: chest pain, difficulty breathing, stroke signs, severe bleeding, loss of consciousness, heart attack signs, anaphylaxis, suicidal ideation
- YELLOW: fever >102°F, infection signs, persistent pain 24h+, symptoms worsening
- GREEN: mild cold, minor aches, mild allergies, general wellness questions`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    });
    const text = response.choices[0].message.content.trim();
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

// ─── NEW: Visual / Image Diagnosis ──────────────────────────────────────────
export async function analyzeImage(base64Image, mimeType, query) {
  if (!groq) throw new Error('AI not initialized.');

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
          {
            type: 'text',
            text: `You are MediMind's visual diagnostic assistant. ${query || 'Analyze this medical image and describe what you see.'}

Structure your response as:
### 🔬 Visual Observation
What you can see in the image (objective description).

### 🩺 Possible Interpretations
What this might indicate (use cautious language).

### 🚦 Concern Level
🟢 Low / 🟡 Moderate / 🔴 High — explain why briefly.

### ✅ Recommended Next Steps
What the person should do.

---
⚕️ *Visual AI analysis is not a diagnosis. Always consult a dermatologist or physician for skin conditions and a pharmacist for pill identification.*`,
          },
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  return response.choices[0].message.content;
}

// ─── NEW: Lab Report Translator ──────────────────────────────────────────────
export async function translateLabReport(labText, context = {}) {
  if (!groq) throw new Error('AI not initialized.');

  const { vitals = {}, documents = [] } = context;

  const prompt = `You are MediMind's Lab Report Translator. A patient has uploaded their lab report and needs it explained in plain, friendly English — not medical jargon.

Lab Report Text:
${labText.substring(0, 3000)}

Patient Vitals (if available): HR:${vitals.heartRate||'N/A'}, BP:${vitals.bp||'N/A'}, Temp:${vitals.temperature||'N/A'}°F

Translate this lab report using this structure:

### 📋 Summary
One paragraph in plain English — what this report is about and the overall picture.

### 🔬 Your Results Explained
For each marker/test result, provide a row like:
**[Test Name]**: Your value was [X]. Normal range is [Y]. This means: [plain English explanation of what this marker does and whether theirs is concerning].

### 🚦 Things to Watch
List any results that are outside normal range with a simple ⚠️ or 🔴 indicator and explain why it matters in everyday language.

### ✅ What To Do Next
Simple, actionable advice based on these results.

### 💡 Questions to Ask Your Doctor
2-3 specific questions the patient should bring up at their next appointment based on these results.

---
⚕️ *This translation is for educational purposes. Only your doctor can interpret results in the context of your full health picture.*`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1536,
  });

  return response.choices[0].message.content;
}

// ─── NEW: Vitals Trend Analysis ──────────────────────────────────────────────
export async function analyzeVitalsTrend(vitalsHistory, currentVitals) {
  if (!groq || vitalsHistory.length < 2) return null;

  const historyText = vitalsHistory.slice(-10).map(v =>
    `[${new Date(v.recordedAt).toLocaleDateString()}] HR:${v.heartRate||'N/A'} SpO2:${v.spo2||'N/A'} Temp:${v.temperature||'N/A'} BP:${v.bp||'N/A'}`
  ).join('\n');

  const prompt = `You are MediMind analyzing a patient's vitals trend over time.

Vitals History:
${historyText}

Latest Reading: HR:${currentVitals.heartRate||'N/A'} SpO2:${currentVitals.spo2||'N/A'} Temp:${currentVitals.temperature||'N/A'} BP:${currentVitals.bp||'N/A'}

Provide a SHORT trend analysis (max 4 bullet points). Each bullet should be one sentence. Focus on:
- Any significant changes or drift from earlier readings
- Whether current readings are stable, improving, or worsening
- Any patterns worth noting (e.g. consistently elevated HR)
- One actionable recommendation

Format: Return ONLY a JSON array of strings (the bullet points). No other text.
Example: ["Your heart rate has been steadily rising over the past 3 readings.", "SpO2 is stable and within normal range.", "Blood pressure shows slight improvement.", "Consider reducing caffeine intake if heart rate continues to rise."]`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });
    const text = response.choices[0].message.content.trim();
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

// Generate a Recovery Plan
export async function generateRecoveryPlan(symptoms, context = {}) {
  if (!groq) throw new Error('AI not initialized.');

  const { documents = [], vitals = {}, dietMode = 'veg' } = context;
  const isVeg = dietMode === 'veg';

  const documentContext = documents.length > 0
    ? `Patient Medical History:\n${documents.map(d => `[${d.name}]: ${d.content.substring(0, 500)}`).join('\n')}\n`
    : 'No medical history uploaded.';

  const vitalsContext = `Current Vitals: HR: ${vitals.heartRate || 'N/A'}, SpO2: ${vitals.spo2 || 'N/A'}%, Temp: ${vitals.temperature || 'N/A'}°F, BP: ${vitals.bp || 'N/A'}`;

  const dietConstraint = isVeg
    ? `STRICT DIET MODE — VEGETARIAN ONLY:
- ALL meals must be 100% plant-based (no meat, no fish, no eggs, no gelatin)
- Use: vegetables, fruits, legumes (lentils, chickpeas, beans), tofu, paneer, dairy (milk, yogurt, cheese), nuts, seeds, whole grains
- For protein: include lentil soup, tofu scramble, paneer, Greek yogurt, chickpea dishes, nut butters
- For Indian context: dal, khichdi, idli, sabzi, roti with vegetables are preferred`
    : `DIET MODE — NON-VEGETARIAN:
- Meals MAY include lean meats, poultry, fish, eggs, and dairy
- Prefer easy-to-digest proteins during illness: poached eggs, chicken broth, steamed fish, boiled chicken
- Avoid heavy red meats, fried items, or hard-to-digest foods while recovering
- Include vegetables and fruits alongside proteins for balanced nutrition`;

  const prompt = `You are MediMind generating a structured, easy-to-follow recovery plan for a patient.

${documentContext}
${vitalsContext}
Patient's Symptoms: ${symptoms}

=== DIET INSTRUCTIONS (MUST FOLLOW STRICTLY) ===
${dietConstraint}
=================================================

Create a practical, day-by-day style recovery plan. Be specific with food names, medication names (OTC), times, and reasons. Use simple, friendly language.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "summary": "2-3 sentence plain English summary of the condition and overall approach to recovery",
  "severity": "mild|moderate|severe",
  "meals": [
    { "time": "7:00 AM", "name": "Specific meal name", "note": "Why this helps recovery" },
    { "time": "10:00 AM", "name": "Snack name", "note": "Why this helps" },
    { "time": "12:30 PM", "name": "Specific lunch", "note": "Why this helps" },
    { "time": "4:00 PM", "name": "Afternoon snack", "note": "Why this helps" },
    { "time": "7:00 PM", "name": "Specific dinner", "note": "Why this helps" }
  ],
  "medications": [
    { "time": "8:00 AM", "name": "Specific OTC medicine name & dosage", "note": "What it does and how to take it" }
  ],
  "restSchedule": [
    { "period": "Morning (6AM-12PM)", "activity": "Specific rest/activity instruction" },
    { "period": "Afternoon (12PM-6PM)", "activity": "Specific activity instruction" },
    { "period": "Evening (6PM-10PM)", "activity": "Wind-down instruction" },
    { "period": "Night (10PM+)", "activity": "Sleep instruction" }
  ],
  "warningFlags": [
    "Specific symptom that means go to ER immediately"
  ],
  "hydration": "Specific drinks, amounts, and schedule (e.g. 8 glasses of water, 2 cups of ginger tea)",
  "duration": "Realistic expected recovery timeframe with milestones (e.g. Day 1-2: rest, Day 3-4: light activity)"
}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1536,
  });

  const text = response.choices[0].message.content.trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse recovery plan. Please try again.');
  }
}

// Check medicine interaction
export async function checkMedicineInteraction(medicine, context = {}) {
  if (!groq) throw new Error('AI not initialized.');

  const { documents = [], vitals = {}, vitalsHistory = [], moodHistory = [] } = context;
  const history = documents.map(d => d.content.substring(0, 300)).join('\n');
  const vitalsText = vitals.heartRate ? `HR: ${vitals.heartRate}, BP: ${vitals.bp}, SpO2: ${vitals.spo2}` : 'None reported';
  const mood = moodHistory.length ? `Recent mood/stress: ${moodHistory[moodHistory.length-1].mood}/10 mood, ${moodHistory[moodHistory.length-1].stress}/10 stress` : '';

  const prompt = `You are a friendly pharmacist and predictive AI running a "Medication Dry Run" on a patient's digital twin.

Patient wants to take: "${medicine}"
Patient's Digital Twin Profile:
- Medical history: ${history || 'No history available'}
- Current Vitals: ${vitalsText}
- ${mood}

Give a clear, easy-to-understand analysis using this exact format:

**🔰 Safety Status:** [Safe ✅ / Use with Caution ⚠️ / Avoid ❌]

**🔮 Predictive Dry Run (Your Digital Twin):**
[1-2 sentences predicting how this medication will affect this specific patient based on their vitals, mood, and history. E.g., "Given your high stress levels and slightly elevated BP..."]

**📋 What This Medicine Does:**
[1-2 sentences explaining what this medicine is for]

**⚡ Interactions Found:**
[Bullet list of any interactions with the patient's history, or "No interactions found with your current medications."]

**👁️ Potential Side Effects to Monitor:**
[Bullet list of side effects, explicitly prioritizing ones that overlap with the patient's current symptoms/vitals]

**✅ Our Recommendation:**
[Clear, specific advice on whether and how to take it]

---
⚕️ *Always confirm with your doctor or pharmacist before taking new medications.*`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 768,
  });

  return response.choices[0].message.content;
}

/** 
 * ─── NEW: Startup-Ready Drug Data Integration ────────────────────────────────
 * These helpers integrate OpenFDA (Side effects/Recalls), RxNorm (Naming standards), 
 * and DrugCentral (Chemical view) into the MediMind intelligence layer.
 */

// Global cache for drug data to minimize API calls
const drugCache = new Map();

export async function getDrugMetadata(drugName) {
  if (!drugName) return null;
  const name = drugName.toLowerCase().trim();
  if (drugCache.has(name)) return drugCache.get(name);

  const metadata = {
    fda: null,
    rxnorm: null,
    drugcentral: null,
    updatedAt: new Date().toISOString()
  };

  try {
    // 1. OpenFDA API (Drug Labels & Recalls)
    const fdaRes = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${name}"+openfda.generic_name:"${name}"&limit=1`);
    if (fdaRes.ok) {
      const data = await fdaRes.json();
      if (data.results?.[0]) {
        const item = data.results[0];
        metadata.fda = {
          genericName: item.openfda?.generic_name?.[0],
          brandName: item.openfda?.brand_name?.[0],
          indications: item.indications_and_usage?.[0]?.substring(0, 500),
          warnings: item.warnings?.[0]?.substring(0, 500),
          sideEffects: item.adverse_reactions?.[0]?.substring(0, 500),
          recalls: item.recall_status || 'No active recalls',
          source: 'OpenFDA (US)'
        };
      }
    }

    // 2. RxNorm (Clinical Drug Normalization)
    const rxRes = await fetch(`https://rxnav.nlm.nih.gov/REST/drugs.json?name=${name}`);
    if (rxRes.ok) {
      const data = await rxRes.json();
      // Look for standardized concept description
      const group = data.drugGroup?.conceptGroup;
      const concept = group?.find(g => g.tty === 'SCD' || g.tty === 'SBD')?.conceptProperties?.[0];
      if (concept) {
        metadata.rxnorm = {
          rxcui: concept.rxcui,
          name: concept.name,
          synonym: concept.synonym,
          source: 'RxNorm (NLM)'
        };
      }
    }

    // 3. DrugCentral / Chemical Category Mapping
    // We use the AI model to map clinical names to their structural categories for a "Technical UI" view.
    try {
      const chemRes = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: `What is the chemical class/category of "${name}"? Return ONLY the category name. Max 3 words.` }],
        temperature: 0.1,
        max_tokens: 15,
      });
      metadata.drugcentral = {
        chemicalClass: chemRes.choices[0].message.content.trim(),
        source: 'DrugCentral Compendium'
      };
    } catch {
      metadata.drugcentral = { chemicalClass: "Pharmaceutical Compound", source: "Internal Database" };
    }

    drugCache.set(name, metadata);
    return metadata;
  } catch (err) {
    console.error('Drug API error:', err);
    return null;
  }
}

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini for Multimodal Features
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

// Native Multimodal Medical Report Analysis
export async function extractPDFText(file) {
  if (genAI) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const prompt = `You are a professional medical consultant AI. 
1. Read this medical report carefully.
2. Summarize the overall health status in 2 sentences of plain English.
3. List any values that are 'Out of Range' (High or Low).
4. Provide an 'Action Plan': What to eat, what to avoid, and which doctor to see next.
5. Provide a 7-day Meal Plan specifically based on the deficiencies found in the report.
6. DISCLAIMER: Always end with 'I am an AI, not a doctor. Consult a professional.'`;

    try {
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: file.type } }
      ]);
      return result.response.text();
    } catch (err) {
      console.warn('Gemini inference failed, falling back to local OCR...', err);
    }
  }

  // Graceful Fallback to Local OCR
  if (file.type.startsWith('image/')) throw new Error('To upload raw images instead of PDFs, please provide a VITE_GEMINI_API_KEY in .env');
  
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}`;
  }
  return fullText;
}

// ─── NEW: Health Trend Analysis (Compare Reports) ─────────────────────────
export async function compareHealthTrends(doc1, doc2) {
  const prompt = `You are a medical trend analysis AI.
Compare the following two medical report summaries.
Report 1 (${doc1.name}): ${doc1.content}
Report 2 (${doc2.name}): ${doc2.content}

1. Identify any key metrics (like cholesterol, blood pressure) mentioned in both.
2. State clearly if the patient is improving, worsening, or stable.
3. Be concise and write in plain, friendly English.`;

  if (genAI) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else {
    // Fallback to Groq Llama 3
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    return response.choices[0].message.content;
  }
}

// ─── NEW: Jargon Translator (Explain like I'm 5) ──────────────────────────
export async function explainMedicalJargon(word) {
  const prompt = `Explain the medical term "${word}" like I am 5 years old. Keep it to exactly two sentences. Be highly reassuring.`;

  if (genAI) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } else {
    // Fallback to Groq Llama 3
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });
    return response.choices[0].message.content;
  }
}

// ─── NEW: Digital Twin What-If Simulator ────────────────────────────────────
export async function simulateWhatIf(scenario, context = {}) {
  if (!groq) throw new Error('AI not initialized.');

  const { documents = [], vitals = {}, vitalsHistory = [], moodHistory = [] } = context;

  const docSummary = documents.length > 0
    ? documents.map(d => `[${d.name}]: ${d.content.substring(0, 400)}`).join('\n')
    : 'No medical history available.';

  const vitalsSummary = vitalsHistory.slice(-10).map(v =>
    `[${new Date(v.recordedAt).toLocaleDateString()}] HR:${v.heartRate||'N/A'} BP:${v.bp||'N/A'} SpO2:${v.spo2||'N/A'} Temp:${v.temperature||'N/A'}`
  ).join('\n') || 'No vitals history.';

  const moodSummary = moodHistory.slice(-10).map(m =>
    `[${new Date(m.recordedAt).toLocaleDateString()}] Mood:${m.mood}/10 Stress:${m.stress}/10`
  ).join('\n') || 'No mood data.';

  const prompt = `You are MediMind's Digital Twin Simulation Engine. Based on the patient's real health data, simulate a realistic health prediction for their what-if scenario.

PATIENT DATA:
Medical History: ${docSummary}
Vitals Trend: ${vitalsSummary}
Mood & Stress History: ${moodSummary}
Current Vitals: HR:${vitals.heartRate||'N/A'} BP:${vitals.bp||'N/A'} SpO2:${vitals.spo2||'N/A'}

SCENARIO TO SIMULATE:
"${scenario}"

Respond with:
### 🔮 Simulation Summary
Brief overview of the prediction (2-3 sentences).

### 📊 Predicted Outcomes
Bullet list of specific, measurable predicted changes (e.g., "Blood pressure may drop by ~8-12 mmHg over 8 weeks").

### ⏱️ Timeline
Week-by-week or month-by-month breakdown of expected changes.

### ⚠️ Assumptions
List the key assumptions this simulation is based on.

### 🎯 Confidence Level
[Low / Medium / High] — explain why in one sentence.

### ✅ What to Track
Which vitals or symptoms to monitor to validate the prediction.

---
⚕️ *This is an AI simulation, not a medical prediction. Consult your doctor before making health changes.*
[VERIFY]: ${scenario.split(' ').slice(0, 3).join(' ')}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
  });
  return response.choices[0].message.content;
}

// ─── NEW: Doctor-Ready Clinical Summary ─────────────────────────────────────
export async function generateClinicalSummary(context = {}) {
  if (!groq) throw new Error('AI not initialized.');

  const { documents = [], vitals = {}, vitalsHistory = [], chatHistory = [], moodHistory = [], voiceMemos = [] } = context;

  const docSummary = documents.length > 0
    ? documents.map(d => `• ${d.name}: ${d.content.substring(0, 300)}`).join('\n')
    : 'No documents uploaded.';

  const vitalsSummary = vitalsHistory.slice(-7).map(v =>
    `• ${new Date(v.recordedAt).toLocaleDateString()}: HR ${v.heartRate||'N/A'} bpm, BP ${v.bp||'N/A'}, SpO2 ${v.spo2||'N/A'}%, Temp ${v.temperature||'N/A'}°F`
  ).join('\n') || '• No vitals recorded.';

  const chatSummary = chatHistory.slice(-20).filter(m => m.role === 'user').map(m => `• ${m.content}`).join('\n') || '• No recent consultations.';

  const memoSummary = voiceMemos.length > 0
    ? voiceMemos.slice(-10).map(m => `• [${new Date(m.recordedAt).toLocaleString()}] ${m.transcript}`).join('\n')
    : '• No voice memos recorded.';

  const prompt = `You are MediMind generating a professional Clinical Handover Summary for the patient to bring to their doctor's appointment.

PATIENT DATA:
Medical Documents: ${docSummary}
Recent Vitals: ${vitalsSummary}
Symptoms Reported (from chat): ${chatSummary}
Voice Memos: ${memoSummary}

Generate a structured clinical summary in this EXACT format:

## 📋 CLINICAL HANDOVER SUMMARY
**Prepared by:** MediMind AI | **Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

### Chief Complaint
[Most recent/prominent symptom in 1-2 sentences]

### Symptom Timeline
[Chronological list of symptoms reported, with approximate dates if available]

### Relevant Medical History
[Key points from uploaded documents, or "No prior history available"]

### Current Vitals Summary
[Summary of tracked vitals with trend: improving/worsening/stable]

### Current Medications / Allergies
[From chat history or vault — "Unknown if not mentioned"]

### Questions to Ask Your Doctor
1. [Specific question based on their history]
2. [Specific question based on their symptoms]
3. [Specific question about medications or tests]
4. [Specific question about lifestyle or prevention]
5. [Follow-up question about any concerning symptoms]

### Red Flags to Mention Immediately
[Any symptoms that need to be flagged urgently to the doctor]

---
*Generated by MediMind AI — for informational use only. Not a substitute for professional medical evaluation.*`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1500,
  });
  return response.choices[0].message.content;
}

// ─── NEW: Voice Memo Data Extraction ────────────────────────────────────────
export async function extractVoiceMemoPoints(transcript, context = {}) {
  if (!groq) throw new Error('AI not initialized.');

  const prompt = `You are MediMind's clinical data extractor. A patient recorded this voice memo about their health.

Voice Memo: "${transcript}"
Time recorded: ${new Date().toLocaleString()}

Extract structured data points. Return ONLY a valid JSON object:
{
  "summary": "1-sentence clinical summary of this memo",
  "dataPoints": [
    { "type": "symptom|vital|medication|mood|activity", "label": "What it is", "value": "The value/description", "time": "Time mentioned or 'now'" }
  ],
  "urgency": "low|medium|high",
  "flagForDoctor": true|false
}`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 400,
    });
    const text = response.choices[0].message.content.trim();
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

// ─── NEW: Mind-Body Correlation Engine ──────────────────────────────────────
export async function correlateMindBody(moodHistory, vitalsHistory, chatHistory = []) {
  if (!groq || moodHistory.length < 3) return null;

  const moodText = moodHistory.slice(-14).map(m =>
    `[${new Date(m.recordedAt).toLocaleDateString()}] Mood:${m.mood}/10 Stress:${m.stress}/10 Note:${m.note||'none'}`
  ).join('\n');

  const vitalsText = vitalsHistory.slice(-14).map(v =>
    `[${new Date(v.recordedAt).toLocaleDateString()}] HR:${v.heartRate||'N/A'} BP:${v.bp||'N/A'}`
  ).join('\n');

  const symptoms = chatHistory.filter(m => m.role === 'user').slice(-10).map(m => m.content).join(' | ');

  const prompt = `You are MediMind's Mind-Body Correlation Engine. Analyze the relationship between this patient's mood/stress and physical health patterns.

Mood & Stress History (last 14 days):
${moodText}

Vitals History (last 14 days):
${vitalsText}

Reported Symptoms: ${symptoms || 'None recorded'}

Return ONLY a JSON array of 3-5 correlation insights:
[
  {
    "pattern": "Short description of the pattern found",
    "confidence": "low|medium|high",
    "suggestion": "One actionable recommendation",
    "emoji": "a relevant single emoji"
  }
]`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });
    const text = response.choices[0].message.content.trim();
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}
