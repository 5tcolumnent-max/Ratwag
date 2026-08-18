import { useState, useEffect } from 'react';
import { Bluetooth, BluetoothOff } from 'lucide-react';

type WifiLevel = 'full' | 'average' | 'poor' | 'none';

function wifiLevelFromSignal(signal: number): WifiLevel {
  if (signal >= 75) return 'full';
  if (signal >= 45) return 'average';
  if (signal >= 15) return 'poor';
  return 'none';
}

const WIFI_CONFIG: Record<WifiLevel, { text: string; bg: string; border: string; label: string }> = {
  full: { text: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-700/40', label: 'Full' },
  average: { text: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-700/40', label: 'Average' },
  poor: { text: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-700/40', label: 'Poor' },
  none: { text: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-700/40', label: 'No Signal' },
};

function WifiBars({ level }: { level: WifiLevel }) {
  const config = WIFI_CONFIG[level];
  const activeBars = level === 'full' ? 4 : level === 'average' ? 3 : level === 'poor' ? 2 : 0;

  return (
    <div className="flex items-end gap-0.5 h-3.5">
      {[1, 2, 3, 4].map(bar => {
        const isActive = bar <= activeBars;
        const height = `${bar * 25}%`;
        return (
          <div
            key={bar}
            className={`w-1 rounded-sm transition-all duration-300 ${
              isActive ? `${config.text} bg-current` : 'bg-slate-700/60'
            }`}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}

export default function ConnectionBar({ wifiSignal }: { wifiSignal: number }) {
  const [btConnected, setBtConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkBluetooth() {
      if (!('bluetooth' in navigator)) {
        setBtConnected(false);
        return;
      }
      try {
        const available = await (navigator as Navigator & { bluetooth?: { getAvailability: () => Promise<boolean> } }).bluetooth!.getAvailability();
        if (mounted) setBtConnected(available);
      } catch {
        if (mounted) setBtConnected(false);
      }
    }

    checkBluetooth();

    const interval = setInterval(checkBluetooth, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const wifiLevel = wifiLevelFromSignal(wifiSignal);
  const wifiConfig = WIFI_CONFIG[wifiLevel];

  return (
    <div className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-2.5">
      {/* Bluetooth */}
      <div className="flex items-center gap-2">
        {btConnected ? (
          <Bluetooth className="w-4 h-4 text-blue-400" />
        ) : (
          <BluetoothOff className="w-4 h-4 text-slate-500" />
        )}
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${btConnected ? 'text-blue-400' : 'text-slate-500'}`}>
          {btConnected ? 'Connected' : 'Not Connected'}
        </span>
      </div>

      <div className="w-px h-5 bg-slate-700/50" />

      {/* WiFi */}
      <div className="flex items-center gap-2">
        <WifiBars level={wifiLevel} />
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${wifiConfig.text}`}>
          {wifiConfig.label}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
        <span>Signal</span>
        <span className={`font-bold ${wifiConfig.text}`}>{Math.round(wifiSignal)}%</span>
      </div>
    </div>
  );
}
