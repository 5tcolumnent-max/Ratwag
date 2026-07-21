import { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Mail,
  Phone,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  X,
  Forward,
  Building2,
  Loader2,
  Shield,
  EyeOff,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import {
  fetchTips,
  createTip,
  updateTip,
  deleteTip,
  fetchReferrals,
  createReferral,
  updateReferral,
  deleteReferral,
  TIP_STATUS_LABELS,
  TIP_STATUS_STYLES,
  TIP_PRIORITY_STYLES,
  TIP_CATEGORY_LABELS,
  TIP_SOURCE_LABELS,
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_STYLES,
  type TipRow,
  type ReferralRow,
  type TipStatus,
  type TipPriority,
  type TipCategory,
  type TipSourceChannel,
  type ReferralStatus,
} from '../../services/tipService';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function TipIntake() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [tips, setTips] = useState<TipRow[]>([]);
  const [selectedTip, setSelectedTip] = useState<TipRow | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTip, setShowNewTip] = useState(false);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TipStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TipPriority | 'all'>('all');

  const loadTips = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTips(userId);
      setTips(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tips');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadTips(); }, [loadTips]);

  const loadReferrals = useCallback(async (tipId: string) => {
    try {
      const data = await fetchReferrals(tipId);
      setReferrals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load referrals');
    }
  }, []);

  const handleSelectTip = (tip: TipRow) => {
    setSelectedTip(tip);
    setShowReferralForm(false);
    loadReferrals(tip.id);
  };

  const handleBack = () => {
    setSelectedTip(null);
    setReferrals([]);
  };

  const handleCreateTip = async (input: Parameters<typeof createTip>[1]) => {
    try {
      const newTip = await createTip(userId, input);
      if (newTip) {
        setTips(prev => [newTip, ...prev]);
        setShowNewTip(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tip');
    }
  };

  const handleStatusChange = async (tipId: string, status: TipStatus) => {
    try {
      await updateTip(tipId, { status });
      setTips(prev => prev.map(t => t.id === tipId ? { ...t, status } : t));
      if (selectedTip?.id === tipId) setSelectedTip({ ...selectedTip, status });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update tip');
    }
  };

  const handleDeleteTip = async (tipId: string) => {
    if (!confirm('Delete this tip and all its referrals? This cannot be undone.')) return;
    try {
      await deleteTip(tipId);
      setTips(prev => prev.filter(t => t.id !== tipId));
      if (selectedTip?.id === tipId) handleBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tip');
    }
  };

  const handleCreateReferral = async (input: Parameters<typeof createReferral>[1]) => {
    if (!selectedTip) return;
    try {
      const newReferral = await createReferral(userId, { ...input, tip_id: selectedTip.id });
      if (newReferral) {
        setReferrals(prev => [...prev, newReferral]);
        setShowReferralForm(false);
        if (selectedTip.status === 'new' || selectedTip.status === 'under_review') {
          await handleStatusChange(selectedTip.id, 'referred');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create referral');
    }
  };

  const handleReferralStatusChange = async (referralId: string, status: ReferralStatus) => {
    try {
      await updateReferral(referralId, { status });
      setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, status } : r));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update referral');
    }
  };

  const handleDeleteReferral = async (referralId: string) => {
    if (!confirm('Delete this referral record?')) return;
    try {
      await deleteReferral(referralId);
      setReferrals(prev => prev.filter(r => r.id !== referralId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete referral');
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

      {!selectedTip ? (
        <TipList
          tips={tips}
          filterStatus={filterStatus}
          filterPriority={filterPriority}
          onFilterStatus={setFilterStatus}
          onFilterPriority={setFilterPriority}
          onCreate={() => setShowNewTip(true)}
          onSelect={handleSelectTip}
          onDelete={handleDeleteTip}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TipDetail
          tip={selectedTip}
          referrals={referrals}
          showReferralForm={showReferralForm}
          onBack={handleBack}
          onShowReferralForm={() => setShowReferralForm(true)}
          onCreateReferral={handleCreateReferral}
          onReferralStatusChange={handleReferralStatusChange}
          onDeleteReferral={handleDeleteReferral}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteTip}
        />
      )}

      {showNewTip && (
        <NewTipModal onClose={() => setShowNewTip(false)} onCreate={handleCreateTip} />
      )}
    </div>
  );
}

function TipList({
  tips,
  filterStatus,
  filterPriority,
  onFilterStatus,
  onFilterPriority,
  onCreate,
  onSelect,
  onDelete,
  onStatusChange,
}: {
  tips: TipRow[];
  filterStatus: TipStatus | 'all';
  filterPriority: TipPriority | 'all';
  onFilterStatus: (s: TipStatus | 'all') => void;
  onFilterPriority: (p: TipPriority | 'all') => void;
  onCreate: () => void;
  onSelect: (t: TipRow) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TipStatus) => void;
}) {
  const filtered = tips.filter(t => {
    const ms = filterStatus === 'all' || t.status === filterStatus;
    const mp = filterPriority === 'all' || t.priority === filterPriority;
    return ms && mp;
  });

  const counts: Record<TipStatus, number> = {
    new: tips.filter(t => t.status === 'new').length,
    under_review: tips.filter(t => t.status === 'under_review').length,
    referred: tips.filter(t => t.status === 'referred').length,
    closed: tips.filter(t => t.status === 'closed').length,
    unfounded: tips.filter(t => t.status === 'unfounded').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-sky-400" />
            Tip Intake
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record and triage tips, then refer to appropriate law-enforcement agencies.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Tip
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(Object.keys(TIP_STATUS_LABELS) as TipStatus[]).map(s => (
          <button
            key={s}
            onClick={() => onFilterStatus(filterStatus === s ? 'all' : s)}
            className={`bg-slate-800/20 border rounded-xl p-2.5 transition-all text-left ${filterStatus === s ? 'border-slate-500/50 bg-slate-800/40' : 'border-slate-700/30 hover:border-slate-600/40'}`}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{TIP_STATUS_LABELS[s]}</span>
            <p className="text-base font-bold font-mono text-slate-300 mt-0.5">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono focus:outline-none"
          value={filterPriority}
          onChange={e => onFilterPriority(e.target.value as TipPriority | 'all')}
        >
          <option value="all">all priorities</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-700/50 rounded-2xl">
          <Inbox className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No tips {filterStatus !== 'all' || filterPriority !== 'all' ? 'match filters' : 'yet'}</p>
          <p className="text-xs text-slate-600 mt-1">Record a tip to begin triage.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(t => (
            <div
              key={t.id}
              className="group bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4 hover:border-slate-600/60 transition-all"
            >
              <div className="flex items-start gap-3">
                <button onClick={() => onSelect(t)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${TIP_PRIORITY_STYLES[t.priority]}`}>
                      {t.priority}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${TIP_STATUS_STYLES[t.status]}`}>
                      {TIP_STATUS_LABELS[t.status]}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-700/40 text-slate-400">
                      {TIP_CATEGORY_LABELS[t.category]}
                    </span>
                    {t.is_anonymous && (
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-700/40 text-slate-500">
                        <EyeOff className="w-2.5 h-2.5" />
                        anon
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                    {t.subject}
                  </h3>
                  {t.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-2 font-mono flex items-center gap-2">
                    <span>{TIP_SOURCE_LABELS[t.source_channel]}</span>
                    <span>·</span>
                    <span>{formatDate(t.created_at)}</span>
                  </p>
                </button>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <select
                    value={t.status}
                    onChange={(e) => onStatusChange(t.id, e.target.value as TipStatus)}
                    className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
                  >
                    {(Object.keys(TIP_STATUS_LABELS) as TipStatus[]).map(s => (
                      <option key={s} value={s}>{TIP_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onDelete(t.id)}
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

function TipDetail({
  tip,
  referrals,
  showReferralForm,
  onBack,
  onShowReferralForm,
  onCreateReferral,
  onReferralStatusChange,
  onDeleteReferral,
  onStatusChange,
  onDelete,
}: {
  tip: TipRow;
  referrals: ReferralRow[];
  showReferralForm: boolean;
  onBack: () => void;
  onShowReferralForm: () => void;
  onCreateReferral: (input: Parameters<typeof createReferral>[1]) => void;
  onReferralStatusChange: (id: string, status: ReferralStatus) => void;
  onDeleteReferral: (id: string) => void;
  onStatusChange: (id: string, status: TipStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Tips
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${TIP_PRIORITY_STYLES[tip.priority]}`}>
              {tip.priority}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${TIP_STATUS_STYLES[tip.status]}`}>
              {TIP_STATUS_LABELS[tip.status]}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-700/40 text-slate-400">
              {TIP_CATEGORY_LABELS[tip.category]}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white truncate mt-0.5">{tip.subject}</h2>
        </div>
        <select
          value={tip.status}
          onChange={(e) => onStatusChange(tip.id, e.target.value as TipStatus)}
          className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
        >
          {(Object.keys(TIP_STATUS_LABELS) as TipStatus[]).map(s => (
            <option key={s} value={s}>{TIP_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
        {tip.description && (
          <p className="text-xs text-slate-400 leading-relaxed">{tip.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/40">
          <DetailField icon={Mail} label="Source" value={TIP_SOURCE_LABELS[tip.source_channel]} />
          <DetailField icon={Clock} label="Incident Date" value={formatDate(tip.incident_date)} />
          <DetailField icon={MapPin} label="Location" value={tip.incident_location || '—'} />
          <DetailField
            icon={User}
            label="Submitter"
            value={tip.is_anonymous ? 'Anonymous' : (tip.submitter_name || '—')}
          />
          {!tip.is_anonymous && (
            <DetailField icon={Phone} label="Contact" value={tip.submitter_contact || '—'} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Forward className="w-4 h-4 text-sky-400" />
          Agency Referrals
          <span className="text-[10px] font-mono text-slate-500">({referrals.length})</span>
        </h3>
        <button
          onClick={onShowReferralForm}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Refer to Agency
        </button>
      </div>

      {showReferralForm && (
        <ReferralForm onSubmit={onCreateReferral} onCancel={() => onShowReferralForm()} />
      )}

      {referrals.length === 0 && !showReferralForm ? (
        <div className="text-center py-8 border border-dashed border-slate-700/50 rounded-2xl">
          <Building2 className="w-6 h-6 text-slate-700 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No referrals yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {referrals.map(r => (
            <div key={r.id} className="bg-slate-900/40 border border-slate-700/40 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-800/60 text-sky-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{r.referred_to_agency}</p>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${REFERRAL_STATUS_STYLES[r.status]}`}>
                      {REFERRAL_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  {r.referred_to_contact && (
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{r.referred_to_contact}</p>
                  )}
                  {r.referral_reason && (
                    <p className="text-xs text-slate-400 mt-1">{r.referral_reason}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-600 font-mono">
                    <span>{formatDate(r.referral_date)}</span>
                    {r.agency_case_number && <span>· {r.agency_case_number}</span>}
                  </div>
                  {r.notes && (
                    <p className="text-[10px] text-slate-500 mt-1 italic">{r.notes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <select
                    value={r.status}
                    onChange={(e) => onReferralStatusChange(r.id, e.target.value as ReferralStatus)}
                    className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-slate-600"
                  >
                    {(Object.keys(REFERRAL_STATUS_LABELS) as ReferralStatus[]).map(s => (
                      <option key={s} value={s}>{REFERRAL_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onDeleteReferral(r.id)}
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

      <div className="pt-2">
        <button
          onClick={() => onDelete(tip.id)}
          className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-red-400 font-medium transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Delete tip
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

function NewTipModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (input: Parameters<typeof createTip>[1]) => void;
}) {
  const [sourceChannel, setSourceChannel] = useState<TipSourceChannel>('hotline');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterContact, setSubmitterContact] = useState('');
  const [category, setCategory] = useState<TipCategory>('fraud');
  const [priority, setPriority] = useState<TipPriority>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');

  const valid = subject.trim();

  return (
    <ModalShell onClose={onClose} title="New Tip">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source Channel">
            <select className="modal-input" value={sourceChannel} onChange={e => setSourceChannel(e.target.value as TipSourceChannel)}>
              {(Object.keys(TIP_SOURCE_LABELS) as TipSourceChannel[]).map(s => (
                <option key={s} value={s}>{TIP_SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select className="modal-input" value={category} onChange={e => setCategory(e.target.value as TipCategory)}>
              {(Object.keys(TIP_CATEGORY_LABELS) as TipCategory[]).map(c => (
                <option key={c} value={c}>{TIP_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-sky-600 focus:ring-sky-600/40"
          />
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <EyeOff className="w-3 h-3" />
            Anonymous submission
          </span>
        </label>

        {!isAnonymous && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Submitter Name">
              <input className="modal-input" placeholder="Name" value={submitterName} onChange={e => setSubmitterName(e.target.value)} />
            </Field>
            <Field label="Contact">
              <input className="modal-input" placeholder="Phone / email" value={submitterContact} onChange={e => setSubmitterContact(e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Subject *">
          <input className="modal-input" placeholder="Short summary" value={subject} onChange={e => setSubject(e.target.value)} autoFocus />
        </Field>

        <Field label="Description">
          <textarea className="modal-input resize-none" rows={3} placeholder="Detailed narrative…" value={description} onChange={e => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select className="modal-input" value={priority} onChange={e => setPriority(e.target.value as TipPriority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
          <Field label="Incident Date">
            <input type="datetime-local" className="modal-input" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Incident Location">
          <input className="modal-input" placeholder="Address / area" value={incidentLocation} onChange={e => setIncidentLocation(e.target.value)} />
        </Field>

        <ModalActions onClose={onClose} onSubmit={() => valid && onCreate({
          source_channel: sourceChannel,
          is_anonymous: isAnonymous,
          submitter_name: isAnonymous ? null : (submitterName.trim() || null),
          submitter_contact: isAnonymous ? null : (submitterContact.trim() || null),
          category,
          priority,
          subject: subject.trim(),
          description: description.trim(),
          incident_location: incidentLocation.trim(),
          incident_date: incidentDate ? new Date(incidentDate).toISOString() : null,
        })} valid={valid} submitLabel="Create Tip" />
      </div>
    </ModalShell>
  );
}

function ReferralForm({ onSubmit, onCancel }: {
  onSubmit: (input: Parameters<typeof createReferral>[1]) => void;
  onCancel: () => void;
}) {
  const [agency, setAgency] = useState('');
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [notes, setNotes] = useState('');

  const valid = agency.trim();

  return (
    <div className="p-4 rounded-xl border border-slate-700/40 bg-slate-950/60 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
        <Shield className="w-3 h-3" />
        New Agency Referral
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Agency *">
          <input className="modal-input" placeholder="e.g. FBI Field Office" value={agency} onChange={e => setAgency(e.target.value)} autoFocus />
        </Field>
        <Field label="Contact">
          <input className="modal-input" placeholder="Agent / officer" value={contact} onChange={e => setContact(e.target.value)} />
        </Field>
      </div>
      <Field label="Referral Reason">
        <textarea className="modal-input resize-none" rows={2} placeholder="Why this agency…" value={reason} onChange={e => setReason(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Agency Case #">
          <input className="modal-input" placeholder="If assigned" value={caseNumber} onChange={e => setCaseNumber(e.target.value)} />
        </Field>
        <Field label="Notes">
          <input className="modal-input" placeholder="Additional notes" value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-slate-700/40 text-slate-400 text-xs hover:text-slate-200">Cancel</button>
        <button
          onClick={() => valid && onSubmit({
            tip_id: '',
            referred_to_agency: agency.trim(),
            referred_to_contact: contact.trim(),
            referral_reason: reason.trim(),
            agency_case_number: caseNumber.trim(),
            notes: notes.trim(),
          })}
          disabled={!valid}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold"
        >
          Create Referral
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

function ModalActions({ onClose, onSubmit, valid, submitLabel = 'Create' }: { onClose: () => void; onSubmit: () => void; valid: boolean; submitLabel?: string }) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700/40 text-slate-400 text-xs font-medium hover:text-slate-200">Cancel</button>
      <button
        onClick={onSubmit}
        disabled={!valid}
        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold active:scale-95 transition-all"
      >
        {submitLabel}
      </button>
    </div>
  );
}
