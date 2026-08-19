import { useLightAlarm, type AlarmEvent } from '../hooks/useLightAlarm';
import { X, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';

function severityConfig(severity: AlarmEvent['severity']) {
  if (severity === 'conviction') {
    return {
      strobe: 'animate-alarm-strobe-red',
      glow: 'shadow-[0_0_120px_20px_rgba(239,68,68,0.55)]',
      border: 'border-red-500',
      bg: 'bg-red-950/95',
      text: 'text-red-300',
      icon: <ShieldCheck className="w-5 h-5 text-red-400" />,
      label: 'SOLID CONVICTION',
      bar: 'bg-red-500',
    };
  }
  return {
    strobe: 'animate-alarm-strobe-amber',
    glow: 'shadow-[0_0_100px_16px_rgba(245,158,11,0.45)]',
    border: 'border-amber-500',
    bg: 'bg-amber-950/95',
    text: 'text-amber-300',
    icon: <Zap className="w-5 h-5 text-amber-400" />,
    label: 'MATCH DETECTED',
    bar: 'bg-amber-500',
  };
}

export function LightAlarmOverlay() {
  const { activeAlarm, dismiss, enabled, setEnabled } = useLightAlarm();

  if (!activeAlarm) {
    return null;
  }

  const cfg = severityConfig(activeAlarm.severity);

  return (
    <>
      {/* Full-screen edge strobe */}
      <div
        className={`fixed inset-0 z-[300] pointer-events-none border-4 ${cfg.border} ${cfg.strobe}`}
        style={{ boxShadow: `inset 0 0 80px 8px ${activeAlarm.severity === 'conviction' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.35)'}` }}
      />

      {/* Toast card */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[301] w-full max-w-md px-4 pointer-events-none">
        <div className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${cfg.border} ${cfg.bg} ${cfg.glow} backdrop-blur-xl px-4 py-3.5`}>
          <div className={`p-2 rounded-xl border ${cfg.border} bg-black/30 shrink-0`}>
            {cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold tracking-widest uppercase ${cfg.text}`}>{cfg.label}</span>
              <span className="text-[9px] font-mono text-slate-500">{activeAlarm.source}</span>
            </div>
            <p className="text-sm font-bold text-white mt-0.5 leading-tight truncate">{activeAlarm.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{activeAlarm.detail}</p>
            <div className="mt-2 h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
              <div className={`h-full ${cfg.bar} animate-alarm-bar`} />
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export function LightAlarmToggle() {
  const { enabled, setEnabled } = useLightAlarm();
  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-mono transition-all ${
        enabled
          ? 'border-amber-700/40 bg-amber-900/10 text-amber-500 hover:bg-amber-900/25'
          : 'border-slate-700/40 bg-slate-800/30 text-slate-600 hover:text-slate-400'
      }`}
      title={enabled ? 'Light alarm armed — disable' : 'Light alarm disarmed — enable'}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      {enabled ? 'ALM ARMED' : 'ALM OFF'}
    </button>
  );
}
