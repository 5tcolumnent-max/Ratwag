import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  ChevronRight,
  ChevronLeft,
  Trash2,
  FileText,
  Camera,
  Video,
  Volume2,
  Package,
  HardDrive,
  Shield,
  Clock,
  MapPin,
  User,
  Hash,
  Loader2,
  AlertTriangle,
  X,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import {
  fetchCases,
  createCase,
  updateCase,
  deleteCase,
  fetchEvidence,
  addEvidence,
  deleteEvidence,
  fetchCustody,
  addCustodyEntry,
  STATUS_LABELS,
  STATUS_STYLES,
  CLASSIFICATION_STYLES,
  CHAIN_STATUS_STYLES,
  type CaseRow,
  type EvidenceItemRow,
  type ChainOfCustodyRow,
  type CaseStatus,
  type CaseClassification,
  type EvidenceType,
  type CustodyAction,
} from '../../services/caseService';

const EVIDENCE_TYPE_META: Record<EvidenceType, { icon: typeof FileText; color: string; label: string }> = {
  document: { icon: FileText, color: 'text-blue-400', label: 'Document' },
  photo: { icon: Camera, color: 'text-emerald-400', label: 'Photo' },
  video: { icon: Video, color: 'text-violet-400', label: 'Video' },
  audio: { icon: Volume2, color: 'text-amber-400', label: 'Audio' },
  physical: { icon: Package, color: 'text-orange-400', label: 'Physical' },
  digital: { icon: HardDrive, color: 'text-cyan-400', label: 'Digital' },
};

