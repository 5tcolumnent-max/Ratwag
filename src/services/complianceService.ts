import { supabase } from '../lib/supabase';

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'in_review' | 'remediated' | 'accepted' | 'closed';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

export interface FindingRow {
  id: string;
  control_id: string;
  control_family: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  status: FindingStatus;
  reviewer: string;
  identified_at: string;
  created_at: string;
  updated_at: string;
}

export interface CorrectiveActionRow {
  id: string;
  finding_id: string;
  title: string;
  description: string;
  owner: string;
  status: ActionStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FindingInput {
  control_id: string;
  control_family?: string;
  title: string;
  description?: string;
  severity: FindingSeverity;
  reviewer?: string;
  identified_at?: string;
}

export interface ActionInput {
  finding_id: string;
  title: string;
  description?: string;
  owner?: string;
  due_date?: string | null;
}

export async function fetchFindings(userId: string): Promise<FindingRow[]> {
  const { data, error } = await supabase
    .from('compliance_findings')
    .select('*')
    .eq('user_id', userId)
    .order('identified_at', { ascending: false });
  if (error) throw error;
  return (data || []) as FindingRow[];
}

export async function createFinding(userId: string, input: FindingInput): Promise<FindingRow | null> {
  const { data, error } = await supabase
    .from('compliance_findings')
    .insert({
      user_id: userId,
      control_id: input.control_id,
      control_family: input.control_family ?? '',
      title: input.title,
      description: input.description ?? '',
      severity: input.severity,
      reviewer: input.reviewer ?? '',
      identified_at: input.identified_at ?? new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as FindingRow | null;
}

export async function updateFinding(
  findingId: string,
  patch: Partial<FindingInput> & { status?: FindingStatus },
): Promise<void> {
  const { error } = await supabase
    .from('compliance_findings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', findingId);
  if (error) throw error;
}

export async function deleteFinding(findingId: string): Promise<void> {
  const { error } = await supabase.from('compliance_findings').delete().eq('id', findingId);
  if (error) throw error;
}

export async function fetchActions(findingId: string): Promise<CorrectiveActionRow[]> {
  const { data, error } = await supabase
    .from('corrective_actions')
    .select('*')
    .eq('finding_id', findingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as CorrectiveActionRow[];
}

export async function createAction(userId: string, input: ActionInput): Promise<CorrectiveActionRow | null> {
  const { data, error } = await supabase
    .from('corrective_actions')
    .insert({
      user_id: userId,
      finding_id: input.finding_id,
      title: input.title,
      description: input.description ?? '',
      owner: input.owner ?? '',
      due_date: input.due_date ?? null,
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as CorrectiveActionRow | null;
}

export async function updateAction(
  actionId: string,
  patch: Partial<ActionInput> & { status?: ActionStatus; completed_at?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('corrective_actions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', actionId);
  if (error) throw error;
}

export async function deleteAction(actionId: string): Promise<void> {
  const { error } = await supabase.from('corrective_actions').delete().eq('id', actionId);
  if (error) throw error;
}

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  open: 'Open',
  in_review: 'In Review',
  remediated: 'Remediated',
  accepted: 'Accepted',
  closed: 'Closed',
};

export const FINDING_STATUS_STYLES: Record<FindingStatus, string> = {
  open: 'bg-red-900/20 text-red-300 border-red-700/30',
  in_review: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  remediated: 'bg-sky-900/20 text-sky-300 border-sky-700/30',
  accepted: 'bg-violet-900/20 text-violet-300 border-violet-700/30',
  closed: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
};

export const FINDING_SEVERITY_STYLES: Record<FindingSeverity, string> = {
  low: 'bg-slate-800/40 text-slate-400 border-slate-600/40',
  medium: 'bg-sky-900/20 text-sky-300 border-sky-700/30',
  high: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  critical: 'bg-red-900/30 text-red-300 border-red-700/40',
};

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  verified: 'Verified',
};

export const ACTION_STATUS_STYLES: Record<ActionStatus, string> = {
  pending: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  in_progress: 'bg-sky-900/20 text-sky-300 border-sky-700/30',
  completed: 'bg-emerald-900/20 text-emerald-300 border-emerald-700/30',
  verified: 'bg-violet-900/20 text-violet-300 border-violet-700/30',
};
