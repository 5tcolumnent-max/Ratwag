import { supabase } from './supabase';
import type { HumanAuthorizationLog } from '../types/database.types';

export interface AuthLogInsert {
  userId: string;
  missionId: string;
  status: 'APPROVE' | 'DENY';
  authorizedBy: string;
  command: string;
  timestamp: string;
}

export async function insertAuthorizationLog(payload: AuthLogInsert): Promise<HumanAuthorizationLog | null> {
  const { data, error } = await supabase
    .from('human_authorization_logs')
    .insert([{
      user_id: payload.userId,
      mission_id: payload.missionId,
      status: payload.status,
      authorized_by: payload.authorizedBy,
      command: payload.command,
      timestamp: payload.timestamp,
    }])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchAuthorizationLogs(
  userId: string,
  missionId?: string
): Promise<HumanAuthorizationLog[]> {
  let query = supabase
    .from('human_authorization_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(20);

  if (missionId) query = query.eq('mission_id', missionId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function logMissionAuditEntry(
  userId: string,
  missionId: string,
  command: string
): Promise<void> {
  await supabase.from('audit_log_entries').insert({
    user_id: userId,
    module: 'MissionControl',
    action: 'ROBOT_COMMAND_DISPATCHED',
    detail: `Mission ${missionId} — command: ${command}`,
    severity: 'warning',
  });
}
