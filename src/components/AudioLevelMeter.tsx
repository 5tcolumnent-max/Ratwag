import { Mic, MicOff } from 'lucide-react';

interface AudioLevelMeterProps {
  active: boolean;
  level: number;
  error: string | null;
  onToggle: () => void;
  className?: string;
}

export default function AudioLevelMeter({ active, level, error, onToggle, className = '' }: AudioLevelMeterProps) {
  const bars = 12;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
          active
            ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/50'
            : 'bg-slate-700/20 border-slate-700/20 text-slate-500 hover:text-slate-300 hover:border-slate-600/40'
        }`}
      >
        {active ? <Mic className="w-3.5 h-3.5 shrink-0" /> : <MicOff className="w-3.5 h-3.5 shrink-0" />}
        <span className="flex-1 text-left">{active ? 'Audio Active' : 'Audio Disabled'}</span>
        {active && (
          <div className="flex items-end gap-[2px] h-3.5">
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
      {error && (
        <p className="text-[10px] text-red-400 bg-red-900/20 border border-red-700/20 rounded-lg px-3 py-1.5">{error}</p>
      )}
    </div>
  );
}
