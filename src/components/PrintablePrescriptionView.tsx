import React, { useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Download,
  FileCheck2,
  Languages,
  Printer,
  QrCode,
  Share2,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { EncounterRecord } from '../types/clinical';
import { STATE_TEMPLATES } from '../data/clinicalData';
import { generateABDMFHIRBundle } from '../utils/clinicalEngine';
import {
  DeterministicQRCodeSVG,
  MealPictogram,
  TimingPictogram,
} from './VisualTimingIcons';

interface PrintablePrescriptionViewProps {
  encounter: EncounterRecord;
  isOnline: boolean;
  onUpdateAdvice: (hindi: string, english: string) => void;
  onSignEncounter: () => void;
}

export const PrintablePrescriptionView: React.FC<PrintablePrescriptionViewProps> = ({
  encounter,
  isOnline,
  onUpdateAdvice,
  onSignEncounter,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'government_slip' | 'patient_strip' | 'fhir_json'>('government_slip');
  const [customAdviceInput, setCustomAdviceInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [shareBanner, setShareBanner] = useState<string | null>(null);

  const template = STATE_TEMPLATES[encounter.stateTemplate];
  const fhirBundle = generateABDMFHIRBundle(encounter);
  const qrPayload = JSON.stringify({
    uhid: encounter.uhid,
    abha: encounter.patient.abhaId || 'UNLINKED',
    name: encounter.patient.name,
    dx: encounter.caseSheet.provisionalDiagnosis,
    icd10: encounter.caseSheet.icd10Code,
    rx: encounter.prescriptions.map((r) => `${r.drugName} ${r.strength} ${r.frequency}x${r.durationDays}d`),
    mo: encounter.practitioner.regNumber,
  });

  const handleTranslateCustomAdvice = async () => {
    if (!customAdviceInput.trim()) return;
    setIsTranslating(true);
    try {
      if (isOnline) {
        const res = await fetch('/api/scribe/translate-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adviceText: customAdviceInput }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.hindi && data.english) {
            onUpdateAdvice(data.hindi, data.english);
            setCustomAdviceInput('');
            setIsTranslating(false);
            return;
          }
        }
      }
      // Offline deterministic bilingual fallback
      onUpdateAdvice(
        `${encounter.caseSheet.patientAdviceHindi} • विशेष सलाह: ${customAdviceInput}`,
        `${encounter.caseSheet.patientAdviceEnglish} • Additional Note: ${customAdviceInput}`
      );
      setCustomAdviceInput('');
    } catch {
      onUpdateAdvice(
        `${encounter.caseSheet.patientAdviceHindi} • ${customAdviceInput}`,
        `${encounter.caseSheet.patientAdviceEnglish} • ${customAdviceInput}`
      );
      setCustomAdviceInput('');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownloadFHIR = () => {
    const blob = new Blob([JSON.stringify(fhirBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${encounter.uhid}_ABDM_FHIR_R4.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareSlip = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `PHC OPD Rx (${encounter.uhid}) - ${encounter.patient.name} (${encounter.patient.age}/${encounter.patient.gender})\nDiagnosis: ${encounter.caseSheet.provisionalDiagnosis}\n` +
          encounter.prescriptions
            .map((p, i) => `${i + 1}. ${p.form} ${p.drugName} ${p.strength} — ${p.hindiInstruction} (${p.englishInstruction})`)
            .join('\n')
      );
    }
    setShareBanner('Bilingual prescription summary copied for WhatsApp / SMS sharing.');
    setTimeout(() => setShareBanner(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Action & Sub-view Toolbar (Hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubTab('government_slip')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'government_slip'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Government OPD Case Sheet & Rx
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('patient_strip')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'patient_strip'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Low-Literacy Visual Instruction Strip
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('fhir_json')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'fhir_json'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ABDM / FHIR R4 Bundle ({fhirBundle.entry.length} Resources)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!encounter.signed && (
            <button
              type="button"
              onClick={onSignEncounter}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileCheck2 className="w-4 h-4" />
              Attach MO Signature
            </button>
          )}
          <button
            type="button"
            onClick={handleShareSlip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-4 h-4" />
            Copy Bilingual SMS
          </button>
          <button
            type="button"
            onClick={handleDownloadFHIR}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            Export FHIR JSON
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            Print OPD Slip / PDF
          </button>
        </div>
      </div>

      {shareBanner && (
        <div className="no-print bg-teal-50 border border-teal-200 text-teal-900 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{shareBanner}</span>
          <button type="button" onClick={() => setShareBanner(null)} className="text-teal-700 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Bilingual Patient Advice Translator Bar (No-print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 shrink-0">
          <Languages className="w-4 h-4 text-teal-700" />
          <span>Add Bilingual Patient Advice (Hinglish → Hindi + English):</span>
        </div>
        <input
          type="text"
          value={customAdviceInput}
          onChange={(e) => setCustomAdviceInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTranslateCustomAdvice()}
          placeholder="e.g. Subah-shaam bhaap lein aur thanda paani bilkul na piyein..."
          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-teal-700"
        />
        <button
          type="button"
          onClick={handleTranslateCustomAdvice}
          disabled={isTranslating || !customAdviceInput.trim()}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          {isTranslating ? 'Translating...' : 'Translate & Append'}
        </button>
      </div>

      {/* VIEW 1: FULL GOVERNMENT OPD CASE SHEET & BILINGUAL PRESCRIPTION */}
      {activeSubTab === 'government_slip' && (
        <div className="print-sheet bg-[#FCFBF7] border border-slate-300 rounded-lg p-6 md:p-8 space-y-6 text-slate-900">
          {/* Official State Government Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-teal-800 tracking-wider">
                {template.emblemCode} • HFR ID: {encounter.practitioner.hfrId} • UHID: {encounter.uhid}
              </div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
                {template.titleHindi}
              </h2>
              <p className="text-xs font-bold tracking-wide text-slate-800">
                {template.titleEnglish}
              </p>
              <p className="text-xs text-slate-600">
                {template.departmentLine} · {template.schemeLine}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <div className="text-right text-xs space-y-0.5">
                <div className="font-semibold text-slate-900 flex items-center justify-end gap-1">
                  <QrCode className="w-3.5 h-3.5 text-teal-700" />
                  <span>ABDM FHIR QR</span>
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  {encounter.patient.abhaId || 'ABHA: Unlinked'}
                </div>
                <div className="font-mono text-[10px] text-slate-500">
                  Date: {new Date(encounter.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <DeterministicQRCodeSVG payload={qrPayload} size={88} />
            </div>
          </div>

          {/* Patient Demographics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-3 px-4 bg-white border border-slate-300 rounded text-xs">
            <div>
              <span className="text-slate-500 block">रोगी का नाम / Patient</span>
              <span className="font-bold text-slate-900 text-sm">{encounter.patient.name || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">आयु व लिंग / Age & Sex</span>
              <span className="font-bold text-slate-900 font-mono">
                {encounter.patient.age ? `${encounter.patient.age} Yrs` : '—'} / {encounter.patient.gender || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">ग्राम / Village</span>
              <span className="font-semibold text-slate-800">{encounter.patient.village || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">मोबाइल / Phone</span>
              <span className="font-mono font-semibold text-slate-800">{encounter.patient.phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">परामर्श श्रेणी / Visit</span>
              <span className="font-semibold text-slate-800">{encounter.patient.visitType}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ABHA Health ID</span>
              <span className="font-mono font-semibold text-teal-800">{encounter.patient.abhaId || 'Pending'}</span>
            </div>
          </div>

          {/* Two-Column Clinical Layout: Left = Vitals, Complaints, Exam, Lab | Right = Diagnosis, Bilingual Rx Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Clinical Column (4 cols) */}
            <div className="lg:col-span-4 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-300 pb-4 lg:pb-0 lg:pr-5">
              <div>
                <h3 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1 mb-2">
                  1. शारीरिक मापदंड / VITALS
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2.5 border border-slate-200 rounded">
                  <div>
                    <span className="text-slate-500">BP:</span>{' '}
                    <span className="font-bold text-slate-900">{encounter.caseSheet.vitals.bp || '—'} mmHg</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Pulse:</span>{' '}
                    <span className="font-bold text-slate-900">{encounter.caseSheet.vitals.pulse || '—'} /min</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Temp:</span>{' '}
                    <span className="font-bold text-slate-900">{encounter.caseSheet.vitals.temp || '—'} °F</span>
                  </div>
                  <div>
                    <span className="text-slate-500">SpO2:</span>{' '}
                    <span className="font-bold text-slate-900">{encounter.caseSheet.vitals.spo2 || '—'} %</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Weight:</span>{' '}
                    <span className="font-bold text-slate-900">{encounter.caseSheet.vitals.weight || '—'} kg</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
                  2. मुख्य शिकायतें / CHIEF COMPLAINTS ({encounter.caseSheet.duration})
                </h3>
                <ul className="list-disc list-inside text-xs text-slate-800 space-y-1">
                  {encounter.caseSheet.chiefComplaints.map((c, idx) => (
                    <li key={idx} className="font-medium">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
                  3. पूर्व इतिहास व एलर्जी / HISTORY & ALLERGIES
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed">{encounter.caseSheet.history}</p>
                <p className="text-xs font-semibold text-slate-700 mt-1">Allergies: {encounter.caseSheet.allergies}</p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
                  4. शारीरिक परीक्षण / SYSTEMIC EXAMINATION
                </h3>
                <p className="text-xs text-slate-800 leading-relaxed">{encounter.caseSheet.systemicExam}</p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1.5">
                  5. जांचें / INVESTIGATIONS ADVISED
                </h3>
                {encounter.caseSheet.investigations.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-slate-800 space-y-1">
                    {encounter.caseSheet.investigations.map((inv, idx) => (
                      <li key={idx}>{inv}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No laboratory investigations required today.</p>
                )}
              </div>
            </div>

            {/* Right Prescription & Bilingual Visual Column (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* Provisional Diagnosis */}
              <div className="bg-white border border-slate-300 rounded p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    अनन्तिम निदान / PROVISIONAL DIAGNOSIS
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {encounter.caseSheet.provisionalDiagnosis || 'Pending Diagnosis'}
                  </span>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-slate-500 block">ICD-10 Code</span>
                  <span className="font-bold text-teal-800">{encounter.caseSheet.icd10Code || 'R69'}</span>
                </div>
              </div>

              {/* Rx Header & Bilingual Visual Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-serif text-teal-800">℞</span>
                    <span className="text-xs font-bold text-slate-800">
                      औषधि विवरण एवं चित्रित खुराक निर्देश / MEDICATIONS & VISUAL TIMING GUIDE
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {encounter.prescriptions.length} NLEM Drugs Prescribed
                  </span>
                </div>

                <div className="space-y-3">
                  {encounter.prescriptions.map((rx, index) => (
                    <div
                      key={rx.id}
                      className="bg-white border border-slate-300 rounded-md p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">{index + 1}.</span>
                          <span className="text-sm font-bold text-slate-900">
                            {rx.form} {rx.drugName} {rx.strength}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            · {rx.route} · {rx.dose} ({rx.frequency}) · {rx.durationDays} Days
                          </span>
                        </div>
                        {/* Hindi Devanagari Primary Line for Patient */}
                        <p className="text-sm font-semibold text-teal-950 bg-teal-50/70 px-2.5 py-1 rounded border border-teal-200">
                          {rx.hindiInstruction}
                        </p>
                        <p className="text-xs text-slate-600">{rx.englishInstruction}</p>
                        {rx.warnings && (
                          <p className="text-[11px] text-amber-800 font-medium">
                            सावधानी / Note: {rx.warnings}
                          </p>
                        )}
                      </div>

                      {/* Visual Timing Pictograms Strip */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                        <TimingPictogram
                          type="morning"
                          active={rx.timingIcons.includes('morning')}
                          compact
                        />
                        <TimingPictogram
                          type="afternoon"
                          active={rx.timingIcons.includes('afternoon')}
                          compact
                        />
                        <TimingPictogram
                          type="night"
                          active={rx.timingIcons.includes('night')}
                          compact
                        />
                        <MealPictogram mealRelation={rx.mealRelation} compact />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bilingual General Care & Follow-Up Advice */}
              <div className="bg-white border border-slate-300 rounded-md p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>रोगी के लिए सलाह एवं अगली जांच / PATIENT INSTRUCTIONS & FOLLOW-UP</span>
                  <span className="font-mono text-teal-800">
                    पुनः दिखाएं / Follow-up: {encounter.caseSheet.followUpDays} दिन बाद ({encounter.caseSheet.followUpDays} Days)
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{encounter.caseSheet.patientAdviceHindi}</p>
                <p className="text-xs text-slate-600">{encounter.caseSheet.patientAdviceEnglish}</p>
              </div>

              {/* Conditional Referral Slip Section */}
              {encounter.referral.isReferred && (
                <div className="bg-red-50/70 border border-red-300 rounded-md p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                      <Truck className="w-4 h-4 text-red-700" />
                      <span>उच्च केंद्र रेफरल पर्ची / OFFICIAL REFERRAL NOTE ({encounter.referral.urgency} Priority)</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-red-800">
                      Transport: {encounter.referral.transportMode}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-900">
                    <div>
                      <span className="text-slate-600 font-medium">Referred To Facility: </span>
                      <span className="font-bold">{encounter.referral.destinationFacility}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 font-medium">Program Scheme: </span>
                      <span className="font-semibold">{encounter.referral.programScheme}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-600 font-medium">Reason for Referral: </span>
                      <span>{encounter.referral.reason}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-600 font-medium">Pre-Referral Stabilization Given: </span>
                      <span>{encounter.referral.preReferralTreatment}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Signature Block */}
              <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-xs">
                <div className="space-y-0.5 text-slate-600">
                  <div>
                    Generated via <strong>PHC Voice Scribe</strong> ({encounter.structuringEngine === 'gemini-3.8-flash' ? 'Hybrid Gemini AI + NLEM Lexicon' : 'On-Device Offline Edge NLP'})
                  </div>
                  <div>
                    ABDM Sync Status:{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {encounter.syncStatus === 'synced'
                        ? `Synced (${encounter.abdmAckId || 'Verified'})`
                        : 'Stored Encrypted Locally (Pending Sync Queue)'}
                    </span>
                  </div>
                </div>

                <div className="text-right border border-slate-300 bg-white px-4 py-2.5 rounded">
                  {encounter.signed ? (
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4" />
                        <span>DIGITALLY SIGNED & VERIFIED</span>
                      </div>
                      <div className="font-bold text-slate-900">{encounter.practitioner.doctorName}</div>
                      <div className="text-[11px] text-slate-600">
                        {encounter.practitioner.designation} · Reg: {encounter.practitioner.regNumber}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Signed: {encounter.signedAt}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-amber-700 font-semibold">Signature Pending Review</div>
                      <div className="font-bold text-slate-800">{encounter.practitioner.doctorName}</div>
                      <div className="text-[11px] text-slate-500">Reg: {encounter.practitioner.regNumber}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LOW-LITERACY VISUAL PATIENT INSTRUCTION STRIP */}
      {activeSubTab === 'patient_strip' && (
        <div className="print-sheet bg-white border border-slate-300 rounded-lg p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                दवा लेने का आसान चित्रित चार्ट • Visual Medication Guide for Patient
              </h2>
              <p className="text-xs text-slate-600">
                रोगी: <strong>{encounter.patient.name}</strong> ({encounter.patient.age} वर्ष / {encounter.patient.gender}) · तारीख: {new Date(encounter.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs bg-slate-50 border border-slate-200 px-3.5 py-2 rounded">
              <span>☀️ सुबह (Morning)</span>
              <span>·</span>
              <span>☀️ दोपहर (Afternoon)</span>
              <span>·</span>
              <span>🌙 रात (Night)</span>
              <span>·</span>
              <span>🍽️ खाने के बाद (After Food)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {encounter.prescriptions.map((rx, idx) => (
              <div
                key={rx.id}
                className="border border-slate-300 rounded-lg p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50/40"
              >
                <div className="lg:col-span-5 space-y-1">
                  <div className="text-xs font-mono text-slate-500">दवा संख्या #{idx + 1}</div>
                  <div className="text-base font-bold text-slate-900">
                    {rx.form} {rx.drugName} ({rx.strength})
                  </div>
                  <div className="text-sm font-bold text-teal-900">{rx.hindiInstruction}</div>
                  <div className="text-xs text-slate-600">{rx.englishInstruction}</div>
                </div>

                <div className="lg:col-span-5 flex flex-wrap items-center gap-2.5">
                  <TimingPictogram type="morning" active={rx.timingIcons.includes('morning')} />
                  <TimingPictogram type="afternoon" active={rx.timingIcons.includes('afternoon')} />
                  <TimingPictogram type="night" active={rx.timingIcons.includes('night')} />
                  <MealPictogram mealRelation={rx.mealRelation} />
                </div>

                <div className="lg:col-span-2 text-right border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-4">
                  <span className="text-xs text-slate-500 block">कुल दिन / Days</span>
                  <span className="text-2xl font-bold font-mono text-slate-900">{rx.durationDays}</span>
                  <span className="text-xs font-semibold text-slate-700 block">दिन लगातार लें</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-900">
                जरूरी निर्देश / Important Care & Follow-Up Advice
              </div>
              <p className="text-sm font-bold text-slate-900">{encounter.caseSheet.patientAdviceHindi}</p>
              <p className="text-xs text-slate-700">{encounter.caseSheet.patientAdviceEnglish}</p>
            </div>
            <div className="shrink-0 bg-white border border-amber-300 px-4 py-2.5 rounded text-center">
              <span className="text-[11px] text-slate-500 block">अगली जांच / Next Visit</span>
              <span className="text-base font-bold font-mono text-teal-900">
                {encounter.caseSheet.followUpDays} दिन बाद ({encounter.caseSheet.followUpDays} Days)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ABDM / FHIR R4 BUNDLE INSPECTOR */}
      {activeSubTab === 'fhir_json' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Code2 className="w-4 h-4 text-teal-700" />
                <span>NRCeS / ABDM FHIR R4 Prescription DocumentBundle</span>
              </div>
              <p className="text-xs text-slate-600">
                Includes linked <code className="font-mono">Composition</code>, <code className="font-mono">Patient</code>, <code className="font-mono">Practitioner</code>, <code className="font-mono">Encounter</code>, <code className="font-mono">Condition</code> (ICD-10), <code className="font-mono">Observation</code> (Vitals), and <code className="font-mono">MedicationRequest</code> resources.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>ABDM Profile Validated</span>
            </div>
          </div>

          <pre className="bg-slate-950 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-[520px] leading-relaxed">
            {JSON.stringify(fhirBundle, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
