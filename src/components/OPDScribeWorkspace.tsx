import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Edit3,
  FileCheck2,
  Mic,
  MicOff,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Truck,
  Volume2,
} from 'lucide-react';
import {
  CorrectionLogEntry,
  DoctorShortcut,
  EncounterRecord,
  FrequencyCode,
  MealRelationType,
  PrescriptionItem,
  PreloadedScenario,
  TimingIconType,
} from '../types/clinical';
import {
  OFFLINE_EDL_FORMULARY,
  PRELOADED_SCENARIOS,
  STATE_TEMPLATES,
} from '../data/clinicalData';
import {
  buildBilingualMedicationInstruction,
  classifyUtteranceSegment,
  evaluateMandatoryCompliance,
} from '../utils/clinicalEngine';
import {
  MealPictogram,
  TimingPictogram,
} from './VisualTimingIcons';

interface OPDScribeWorkspaceProps {
  encounter: EncounterRecord;
  isOnline: boolean;
  isStructuring: boolean;
  shortcuts: DoctorShortcut[];
  onUpdateEncounter: (updater: (prev: EncounterRecord) => EncounterRecord) => void;
  onRunStructuring: (customTranscriptText?: string) => Promise<void>;
  onLoadScenario: (scenario: PreloadedScenario) => void;
  onLogCorrection: (entry: Omit<CorrectionLogEntry, 'id' | 'timestamp'>) => void;
  onSignAndFinalize: () => void;
}

const COMMON_INVESTIGATIONS = [
  'CBC with Platelet Count',
  'Malaria Rapid Antigen (MP Card)',
  'Dengue NS1 Antigen & IgM',
  'Fasting / Random Blood Sugar (RBS)',
  'Hemoglobin (Hb%)',
  'Urine Routine & Microscopy',
  'Sputum for AFB & Truenat/CBNAAT',
  'Chest X-Ray PA View',
  'Stool Routine & Microscopy',
  'ECG (12-Lead)',
];

