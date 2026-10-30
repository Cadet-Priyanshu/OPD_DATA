export type StateTemplateId = 'NHM' | 'UP' | 'BIHAR';

export type SegmentType = 'complaint' | 'history' | 'exam' | 'diagnosis' | 'plan' | 'referral';

export type FrequencyCode = 'OD' | 'BD' | 'TDS' | 'QID' | 'SOS';

export type TimingIconType = 'morning' | 'afternoon' | 'night';

export type MealRelationType = 'after_food' | 'before_food' | 'empty_stomach' | 'any';

export interface TranscriptSegment {
  id: string;
  timestamp: string;
  speaker: 'Doctor' | 'Patient';
  text: string;
  correctedText?: string;
  segmentType: SegmentType;
  confidence: number;
  lexiconApplied?: string[];
}

export interface PatientDemographics {
  name: string;
  age: string;
  gender: 'Female' | 'Male' | 'Other' | '';
  phone: string;
  abhaId: string;
  village: string;
  visitType: 'New OPD' | 'Follow-Up' | 'ANC / Maternal' | 'Emergency';
}

export interface VitalsData {
  bp: string;
  pulse: string;
  temp: string;
  spo2: string;
  weight: string;
}

export interface CaseSheetData {
  chiefComplaints: string[];
  duration: string;
  history: string;
  allergies: string;
  vitals: VitalsData;
  systemicExam: string;
  provisionalDiagnosis: string;
  icd10Code: string;
  investigations: string[];
  patientAdviceHindi: string;
  patientAdviceEnglish: string;
  followUpDays: number;
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  genericName: string;
  nlemCode: string;
  strength: string;
  form: 'Tab' | 'Cap' | 'Syp' | 'Inj' | 'Sachet' | 'Inhaler' | 'Drops';
  route: 'Oral' | 'IV' | 'IM' | 'Topical' | 'Inhalation';
  dose: string;
  frequency: FrequencyCode;
  timingIcons: TimingIconType[];
  mealRelation: MealRelationType;
  durationDays: number;
  hindiInstruction: string;
  englishInstruction: string;
  warnings: string;
}

export interface ReferralData {
  isReferred: boolean;
  destinationFacility: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  programScheme: string;
  reason: string;
  summaryFindings: string;
  preReferralTreatment: string;
  transportMode: '108 Ambulance' | '102 Janani Express' | 'Own Arrangement';
}

export interface PractitionerProfile {
  doctorName: string;
  designation: string;
  regNumber: string;
  facilityName: string;
  districtState: string;
  hfrId: string;
  primaryLanguage: string;
  dialectRegion: string;
}

export interface EncounterRecord {
  id: string;
  uhid: string;
  createdAt: string;
  stateTemplate: StateTemplateId;
  syncStatus: 'synced' | 'pending_offline';
  abdmAckId?: string;
  structuringEngine: 'gemini-3.8-flash' | 'offline-edge-nlp';
  processingLatencyMs: number;
  documentationSeconds: number;
  manualBaselineSeconds: number;
  patient: PatientDemographics;
  transcript: TranscriptSegment[];
  caseSheet: CaseSheetData;
  prescriptions: PrescriptionItem[];
  referral: ReferralData;
  signed: boolean;
  signedAt?: string;
  practitioner: PractitionerProfile;
}

export interface DoctorShortcut {
  id: string;
  triggerPhrase: string;
  hindiAlias: string;
  category: 'regimen' | 'exam' | 'advice';
  description: string;
  expansionText: string;
  medications?: Omit<PrescriptionItem, 'id'>[];
  usageCount: number;
}

export interface CorrectionLogEntry {
  id: string;
  timestamp: string;
  originalSpoken: string;
  correctedOutput: string;
  fieldCategory: 'ASR Lexicon' | 'Medication Dose' | 'Diagnosis Mapping' | 'Shortcut Phrase';
  status: 'Active in Local Model' | 'Queued for Fine-Tuning';
}

export interface PreloadedScenario {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  patient: PatientDemographics;
  utterances: {
    speaker: 'Doctor' | 'Patient';
    text: string;
    segmentType: SegmentType;
    lexiconFixes?: string[];
  }[];
}

export interface StateTemplateConfig {
  id: StateTemplateId;
  titleHindi: string;
  titleEnglish: string;
  departmentLine: string;
  schemeLine: string;
  emblemCode: string;
  mandatoryFields: string[];
  referralFacilities: string[];
}
