import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { HumanAuthorizationLog } from '../lib/database.types';

export type AuthDecision = 'APPROVE' | 'DENY';

export interface PendingAuthorization {
  missionId: string;
  requestedAt: string;
  requestedCommand: string;
}

export interface MissionControlState {
  pendingAuthorization: PendingAuthorization | null;
  recentLogs: HumanAuthorizationLog[];
  isSubmitting: boolean;
  error: string | null;
}

export function useMissionControl(userId: string | null, authorizedBy: string) {
  const [state, setState] = useState<MissionControlState>({
    pendingAuthorization: null,
    recentLogs: [],
    isSubmitting: false,
    error: null,
  });

  const sendRobotCommand = useCallback(async (missionId: string, command: string) => {
    await supabase.from('audit_log_entries').insert({
      user_id: userId,
      module: 'MissionControl',
      action: 'ROBOT_COMMAND_DISPATCHED',
      detail: `Mission ${missionId} — command: ${command}`,
      severity: 'warning',
    });
  }, [userId]);

  const requestAuthorization = useCallback((missionId: string, command = 'EXECUTE') => {
    setState(prev => ({
      ...prev,
      pendingAuthorization: {
        missionId,
        requestedAt: new Date().toISOString(),
        requestedCommand: command,
      },
      error: null,
    }));
  }, []);

  const authorizeAction = useCallback(async (missionId: string, decision: AuthDecision) => {
    if (!userId) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    const timestamp = new Date().toISOString();
    const command = decision === 'APPROVE' ? 'EXECUTE' : '';

    const { data, error } = await supabase
      .from('human_authorization_logs')
      .insert([{
        user_id: userId,
        mission_id: missionId,
        status: decision,
        authorized_by: authorizedBy,
        command,
        timestamp,
      }])
      .select()
      .maybeSingle();

    if (error) {
      setState(prev => ({ ...prev, isSubmitting: false, error: error.message }));
      return;
    }

    if (decision === 'APPROVE') {
      await sendRobotCommand(missionId, 'EXECUTE');
    }

    setState(prev => ({
      ...prev,
      isSubmitting: false,
      pendingAuthorization: null,
      recentLogs: data ? [data, ...prev.recentLogs].slice(0, 20) : prev.recentLogs,
    }));
  }, [userId, authorizedBy, sendRobotCommand]);

  const loadRecentLogs = useCallback(async (missionId?: string) => {
    if (!userId) return;
    let query = supabase
      .from('human_authorization_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (missionId) query = query.eq('mission_id', missionId);

    const { data } = await query;
    if (data) {
      setState(prev => ({ ...prev, recentLogs: data }));
    }
  }, [userId]);

  const dismissPending = useCallback(() => {
    setState(prev => ({ ...prev, pendingAuthorization: null, error: null }));
  }, []);

  return {
    ...state,
    requestAuthorization,
    authorizeAction,
    loadRecentLogs,
    dismissPending,
  };
}
