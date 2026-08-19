import { supabase } from './supabase';
import type { RoboticsTelemetry } from '../types/database.types';

export async function fetchRoboticsTelemetry(userId: string): Promise<RoboticsTelemetry[]> {
  const { data, error } = await supabase
    .from('robotics_telemetry')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function seedRoboticsTelemetry(
  userId: string,
  seeds: RoboticsTelemetry['Insert'][]
): Promise<RoboticsTelemetry[]> {
  const { data, error } = await supabase
    .from('robotics_telemetry')
    .insert(seeds)
    .select();
  if (error) throw error;
  return data || [];
}

export async function updateDroneStatus(dbId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('robotics_telemetry')
    .update({ status, recorded_at: new Date().toISOString() })
    .eq('id', dbId);
  if (error) throw error;
}

export async function persistDroneTelemetry(
  dbId: string,
  partial: Partial<RoboticsTelemetry['Update']>
): Promise<void> {
  const { error } = await supabase
    .from('robotics_telemetry')
    .update({ ...partial, recorded_at: new Date().toISOString() })
    .eq('id', dbId);
  if (error) throw error;
}

export async function logRoboticsAuditEntry(
  userId: string,
  module: string,
  action: string,
  detail: string,
  severity: string
): Promise<void> {
  await supabase.from('audit_log_entries').insert({
    user_id: userId,
    module,
    action,
    detail,
    severity,
  });
}
