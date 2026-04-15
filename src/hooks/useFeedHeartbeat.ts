import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';

export type HeartbeatStatus = 'online' | 'degraded' | 'offline' | 'reconnecting';

export interface FeedHeartbeat {
  feedId: string;
  feedType: string;
  feedLabel: string;
  lastSeenAt: Date | null;
  signalStrength: number;
  status: HeartbeatStatus;
  reconnectAttempts: number;
  lastError: string;
}

interface UseFeedHeartbeatOptions {
  feedId: string;
  feedType: string;
  feedLabel: string;
  userId: string | null;
  isOnline: boolean;
  signalStrength?: number;
  offlineThresholdMs?: number;
  degradedThresholdMs?: number;
  maxReconnectAttempts?: number;
  onReconnect?: () => Promise<void> | void;
}

export function useFeedHeartbeat({
  feedId,
  feedType,
  feedLabel,
  userId,
  isOnline,
  signalStrength = 0,
  offlineThresholdMs = 15000,
  degradedThresholdMs = 8000,
  maxReconnectAttempts = 5,
  onReconnect,
}: UseFeedHeartbeatOptions): FeedHeartbeat {
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<HeartbeatStatus>('offline');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState('');

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isReconnectingRef = useRef(false);

  const persistHeartbeat = useCallback(async (
    newStatus: HeartbeatStatus,
    sig: number,
    attempts: number,
    error: string,
  ) => {
    if (!userId) return;
    await supabase.from('feed_heartbeats').upsert(
      {
        user_id: userId,
        feed_id: feedId,
        feed_type: feedType,
        feed_label: feedLabel,
        last_seen_at: new Date().toISOString(),
        signal_strength: Math.round(Math.max(0, Math.min(100, sig))),
        status: newStatus,
        reconnect_attempts: attempts,
        last_error: error,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,feed_id' },
    );
  }, [userId, feedId, feedType, feedLabel]);

  const scheduleReconnect = useCallback((attempts: number) => {
    if (!onReconnect || attempts >= maxReconnectAttempts || isReconnectingRef.current) return;

    isReconnectingRef.current = true;
    const delay = Math.min(2000 * Math.pow(1.8, attempts), 30000);

    reconnectTimerRef.current = setTimeout(async () => {
      const next = attempts + 1;
      setReconnectAttempts(next);
      setStatus('reconnecting');
      await persistHeartbeat('reconnecting', 0, next, 'Auto-reconnect attempt');
      try {
        await onReconnect();
      } catch {
        setLastError('Reconnect failed — retrying');
        await persistHeartbeat('offline', 0, next, 'Reconnect failed');
        isReconnectingRef.current = false;
        scheduleReconnect(next);
      }
    }, delay);
  }, [onReconnect, maxReconnectAttempts, persistHeartbeat]);

  useEffect(() => {
    if (isOnline) {
      const now = new Date();
      setLastSeenAt(now);
      isReconnectingRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

      const newAttempts = 0;
      const newError = '';
      const newStatus: HeartbeatStatus = signalStrength < 30 ? 'degraded' : 'online';

      setStatus(newStatus);
      setReconnectAttempts(newAttempts);
      setLastError(newError);
      void persistHeartbeat(newStatus, signalStrength, newAttempts, newError);
    }
  }, [isOnline, signalStrength, persistHeartbeat]);

  useEffect(() => {
    watchdogRef.current = setInterval(() => {
      if (!isOnline) return;

      const elapsed = lastSeenAt ? Date.now() - lastSeenAt.getTime() : Infinity;

      if (elapsed > offlineThresholdMs) {
        const err = `Signal lost — no heartbeat for ${Math.round(elapsed / 1000)}s`;
        setStatus('offline');
        setLastError(err);
        void persistHeartbeat('offline', 0, reconnectAttempts, err);
        scheduleReconnect(reconnectAttempts);
      } else if (elapsed > degradedThresholdMs) {
        setStatus('degraded');
        void persistHeartbeat('degraded', signalStrength, reconnectAttempts, 'Signal degraded');
      }
    }, 3000);

    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, [isOnline, lastSeenAt, offlineThresholdMs, degradedThresholdMs, signalStrength, reconnectAttempts, persistHeartbeat, scheduleReconnect]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, []);

  return {
    feedId,
    feedType,
    feedLabel,
    lastSeenAt,
    signalStrength,
    status,
    reconnectAttempts,
    lastError,
  };
}

export function formatLastSeen(lastSeenAt: Date | null): string {
  if (!lastSeenAt) return 'Never';
  const diffMs = Date.now() - lastSeenAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export function statusColor(status: HeartbeatStatus) {
  switch (status) {
    case 'online': return { dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-900/20 border-emerald-700/40 text-emerald-400' };
    case 'degraded': return { dot: 'bg-amber-400', text: 'text-amber-400', badge: 'bg-amber-900/20 border-amber-700/40 text-amber-400' };
    case 'reconnecting': return { dot: 'bg-sky-400', text: 'text-sky-400', badge: 'bg-sky-900/20 border-sky-700/40 text-sky-400' };
    case 'offline': return { dot: 'bg-slate-600', text: 'text-slate-500', badge: 'bg-slate-800/40 border-slate-700/30 text-slate-500' };
  }
}
