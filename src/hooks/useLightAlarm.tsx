import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type AlarmSeverity = 'match' | 'conviction';

export interface AlarmEvent {
  id: string;
  severity: AlarmSeverity;
  title: string;
  detail: string;
  source: string;
  timestamp: number;
  imageUrl?: string;
}

interface LightAlarmContextValue {
  activeAlarm: AlarmEvent | null;
  trigger: (alarm: Omit<AlarmEvent, 'id' | 'timestamp'>) => void;
  dismiss: () => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

const LightAlarmContext = createContext<LightAlarmContextValue | null>(null);

const ALARM_DURATION_MS = 6000;

export function LightAlarmProvider({ children }: { children: ReactNode }) {
  const [activeAlarm, setActiveAlarm] = useState<AlarmEvent | null>(null);
  const [enabled, setEnabled] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveAlarm(null);
  }, []);

  const trigger = useCallback((alarm: Omit<AlarmEvent, 'id' | 'timestamp'>) => {
    if (!enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const event: AlarmEvent = {
      ...alarm,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setActiveAlarm(event);
    timeoutRef.current = setTimeout(() => {
      setActiveAlarm(null);
      timeoutRef.current = null;
    }, ALARM_DURATION_MS);
  }, [enabled]);

  return (
    <LightAlarmContext.Provider value={{ activeAlarm, trigger, dismiss, enabled, setEnabled }}>
      {children}
    </LightAlarmContext.Provider>
  );
}

export function useLightAlarm() {
  const ctx = useContext(LightAlarmContext);
  if (!ctx) throw new Error('useLightAlarm must be used within LightAlarmProvider');
  return ctx;
}
