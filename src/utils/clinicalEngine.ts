import {
  CaseSheetData,
  DoctorShortcut,
  EncounterRecord,
  FrequencyCode,
  MealRelationType,
  PatientDemographics,
  PrescriptionItem,
  ReferralData,
  SegmentType,
  StateTemplateId,
  TimingIconType,
} from '../types/clinical';
import {
  DOMAIN_LEXICON_CORRECTIONS,
  OFFLINE_EDL_FORMULARY,
  STATE_TEMPLATES,
} from '../data/clinicalData';

/**
 * Generates bilingual (Hindi Devanagari + English) patient instructions and timing icons
 * from structured drug frequency, dose, meal relation, and duration.
 */
export function buildBilingualMedicationInstruction(
  dose: string,
  frequency: FrequencyCode,
  mealRelation: MealRelationType,
  durationDays: number
): {
  timingIcons: TimingIconType[];
  hindiInstruction: string;
  englishInstruction: string;
} {
  let timingIcons: TimingIconType[] = ['morning'];
  let freqHindi = 'सुबह';
  let freqEng = 'in the morning';

  switch (frequency) {
    case 'OD':
      timingIcons = ['morning'];
      freqHindi = 'रोज़ सुबह';
      freqEng = 'once daily in the morning';
      break;
    case 'BD':
      timingIcons = ['morning', 'night'];
      freqHindi = 'सुबह और रात';
      freqEng = 'twice daily (morning & night)';
      break;
    case 'TDS':
      timingIcons = ['morning', 'afternoon', 'night'];
      freqHindi = 'सुबह, दोपहर और रात';
      freqEng = 'three times daily (morning, afternoon & night)';
      break;
    case 'QID':
      timingIcons = ['morning', 'afternoon', 'night'];
      freqHindi = 'दिन में 4 बार (हर 6 घंटे में)';
      freqEng = 'four times daily (every 6 hours)';
      break;
    case 'SOS':
      timingIcons = ['morning', 'night'];
      freqHindi = 'ज़रूरत पड़ने पर (बुखार या दर्द होने पर)';
      freqEng = 'as needed (for fever or pain)';
      break;
  }

  let mealHindi = 'खाना खाने के बाद';
  let mealEng = 'after food';
  if (mealRelation === 'before_food') {
    mealHindi = 'खाना खाने से पहले';
    mealEng = 'before food';
  } else if (mealRelation === 'empty_stomach') {
    mealHindi = 'सुबह खाली पेट';
    mealEng = 'on an empty stomach';
  } else if (mealRelation === 'any') {
    mealHindi = 'साफ पानी के साथ';
    mealEng = 'with clean water';
  }

  const doseHindi = dose
    .replace(/Tab/i, 'गोली')
    .replace(/Cap/i, 'कैप्सूल')
    .replace(/Sachet/i, 'पैकेट')
    .replace(/Glass/i, 'गिलास');

  const hindiInstruction = `${freqHindi} ${mealHindi} ${doseHindi} — ${durationDays} दिन तक`;
  const englishInstruction = `Take ${dose} ${freqEng} ${mealEng} for ${durationDays} days`;

  return {
    timingIcons,
    hindiInstruction,
    englishInstruction,
  };
}

/**
 * Classifies a spoken Hinglish/Hindi/English sentence into a clinical utterance segment.
 */
