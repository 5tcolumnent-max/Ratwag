import { Volume2, VolumeX, ChevronDown, RefreshCw, Lock, Unlock } from 'lucide-react';
import { type FeedHeartbeat, formatLastSeen, statusColor as hbStatusColor } from '../hooks/useFeedHeartbeat';
import type { AudioDevice } from '../hooks/useAudioFeed';

function StudioMic({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="2" width="8" height="11" rx="4" fill="currentColor" opacity="0.9" />
      <line x1="12" y1="13" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function StudioMicOff({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="2" width="8" height="11" rx="4" fill="currentColor" opacity="0.5" />
      <line x1="12" y1="13" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M7 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.5" />
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

interface AudioLevelMeterProps {
  active: boolean;
  monitoring: boolean;
  level: number;
  error: string | null;
  heartbeat?: FeedHeartbeat;
  isSecureContext?: boolean;
  devices?: AudioDevice[];
  selectedDeviceId?: string | null;
  onToggle: () => void;
  onMonitorToggle: () => void;
  onSelectDevice?: (deviceId: string) => void;
  onRefreshDevices?: () => Promise<void>;
  className?: string;
}

export default function AudioLevelMeter({
  active,
  monitoring,
  level,
  error,
  heartbeat,
  isSecureContext = true,
  devices = [],
  selectedDeviceId,
  onToggle,
  onMonitorToggle,
  onSelectDevice,
  onRefreshDevices,
  className = '',
}: AudioLevelMeterProps) {
  const bars = 12;
  const hbColors = heartbeat ? hbStatusColor(heartbeat.status) : null;
  const hasMultipleDevices = devices.length > 1;
  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {!isSecureContext && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-700/40 bg-amber-900/15 text-amber-400 text-[10px]">
          <Unlock className="w-3 h-3 shrink-0" />
          <span className="font-medium">HTTPS required — microphone access blocked on non-secure connections.</span>
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={onToggle}
          disabled={!isSecureContext}
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
            !isSecureContext
              ? 'opacity-40 cursor-not-allowed bg-slate-800/30 border-slate-700/30 text-slate-600'
              : active
              ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/50'
              : 'bg-slate-700/20 border-slate-700/20 text-slate-500 hover:text-slate-300 hover:border-slate-600/40'
          }`}
        >
          {active ? <StudioMic className="w-3.5 h-3.5 shrink-0" /> : <StudioMicOff className="w-3.5 h-3.5 shrink-0" />}
          <span className="flex-1 text-left">{active ? 'Audio Active' : 'Audio Disabled'}</span>
          {isSecureContext && (
            <Lock className={`w-2.5 h-2.5 shrink-0 ${active ? 'text-emerald-600' : 'text-slate-700'}`} />
          )}
          {active && (
            <div className="flex items-end gap-[2px] h-3.5 ml-1">
              {Array.from({ length: bars }).map((_, i) => {
                const threshold = ((i + 1) / bars) * 100;
                const lit = level >= threshold;
                const isHigh = i >= bars * 0.75;
                const isMid = i >= bars * 0.5;
                return (
                  <div
                    key={i}
                    className={`w-[2px] rounded-sm transition-all duration-75 ${
                      lit
                        ? isHigh
                          ? 'bg-red-400'
                          : isMid
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        : 'bg-slate-700'
                    }`}
                    style={{ height: `${40 + (i / bars) * 60}%` }}
                  />
                );
              })}
            </div>
          )}
        </button>

        {active && (
          <button
            onClick={onMonitorToggle}
            title={monitoring ? 'Stop live audio playback' : 'Play audio through speakers'}
            className={`flex items-center justify-center px-2.5 rounded-lg border text-xs font-medium transition-all ${
              monitoring
                ? 'bg-sky-900/40 border-sky-700/50 text-sky-400 hover:bg-sky-900/60'
                : 'bg-slate-700/20 border-slate-700/20 text-slate-500 hover:text-slate-300 hover:border-slate-600/40'
            }`}
          >
            {monitoring ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {isSecureContext && (devices.length > 0 || hasMultipleDevices) && (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <select
              value={selectedDeviceId ?? ''}
              onChange={e => onSelectDevice?.(e.target.value)}
              disabled={active}
              title={active ? 'Stop the feed to change microphone' : 'Select microphone'}
              className={`w-full appearance-none bg-slate-900/60 border text-[10px] font-mono rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none transition-all truncate ${
                active
                  ? 'border-slate-700/20 text-slate-600 cursor-not-allowed opacity-50'
                  : 'border-slate-600/40 text-slate-300 hover:border-slate-500/60 cursor-pointer'
              }`}
            >
              {devices.length === 0 && (
                <option value="">No microphones found</option>
              )}
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          </div>
          {onRefreshDevices && (
            <button
              onClick={onRefreshDevices}
              disabled={active}
              title="Refresh device list"
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-700/30 text-slate-500 hover:text-slate-300 hover:border-slate-600/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          {selectedDevice && (
            <span className="text-[9px] text-slate-600 shrink-0 hidden sm:inline">
              {devices.indexOf(selectedDevice) + 1}/{devices.length}
            </span>
          )}
        </div>
      )}

      {heartbeat && hbColors && (
        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${hbColors.badge}`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hbColors.dot} ${heartbeat.status === 'online' ? 'animate-pulse' : heartbeat.status === 'reconnecting' ? 'animate-ping' : ''}`} />
            <span className={`font-semibold uppercase tracking-wide ${hbColors.text}`}>
              {heartbeat.status === 'reconnecting' ? `Reconnecting… (${heartbeat.reconnectAttempts})` : heartbeat.status}
            </span>
          </div>
          <span className="opacity-80">
            Last seen: <span className="font-semibold">{formatLastSeen(heartbeat.lastSeenAt)}</span>
          </span>
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-400 bg-red-900/20 border border-red-700/20 rounded-lg px-3 py-1.5">{error}</p>
      )}
    </div>
  );
}
