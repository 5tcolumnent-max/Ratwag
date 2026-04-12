import { useState } from 'react';
import { Shield, Activity, Radio, RefreshCw, Wifi } from 'lucide-react';
import type { InfrastructureReading } from '../../lib/database.types';
import {
  buildLatestSensorStates,
  aggregateRiskProfile,
  recordPerimeterScan,
  getRiskLevelClasses,
  type RiskLevel,
} from '../../telemetry/InfrastructureMonitor';
import { useAuth } from '../../lib/authContext';

interface Props {
  readings: InfrastructureReading[];
  onRefresh: () => void;
}

const TYPE_ICONS: Record<string, typeof Shield> = {
  perimeter: Radio,
  network: Wifi,
  thermal: Activity,
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const classes = getRiskLevelClasses(level);
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${classes.bg} ${classes.text} ${classes.border}`}>
      {level}
    </span>
  );
}

function SensorCard({ profile, reading, risk_level }: ReturnType<typeof buildLatestSensorStates>[number]) {
  const classes = getRiskLevelClasses(risk_level);
  const Icon = TYPE_ICONS[profile.sensor_type] || Activity;
  const hasData = reading !== null;

  const gaugeWidth = hasData && reading
    ? Math.min(
        ((reading.value - 0) /
          (profile.thresholds.high * 1.2 - 0)) *
          100,
        100
      )
    : 0;

  return (
    <div className={`bg-slate-800/20 border rounded-xl p-4 transition-all duration-300 ${classes.border} ${hasData ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${classes.bg} border ${classes.border}`}>
            <Icon className={`w-3.5 h-3.5 ${classes.text}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">{profile.sensor_id}</p>
            <p className="text-[10px] text-slate-500">{profile.location}</p>
          </div>
        </div>
        <RiskBadge level={risk_level} />
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold font-mono ${hasData ? classes.text : 'text-slate-600'}`}>
            {hasData && reading ? reading.value.toFixed(1) : '--'}
          </span>
          <span className="text-xs text-slate-500">{profile.unit}</span>
        </div>
        <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              risk_level === 'critical'
                ? 'bg-red-500'
                : risk_level === 'high'
                ? 'bg-amber-500'
                : risk_level === 'medium'
                ? 'bg-yellow-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${gaugeWidth}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-600 mt-1">
          <span>0</span>
          <span className="text-slate-600">Low: {profile.thresholds.low}</span>
          <span className="text-amber-700">Med: {profile.thresholds.medium}</span>
          <span className="text-red-700">High: {profile.thresholds.high}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-slate-600" />
          <span className="text-[10px] text-slate-600 font-mono">{profile.nist_control}</span>
          <span className="text-[10px] text-slate-600">— {profile.nist_description}</span>
        </div>
      </div>

      {reading && (
        <p className="text-[9px] text-slate-600 mt-1">
          Last: {new Date(reading.recorded_at).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export default function InfrastructureTelemetry({ readings, onRefresh }: Props) {
  const { session } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scenario, setScenario] = useState<'nominal' | 'elevated' | 'critical'>('nominal');

  const sensorStates = buildLatestSensorStates(readings);
  const riskProfile = aggregateRiskProfile(readings);

  const overallClasses = getRiskLevelClasses(riskProfile.overall);

  const handleScan = async () => {
    if (!session) return;
    setScanning(true);
    try {
      await recordPerimeterScan(session.user.id, scenario);
      onRefresh();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`bg-slate-800/30 border ${overallClasses.border} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${overallClasses.dot} animate-pulse`} />
            <span className="text-xs font-medium text-slate-400">Overall Risk</span>
          </div>
          <div className={`text-xl font-bold uppercase ${overallClasses.text}`}>
            {riskProfile.overall}
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-1">NIST Compliance</div>
          <div className={`text-xl font-bold ${riskProfile.nistComplianceScore >= 80 ? 'text-emerald-400' : riskProfile.nistComplianceScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {riskProfile.nistComplianceScore}%
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-1">Active Sensors</div>
          <div className="text-xl font-bold text-white">{riskProfile.activeSensors} / 6</div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-1">Alerts (C/H/M/L)</div>
          <div className="text-sm font-mono font-bold text-white mt-1">
            <span className="text-red-400">{riskProfile.criticalCount}</span>
            {' / '}
            <span className="text-amber-400">{riskProfile.highCount}</span>
            {' / '}
            <span className="text-yellow-400">{riskProfile.mediumCount}</span>
            {' / '}
            <span className="text-emerald-400">{riskProfile.lowCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-800/30 border border-slate-700/40 rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">Simulate Perimeter Scan</p>
          <p className="text-xs text-slate-500">Injects new telemetry readings for all 6 sensors</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={scenario}
            onChange={e => setScenario(e.target.value as typeof scenario)}
            className="bg-slate-900/60 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="nominal">Nominal</option>
            <option value="elevated">Elevated</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-900/20 hover:bg-sky-900/30 border border-sky-800/40 hover:border-sky-700/50 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Sensor Grid — 15m Perimeter + Infrastructure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sensorStates.map(state => (
            <SensorCard key={state.profile.sensor_id} {...state} />
          ))}
        </div>
      </div>

      {readings.length === 0 && (
        <div className="text-center py-6 text-slate-500 text-sm">
          No telemetry data. Run a perimeter scan to initialize sensor readings.
        </div>
      )}
    </div>
  );
}
