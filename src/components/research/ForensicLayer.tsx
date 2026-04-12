import { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Search,
  Plus,
  RefreshCw,
  Shield,
  Hash,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  FileText,
  Database,
  AlertCircle,
  CheckCircle,
  Cpu,
  Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { ForensicArtifact } from '../../lib/database.types';

const ARTIFACT_TYPES = ['file', 'memory_dump', 'network_capture', 'registry_hive', 'log_archive', 'disk_image', 'process_dump'] as const;
const CLASSIFICATIONS = ['unclassified', 'sensitive', 'confidential', 'secret'] as const;
const STATUSES = ['collected', 'processing', 'analyzed', 'archived', 'flagged'] as const;
const HASH_ALGORITHMS = ['SHA-256', 'SHA-512', 'MD5', 'SHA-1'] as const;

function statusColor(status: string) {
  switch (status) {
    case 'analyzed': return 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40';
    case 'flagged': return 'text-red-400 bg-red-900/20 border-red-700/40';
    case 'processing': return 'text-sky-400 bg-sky-900/20 border-sky-700/40';
    case 'archived': return 'text-slate-400 bg-slate-800/30 border-slate-700/40';
    default: return 'text-amber-400 bg-amber-900/20 border-amber-700/40';
  }
}

function classificationColor(c: string) {
  switch (c) {
    case 'secret': return 'text-red-300 bg-red-900/30 border-red-700/50';
    case 'confidential': return 'text-orange-300 bg-orange-900/30 border-orange-700/50';
    case 'sensitive': return 'text-amber-300 bg-amber-900/30 border-amber-700/50';
    default: return 'text-slate-400 bg-slate-800/30 border-slate-700/40';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'memory_dump': return <Cpu className="w-3.5 h-3.5" />;
    case 'network_capture': return <Database className="w-3.5 h-3.5" />;
    case 'registry_hive': return <Lock className="w-3.5 h-3.5" />;
    case 'log_archive': return <FileText className="w-3.5 h-3.5" />;
    case 'disk_image': return <HardDrive className="w-3.5 h-3.5" />;
    default: return <HardDrive className="w-3.5 h-3.5" />;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function StatBadge({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function ArtifactCard({ artifact, onStatusUpdate }: { artifact: ForensicArtifact; onStatusUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    await supabase
      .from('forensic_artifacts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', artifact.id);
    setUpdating(false);
    onStatusUpdate();
  };

  const nextStatus: Record<string, string> = {
    collected: 'processing',
    processing: 'analyzed',
    analyzed: 'archived',
    flagged: 'analyzed',
  };

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl overflow-hidden hover:border-slate-600/40 transition-all">
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="p-2 rounded-lg bg-slate-700/30 text-slate-400 shrink-0">
          {typeIcon(artifact.artifact_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-200 truncate">{artifact.name}</span>
            <span className="text-[10px] font-mono text-slate-500">{artifact.artifact_id}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500 capitalize">{artifact.artifact_type.replace(/_/g, ' ')}</span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">{artifact.source_host}</span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">{formatBytes(artifact.size_bytes)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${classificationColor(artifact.classification)}`}>
            {artifact.classification}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor(artifact.status)}`}>
            {artifact.status}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/30 px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Hash className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{artifact.hash_algorithm} Hash</p>
                  <p className="text-xs font-mono text-slate-300 break-all mt-0.5">{artifact.file_hash || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">File Path</p>
                  <p className="text-xs font-mono text-slate-300 break-all mt-0.5">{artifact.file_path || '—'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Collected</p>
                  <p className="text-xs text-slate-300 mt-0.5">{new Date(artifact.collected_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">NIST Control</p>
                  <p className="text-xs text-slate-300 mt-0.5">{artifact.nist_control}</p>
                </div>
              </div>
            </div>
          </div>

          {artifact.description && (
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-700/20 pt-3">{artifact.description}</p>
          )}

          {artifact.tags && artifact.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3 h-3 text-slate-600" />
              {artifact.tags.map((tag, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-700/40 text-slate-400 font-mono">{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/20">
            {nextStatus[artifact.status] && (
              <button
                onClick={() => handleStatusChange(nextStatus[artifact.status])}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-900/30 border border-sky-700/40 text-sky-400 text-xs font-medium hover:bg-sky-900/50 transition-all disabled:opacity-50"
              >
                {updating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Mark as {nextStatus[artifact.status]}
              </button>
            )}
            {artifact.status !== 'flagged' && (
              <button
                onClick={() => handleStatusChange('flagged')}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-xs font-medium hover:bg-red-900/40 transition-all disabled:opacity-50"
              >
                <AlertCircle className="w-3 h-3" />
                Flag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddArtifactForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const { session } = useAuth();
  const [form, setForm] = useState({
    name: '',
    artifact_type: 'file' as typeof ARTIFACT_TYPES[number],
    source_host: '',
    file_path: '',
    file_hash: '',
    hash_algorithm: 'SHA-256' as typeof HASH_ALGORITHMS[number],
    size_bytes: '',
    classification: 'unclassified' as typeof CLASSIFICATIONS[number],
    description: '',
    nist_control: 'IR-4',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !form.name || !form.source_host) return;
    setSaving(true);
    const artifactId = `ART-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from('forensic_artifacts').insert({
      user_id: session.user.id,
      artifact_id: artifactId,
      name: form.name,
      artifact_type: form.artifact_type,
      source_host: form.source_host,
      file_path: form.file_path,
      file_hash: form.file_hash,
      hash_algorithm: form.hash_algorithm,
      size_bytes: parseInt(form.size_bytes) || 0,
      classification: form.classification,
      description: form.description,
      nist_control: form.nist_control,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: 'collected',
    });
    setSaving(false);
    onAdded();
  };

  const field = 'bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 w-full focus:outline-none focus:border-sky-600/60 placeholder-slate-600';

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Plus className="w-4 h-4 text-sky-400" />
        Ingest New Artifact
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className={field} placeholder="Artifact name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <select className={field} value={form.artifact_type} onChange={e => setForm(f => ({ ...f, artifact_type: e.target.value as typeof ARTIFACT_TYPES[number] }))}>
          {ARTIFACT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <input className={field} placeholder="Source host / IP *" value={form.source_host} onChange={e => setForm(f => ({ ...f, source_host: e.target.value }))} required />
        <input className={field} placeholder="File path" value={form.file_path} onChange={e => setForm(f => ({ ...f, file_path: e.target.value }))} />
        <input className={field} placeholder="File hash" value={form.file_hash} onChange={e => setForm(f => ({ ...f, file_hash: e.target.value }))} />
        <select className={field} value={form.hash_algorithm} onChange={e => setForm(f => ({ ...f, hash_algorithm: e.target.value as typeof HASH_ALGORITHMS[number] }))}>
          {HASH_ALGORITHMS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <input className={field} type="number" placeholder="Size (bytes)" value={form.size_bytes} onChange={e => setForm(f => ({ ...f, size_bytes: e.target.value }))} />
        <select className={field} value={form.classification} onChange={e => setForm(f => ({ ...f, classification: e.target.value as typeof CLASSIFICATIONS[number] }))}>
          {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className={field} placeholder="NIST Control (e.g. IR-4)" value={form.nist_control} onChange={e => setForm(f => ({ ...f, nist_control: e.target.value }))} />
        <input className={field} placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
      </div>
      <textarea className={`${field} resize-none`} rows={2} placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-semibold transition-all disabled:opacity-50">
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Ingest Artifact
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-700/50 text-slate-400 text-xs hover:text-slate-200 hover:border-slate-600 transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ForensicLayer() {
  const { session } = useAuth();
  const [artifacts, setArtifacts] = useState<ForensicArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('forensic_artifacts')
      .select('*')
      .order('collected_at', { ascending: false });
    setArtifacts((data as ForensicArtifact[]) || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = artifacts.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.source_host.toLowerCase().includes(search.toLowerCase()) || a.artifact_id.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || a.artifact_type === filterType;
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const counts = {
    total: artifacts.length,
    flagged: artifacts.filter(a => a.status === 'flagged').length,
    analyzed: artifacts.filter(a => a.status === 'analyzed').length,
    processing: artifacts.filter(a => a.status === 'processing').length,
  };

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
        <StatBadge label="Total Artifacts" value={counts.total} accent="text-white" />
        <StatBadge label="Flagged" value={counts.flagged} accent={counts.flagged > 0 ? 'text-red-400' : 'text-slate-400'} />
        <StatBadge label="Analyzed" value={counts.analyzed} accent="text-emerald-400" />
        <StatBadge label="Processing" value={counts.processing} accent="text-sky-400" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full bg-slate-800/40 border border-slate-700/40 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-600/50"
            placeholder="Search by name, host, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-sky-600/50"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          {ARTIFACT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-sky-600/50"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-semibold transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Ingest
        </button>
      </div>

      {showForm && (
        <AddArtifactForm onAdded={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <HardDrive className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{artifacts.length === 0 ? 'No artifacts ingested yet.' : 'No artifacts match the current filters.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <ArtifactCard key={a.id} artifact={a} onStatusUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
