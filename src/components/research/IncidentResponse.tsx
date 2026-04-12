import { useState, useEffect, useCallback } from 'react';
import {
  Siren,
  Search,
  Plus,
  RefreshCw,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Server,
  FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { IncidentRecord } from '../../lib/database.types';

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const CATEGORIES = ['security', 'availability', 'integrity', 'confidentiality', 'compliance'] as const;
const NIST_PHASES = ['preparation', 'detection', 'containment', 'eradication', 'recovery', 'lessons_learned'] as const;

const PHASE_ORDER = ['preparation', 'detection', 'containment', 'eradication', 'recovery', 'lessons_learned'];

function severityColor(s: string) {
  switch (s) {
    case 'critical': return 'text-red-300 bg-red-900/30 border-red-700/50';
    case 'high': return 'text-orange-300 bg-orange-900/30 border-orange-700/50';
    case 'medium': return 'text-amber-300 bg-amber-900/30 border-amber-700/50';
    default: return 'text-sky-300 bg-sky-900/30 border-sky-700/50';
  }
}

function statusColor(s: string) {
  switch (s) {
    case 'open': return 'text-red-400 bg-red-900/20 border-red-700/40';
    case 'investigating': return 'text-amber-400 bg-amber-900/20 border-amber-700/40';
    case 'contained': return 'text-sky-400 bg-sky-900/20 border-sky-700/40';
    case 'resolved': return 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40';
    case 'closed': return 'text-slate-400 bg-slate-800/30 border-slate-700/40';
    default: return 'text-slate-400 bg-slate-800/30 border-slate-700/40';
  }
}

function phaseColor(phase: string) {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx <= 1) return 'text-red-400 border-red-700/50 bg-red-900/20';
  if (idx <= 3) return 'text-amber-400 border-amber-700/50 bg-amber-900/20';
  return 'text-emerald-400 border-emerald-700/50 bg-emerald-900/20';
}

