import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Battery,
  Wifi,
  Thermometer,
  Activity,
  Radio,
  Waves,
  Target,
  AlertTriangle,
  Wind,
  ShieldCheck,
  ShieldX,
  Lock,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import { useFeedHeartbeat, formatLastSeen, statusColor as hbStatusColor } from '../hooks/useFeedHeartbeat';
import { SignalStrengthBar } from './FeedHeartbeatBadge';
import { useMissionControl } from '../hooks/useMissionControl';

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
  dbId?: string;
}

const SEED_TELEMETRY: Omit<DroneTelemetry, 'dbId'>[] = [
  {
    droneId: 'AER-01', droneType: 'aerial', status: 'active',
    battery: 78, latitude: 38.897957, longitude: -77.036560,
    altitudeM: 42.5, depthM: 0, headingDeg: 127,
    speedMs: 12.3, signal: 94, lidarRangeM: 85.2,
    sonarDepthM: 0, obstacleDetected: false, obstacleDistanceM: null,
    temperatureC: 18.4, payloadActive: true, missionId: 'MSNS-2026-001',
  },
  {
    droneId: 'AER-02', droneType: 'aerial', status: 'standby',
    battery: 100, latitude: 38.899100, longitude: -77.035200,
    altitudeM: 0, depthM: 0, headingDeg: 0,
    speedMs: 0, signal: 100, lidarRangeM: 0,
    sonarDepthM: 0, obstacleDetected: false, obstacleDistanceM: null,
    temperatureC: 22.1, payloadActive: false, missionId: 'MSNS-2026-001',
  },
  {
    droneId: 'AQU-01', droneType: 'aquatic', status: 'active',
    battery: 63, latitude: 38.896200, longitude: -77.038400,
    altitudeM: 0, depthM: 14.7, headingDeg: 214,
    speedMs: 3.1, signal: 71, lidarRangeM: 0,
    sonarDepthM: 31.8, obstacleDetected: true, obstacleDistanceM: 4.2,
    temperatureC: 9.8, payloadActive: true, missionId: 'MSNS-2026-002',
  },
  {
    droneId: 'AQU-02', droneType: 'aquatic', status: 'returning',
    battery: 21, latitude: 38.895800, longitude: -77.037100,
    altitudeM: 0, depthM: 2.3, headingDeg: 45,
    speedMs: 5.8, signal: 58, lidarRangeM: 0,
    sonarDepthM: 2.3, obstacleDetected: false, obstacleDistanceM: null,
    temperatureC: 11.2, payloadActive: false, missionId: 'MSNS-2026-002',
  },
];

function rowToTelemetry(row: {
  id: string; drone_id: string; drone_type: string; status: string;
  battery_pct: number; latitude: number; longitude: number; altitude_m: number;
  depth_m: number; heading_deg: number; speed_ms: number; signal_strength: number;
  lidar_range_m: number; sonar_depth_m: number; obstacle_detected: boolean;
  obstacle_distance_m: number | null; temperature_c: number; payload_active: boolean;
  mission_id: string;
}): DroneTelemetry {
  return {
    dbId: row.id,
    droneId: row.drone_id,
    droneType: row.drone_type as DroneType,
    status: row.status as DroneStatus,
    battery: row.battery_pct,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    altitudeM: Number(row.altitude_m),
    depthM: Number(row.depth_m),
    headingDeg: row.heading_deg,
    speedMs: Number(row.speed_ms),
    signal: row.signal_strength,
    lidarRangeM: Number(row.lidar_range_m),
    sonarDepthM: Number(row.sonar_depth_m),
    obstacleDetected: row.obstacle_detected,
    obstacleDistanceM: row.obstacle_distance_m !== null ? Number(row.obstacle_distance_m) : null,
    temperatureC: Number(row.temperature_c),
    payloadActive: row.payload_active,
    missionId: row.mission_id,
  };
}

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
    const iv = setInterval(() => setPingOffset(p => (p + 2) % 100), 50);
    return () => clearInterval(iv);
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
        points={`0,60 ${points.split(' ').map((p) => p).join(' ')} 160,60`}
        fill="rgba(14,165,233,0.08)"
      />
      <text x="2" y="10" fontSize="7" fill="rgb(100,116,139)">0m</text>
      <text x="2" y="58" fontSize="7" fill="rgb(100,116,139)">{maxDepthM}m</text>
    </svg>
  );
}

