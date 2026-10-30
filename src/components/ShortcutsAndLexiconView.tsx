import React, { useState } from 'react';
import {
  BookOpenCheck,
  Check,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  CorrectionLogEntry,
  DoctorShortcut,
} from '../types/clinical';
import { DOMAIN_LEXICON_CORRECTIONS } from '../data/clinicalData';

interface ShortcutsAndLexiconViewProps {
  shortcuts: DoctorShortcut[];
  correctionLogs: CorrectionLogEntry[];
  onAddShortcut: (shortcut: DoctorShortcut) => void;
  onDeleteShortcut: (id: string) => void;
  onApplyShortcutToActiveEncounter: (shortcut: DoctorShortcut) => void;
  onPromoteCorrectionToShortcut: (log: CorrectionLogEntry) => void;
}

export const ShortcutsAndLexiconView: React.FC<ShortcutsAndLexiconViewProps> = ({
  shortcuts,
  correctionLogs,
  onAddShortcut,
  onDeleteShortcut,
  onApplyShortcutToActiveEncounter,
  onPromoteCorrectionToShortcut,
}) => {
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [hindiAlias, setHindiAlias] = useState('');
  const [category, setCategory] = useState<'regimen' | 'exam' | 'advice'>('regimen');
  const [description, setDescription] = useState('');
  const [expansionText, setExpansionText] = useState('');
  const [appliedBannerId, setAppliedBannerId] = useState<string | null>(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);

  const handleCreateShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerPhrase.trim() || !expansionText.trim()) return;

    const newSc: DoctorShortcut = {
      id: `sc-${Date.now()}`,
      triggerPhrase: triggerPhrase.trim(),
      hindiAlias: hindiAlias.trim() || 'कस्टम शॉर्टकट',
      category,
      description: description.trim() || 'Custom doctor voice macro expansion',
      expansionText: expansionText.trim(),
      usageCount: 1,
    };

    onAddShortcut(newSc);
    setTriggerPhrase('');
    setHindiAlias('');
    setDescription('');
    setExpansionText('');
  };

  const handleAcceptSuggestedPreset = () => {
    onAddShortcut({
      id: `sc-ncd-refill-${Date.now()}`,
      triggerPhrase: 'usual BP sugar refill',
      hindiAlias: 'बीपी और शुगर 30 दिन कोर्स',
      category: 'regimen',
      description: 'Standard 30-day NCD refill (Amlodipine 5mg OD + Metformin 500mg BD + Low-salt diet)',
      expansionText:
        'Tab Amlodipine 5 mg roz subah nashte ke baad 30 din, Tab Metformin 500 mg subah aur raat khane ke baad 30 din. Low salt and sugar-free diet.',
      usageCount: 12,
    });
    setDismissedSuggestion(true);
  };

  return (
    <div className="space-y-6">
      {/* On-Device Personalization Suggestion Banner */}
      {!dismissedSuggestion && (
        <div className="bg-white border border-teal-300 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800">
              <Sparkles className="w-4 h-4" />
              <span>On-Device Pattern Detected — Suggested Voice Shortcut</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">
              You frequently prescribe <strong>Tab Amlodipine 5 mg OD + Tab Metformin 500 mg BD (30 days)</strong> for NCD follow-up patients. Create voice shortcut <code>&quot;usual BP sugar refill&quot;</code>?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAcceptSuggestedPreset}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap"
            >
              Create Preset Shortcut
            </button>
            <button
              type="button"
              onClick={() => setDismissedSuggestion(true)}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Doctor Voice Shortcuts & Create Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Doctor-Specific Voice Shortcuts (&ldquo;My Shortcuts&rdquo;)
                </h2>
                <p className="text-xs text-slate-600">
                  When spoken during consultation, these phrases automatically expand into structured case sheet text and NLEM prescriptions.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {shortcuts.length} Active Macros
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {shortcuts.map((sc) => (
                <div key={sc.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        &ldquo;{sc.triggerPhrase}&rdquo;
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        · {sc.hindiAlias}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        · {sc.category} · Used {sc.usageCount}x
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800">{sc.description}</p>
                    <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-200">
                      → {sc.expansionText}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onApplyShortcutToActiveEncounter(sc);
                        setAppliedBannerId(sc.id);
                        setTimeout(() => setAppliedBannerId(null), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded transition-colors whitespace-nowrap"
                    >
                      {appliedBannerId === sc.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Applied to Patient
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          Insert in Active Case
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteShortcut(sc.id)}
                      title="Delete shortcut"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Custom Shortcut Form */}
          <form onSubmit={handleCreateShortcut} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-700" />
              <span>Add Custom Voice Shortcut / Regimen Macro</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Spoken Trigger Phrase *
                </label>
                <input
                  type="text"
                  required
                  value={triggerPhrase}
                  onChange={(e) => setTriggerPhrase(e.target.value)}
                  placeholder="e.g. anc normal"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hindi Label / Alias
                </label>
                <input
                  type="text"
                  value={hindiAlias}
                  onChange={(e) => setHindiAlias(e.target.value)}
                  placeholder="e.g. सामान्य गर्भवती जांच"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Section
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'regimen' | 'exam' | 'advice')}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-teal-700"
                >
                  <option value="regimen">Medication Regimen (Rx)</option>
                  <option value="exam">Systemic Examination</option>
                  <option value="advice">Patient Bilingual Advice</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Clinical Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Routine 2nd Trimester ANC IFA + Calcium supplementation"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expanded Clinical Text / Regimen *
              </label>
              <textarea
                rows={2}
                required
                value={expansionText}
                onChange={(e) => setExpansionText(e.target.value)}
                placeholder="e.g. Tab Iron & Folic Acid 100mg OD after food for 30 days, fetal heart sounds regular."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-teal-700"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors"
              >
                Save Voice Shortcut
              </button>
            </div>
          </form>
        </div>

        {/* Right: On-Device ASR/NLP Correction Feedback Log & Domain Lexicon (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-teal-700" />
                <span>On-Device Correction & Fine-Tuning Ledger</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Every manual edit made during Case Sheet or Prescription review logs an adaptation pair (<code className="font-mono">audio/text → doctor edit</code>) for local model ranking.
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {correctionLogs.map((log) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">{log.fieldCategory}</span>
                    <span className="font-mono">{log.timestamp}</span>
                  </div>
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2 space-y-1 font-mono">
                    <div className="text-red-700 line-through">Spoken: &ldquo;{log.originalSpoken}&rdquo;</div>
                    <div className="text-emerald-800 font-semibold">Adapted: &ldquo;{log.correctedOutput}&rdquo;</div>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] text-teal-800 font-medium">{log.status}</span>
                    <button
                      type="button"
                      onClick={() => onPromoteCorrectionToShortcut(log)}
                      className="text-[11px] font-semibold text-slate-700 hover:text-teal-700 underline"
                    >
                      Save as Shortcut
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Active Regional Phonetic Drug & Abbreviation Lexicon
            </h3>
            <p className="text-xs text-slate-600">
              Automatically normalizes code-mixed Hinglish drug brand pronunciations and clinical abbreviations before structuring.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {Object.entries(DOMAIN_LEXICON_CORRECTIONS).map(([k, v]) => (
                <div key={k} className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded flex items-center justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-900 font-semibold">→ {v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
