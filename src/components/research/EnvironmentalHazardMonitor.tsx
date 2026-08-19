import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame,
  Thermometer,
  Wind,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Activity,
  Zap,
  Shield,
  Clock,
  Info,
  Volume2,
  VolumeX,
  Settings,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';

type HazardLevel = 'clear' | 'warning' | 'critical';
type HeartbeatStatus = 'online' | 'stale' | 'offline';

interface SensorThreshold {
  warning: number;
  critical: number;
  unit: string;
}

interface HazardSensorConfig {
  id: string;
  label: string;
  description: string;
  icon: typeof Flame;
  thresholds: SensorThreshold;
  nistControl: string;
  zone: string;
}

interface SensorReading {
  value: number;
  level: HazardLevel;
  timestamp: string;
}

interface SensorState {
  config: HazardSensorConfig;
  latest: SensorReading | null;
  history: SensorReading[];
  heartbeat: HeartbeatStatus;
  lastHeartbeatAt: string | null;
}

interface AlertState {
  id: string;
  sensorId: string;
  sensorLabel: string;
  zone: string;
  type: string;
  level: HazardLevel;
  value: number;
  unit: string;
  timestamp: string;
  acknowledged: boolean;
}

const DEFAULT_CONFIGS: HazardSensorConfig[] = [
  {
    id: 'smoke-mq2',
    label: 'Smoke Sensor',
    description: 'MQ-2 — Detects smoke and flammable gases via ADC readings',
    icon: Wind,
    thresholds: { warning: 300, critical: 500, unit: 'ADC' },
    nistControl: 'PE-13',
    zone: 'Zone 1',
  },
  {
    id: 'heat-ds18b20',
    label: 'Heat Sensor',
    description: 'DS18B20 — Precision temperature for gradual heat buildup',
    icon: Thermometer,
    thresholds: { warning: 45, critical: 65, unit: '°C' },
    nistControl: 'PE-14',
    zone: 'Zone 1',
  },
  {
    id: 'flame-ir',
    label: 'Flame Sensor',
    description: 'IR Flame Detector — Detects infrared light from open flames',
    icon: Flame,
    thresholds: { warning: 40, critical: 70, unit: '%IR' },
    nistControl: 'PE-13',
    zone: 'Zone 2',
  },
];

const HEARTBEAT_STALE_MS = 15000;
const HEARTBEAT_OFFLINE_MS = 45000;

function classifyLevel(value: number, thresholds: SensorThreshold): HazardLevel {
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning) return 'warning';
  return 'clear';
}

function getHeartbeatStatus(lastHeartbeatAt: string | null): HeartbeatStatus {
  if (!lastHeartbeatAt) return 'offline';
  const age = Date.now() - new Date(lastHeartbeatAt).getTime();
  if (age > HEARTBEAT_OFFLINE_MS) return 'offline';
  if (age > HEARTBEAT_STALE_MS) return 'stale';
  return 'online';
}

function levelConfig(level: HazardLevel) {
  switch (level) {
    case 'critical':
      return {
        text: 'text-red-400',
        bg: 'bg-red-900/20',
        border: 'border-red-700/50',
        bar: 'bg-red-500',
        badge: 'bg-red-900/30 border-red-700/50 text-red-300',
        icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
        dot: 'bg-red-400',
        label: 'CRITICAL',
      };
    case 'warning':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-900/20',
        border: 'border-amber-700/40',
        bar: 'bg-amber-500',
        badge: 'bg-amber-900/20 border-amber-700/40 text-amber-300',
        icon: <Info className="w-4 h-4 text-amber-400" />,
        dot: 'bg-amber-400',
        label: 'WARNING',
      };
    default:
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-900/10',
        border: 'border-emerald-700/30',
        bar: 'bg-emerald-500',
        badge: 'bg-emerald-900/20 border-emerald-700/30 text-emerald-300',
        icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
        dot: 'bg-emerald-400',
        label: 'CLEAR',
      };
  }
}

