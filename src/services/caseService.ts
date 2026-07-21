import { supabase } from '../lib/supabase';

export type CaseStatus = 'open' | 'in_progress' | 'closed' | 'archived';
export type CaseClassification = 'unclassified' | 'restricted' | 'confidential';
export type EvidenceType = 'document' | 'photo' | 'video' | 'audio' | 'physical' | 'digital';
export type ChainStatus = 'in_custody' | 'transferred' | 'released' | 'destroyed';
export type CustodyAction = 'collected' | 'transferred' | 'viewed' | 'released' | 'returned' | 'destroyed';

export interface CaseRow {
  id: string;
  case_number: string;
  title: string;
  status: CaseStatus;
  classification: CaseClassification;
  summary: string;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItemRow {
  id: string;
  case_id: string;
  item_number: string;
  title: string;
  description: string;
  evidence_type: EvidenceType;
  collection_method: string;
  collected_at: string | null;
  collected_by: string;
  storage_location: string;
  hash_sha256: string;
  chain_status: ChainStatus;
  created_at: string;
  updated_at: string;
}

export interface ChainOfCustodyRow {
  id: string;
  evidence_id: string;
  from_holder: string;
  to_holder: string;
  action: CustodyAction;
  reason: string;
  occurred_at: string;
  created_at: string;
}

export interface CaseInput {
  case_number: string;
  title: string;
  status?: CaseStatus;
  classification?: CaseClassification;
  summary?: string;
}

export interface EvidenceInput {
  case_id: string;
  item_number: string;
  title: string;
  description?: string;
  evidence_type: EvidenceType;
  collection_method?: string;
  collected_at?: string | null;
  collected_by?: string;
  storage_location?: string;
  hash_sha256?: string;
}

export interface CustodyInput {
  evidence_id: string;
  from_holder?: string;
  to_holder?: string;
  action: CustodyAction;
  reason?: string;
  occurred_at?: string;
}

export async function fetchCases(userId: string): Promise<CaseRow[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });
  if (error) throw error;
  return (data || []) as CaseRow[];
}

export async function createCase(userId: string, input: CaseInput): Promise<CaseRow | null> {
  const { data, error } = await supabase
    .from('cases')
    .insert({
      user_id: userId,
      case_number: input.case_number,
      title: input.title,
      status: input.status ?? 'open',
      classification: input.classification ?? 'unclassified',
      summary: input.summary ?? '',
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as CaseRow | null;
}

export async function updateCase(
  caseId: string,
  patch: Partial<CaseInput> & { status?: CaseStatus; closed_at?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('cases')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', caseId);
  if (error) throw error;
}

export async function deleteCase(caseId: string): Promise<void> {
  const { error } = await supabase.from('cases').delete().eq('id', caseId);
  if (error) throw error;
}

export async function fetchEvidence(caseId: string): Promise<EvidenceItemRow[]> {
  const { data, error } = await supabase
    .from('evidence_items')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as EvidenceItemRow[];
}

export async function addEvidence(userId: string, input: EvidenceInput): Promise<EvidenceItemRow | null> {
  const { data, error } = await supabase
    .from('evidence_items')
    .insert({
      user_id: userId,
      case_id: input.case_id,
      item_number: input.item_number,
      title: input.title,
      description: input.description ?? '',
      evidence_type: input.evidence_type,
      collection_method: input.collection_method ?? '',
      collected_at: input.collected_at ?? null,
      collected_by: input.collected_by ?? '',
      storage_location: input.storage_location ?? '',
      hash_sha256: input.hash_sha256 ?? '',
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as EvidenceItemRow | null;
}

export async function deleteEvidence(evidenceId: string): Promise<void> {
  const { error } = await supabase.from('evidence_items').delete().eq('id', evidenceId);
  if (error) throw error;
}

export async function fetchCustody(evidenceId: string): Promise<ChainOfCustodyRow[]> {
  const { data, error } = await supabase
    .from('chain_of_custody')
    .select('*')
    .eq('evidence_id', evidenceId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ChainOfCustodyRow[];
}

export async function addCustodyEntry(userId: string, input: CustodyInput): Promise<void> {
  const { error } = await supabase.from('chain_of_custody').insert({
    user_id: userId,
    evidence_id: input.evidence_id,
    from_holder: input.from_holder ?? '',
    to_holder: input.to_holder ?? '',
    action: input.action,
    reason: input.reason ?? '',
    occurred_at: input.occurred_at ?? new Date().toISOString(),
  });
  if (error) throw error;
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
  archived: 'Archived',
};

export const STATUS_STYLES: Record<CaseStatus, string> = {
  open: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  in_progress: 'bg-sky-900/30 text-sky-300 border-sky-700/40',
  closed: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  archived: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
};

export const CLASSIFICATION_STYLES: Record<CaseClassification, string> = {
  unclassified: 'bg-slate-800/40 text-slate-400 border-slate-600/40',
  restricted: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  confidential: 'bg-red-900/20 text-red-300 border-red-700/30',
};

export const EVIDENCE_TYPE_ICON: Record<EvidenceType, string> = {
  document: 'FileText',
  photo: 'Camera',
  video: 'Video',
  audio: 'Volume2',
  physical: 'Package',
  digital: 'HardDrive',
};

export const CHAIN_STATUS_STYLES: Record<ChainStatus, string> = {
  in_custody: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  transferred: 'bg-sky-900/30 text-sky-300 border-sky-700/40',
  released: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  destroyed: 'bg-red-900/30 text-red-300 border-red-700/40',
};
