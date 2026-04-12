import type { BudgetItem } from '../lib/database.types';

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

export const CFR200_CATEGORIES: CFR200CostCategory[] = [
  {
    key: 'direct_labor',
    label: 'Direct Labor — Personnel',
    cfr200Section: '§ 200.430',
    description: 'Salaries and wages of employees working directly on the project. Effort must be documented via time and effort reporting.',
    dbCategory: 'personnel',
    requiresJustification: true,
  },
  {
    key: 'fringe_benefits',
    label: 'Fringe Benefits',
    cfr200Section: '§ 200.431',
    description: 'Employee benefits (health insurance, retirement, FICA) applied at the institutionally approved fringe rate.',
    dbCategory: 'fringe',
    requiresJustification: false,
  },
  {
    key: 'capital_equipment',
    label: 'Capital Equipment Acquisition',
    cfr200Section: '§ 200.439',
    description: 'Tangible assets with a unit cost ≥ $5,000 and useful life > 1 year. Requires prior written approval from the federal awarding agency.',
    dbCategory: 'hardware',
    requiresJustification: true,
    capitalThreshold: 5000,
  },
  {
    key: 'materials_supplies',
    label: 'Materials & Supplies',
    cfr200Section: '§ 200.453',
    description: 'Consumable materials and supplies necessary for the project. Items below the $5,000 capital equipment threshold.',
    dbCategory: 'supplies',
    requiresJustification: false,
  },
  {
    key: 'travel',
    label: 'Travel',
    cfr200Section: '§ 200.474',
    description: 'Domestic and foreign travel directly related to project activities. Must follow federal per diem rates.',
    dbCategory: 'travel',
    requiresJustification: true,
  },
  {
    key: 'other_direct',
    label: 'Other Direct Costs',
    cfr200Section: '§ 200.456',
    description: 'Computing resources, cloud services, subcontracts, and other allowable direct costs not captured above.',
    dbCategory: 'overhead',
    requiresJustification: false,
  },
  {
    key: 'indirect_costs',
    label: 'Indirect Costs (F&A)',
    cfr200Section: '§ 200.414',
    description: 'Facilities and Administrative (F&A) costs applied at the federally negotiated indirect cost rate agreement (NICRA).',
    dbCategory: 'indirect',
    requiresJustification: false,
  },
];

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
  items: BudgetItem[];
  totalAllocated: number;
  totalSpent: number;
  variance: number;
  utilizationPct: number;
}

export interface BudgetAmendmentCheck {
  requiresAmendment: boolean;
  reason: string | null;
  cfrReference: string;
  transferPct: number;
}

export interface TimeEffortRecord {
  itemName: string;
  category: string;
  hasDocumentation: boolean;
  allocationPct: number;
  finding: string;
  cfrReference: string;
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
  amendmentCheck: BudgetAmendmentCheck;
  timeEffortRecords: TimeEffortRecord[];
}

export function mapDbCategoryToCFR200(dbCategory: string): CFR200CostCategory {
  const match = CFR200_CATEGORIES.find(c => c.dbCategory === dbCategory);
  return match ?? CFR200_CATEGORIES.find(c => c.key === 'other_direct')!;
}

