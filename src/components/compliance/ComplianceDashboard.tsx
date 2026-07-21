import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  Shield,
  User,
  Calendar,
  Wrench,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import {
  fetchFindings,
  createFinding,
  updateFinding,
  deleteFinding,
  fetchActions,
  createAction,
  updateAction,
  deleteAction,
  FINDING_STATUS_LABELS,
  FINDING_STATUS_STYLES,
  FINDING_SEVERITY_STYLES,
  ACTION_STATUS_LABELS,
  ACTION_STATUS_STYLES,
  type FindingRow,
  type CorrectiveActionRow,
  type FindingStatus,
  type FindingSeverity,
  type ActionStatus,
} from '../../services/complianceService';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function isOverdue(dueDate: string | null, status: ActionStatus): boolean {
  if (!dueDate || status === 'completed' || status === 'verified') return false;
  return new Date(dueDate).getTime() < Date.now();
}

export default function ComplianceDashboard() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<FindingRow | null>(null);
  const [actions, setActions] = useState<CorrectiveActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewFinding, setShowNewFinding] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<FindingSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FindingStatus | 'all'>('all');

  const loadFindings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFindings(userId);
      setFindings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadFindings(); }, [loadFindings]);

  const loadActions = useCallback(async (findingId: string) => {
    try {
      const data = await fetchActions(findingId);
      setActions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load actions');
    }
  }, []);

  const handleSelectFinding = (f: FindingRow) => {
    setSelectedFinding(f);
    setShowActionForm(false);
    loadActions(f.id);
  };

  const handleBack = () => {
    setSelectedFinding(null);
    setActions([]);
  };

  const handleCreateFinding = async (input: Parameters<typeof createFinding>[1]) => {
    try {
      const newFinding = await createFinding(userId, input);
      if (newFinding) {
        setFindings(prev => [newFinding, ...prev]);
        setShowNewFinding(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create finding');
    }
  };

  const handleStatusChange = async (findingId: string, status: FindingStatus) => {
    try {
      await updateFinding(findingId, { status });
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, status } : f));
      if (selectedFinding?.id === findingId) setSelectedFinding({ ...selectedFinding, status });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update finding');
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    if (!confirm('Delete this finding and all its corrective actions?')) return;
    try {
      await deleteFinding(findingId);
      setFindings(prev => prev.filter(f => f.id !== findingId));
      if (selectedFinding?.id === findingId) handleBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete finding');
    }
  };

  const handleCreateAction = async (input: Omit<Parameters<typeof createAction>[1], 'finding_id'>) => {
    if (!selectedFinding) return;
    try {
      const newAction = await createAction(userId, { ...input, finding_id: selectedFinding.id });
      if (newAction) {
        setActions(prev => [...prev, newAction]);
        setShowActionForm(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create action');
    }
  };

  const handleActionStatusChange = async (actionId: string, status: ActionStatus) => {
    try {
      const completed_at = status === 'completed' || status === 'verified' ? new Date().toISOString() : null;
      await updateAction(actionId, { status, completed_at });
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, status, completed_at } : a));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update action');
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Delete this corrective action?')) return;
    try {
      await deleteAction(actionId);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete action');
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

      {!selectedFinding ? (
        <FindingList
          findings={findings}
          filterSeverity={filterSeverity}
          filterStatus={filterStatus}
          onFilterSeverity={setFilterSeverity}
          onFilterStatus={setFilterStatus}
          onCreate={() => setShowNewFinding(true)}
          onSelect={handleSelectFinding}
          onDelete={handleDeleteFinding}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <FindingDetail
          finding={selectedFinding}
          actions={actions}
          showActionForm={showActionForm}
          onBack={handleBack}
          onShowActionForm={() => setShowActionForm(true)}
          onCreateAction={handleCreateAction}
          onActionStatusChange={handleActionStatusChange}
          onDeleteAction={handleDeleteAction}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteFinding}
        />
      )}

      {showNewFinding && (
        <NewFindingModal onClose={() => setShowNewFinding(false)} onCreate={handleCreateFinding} />
      )}
    </div>
  );
}

