import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  Activity,
  Clock,
  Radio,
  Zap,
  Droplets,
  Gauge,
  AlertTriangle,
  CheckCircle,
  X,
  Send,
  Beaker,
  ChevronDown,
  ChevronUp,
  MapPin,
  Wrench,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { ActiveThreatAlert } from '../types/database.types';

type ThreatLevel = 'CRITICAL' | 'ELEVATED';

interface ThreatAlert extends ActiveThreatAlert {
  is_new?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function useUtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const THREAT_STYLES: Record<ThreatLevel, { badge: string; border: string; glow: string; icon: typeof ShieldAlert }> = {
  CRITICAL: {
    badge: 'bg-red-500/20 text-red-300 border-red-500/50',
    border: 'border-red-800/50',
    glow: 'shadow-red-950/40',
    icon: ShieldAlert,
  },
  ELEVATED: {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    border: 'border-amber-800/50',
    glow: 'shadow-amber-950/40',
    icon: AlertTriangle,
  },
};

const METRIC_ICONS: Record<string, typeof Gauge> = {
  pressure_psi: Gauge,
  flow_rate_gpm: Droplets,
  chlorine_ppm: Beaker,
  status_flag: Activity,
};

function SystemHeader({ alerts, clock }: { alerts: ThreatAlert[]; clock: Date }) {
  const activeAlerts = alerts.filter(a => !a.resolved);
  const hasCritical = activeAlerts.some(a => a.threat_level === 'CRITICAL');
  const hasThreat = activeAlerts.length > 0;
  const stationIds = new Set(alerts.map(a => a.station_id));

  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${
      hasCritical
        ? 'border-red-700/60 bg-gradient-to-r from-red-950/60 via-slate-900/80 to-slate-900/80'
        : hasThreat
          ? 'border-amber-700/50 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-900/80'
          : 'border-emerald-700/40 bg-gradient-to-r from-emerald-950/30 via-slate-900/80 to-slate-900/80'
    }`} style={{ backdropFilter: 'blur(8px)' }}>
      <div className={`absolute inset-0 opacity-20 transition-opacity duration-700 ${
        hasCritical ? 'bg-red-600/10' : hasThreat ? 'bg-amber-600/10' : 'bg-emerald-600/5'
      }`} />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 p-5 md:p-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`relative shrink-0 p-3 rounded-2xl border transition-all duration-500 ${
            hasCritical
              ? 'bg-red-900/40 border-red-600/60'
              : hasThreat
                ? 'bg-amber-900/30 border-amber-600/50'
                : 'bg-emerald-900/30 border-emerald-600/40'
          }`}>
            {hasCritical ? (
              <ShieldAlert className="w-6 h-6 text-red-400" />
            ) : hasThreat ? (
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            ) : (
              <Shield className="w-6 h-6 text-emerald-400" />
            )}
            {hasCritical && (
              <div className="absolute inset-0 rounded-2xl border-2 border-red-500/40 animate-ping" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-lg md:text-xl font-bold tracking-tight transition-colors duration-300 ${
                hasCritical ? 'text-red-300' : hasThreat ? 'text-amber-300' : 'text-emerald-300'
              }`}>
                {hasCritical ? 'ACTIVE THREAT DETECTED' : hasThreat ? 'ELEVATED THREAT LEVEL' : 'GRID SECURE'}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border tracking-widest ${
                hasCritical
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : hasThreat
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {hasCritical ? 'CRITICAL' : hasThreat ? 'ELEVATED' : 'NOMINAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              Municipal Water Infrastructure Monitoring · Real-Time Threat Detection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Stations</p>
              <p className="text-sm font-bold text-slate-200 font-mono">{stationIds.size}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${hasThreat ? 'text-red-400' : 'text-emerald-400'}`} />
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Active Alerts</p>
              <p className={`text-sm font-bold font-mono ${hasThreat ? 'text-red-300' : 'text-emerald-300'}`}>{activeAlerts.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">UTC Time</p>
              <p className="text-sm font-bold text-slate-200 font-mono tabular-nums">{formatUtc(clock)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreatCard({ alert, onResolve }: { alert: ThreatAlert; onResolve: (id: string) => void }) {
  const [resolving, setResolving] = useState(false);
  const level = alert.threat_level as ThreatLevel;
  const style = THREAT_STYLES[level] ?? THREAT_STYLES.ELEVATED;
  const ThreatIcon = style.icon;
  const MetricIcon = METRIC_ICONS[alert.metric_type] ?? Activity;

  const handleResolve = async () => {
    setResolving(true);
    await onResolve(alert.id);
    setResolving(false);
  };

  return (
    <div
      className={`relative rounded-xl border ${style.border} bg-slate-900/60 p-4 transition-all duration-300 ${
        alert.is_new ? 'animate-[flash_1.2s_ease-out]' : ''
      } hover:bg-slate-900/80 shadow-lg ${style.glow}`}
      style={alert.is_new ? { animation: 'flash 1.2s ease-out' } : undefined}
    >
      {alert.is_new && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg border ${style.badge} shrink-0`}>
          <ThreatIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border tracking-widest ${style.badge}`}>
              {level}
            </span>
            <span className="flex items-center gap-1 text-xs font-mono font-semibold text-slate-300">
              <MapPin className="w-3 h-3 text-slate-500" />
              {alert.station_id}
            </span>
            {alert.resolved && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <CheckCircle className="w-2.5 h-2.5" />
                RESOLVED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MetricIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono">
              {alert.metric_type}: <span className="text-slate-200 font-semibold">{alert.anomalous_value ?? '—'}</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[10px] text-slate-600 font-mono">
              {new Date(alert.triggered_at).toISOString().replace('T', ' ').slice(0, 19)} UTC · {timeAgo(alert.triggered_at)}
            </span>

            {!alert.resolved && (
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-300 text-[10px] font-semibold hover:bg-slate-700/60 hover:text-white hover:border-slate-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {resolving ? (
                  <Activity className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3" />
                )}
                {resolving ? 'Resolving...' : 'Acknowledge / Resolve'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TestPanel() {
  const [open, setOpen] = useState(false);
  const [stationId, setStationId] = useState('MN-WATER-STATION-04');
  const [metricType, setMetricType] = useState('pressure_psi');
  const [value, setValue] = useState('28.5');
  const [statusFlag, setStatusFlag] = useState('NORMAL');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const presets = [
    { label: 'Low Pressure (Breach)', station: 'MN-WATER-STATION-04', metric: 'pressure_psi', val: '28.5', status: 'NORMAL' },
    { label: 'FAULT Status', station: 'MN-WATER-STATION-07', metric: 'pressure_psi', val: '72.0', status: 'FAULT' },
    { label: 'Normal Reading', station: 'MN-WATER-STATION-04', metric: 'pressure_psi', val: '65.0', status: 'NORMAL' },
    { label: 'Low Flow', station: 'MN-WATER-STATION-12', metric: 'flow_rate_gpm', val: '15.0', status: 'NORMAL' },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setStationId(p.station);
    setMetricType(p.metric);
    setValue(p.val);
    setStatusFlag(p.status);
  };

  const sendTest = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/telemetry-ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          station_id: stationId,
          metric_type: metricType,
          reading_value: parseFloat(value),
          status_flag: statusFlag,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      setResult({ ok: true, message: `Telemetry accepted — record ${data.record?.id?.slice(0, 8) ?? 'unknown'}. Anomaly detector will evaluate automatically.` });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors"
      >
        <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-bold text-slate-300">Quick Test Panel</p>
          <p className="text-[10px] text-slate-600 font-mono">Simulate telemetry to verify end-to-end detection</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800/40">
          <div className="flex flex-wrap gap-1.5 pt-3">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono border border-slate-700/50 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Station</label>
              <input
                type="text"
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-600/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Metric</label>
              <input
                type="text"
                value={metricType}
                onChange={e => setMetricType(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-600/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Value</label>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-600/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Status</label>
              <select
                value={statusFlag}
                onChange={e => setStatusFlag(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-600/50 transition-colors"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="WARNING">WARNING</option>
                <option value="FAULT">FAULT</option>
              </select>
            </div>
          </div>

          <button
            onClick={sendTest}
            disabled={sending || !stationId.trim() || !metricType.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-700/50 bg-amber-900/20 text-amber-300 text-xs font-bold hover:bg-amber-900/30 hover:text-amber-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Transmitting...' : 'Send Test Telemetry'}
          </button>

          {result && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
              result.ok
                ? 'border-emerald-700/40 bg-emerald-900/10 text-emerald-300'
                : 'border-red-700/40 bg-red-900/10 text-red-300'
            }`}>
              {result.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{result.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlashBanner({ alert, onDismiss }: { alert: ThreatAlert; onDismiss: () => void }) {
  const level = alert.threat_level as ThreatLevel;
  const style = THREAT_STYLES[level] ?? THREAT_STYLES.ELEVATED;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[150] animate-[slide-down_0.3s_ease-out]"
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${style.border} bg-slate-950/95`} style={{ backdropFilter: 'blur(12px)' }}>
        <div className={`p-1.5 rounded-lg border ${style.badge} shrink-0`}>
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${level === 'CRITICAL' ? 'text-red-300' : 'text-amber-300'}`}>
            NEW {level} ALERT — {alert.station_id}
          </p>
          <p className="text-[10px] text-slate-500 truncate font-mono">{alert.description}</p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ThreatDashboard() {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashAlert, setFlashAlert] = useState<ThreatAlert | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((alert: ThreatAlert) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashAlert(alert);
    flashTimeoutRef.current = setTimeout(() => setFlashAlert(null), 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      const { data, error } = await supabase
        .from('active_threat_alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load alerts:', error.message);
      } else if (data) {
        setAlerts(data as ThreatAlert[]);
      }
      setLoading(false);
    };

    loadInitial();

    const channel = supabase
      .channel('active_threat_alerts_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'active_threat_alerts' },
        (payload) => {
          const newAlert = { ...(payload.new as ThreatAlert), is_new: true };
          setAlerts(prev => [newAlert, ...prev]);
          showAlert(newAlert);

          setTimeout(() => {
            setAlerts(prev => prev.map(a =>
              a.id === newAlert.id ? { ...a, is_new: false } : a
            ));
          }, 1500);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'active_threat_alerts' },
        (payload) => {
          const updated = payload.new as ThreatAlert;
          setAlerts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated, is_new: false } : a));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showAlert]);

  const handleResolve = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('active_threat_alerts')
      .update({ resolved: true })
      .eq('id', id);

    if (error) {
      console.error('Failed to resolve alert:', error.message);
    }
  }, []);

  const clock = useUtcClock();

  const visibleAlerts = showResolved
    ? alerts
    : alerts.filter(a => !a.resolved);

  const activeCount = alerts.filter(a => !a.resolved).length;
  const criticalCount = alerts.filter(a => !a.resolved && a.threat_level === 'CRITICAL').length;

  return (
    <div className="min-h-full bg-slate-950">
      <style>{`
        @keyframes flash {
          0% { background-color: rgba(239, 68, 68, 0.25); box-shadow: 0 0 30px rgba(239, 68, 68, 0.4); }
          100% { background-color: rgba(15, 23, 42, 0.6); box-shadow: 0 0 0px rgba(0, 0, 0, 0); }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {flashAlert && <FlashBanner alert={flashAlert} onDismiss={() => setFlashAlert(null)} />}

      <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-7xl mx-auto">
        <SystemHeader alerts={alerts} clock={clock} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Total Alerts</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-slate-200 font-mono">{alerts.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Active</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-red-300 font-mono">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Critical</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-amber-300 font-mono">{criticalCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Resolved</p>
            </div>
            <p className="text-xl md:text-2xl font-bold text-emerald-300 font-mono">{alerts.length - activeCount}</p>
          </div>
        </div>

        <TestPanel />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-200">Threat Triage Feed</h2>
              {loading && <Activity className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
            </div>
            <button
              onClick={() => setShowResolved(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 bg-slate-800/40 text-slate-400 text-[10px] font-semibold hover:text-slate-200 hover:border-slate-600 transition-all"
            >
              {showResolved ? 'Hide Resolved' : 'Show Resolved'}
              ({alerts.filter(a => a.resolved).length})
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Activity className="w-6 h-6 text-sky-400 animate-spin" />
              <p className="text-xs text-slate-500 font-mono">Loading threat alerts...</p>
            </div>
          ) : visibleAlerts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-slate-800/40 bg-slate-900/30">
              <div className="p-3 rounded-2xl bg-emerald-900/20 border border-emerald-700/30">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-emerald-300">No Active Threats</p>
              <p className="text-xs text-slate-500 font-mono">All systems nominal. Monitoring in real-time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleAlerts.map(alert => (
                <ThreatCard key={alert.id} alert={alert} onResolve={handleResolve} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
