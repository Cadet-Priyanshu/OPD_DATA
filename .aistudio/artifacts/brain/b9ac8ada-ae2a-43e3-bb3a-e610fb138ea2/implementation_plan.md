# PHC Voice Scribe — Clinical Voice-to-EMR & Bilingual Prescription Workstation

**PHC Voice Scribe** is an offline-capable clinical documentation workstation designed for Primary Health Centre (PHC) Medical Officers in rural and semi-urban India. It listens to code-mixed Hindi and English (*Hinglish*) consultations, automatically populates government-mandated OPD case sheets, prescriptions, and referral slips, generates ABDM/FHIR R4 digital bundles with scannable QR codes, and prints visual, icon-driven bilingual medication instructions for low-literacy patients.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and architectural choices reflect your confirmed preferences and define how the application will be built:

- **Confirmed Decision 1 — Voice Capture & Structuring Engine**: **Hybrid Live Microphone + Preloaded Hinglish Scenarios with Dual AI/Offline NLP**. Doctors can dictate live via the browser microphone (`Web Speech API` configured for `hi-IN` / `en-IN` code-mixing) or run realistic preloaded rural OPD consultations (e.g., *Acute Febrile Illness / Dengue Suspect*, *Chronic Cough / TB Referral*, *Uncontrolled Hypertension & Diabetes*, *Pediatric Acute Gastroenteritis*). Structuring uses server-side Gemini AI when online and seamlessly falls back to a deterministic on-device Hinglish clinical NLP engine when offline.
- **Confirmed Decision 2 — Regional Languages & Government Templates**: **Hindi + Hinglish with UP, Bihar, and NHM Standard Templates**. The workstation supports instant switching between **NHM Standard (National Health Mission)**, **Uttar Pradesh (UP Swasthya Vibhag OPD Slip)**, and **Bihar (SHSB Mukhyamantri Nishulk Dawa Yojana)** headers, mandatory field checklists, and Essential Drug List (EDL) formularies.
- **Confirmed Decision 3 — Workspace Scope**: **Full Suite for PHC Staff**. Includes the **Live OPD Scribe & Minimal-Tap Review**, **Printable Bilingual Rx & ABDM QR Slip**, **Doctor Shortcuts & Adaptation Trainer**, and **Offline Sync Queue & Program Metrics Dashboard**.

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates repetitive handwriting in high-volume PHC Outpatient Departments (OPDs) by converting natural Hinglish clinical speech (e.g., *"Naam Sita Devi, umar 45 saal, 3 din se tez bukhar aur khansi hai, BP 130/80, Tab Paracetamol 500mg din mein teen baar khane ke baad 5 din..."*) into validated government case sheets, structured drug regimens, conditional referral notes, and visual patient instruction strips in under 5 seconds.
- **Target Audience / Persona**:
  - **Primary**: PHC Medical Officers handling 60–120 OPD patients daily under intermittent internet connectivity.
  - **Secondary**: PHC Pharmacists/Nurses dispensing from the National List of Essential Medicines (NLEM), District Program Managers monitoring standardized reporting, and rural patients relying on visual medication timing icons.
- **Key Value**: Cuts per-patient documentation time by over 50%, enforces ≥95% compliance on mandatory government fields, guarantees 100% core functionality without internet, and improves patient medication adherence through visual morning/noon/night/meal pictograms.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Header & Context Configuration**:
   - The top bar provides direct navigation across the four primary workspaces (**OPD Scribe**, **Patient Print & FHIR**, **Shortcuts & Lexicon**, **Sync & PHC Metrics**) alongside the **New Patient** primary action.
   - A secondary clinical context bar lets the Medical Officer toggle **Connectivity Mode** (`Online: Hybrid AI + ABDM` vs. `Offline: On-Device Edge NLP`), select the **Government Form Template** (`NHM Standard`, `UP PHC Format`, `Bihar SHSB Format`), and inspect the active Practitioner Profile & Digital Signature stamp.
2. **During Consultation (Voice Capture & Minimal-Tap Prompts)**:
   - Doctor selects quick demographic chips (Age group, Gender, Visit Type) or speaks them directly.
   - Tapping **Start Listening** activates live microphone capture (or streams a realistic Hinglish OPD audio/transcript scenario) with real-time utterance segmentation into `Complaint`, `History`, `Vitals & Exam`, `Diagnosis`, `Rx Plan`, and `Referral`.
   - **Minimal-Tap Quick Prompts** allow single-tap insertion of routine clinical statements without speaking: *"Vitals Normal"*, *"No Known Drug Allergies"*, *"Systemic Exam NAD"*, *"ORS + Zinc Advice"*, *"Follow-up in 3 Days"*, and *"Refer to District Hospital"*.
