import { supabase } from '../lib/supabase';

export type TipSourceChannel = 'hotline' | 'email' | 'walk_in' | 'anonymous_drop' | 'web_form' | 'other';
export type TipCategory = 'fraud' | 'waste' | 'abuse' | 'safety' | 'corruption' | 'other';
export type TipPriority = 'low' | 'medium' | 'high' | 'critical';
export type TipStatus = 'new' | 'under_review' | 'referred' | 'closed' | 'unfounded';
export type ReferralStatus = 'pending' | 'accepted' | 'rejected' | 'closed';

export interface TipRow {
  id: string;
  source_channel: TipSourceChannel;
  is_anonymous: boolean;
  submitter_name: string | null;
  submitter_contact: string | null;
  category: TipCategory;
  priority: TipPriority;
  subject: string;
  description: string;
  incident_location: string;
  incident_date: string | null;
  status: TipStatus;
  created_at: string;
  updated_at: string;
}

export interface ReferralRow {
  id: string;
  tip_id: string;
  referred_to_agency: string;
  referred_to_contact: string;
  referral_reason: string;
  referral_date: string;
  status: ReferralStatus;
  agency_case_number: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface TipInput {
  source_channel: TipSourceChannel;
  is_anonymous: boolean;
  submitter_name?: string | null;
  submitter_contact?: string | null;
  category: TipCategory;
  priority: TipPriority;
  subject: string;
  description?: string;
  incident_location?: string;
  incident_date?: string | null;
}

export interface ReferralInput {
  tip_id: string;
  referred_to_agency: string;
  referred_to_contact?: string;
  referral_reason?: string;
  agency_case_number?: string;
  notes?: string;
}

export async function fetchTips(userId: string): Promise<TipRow[]> {
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as TipRow[];
}

export async function createTip(userId: string, input: TipInput): Promise<TipRow | null> {
  const { data, error } = await supabase
    .from('tips')
    .insert({
      user_id: userId,
      source_channel: input.source_channel,
      is_anonymous: input.is_anonymous,
      submitter_name: input.is_anonymous ? null : (input.submitter_name ?? null),
      submitter_contact: input.is_anonymous ? null : (input.submitter_contact ?? null),
      category: input.category,
      priority: input.priority,
      subject: input.subject,
      description: input.description ?? '',
      incident_location: input.incident_location ?? '',
      incident_date: input.incident_date ?? null,
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as TipRow | null;
}

export async function updateTip(
  tipId: string,
  patch: Partial<TipInput> & { status?: TipStatus },
): Promise<void> {
  const { error } = await supabase
    .from('tips')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', tipId);
  if (error) throw error;
}

export async function deleteTip(tipId: string): Promise<void> {
  const { error } = await supabase.from('tips').delete().eq('id', tipId);
  if (error) throw error;
}

export async function fetchReferrals(tipId: string): Promise<ReferralRow[]> {
  const { data, error } = await supabase
    .from('tip_referrals')
    .select('*')
    .eq('tip_id', tipId)
    .order('referral_date', { ascending: true });
  if (error) throw error;
  return (data || []) as ReferralRow[];
}

export async function createReferral(userId: string, input: ReferralInput): Promise<ReferralRow | null> {
  const { data, error } = await supabase
    .from('tip_referrals')
    .insert({
      user_id: userId,
      tip_id: input.tip_id,
      referred_to_agency: input.referred_to_agency,
      referred_to_contact: input.referred_to_contact ?? '',
      referral_reason: input.referral_reason ?? '',
      agency_case_number: input.agency_case_number ?? '',
      notes: input.notes ?? '',
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as ReferralRow | null;
}

export async function updateReferral(
  referralId: string,
  patch: Partial<ReferralInput> & { status?: ReferralStatus },
): Promise<void> {
  const { error } = await supabase
    .from('tip_referrals')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', referralId);
  if (error) throw error;
}

export async function deleteReferral(referralId: string): Promise<void> {
  const { error } = await supabase.from('tip_referrals').delete().eq('id', referralId);
  if (error) throw error;
}

export const TIP_STATUS_LABELS: Record<TipStatus, string> = {
  new: 'New',
  under_review: 'Under Review',
  referred: 'Referred',
  closed: 'Closed',
  unfounded: 'Unfounded',
};

export const TIP_STATUS_STYLES: Record<TipStatus, string> = {
  new: 'bg-sky-900/30 text-sky-300 border-sky-700/40',
  under_review: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  referred: 'bg-violet-900/20 text-violet-300 border-violet-700/30',
  closed: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  unfounded: 'bg-red-900/20 text-red-300 border-red-700/30',
};

export const TIP_PRIORITY_STYLES: Record<TipPriority, string> = {
  low: 'bg-slate-800/40 text-slate-400 border-slate-600/40',
  medium: 'bg-sky-900/20 text-sky-300 border-sky-700/30',
  high: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  critical: 'bg-red-900/30 text-red-300 border-red-700/40',
};

export const TIP_CATEGORY_LABELS: Record<TipCategory, string> = {
  fraud: 'Fraud',
  waste: 'Waste',
  abuse: 'Abuse',
  safety: 'Safety',
  corruption: 'Corruption',
  other: 'Other',
};

export const TIP_SOURCE_LABELS: Record<TipSourceChannel, string> = {
  hotline: 'Hotline',
  email: 'Email',
  walk_in: 'Walk-in',
  anonymous_drop: 'Anonymous Drop',
  web_form: 'Web Form',
  other: 'Other',
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  closed: 'Closed',
};

export const REFERRAL_STATUS_STYLES: Record<ReferralStatus, string> = {
  pending: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  accepted: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  rejected: 'bg-red-900/20 text-red-300 border-red-700/30',
  closed: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
};