function DroneCard({ telemetry, userId, onStatusChange, onReconnect, onExecuteMission }: {
  telemetry: DroneTelemetry;
  userId: string | null;
  onStatusChange: (id: string, status: DroneStatus) => void;
  onReconnect: (droneId: string) => Promise<void>;
  onExecuteMission: (missionId: string) => void;
}) {
  const isAerial = telemetry.droneType === 'aerial';
  const isOnline = telemetry.status !== 'offline';

  const heartbeat = useFeedHeartbeat({
    feedId: telemetry.droneId,
    feedType: 'drone',
    feedLabel: `${telemetry.droneId} (${telemetry.droneType})`,
    userId,
    isOnline,
    signalStrength: telemetry.signal,
    offlineThresholdMs: 12000,
    degradedThresholdMs: 6000,
    onReconnect: () => onReconnect(telemetry.droneId),
  });

  const hbColors = hbStatusColor(heartbeat.status);

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

      <div className={`flex items-center justify-between px-4 py-2 border-b border-slate-700/10 ${heartbeat.status === 'offline' ? 'bg-slate-900/40' : heartbeat.status === 'reconnecting' ? 'bg-sky-900/10' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hbColors.dot} ${heartbeat.status === 'online' ? 'animate-pulse' : heartbeat.status === 'reconnecting' ? 'animate-ping' : ''}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${hbColors.text}`}>
            {heartbeat.status === 'reconnecting' ? `Reconnecting… (attempt ${heartbeat.reconnectAttempts})` : heartbeat.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SignalStrengthBar value={telemetry.signal} />
          <span className="text-[10px] font-mono text-slate-500">
            Last seen: <span className={`font-semibold ${hbColors.text}`}>{formatLastSeen(heartbeat.lastSeenAt)}</span>
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

        <button
          onClick={() => onExecuteMission(telemetry.missionId)}
          disabled={telemetry.status === 'offline' || telemetry.status === 'emergency'}
          className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-sky-700/40 bg-sky-900/20 text-sky-400 text-[11px] font-semibold hover:bg-sky-900/40 hover:border-sky-600/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Lock className="w-3 h-3" />
          Authorize &amp; Execute Mission
        </button>
      </div>
    </div>
  );
}