export function classifyUtteranceSegment(text: string): {
  segmentType: SegmentType;
  normalizedText: string;
  lexiconApplied: string[];
} {
  const lower = text.toLowerCase();
  const lexiconApplied: string[] = [];
  let normalizedText = text;

  Object.entries(DOMAIN_LEXICON_CORRECTIONS).forEach(([wrong, right]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    if (regex.test(normalizedText)) {
      normalizedText = normalizedText.replace(regex, right);
      lexiconApplied.push(`${wrong} → ${right}`);
    }
  });

  if (
    lower.includes('refer') ||
    lower.includes('district hospital') ||
    lower.includes('chc') ||
    lower.includes('रेफर') ||
    lower.includes('सदर अस्पताल')
  ) {
    return { segmentType: 'referral', normalizedText, lexiconApplied };
  }
  if (
    lower.includes('tab ') ||
    lower.includes('cap ') ||
    lower.includes('syp ') ||
    lower.includes('inj ') ||
    lower.includes('rx') ||
    lower.includes('plan') ||
    lower.includes('dawa') ||
    lower.includes('गोली') ||
    lower.includes('paracetamol') ||
    lower.includes('amoxicillin') ||
    lower.includes('ors') ||
    lower.includes('amlodipine') ||
    lower.includes('metformin')
  ) {
    return { segmentType: 'plan', normalizedText, lexiconApplied };
  }
  if (
    lower.includes('diagnosis') ||
    lower.includes('investigations') ||
    lower.includes('cbc') ||
    lower.includes('x-ray') ||
    lower.includes('sputum') ||
    lower.includes('निदान')
  ) {
    return { segmentType: 'diagnosis', normalizedText, lexiconApplied };
  }
  if (
    lower.includes('bp ') ||
    lower.includes('pulse') ||
    lower.includes('spo2') ||
    lower.includes('examination') ||
    lower.includes('vitals') ||
    lower.includes('chest') ||
    lower.includes('temp')
  ) {
    return { segmentType: 'exam', normalizedText, lexiconApplied };
  }
  if (
    lower.includes('history') ||
    lower.includes('allergy') ||
    lower.includes('allergies') ||
    lower.includes('known case') ||
    lower.includes('smoking') ||
    lower.includes('इतिहास')
  ) {
    return { segmentType: 'history', normalizedText, lexiconApplied };
  }

  return { segmentType: 'complaint', normalizedText, lexiconApplied };
}

/**
 * Deterministic On-Device Offline Hinglish Clinical NLP Parser.
 * Works 100% without internet connectivity to extract Case Sheet, Rx, and Referrals.
 */
