import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Navigation,
  Battery,
  Wifi,
  Thermometer,
  RefreshCw,
  MapPin,
  Activity,
  Radio,
  ArrowUp,
  Waves,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Wind,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';

type DroneType = 'aerial' | 'aquatic';
type DroneStatus = 'standby' | 'active' | 'returning' | 'emergency' | 'offline';

interface DroneTelemetry {
  droneId: string;
  droneType: DroneType;
  status: DroneStatus;
  battery: number;
  latitude: number;
  longitude: number;
  altitudeM: number;
  depthM: number;
  headingDeg: number;
  speedMs: number;
  signal: number;
  lidarRangeM: number;
  sonarDepthM: number;
  obstacleDetected: boolean;
  obstacleDistanceM: number | null;
  temperatureC: number;
  payloadActive: boolean;
  missionId: string;
}

const INITIAL_TELEMETRY: Record<string, DroneTelemetry> = {
  'AER-01': {
    droneId: 'AER-01', droneType: 'aerial', status: 'active',
    battery: 78, latitude: 38.897957, longitude: -77.036560,
    altitudeM: 42.5, depthM: 0, headingDeg: 127,
    speedMs: 12.3, signal: 94, lidarRangeM: 85.2,
    sonarDepthM: 0, obstacleDetected: false, obstacleDistanceM: null,
    temperatureC: 18.4, payloadActive: true, missionId: 'MSNS-2026-001',
  },
  'AER-02': {
    droneId: 'AER-02', droneType: 'aerial', status: 'standby',
    battery: 100, latitude: 38.899100, longitude: -77.035200,
    altitudeM: 0, depthM: 0, headingDeg: 0,
    speedMs: 0, signal: 100, lidarRangeM: 0,
    sonarDepthM: 0, obstacleDetected: false, obstacleDistanceM: null,
    temperatureC: 22.1, payloadActive: false, missionId: 'MSNS-2026-001',
  },
  'AQU-01': {
    droneId: 'AQU-01', droneType: 'aquatic', status: 'active',
    battery: 63, latitude: 38.896200, longitude: -77.038400,
    altitudeM: 0, depthM: 14.7, headingDeg: 214,
    speedMs: 3.1, signal: 71, lidarRangeM: 0,
    sonarDepthM: 31.8, obstacleDetected: true, obstacleDistanceM: 4.2,
    temperatureC: 9.8, payloadActive: true, missionId: 'MSNS-2026-002',
  },
  'AQU-02': {
    droneId: 'AQU-02', droneType: 'aquatic', status: 'returning',
    battery: 21, latitude: 38.895800, longitude: -77.037100,
    altitudeM: 0, depthM: 2.3, headingDeg: 45,
    speedMs: 5.8, signal: 58, lidarRangeM: 0,
    sonarDepthM: 2.3, obstacleDetected: false, obstacleDistanceM: null,
    temperatureC: 11.2, payloadActive: false, missionId: 'MSNS-2026-002',
  },
};

function statusColor(s: DroneStatus) {
  switch (s) {
    case 'active': return 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40';
    case 'returning': return 'text-amber-400 bg-amber-900/20 border-amber-700/40';
    case 'emergency': return 'text-red-400 bg-red-900/20 border-red-700/40';
    case 'offline': return 'text-slate-600 bg-slate-800/20 border-slate-700/30';
    default: return 'text-sky-400 bg-sky-900/20 border-sky-700/40';
  }
}

function batteryColor(pct: number) {
  if (pct > 60) return 'bg-emerald-500';
  if (pct > 25) return 'bg-amber-500';
  return 'bg-red-500';
}

function signalColor(pct: number) {
  if (pct > 70) return 'text-emerald-400';
  if (pct > 40) return 'text-amber-400';
  return 'text-red-400';
}

