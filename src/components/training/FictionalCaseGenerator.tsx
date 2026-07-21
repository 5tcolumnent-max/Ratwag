import { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Briefcase,
  FileText,
  Shield,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Loader2,
  Trash2,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import {
  generateFictionalCaseFile,
  SYNTHETIC_BANNER,
  type FictionalCaseFile,
} from '../../services/fictionalCaseGenerator';
import {
  createCase,
  addEvidence,
  addCustodyEntry,
  type EvidenceType,
  type CustodyAction,
} from '../../services/caseService';

const EVIDENCE_TYPE_ICON: Record<string, typeof FileText> = {
  document: FileText,
  photo: FileText,
  video: FileText,
  audio: FileText,
  physical: FileText,
  digital: FileText,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function FictionalCaseGenerator() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [generated, setGenerated] = useState<FictionalCaseFile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setError(null);
    setSavedCaseId(null);
    setSavedMessage(null);
    setTimeout(() => {
      setGenerated(generateFictionalCaseFile());
      setGenerating(false);
    }, 400);
  };

  const handleSaveToCases = async () => {
    if (!generated || !userId) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const newCase = await createCase(userId, {
        case_number: generated.case.caseNumber,
        title: generated.case.title,
        status: generated.case.status,
        classification: generated.case.classification,
        summary: generated.case.summary,
      });
      if (!newCase) throw new Error('Failed to create case');
      setSavedCaseId(newCase.id);

      for (const e of generated.evidence) {
        const item = await addEvidence(userId, {
          case_id: newCase.id,
          item_number: e.item.itemNumber,
          title: e.item.title,
          description: e.item.description,
          evidence_type: e.item.evidenceType as EvidenceType,
          collection_method: e.item.collectionMethod,
          collected_at: e.item.collectedAt,
          collected_by: e.item.collectedBy,
          storage_location: e.item.storageLocation,
          hash_sha256: e.item.hashSha256,
        });
        if (!item) continue;
        for (const c of e.custody) {
          await addCustodyEntry(userId, {
            evidence_id: item.id,
            from_holder: c.fromHolder,
            to_holder: c.toHolder,
            action: c.action as CustodyAction,
            reason: c.reason,
            occurred_at: c.occurredAt,
          });
        }
      }
      setSavedMessage(`Saved to Case Management as ${generated.case.caseNumber}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save case');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Fictional Case Generator
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate synthetic case files for training and demonstration of the case-management workflow.
        </p>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-700/40 bg-amber-900/20 text-amber-200 text-xs">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{SYNTHETIC_BANNER}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generated ? 'Generate New File' : 'Generate Fictional Case'}
        </button>
        {generated && !savedCaseId && (
          <button
            onClick={handleSaveToCases}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Save to Case Management
          </button>
        )}
        {savedCaseId && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-700/40 bg-emerald-900/20 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {savedMessage}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-700/40 bg-red-900/20 text-red-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {generated && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-amber-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-amber-700/40 bg-amber-900/30 text-amber-300">
                SYNTHETIC
              </span>
              <span className="text-[10px] font-mono text-slate-500">{generated.case.caseNumber}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-700/40 text-slate-400">
                {generated.case.classification}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-700/40 text-slate-400">
                {generated.case.status.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">{generated.case.title}</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{generated.case.summary}</p>
            <p className="text-[10px] text-slate-600 mt-2 font-mono">Opened {formatDate(generated.case.openedAt)}</p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-sky-400" />
              Synthetic Evidence ({generated.evidence.length})
            </h3>
            <div className="space-y-2">
              {generated.evidence.map(({ item, custody }, i) => {
                const Icon = EVIDENCE_TYPE_ICON[item.evidenceType] || FileText;
                return (
                  <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-800/60 text-amber-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-500">{item.itemNumber}</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-700/40 text-slate-400">
                            {item.evidenceType}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-0.5">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <p className="text-[10px] text-slate-600 font-mono">By: {item.collectedBy}</p>
                          <p className="text-[10px] text-slate-600 font-mono">At: {formatDate(item.collectedAt)}</p>
                          <p className="text-[10px] text-slate-600 font-mono">Method: {item.collectionMethod}</p>
                          <p className="text-[10px] text-slate-600 font-mono">Storage: {item.storageLocation}</p>
                        </div>
                        {item.hashSha256 && (
                          <p className="text-[10px] text-slate-700 font-mono mt-1 truncate">SHA-256: {item.hashSha256.slice(0, 32)}…</p>
                        )}

                        <div className="mt-3 border-t border-slate-800/40 pt-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-1.5">
                            <ScrollText className="w-3 h-3" />
                            Chain of Custody ({custody.length})
                          </p>
                          <div className="space-y-1">
                            {custody.map((c, j) => (
                              <div key={j} className="flex items-start gap-2 text-[10px] font-mono py-1 px-2 rounded bg-slate-950/60 border border-slate-800/40">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-amber-300 font-bold uppercase">{c.action}</span>
                                    <span className="text-slate-600">{formatDate(c.occurredAt)}</span>
                                  </div>
                                  <p className="text-slate-400 mt-0.5">
                                    {c.fromHolder || '—'} → {c.toHolder || '—'}
                                  </p>
                                  {c.reason && <p className="text-slate-500 mt-0.5">{c.reason}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!savedCaseId && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-sky-700/30 bg-sky-900/10 text-sky-300 text-xs">
              <Briefcase className="w-4 h-4 shrink-0" />
              <span>Save this fictional case to Case Management to practice the full workflow with real CRUD operations.</span>
            </div>
          )}
        </div>
      )}

      {!generated && !generating && (
        <div className="text-center py-16 border border-dashed border-slate-700/50 rounded-2xl">
          <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No fictional case generated yet</p>
          <p className="text-xs text-slate-600 mt-1">Click "Generate Fictional Case" to create synthetic training data.</p>
        </div>
      )}
    </div>
  );
}