export default function RoboticsDashboard() {
  const { session } = useAuth();
  const [telemetry, setTelemetry] = useState<Record<string, DroneTelemetry>>({});
  const [ticks, setTicks] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showAuthLog, setShowAuthLog] = useState(false);

  const missionControl = useMissionControl(
    session?.user.id ?? null,
    session?.user.email ?? 'Operator'
  );

  useEffect(() => {
    if (!session) return;

    async function loadOrSeed() {
      const { data } = await supabase
        .from('robotics_telemetry')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('drone_id');

      if (data && data.length > 0) {
        const map: Record<string, DroneTelemetry> = {};
        data.forEach(row => {
          const t = rowToTelemetry(row);
          map[t.droneId] = t;
        });
        setTelemetry(map);
      } else {
        const inserts = SEED_TELEMETRY.map(t => ({
          user_id: session!.user.id,
          drone_id: t.droneId,
          drone_type: t.droneType,
          mission_id: t.missionId,
          status: t.status,
          battery_pct: Math.round(t.battery),
          latitude: t.latitude,
          longitude: t.longitude,
          altitude_m: t.altitudeM,
          depth_m: t.depthM,
          heading_deg: t.headingDeg,
          speed_ms: t.speedMs,
          signal_strength: t.signal,
          lidar_range_m: t.lidarRangeM,
          sonar_depth_m: t.sonarDepthM,
          obstacle_detected: t.obstacleDetected,
          obstacle_distance_m: t.obstacleDistanceM,
          temperature_c: t.temperatureC,
          payload_active: t.payloadActive,
          spatial_map_json: '{}',
        }));
        const { data: seeded } = await supabase
          .from('robotics_telemetry')
          .insert(inserts)
          .select();

        const map: Record<string, DroneTelemetry> = {};
        if (seeded) {
          seeded.forEach(row => {
            const t = rowToTelemetry(row);
            map[t.droneId] = t;
          });
        } else {
          SEED_TELEMETRY.forEach(t => { map[t.droneId] = t; });
        }
        setTelemetry(map);
      }
      setLoaded(true);
    }

    loadOrSeed();
  }, [session]);

  useEffect(() => {
    if (!loaded) return;

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
  }, [loaded]);

  useEffect(() => {
    if (!session || !loaded) return;

    persistRef.current = setInterval(async () => {
      const drones = Object.values(telemetry);
      for (const t of drones) {
        if (!t.dbId) continue;
        await supabase
          .from('robotics_telemetry')
          .update({
            status: t.status,
            battery_pct: Math.round(t.battery),
            latitude: t.latitude,
            longitude: t.longitude,
            altitude_m: t.altitudeM,
            depth_m: t.depthM,
            heading_deg: t.headingDeg,
            speed_ms: t.speedMs,
            signal_strength: Math.round(t.signal),
            lidar_range_m: t.lidarRangeM,
            sonar_depth_m: t.sonarDepthM,
            obstacle_detected: t.obstacleDetected,
            obstacle_distance_m: t.obstacleDistanceM,
            temperature_c: t.temperatureC,
          })
          .eq('id', t.dbId);
      }
    }, 15000);

    return () => { if (persistRef.current) clearInterval(persistRef.current); };
  }, [session, loaded, telemetry]);

  const handleReconnect = useCallback(async (droneId: string) => {
    setTelemetry(prev => ({
      ...prev,
      [droneId]: { ...prev[droneId], status: 'standby' },
    }));

    if (session) {
      const drone = telemetry[droneId];
      if (drone?.dbId) {
        await supabase
          .from('robotics_telemetry')
          .update({ status: 'standby' })
          .eq('id', drone.dbId);
      }
      await supabase.from('audit_log_entries').insert({
        user_id: session.user.id,
        module: 'RoboticsDashboard',
        action: 'DRONE_AUTO_RECONNECT',
        detail: `${droneId} — auto-reconnect triggered`,
        severity: 'info',
      });
    }
  }, [session, telemetry]);

  const handleStatusChange = useCallback(async (droneId: string, status: DroneStatus) => {
    setTelemetry(prev => ({
      ...prev,
      [droneId]: { ...prev[droneId], status },
    }));

    if (session) {
      const drone = telemetry[droneId];
      if (drone?.dbId) {
        await supabase
          .from('robotics_telemetry')
          .update({ status })
          .eq('id', drone.dbId);
      }

      await supabase.from('audit_log_entries').insert({
        user_id: session.user.id,
        module: 'RoboticsDashboard',
        action: 'DRONE_STATUS_CHANGE',
        detail: `${droneId} → ${status}`,
        severity: status === 'emergency' ? 'critical' : 'info',
      });
    }
  }, [session, telemetry]);

  const droneList = Object.values(telemetry);
  const activeCount = droneList.filter(t => t.status === 'active').length;
  const emergencyCount = droneList.filter(t => t.status === 'emergency').length;
  const obstacleCount = droneList.filter(t => t.obstacleDetected).length;
  const avgBattery = droneList.length > 0
    ? Math.round(droneList.reduce((s, t) => s + t.battery, 0) / droneList.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Units</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">of {droneList.length} total</p>
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

      {droneList.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Activity className="w-8 h-8 mx-auto mb-3 opacity-30 animate-pulse" />
          <p className="text-sm">Loading telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {droneList.map(t => (
            <DroneCard
              key={t.droneId}
              telemetry={t}
              userId={session?.user.id ?? null}
              onStatusChange={handleStatusChange}
              onReconnect={handleReconnect}
              onExecuteMission={missionControl.requestAuthorization}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => {
            setShowAuthLog(v => !v);
            if (!showAuthLog) missionControl.loadRecentLogs();
          }}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors border border-slate-700/30 hover:border-slate-600/40 px-3 py-1.5 rounded-lg"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          {showAuthLog ? 'Hide' : 'Show'} Authorization Log
        </button>
      </div>

      {showAuthLog && (
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/20 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-300 tracking-wide">Human Authorization Log</span>
          </div>
          {missionControl.recentLogs.length === 0 ? (
            <p className="text-[11px] text-slate-600 text-center py-6">No authorization records found.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {missionControl.recentLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  {log.status === 'APPROVE' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <span className={`text-[10px] font-bold w-14 shrink-0 ${log.status === 'APPROVE' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {log.status}
                  </span>
                  <span className="text-[10px] font-mono text-sky-400 w-28 shrink-0">{log.mission_id}</span>
                  <span className="text-[10px] text-slate-400 flex-1 truncate">by {log.authorized_by}</span>
                  {log.command && (
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-900/20 border border-amber-700/30 px-1.5 py-0.5 rounded shrink-0">
                      CMD:{log.command}
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-slate-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {missionControl.pendingAuthorization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/30 bg-slate-800/50">
              <Lock className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-bold text-white">Safety Interlock — Human Authorization Required</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Review and authorize or deny this robot command packet</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-800/60 border border-slate-700/30 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Mission ID</span>
                  <span className="text-[11px] font-mono font-bold text-sky-400">
                    {missionControl.pendingAuthorization.missionId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Command Packet</span>
                  <span className="text-[11px] font-mono font-bold text-amber-400">
                    {missionControl.pendingAuthorization.requestedCommand}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Requested At</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(missionControl.pendingAuthorization.requestedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Authorized By</span>
                  <span className="text-[11px] font-semibold text-slate-300">
                    {session?.user.email ?? 'Operator'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Authorizing will commit this decision to the immutable audit log and dispatch the robot command packet.
                Denying will log the refusal and abort execution.
              </p>

              {missionControl.error && (
                <p className="text-[11px] text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  {missionControl.error}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => missionControl.authorizeAction(missionControl.pendingAuthorization!.missionId, 'DENY')}
                disabled={missionControl.isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-700/40 bg-red-900/20 text-red-400 text-xs font-semibold hover:bg-red-900/40 hover:border-red-600/50 transition-all disabled:opacity-50"
              >
                <ShieldX className="w-4 h-4" />
                Deny
              </button>
              <button
                onClick={() => missionControl.authorizeAction(missionControl.pendingAuthorization!.missionId, 'APPROVE')}
                disabled={missionControl.isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-700/40 bg-emerald-900/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/40 hover:border-emerald-600/50 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {missionControl.isSubmitting ? 'Authorizing…' : 'Approve'}
              </button>
            </div>

            <div className="px-6 pb-4 flex justify-center">
              <button
                onClick={missionControl.dismissPending}
                disabled={missionControl.isSubmitting}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                Cancel — dismiss without logging
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
