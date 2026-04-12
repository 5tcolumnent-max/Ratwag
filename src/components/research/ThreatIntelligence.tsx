import { useState, useEffect, useCallback } from 'react';
import {
  Crosshair,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  Globe,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Target,
  Eye,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import type { ThreatIntelFeed } from '../../lib/database.types';

const INDICATOR_TYPES = ['ip', 'domain', 'url', 'file_hash', 'email', 'registry_key', 'yara_rule', 'cidr'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const TLP_LEVELS = ['red', 'amber', 'green', 'white'] as const;

const MITRE_TACTICS = [
  'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
  'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
  'Collection', 'Command and Control', 'Exfiltration', 'Impact',
];

function severityColor(s: string) {
  switch (s) {
    case 'critical': return 'text-red-300 bg-red-900/30 border-red-700/50';
    case 'high': return 'text-orange-300 bg-orange-900/30 border-orange-700/50';
    case 'medium': return 'text-amber-300 bg-amber-900/30 border-amber-700/50';
    case 'low': return 'text-sky-300 bg-sky-900/30 border-sky-700/50';
    default: return 'text-slate-400 bg-slate-800/30 border-slate-700/40';
  }
}

function tlpColor(tlp: string) {
  switch (tlp) {
    case 'red': return 'text-red-400 bg-red-900/20 border-red-700/40';
    case 'amber': return 'text-amber-400 bg-amber-900/20 border-amber-700/40';
    case 'green': return 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40';
    default: return 'text-slate-300 bg-slate-800/30 border-slate-700/40';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'ip': return <Globe className="w-3.5 h-3.5" />;
    case 'domain': return <Globe className="w-3.5 h-3.5" />;
    case 'url': return <Globe className="w-3.5 h-3.5" />;
    case 'file_hash': return <Shield className="w-3.5 h-3.5" />;
    case 'yara_rule': return <Target className="w-3.5 h-3.5" />;
    default: return <Crosshair className="w-3.5 h-3.5" />;
  }
}

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 shrink-0">{value}%</span>
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

function IOCCard({ ioc, onToggle }: { ioc: ThreatIntelFeed; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    await supabase
      .from('threat_intel_feeds')
      .update({ active: !ioc.active, updated_at: new Date().toISOString() })
      .eq('id', ioc.id);
    setToggling(false);
    onToggle();
  };

  return (
    <div className={`bg-slate-800/20 border rounded-xl overflow-hidden transition-all ${ioc.active ? 'border-slate-700/30 hover:border-slate-600/40' : 'border-slate-800/30 opacity-60'}`}>
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="p-2 rounded-lg bg-slate-700/30 text-slate-400 shrink-0">
          {typeIcon(ioc.indicator_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-200 truncate">{ioc.value}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">{ioc.indicator_type.replace(/_/g, ' ')}</span>
            {ioc.threat_actor && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-400">{ioc.threat_actor}</span>
              </>
            )}
            {ioc.campaign && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-500">{ioc.campaign}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityColor(ioc.severity)}`}>
            {ioc.severity}
          </span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${tlpColor(ioc.tlp)}`}>
            TLP:{ioc.tlp.toUpperCase()}
          </span>
          <button onClick={handleToggle} disabled={toggling} className="text-slate-400 hover:text-slate-200 transition-colors">
            {ioc.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/30 px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Confidence</p>
              <ConfidenceMeter value={ioc.confidence} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Source</p>
              <p className="text-xs text-slate-300">{ioc.source || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">First Seen</p>
              <p className="text-xs text-slate-300">{new Date(ioc.first_seen).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Last Seen</p>
              <p className="text-xs text-slate-300">{new Date(ioc.last_seen).toLocaleString()}</p>
            </div>
          </div>

          {ioc.mitre_tactics && ioc.mitre_tactics.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">MITRE ATT&CK Tactics</p>
              <div className="flex flex-wrap gap-1.5">
                {ioc.mitre_tactics.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-700/40 border border-slate-600/30 text-slate-300">{t}</span>
                ))}
              </div>
            </div>
          )}

          {ioc.mitre_techniques && ioc.mitre_techniques.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Techniques</p>
              <div className="flex flex-wrap gap-1.5">
                {ioc.mitre_techniques.map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/30 text-slate-400 font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}

          {ioc.description && (
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-700/20 pt-3">{ioc.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AddIOCForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const { session } = useAuth();
  const [form, setForm] = useState({
    indicator_type: 'ip' as typeof INDICATOR_TYPES[number],
    value: '',
    threat_actor: '',
    campaign: '',
    confidence: '70',
    severity: 'medium' as typeof SEVERITIES[number],
    tlp: 'amber' as typeof TLP_LEVELS[number],
    source: '',
    description: '',
    mitre_tactics: [] as string[],
    techniques: '',
  });
  const [saving, setSaving] = useState(false);

  const toggleTactic = (tactic: string) => {
    setForm(f => ({
      ...f,
      mitre_tactics: f.mitre_tactics.includes(tactic)
        ? f.mitre_tactics.filter(t => t !== tactic)
        : [...f.mitre_tactics, tactic],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !form.value) return;
    setSaving(true);
    const indicatorId = `IOC-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from('threat_intel_feeds').insert({
      user_id: session.user.id,
      indicator_id: indicatorId,
      indicator_type: form.indicator_type,
      value: form.value,
      threat_actor: form.threat_actor,
      campaign: form.campaign,
      confidence: parseInt(form.confidence) || 70,
      severity: form.severity,
      tlp: form.tlp,
      source: form.source,
      description: form.description,
      mitre_tactics: form.mitre_tactics,
      mitre_techniques: form.techniques ? form.techniques.split(',').map(t => t.trim()).filter(Boolean) : [],
      active: true,
    });
    setSaving(false);
    onAdded();
  };

  const field = 'bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 w-full focus:outline-none focus:border-sky-600/60 placeholder-slate-600';

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Plus className="w-4 h-4 text-sky-400" />
        Add Indicator of Compromise
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className={field} value={form.indicator_type} onChange={e => setForm(f => ({ ...f, indicator_type: e.target.value as typeof INDICATOR_TYPES[number] }))}>
          {INDICATOR_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <input className={field} placeholder="Indicator value *" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
        <input className={field} placeholder="Threat actor" value={form.threat_actor} onChange={e => setForm(f => ({ ...f, threat_actor: e.target.value }))} />
        <input className={field} placeholder="Campaign name" value={form.campaign} onChange={e => setForm(f => ({ ...f, campaign: e.target.value }))} />
        <div className="flex gap-2">
          <select className={field} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as typeof SEVERITIES[number] }))}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={field} value={form.tlp} onChange={e => setForm(f => ({ ...f, tlp: e.target.value as typeof TLP_LEVELS[number] }))}>
            {TLP_LEVELS.map(t => <option key={t} value={t}>TLP:{t.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Confidence: {form.confidence}%</label>
          <input type="range" min="0" max="100" className="w-full accent-sky-500" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: e.target.value }))} />
        </div>
        <input className={field} placeholder="Source feed / organization" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
        <input className={field} placeholder="MITRE techniques (T1234, T1059...)" value={form.techniques} onChange={e => setForm(f => ({ ...f, techniques: e.target.value }))} />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">MITRE ATT&CK Tactics</p>
        <div className="flex flex-wrap gap-1.5">
          {MITRE_TACTICS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTactic(t)}
              className={`text-[10px] px-2 py-1 rounded border transition-all ${form.mitre_tactics.includes(t) ? 'bg-sky-900/40 border-sky-700/50 text-sky-300' : 'bg-slate-800/30 border-slate-700/30 text-slate-500 hover:text-slate-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <textarea className={`${field} resize-none`} rows={2} placeholder="Description / context" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-semibold transition-all disabled:opacity-50">
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add IOC
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-700/50 text-slate-400 text-xs hover:text-slate-200 hover:border-slate-600 transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ThreatIntelligence() {
  const { session } = useAuth();
  const [iocs, setIocs] = useState<ThreatIntelFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('threat_intel_feeds')
      .select('*')
      .order('last_seen', { ascending: false });
    setIocs((data as ThreatIntelFeed[]) || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const filtered = iocs.filter(i => {
    if (!showInactive && !i.active) return false;
    const matchSearch = !search || i.value.toLowerCase().includes(search.toLowerCase()) || i.threat_actor.toLowerCase().includes(search.toLowerCase()) || i.campaign.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = filterSeverity === 'all' || i.severity === filterSeverity;
    const matchType = filterType === 'all' || i.indicator_type === filterType;
    return matchSearch && matchSeverity && matchType;
  });

  const counts = {
    total: iocs.filter(i => i.active).length,
    critical: iocs.filter(i => i.active && i.severity === 'critical').length,
    high: iocs.filter(i => i.active && i.severity === 'high').length,
    actors: new Set(iocs.filter(i => i.active && i.threat_actor).map(i => i.threat_actor)).size,
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
        <StatBadge label="Active IOCs" value={counts.total} accent="text-white" />
        <StatBadge label="Critical" value={counts.critical} accent={counts.critical > 0 ? 'text-red-400' : 'text-slate-400'} />
        <StatBadge label="High Severity" value={counts.high} accent={counts.high > 0 ? 'text-orange-400' : 'text-slate-400'} />
        <StatBadge label="Threat Actors" value={counts.actors} accent="text-amber-400" />
      </div>

      <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Activity className="w-3 h-3" />
          MITRE ATT&CK Coverage
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MITRE_TACTICS.map(tactic => {
            const count = iocs.filter(i => i.active && i.mitre_tactics?.includes(tactic)).length;
            return (
              <div
                key={tactic}
                className={`text-[10px] px-2 py-1 rounded border transition-all ${count > 0 ? 'bg-sky-900/30 border-sky-700/40 text-sky-300' : 'bg-slate-800/30 border-slate-700/20 text-slate-600'}`}
              >
                {tactic} {count > 0 && <span className="font-bold">({count})</span>}
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
            placeholder="Search by value, actor, or campaign..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="all">All Severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {INDICATOR_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-all ${showInactive ? 'border-sky-700/40 text-sky-400 bg-sky-900/20' : 'border-slate-700/40 text-slate-500 hover:text-slate-300'}`}
        >
          <Eye className="w-3.5 h-3.5" />
          {showInactive ? 'Hiding inactive' : 'Show inactive'}
        </button>
        <button onClick={load} className="p-2 rounded-lg border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-semibold transition-all">
          <Plus className="w-3.5 h-3.5" />
          Add IOC
        </button>
      </div>

      {showForm && (
        <AddIOCForm onAdded={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{iocs.length === 0 ? 'No indicators added yet.' : 'No IOCs match current filters.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ioc => (
            <IOCCard key={ioc.id} ioc={ioc} onToggle={load} />
          ))}
        </div>
      )}
    </div>
  );
}