export function validateBudgetItems(items: BudgetItem[]): CostValidationIssue[] {
  const issues: CostValidationIssue[] = [];

  for (const item of items) {
    const cfr = mapDbCategoryToCFR200(item.category);
    const allocated = Number(item.allocated_amount);
    const spent = Number(item.spent_amount);

    if (spent > allocated) {
      issues.push({
        severity: 'error',
        code: 'OVER_BUDGET',
        category: cfr.label,
        itemName: item.item_name,
        message: `Expenditure ($${spent.toLocaleString()}) exceeds allocated amount ($${allocated.toLocaleString()}). Over-expenditure requires agency prior approval.`,
        cfrReference: '2 CFR § 200.308',
      });
    }

    if (cfr.requiresJustification && (!item.description || item.description.trim().length < 10)) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_JUSTIFICATION',
        category: cfr.label,
        itemName: item.item_name,
        message: `This cost category (${cfr.cfr200Section}) requires a written justification. Description is absent or insufficient.`,
        cfrReference: cfr.cfr200Section,
      });
    }

    if (
      cfr.key === 'capital_equipment' &&
      cfr.capitalThreshold &&
      allocated < cfr.capitalThreshold &&
      allocated > 0
    ) {
      issues.push({
        severity: 'info',
        code: 'BELOW_CAPITAL_THRESHOLD',
        category: cfr.label,
        itemName: item.item_name,
        message: `Allocated amount ($${allocated.toLocaleString()}) is below the $5,000 capital equipment threshold. Consider recategorizing as Materials & Supplies (${CFR200_CATEGORIES.find(c => c.key === 'materials_supplies')?.cfr200Section}).`,
        cfrReference: '2 CFR § 200.439',
      });
    }

    if (allocated > 0 && spent / allocated > 0.9 && spent < allocated) {
      issues.push({
        severity: 'info',
        code: 'HIGH_UTILIZATION',
        category: cfr.label,
        itemName: item.item_name,
        message: `Utilization is above 90% (${((spent / allocated) * 100).toFixed(1)}%). Monitor for potential over-expenditure.`,
        cfrReference: '2 CFR § 200.308',
      });
    }
  }

  return issues;
}

export function buildCategoryVariances(items: BudgetItem[]): CategoryVariance[] {
  return CFR200_CATEGORIES.map(category => {
    const matched = items.filter(i => mapDbCategoryToCFR200(i.category).key === category.key);
    const totalAllocated = matched.reduce((s, i) => s + Number(i.allocated_amount), 0);
    const totalSpent = matched.reduce((s, i) => s + Number(i.spent_amount), 0);
    const variance = totalAllocated - totalSpent;
    const utilizationPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
    return { category, items: matched, totalAllocated, totalSpent, variance, utilizationPct };
  });
}

export function checkBudgetAmendment(items: BudgetItem[]): BudgetAmendmentCheck {
  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent_amount), 0);

  if (totalAllocated === 0) {
    return {
      requiresAmendment: false,
      reason: null,
      cfrReference: '2 CFR § 200.308',
      transferPct: 0,
    };
  }

  const spentPct = (totalSpent / totalAllocated) * 100;
  const overspend = totalSpent > totalAllocated;
  const transferPct = Math.abs((totalSpent - totalAllocated) / totalAllocated) * 100;

  if (overspend) {
    return {
      requiresAmendment: true,
      reason: `Total expenditures exceed the approved budget by ${transferPct.toFixed(1)}%. A prior approval request or budget amendment must be submitted to the federal awarding agency.`,
      cfrReference: '2 CFR § 200.308(b)',
      transferPct,
    };
  }

  if (spentPct >= 90) {
    return {
      requiresAmendment: false,
      reason: `Budget utilization is at ${spentPct.toFixed(1)}%. A no-cost extension or supplemental request may be appropriate if funds are insufficient to complete scope.`,
      cfrReference: '2 CFR § 200.308',
      transferPct: 0,
    };
  }

  return {
    requiresAmendment: false,
    reason: null,
    cfrReference: '2 CFR § 200.308',
    transferPct: 0,
  };
}

export function buildTimeEffortRecords(items: BudgetItem[]): TimeEffortRecord[] {
  const laborItems = items.filter(i => mapDbCategoryToCFR200(i.category).key === 'direct_labor');

  if (laborItems.length === 0) {
    return [
      {
        itemName: '(No labor items)',
        category: 'Direct Labor — Personnel',
        hasDocumentation: false,
        allocationPct: 0,
        finding: 'No direct labor line items recorded. Time and Effort documentation cannot be assessed.',
        cfrReference: '2 CFR § 200.430(i)',
      },
    ];
  }

  const totalLaborAllocated = laborItems.reduce((s, i) => s + Number(i.allocated_amount), 0);

  return laborItems.map(item => {
    const allocated = Number(item.allocated_amount);
    const allocationPct = totalLaborAllocated > 0 ? (allocated / totalLaborAllocated) * 100 : 0;
    const hasDocumentation = Boolean(item.description && item.description.trim().length >= 20);

    const finding = hasDocumentation
      ? `Time and Effort documentation present. Effort allocation: ${allocationPct.toFixed(1)}% of total direct labor budget.`
      : `Missing or insufficient Time and Effort documentation. Personnel compensation must be supported by an after-the-fact effort reporting system.`;

    return {
      itemName: item.item_name,
      category: 'Direct Labor — Personnel',
      hasDocumentation,
      allocationPct,
      finding,
      cfrReference: '2 CFR § 200.430(i)',
    };
  });
}

