import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Terminal,
  RefreshCw,
  Filter,
  Download,
  Trash2,
  Circle,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

type Severity = 'info' | 'warning' | 'critical' | 'success' | 'debug';

interface LogEntry {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  detail: string;
  severity: Severity;
  entityId: string;
  entityType: string;
}

const SEVERITY_CONFIG: Record<Severity, { color: string; prefix: string; dot: string }> = {
  info: { color: 'text-sky-300', prefix: '[INFO]', dot: 'bg-sky-400' },
  warning: { color: 'text-amber-300', prefix: '[WARN]', dot: 'bg-amber-400' },
  critical: { color: 'text-red-300', prefix: '[CRIT]', dot: 'bg-red-400 animate-pulse' },
  success: { color: 'text-emerald-300', prefix: '[OK  ]', dot: 'bg-emerald-400' },
  debug: { color: 'text-slate-500', prefix: '[DBUG]', dot: 'bg-slate-600' },
};

const MODULE_COLORS: Record<string, string> = {
  ForensicLayer: 'text-violet-400',
  RoboticsDashboard: 'text-cyan-400',
  SafetyScanner: 'text-orange-400',
  AuditLog: 'text-slate-400',
  Dashboard: 'text-sky-400',
  System: 'text-slate-500',
};

const MOCK_SEED_ENTRIES: Omit<LogEntry, 'id'>[] = [
  { timestamp: new Date(Date.now() - 3600000).toISOString(), module: 'System', action: 'SESSION_START', detail: 'Sovereign 3.0 initialized — all subsystems nominal', severity: 'success', entityId: '', entityType: '' },
  { timestamp: new Date(Date.now() - 3500000).toISOString(), module: 'Dashboard', action: 'DATA_LOAD', detail: 'Research data loaded — 4 sources queried in parallel', severity: 'info', entityId: '', entityType: '' },
  { timestamp: new Date(Date.now() - 2800000).toISOString(), module: 'RoboticsDashboard', action: 'DRONE_STATUS_CHANGE', detail: 'AQU-02 → returning (low battery: 21%)', severity: 'warning', entityId: 'AQU-02', entityType: 'drone' },
  { timestamp: new Date(Date.now() - 2400000).toISOString(), module: 'ForensicLayer', action: 'FEED_START', detail: 'Analysis mode: combined — VSR + SLR active', severity: 'info', entityId: '', entityType: '' },
  { timestamp: new Date(Date.now() - 2200000).toISOString(), module: 'ForensicLayer', action: 'FEED_COMPLETE', detail: 'VSR transcript generated — 342 frames processed, 94.2% confidence', severity: 'success', entityId: '', entityType: '' },
  { timestamp: new Date(Date.now() - 1800000).toISOString(), module: 'SafetyScanner', action: 'SCAN_COMPLETE', detail: 'Sample: SWAB-A3 | Hazard: HIGH | MRSA variant detected', severity: 'critical', entityId: 'SCAN-001', entityType: 'scan' },
  { timestamp: new Date(Date.now() - 1500000).toISOString(), module: 'RoboticsDashboard', action: 'OBSTACLE_DETECTED', detail: 'AQU-01 — obstacle at 4.2m, collision avoidance engaged', severity: 'warning', entityId: 'AQU-01', entityType: 'drone' },
  { timestamp: new Date(Date.now() - 900000).toISOString(), module: 'SafetyScanner', action: 'SCAN_COMPLETE', detail: 'Sample: SURFACE-C1 | Hazard: LOW | No pathogen detected', severity: 'success', entityId: 'SCAN-002', entityType: 'scan' },
  { timestamp: new Date(Date.now() - 600000).toISOString(), module: 'Dashboard', action: 'TAB_CHANGE', detail: 'User navigated to: Forensic Layer', severity: 'debug', entityId: '', entityType: '' },
  { timestamp: new Date(Date.now() - 300000).toISOString(), module: 'System', action: 'HEARTBEAT', detail: 'All modules responsive — latency: <12ms', severity: 'info', entityId: '', entityType: '' },
];

function SeverityIcon({ severity }: { severity: Severity }) {
  switch (severity) {
    case 'critical': return <AlertTriangle className="w-3 h-3 text-red-400" />;
    case 'warning': return <AlertCircle className="w-3 h-3 text-amber-400" />;
    case 'success': return <CheckCircle className="w-3 h-3 text-emerald-400" />;
    case 'debug': return <Circle className="w-3 h-3 text-slate-600" />;
    default: return <Info className="w-3 h-3 text-sky-400" />;
  }
}

