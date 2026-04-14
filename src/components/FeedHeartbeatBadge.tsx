import { RefreshCw, WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { type FeedHeartbeat, formatLastSeen, statusColor } from '../hooks/useFeedHeartbeat';

interface Props {
  heartbeat: FeedHeartbeat;
  compact?: boolean;
  className?: string;
}

export function FeedHeartbeatBadge({ heartbeat, compact = false, className = '' }: Props) {
  const colors = statusColor(heartbeat.status);

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot} ${heartbeat.status === 'online' ? 'animate-pulse' : heartbeat.status === 'reconnecting' ? 'animate-ping' : ''}`} />
        <span className={`text-[10px] font-mono ${colors.text}`}>
          {formatLastSeen(heartbeat.lastSeenAt)}
        </span>
        {heartbeat.status === 'reconnecting' && (
          <RefreshCw className={`w-2.5 h-2.5 ${colors.text} animate-spin`} />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${colors.badge} ${className}`}>
      <div className="flex items-center gap-1.5 shrink-0">
        {heartbeat.status === 'online' ? (
          <Wifi className="w-3 h-3" />
        ) : heartbeat.status === 'degraded' ? (
          <AlertTriangle className="w-3 h-3" />
        ) : heartbeat.status === 'reconnecting' ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {heartbeat.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-mono opacity-80">
        <span>
          Last seen: <span className="font-semibold">{formatLastSeen(heartbeat.lastSeenAt)}</span>
        </span>
        {heartbeat.signalStrength > 0 && (
          <span>
            Signal: <span className="font-semibold">{heartbeat.signalStrength}%</span>
          </span>
        )}
        {heartbeat.reconnectAttempts > 0 && (
          <span>
            Retries: <span className="font-semibold">{heartbeat.reconnectAttempts}</span>
          </span>
        )}
      </div>
    </div>
  );
}

interface SignalStrengthBarProps {
  value: number;
  className?: string;
}

export function SignalStrengthBar({ value, className = '' }: SignalStrengthBarProps) {
  const bars = 5;
  return (
    <div className={`flex items-end gap-[2px] ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = ((i + 1) / bars) * 100;
        const lit = value >= threshold;
        const color = value > 70 ? 'bg-emerald-400' : value > 40 ? 'bg-amber-400' : 'bg-red-400';
        return (
          <div
            key={i}
            className={`w-[3px] rounded-sm transition-all duration-300 ${lit ? color : 'bg-slate-700'}`}
            style={{ height: `${8 + (i / (bars - 1)) * 8}px` }}
          />
        );
      })}
    </div>
  );
}