export function generateCostAccountingReport(items: BudgetItem[]): CostAccountingReport {
  const categoryVariances = buildCategoryVariances(items);
  const validationIssues = validateBudgetItems(items);
  const amendmentCheck = checkBudgetAmendment(items);
  const timeEffortRecords = buildTimeEffortRecords(items);

  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = items.reduce((s, i) => s + Number(i.spent_amount), 0);
  const totalVariance = totalAllocated - totalSpent;
  const overallUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const errorCount = validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = validationIssues.filter(i => i.severity === 'warning').length;
  const teDeduction = timeEffortRecords.filter(r => !r.hasDocumentation).length * 5;
  const auditReadinessScore = Math.max(0, 100 - errorCount * 20 - warningCount * 8 - teDeduction);

  return {
    generatedAt: new Date().toISOString(),
    totalAllocated,
    totalSpent,
    totalVariance,
    overallUtilization,
    categoryVariances,
    validationIssues,
    auditReadinessScore,
    amendmentCheck,
    timeEffortRecords,
  };
}

export const DOE_VARIANCE_CATEGORIES = [
  {
    key: 'direct_labor' as CostCategory,
    label: 'Direct Labor (PI Salary)',
    dbCategories: ['personnel', 'fringe'],
  },
  {
    key: 'capital_equipment' as CostCategory,
    label: 'Equipment (Infrastructure Sensors/Hardware)',
    dbCategories: ['hardware'],
  },
  {
    key: 'materials_supplies' as CostCategory,
    label: 'Consumables (Compute/Cloud Tokens)',
    dbCategories: ['supplies', 'overhead'],
  },
] as const;

export interface DOEVarianceLine {
  label: string;
  key: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePct: number;
  withinThreshold: boolean;
}

export interface DOEVarianceReport {
  lines: DOEVarianceLine[];
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePct: number;
  compliant: boolean;
  thresholdPct: number;
}

export function buildDOEVarianceReport(
  items: BudgetItem[],
  thresholdPct = 10,
): DOEVarianceReport {
  const lines: DOEVarianceLine[] = DOE_VARIANCE_CATEGORIES.map(cat => {
    const matched = items.filter(i => cat.dbCategories.includes(i.category as never));
    const budgeted = matched.reduce((s, i) => s + Number(i.allocated_amount), 0);
    const actual = matched.reduce((s, i) => s + Number(i.spent_amount), 0);
    const variance = budgeted - actual;
    const variancePct = budgeted > 0 ? (Math.abs(variance) / budgeted) * 100 : 0;
    const withinThreshold = variancePct <= thresholdPct || actual <= budgeted;
    return { label: cat.label, key: cat.key, budgeted, actual, variance, variancePct, withinThreshold };
  });

  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0);
  const totalActual = lines.reduce((s, l) => s + l.actual, 0);
  const totalVariance = totalBudgeted - totalActual;
  const totalVariancePct = totalBudgeted > 0 ? (Math.abs(totalVariance) / totalBudgeted) * 100 : 0;
  const compliant = lines.every(l => l.withinThreshold) && totalVariancePct <= thresholdPct;

  return {
    lines,
    totalBudgeted,
    totalActual,
    totalVariance,
    totalVariancePct,
    compliant,
    thresholdPct,
  };
}

export function getIssueSeverityClasses(severity: CostValidationIssue['severity']): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  switch (severity) {
    case 'error':
      return { bg: 'bg-red-900/20', border: 'border-red-700/40', text: 'text-red-300', dot: 'bg-red-400' };
    case 'warning':
      return { bg: 'bg-amber-900/20', border: 'border-amber-700/40', text: 'text-amber-300', dot: 'bg-amber-400' };
    default:
      return { bg: 'bg-sky-900/10', border: 'border-sky-700/30', text: 'text-sky-300', dot: 'bg-sky-400' };
  }
}