const CUSTODY_ACTIONS: CustodyAction[] = ['collected', 'transferred', 'viewed', 'released', 'returned', 'destroyed'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CaseManagement() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCase, setShowNewCase] = useState(false);
  const [showNewEvidence, setShowNewEvidence] = useState(false);
  const [custodyMap, setCustodyMap] = useState<Record<string, ChainOfCustodyRow[]>>({});
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [showCustodyForm, setShowCustodyForm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCases(userId);
      setCases(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const loadEvidence = useCallback(async (caseId: string) => {
    try {
      const data = await fetchEvidence(caseId);
      setEvidence(data);
      const custodyEntries: Record<string, ChainOfCustodyRow[]> = {};
      for (const item of data) {
        custodyEntries[item.id] = await fetchCustody(item.id);
      }
      setCustodyMap(custodyEntries);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load evidence');
    }
  }, []);

  const handleSelectCase = (c: CaseRow) => {
    setSelectedCase(c);
    setExpandedEvidence(null);
    setShowCustodyForm(null);
    loadEvidence(c.id);
  };

  const handleBack = () => {
    setSelectedCase(null);
    setEvidence([]);
    setCustodyMap({});
  };

  const handleCreateCase = async (input: {
    case_number: string;
    title: string;
    classification: CaseClassification;
    summary: string;
  }) => {
    try {
      const newCase = await createCase(userId, input);
      if (newCase) {
        setCases(prev => [newCase, ...prev]);
        setShowNewCase(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create case');
    }
  };

  const handleStatusChange = async (caseId: string, status: CaseStatus) => {
    try {
      const closed_at = status === 'closed' || status === 'archived' ? new Date().toISOString() : null;
      await updateCase(caseId, { status, closed_at });
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status, closed_at } : c));
      if (selectedCase?.id === caseId) setSelectedCase({ ...selectedCase, status, closed_at });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update case');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('Delete this case and all its evidence? This cannot be undone.')) return;
    try {
      await deleteCase(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
      if (selectedCase?.id === caseId) handleBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete case');
    }
  };

  const handleAddEvidence = async (input: Omit<Parameters<typeof addEvidence>[1], 'case_id'>) => {
    if (!selectedCase) return;
    try {
      const item = await addEvidence(userId, { ...input, case_id: selectedCase.id });
      if (item) {
        setEvidence(prev => [...prev, item]);
        setCustodyMap(prev => ({ ...prev, [item.id]: [] }));
        setShowNewEvidence(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add evidence');
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('Delete this evidence item and its chain of custody?')) return;
    try {
      await deleteEvidence(evidenceId);
      setEvidence(prev => prev.filter(e => e.id !== evidenceId));
      setCustodyMap(prev => {
        const next = { ...prev };
        delete next[evidenceId];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete evidence');
    }
  };

  const handleAddCustody = async (evidenceId: string, input: {
    from_holder: string;
    to_holder: string;
    action: CustodyAction;
    reason: string;
  }) => {
    try {
      await addCustodyEntry(userId, { ...input, evidence_id: evidenceId });
      const entries = await fetchCustody(evidenceId);
      setCustodyMap(prev => ({ ...prev, [evidenceId]: entries }));
      setShowCustodyForm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add custody entry');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-700/40 bg-red-900/20 text-red-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!selectedCase ? (
        <CaseList
          cases={cases}
          onCreate={() => setShowNewCase(true)}
          onSelect={handleSelectCase}
          onDelete={handleDeleteCase}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <CaseDetail
          caseRow={selectedCase}
          evidence={evidence}
          custodyMap={custodyMap}
          expandedEvidence={expandedEvidence}
          showCustodyForm={showCustodyForm}
          onBack={handleBack}
          onAddEvidence={() => setShowNewEvidence(true)}
          onDeleteEvidence={handleDeleteEvidence}
          onToggleEvidence={(id) => setExpandedEvidence(prev => prev === id ? null : id)}
          onShowCustodyForm={(id) => setShowCustodyForm(id)}
          onAddCustody={handleAddCustody}
          onStatusChange={handleStatusChange}
        />
      )}

      {showNewCase && (
        <NewCaseModal onClose={() => setShowNewCase(false)} onCreate={handleCreateCase} />
      )}
      {showNewEvidence && selectedCase && (
        <NewEvidenceModal onClose={() => setShowNewEvidence(false)} onAdd={handleAddEvidence} />
      )}
    </div>
  );
}

function CaseList({
  cases,
  onCreate,
  onSelect,
  onDelete,
  onStatusChange,
}: {
  cases: CaseRow[];
  onCreate: () => void;
  onSelect: (c: CaseRow) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: CaseStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-400" />
            Active Cases
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize lawfully-obtained evidence with chain-of-custody tracking.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Case
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700/50 rounded-2xl">
          <Briefcase className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No cases yet</p>
          <p className="text-xs text-slate-600 mt-1">Create a case to begin organizing evidence.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {cases.map(c => (
            <div
              key={c.id}
              className="group bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4 hover:border-slate-600/60 transition-all"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onSelect(c)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500">{c.case_number}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_STYLES[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${CLASSIFICATION_STYLES[c.classification]}`}>
                      {c.classification}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                    {c.title}
                  </h3>
                  {c.summary && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.summary}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">
                    Opened {formatDate(c.opened_at)}
                  </p>
                </button>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <select
                    value={c.status}
                    onChange={(e) => onStatusChange(c.id, e.target.value as CaseStatus)}
                    className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
                  >
                    {(Object.keys(STATUS_LABELS) as CaseStatus[]).map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="p-1.5 rounded-lg border border-slate-700/40 text-slate-600 hover:text-red-400 hover:border-red-700/40 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaseDetail({
  caseRow,
  evidence,
  custodyMap,
  expandedEvidence,
  showCustodyForm,
  onBack,
  onAddEvidence,
  onDeleteEvidence,
  onToggleEvidence,
  onShowCustodyForm,
  onAddCustody,
  onStatusChange,
}: {
  caseRow: CaseRow;
  evidence: EvidenceItemRow[];
  custodyMap: Record<string, ChainOfCustodyRow[]>;
  expandedEvidence: string | null;
  showCustodyForm: string | null;
  onBack: () => void;
  onAddEvidence: () => void;
  onDeleteEvidence: (id: string) => void;
  onToggleEvidence: (id: string) => void;
  onShowCustodyForm: (id: string) => void;
  onAddCustody: (evidenceId: string, input: { from_holder: string; to_holder: string; action: CustodyAction; reason: string }) => void;
  onStatusChange: (id: string, status: CaseStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Cases
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-slate-500">{caseRow.case_number}</span>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_STYLES[caseRow.status]}`}>
              {STATUS_LABELS[caseRow.status]}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${CLASSIFICATION_STYLES[caseRow.classification]}`}>
              {caseRow.classification}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white truncate mt-0.5">{caseRow.title}</h2>
        </div>
        <select
          value={caseRow.status}
          onChange={(e) => onStatusChange(caseRow.id, e.target.value as CaseStatus)}
          className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
        >
          {(Object.keys(STATUS_LABELS) as CaseStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {caseRow.summary && (
        <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-400 leading-relaxed">{caseRow.summary}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-400" />
          Evidence Inventory
          <span className="text-[10px] font-mono text-slate-500">({evidence.length})</span>
        </h3>
        <button
          onClick={onAddEvidence}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Evidence
        </button>
      </div>

      {evidence.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-700/50 rounded-2xl">
          <FileText className="w-6 h-6 text-slate-700 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No evidence logged yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evidence.map(item => {
            const meta = EVIDENCE_TYPE_META[item.evidence_type];
            const Icon = meta.icon;
            const isExpanded = expandedEvidence === item.id;
            const custody = custodyMap[item.id] ?? [];
            return (
              <div key={item.id} className="bg-slate-900/40 border border-slate-700/40 rounded-xl overflow-hidden">
                <button
                  onClick={() => onToggleEvidence(item.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/30 transition-colors"
                >
                  <div className={`p-2 rounded-lg bg-slate-800/60 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-500">{item.item_number}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${CHAIN_STATUS_STYLES[item.chain_status]}`}>
                        {item.chain_status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    {item.description && (
                      <p className="text-xs text-slate-400 leading-relaxed pl-11">{item.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pl-11">
                      <DetailField icon={User} label="Collected by" value={item.collected_by || '—'} />
                      <DetailField icon={Clock} label="Collected at" value={formatDate(item.collected_at)} />
                      <DetailField icon={MapPin} label="Storage" value={item.storage_location || '—'} />
                      <DetailField icon={Hash} label="SHA-256" value={item.hash_sha256 ? item.hash_sha256.slice(0, 16) + '…' : '—'} />
                    </div>
                    {item.collection_method && (
                      <div className="pl-11">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Collection Method</p>
                        <p className="text-xs text-slate-400">{item.collection_method}</p>
                      </div>
                    )}

                    <div className="pl-11 border-t border-slate-800/40 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                          <ScrollText className="w-3 h-3" />
                          Chain of Custody ({custody.length})
                        </p>
                        <button
                          onClick={() => onShowCustodyForm(item.id)}
                          className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          + Add Entry
                        </button>
                      </div>
                      {custody.length === 0 ? (
                        <p className="text-[10px] text-slate-600">No custody entries recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {custody.map(entry => (
                            <div key={entry.id} className="flex items-start gap-2 text-[10px] font-mono py-1.5 px-2 rounded bg-slate-950/60 border border-slate-800/40">
                              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sky-300 font-bold uppercase">{entry.action}</span>
                                  <span className="text-slate-600">{formatDate(entry.occurred_at)}</span>
                                </div>
                                <p className="text-slate-400 mt-0.5">
                                  {entry.from_holder || '—'} → {entry.to_holder || '—'}
                                </p>
                                {entry.reason && <p className="text-slate-500 mt-0.5">{entry.reason}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {showCustodyForm === item.id && (
                      <CustodyForm
                        onSubmit={(input) => onAddCustody(item.id, input)}
                        onCancel={() => onShowCustodyForm('')}
                      />
                    )}

                    <div className="pl-11 pt-2">
                      <button
                        onClick={() => onDeleteEvidence(item.id)}
                        className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-red-400 font-medium transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete evidence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailField({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-0.5 flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" />
        {label}
      </p>
      <p className="text-xs text-slate-300 font-mono truncate">{value}</p>
    </div>
  );
}

function NewCaseModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (input: { case_number: string; title: string; classification: CaseClassification; summary: string }) => void;
}) {
  const [caseNumber, setCaseNumber] = useState('');
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState<CaseClassification>('unclassified');
  const [summary, setSummary] = useState('');

  const valid = caseNumber.trim() && title.trim();

  return (
    <ModalShell onClose={onClose} title="New Case">
      <div className="space-y-3">
        <Field label="Case Number *">
          <input
            className="modal-input"
            placeholder="e.g. CASE-2026-001"
            value={caseNumber}
            onChange={e => setCaseNumber(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Title *">
          <input
            className="modal-input"
            placeholder="Short case title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Classification">
          <select
            className="modal-input"
            value={classification}
            onChange={e => setClassification(e.target.value as CaseClassification)}
          >
            <option value="unclassified">Unclassified</option>
            <option value="restricted">Restricted</option>
            <option value="confidential">Confidential</option>
          </select>
        </Field>
        <Field label="Summary">
          <textarea
            className="modal-input resize-none"
            rows={3}
            placeholder="Brief case summary…"
            value={summary}
            onChange={e => setSummary(e.target.value)}
          />
        </Field>
        <ModalActions onClose={onClose} onSubmit={() => valid && onCreate({ case_number: caseNumber.trim(), title: title.trim(), classification, summary: summary.trim() })} valid={valid} />
      </div>
    </ModalShell>
  );
}

function NewEvidenceModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (input: Omit<Parameters<typeof addEvidence>[1], 'case_id'>) => void;
}) {
  const [itemNumber, setItemNumber] = useState('');
  const [title, setTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  const [description, setDescription] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('');
  const [collectedBy, setCollectedBy] = useState('');
  const [storageLocation, setStorageLocation] = useState('');

  const valid = itemNumber.trim() && title.trim();

  return (
    <ModalShell onClose={onClose} title="Add Evidence Item">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Item Number *">
            <input className="modal-input" placeholder="EX-001" value={itemNumber} onChange={e => setItemNumber(e.target.value)} autoFocus />
          </Field>
          <Field label="Type">
            <select className="modal-input" value={evidenceType} onChange={e => setEvidenceType(e.target.value as EvidenceType)}>
              {(Object.keys(EVIDENCE_TYPE_META) as EvidenceType[]).map(t => (
                <option key={t} value={t}>{EVIDENCE_TYPE_META[t].label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Title *">
          <input className="modal-input" placeholder="Evidence title" value={title} onChange={e => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="modal-input resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        <Field label="Collection Method (how lawfully obtained)">
          <input className="modal-input" placeholder="e.g. Search warrant #2026-0417" value={collectionMethod} onChange={e => setCollectionMethod(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Collected By">
            <input className="modal-input" placeholder="Officer name" value={collectedBy} onChange={e => setCollectedBy(e.target.value)} />
          </Field>
          <Field label="Storage Location">
            <input className="modal-input" placeholder="Evidence locker #" value={storageLocation} onChange={e => setStorageLocation(e.target.value)} />
          </Field>
        </div>
        <ModalActions onClose={onClose} onSubmit={() => valid && onAdd({
          item_number: itemNumber.trim(),
          title: title.trim(),
          evidence_type: evidenceType,
          description: description.trim(),
          collection_method: collectionMethod.trim(),
          collected_by: collectedBy.trim(),
          storage_location: storageLocation.trim(),
        })} valid={valid} />
      </div>
    </ModalShell>
  );
}

function CustodyForm({ onSubmit, onCancel }: {
  onSubmit: (input: { from_holder: string; to_holder: string; action: CustodyAction; reason: string }) => void;
  onCancel: () => void;
}) {
  const [fromHolder, setFromHolder] = useState('');
  const [toHolder, setToHolder] = useState('');
  const [action, setAction] = useState<CustodyAction>('transferred');
  const [reason, setReason] = useState('');

  const valid = fromHolder.trim() || toHolder.trim();

  return (
    <div className="mt-2 p-3 rounded-xl border border-slate-700/40 bg-slate-950/60 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">New Custody Entry</p>
      <div className="grid grid-cols-2 gap-2">
        <input className="modal-input" placeholder="From holder" value={fromHolder} onChange={e => setFromHolder(e.target.value)} />
        <input className="modal-input" placeholder="To holder" value={toHolder} onChange={e => setToHolder(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="modal-input" value={action} onChange={e => setAction(e.target.value as CustodyAction)}>
          {CUSTODY_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className="modal-input" placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-slate-700/40 text-slate-400 text-xs hover:text-slate-200">Cancel</button>
        <button
          onClick={() => valid && onSubmit({ from_holder: fromHolder.trim(), to_holder: toHolder.trim(), action, reason: reason.trim() })}
          disabled={!valid}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold"
        >
          Add Entry
        </button>
      </div>
    </div>
  );
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onClose, onSubmit, valid }: { onClose: () => void; onSubmit: () => void; valid: boolean }) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700/40 text-slate-400 text-xs font-medium hover:text-slate-200">Cancel</button>
      <button
        onClick={onSubmit}
        disabled={!valid}
        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold active:scale-95 transition-all"
      >
        Create
      </button>
    </div>
  );
}