function CompassRose({ heading }: { heading: number }) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return (
    <div className="relative w-20 h-20 shrink-0">
      <div className="absolute inset-0 rounded-full border border-slate-600/40 bg-slate-900/60" />
      {dirs.map((dir, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const r = 30;
        const x = 40 + r * Math.sin(angle);
        const y = 40 - r * Math.cos(angle);
        return (
          <span
            key={dir}
            className={`absolute text-[8px] font-bold transform -translate-x-1/2 -translate-y-1/2 ${dir === 'N' ? 'text-red-400' : 'text-slate-600'}`}
            style={{ left: x, top: y }}
          >
            {dir}
          </span>
        );
      })}
      <div
        className="absolute w-0.5 h-7 bg-red-500 rounded-full origin-bottom"
        style={{
          left: '50%',
          top: '10px',
          marginLeft: '-1px',
          transform: `rotate(${heading}deg)`,
          transformOrigin: 'bottom center',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-slate-400" />
      </div>
    </div>
  );
}

function LidarSweep({ rangeM, obstacleDetected, obstacleDistanceM }: {
  rangeM: number;
  obstacleDetected: boolean;
  obstacleDistanceM: number | null;
}) {
  const [sweepAngle, setSweepAngle] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSweepAngle(a => (a + 3) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const cx = 60;
  const cy = 60;
  const r = 50;

  const obstacleDots = obstacleDetected && obstacleDistanceM
    ? [{ angle: 45, dist: (obstacleDistanceM / rangeM) * r }]
    : [];

  return (
    <svg width="120" height="120" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(51,65,85)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="rgb(51,65,85)" strokeWidth="0.5" strokeDasharray="3,3" />
      <circle cx={cx} cy={cy} r={r * 0.33} fill="none" stroke="rgb(51,65,85)" strokeWidth="0.5" strokeDasharray="3,3" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="rgb(51,65,85)" strokeWidth="0.5" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="rgb(51,65,85)" strokeWidth="0.5" />
      <path
        d={`M ${cx} ${cy} L ${cx + r * Math.sin((sweepAngle * Math.PI) / 180)} ${cy - r * Math.cos((sweepAngle * Math.PI) / 180)} A ${r} ${r} 0 0 1 ${cx + r * Math.sin(((sweepAngle - 60) * Math.PI) / 180)} ${cy - r * Math.cos(((sweepAngle - 60) * Math.PI) / 180)} Z`}
        fill="rgba(14,165,233,0.08)"
      />
      <line
        x1={cx}
        y1={cy}
        x2={cx + r * Math.sin((sweepAngle * Math.PI) / 180)}
        y2={cy - r * Math.cos((sweepAngle * Math.PI) / 180)}
        stroke="rgb(14,165,233)"
        strokeWidth="1.5"
        opacity="0.8"
      />
      {obstacleDots.map((dot, i) => (
        <circle
          key={i}
          cx={cx + dot.dist * Math.sin((dot.angle * Math.PI) / 180)}
          cy={cy - dot.dist * Math.cos((dot.angle * Math.PI) / 180)}
          r="3"
          fill="rgb(239,68,68)"
          opacity="0.9"
        />
      ))}
      <circle cx={cx} cy={cy} r="2" fill="rgb(14,165,233)" />
      <text x={cx} y={cy + r + 10} textAnchor="middle" fontSize="8" fill="rgb(100,116,139)">
        {rangeM > 0 ? `${rangeM.toFixed(0)}m range` : 'inactive'}
      </text>
    </svg>
  );
}

function SonarDisplay({ depthM, maxDepthM }: { depthM: number; maxDepthM: number }) {
  const [pingOffset, setPingOffset] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setPingOffset(p => (p + 2) % 100), 50);
    return () => clearInterval(i);
  }, []);

  const points = Array.from({ length: 20 }, (_, i) => {
    const x = (i / 19) * 160;
    const noise = Math.sin(i * 0.8 + pingOffset * 0.1) * 8 + Math.sin(i * 1.4) * 4;
    const y = 15 + (depthM / maxDepthM) * 30 + noise;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="160" height="60" className="shrink-0">
      <rect width="160" height="60" fill="none" />
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1="0" y1={f * 55} x2="160" y2={f * 55} stroke="rgb(30,41,59)" strokeWidth="0.5" />
      ))}
      <polyline
        points={points}
        fill="none"
        stroke="rgb(14,165,233)"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <polygon
        points={`0,60 ${points.split(' ').map((p, i) => p).join(' ')} 160,60`}
        fill="rgba(14,165,233,0.08)"
      />
      <text x="2" y="10" fontSize="7" fill="rgb(100,116,139)">0m</text>
      <text x="2" y="58" fontSize="7" fill="rgb(100,116,139)">{maxDepthM}m</text>
    </svg>
  );
}