function LogLine({ entry }: { entry: LogEntry }) {
  const cfg = SEVERITY_CONFIG[entry.severity] || SEVERITY_CONFIG.info;
  const moduleColor = MODULE_COLORS[entry.module] || 'text-slate-400';
  const ts = new Date(entry.timestamp);

  return (
    <div className={`py-1.5 px-2 rounded hover:bg-slate-800/40 transition-colors group font-mono text-[10px] leading-relaxed ${entry.severity === 'critical' ? 'bg-red-900/10' : ''}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-slate-600 shrink-0 tabular-nums">
          {ts.toTimeString().split(' ')[0]}
        </span>
        <span className={`shrink-0 font-bold ${cfg.color}`}>
          {cfg.prefix}
        </span>
        <span className={`shrink-0 font-semibold ${moduleColor} hidden sm:inline`}>
          [{entry.module}]
        </span>
        <span className="text-slate-400 shrink-0 hidden md:inline">
          {entry.action}
        </span>
      </div>
      <div className="text-slate-300 mt-0.5 break-words pl-1">{entry.detail}</div>
    </div>
  );
}

export default function AuditLog() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [filterModule, setFilterModule] = useState('all');
  const [search, setSearch] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  const loadEntries = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('audit_log_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    const mapped: LogEntry[] = (data || []).map((d: Record<string, string>) => ({
      id: d.id,
      timestamp: d.timestamp,
      module: d.module,
      action: d.action,
      detail: d.detail,
      severity: (d.severity as Severity) || 'info',
      entityId: d.entity_id,
      entityType: d.entity_type,
    }));

    if (mapped.length === 0) {
      const seeded = MOCK_SEED_ENTRIES.map((e, i) => ({ ...e, id: `seed-${i}` }));
      setEntries(seeded.reverse());
    } else {
      setEntries(mapped.reverse());
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    const channel = supabase
      .channel('audit_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_log_entries',
      }, payload => {
        const d = payload.new as Record<string, string>;
        const newEntry: LogEntry = {
          id: d.id,
          timestamp: d.timestamp,
          module: d.module,
          action: d.action,
          detail: d.detail,
          severity: (d.severity as Severity) || 'info',
          entityId: d.entity_id,
          entityType: d.entity_type,
        };
        setEntries(prev => [...prev, newEntry]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const exportLog = () => {
    const lines = entries.map(e =>
      `${e.timestamp}\t${SEVERITY_CONFIG[e.severity]?.prefix || '[INFO]'}\t[${e.module}]\t${e.action}\t${e.detail}`
    ).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovereign-audit-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modules = Array.from(new Set(entries.map(e => e.module)));

  const filtered = entries.filter(e => {
    const matchSev = filterSeverity === 'all' || e.severity === filterSeverity;
    const matchMod = filterModule === 'all' || e.module === filterModule;
    const matchSearch = !search || e.detail.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchMod && matchSearch;
  });

  const counts: Record<Severity, number> = {
    info: entries.filter(e => e.severity === 'info').length,
    warning: entries.filter(e => e.severity === 'warning').length,
    critical: entries.filter(e => e.severity === 'critical').length,
    success: entries.filter(e => e.severity === 'success').length,
    debug: entries.filter(e => e.severity === 'debug').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {(Object.keys(SEVERITY_CONFIG) as Severity[]).map(sev => {
          const cfg = SEVERITY_CONFIG[sev];
          return (
            <div
              key={sev}
              onClick={() => setFilterSeverity(f => f === sev ? 'all' : sev)}
              className={`cursor-pointer bg-slate-800/20 border rounded-xl p-3 transition-all hover:border-slate-600/40 ${filterSeverity === sev ? 'border-slate-500/50 bg-slate-800/40' : 'border-slate-700/30'}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{sev}</span>
              </div>
              <p className={`text-lg font-bold font-mono ${cfg.color}`}>{counts[sev]}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Filter className="w-3 h-3 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-600 font-mono"
              placeholder="grep pattern..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={loadEntries}
            className="p-2 rounded-lg border border-slate-700/40 text-slate-500 hover:text-slate-300 transition-all shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportLog}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-700/40 text-slate-400 text-xs font-mono hover:text-slate-200 hover:border-slate-600 transition-all shrink-0"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">export .log</span>
          </button>
        </div>
        <div className="flex gap-2">
          <select
            className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono focus:outline-none"
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
          >
            <option value="all">all modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button
            onClick={() => setAutoScroll(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono transition-all shrink-0 ${autoScroll ? 'border-sky-700/40 text-sky-400 bg-sky-900/10' : 'border-slate-700/40 text-slate-500'}`}
          >
            <ChevronDown className="w-3 h-3" />
            <span className="hidden sm:inline">{autoScroll ? 'auto-scroll on' : 'auto-scroll off'}</span>
            <span className="sm:hidden">{autoScroll ? 'auto' : 'manual'}</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/60">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Terminal className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-mono text-slate-500">sovereign@audit-terminal — {filtered.length} entries</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-mono text-emerald-400">LIVE</span>
          </div>
        </div>

        <div
          ref={terminalRef}
          className="overflow-y-auto p-3 space-y-0.5"
          style={{ height: 'min(460px, 55vh)', fontFamily: 'ui-monospace, monospace' }}
        >
          {loading ? (
            <div className="flex items-center gap-2 py-4 px-2 text-xs font-mono text-sky-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              loading audit log...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs font-mono text-slate-600 py-4 px-2">
              $ grep: no matches found — adjust filter or clear pattern
            </p>
          ) : (
            <>
              <p className="text-[10px] font-mono text-slate-700 px-2 pb-1">
                $ tail -n {filtered.length} /var/log/sovereign/audit.log | grep --color "{search || '*'}"
              </p>
              {filtered.map(entry => (
                <LogLine key={entry.id} entry={entry} />
              ))}
              <p className="text-[10px] font-mono text-slate-700 px-2 pt-1 flex items-center gap-1">
                <span className="text-emerald-500">root@sovereign</span>
                <span className="text-slate-500">:~$</span>
                <span className="w-1.5 h-3.5 bg-slate-400 animate-pulse inline-block" />
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
