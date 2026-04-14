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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';

type HazardLevel = 'clear' | 'warning' | 'critical';

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
  color: string;
  thresholds: SensorThreshold;
  nistControl: string;
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
}

interface AlertState {
  id: string;
  type: string;
  level: HazardLevel;
  value: number;
  unit: string;
  timestamp: string;
  acknowledged: boolean;
}

const SENSOR_CONFIGS: HazardSensorConfig[] = [
  {
    id: 'smoke-mq2',
    label: 'Smoke Sensor',
    description: 'MQ-2 — Detects smoke and flammable gases via ADC readings',
    icon: Wind,
    color: 'sky',
    thresholds: { warning: 300, critical: 500, unit: 'ADC' },
    nistControl: 'PE-13',
  },
  {
    id: 'heat-ds18b20',
    label: 'Heat Sensor',
    description: 'DS18B20 — Precision temperature for gradual heat buildup',
    icon: Thermometer,
    color: 'amber',
    thresholds: { warning: 45, critical: 65, unit: '°C' },
    nistControl: 'PE-14',
  },
  {
    id: 'flame-ir',
    label: 'Flame Sensor',
    description: 'IR Flame Detector — Detects infrared light from open flames',
    icon: Flame,
    color: 'red',
    thresholds: { warning: 40, critical: 70, unit: '%IR' },
    nistControl: 'PE-13',
  },
];

function classifyLevel(value: number, thresholds: SensorThreshold): HazardLevel {
  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning) return 'warning';
  return 'clear';
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

function SensorCard({ state, onSimulate }: { state: SensorState; onSimulate: (id: string, scenario: 'nominal' | 'elevated' | 'critical') => void }) {
  const { config, latest, history } = state;
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
            <p className="text-[10px] text-slate-500">{config.id.toUpperCase()}</p>
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

      <div className="flex items-center justify-between pt-2 border-t border-slate-700/20">
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

      {latest && (
        <p className="text-[9px] text-slate-700 mt-2 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {new Date(latest.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function AlertBanner({ alert, onAcknowledge }: { alert: AlertState; onAcknowledge: (id: string) => void }) {
  const cfg = levelConfig(alert.level);
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border} transition-all`}>
      <div className="shrink-0">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${cfg.text}`}>{alert.type.replace(/_/g, ' ')}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Triggered at {alert.value.toFixed(1)} {alert.unit} — {new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700/40 border border-slate-600/40 text-slate-300 hover:bg-slate-700/70 transition-all shrink-0"
        >
          Acknowledge
        </button>
      )}
      {alert.acknowledged && (
        <span className="text-[10px] text-slate-600 shrink-0">Acknowledged</span>
      )}
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
  const [sensorStates, setSensorStates] = useState<SensorState[]>(() =>
    SENSOR_CONFIGS.map(config => ({ config, latest: null, history: [] }))
  );
  const [activeAlerts, setActiveAlerts] = useState<AlertState[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const ingestReading = useCallback(async (sensorId: string, value: number) => {
    const config = SENSOR_CONFIGS.find(c => c.id === sensorId);
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
        location: config.label,
        recorded_at: timestamp,
      });
    }

    setSensorStates(prev => prev.map(s => {
      if (s.config.id !== sensorId) return s;
      return {
        ...s,
        latest: reading,
        history: [...s.history.slice(-49), reading],
      };
    }));

    if (level !== 'clear') {
      const alertType = level === 'critical'
        ? `CRITICAL_${sensorId.replace(/-/g, '_').toUpperCase()}`
        : `WARNING_${sensorId.replace(/-/g, '_').toUpperCase()}`;

      const newAlert: AlertState = {
        id: crypto.randomUUID(),
        type: alertType,
        level,
        value,
        unit: config.thresholds.unit,
        timestamp,
        acknowledged: false,
      };

      setActiveAlerts(prev => [newAlert, ...prev.slice(0, 19)]);

      if (session) {
        await supabase.from('alerts').insert({
          user_id: session.user.id,
          alert_level: level === 'critical' ? 3 : 2,
          alert_type: alertType,
          trigger_conditions: {
            sensor_id: sensorId,
            threshold_warning: config.thresholds.warning,
            threshold_critical: config.thresholds.critical,
          },
          sensor_data_snapshot: { sensor_id: sensorId, value, unit: config.thresholds.unit, timestamp },
          status: 'open',
        });
      }

      await logToAudit(
        alertType,
        `${config.label} value ${value} ${config.thresholds.unit} exceeded ${level} threshold`,
        level === 'critical' ? 'critical' : 'warning'
      );
    }
  }, [session, logToAudit]);

  const handleSimulate = useCallback((sensorId: string, scenario: 'nominal' | 'elevated' | 'critical') => {
    const config = SENSOR_CONFIGS.find(c => c.id === sensorId);
    if (!config) return;
    const value = generateSimValue(config, scenario);
    ingestReading(sensorId, value);
  }, [ingestReading]);

  const simulateAllSensors = useCallback((scenario: 'nominal' | 'elevated' | 'critical' = 'nominal') => {
    SENSOR_CONFIGS.forEach(config => {
      const value = generateSimValue(config, scenario);
      ingestReading(config.id, value);
    });
  }, [ingestReading]);

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

  const acknowledgeAlert = useCallback((id: string) => {
    setActiveAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
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

  return (
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
          <div className="text-xs font-medium text-slate-400 mb-1">Critical Sensors</div>
          <div className={`text-xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>{criticalCount}</div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-1">Warnings</div>
          <div className={`text-xl font-bold ${warningCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{warningCount}</div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-1">Unacknowledged</div>
          <div className={`text-xl font-bold ${unacked > 0 ? 'text-orange-400' : 'text-slate-600'}`}>{unacked}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-800/30 border border-slate-700/40 rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200">Simulate All Sensors</p>
          <p className="text-xs text-slate-500">Inject readings for smoke, heat, and flame sensors simultaneously</p>
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
                ? 'border-sky-700/50 text-sky-400 bg-sky-900/20 hover:bg-sky-900/30'
                : 'border-slate-700/40 text-slate-400 bg-slate-800/30 hover:bg-slate-700/30'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
          </button>
        </div>
      </div>

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
            <AlertTriangle className="w-3 h-3" /> Active Alerts
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
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Hardware Reference</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              sensor: 'MQ-2 Smoke Sensor',
              desc: 'Analog ADC — detects LPG, smoke, alcohol, propane, hydrogen, methane',
              mcu: 'ESP32 ADC pin (GPIO34)',
              nist: 'PE-13',
            },
            {
              sensor: 'DS18B20 Temperature',
              desc: 'Digital one-wire — precise -55°C to +125°C, ±0.5°C accuracy',
              mcu: 'ESP32 GPIO (OneWire library)',
              nist: 'PE-14',
            },
            {
              sensor: 'IR Flame Sensor',
              desc: 'Infrared photodiode detects 760–1100nm flame wavelengths, 60° FOV',
              mcu: 'ESP32 Digital/Analog GPIO',
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
  );
}