function speakAlarm(message: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function CriticalOverlay({ alert, onDismiss }: { alert: AlertState; onDismiss: () => void }) {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-red-950/97 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.25) 0%, transparent 70%)',
            opacity: blink ? 1 : 0.3,
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
      </div>

      <div className="relative text-center px-8 max-w-2xl w-full">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-red-500 mb-6 transition-all duration-500 ${blink ? 'bg-red-500/30 scale-105' : 'bg-red-900/30 scale-100'}`}>
          <AlertTriangle className="w-12 h-12 text-red-400" />
        </div>

        <div className={`text-6xl md:text-8xl font-black tracking-widest text-red-400 mb-2 font-mono transition-opacity duration-300 ${blink ? 'opacity-100' : 'opacity-60'}`}>
          ALERT
        </div>

        <div className="text-xl md:text-3xl font-bold text-white mb-2 uppercase tracking-wide">
          {alert.sensorLabel} — {alert.zone}
        </div>

        <div className="text-base md:text-lg text-red-300 font-mono mb-6">
          {alert.type.replace(/_/g, ' ')} &nbsp;|&nbsp; {alert.value.toFixed(1)} {alert.unit}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-red-400/70 mb-8">
          <Clock className="w-4 h-4" />
          <span>{new Date(alert.timestamp).toLocaleString()}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onDismiss}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all border border-red-400/40 shadow-lg shadow-red-900/50"
          >
            <X className="w-4 h-4" />
            Acknowledge & Dismiss
          </button>
        </div>

        <p className="text-[11px] text-red-700 mt-6 font-mono">
          Logged to audit trail &nbsp;|&nbsp; NIST PE-13/PE-14 &nbsp;|&nbsp; DOE-Genesis Safety Record
        </p>
      </div>
    </div>
  );
}

function SparklineBar({ history, thresholds }: { history: SensorReading[]; thresholds: SensorThreshold }) {
  const max = thresholds.critical * 1.3;
  const bars = history.slice(-20);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((r, i) => {
        const h = Math.max(4, Math.round((r.value / max) * 100));
        const cfg = levelConfig(r.level);
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${cfg.bar} opacity-70 transition-all`}
            style={{ height: `${Math.min(h, 100)}%` }}
          />
        );
      })}
      {bars.length === 0 && (
        <div className="w-full flex items-center justify-center">
          <span className="text-[9px] text-slate-700">No data</span>
        </div>
      )}
    </div>
  );
}