function PhaseProgress({ current }: { current: string }) {
  const currentIdx = PHASE_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {PHASE_ORDER.map((phase, idx) => (
        <div key={phase} className="flex items-center">
          <div
            className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold transition-all ${
              idx < currentIdx
                ? 'bg-emerald-600 text-white'
                : idx === currentIdx
                ? 'bg-sky-600 text-white ring-2 ring-sky-400/30'
                : 'bg-slate-700/50 text-slate-600'
            }`}
            title={phase.replace(/_/g, ' ')}
          >
            {idx + 1}
          </div>
          {idx < PHASE_ORDER.length - 1 && (
            <div className={`w-4 h-px ${idx < currentIdx ? 'bg-emerald-600' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatBadge({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function IncidentCard({ incident, onUpdate }: { incident: IncidentRecord; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const STATUS_FLOW: Record<string, string> = {
    open: 'investigating',
    investigating: 'contained',
    contained: 'resolved',
    resolved: 'closed',
  };

  const advanceStatus = async () => {
    const next = STATUS_FLOW[incident.status];
    if (!next) return;
    setUpdating(true);
    const updates: Record<string, string> = {
      status: next,
      updated_at: new Date().toISOString(),
    };
    if (next === 'contained') updates.contained_at = new Date().toISOString();
    if (next === 'resolved') updates.resolved_at = new Date().toISOString();
    await supabase.from('incident_records').update(updates).eq('id', incident.id);
    setUpdating(false);
    onUpdate();
  };

  const advancePhase = async () => {
    const currentIdx = PHASE_ORDER.indexOf(incident.nist_phase);
    if (currentIdx === PHASE_ORDER.length - 1) return;
    setUpdating(true);
    await supabase.from('incident_records').update({
      nist_phase: PHASE_ORDER[currentIdx + 1],
      updated_at: new Date().toISOString(),
    }).eq('id', incident.id);
    setUpdating(false);
    onUpdate();
  };

  const mttrHours = incident.resolved_at
    ? Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.detected_at).getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl overflow-hidden hover:border-slate-600/40 transition-all">
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className={`p-2 rounded-lg shrink-0 ${incident.severity === 'critical' ? 'bg-red-900/30 text-red-400' : incident.severity === 'high' ? 'bg-orange-900/30 text-orange-400' : 'bg-amber-900/30 text-amber-400'}`}>
          <Siren className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200 truncate">{incident.title}</span>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">{incident.incident_id}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <PhaseProgress current={incident.nist_phase} />
            <span className="text-[10px] text-slate-500 capitalize">{incident.nist_phase.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityColor(incident.severity)}`}>
            {incident.severity}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor(incident.status)}`}>
            {incident.status}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/30 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Category</p>
              <p className="text-xs text-slate-300 capitalize">{incident.category}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Detected</p>
              <p className="text-xs text-slate-300">{new Date(incident.detected_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Assigned To</p>
              <p className="text-xs text-slate-300">{incident.assigned_to || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">MTTR</p>
              <p className="text-xs text-slate-300">{mttrHours !== null ? `${mttrHours}h` : 'Ongoing'}</p>
            </div>
          </div>

          {incident.description && (
            <p className="text-xs text-slate-400 leading-relaxed">{incident.description}</p>
          )}

          {incident.affected_systems && incident.affected_systems.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Server className="w-3 h-3" /> Affected Systems
              </p>
              <div className="flex flex-wrap gap-1.5">
                {incident.affected_systems.map((sys, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-700/40 border border-slate-600/30 text-slate-300 font-mono">{sys}</span>
                ))}
              </div>
            </div>
          )}

          {incident.iocs && incident.iocs.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> IOCs
              </p>
              <div className="flex flex-wrap gap-1.5">
                {incident.iocs.map((ioc, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-red-900/20 border border-red-700/30 text-red-300 font-mono">{ioc}</span>
                ))}
              </div>
            </div>
          )}

          {incident.lessons_learned && (
            <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Lessons Learned
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{incident.lessons_learned}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/20">
            {STATUS_FLOW[incident.status] && (
              <button
                onClick={advanceStatus}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-900/30 border border-sky-700/40 text-sky-400 text-xs font-medium hover:bg-sky-900/50 transition-all disabled:opacity-50"
              >
                {updating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Advance to {STATUS_FLOW[incident.status]}
              </button>
            )}
            {incident.nist_phase !== 'lessons_learned' && (
              <button
                onClick={advancePhase}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 text-xs font-medium hover:bg-emerald-900/40 transition-all disabled:opacity-50"
              >
                <Activity className="w-3 h-3" />
                Next NIST phase
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddIncidentForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const { session } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium' as typeof SEVERITIES[number],
    category: 'security' as typeof CATEGORIES[number],
    affected_systems: '',
    assigned_to: '',
    iocs: '',
    lessons_learned: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !form.title) return;
    setSaving(true);
    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from('incident_records').insert({
      user_id: session.user.id,
      incident_id: incidentId,
      title: form.title,
      description: form.description,
      severity: form.severity,
      status: 'open',
      category: form.category,
      affected_systems: form.affected_systems ? form.affected_systems.split(',').map(s => s.trim()).filter(Boolean) : [],
      assigned_to: form.assigned_to,
      iocs: form.iocs ? form.iocs.split(',').map(i => i.trim()).filter(Boolean) : [],
      lessons_learned: form.lessons_learned,
      nist_phase: 'detection',
    });
    setSaving(false);
    onAdded();
  };

  const field = 'bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 w-full focus:outline-none focus:border-sky-600/60 placeholder-slate-600';

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Siren className="w-4 h-4 text-red-400" />
        Open New Incident
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className={field} placeholder="Incident title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <select className={field} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as typeof SEVERITIES[number] }))}>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={field} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as typeof CATEGORIES[number] }))}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className={field} placeholder="Assigned to" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
        <input className={field} placeholder="Affected systems (comma-separated)" value={form.affected_systems} onChange={e => setForm(f => ({ ...f, affected_systems: e.target.value }))} />
        <input className={field} placeholder="IOCs (comma-separated)" value={form.iocs} onChange={e => setForm(f => ({ ...f, iocs: e.target.value }))} />
      </div>
      <textarea className={`${field} resize-none`} rows={2} placeholder="Incident description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/70 hover:bg-red-700 text-white text-xs font-semibold transition-all disabled:opacity-50">
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Siren className="w-3.5 h-3.5" />}
          Open Incident
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-700/50 text-slate-400 text-xs hover:text-slate-200 hover:border-slate-600 transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function IncidentResponse() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('incident_records')
      .select('*')
      .order('detected_at', { ascending: false });
    setIncidents((data as IncidentRecord[]) || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = incidents.filter(i => {
    const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.incident_id.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = filterSeverity === 'all' || i.severity === filterSeverity;
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchSeverity && matchStatus;
  });

  const open = incidents.filter(i => i.status === 'open').length;
  const investigating = incidents.filter(i => i.status === 'investigating').length;
  const critical = incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length;
  const resolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBadge label="Open" value={open} accent={open > 0 ? 'text-red-400' : 'text-slate-400'} />
        <StatBadge label="Investigating" value={investigating} accent={investigating > 0 ? 'text-amber-400' : 'text-slate-400'} />
        <StatBadge label="Critical Active" value={critical} accent={critical > 0 ? 'text-red-400' : 'text-slate-400'} />
        <StatBadge label="Resolved" value={resolved} accent="text-emerald-400" />
      </div>

      <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Shield className="w-3 h-3" />
          NIST SP 800-61 Incident Response Lifecycle
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {PHASE_ORDER.map((phase, idx) => {
            const count = incidents.filter(i => i.nist_phase === phase && i.status !== 'closed').length;
            return (
              <div key={phase} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium capitalize transition-all ${count > 0 ? phaseColor(phase) : 'text-slate-600 border-slate-800/40 bg-slate-900/20'}`}>
                  <span className="font-bold text-[9px] opacity-60">{idx + 1}</span>
                  {phase.replace(/_/g, ' ')}
                  {count > 0 && <span className="font-bold ml-0.5">({count})</span>}
                </div>
                {idx < PHASE_ORDER.length - 1 && <XCircle className="w-3 h-3 text-slate-700 rotate-45 opacity-30" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-600/50"
            placeholder="Search incidents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="all">All Severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {['open', 'investigating', 'contained', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} className="p-2 rounded-lg border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/70 hover:bg-red-700 text-white text-xs font-semibold transition-all">
          <Plus className="w-3.5 h-3.5" />
          Open Incident
        </button>
      </div>

      {showForm && (
        <AddIncidentForm onAdded={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Siren className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{incidents.length === 0 ? 'No incidents recorded.' : 'No incidents match current filters.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inc => (
            <IncidentCard key={inc.id} incident={inc} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
