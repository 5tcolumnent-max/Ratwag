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

export type CostCategory =
  | 'direct_labor'
  | 'fringe_benefits'
  | 'capital_equipment'
  | 'materials_supplies'
  | 'travel'
  | 'other_direct'
  | 'indirect_costs';

export interface CFR200CostCategory {
  key: CostCategory;
  label: string;
  cfr200Section: string;
  description: string;
  dbCategory: string;
  requiresJustification: boolean;
  capitalThreshold?: number;
}

export interface CostValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  category: string;
  itemName: string;
  message: string;
  cfrReference: string;
}

export interface CategoryVariance {
  category: CFR200CostCategory;
  items: import('./database.types').BudgetItem[];
  totalAllocated: number;
  totalSpent: number;
  variance: number;
  utilizationPct: number;
}

export interface CostAccountingReport {
  generatedAt: string;
  totalAllocated: number;
  totalSpent: number;
  totalVariance: number;
  overallUtilization: number;
  categoryVariances: CategoryVariance[];
  validationIssues: CostValidationIssue[];
  auditReadinessScore: number;
  amendmentCheck: {
    requiresAmendment: boolean;
    reason: string | null;
    cfrReference: string;
    transferPct: number;
  };
  timeEffortRecords: {
    itemName: string;
    category: string;
    hasDocumentation: boolean;
    allocationPct: number;
    finding: string;
    cfrReference: string;
  }[];
}
