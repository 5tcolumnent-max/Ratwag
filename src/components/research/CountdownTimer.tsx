import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const DEADLINE = new Date('2026-04-28T23:59:00Z');

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function getTimeLeft(): TimeLeft {
  const now = new Date();
  const diff = DEADLINE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-16 h-16 bg-slate-800/80 border border-slate-600/60 rounded-lg flex items-center justify-center shadow-inner">
          <span className="text-2xl font-mono font-bold text-white tabular-nums">
            {String(value).padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="mt-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-medium">
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isUrgent = timeLeft.days <= 7 && !timeLeft.expired;
  const isCritical = timeLeft.days <= 3 && !timeLeft.expired;

  if (timeLeft.expired) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">Submission Window Closed</p>
          <p className="text-xs text-emerald-500">April 28, 2026 — Grants.gov</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 px-5 py-4 rounded-xl border ${
        isCritical
          ? 'bg-red-950/30 border-red-700/50'
          : isUrgent
          ? 'bg-amber-950/20 border-amber-700/40'
          : 'bg-slate-800/40 border-slate-700/50'
      }`}
    >
      <div className="flex items-center gap-2">
        {isCritical || isUrgent ? (
          <AlertTriangle className={`w-4 h-4 shrink-0 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
        ) : (
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isCritical ? 'text-red-300' : isUrgent ? 'text-amber-300' : 'text-slate-300'}`}>
            Grants.gov Submission Deadline
          </p>
          <p className="text-[10px] text-slate-500">April 28, 2026 — DOE Genesis Mission Phase I</p>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <TimeUnit value={timeLeft.days} label="Days" />
        <span className="text-slate-600 text-xl font-mono mb-4">:</span>
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <span className="text-slate-600 text-xl font-mono mb-4">:</span>
        <TimeUnit value={timeLeft.minutes} label="Min" />
        <span className="text-slate-600 text-xl font-mono mb-4">:</span>
        <TimeUnit value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
}