function FindingList({
  findings,
  filterSeverity,
  filterStatus,
  onFilterSeverity,
  onFilterStatus,
  onCreate,
  onSelect,
  onDelete,
  onStatusChange,
}: {
  findings: FindingRow[];
  filterSeverity: FindingSeverity | 'all';
  filterStatus: FindingStatus | 'all';
  onFilterSeverity: (s: FindingSeverity | 'all') => void;
  onFilterStatus: (s: FindingStatus | 'all') => void;
  onCreate: () => void;
  onSelect: (f: FindingRow) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: FindingStatus) => void;
}) {
  const filtered = findings.filter(f => {
    const ms = filterStatus === 'all' || f.status === filterStatus;
    const mv = filterSeverity === 'all' || f.severity === filterSeverity;
    return ms && mv;
  });

  const counts: Record<FindingStatus, number> = {
    open: findings.filter(f => f.status === 'open').length,
    in_review: findings.filter(f => f.status === 'in_review').length,
    remediated: findings.filter(f => f.status === 'remediated').length,
    accepted: findings.filter(f => f.status === 'accepted').length,
    closed: findings.filter(f => f.status === 'closed').length,
  };

  const openCritical = findings.filter(f => f.severity === 'critical' && (f.status === 'open' || f.status === 'in_review')).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-sky-400" />
            Compliance Findings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track audit findings, assign severity, and manage corrective actions.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Finding
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(FINDING_STATUS_LABELS) as FindingStatus[]).map(s => (
          <button
            key={s}
            onClick={() => onFilterStatus(filterStatus === s ? 'all' : s)}
            className={`bg-slate-800/20 border rounded-xl p-2.5 transition-all text-left ${filterStatus === s ? 'border-slate-500/50 bg-slate-800/40' : 'border-slate-700/30 hover:border-slate-600/40'}`}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{FINDING_STATUS_LABELS[s]}</span>
            <p className="text-base font-bold font-mono text-slate-300 mt-0.5">{counts[s]}</p>
          </button>
        ))}
      </div>

      {openCritical > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-700/40 bg-red-900/20 text-red-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
          <span>{openCritical} critical finding{openCritical !== 1 ? 's' : ''} still open or in review</span>
        </div>
      )}

      <div className="flex gap-2">
        <select
          className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono focus:outline-none"
          value={filterSeverity}
          onChange={e => onFilterSeverity(e.target.value as FindingSeverity | 'all')}
        >
          <option value="all">all severities</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700/50 rounded-2xl">
          <ClipboardCheck className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No findings {filterStatus !== 'all' || filterSeverity !== 'all' ? 'match filters' : 'logged yet'}</p>
          <p className="text-xs text-slate-600 mt-1">Log a compliance finding to begin tracking.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(f => (
            <div
              key={f.id}
              className="group bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4 hover:border-slate-600/60 transition-all"
            >
              <div className="flex items-start gap-3">
                <button onClick={() => onSelect(f)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-sky-400 font-bold">{f.control_id}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${FINDING_SEVERITY_STYLES[f.severity]}`}>
                      {f.severity}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${FINDING_STATUS_STYLES[f.status]}`}>
                      {FINDING_STATUS_LABELS[f.status]}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                    {f.title}
                  </h3>
                  {f.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{f.description}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">
                    Identified {formatDate(f.identified_at)}
                    {f.reviewer && ` · Reviewer: ${f.reviewer}`}
                  </p>
                </button>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <select
                    value={f.status}
                    onChange={(e) => onStatusChange(f.id, e.target.value as FindingStatus)}
                    className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
                  >
                    {(Object.keys(FINDING_STATUS_LABELS) as FindingStatus[]).map(s => (
                      <option key={s} value={s}>{FINDING_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onDelete(f.id)}
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

function FindingDetail({
  finding,
  actions,
  showActionForm,
  onBack,
  onShowActionForm,
  onCreateAction,
  onActionStatusChange,
  onDeleteAction,
  onStatusChange,
  onDelete,
}: {
  finding: FindingRow;
  actions: CorrectiveActionRow[];
  showActionForm: boolean;
  onBack: () => void;
  onShowActionForm: () => void;
  onCreateAction: (input: Omit<Parameters<typeof createAction>[1], 'finding_id'>) => void;
  onActionStatusChange: (id: string, status: ActionStatus) => void;
  onDeleteAction: (id: string) => void;
  onStatusChange: (id: string, status: FindingStatus) => void;
  onDelete: (id: string) => void;
}) {
  const completedActions = actions.filter(a => a.status === 'completed' || a.status === 'verified').length;
  const overdueActions = actions.filter(a => isOverdue(a.due_date, a.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Findings
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-sky-400 font-bold">{finding.control_id}</span>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${FINDING_SEVERITY_STYLES[finding.severity]}`}>
              {finding.severity}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${FINDING_STATUS_STYLES[finding.status]}`}>
              {FINDING_STATUS_LABELS[finding.status]}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white truncate mt-0.5">{finding.title}</h2>
        </div>
        <select
          value={finding.status}
          onChange={(e) => onStatusChange(finding.id, e.target.value as FindingStatus)}
          className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
        >
          {(Object.keys(FINDING_STATUS_LABELS) as FindingStatus[]).map(s => (
            <option key={s} value={s}>{FINDING_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
        {finding.description && (
          <p className="text-xs text-slate-400 leading-relaxed">{finding.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
          <DetailField icon={Shield} label="Control" value={finding.control_id} />
          <DetailField icon={User} label="Reviewer" value={finding.reviewer || '—'} />
          <DetailField icon={Calendar} label="Identified" value={formatDate(finding.identified_at)} />
          <DetailField icon={ClipboardCheck} label="Family" value={finding.control_family || '—'} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Wrench className="w-4 h-4 text-sky-400" />
          Corrective Actions
          <span className="text-[10px] font-mono text-slate-500">({actions.length})</span>
          {completedActions > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              {completedActions} done
            </span>
          )}
          {overdueActions > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <Clock className="w-3 h-3" />
              {overdueActions} overdue
            </span>
          )}
        </h3>
        <button
          onClick={onShowActionForm}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Action
        </button>
      </div>

      {showActionForm && (
        <ActionForm onSubmit={onCreateAction} onCancel={() => onShowActionForm()} />
      )}

      {actions.length === 0 && !showActionForm ? (
        <div className="text-center py-8 border border-dashed border-slate-700/50 rounded-2xl">
          <Wrench className="w-6 h-6 text-slate-700 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No corrective actions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map(a => {
            const overdue = isOverdue(a.due_date, a.status);
            return (
              <div key={a.id} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/60 text-sky-400 shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{a.title}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${ACTION_STATUS_STYLES[a.status]}`}>
                        {ACTION_STATUS_LABELS[a.status]}
                      </span>
                      {overdue && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-red-700/40 bg-red-900/30 text-red-300">
                          <Clock className="w-2.5 h-2.5" />
                          overdue
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-slate-400 mt-1">{a.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-600 font-mono">
                      {a.owner && <span>Owner: {a.owner}</span>}
                      <span>Due: {formatDate(a.due_date)}</span>
                      {a.completed_at && <span className="text-emerald-500">Done: {formatDate(a.completed_at)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <select
                      value={a.status}
                      onChange={(e) => onActionStatusChange(a.id, e.target.value as ActionStatus)}
                      className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
                    >
                      {(Object.keys(ACTION_STATUS_LABELS) as ActionStatus[]).map(s => (
                        <option key={s} value={s}>{ACTION_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => onDeleteAction(a.id)}
                      className="p-1.5 rounded-lg border border-slate-700/40 text-slate-600 hover:text-red-400 hover:border-red-700/40 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={() => onDelete(finding.id)}
          className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-red-400 font-medium transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete finding
        </button>
      </div>
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

function NewFindingModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (input: Parameters<typeof createFinding>[1]) => void;
}) {
  const [controlId, setControlId] = useState('');
  const [controlFamily, setControlFamily] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<FindingSeverity>('medium');
  const [reviewer, setReviewer] = useState('');

  const valid = controlId.trim() && title.trim();

  return (
    <ModalShell onClose={onClose} title="New Compliance Finding">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Control ID *">
            <input className="modal-input" placeholder="e.g. AU-6" value={controlId} onChange={e => setControlId(e.target.value)} autoFocus />
          </Field>
          <Field label="Control Family">
            <input className="modal-input" placeholder="e.g. Audit & Accountability" value={controlFamily} onChange={e => setControlFamily(e.target.value)} />
          </Field>
        </div>
        <Field label="Title *">
          <input className="modal-input" placeholder="Finding title" value={title} onChange={e => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="modal-input resize-none" rows={3} placeholder="Detailed description…" value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Severity">
            <select className="modal-input" value={severity} onChange={e => setSeverity(e.target.value as FindingSeverity)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
          <Field label="Reviewer">
            <input className="modal-input" placeholder="Assigned reviewer" value={reviewer} onChange={e => setReviewer(e.target.value)} />
          </Field>
        </div>
        <ModalActions onClose={onClose} onSubmit={() => valid && onCreate({
          control_id: controlId.trim(),
          control_family: controlFamily.trim(),
          title: title.trim(),
          description: description.trim(),
          severity,
          reviewer: reviewer.trim(),
        })} valid={valid} />
      </div>
    </ModalShell>
  );
}

function ActionForm({ onSubmit, onCancel }: {
  onSubmit: (input: Omit<Parameters<typeof createAction>[1], 'finding_id'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');

  const valid = title.trim();

  return (
    <div className="p-4 rounded-xl border border-slate-700/40 bg-slate-950/60 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
        <Wrench className="w-3 h-3" />
        New Corrective Action
      </p>
      <Field label="Title *">
        <input className="modal-input" placeholder="Action title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label="Description">
        <textarea className="modal-input resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner">
          <input className="modal-input" placeholder="Responsible person" value={owner} onChange={e => setOwner(e.target.value)} />
        </Field>
        <Field label="Due Date">
          <input type="datetime-local" className="modal-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-slate-700/40 text-slate-400 text-xs hover:text-slate-200">Cancel</button>
        <button
          onClick={() => valid && onSubmit({
            title: title.trim(),
            description: description.trim(),
            owner: owner.trim(),
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
          })}
          disabled={!valid}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold"
        >
          Add Action
        </button>
      </div>
    </div>
  );
}

function ModalShell({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 sticky top-0 bg-slate-900 z-10">
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