3. **One-Screen Structured Review & Inline Validation**:
   - **Case Sheet Panel**: Editable fields for Demographics, Chief Complaints with duration, Vitals (`BP`, `Pulse`, `Temp`, `SpO2`, `Weight` in tabular numerals), Examination Findings, and Provisional Diagnosis mapped to ICD-10 codes. Missing mandatory government fields are highlighted in crimson with one-tap fix chips.
   - **Prescription Table**: Structured medication rows (`Drug Name`, `Strength`, `Route`, `Dose`, `Frequency` (`OD` / `BD` / `TDS` / `QID` / `SOS`), `Meal Relation`, `Duration`). Includes an offline PHC Essential Drug List (EDL) search bar and one-tap Doctor Regimen Presets (e.g., *Standard Adult URTI Course*, *Acute Gastritis Kit*).
   - **Conditional Referral Note**: Automatically activates when referral cues are spoken or toggled, pre-populating Destination Facility (e.g., *District Hospital / CHC*), Reason for Referral, Clinical Summary, and Pre-transfer Stabilization Done.
   - **Correction Logging**: Any manual edit to extracted text or drug dosage automatically logs a training pair (`Spoken Utterance → Doctor Correction`) to the on-device adaptation engine.
4. **Bilingual Patient Instructions, ABDM/FHIR Export & Print**:
   - For every prescribed medication, the system renders a **Bilingual Visual Instruction Card** in **Hindi (Devanagari) + English** paired with high-contrast custom SVG pictograms:
     - **Timing Icons**: Morning Sunrise (`सुबह`), Afternoon Sun (`दोपहर`), Night Moon (`रात`).
     - **Meal Relation Icons**: Empty Plate (`खाली पेट / Before Food`) vs. Full Plate (`खाने के बाद / After Food`).
     - **Duration & Follow-Up Strip**: Visual day counter and warning pictograms.
   - Tapping **Sign & Finalize** attaches the Medical Officer's registration number and digital signature, generates a compliant **FHIR R4 Bundle** (`Patient`, `Practitioner`, `Encounter`, `Observation`, `Condition`, `MedicationRequest`), renders a scannable **QR Code**, and opens the print-ready Government OPD Slip (`window.print()`).
5. **Local Language Customization & Offline Sync Dashboard**:
   - **Shortcuts & Lexicon View**: Doctors manage custom voice macros (e.g., saying *"usual viral kit"* expands to Paracetamol 500mg TDS + Cetirizine 10mg HS + Steam Inhalation) and review logged ASR/NLP corrections with one-click *"Promote to Rule"* actions.
   - **Sync & PHC Metrics View**: Displays the local encrypted consultation ledger, the **Offline-to-ABDM Sync Queue** with one-click batch synchronization when connectivity returns, and pilot performance metrics (Average Documentation Time Saved, Mandatory Field Compliance %, and Disease Surveillance tally).

### Visual Identity & Theme

- **Aesthetic Direction**: **Clinical Precision & High-Contrast Field Utility**. Inspired by clean governmental public-health instrumentation and tactile paper-to-digital medical records—engineered for glare-free legibility in brightly lit rural OPD rooms with zero decorative clutter.
- **Color Palette & Mood** (60-30-10 Discipline):
  - **60% Dominant Neutral Canvas**: Crisp Clinical Alabaster (`#F8FAFC` / `slate-50`) background with pure white (`#FFFFFF`) document surfaces and warm paper-ivory (`#FCFBF7`) for the official Government Prescription preview.
  - **30% Structural Surfaces & Typography**: Deep Slate Ink (`#0F172A` / `slate-900`) for primary clinical text and Devanagari script, Muted Slate (`#475569` / `slate-600`) for field labels, and crisp `1px solid #E2E8F0` (`slate-200`) hairline dividers.
  - **10% Semantic & Action Accents**:
    - Primary Action / National Health Teal: `#0F766E` (`teal-700`) for primary CTAs, active microphone capture, and verified signature stamps.
    - Semantic Clinical States (always paired with explicit text labels + icons): Nominal/Synced Green (`#15803D`), Offline/Pending Sync Amber (`#B45309`), Mandatory Field Missing / Referral Alert Crimson (`#B91C1C`).