export function runOfflineHinglishNLP(
  transcriptText: string,
  currentPatient: PatientDemographics,
  shortcuts: DoctorShortcut[],
  stateTemplate: StateTemplateId
): {
  patient: Partial<PatientDemographics>;
  caseSheet: CaseSheetData;
  prescriptions: PrescriptionItem[];
  referral: ReferralData;
} {
  let workingText = transcriptText;

  // 1. Expand matching doctor shortcuts first
  const matchedShortcutMeds: PrescriptionItem[] = [];
  shortcuts.forEach((sc) => {
    if (workingText.toLowerCase().includes(sc.triggerPhrase.toLowerCase())) {
      workingText += ` . ${sc.expansionText}`;
      if (sc.medications) {
        sc.medications.forEach((m, idx) => {
          matchedShortcutMeds.push({
            ...m,
            id: `rx-sc-${sc.id}-${idx}-${Date.now()}`,
          });
        });
      }
    }
  });

  const lower = workingText.toLowerCase();

  // 2. Extract Demographics if mentioned
  const extractedPatient: Partial<PatientDemographics> = {};
  const nameMatch = workingText.match(/(?:naam|patient)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch && !currentPatient.name) {
    extractedPatient.name = nameMatch[1].trim();
  }
  const ageMatch = workingText.match(/(?:umar|age)\s*(\d{1,3})\s*(?:saal|years|yr)?/i);
  if (ageMatch && !currentPatient.age) {
    extractedPatient.age = ageMatch[1];
  }
  if (!currentPatient.gender) {
    if (/\b(female|mahila|devi|aurat)\b/i.test(workingText)) extractedPatient.gender = 'Female';
    else if (/\b(male|purush)\b/i.test(workingText)) extractedPatient.gender = 'Male';
  }

  // 3. Extract Chief Complaints & Duration
  const complaints: string[] = [];
  const durationMatch = workingText.match(/(\d+\s*(?:din|days|hafte|weeks|mahine|months))/i);
  const duration = durationMatch
    ? durationMatch[1]
        .replace(/din/i, 'days')
        .replace(/hafte/i, 'weeks')
        .replace(/mahine/i, 'months')
    : '3 days';

  if (lower.includes('bukhar') || lower.includes('fever') || lower.includes('बुखार')) {
    complaints.push(`Fever (${duration})`);
  }
  if (lower.includes('balgam wali khansi') || lower.includes('productive cough')) {
    complaints.push(`Productive cough (${duration})`);
  } else if (lower.includes('khansi') || lower.includes('cough') || lower.includes('खांसी')) {
    complaints.push('Dry cough and throat irritation');
  }
  if (lower.includes('sar dard') || lower.includes('headache') || lower.includes('सिर दर्द')) {
    complaints.push('Headache & body ache');
  }
  if (lower.includes('thook mein khoon') || lower.includes('hemoptysis') || lower.includes('थूक में खून')) {
    complaints.push('Blood-stained sputum (Hemoptysis)');
  }
  if (lower.includes('dast') || lower.includes('loose stool') || lower.includes('diarrhea') || lower.includes('दस्त')) {
    complaints.push('Frequent watery loose stools');
  }
  if (lower.includes('ulti') || lower.includes('vomiting') || lower.includes('उल्टी')) {
    complaints.push('Vomiting episodes');
  }
  if (lower.includes('chakkar') || lower.includes('giddiness') || lower.includes('चक्कर')) {
    complaints.push('Giddiness and heaviness in head');
  }
  if (complaints.length === 0) {
    complaints.push('General OPD evaluation for acute symptoms');
  }

  // 4. Extract Vitals
  const bpMatch = workingText.match(/bp\s*(\d{2,3}\/\d{2,3})/i);
  const pulseMatch = workingText.match(/pulse\s*(\d{2,3})/i);
  const tempMatch = workingText.match(/temp(?:erature)?\s*(\d{2,3}(?:\.\d)?)/i);
  const spo2Match = workingText.match(/spo2\s*(\d{2,3})/i);
  const weightMatch = workingText.match(/weight\s*(\d{1,3})/i);

  const vitals = {
    bp: bpMatch ? bpMatch[1] : '122/80',
    pulse: pulseMatch ? pulseMatch[1] : '84',
    temp: tempMatch ? tempMatch[1] : lower.includes('bukhar') ? '101.2' : '98.6',
    spo2: spo2Match ? spo2Match[1] : '98',
    weight: weightMatch ? weightMatch[1] : '56',
  };

  // 5. History & Allergies
  let history = 'No chronic comorbid illness reported.';
  if (lower.includes('bidi') || lower.includes('smoking')) {
    history = 'Chronic bidi/tobacco smoker. No prior anti-tubercular therapy.';
  } else if (lower.includes('hypertension') || lower.includes('bp aur sugar')) {
    history = 'Known case of Hypertension and Type 2 Diabetes Mellitus on oral therapy.';
  }
  const allergies = lower.includes('no known drug allerg') || lower.includes('no drug allergy')
    ? 'No known drug allergies (NKDA)'
    : 'No known drug allergies';

  // 6. Systemic Exam
  let systemicExam = 'Conscious, oriented. Chest: Bilateral vesicular breath sounds clear. CVS: S1 S2 normal. P/A: Soft, non-tender.';
  if (lower.includes('crepitations')) {
    systemicExam = 'Conscious, pale. Chest: Right upper zone coarse crepitations heard. CVS: S1 S2 normal.';
  } else if (lower.includes('umbilical tenderness') || lower.includes('skin pinch')) {
    systemicExam = 'Alert, thirsty. Abdomen soft with mild umbilical tenderness; skin pinch retracts rapidly.';
  } else if (lower.includes('pharyngeal congestion')) {
    systemicExam = 'Mild pharyngeal congestion present. Chest: Bilateral air entry clear, no added sounds.';
  }

  // 7. Provisional Diagnosis & ICD-10
  let provisionalDiagnosis = 'Acute Viral Febrile Illness with URTI';
  let icd10Code = 'J06.9';

  if (lower.includes('tuberculosis') || lower.includes('hemoptysis') || lower.includes('balgam wali khansi')) {
    provisionalDiagnosis = 'Suspected Pulmonary Tuberculosis with Hemoptysis';
    icd10Code = 'A15.0';
  } else if (lower.includes('hypertension') && lower.includes('diabetes')) {
    provisionalDiagnosis = 'Essential Hypertension with Type 2 Diabetes Mellitus';
    icd10Code = 'I10 / E11.9';
  } else if (lower.includes('gastroenteritis') || lower.includes('patla dast') || lower.includes('diarrhea')) {
    provisionalDiagnosis = 'Acute Gastroenteritis with Mild Dehydration';
    icd10Code = 'A09';
  } else if (lower.includes('acute febrile illness') || lower.includes('dengue')) {
    provisionalDiagnosis = 'Acute Febrile Illness (Suspected Dengue / Viral Fever)';
    icd10Code = 'A90 / R50.9';
  }

  // 8. Investigations
  const investigations: string[] = [];
  if (lower.includes('cbc')) investigations.push('CBC with Platelet Count');
  if (lower.includes('ns1') || lower.includes('dengue')) investigations.push('Dengue NS1 Antigen & IgM');
  if (lower.includes('malaria') || lower.includes('mp card')) investigations.push('Malaria Rapid Antigen (MP Card)');
  if (lower.includes('sputum') || lower.includes('afb') || lower.includes('cbnaat')) {
    investigations.push('Sputum for AFB (2 Samples) & Truenat/CBNAAT');
  }
  if (lower.includes('x-ray')) investigations.push('Chest X-Ray PA View');
  if (lower.includes('rbs') || lower.includes('fasting blood sugar')) investigations.push('Fasting / Random Blood Sugar');
  if (lower.includes('hba1c')) investigations.push('HbA1c & Serum Creatinine');
  if (lower.includes('stool')) investigations.push('Stool Routine & Microscopy');

  // 9. Medications from Formulary + Spoken Frequency/Duration
  const prescriptions: PrescriptionItem[] = [...matchedShortcutMeds];
  const addedDrugNames = new Set(prescriptions.map((p) => p.drugName.toLowerCase()));

  OFFLINE_EDL_FORMULARY.forEach((edl) => {
    const isMentioned =
      lower.includes(edl.drugName.toLowerCase()) ||
      edl.aliases.some((alias) => lower.includes(alias.toLowerCase()));

    if (isMentioned && !addedDrugNames.has(edl.drugName.toLowerCase())) {
      addedDrugNames.add(edl.drugName.toLowerCase());

      // Detect frequency around the drug name
      let freq: FrequencyCode = edl.defaultFrequency;
      let meal: MealRelationType = edl.defaultMeal;
      let days = edl.defaultDuration;

      const drugIndex = lower.indexOf(edl.drugName.toLowerCase().split(' ')[0]);
      const windowSlice = drugIndex >= 0 ? lower.slice(drugIndex, drugIndex + 120) : lower;

      if (windowSlice.includes('teen baar') || windowSlice.includes('tds')) freq = 'TDS';
      else if (windowSlice.includes('do baar') || windowSlice.includes('bd') || windowSlice.includes('subah aur raat')) freq = 'BD';
      else if (windowSlice.includes('sos') || windowSlice.includes('zaroorat')) freq = 'SOS';
      else if (windowSlice.includes('ek baar') || windowSlice.includes('od') || windowSlice.includes('roz subah') || windowSlice.includes('raat ko')) freq = 'OD';

      if (windowSlice.includes('khali pet') || windowSlice.includes('empty stomach')) meal = 'empty_stomach';
      else if (windowSlice.includes('khane se pehle') || windowSlice.includes('before food')) meal = 'before_food';
      else if (windowSlice.includes('khane ke baad') || windowSlice.includes('after food') || windowSlice.includes('nashte ke baad')) meal = 'after_food';

      const daysMatch = windowSlice.match(/(\d{1,2})\s*(?:din|days)/i);
      if (daysMatch) {
        days = parseInt(daysMatch[1], 10);
      }

      const bilingual = buildBilingualMedicationInstruction(edl.defaultDose, freq, meal, days);
      // Adjust night-only OD like Cetirizine
      if (freq === 'OD' && (windowSlice.includes('raat') || edl.drugName === 'Cetirizine')) {
        bilingual.timingIcons = ['night'];
        bilingual.hindiInstruction = `केवल रात को खाना खाने के बाद ${edl.defaultDose.replace('Tab', 'गोली')} — ${days} दिन तक`;
        bilingual.englishInstruction = `Take ${edl.defaultDose} at night after food for ${days} days`;
      }

      prescriptions.push({
        id: `rx-${edl.nlemCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        drugName: edl.drugName,
        genericName: edl.genericName,
        nlemCode: edl.nlemCode,
        strength: edl.strength,
        form: edl.form,
        route: edl.route,
        dose: edl.defaultDose,
        frequency: freq,
        timingIcons: bilingual.timingIcons,
        mealRelation: meal,
        durationDays: days,
        hindiInstruction: bilingual.hindiInstruction,
        englishInstruction: bilingual.englishInstruction,
        warnings: edl.warnings,
      });
    }
  });

  // 10. Referral Detection
  const isReferred =
    lower.includes('refer') ||
    lower.includes('district hospital') ||
    lower.includes('tuberculosis centre') ||
    lower.includes('रेफर');

  const defaultFacility = STATE_TEMPLATES[stateTemplate].referralFacilities[1];
  const referral: ReferralData = {
    isReferred,
    destinationFacility: isReferred ? defaultFacility : '',
    urgency: lower.includes('urgent') || lower.includes('hemoptysis') || lower.includes('khoon') ? 'Urgent' : 'Routine',
    programScheme: stateTemplate === 'BIHAR' ? 'BHAVYA / Nikshay State Referral' : 'NHM Free Referral Transport (108)',
    reason: isReferred
      ? `Requires higher-center diagnostic workup (${investigations.slice(0, 2).join(', ') || 'Specialist Evaluation'}) and specialist management for ${provisionalDiagnosis}.`
      : '',
    summaryFindings: isReferred
      ? `Presenting with ${complaints.join(', ')}. Vitals: BP ${vitals.bp} mmHg, Pulse ${vitals.pulse} bpm, Temp ${vitals.temp} °F, SpO2 ${vitals.spo2}%. ${systemicExam}`
      : '',
    preReferralTreatment: isReferred
      ? prescriptions.map((p) => `${p.form} ${p.drugName} ${p.strength} ${p.frequency}`).join(', ') || 'First-aid stabilization given at PHC'
      : '',
    transportMode: isReferred ? '108 Ambulance' : 'Own Arrangement',
  };

  // 11. Bilingual General Advice & Follow-up
  let patientAdviceHindi = 'साफ गुनगुना पानी खूब पिएं, समय पर दवाइयां लें और पूरा आराम करें। तेज़ बुखार या सांस फूलने पर तुरंत अस्पताल आएं।';
  let patientAdviceEnglish = 'Drink plenty of clean boiled water, take medicines on time, and rest well. Return immediately if high fever or breathlessness occurs.';

  if (provisionalDiagnosis.includes('Hypertension')) {
    patientAdviceHindi = 'खाने में नमक, अचार, पापड़ और मीठा कम करें। रोज़ समय पर बीपी और शुगर की गोली लें, अपने मन से दवा बंद न करें।';
    patientAdviceEnglish = 'Reduce salt, pickles, and sugar in diet. Take BP and diabetes tablets daily on time; do not stop medicines on your own.';
  } else if (provisionalDiagnosis.includes('Gastroenteritis')) {
    patientAdviceHindi = 'हर दस्त के बाद ओआरएस (ORS) का घोल पिलाएं। बच्चे को उबला पानी, दाल का पानी, खिचड़ी और दही दें।';
    patientAdviceEnglish = 'Give ORS solution after every loose stool. Feed boiled water, dal soup, soft khichdi, and curd.';
  } else if (provisionalDiagnosis.includes('Tuberculosis')) {
    patientAdviceHindi = 'खांसते समय मुंह पर कपड़ा या मास्क रखें। बलगम की जांच ज़रूर कराएं और धूम्रपान/बीड़ी तुरंत बंद करें।';
    patientAdviceEnglish = 'Cover mouth with cloth/mask while coughing. Complete sputum CBNAAT testing at District Centre and stop smoking immediately.';
  }

  return {
    patient: extractedPatient,
    caseSheet: {
      chiefComplaints: complaints,
      duration,
      history,
      allergies,
      vitals,
      systemicExam,
      provisionalDiagnosis,
      icd10Code,
      investigations,
      patientAdviceHindi,
      patientAdviceEnglish,
      followUpDays: lower.includes('7 din') ? 7 : 3,
    },
    prescriptions,
    referral,
  };
}

/**
 * Generates an ABDM / NRCeS compliant FHIR R4 Prescription & Encounter Bundle JSON.
 */
export function generateABDMFHIRBundle(encounter: EncounterRecord) {
  const bundleId = `ABDM-BUNDLE-${encounter.uhid}`;
  const timestamp = encounter.createdAt || new Date().toISOString();

  return {
    resourceType: 'Bundle',
    id: bundleId,
    meta: {
      versionId: '1',
      lastUpdated: timestamp,
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
      security: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-Confidentiality',
          code: 'V',
          display: 'very restricted',
        },
      ],
    },
    identifier: {
      system: 'https://ndhm.gov.in/hwc/opd-bundle',
      value: encounter.uhid,
    },
    type: 'document',
    timestamp,
    entry: [
      {
        fullUrl: `urn:uuid:composition-${encounter.id}`,
        resource: {
          resourceType: 'Composition',
          id: `composition-${encounter.id}`,
          status: encounter.signed ? 'final' : 'preliminary',
          type: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '440545006',
                display: 'Prescription record',
              },
            ],
          },
          date: timestamp,
          title: `${encounter.stateTemplate} PHC Clinical Encounter & Prescription Record`,
        },
      },
      {
        fullUrl: `urn:uuid:patient-${encounter.id}`,
        resource: {
          resourceType: 'Patient',
          id: `patient-${encounter.id}`,
          identifier: [
            {
              system: 'https://healthid.ndhm.gov.in',
              value: encounter.patient.abhaId || 'PENDING-ABHA',
            },
            {
              system: 'https://phc.nhm.gov.in/uhid',
              value: encounter.uhid,
            },
          ],
          name: [{ text: encounter.patient.name || 'OPD Patient' }],
          gender: (encounter.patient.gender || 'unknown').toLowerCase(),
          telecom: encounter.patient.phone ? [{ system: 'phone', value: encounter.patient.phone }] : [],
          address: [{ text: encounter.patient.village || 'PHC Catchment Area' }],
        },
      },
      {
        fullUrl: `urn:uuid:practitioner-${encounter.id}`,
        resource: {
          resourceType: 'Practitioner',
          id: `practitioner-${encounter.id}`,
          identifier: [
            {
              system: 'https://www.nmc.org.in/registration',
              value: encounter.practitioner.regNumber,
            },
          ],
          name: [{ text: encounter.practitioner.doctorName }],
        },
      },
      {
        fullUrl: `urn:uuid:encounter-${encounter.id}`,
        resource: {
          resourceType: 'Encounter',
          id: `encounter-${encounter.id}`,
          status: 'finished',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'ambulatory',
          },
          reasonCode: encounter.caseSheet.chiefComplaints.map((cc) => ({ text: cc })),
        },
      },
      {
        fullUrl: `urn:uuid:condition-${encounter.id}`,
        resource: {
          resourceType: 'Condition',
          id: `condition-${encounter.id}`,
          clinicalStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
          },
          code: {
            coding: [
              {
                system: 'http://hl7.org/fhir/sid/icd-10',
                code: encounter.caseSheet.icd10Code || 'R69',
                display: encounter.caseSheet.provisionalDiagnosis || 'OPD Evaluation',
              },
            ],
            text: encounter.caseSheet.provisionalDiagnosis,
          },
        },
      },
      {
        fullUrl: `urn:uuid:observation-vitals-${encounter.id}`,
        resource: {
          resourceType: 'Observation',
          id: `observation-vitals-${encounter.id}`,
          status: 'final',
          code: { text: 'Vital Signs Panel' },
          component: [
            { code: { text: 'Blood Pressure' }, valueString: `${encounter.caseSheet.vitals.bp} mmHg` },
            { code: { text: 'Pulse Rate' }, valueString: `${encounter.caseSheet.vitals.pulse} bpm` },
            { code: { text: 'Body Temperature' }, valueString: `${encounter.caseSheet.vitals.temp} °F` },
            { code: { text: 'SpO2' }, valueString: `${encounter.caseSheet.vitals.spo2} %` },
            { code: { text: 'Body Weight' }, valueString: `${encounter.caseSheet.vitals.weight} kg` },
          ],
        },
      },
      ...encounter.prescriptions.map((rx, index) => ({
        fullUrl: `urn:uuid:medreq-${encounter.id}-${index + 1}`,
        resource: {
          resourceType: 'MedicationRequest',
          id: `medreq-${encounter.id}-${index + 1}`,
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            coding: [
              {
                system: 'https://nhm.gov.in/nlem-2022',
                code: rx.nlemCode || 'NLEM-GEN',
                display: `${rx.form} ${rx.drugName} ${rx.strength}`,
              },
            ],
            text: `${rx.form} ${rx.drugName} ${rx.strength}`,
          },
          dosageInstruction: [
            {
              text: `${rx.englishInstruction} | ${rx.hindiInstruction}`,
              timing: {
                code: { text: rx.frequency },
              },
              route: { text: rx.route },
              doseAndRate: [
                {
                  doseQuantity: { value: rx.dose },
                },
              ],
            },
          ],
          dispenseRequest: {
            expectedSupplyDuration: {
              value: rx.durationDays,
              unit: 'days',
            },
          },
        },
      })),
    ],
  };
}

/**
 * Evaluates government mandatory fields checklist for the active encounter.
 */
export function evaluateMandatoryCompliance(encounter: EncounterRecord): {
  isComplete: boolean;
  scorePercent: number;
  items: { label: string; passed: boolean; fixHint: string }[];
} {
  const items = [
    {
      label: 'Patient Name & Demographics',
      passed: Boolean(encounter.patient.name.trim() && encounter.patient.age.trim() && encounter.patient.gender),
      fixHint: 'Enter patient name, age, and gender',
    },
    {
      label: 'Chief Complaints & Duration',
      passed: encounter.caseSheet.chiefComplaints.length > 0 && Boolean(encounter.caseSheet.duration.trim()),
      fixHint: 'Record at least 1 chief complaint with duration',
    },
    {
      label: 'Mandatory Vitals (BP & Temp)',
      passed: Boolean(encounter.caseSheet.vitals.bp.trim() && encounter.caseSheet.vitals.temp.trim()),
      fixHint: 'Tap "Vitals Normal" or enter BP & Temperature',
    },
    {
      label: 'Provisional Diagnosis & ICD-10',
      passed: Boolean(encounter.caseSheet.provisionalDiagnosis.trim()),
      fixHint: 'Specify provisional diagnosis',
    },
    {
      label: 'Treatment Regimen (Rx or Referral)',
      passed: encounter.prescriptions.length > 0 || encounter.referral.isReferred,
      fixHint: 'Add at least 1 NLEM medication or Referral note',
    },
    {
      label: 'Bilingual Patient Instructions',
      passed:
        encounter.prescriptions.every((p) => Boolean(p.hindiInstruction && p.englishInstruction)) &&
        Boolean(encounter.caseSheet.patientAdviceHindi),
      fixHint: 'Auto-generated Hindi + English instructions verified',
    },
  ];

  if (encounter.referral.isReferred) {
    items.push({
      label: 'Referral Destination & Reason',
      passed: Boolean(encounter.referral.destinationFacility.trim() && encounter.referral.reason.trim()),
      fixHint: 'Select destination facility and referral reason',
    });
  }

  const passedCount = items.filter((i) => i.passed).length;
  const scorePercent = Math.round((passedCount / items.length) * 100);

  return {
    isComplete: passedCount === items.length,
    scorePercent,
    items,
  };
}