function DroneCard({ telemetry, onStatusChange }: {
  telemetry: DroneTelemetry;
  onStatusChange: (id: string, status: DroneStatus) => void;
}) {
  const isAerial = telemetry.droneType === 'aerial';

  return (
    <div className={`bg-slate-800/20 border rounded-xl overflow-hidden transition-all ${
      telemetry.status === 'emergency' ? 'border-red-700/50 shadow-red-900/20 shadow-lg' :
      telemetry.obstacleDetected ? 'border-amber-700/40' : 'border-slate-700/30'
    }`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/20">
        <div className="flex items-center gap-2">
          {isAerial ? <Wind className="w-4 h-4 text-sky-400" /> : <Waves className="w-4 h-4 text-cyan-400" />}
          <span className="text-sm font-bold text-white font-mono">{telemetry.droneId}</span>
          <span className="text-[10px] text-slate-500 capitalize">{telemetry.droneType}</span>
        </div>
        <div className="flex items-center gap-2">
          {telemetry.obstacleDetected && (
            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 bg-red-900/20 border border-red-700/30 px-1.5 py-0.5 rounded animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" /> OBSTACLE
            </span>
          )}
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusColor(telemetry.status)}`}>
            {telemetry.status}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Battery className="w-2.5 h-2.5" /> Battery
            </p>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${batteryColor(telemetry.battery)} transition-all`} style={{ width: `${telemetry.battery}%` }} />
              </div>
              <span className={`text-xs font-bold font-mono ${telemetry.battery <= 25 ? 'text-red-400' : telemetry.battery <= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {telemetry.battery}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" /> Signal
            </p>
            <p className={`text-sm font-bold font-mono ${signalColor(telemetry.signal)}`}>{telemetry.signal}%</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Thermometer className="w-2.5 h-2.5" /> Temp
            </p>
            <p className="text-sm font-bold font-mono text-slate-300">{telemetry.temperatureC.toFixed(1)}°C</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2 min-w-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">
                  {isAerial ? 'Altitude' : 'Depth'}
                </p>
                <p className="font-bold text-white font-mono text-[11px]">
                  {isAerial ? `${telemetry.altitudeM.toFixed(1)}m AGL` : `${telemetry.depthM.toFixed(1)}m BEL`}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">Speed</p>
                <p className="font-bold text-white font-mono text-[11px]">{telemetry.speedMs.toFixed(1)} m/s</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">Position</p>
                <p className="font-mono text-[10px] text-slate-300">
                  {telemetry.latitude.toFixed(4)}°N<br />
                  {Math.abs(telemetry.longitude).toFixed(4)}°W
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">Mission</p>
                <p className="text-[10px] font-mono text-sky-400 truncate">{telemetry.missionId}</p>
                <p className={`text-[10px] mt-0.5 ${telemetry.payloadActive ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {telemetry.payloadActive ? '● Active' : '○ Offline'}
                </p>
              </div>
            </div>
          </div>
          <CompassRose heading={telemetry.headingDeg} />
        </div>

        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            {isAerial ? <><Target className="w-2.5 h-2.5" /> LiDAR Sweep</> : <><Waves className="w-2.5 h-2.5" /> Sonar Profile</>}
          </p>
          <div className="bg-slate-900/60 rounded-lg p-2 flex items-center justify-center">
            {isAerial ? (
              <LidarSweep
                rangeM={telemetry.lidarRangeM}
                obstacleDetected={telemetry.obstacleDetected}
                obstacleDistanceM={telemetry.obstacleDistanceM}
              />
            ) : (
              <SonarDisplay depthM={telemetry.sonarDepthM} maxDepthM={50} />
            )}
          </div>
          {telemetry.obstacleDetected && telemetry.obstacleDistanceM && (
            <p className="text-[10px] text-red-400 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Obstacle at {telemetry.obstacleDistanceM}m — collision avoidance active
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-700/20">
          {(['standby', 'active', 'returning', 'emergency'] as DroneStatus[]).map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(telemetry.droneId, s)}
              disabled={telemetry.status === s}
              className={`text-[9px] py-1.5 px-1 rounded font-medium transition-all border capitalize disabled:opacity-30 truncate ${
                telemetry.status === s
                  ? statusColor(s)
                  : 'border-slate-700/20 text-slate-600 hover:text-slate-300 hover:border-slate-600/30'
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

export default function RoboticsDashboard() {
  const { session } = useAuth();
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY);
  const [ticks, setTicks] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTelemetry(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          const t = { ...updated[id] };
          if (t.status === 'active') {
            t.latitude += (Math.random() - 0.5) * 0.0001;
            t.longitude += (Math.random() - 0.5) * 0.0001;
            t.speedMs = Math.max(0, t.speedMs + (Math.random() - 0.5) * 0.5);
            t.battery = Math.max(0, t.battery - 0.02);
            t.signal = Math.min(100, Math.max(40, t.signal + (Math.random() - 0.5) * 2));
            if (t.droneType === 'aerial') {
              t.altitudeM = Math.max(0, t.altitudeM + (Math.random() - 0.5) * 2);
              t.lidarRangeM = Math.max(10, t.lidarRangeM + (Math.random() - 0.5) * 5);
              t.headingDeg = (t.headingDeg + Math.round((Math.random() - 0.5) * 10) + 360) % 360;
            } else {
              t.depthM = Math.max(0, t.depthM + (Math.random() - 0.5) * 0.5);
              t.sonarDepthM = Math.max(0, t.sonarDepthM + (Math.random() - 0.5) * 2);
            }
          }
          if (t.status === 'returning') {
            t.battery = Math.max(0, t.battery - 0.01);
          }
          updated[id] = t;
        });
        return updated;
      });
      setTicks(t => t + 1);
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleStatusChange = useCallback(async (droneId: string, status: DroneStatus) => {
    setTelemetry(prev => ({
      ...prev,
      [droneId]: { ...prev[droneId], status },
    }));
    if (session) {
      await supabase.from('audit_log_entries').insert({
        user_id: session.user.id,
        module: 'RoboticsDashboard',
        action: 'DRONE_STATUS_CHANGE',
        detail: `${droneId} → ${status}`,
        severity: status === 'emergency' ? 'critical' : 'info',
      });
    }
  }, [session]);

  const activeCount = Object.values(telemetry).filter(t => t.status === 'active').length;
  const emergencyCount = Object.values(telemetry).filter(t => t.status === 'emergency').length;
  const obstacleCount = Object.values(telemetry).filter(t => t.obstacleDetected).length;
  const avgBattery = Math.round(Object.values(telemetry).reduce((s, t) => s + t.battery, 0) / Object.values(telemetry).length);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Units</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">of {Object.keys(telemetry).length} total</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Emergency</p>
          <p className={`text-2xl font-bold mt-1 ${emergencyCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>{emergencyCount}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{emergencyCount > 0 ? 'CRITICAL ALERT' : 'all nominal'}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Obstacles</p>
          <p className={`text-2xl font-bold mt-1 ${obstacleCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{obstacleCount}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{obstacleCount > 0 ? 'avoidance active' : 'clear'}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Fleet Battery</p>
          <p className={`text-2xl font-bold mt-1 ${avgBattery > 60 ? 'text-emerald-400' : avgBattery > 25 ? 'text-amber-400' : 'text-red-400'}`}>{avgBattery}%</p>
          <p className="text-[10px] text-slate-600 mt-0.5">fleet average</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 border border-slate-800/40 rounded-lg px-3 py-2 bg-slate-900/30 overflow-x-auto">
        <Activity className="w-3 h-3 text-sky-400 animate-pulse shrink-0" />
        <span className="text-sky-400 shrink-0">TELEMETRY LIVE</span>
        <span className="mx-1 text-slate-700 shrink-0">|</span>
        <span className="shrink-0">Tick #{ticks}</span>
        <span className="mx-1 text-slate-700 shrink-0 hidden sm:inline">|</span>
        <Radio className="w-3 h-3 hidden sm:inline shrink-0" />
        <span className="hidden sm:inline shrink-0">915 MHz · MAVLink 2.0</span>
        <span className="mx-1 text-slate-700 shrink-0 hidden md:inline">|</span>
        <span className="hidden md:inline shrink-0">AES-256-GCM</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(telemetry).map(t => (
          <DroneCard key={t.droneId} telemetry={t} onStatusChange={handleStatusChange} />
        ))}
      </div>
    </div>
  );
}