- **Typography & Hierarchy** (2+1 Font Rule):
  - **Display & Workspace Headers**: `Plus Jakarta Sans` (SemiBold/Bold, tight tracking) for workspace titles, government header banners, and section headings.
  - **Clinical Body & Bilingual Script**: `Public Sans` paired with system Devanagari fallback for crisp, high-legibility Hindi + English bilingual instructions at 14px–16px.
  - **Vitals, Dosages & FHIR Telemetry**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` for blood pressure, SpO2, drug strengths, timestamps, and FHIR resource IDs.
- **Component Styling & Layout**:
  - Full `1440px` desktop workstation layout with single-elevation flat containers bordered by `1px` hairlines (`border-slate-200`), generous padding, and large touch-friendly (`≥40px` height) quick-prompt buttons for rapid tap review.
  - Dedicated `@media print` styling so printing produces a clean, official A4 Government OPD Case Sheet & Bilingual Patient Instruction Strip without application chrome.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Engine Speech Structuring (Server Gemini AI + Deterministic Local NLP)**
  - *Chosen Approach*: When online, transcripts are sent to `/api/scribe/structure` using `gemini-3.8-flash` with a strict `responseSchema` to extract structured clinical entities, ICD-10 codes, and Hindi translations. When offline (or if the user toggles Offline Mode / API is unreachable), an instant client-side Hinglish medical NLP parser extracts vitals, complaints, history, diagnoses, drug regimens, and referrals using domain lexicons and regex patterns.
  - *Why*: Rural PHCs experience frequent connectivity drops. A pure-cloud app fails in the field, whereas a hybrid architecture delivers state-of-the-art LLM structuring when online and 100% deterministic reliability when offline.
  - *Alternatives Considered*: Cloud-only LLM parsing (rejected due to offline requirement) or rule-based only (rejected because hybrid AI handles complex free-form narratives even better when online).
- **Decision 2: Live Microphone + Interactive Preloaded Hinglish Scenarios**
  - *Chosen Approach*: Integrate native browser `SpeechRecognition` (`webkitSpeechRecognition` / `SpeechRecognition`) alongside 5 rich, one-click Hinglish OPD clinical encounter simulations that stream realistic doctor-patient utterances in real time.
  - *Why*: Lets clinicians dictate live with their microphone while also allowing immediate testing of diverse rural PHC cases (Dengue, Maternal Anemia, Pediatric Diarrhea, TB Referral, Hypertension) even on devices without a microphone attached.
- **Decision 3: Self-Contained SVG Pictograms & Client-Side QR / FHIR Generation**
  - *Chosen Approach*: Render all medication timing icons (Morning Sun, Afternoon Sun, Night Moon, Before/After Meal Plate, Water Glass, Referral Ambulance) and ABDM QR codes as deterministic, zero-dependency inline SVGs.
  - *Why*: Guarantees 100% offline rendering and crisp vector printing at any resolution without relying on external image CDNs.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       PHC VOICE SCRIBE WORKSTATION (Client SPA)                         │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Navigation Bar (Top Bar Contract)                                             │  │
│  │ [PHC Voice Scribe] ── [OPD Scribe | Print & FHIR | Shortcuts | Sync & Metrics]    │  │
│  │                                                                 ── [+ New Patient]│  │
│  └─────────────────────────────────────────┬─────────────────────────────────────────┘  │
│                                            │                                            │
│  ┌─────────────────────────────────────────▼─────────────────────────────────────────┐  │
│  │ Clinical Context Toolbar                                                          │  │
│  │ [Template: NHM / UP / Bihar] · [Mode: Online AI / Offline Edge] · [MO Profile]    │  │
│  └───────────────┬─────────────────────────┬─────────────────────────┬───────────────┘  │
│                  │                         │                         │                  │
│     ┌────────────▼───────────┐ ┌───────────▼────────────┐ ┌──────────▼─────────────┐    │
│     │ 1. OPD Scribe & Review │ │ 2. Bilingual Rx & FHIR │ │ 3. Shortcuts & Sync    │    │
│     │ ────────────────────── │ │ ────────────────────── │ │ ────────────────────── │    │
│     │ • Live Mic + Hinglish  │ │ • Govt OPD Slip (UP/   │ │ • Doctor Phrase Macros │    │
│     │   Scenario Streamer    │ │   Bihar/NHM Header)    │ │ • Correction Feedback  │    │
│     │ • Quick Clinical Taps  │ │ • Visual Timing Icons  │ │   Fine-Tuning Log      │    │
│     │ • Editable Case Sheet  │ │   (Sun/Moon/Plate SVG) │ │ • Encrypted Local DB & │    │
│     │   + Mandatory Checks   │ │ • Hindi + English Strip│ │   ABDM Sync Queue      │    │
│     │ • Rx Table & EDL Search│ │ • FHIR R4 JSON Bundle  │ │ • Time-Saved & WER     │    │
│     │ • Referral Slip Builder│ │   & Scannable QR Code  │ │   Success Metrics      │    │
│     └────────────┬───────────┘ └───────────▲────────────┘ └──────────▲─────────────┘    │
│                  │                         │                         │                  │
│  ┌───────────────▼─────────────────────────┴─────────────────────────┴───────────────┐  │
│  │ Hybrid Clinical Structuring & Storage Engine (Client + LocalStorage)              │  │
│  │ • Shortcut Macro Expander & Domain Lexicon Post-Processor (CEPTRAXONE→Ceftriaxone)│  │
│  │ • Deterministic Offline Hinglish NLP Parser (100% Offline Fallback)               │  │
│  │ • FHIR R4 Resource Assembler (Patient, Encounter, Observation, MedicationRequest) │  │
│  └─────────────────────────────────────────┬─────────────────────────────────────────┘  │
└────────────────────────────────────────────┼────────────────────────────────────────────┘
                                             │ HTTP POST /api/scribe/structure (When Online)
┌────────────────────────────────────────────▼────────────────────────────────────────────┐
│                           EXPRESS SERVER (server.ts on Port 3000)                       │
│  • POST /api/scribe/structure ──► @google/genai (gemini-3.8-flash + responseSchema)     │
│  • POST /api/scribe/translate ──► Bilingual Hindi/English Patient Advice Translator     │
│  • POST /api/abdm/sync        ──► Simulated ABDM / State Health Registry Sync Endpoint  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`EncounterRecord`**:
  - `id`, `uhid`, `createdAt`, `stateTemplate` (`'NHM' | 'UP' | 'BIHAR'`), `syncStatus` (`'synced' | 'pending_offline'`), `documentationSeconds` (manual baseline vs. actual time spent).
  - `patient`: `{ name, age, gender, phone, abhaId, village }`.
  - `transcript`: Array of `{ id, timestamp, speaker, text, segmentType: 'complaint' | 'history' | 'exam' | 'diagnosis' | 'plan' | 'referral' }`.
  - `caseSheet`: `{ chiefComplaints: string[], duration: string, history: string, allergies: string, vitals: { bp, pulse, temp, spo2, weight }, systemicExam: string, provisionalDiagnosis: string, icd10Code: string, investigations: string[] }`.
  - `prescriptions`: Array of `{ id, drugName, genericName, strength, form, route, dose, frequency: 'OD' | 'BD' | 'TDS' | 'QID' | 'SOS', timingIcons: ('morning' | 'afternoon' | 'night')[], mealRelation: 'after_food' | 'before_food' | 'empty_stomach' | 'any', durationDays: number, hindiInstruction: string, englishInstruction: string, warnings: string }`.
  - `referral`: `{ isReferred: boolean, destinationFacility: string, urgency: 'Routine' | 'Urgent' | 'Emergency', reason: string, summaryFindings: string, preReferralTreatment: string }`.
  - `signature`: `{ signed: boolean, signedAt?: string, doctorName: string, regNumber: string, facilityName: string }`.
- **`DoctorShortcut`**:
  - `{ id, triggerPhrase, category: 'regimen' | 'exam' | 'advice', expansionText, medications?: PrescriptionItem[], usageCount: number }`.
- **`CorrectionLog`**:
  - `{ id, timestamp, originalSpoken, correctedOutput, fieldType, appliedToLexicon: boolean }`.

### Interactive Component & State Mapping

- **Voice & Scenario Capture Controller**:
  - Starts/stops browser `SpeechRecognition` or steps through preloaded Hinglish clinical scenarios with live rolling transcript segments.
  - Runs custom Doctor Shortcut detection in real time (highlighting matched phrases like *"usual URTI meds"* or *"normal systemic exam"*).
- **Hybrid Structuring Handler**:
  - When **Stop & Structure** (or **Re-run NLP**) is clicked: checks connectivity mode. If `Online`, requests `/api/scribe/structure` (`gemini-3.8-flash`) and merges custom doctor shortcuts; if `Offline` or on network error, executes the local Hinglish rule-based extractor in `<150ms` so the doctor is never blocked.
- **Validation & Signature Gate**:
  - Continuously checks government-mandated fields (Patient Age/Gender, Chief Complaint, Vitals BP/Temp, Provisional Diagnosis, Drug Dose/Duration, Referral Destination if referred).
  - Highlights any missing mandatory fields inline and enables **Sign & Finalize Record** with practitioner stamp attachment.
- **Bilingual Instruction & FHIR Generator**:
  - Automatically recomputes Hindi Devanagari prose (`"सुबह और रात खाना खाने के बाद 1 गोली — 5 दिन तक"`) + English text + SVG timing icons whenever a medication's frequency, dose, or meal chip is tapped.
  - Compiles a valid FHIR R4 Bundle (`resourceType: "Bundle"`, `type: "document"`) with downloadable `.json` export, interactive QR payload viewer, and `@media print` government slip layout.