export const OPDScribeWorkspace: React.FC<OPDScribeWorkspaceProps> = ({
  encounter,
  isOnline,
  isStructuring,
  shortcuts,
  onUpdateEncounter,
  onRunStructuring,
  onLoadScenario,
  onLogCorrection,
  onSignAndFinalize,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isStreamingScenario, setIsStreamingScenario] = useState(false);
  const [spokenInput, setSpokenInput] = useState('');
  const [speechLang, setSpeechLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [micStatusNote, setMicStatusNote] = useState<string | null>(null);
  const [edlSearch, setEdlSearch] = useState('');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState('');
  const [newComplaintInput, setNewComplaintInput] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const streamTimerRef = useRef<number | null>(null);

  const template = STATE_TEMPLATES[encounter.stateTemplate];
  const compliance = evaluateMandatoryCompliance(encounter);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  const appendSpokenUtterance = (rawText: string) => {
    if (!rawText.trim()) return;
    const { segmentType, normalizedText, lexiconApplied } = classifyUtteranceSegment(rawText.trim());
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour12: false });

    onUpdateEncounter((prev) => ({
      ...prev,
      transcript: [
        ...prev.transcript,
        {
          id: `utt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          speaker: 'Doctor',
          text: normalizedText,
          segmentType,
          confidence: 0.95,
          lexiconApplied,
        },
      ],
    }));
  };

  const handleToggleMicrophone = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setMicStatusNote('Stopped listening. Structuring consultation transcript...');
      onRunStructuring();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setMicStatusNote(
        'Browser Web Speech API unavailable in this environment — use simulated Hinglish voice stream or dictate in the box below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = speechLang;
      recognition.continuous = true;
      recognition.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const phrase = event.results[i][0].transcript;
            appendSpokenUtterance(phrase);
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        setIsListening(false);
        setMicStatusNote(
          `Microphone note (${event.error || 'permission'}): Use simulated Hinglish voice stream or quick utterance box below.`
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setMicStatusNote(`Listening live (${speechLang === 'hi-IN' ? 'Hindi + Hinglish' : 'Indian English'})... Speak naturally.`);
    } catch {
      setIsListening(false);
      setMicStatusNote('Could not start microphone capture. Try the simulated Hinglish consultation stream.');
    }
  };

  const handleSimulateVoiceStream = (scenario: PreloadedScenario) => {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
    }

    setIsStreamingScenario(true);
    setMicStatusNote(`Simulating live Hinglish OPD voice stream for ${scenario.patient.name}...`);

    onUpdateEncounter((prev) => ({
      ...prev,
      patient: { ...scenario.patient },
      transcript: [],
      signed: false,
    }));

    let idx = 0;
    streamTimerRef.current = window.setInterval(() => {
      if (idx < scenario.utterances.length) {
        const u = scenario.utterances[idx];
        const { normalizedText, lexiconApplied } = classifyUtteranceSegment(u.text);
        const nowStr = new Date().toLocaleTimeString('en-IN', { hour12: false });

        onUpdateEncounter((prev) => ({
          ...prev,
          transcript: [
            ...prev.transcript,
            {
              id: `stream-${Date.now()}-${idx}`,
              timestamp: nowStr,
              speaker: u.speaker,
              text: normalizedText,
              segmentType: u.segmentType,
              confidence: 0.96,
              lexiconApplied: u.lexiconFixes || lexiconApplied,
            },
          ],
        }));
        idx++;
      } else {
        if (streamTimerRef.current) {
          window.clearInterval(streamTimerRef.current);
        }
        setIsStreamingScenario(false);
        setMicStatusNote('Voice capture finished. Running clinical NLP structuring...');
        const fullText = scenario.utterances.map((x) => x.text).join(' ');
        onRunStructuring(fullText);
      }
    }, 650);
  };

  // Minimal-Tap Quick Prompt Handlers
  const handleQuickPrompt = (promptType: string) => {
    switch (promptType) {
      case 'vitals_normal':
        onUpdateEncounter((prev) => ({
          ...prev,
          caseSheet: {
            ...prev.caseSheet,
            vitals: { bp: '120/80', pulse: '78', temp: '98.6', spo2: '98', weight: prev.caseSheet.vitals.weight || '58' },
          },
        }));
        appendSpokenUtterance('On examination vitals normal: BP 120/80 mmHg, Pulse 78 bpm, Temp 98.6 F, SpO2 98%.');
        break;
      case 'no_allergies':
        onUpdateEncounter((prev) => ({
          ...prev,
          caseSheet: {
            ...prev.caseSheet,
            allergies: 'No known drug or food allergies (NKDA)',
          },
        }));
        appendSpokenUtterance('No known drug allergies.');
        break;
      case 'exam_nad':
        onUpdateEncounter((prev) => ({
          ...prev,
          caseSheet: {
            ...prev.caseSheet,
            systemicExam:
              'Conscious, oriented. Chest: Bilateral vesicular breath sounds clear, no crepitations. CVS: S1 S2 normal. P/A: Soft, non-tender.',
          },
        }));
        appendSpokenUtterance('Normal systemic exam: Chest bilateral clear, CVS S1 S2 normal, abdomen soft.');
        break;
      case 'urti_preset': {
        const urtiSc = shortcuts.find((s) => s.id === 'sc-urti') || shortcuts[0];
        if (urtiSc) {
          appendSpokenUtterance(`Apply ${urtiSc.triggerPhrase}: ${urtiSc.expansionText}`);
          if (urtiSc.medications) {
            onUpdateEncounter((prev) => ({
              ...prev,
              prescriptions: [
                ...prev.prescriptions,
                ...urtiSc.medications!.map((m, i) => ({
                  ...m,
                  id: `rx-quick-${Date.now()}-${i}`,
                })),
              ],
            }));
          }
        }
        break;
      }
      case 'ors_zinc': {
        const orsSc = shortcuts.find((s) => s.id === 'sc-diarrhea');
        if (orsSc && orsSc.medications) {
          appendSpokenUtterance(`Apply ${orsSc.triggerPhrase}: ${orsSc.expansionText}`);
          onUpdateEncounter((prev) => ({
            ...prev,
            prescriptions: [
              ...prev.prescriptions,
              ...orsSc.medications!.map((m, i) => ({
                ...m,
                id: `rx-ors-${Date.now()}-${i}`,
              })),
            ],
          }));
        }
        break;
      }
      case 'followup_3d':
        onUpdateEncounter((prev) => ({
          ...prev,
          caseSheet: {
            ...prev.caseSheet,
            followUpDays: 3,
          },
        }));
        appendSpokenUtterance('Follow-up in 3 days at PHC OPD if symptoms persist.');
        break;
      case 'refer_dh':
        onUpdateEncounter((prev) => ({
          ...prev,
          referral: {
            ...prev.referral,
            isReferred: true,
            destinationFacility: template.referralFacilities[1],
            urgency: 'Urgent',
            reason:
              prev.referral.reason ||
              `Further diagnostic evaluation and specialist management for ${prev.caseSheet.provisionalDiagnosis || 'acute illness'}.`,
            summaryFindings:
              prev.referral.summaryFindings ||
              `BP ${prev.caseSheet.vitals.bp} mmHg, Pulse ${prev.caseSheet.vitals.pulse} bpm, Temp ${prev.caseSheet.vitals.temp} °F. ${prev.caseSheet.systemicExam}`,
            preReferralTreatment:
              prev.referral.preReferralTreatment ||
              prev.prescriptions.map((p) => `${p.form} ${p.drugName} ${p.strength}`).join(', ') ||
              'First-dose stabilization given at PHC',
          },
        }));
        appendSpokenUtterance(`Refer patient to ${template.referralFacilities[1]} for specialist management.`);
        break;
    }
  };

  // Add medication from Offline NLEM Formulary
  const handleAddFormularyDrug = (drug: typeof OFFLINE_EDL_FORMULARY[0]) => {
    const bilingual = buildBilingualMedicationInstruction(
      drug.defaultDose,
      drug.defaultFrequency,
      drug.defaultMeal,
      drug.defaultDuration
    );

    const newItem: PrescriptionItem = {
      id: `rx-edl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      drugName: drug.drugName,
      genericName: drug.genericName,
      nlemCode: drug.nlemCode,
      strength: drug.strength,
      form: drug.form,
      route: drug.route,
      dose: drug.defaultDose,
      frequency: drug.defaultFrequency,
      timingIcons: bilingual.timingIcons,
      mealRelation: drug.defaultMeal,
      durationDays: drug.defaultDuration,
      hindiInstruction: bilingual.hindiInstruction,
      englishInstruction: bilingual.englishInstruction,
      warnings: drug.warnings,
    };

    onUpdateEncounter((prev) => ({
      ...prev,
      prescriptions: [...prev.prescriptions, newItem],
    }));
    setEdlSearch('');
  };

  // Update individual prescription row and recompute bilingual instructions
  const handleUpdatePrescriptionRow = (
    rxId: string,
    updates: Partial<Pick<PrescriptionItem, 'dose' | 'frequency' | 'mealRelation' | 'durationDays' | 'timingIcons'>>
  ) => {
    onUpdateEncounter((prev) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((item) => {
        if (item.id !== rxId) return item;
        const nextDose = updates.dose ?? item.dose;
        const nextFreq = updates.frequency ?? item.frequency;
        const nextMeal = updates.mealRelation ?? item.mealRelation;
        const nextDays = updates.durationDays ?? item.durationDays;

        const bilingual = buildBilingualMedicationInstruction(nextDose, nextFreq, nextMeal, nextDays);
        const nextIcons = updates.timingIcons ?? bilingual.timingIcons;

        return {
          ...item,
          dose: nextDose,
          frequency: nextFreq,
          mealRelation: nextMeal,
          durationDays: nextDays,
          timingIcons: nextIcons,
          hindiInstruction: bilingual.hindiInstruction,
          englishInstruction: bilingual.englishInstruction,
        };
      }),
    }));
  };

  const handleToggleTimingIcon = (rx: PrescriptionItem, icon: TimingIconType) => {
    const exists = rx.timingIcons.includes(icon);
    const nextIcons = exists
      ? rx.timingIcons.filter((i) => i !== icon)
      : [...rx.timingIcons, icon];
    if (nextIcons.length === 0) return;

    let inferredFreq: FrequencyCode = rx.frequency;
    if (nextIcons.length === 1) inferredFreq = 'OD';
    else if (nextIcons.length === 2) inferredFreq = 'BD';
    else if (nextIcons.length === 3) inferredFreq = 'TDS';

    handleUpdatePrescriptionRow(rx.id, {
      timingIcons: nextIcons,
      frequency: inferredFreq,
    });
  };

  const handleCycleMealRelation = (rx: PrescriptionItem) => {
    const order: MealRelationType[] = ['after_food', 'before_food', 'empty_stomach', 'any'];
    const nextMeal = order[(order.indexOf(rx.mealRelation) + 1) % order.length];
    handleUpdatePrescriptionRow(rx.id, { mealRelation: nextMeal });
  };

  const filteredFormulary = OFFLINE_EDL_FORMULARY.filter(
    (d) =>
      d.drugName.toLowerCase().includes(edlSearch.toLowerCase()) ||
      d.genericName.toLowerCase().includes(edlSearch.toLowerCase()) ||
      d.aliases.some((a) => a.toLowerCase().includes(edlSearch.toLowerCase()))
  );

  const segmentLabelStyle: Record<string, string> = {
    complaint: 'text-amber-900 bg-amber-50 border-amber-200',
    history: 'text-slate-700 bg-slate-100 border-slate-300',
    exam: 'text-sky-900 bg-sky-50 border-sky-200',
    diagnosis: 'text-purple-900 bg-purple-50 border-purple-200',
    plan: 'text-teal-900 bg-teal-50 border-teal-200',
    referral: 'text-red-900 bg-red-50 border-red-200',
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Preloaded Hinglish OPD Clinical Scenarios Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Hinglish Clinical Consultation Scenarios (One-Tap Load or Live Voice Stream)
            </h2>
            <p className="text-xs text-slate-600">
              Select a rural PHC patient scenario below to stream code-mixed Hindi + English utterances, or use the live microphone.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Active Engine: {isOnline ? 'Hybrid Gemini 3.8 Flash + Local Lexicon' : '100% On-Device Edge NLP (Offline)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRELOADED_SCENARIOS.map((scen) => (
            <div
              key={scen.id}
              className="border border-slate-200 hover:border-teal-600 rounded-lg p-3 bg-slate-50/60 flex flex-col justify-between gap-2.5 transition-colors"
            >
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-teal-800 font-semibold">
                  {scen.badgeText}
                </div>
                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {scen.title}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {scen.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onLoadScenario(scen)}
                  className="flex-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors whitespace-nowrap"
                >
                  Instant Fill
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateVoiceStream(scen)}
                  disabled={isStreamingScenario}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded transition-colors whitespace-nowrap"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Stream Voice
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 12-Column Scribe Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): Live Voice Capture, Rolling Transcript & Minimal-Tap Prompts */}
        <div className="lg:col-span-5 space-y-5">
          {/* Voice Capture & Microphone Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  1. Voice Capture & Hinglish ASR
                </h2>
                <p className="text-xs text-slate-600">
                  Speak in natural Hindi + English clinical mix
                </p>
              </div>

              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value as 'hi-IN' | 'en-IN')}
                aria-label="Speech Recognition Language"
                className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="hi-IN">Hindi + English (hi-IN)</option>
                <option value="en-IN">Indian English (en-IN)</option>
              </select>
            </div>

            {/* Primary Mic / Stop & Structure Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleMicrophone}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Stop Listening & Auto-Structure
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Start Listening (Mic)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onRunStructuring()}
                disabled={isStructuring || encounter.transcript.length === 0}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
              >
                {isStructuring ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin text-teal-700" />
                    Structuring...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-700" />
                    Structure Now
                  </>
                )}
              </button>
            </div>

            {micStatusNote && (
              <div className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded font-medium">
                {micStatusNote}
              </div>
            )}

            {/* Direct Hinglish Dictation / Utterance Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!spokenInput.trim()) return;
                appendSpokenUtterance(spokenInput);
                setSpokenInput('');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={spokenInput}
                onChange={(e) => setSpokenInput(e.target.value)}
                placeholder="Type or dictate Hinglish utterance (e.g. 'Tab Azithromycin 500mg OD 3 din')..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-teal-700"
              />
              <button
                type="submit"
                className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md whitespace-nowrap"
              >
                + Utterance
              </button>
            </form>

            {/* Rolling Segmented Consultation Transcript */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Live Segmented Transcript ({encounter.transcript.length} utterances)</span>
                <span className="text-[11px] text-slate-500">Tap any line to correct & train local ASR</span>
              </div>

              <div className="border border-slate-200 rounded-lg bg-slate-50 p-3 max-h-[310px] overflow-y-auto space-y-2.5">
                {encounter.transcript.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                    <p>No consultation utterances recorded yet.</p>
                    <p>Tap <strong>Start Listening (Mic)</strong> or <strong>Stream Voice</strong> on any clinical scenario above.</p>
                  </div>
                ) : (
                  encounter.transcript.map((seg) => (
                    <div
                      key={seg.id}
                      className="bg-white border border-slate-200 rounded p-2.5 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border rounded ${
                              segmentLabelStyle[seg.segmentType] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {seg.segmentType}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">{seg.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSegmentId(seg.id);
                            setEditingSegmentText(seg.text);
                          }}
                          className="text-[11px] text-slate-500 hover:text-teal-700 inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          Correct ASR
                        </button>
                      </div>

                      {editingSegmentId === seg.id ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={editingSegmentText}
                            onChange={(e) => setEditingSegmentText(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-teal-600 rounded"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingSegmentId(null)}
                              className="px-2 py-1 text-[11px] text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingSegmentText.trim() && editingSegmentText !== seg.text) {
                                  onLogCorrection({
                                    originalSpoken: seg.text,
                                    correctedOutput: editingSegmentText.trim(),
                                    fieldCategory: 'ASR Lexicon',
                                    status: 'Active in Local Model',
                                  });
                                  onUpdateEncounter((prev) => ({
                                    ...prev,
                                    transcript: prev.transcript.map((t) =>
                                      t.id === seg.id ? { ...t, text: editingSegmentText.trim() } : t
                                    ),
                                  }));
                                }
                                setEditingSegmentId(null);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-teal-700 rounded"
                            >
                              Save & Log to Model
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-900 leading-relaxed font-medium">{seg.text}</p>
                      )}

                      {seg.lexiconApplied && seg.lexiconApplied.length > 0 && (
                        <div className="text-[10px] font-mono text-teal-800">
                          Lexicon normalized: {seg.lexiconApplied.join(' · ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Minimal-Tap Quick Clinical Prompts */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Minimal-Tap Quick Clinical Prompts
              </h3>
              <p className="text-xs text-slate-600">
                Single-tap buttons to populate routine findings and standard PHC kits without speaking
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickPrompt('vitals_normal')}
                className="min-h-[42px] px-3 py-2 text-xs font-semibold text-left text-slate-800 bg-slate-50 hover:bg-teal-50 hover:border-teal-600 border border-slate-200 rounded-md transition-colors"
              >
                + Vitals Normal (120/80)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('no_allergies')}
                className="min-h-[42px] px-3 py-2 text-xs font-semibold text-left text-slate-800 bg-slate-50 hover:bg-teal-50 hover:border-teal-600 border border-slate-200 rounded-md transition-colors"
              >
                + No Drug Allergies
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('exam_nad')}
                className="min-h-[42px] px-3 py-2 text-xs font-semibold text-left text-slate-800 bg-slate-50 hover:bg-teal-50 hover:border-teal-600 border border-slate-200 rounded-md transition-colors"
              >
                + Normal Systemic Exam
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('urti_preset')}
                className="min-h-[42px] px-3 py-2 text-xs font-semibold text-left text-slate-800 bg-slate-50 hover:bg-teal-50 hover:border-teal-600 border border-slate-200 rounded-md transition-colors"
              >
                + Usual URTI Meds Preset
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('ors_zinc')}
                className="min-h-[42px] px-3 py-2 text-xs font-semibold text-left text-slate-800 bg-slate-50 hover:bg-teal-50 hover:border-teal-600 border border-slate-200 rounded-md transition-colors"
              >
                + Diarrhea ORS + Zinc Kit
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('followup_3d')}
                className="min-h-[42px] px-3 py-2 text-xs font-semibold text-left text-slate-800 bg-slate-50 hover:bg-teal-50 hover:border-teal-600 border border-slate-200 rounded-md transition-colors"
              >
                + Follow-Up in 3 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt('refer_dh')}
                className="col-span-2 min-h-[42px] px-3 py-2 text-xs font-semibold text-left text-red-800 bg-red-50/70 hover:bg-red-100 border border-red-200 rounded-md transition-colors flex items-center justify-between"
              >
                <span>+ Refer to Higher Facility (District Hospital / CHC)</span>
                <Truck className="w-4 h-4 text-red-700" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Auto-Populated Case Sheet, Prescription Table & Conditional Referral */}
        <div className="lg:col-span-7 space-y-5">
          {/* Mandatory Government Format Compliance Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {compliance.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs font-bold text-slate-900">
                  {template.id} Government Format Validation: {compliance.scorePercent}% Mandatory Fields Populated
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Latency: {encounter.processingLatencyMs} ms
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              {compliance.items.map((item, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 ${
                    item.passed ? 'text-slate-700' : 'text-red-700 font-bold'
                  }`}
                >
                  <span>{item.passed ? '✓' : '✕'}</span>
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Section A: Patient Demographics & Visit Details */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900">
                A. रोगी का विवरण / Patient Demographics ({encounter.uhid})
              </h2>
              <div className="flex items-center gap-1">
                {(['New OPD', 'Follow-Up', 'ANC / Maternal', 'Emergency'] as const).map((vt) => (
                  <button
                    key={vt}
                    type="button"
                    onClick={() =>
                      onUpdateEncounter((prev) => ({
                        ...prev,
                        patient: { ...prev.patient, visitType: vt },
                      }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                      encounter.patient.visitType === vt
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {vt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Full Name / रोगी का नाम *
                </label>
                <input
                  type="text"
                  value={encounter.patient.name}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, name: e.target.value },
                    }))
                  }
                  placeholder="e.g. Sita Devi"
                  className={`w-full px-3 py-1.5 text-xs border rounded focus:outline-none ${
                    !encounter.patient.name.trim()
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 focus:border-teal-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (Years) / आयु *
                </label>
                <input
                  type="text"
                  value={encounter.patient.age}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, age: e.target.value },
                    }))
                  }
                  placeholder="45"
                  className={`w-full px-3 py-1.5 text-xs font-mono border rounded focus:outline-none ${
                    !encounter.patient.age.trim()
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 focus:border-teal-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender / लिंग *
                </label>
                <div className="flex items-center gap-1">
                  {(['Female', 'Male', 'Other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        onUpdateEncounter((prev) => ({
                          ...prev,
                          patient: { ...prev.patient, gender: g },
                        }))
                      }
                      className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-colors ${
                        encounter.patient.gender === g
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {g === 'Female' ? 'F' : g === 'Male' ? 'M' : 'O'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Village / Gram Panchayat
                </label>
                <input
                  type="text"
                  value={encounter.patient.village}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, village: e.target.value },
                    }))
                  }
                  placeholder="Gram Kankaha, Block Mohanlalganj"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={encounter.patient.phone}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, phone: e.target.value },
                    }))
                  }
                  placeholder="94150XXXXX"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ABHA Health ID
                </label>
                <input
                  type="text"
                  value={encounter.patient.abhaId}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      patient: { ...prev.patient, abhaId: e.target.value },
                    }))
                  }
                  placeholder="91-XXXX-XXXX-XXXX"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>
          </div>

          {/* Section B: Case Sheet (Complaints, Vitals, History, Exam, Diagnosis, Lab) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2.5">
              B. ओपीडी केस शीट / Structured Clinical Case Sheet
            </h2>

            {/* Vitals Strip (Tabular Numerals) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  BP (mmHg) *
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.vitals.bp}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: {
                        ...prev.caseSheet,
                        vitals: { ...prev.caseSheet.vitals, bp: e.target.value },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pulse (bpm)
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.vitals.pulse}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: {
                        ...prev.caseSheet,
                        vitals: { ...prev.caseSheet.vitals, pulse: e.target.value },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Temp (°F) *
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.vitals.temp}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: {
                        ...prev.caseSheet,
                        vitals: { ...prev.caseSheet.vitals, temp: e.target.value },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  SpO2 (%)
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.vitals.spo2}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: {
                        ...prev.caseSheet,
                        vitals: { ...prev.caseSheet.vitals, spo2: e.target.value },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.vitals.weight}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: {
                        ...prev.caseSheet,
                        vitals: { ...prev.caseSheet.vitals, weight: e.target.value },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Chief Complaints & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-9 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Chief Complaints / मुख्य शिकायतें *
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {encounter.caseSheet.chiefComplaints.map((cc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 rounded text-xs font-medium"
                    >
                      <span>{cc}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateEncounter((prev) => ({
                            ...prev,
                            caseSheet: {
                              ...prev.caseSheet,
                              chiefComplaints: prev.caseSheet.chiefComplaints.filter((_, i) => i !== idx),
                            },
                          }))
                        }
                        className="text-slate-400 hover:text-red-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComplaintInput}
                    onChange={(e) => setNewComplaintInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newComplaintInput.trim()) {
                        e.preventDefault();
                        onUpdateEncounter((prev) => ({
                          ...prev,
                          caseSheet: {
                            ...prev.caseSheet,
                            chiefComplaints: [...prev.caseSheet.chiefComplaints, newComplaintInput.trim()],
                          },
                        }));
                        setNewComplaintInput('');
                      }
                    }}
                    placeholder="Add complaint (e.g. Fever with chills) and press Enter..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newComplaintInput.trim()) return;
                      onUpdateEncounter((prev) => ({
                        ...prev,
                        caseSheet: {
                          ...prev.caseSheet,
                          chiefComplaints: [...prev.caseSheet.chiefComplaints, newComplaintInput.trim()],
                        },
                      }));
                      setNewComplaintInput('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration / अवधि *
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.duration}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: { ...prev.caseSheet, duration: e.target.value },
                    }))
                  }
                  placeholder="3 days"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>

            {/* History & Systemic Exam */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medical History & Allergies
                </label>
                <textarea
                  rows={2}
                  value={encounter.caseSheet.history}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: { ...prev.caseSheet, history: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Systemic Examination / शारीरिक परीक्षण
                </label>
                <textarea
                  rows={2}
                  value={encounter.caseSheet.systemicExam}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: { ...prev.caseSheet, systemicExam: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>

            {/* Provisional Diagnosis & ICD-10 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-9">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provisional Diagnosis / अनन्तिम निदान *
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.provisionalDiagnosis}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: { ...prev.caseSheet, provisionalDiagnosis: nextVal },
                    }));
                  }}
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      onLogCorrection({
                        originalSpoken: 'Auto-extracted diagnosis',
                        correctedOutput: `${e.target.value} (${encounter.caseSheet.icd10Code})`,
                        fieldCategory: 'Diagnosis Mapping',
                        status: 'Active in Local Model',
                      });
                    }
                  }}
                  className={`w-full px-3 py-1.5 text-xs font-semibold border rounded focus:outline-none ${
                    !encounter.caseSheet.provisionalDiagnosis.trim()
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-slate-300 focus:border-teal-700'
                  }`}
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ICD-10 Code
                </label>
                <input
                  type="text"
                  value={encounter.caseSheet.icd10Code}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      caseSheet: { ...prev.caseSheet, icd10Code: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-teal-800 border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>

            {/* Quick Tap Investigations Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Investigations Advised / जांचें (Tap to toggle)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_INVESTIGATIONS.map((inv) => {
                  const selected = encounter.caseSheet.investigations.includes(inv);
                  return (
                    <button
                      key={inv}
                      type="button"
                      onClick={() =>
                        onUpdateEncounter((prev) => ({
                          ...prev,
                          caseSheet: {
                            ...prev.caseSheet,
                            investigations: selected
                              ? prev.caseSheet.investigations.filter((i) => i !== inv)
                              : [...prev.caseSheet.investigations, inv],
                          },
                        }))
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                        selected
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {selected ? `✓ ${inv}` : `+ ${inv}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section C: Prescription Review & Bilingual Visual Timing Builder */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  C. औषधि तालिका / NLEM Prescription & Visual Timing Icons ({encounter.prescriptions.length})
                </h2>
                <p className="text-xs text-slate-600">
                  Tap frequency chips or Morning/Noon/Night/Plate icons to update bilingual Hindi + English instructions
                </p>
              </div>

              {/* Offline NLEM Drug Dictionary Search */}
              <div className="relative w-full sm:w-64">
                <div className="flex items-center border border-slate-300 rounded-md bg-white px-2.5 py-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={edlSearch}
                    onChange={(e) => setEdlSearch(e.target.value)}
                    placeholder="Add NLEM drug (e.g. Amoxy, ORS)..."
                    className="w-full text-xs focus:outline-none"
                  />
                </div>
                {edlSearch.trim() && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredFormulary.length === 0 ? (
                      <div className="p-2.5 text-xs text-slate-500">No matching drug in offline EDL.</div>
                    ) : (
                      filteredFormulary.map((drug) => (
                        <button
                          key={drug.nlemCode}
                          type="button"
                          onClick={() => handleAddFormularyDrug(drug)}
                          className="w-full text-left px-3 py-2 hover:bg-teal-50 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900">
                              {drug.form} {drug.drugName} {drug.strength}
                            </div>
                            <div className="text-[11px] text-slate-500">{drug.genericName}</div>
                          </div>
                          <span className="font-mono text-[11px] text-teal-800 font-semibold">
                            + Add
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {encounter.prescriptions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 space-y-2">
                <p>No medications added yet.</p>
                <p>Search the offline NLEM formulary above or tap a quick regimen preset on the left.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {encounter.prescriptions.map((rx, idx) => (
                  <div
                    key={rx.id}
                    className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                        <span className="text-sm font-bold text-slate-900">
                          {rx.form} {rx.drugName} {rx.strength}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          · {rx.route} · {rx.nlemCode}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateEncounter((prev) => ({
                            ...prev,
                            prescriptions: prev.prescriptions.filter((item) => item.id !== rx.id),
                          }))
                        }
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Remove drug"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Interactive Controls: Dose, Frequency Chips, Duration Chips, and Visual Timing Pictograms */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Dose Input */}
                        <input
                          type="text"
                          value={rx.dose}
                          onChange={(e) => handleUpdatePrescriptionRow(rx.id, { dose: e.target.value })}
                          aria-label="Medication Dose"
                          className="w-24 px-2 py-1 text-xs font-mono font-semibold bg-white border border-slate-300 rounded"
                        />

                        {/* Frequency Tap Chips */}
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded p-0.5">
                          {(['OD', 'BD', 'TDS', 'QID', 'SOS'] as FrequencyCode[]).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => {
                                handleUpdatePrescriptionRow(rx.id, { frequency: f });
                                onLogCorrection({
                                  originalSpoken: `${rx.drugName} ${rx.frequency}`,
                                  correctedOutput: `${rx.drugName} ${f}`,
                                  fieldCategory: 'Medication Dose',
                                  status: 'Active in Local Model',
                                });
                              }}
                              className={`px-2 py-1 text-[11px] font-mono font-bold rounded transition-colors ${
                                rx.frequency === f
                                  ? 'bg-teal-700 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>

                        {/* Duration Days Tap Chips */}
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded p-0.5">
                          {[3, 5, 7, 14, 30].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleUpdatePrescriptionRow(rx.id, { durationDays: d })}
                              className={`px-2 py-1 text-[11px] font-mono font-semibold rounded transition-colors ${
                                rx.durationDays === d
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {d}d
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Interactive Visual Pictograms (Sun / Noon / Moon / Plate) */}
                      <div className="flex items-center gap-1.5">
                        <TimingPictogram
                          type="morning"
                          active={rx.timingIcons.includes('morning')}
                          onClick={() => handleToggleTimingIcon(rx, 'morning')}
                          compact
                        />
                        <TimingPictogram
                          type="afternoon"
                          active={rx.timingIcons.includes('afternoon')}
                          onClick={() => handleToggleTimingIcon(rx, 'afternoon')}
                          compact
                        />
                        <TimingPictogram
                          type="night"
                          active={rx.timingIcons.includes('night')}
                          onClick={() => handleToggleTimingIcon(rx, 'night')}
                          compact
                        />
                        <MealPictogram
                          mealRelation={rx.mealRelation}
                          onClick={() => handleCycleMealRelation(rx)}
                          compact
                        />
                      </div>
                    </div>

                    {/* Live Bilingual Instruction Output */}
                    <div className="bg-white border border-slate-200 rounded px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <span className="font-bold text-teal-950">{rx.hindiInstruction}</span>
                      <span className="text-slate-500">{rx.englishInstruction}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section D: Conditional Referral Note */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  D. उच्च केंद्र रेफरल नोट / Higher Facility Referral Note
                </h2>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={encounter.referral.isReferred}
                  onChange={(e) =>
                    onUpdateEncounter((prev) => ({
                      ...prev,
                      referral: {
                        ...prev.referral,
                        isReferred: e.target.checked,
                        destinationFacility:
                          e.target.checked && !prev.referral.destinationFacility
                            ? template.referralFacilities[0]
                            : prev.referral.destinationFacility,
                      },
                    }))
                  }
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <span>Refer Patient to Higher Centre</span>
              </label>
            </div>

            {encounter.referral.isReferred && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Facility ({template.id} Network) *
                  </label>
                  <select
                    value={encounter.referral.destinationFacility}
                    onChange={(e) =>
                      onUpdateEncounter((prev) => ({
                        ...prev,
                        referral: { ...prev.referral, destinationFacility: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  >
                    {template.referralFacilities.map((fac) => (
                      <option key={fac} value={fac}>
                        {fac}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Urgency
                    </label>
                    <select
                      value={encounter.referral.urgency}
                      onChange={(e) =>
                        onUpdateEncounter((prev) => ({
                          ...prev,
                          referral: {
                            ...prev.referral,
                            urgency: e.target.value as 'Routine' | 'Urgent' | 'Emergency',
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ambulance Mode
                    </label>
                    <select
                      value={encounter.referral.transportMode}
                      onChange={(e) =>
                        onUpdateEncounter((prev) => ({
                          ...prev,
                          referral: {
                            ...prev.referral,
                            transportMode: e.target.value as
                              | '108 Ambulance'
                              | '102 Janani Express'
                              | 'Own Arrangement',
                          },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value="108 Ambulance">108 Ambulance</option>
                      <option value="102 Janani Express">102 Janani Express</option>
                      <option value="Own Arrangement">Own Arrangement</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Referral & Provisional Findings *
                  </label>
                  <input
                    type="text"
                    value={encounter.referral.reason}
                    onChange={(e) =>
                      onUpdateEncounter((prev) => ({
                        ...prev,
                        referral: { ...prev.referral, reason: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pre-Referral Stabilization / Interventions Done at PHC
                  </label>
                  <input
                    type="text"
                    value={encounter.referral.preReferralTreatment}
                    onChange={(e) =>
                      onUpdateEncounter((prev) => ({
                        ...prev,
                        referral: { ...prev.referral, preReferralTreatment: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sign & Finalize Action Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900">
                Ready for Digital Signature & Bilingual Prescription Print
              </div>
              <div className="text-xs text-slate-600">
                Signing attaches <strong>{encounter.practitioner.doctorName} ({encounter.practitioner.regNumber})</strong> and generates the ABDM FHIR R4 bundle.
              </div>
            </div>

            <button
              type="button"
              onClick={onSignAndFinalize}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FileCheck2 className="w-4 h-4" />
              Sign & Open Printable Bilingual Slip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
