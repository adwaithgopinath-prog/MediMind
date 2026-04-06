# MediMind AI — Your Personal Agentic Health Companion ⚕️

MediMind is a privacy-first, internship-level AI health assistant that transforms the way you manage your medical well-being. Built with a focus on **Zero-Knowledge Privacy**, **Agentic AI Reasoning**, and **Visual Diagnostics**, MediMind serves as a bridge between daily symptom tracking and professional medical consultation.

![MediMind Dashboard](https://raw.githubusercontent.com/your-username/medimind/main/public/preview.png)

## 🌟 Key Features

### 1. 🏥 Agentic Sick-Bay Chat
- **Symptom Triage**: Real-time analysis of symptoms with color-coded severity levels (🟢 Self-care, 🟡 Consult Doctor, 🔴 Emergency).
- **Source Transparency**: Every AI response is tagged with [VERIFY] markers linking to trusted sources like PubMed, Mayo Clinic, or your own uploaded medical documents.
- **Ambient Scribe**: Log health memos via voice; the AI automatically extracts clinical data points and flags concerns for your next doctor's visit.

### 2. 🔒 Zero-Knowledge Medical Vault
- **Local Sovereignty**: All documents are encrypted with a unique local key that never leaves your browser. 
- **Multimodal Intelligence**: Upload PDFs or photos of lab reports. Gemini 1.5 Pro analyzes the raw data to explain complex markers in plain English.
- **Health Trend Comparison**: Automatically compare two reports (e.g., blood tests 6 months apart) to see if your health is improving or worsening.

### 3. 🔮 Digital Twin & Predictive Vitals
- **What-If Simulations**: Ask: "If I reduce my salt intake for 30 days, how might my blood pressure change?" based on your historical baseline.
- **Vitals Dashboard**: Real-time trend analysis of HR, SpO2, Temperature, and BP with animated circular gauges.
- **Mind-Body Correlation**: Automatic detection of patterns between your mood/stress levels and physical vitals.

### 4. 🔬 Visual Diagnostics
- **AI Skin Analysis**: Observe rashes or skin conditions with descriptive clinical observations.
- **Pill Identifier**: Identify medications by color, shape, and imprints.
- **Wound Assessment**: Detect signs of infection and get first-aid recommendations.

### 5. 📑 Doctor Handover
- Generate a professional **Clinical Handover Summary** to take to your appointment, summarizing your symptoms, vitals history, and key concerns detected by the AI.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Lucide React
- **Styling**: Vanilla CSS (Custom Design System with Glassmorphism)
- **AI Orchestration**: 
    - **Groq SDK** (Llama 3.3 70B) for high-speed clinical reasoning.
    - **Google Generative AI** (Gemini 1.5 Pro/Flash) for multimodal PDF & Image analysis.
- **Storage**: LocalStorage with XOR-based Zero-Knowledge Encryption.
- **Parsing**: PDF.js for fallback local document processing.

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/medimind-ai.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root:
   ```env
   VITE_GROQ_API_KEY=your_groq_key_here
   VITE_GEMINI_API_KEY=your_gemini_key_here
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📜 DPDP & Privacy Compliance
MediMind is designed to align with the **Digital Personal Data Protection (DPDP) Act**. 
- **Consent-Driven**: Users must explicitly agree to processing before data upload.
- **Purpose Limitation**: Data is processed only for health insights.
- **Storage Limitation**: All sensitive medical data remains on the user's device.

---

*Disclaimer: MediMind is an AI educational tool and NOT a substitute for professional medical advice. Always consult a qualified healthcare provider for medical decisions.*