function HeartbeatDot({ status }: { status: HeartbeatStatus }) {
  const styles = {
    online: 'bg-emerald-400 shadow-emerald-400/50',
    stale: 'bg-amber-400 shadow-amber-400/50',
    offline: 'bg-slate-600',
  };
  const labels = { online: 'Online', stale: 'Stale', offline: 'Offline' };
  return (
    <div className="flex items-center gap-1.5">
      {status === 'offline'
        ? <WifiOff className="w-3 h-3 text-slate-600" />
        : <Wifi className={`w-3 h-3 ${status === 'online' ? 'text-emerald-400' : 'text-amber-400'}`} />
      }
      <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${styles[status]} ${status === 'online' ? 'animate-pulse' : ''}`} />
      <span className={`text-[9px] font-mono uppercase ${status === 'online' ? 'text-emerald-500' : status === 'stale' ? 'text-amber-500' : 'text-slate-600'}`}>
        {labels[status]}
      </span>
    </div>
  );
}

function SensorCard({
  state,
  onSimulate,
}: {
  state: SensorState;
  onSimulate: (id: string, scenario: 'nominal' | 'elevated' | 'critical') => void;
}) {
  const { config, latest, history, heartbeat, lastHeartbeatAt } = state;
  const Icon = config.icon;
  const level = latest?.level ?? 'clear';
  const cfg = levelConfig(level);
  const gaugeMax = config.thresholds.critical * 1.3;
  const gaugeWidth = latest ? Math.min((latest.value / gaugeMax) * 100, 100) : 0;

  return (
    <div className={`bg-slate-800/20 border rounded-xl p-4 transition-all duration-300 ${cfg.border}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${cfg.bg} border ${cfg.border}`}>
            <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">{config.label}</p>
            <p className="text-[10px] text-slate-500">{config.zone} · {config.id.toUpperCase()}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border tracking-wider ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-1 mb-1">
          <span className={`text-2xl font-bold font-mono ${latest ? cfg.text : 'text-slate-600'}`}>
            {latest ? latest.value.toFixed(1) : '--'}
          </span>
          <span className="text-xs text-slate-500">{config.thresholds.unit}</span>
        </div>
        <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
            style={{ width: `${gaugeWidth}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-600 mt-1">
          <span>0</span>
          <span className="text-amber-700">Warn: {config.thresholds.warning}</span>
          <span className="text-red-700">Crit: {config.thresholds.critical}</span>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Recent History</p>
        <SparklineBar history={history} thresholds={config.thresholds} />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-700/20 mb-2">
        <HeartbeatDot status={heartbeat} />
        {lastHeartbeatAt && (
          <span className="text-[9px] text-slate-700 font-mono">
            {new Date(lastHeartbeatAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-slate-600" />
          <span className="text-[10px] text-slate-600 font-mono">{config.nistControl}</span>
        </div>
        <div className="flex gap-1">
          {(['nominal', 'elevated', 'critical'] as const).map(s => (
            <button
              key={s}
              onClick={() => onSimulate(config.id, s)}
              className={`text-[9px] px-1.5 py-0.5 rounded border font-medium transition-all ${
                s === 'critical'
                  ? 'border-red-800/40 text-red-500 hover:bg-red-900/20'
                  : s === 'elevated'
                  ? 'border-amber-800/40 text-amber-500 hover:bg-amber-900/20'
                  : 'border-slate-700/40 text-slate-500 hover:bg-slate-700/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ alert, onAcknowledge }: { alert: AlertState; onAcknowledge: (id: string) => void }) {
  const cfg = levelConfig(alert.level);
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border} transition-all`}>
      <div className="shrink-0">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${cfg.text}`}>
          {alert.sensorLabel} — {alert.zone}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {alert.type.replace(/_/g, ' ')} · {alert.value.toFixed(1)} {alert.unit} · {new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
      {!alert.acknowledged ? (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-300 hover:bg-slate-700/70 transition-all shrink-0"
        >
          Acknowledge
        </button>
      ) : (
        <span className="text-[10px] text-slate-600 shrink-0">Acked</span>
      )}
    </div>
  );
}

function CalibrationPanel({
  configs,
  onChange,
  onClose,
}: {
  configs: HazardSensorConfig[];
  onChange: (id: string, field: 'warning' | 'critical', value: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">Threshold Calibration</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Tune warning and critical levels to reduce false positives</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {configs.map(cfg => (
        <div key={cfg.id} className="bg-slate-900/40 border border-slate-700/20 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <cfg.icon className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-300">{cfg.label}</p>
            <span className="text-[10px] text-slate-600 font-mono ml-auto">{cfg.thresholds.unit}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-amber-500 uppercase tracking-widest block mb-1">Warning</label>
              <input
                type="number"
                value={cfg.thresholds.warning}
                onChange={e => onChange(cfg.id, 'warning', Number(e.target.value))}
                className="w-full bg-slate-800/60 border border-amber-800/40 rounded-lg px-3 py-1.5 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-600/60"
              />
            </div>
            <div>
              <label className="text-[10px] text-red-500 uppercase tracking-widest block mb-1">Critical</label>
              <input
                type="number"
                value={cfg.thresholds.critical}
                onChange={e => onChange(cfg.id, 'critical', Number(e.target.value))}
                className="w-full bg-slate-800/60 border border-red-800/40 rounded-lg px-3 py-1.5 text-sm font-mono text-red-300 focus:outline-none focus:border-red-600/60"
              />
            </div>
          </div>

          <div className="relative h-3 bg-slate-700/50 rounded-full overflow-visible">
            <div
              className="absolute top-0 bottom-0 bg-amber-500/30 rounded-l-full"
              style={{ left: 0, width: `${(cfg.thresholds.warning / (cfg.thresholds.critical * 1.3)) * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 bg-red-500/30"
              style={{
                left: `${(cfg.thresholds.warning / (cfg.thresholds.critical * 1.3)) * 100}%`,
                width: `${((cfg.thresholds.critical - cfg.thresholds.warning) / (cfg.thresholds.critical * 1.3)) * 100}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-900 shadow"
              style={{ left: `calc(${(cfg.thresholds.warning / (cfg.thresholds.critical * 1.3)) * 100}% - 5px)` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-slate-900 shadow"
              style={{ left: `calc(${(cfg.thresholds.critical / (cfg.thresholds.critical * 1.3)) * 100}% - 5px)` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function generateSimValue(config: HazardSensorConfig, scenario: 'nominal' | 'elevated' | 'critical'): number {
  const { warning, critical } = config.thresholds;
  const ranges = {
    nominal: [0, warning * 0.6],
    elevated: [warning * 0.7, warning * 1.1],
    critical: [warning * 1.2, critical * 1.2],
  };
  const [min, max] = ranges[scenario];
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

export default function EnvironmentalHazardMonitor() {
  const { session } = useAuth();
  const [configs, setConfigs] = useState<HazardSensorConfig[]>(DEFAULT_CONFIGS);
  const [sensorStates, setSensorStates] = useState<SensorState[]>(() =>
    DEFAULT_CONFIGS.map(config => ({
      config,
      latest: null,
      history: [],
      heartbeat: 'offline' as HeartbeatStatus,
      lastHeartbeatAt: null,
    }))
  );
  const [activeAlerts, setActiveAlerts] = useState<AlertState[]>([]);
  const [criticalOverlay, setCriticalOverlay] = useState<AlertState | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showCalibration, setShowCalibration] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logToAudit = useCallback(async (action: string, detail: string, severity = 'info') => {
    if (!session) return;
    await supabase.from('audit_log_entries').insert({
      user_id: session.user.id,
      module: 'EnvironmentalHazardMonitor',
      action,
      detail,
      severity,
    });
  }, [session]);

  const ingestReading = useCallback(async (sensorId: string, value: number, currentConfigs: HazardSensorConfig[]) => {
    const config = currentConfigs.find(c => c.id === sensorId);
    if (!config) return;

    const level = classifyLevel(value, config.thresholds);
    const timestamp = new Date().toISOString();
    const reading: SensorReading = { value, level, timestamp };

    if (session) {
      await supabase.from('sensor_readings').insert({
        user_id: session.user.id,
        sensor_type: sensorId,
        value,
        unit: config.thresholds.unit,
        location: `${config.label} · ${config.zone}`,
        recorded_at: timestamp,
      });
    }

    setSensorStates(prev => prev.map(s => {
      if (s.config.id !== sensorId) return s;
      return {
        ...s,
        latest: reading,
        history: [...s.history.slice(-49), reading],
        heartbeat: 'online',
        lastHeartbeatAt: timestamp,
      };
    }));

    if (level !== 'clear') {
      const alertType = level === 'critical'
        ? `CRITICAL_${sensorId.replace(/-/g, '_').toUpperCase()}`
        : `WARNING_${sensorId.replace(/-/g, '_').toUpperCase()}`;

      const newAlert: AlertState = {
        id: crypto.randomUUID(),
        sensorId,
        sensorLabel: config.label,
        zone: config.zone,
        type: alertType,
        level,
        value,
        unit: config.thresholds.unit,
        timestamp,
        acknowledged: false,
      };

      setActiveAlerts(prev => [newAlert, ...prev.slice(0, 19)]);

      if (level === 'critical') {
        setCriticalOverlay(newAlert);
        if (audioEnabled) {
          speakAlarm(`Fire Alert! Critical ${config.label} reading in ${config.zone}. Value: ${value.toFixed(0)} ${config.thresholds.unit}. Evacuate immediately.`);
        }
      } else if (audioEnabled) {
        speakAlarm(`Warning. Elevated ${config.label} reading in ${config.zone}.`);
      }

      if (session) {
        await supabase.from('alerts').insert({
          user_id: session.user.id,
          alert_level: level === 'critical' ? 3 : 2,
          alert_type: alertType,
          trigger_conditions: {
            sensor_id: sensorId,
            zone: config.zone,
            threshold_warning: config.thresholds.warning,
            threshold_critical: config.thresholds.critical,
          },
          sensor_data_snapshot: {
            sensor_id: sensorId,
            value,
            unit: config.thresholds.unit,
            timestamp,
            zone: config.zone,
          },
          status: 'open',
        });
      }

      await logToAudit(
        alertType,
        `[${config.zone}] ${config.label} — ${value.toFixed(1)} ${config.thresholds.unit} exceeded ${level} threshold (warn:${config.thresholds.warning}, crit:${config.thresholds.critical})`,
        level === 'critical' ? 'critical' : 'warning'
      );
    }
  }, [session, logToAudit, audioEnabled]);

  const handleSimulate = useCallback((sensorId: string, scenario: 'nominal' | 'elevated' | 'critical') => {
    const config = configs.find(c => c.id === sensorId);
    if (!config) return;
    const value = generateSimValue(config, scenario);
    ingestReading(sensorId, value, configs);
  }, [ingestReading, configs]);

  const simulateAllSensors = useCallback((scenario: 'nominal' | 'elevated' | 'critical' = 'nominal') => {
    configs.forEach(config => {
      const value = generateSimValue(config, scenario);
      ingestReading(config.id, value, configs);
    });
  }, [ingestReading, configs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => simulateAllSensors('nominal'), 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, simulateAllSensors]);

  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      setSensorStates(prev => prev.map(s => ({
        ...s,
        heartbeat: getHeartbeatStatus(s.lastHeartbeatAt),
      })));
    }, 5000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setActiveAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    if (criticalOverlay?.id === id) setCriticalOverlay(null);
  }, [criticalOverlay]);

  const dismissOverlay = useCallback(() => {
    if (criticalOverlay) {
      acknowledgeAlert(criticalOverlay.id);
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, [criticalOverlay, acknowledgeAlert]);

  const handleThresholdChange = useCallback((id: string, field: 'warning' | 'critical', value: number) => {
    setConfigs(prev => prev.map(c =>
      c.id === id ? { ...c, thresholds: { ...c.thresholds, [field]: value } } : c
    ));
    setSensorStates(prev => prev.map(s =>
      s.config.id === id
        ? { ...s, config: { ...s.config, thresholds: { ...s.config.thresholds, [field]: value } } }
        : s
    ));
  }, []);

  const overallLevel: HazardLevel = sensorStates.some(s => s.latest?.level === 'critical')
    ? 'critical'
    : sensorStates.some(s => s.latest?.level === 'warning')
    ? 'warning'
    : 'clear';

  const overallCfg = levelConfig(overallLevel);
  const unacked = activeAlerts.filter(a => !a.acknowledged).length;
  const criticalCount = sensorStates.filter(s => s.latest?.level === 'critical').length;
  const warningCount = sensorStates.filter(s => s.latest?.level === 'warning').length;
  const offlineSensors = sensorStates.filter(s => s.heartbeat === 'offline').length;

  return (
    <>
      {criticalOverlay && (
        <CriticalOverlay alert={criticalOverlay} onDismiss={dismissOverlay} />
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`bg-slate-800/30 border ${overallCfg.border} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${overallCfg.dot} ${overallLevel !== 'clear' ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-medium text-slate-400">Overall Status</span>
            </div>
            <div className={`text-xl font-bold uppercase ${overallCfg.text}`}>{overallLevel}</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 mb-1">Critical</div>
            <div className={`text-xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>{criticalCount}</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 mb-1">Warnings</div>
            <div className={`text-xl font-bold ${warningCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{warningCount}</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 mb-1">Sensors Offline</div>
            <div className={`text-xl font-bold ${offlineSensors > 0 ? 'text-slate-400' : 'text-slate-600'}`}>{offlineSensors}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-800/30 border border-slate-700/40 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200">Sensor Controls</p>
            <p className="text-xs text-slate-500">Simulate sensor inputs · Toggle audio alarms · Calibrate thresholds</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['nominal', 'elevated', 'critical'] as const).map(s => (
              <button
                key={s}
                onClick={() => simulateAllSensors(s)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                  s === 'critical'
                    ? 'border-red-800/50 text-red-400 bg-red-900/20 hover:bg-red-900/30'
                    : s === 'elevated'
                    ? 'border-amber-800/50 text-amber-400 bg-amber-900/20 hover:bg-amber-900/30'
                    : 'border-slate-700/40 text-slate-400 bg-slate-800/30 hover:bg-slate-700/30'
                }`}
              >
                <Zap className="w-3 h-3" />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <button
              onClick={() => setAutoRefresh(r => !r)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                autoRefresh
                  ? 'border-sky-700/50 text-sky-400 bg-sky-900/20'
                  : 'border-slate-700/40 text-slate-400 bg-slate-800/30 hover:bg-slate-700/30'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
            </button>
            <button
              onClick={() => setAudioEnabled(a => !a)}
              title={audioEnabled ? 'Mute audio alarms' : 'Enable audio alarms'}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                audioEnabled
                  ? 'border-emerald-700/50 text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30'
                  : 'border-slate-700/40 text-slate-500 bg-slate-800/30 hover:bg-slate-700/30'
              }`}
            >
              {audioEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              {audioEnabled ? 'Audio: ON' : 'Audio: OFF'}
            </button>
            <button
              onClick={() => setShowCalibration(c => !c)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                showCalibration
                  ? 'border-sky-700/50 text-sky-400 bg-sky-900/20'
                  : 'border-slate-700/40 text-slate-400 bg-slate-800/30 hover:bg-slate-700/30'
              }`}
            >
              <Settings className="w-3 h-3" />
              Calibrate
            </button>
          </div>
        </div>

        {showCalibration && (
          <CalibrationPanel
            configs={configs}
            onChange={handleThresholdChange}
            onClose={() => setShowCalibration(false)}
          />
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3" /> Sensor Grid
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sensorStates.map(state => (
              <SensorCard key={state.config.id} state={state} onSimulate={handleSimulate} />
            ))}
          </div>
        </div>

        {activeAlerts.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Alert Log
              {unacked > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-900/40 border border-red-700/40 text-red-400">
                  {unacked} unacked
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {activeAlerts.map(alert => (
                <AlertBanner key={alert.id} alert={alert} onAcknowledge={acknowledgeAlert} />
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Hardware Integration Reference</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                sensor: 'MQ-2 Smoke Sensor',
                desc: 'Analog ADC — detects LPG, smoke, alcohol, propane, hydrogen, methane. Shield from direct wind.',
                mcu: 'ESP32 GPIO34 (ADC1_CH6)',
                nist: 'PE-13',
              },
              {
                sensor: 'DS18B20 Temperature',
                desc: 'Digital one-wire — precise -55°C to +125°C, ±0.5°C. Mount high, away from ventilation.',
                mcu: 'ESP32 OneWire + pull-up 4.7kΩ',
                nist: 'PE-14',
              },
              {
                sensor: 'IR Flame Sensor',
                desc: 'Photodiode 760–1100nm, 60° FOV. Shield from moisture. Position facing potential ignition areas.',
                mcu: 'ESP32 GPIO32 (digital) or ADC',
                nist: 'PE-13',
              },
            ].map(({ sensor, desc, mcu, nist }) => (
              <div key={sensor} className="bg-slate-900/40 border border-slate-700/20 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-200">{sensor}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-600 font-mono">{mcu}</span>
                  <span className="text-sky-700 font-mono">{nist}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
