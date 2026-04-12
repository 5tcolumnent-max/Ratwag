import { supabase } from '../lib/supabase';
import type { GrantMilestone, ComplianceDocument } from '../lib/database.types';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'submitted';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceMetrics {
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  inProgressMilestones: number;
  completionRate: number;
  totalDocuments: number;
  readyDocuments: number;
  draftDocuments: number;
  overallCompliance: number;
}

const DEFAULT_MILESTONES: Omit<GrantMilestone, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Technical Narrative Draft',
    description: 'Complete the 5-page DOE technical narrative covering innovation hypothesis, research methodology, and Phase I deliverables.',
    due_date: '2026-04-12T23:59:00Z',
    status: 'in_progress',
    phase: 'Phase_I',
    priority: 'critical',
  },
  {
    title: 'Budget Justification Document',
    description: 'Detailed line-item justification for all budget categories including personnel salary and Optimus Gen 3 hardware acquisition.',
    due_date: '2026-04-15T23:59:00Z',
    status: 'in_progress',
    phase: 'Phase_I',
    priority: 'high',
  },
  {
    title: 'Data Management Plan',
    description: 'NIST SP 800-53 compliant data management and security protocols for federally funded research data.',
    due_date: '2026-04-17T23:59:00Z',
    status: 'pending',
    phase: 'Phase_I',
    priority: 'high',
  },
  {
    title: 'Project Abstract and Executive Summary',
    description: 'Concise 200-word abstract and 1-page executive summary formatted for Grants.gov submission requirements.',
    due_date: '2026-04-19T23:59:00Z',
    status: 'pending',
    phase: 'Phase_I',
    priority: 'medium',
  },
  {
    title: 'Principal Investigator Biosketches',
    description: 'NSF-formatted biographical sketches for the PI and all key personnel on the research team.',
    due_date: '2026-04-21T23:59:00Z',
    status: 'pending',
    phase: 'Phase_I',
    priority: 'medium',
  },
  {
    title: 'Facilities and Resources Statement',
    description: 'Documentation of available computational infrastructure, laboratory resources, and institutional support.',
    due_date: '2026-04-23T23:59:00Z',
    status: 'pending',
    phase: 'Phase_I',
    priority: 'medium',
  },
  {
    title: 'Internal Compliance Review',
    description: 'Institutional review and approval of all submission documents by sponsored research office.',
    due_date: '2026-04-24T23:59:00Z',
    status: 'pending',
    phase: 'Phase_I',
    priority: 'high',
  },
  {
    title: 'Final Grants.gov Submission',
    description: 'Complete electronic submission of DOE Genesis Mission Phase I application package via Grants.gov portal.',
    due_date: '2026-04-28T23:59:00Z',
    status: 'pending',
    phase: 'Phase_I',
    priority: 'critical',
  },
];

const DEFAULT_DOCUMENTS: Omit<ComplianceDocument, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Phase I Technical Narrative',
    document_type: 'technical_narrative',
    version: 1,
    status: 'draft',
    notes: 'Active development. Covers innovation hypothesis, methodology, and expected deliverables for Phase I.',
  },
  {
    title: 'Budget Justification',
    document_type: 'budget_justification',
    version: 1,
    status: 'draft',
    notes: 'Personnel salary allocations (0.5 FTE PI, 1.0 FTE RA) and Optimus Gen 3 hardware acquisition costs.',
  },
  {
    title: 'Data Management Plan',
    document_type: 'data_management_plan',
    version: 1,
    status: 'draft',
    notes: 'NIST SP 800-53 compliant. Covers data collection, storage, retention, and security protocols.',
  },
  {
    title: 'Infrastructure Security Assessment',
    document_type: 'security_assessment',
    version: 1,
    status: 'draft',
    notes: 'NIST-CI risk profile documentation for 15m perimeter monitoring systems and network telemetry.',
  },
];

export async function fetchMilestones(): Promise<GrantMilestone[]> {
  const { data, error } = await supabase
    .from('grant_milestones')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchComplianceDocuments(): Promise<ComplianceDocument[]> {
  const { data, error } = await supabase
    .from('compliance_documents')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function seedDefaultData(userId: string): Promise<void> {
  const milestones = DEFAULT_MILESTONES.map(m => ({ ...m, user_id: userId }));
  await supabase.from('grant_milestones').insert(milestones);

  const documents = DEFAULT_DOCUMENTS.map(d => ({ ...d, user_id: userId }));
  await supabase.from('compliance_documents').insert(documents);
}

export async function updateMilestoneStatus(id: string, status: MilestoneStatus): Promise<void> {
  const { error } = await supabase
    .from('grant_milestones')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateDocumentStatus(id: string, status: DocumentStatus): Promise<void> {
  const { error } = await supabase
    .from('compliance_documents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateDocumentVersion(id: string, version: number): Promise<void> {
  const { error } = await supabase
    .from('compliance_documents')
    .update({ version, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export function calculateComplianceMetrics(
  milestones: GrantMilestone[],
  documents: ComplianceDocument[]
): ComplianceMetrics {
  const now = new Date();
  const completed = milestones.filter(m => m.status === 'completed').length;
  const overdue = milestones.filter(
    m => m.status !== 'completed' && new Date(m.due_date) < now
  ).length;
  const inProgress = milestones.filter(m => m.status === 'in_progress').length;
  const readyDocs = documents.filter(d => d.status === 'submitted' || d.status === 'approved').length;
  const draftDocs = documents.filter(d => d.status === 'draft').length;

  const milestoneScore = milestones.length > 0 ? (completed / milestones.length) * 100 : 0;
  const docScore = documents.length > 0 ? (readyDocs / documents.length) * 100 : 0;
  const overallCompliance =
    milestones.length > 0 || documents.length > 0
      ? milestoneScore * 0.6 + docScore * 0.4
      : 0;

  return {
    totalMilestones: milestones.length,
    completedMilestones: completed,
    overdueMilestones: overdue,
    inProgressMilestones: inProgress,
    completionRate: milestoneScore,
    totalDocuments: documents.length,
    readyDocuments: readyDocs,
    draftDocuments: draftDocs,
    overallCompliance,
  };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'submitted':
    case 'approved':
      return 'text-emerald-400';
    case 'in_progress':
    case 'review':
      return 'text-sky-400';
    case 'overdue':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}

export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'completed':
    case 'submitted':
    case 'approved':
      return 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50';
    case 'in_progress':
    case 'review':
      return 'bg-sky-900/40 text-sky-300 border border-sky-700/50';
    case 'overdue':
      return 'bg-red-900/40 text-red-300 border border-red-700/50';
    default:
      return 'bg-slate-800/60 text-slate-400 border border-slate-700/50';
  }
}

export function getPriorityBadgeClasses(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-900/30 text-red-300 border border-red-700/40';
    case 'high':
      return 'bg-amber-900/30 text-amber-300 border border-amber-700/40';
    case 'medium':
      return 'bg-blue-900/30 text-blue-300 border border-blue-700/40';
    default:
      return 'bg-slate-800/40 text-slate-400 border border-slate-700/40';
  }
}

export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDaysUntilDue(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
