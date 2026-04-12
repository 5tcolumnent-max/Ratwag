import { useMemo, useState } from 'react';
import { DollarSign, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronRight, BookOpen, FileCheck, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { BudgetItem } from '../../lib/database.types';
import {
  generateCostAccountingReport,
  getIssueSeverityClasses,
  buildDOEVarianceReport,
} from '../../compliance/FederalCostAccounting';
import type { CostValidationIssue, TimeEffortRecord, DOEVarianceReport } from '../../compliance/FederalCostAccounting';

interface Props {
  items: BudgetItem[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function IssueRow({ issue }: { issue: CostValidationIssue }) {
  const cls = getIssueSeverityClasses(issue.severity);
  const Icon = issue.severity === 'info' ? Info : AlertTriangle;

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${cls.bg} ${cls.border}`}>
      <div className="shrink-0 mt-0.5">
        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${cls.dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className={`w-3.5 h-3.5 ${cls.text} shrink-0`} />
          <span className={`text-xs font-semibold ${cls.text}`}>{issue.code}</span>
          <span className="text-xs text-slate-500">—</span>
          <span className="text-xs text-slate-400 truncate">{issue.itemName}</span>
        </div>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{issue.message}</p>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">{issue.cfrReference}</p>
      </div>
    </div>
  );
}

function TimeEffortRow({ record }: { record: TimeEffortRecord }) {
  return (
    <div className={`flex items-start gap-3 py-2.5 border-b border-slate-800/40 last:border-0`}>
      <div className="shrink-0 mt-0.5">
        {record.hasDocumentation ? (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-200">{record.itemName}</span>
          {record.allocationPct > 0 && (
            <span className="text-[10px] font-mono text-slate-500">{record.allocationPct.toFixed(1)}% of labor</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{record.finding}</p>
        <p className="text-[10px] text-slate-600 font-mono mt-0.5">{record.cfrReference}</p>
      </div>
      <span className={`text-[10px] font-semibold uppercase shrink-0 ${record.hasDocumentation ? 'text-emerald-400' : 'text-amber-400'}`}>
        {record.hasDocumentation ? 'Documented' : 'Missing'}
      </span>
    </div>
  );
}

function CategoryRow({
  variance,
  expanded,
  onToggle,
}: {
  variance: ReturnType<typeof generateCostAccountingReport>['categoryVariances'][0];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { category, totalAllocated, totalSpent, variance: varAmt, utilizationPct, items } = variance;
  const isOver = varAmt < 0;
  const isHigh = utilizationPct > 90 && !isOver;

  return (
    <div className="border border-slate-700/40 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
      >
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{category.label}</span>
            <span className="text-[10px] text-slate-500 font-mono">{category.cfr200Section}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0 text-right">
          <div>
            <p className="text-xs text-slate-500">Allocated</p>
            <p className="text-sm font-mono text-slate-200">{formatCurrency(totalAllocated)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Spent</p>
            <p className="text-sm font-mono text-slate-300">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="w-20">
            <p className="text-xs text-slate-500">Variance</p>
            <p className={`text-sm font-mono font-semibold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
              {isOver ? '' : '+'}{formatCurrency(varAmt)}
            </p>
          </div>
          <div className="w-14">
            <div className="flex justify-end mb-1">
              <span className={`text-xs font-mono ${isOver ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-slate-400'}`}>
                {totalAllocated > 0 ? `${utilizationPct.toFixed(0)}%` : '—'}
              </span>
            </div>
            {totalAllocated > 0 && (
              <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-700/30 bg-slate-900/20 px-4 py-3 space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed mb-3">{category.description}</p>
          {items.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No line items recorded for this category.</p>
          ) : (
            <div className="space-y-1">
              {items.map(item => {
                const alloc = Number(item.allocated_amount);
                const spent = Number(item.spent_amount);
                const v = alloc - spent;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-slate-800/40 last:border-0">
                    <span className="text-xs text-slate-300 flex-1 truncate">{item.item_name}</span>
                    {item.description && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[200px] hidden md:block">{item.description}</span>
                    )}
                    <span className="text-xs font-mono text-slate-400 shrink-0">{formatCurrency(alloc)}</span>
                    <span className={`text-xs font-mono shrink-0 ${v < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {v >= 0 ? '+' : ''}{formatCurrency(v)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DOEVariancePanel({ doeReport }: { doeReport: DOEVarianceReport }) {
  const { compliant, thresholdPct, lines, totalBudgeted, totalActual, totalVariance, totalVariancePct } = doeReport;

  return (
    <div className={`rounded-xl border p-5 ${compliant ? 'bg-emerald-900/10 border-emerald-700/40' : 'bg-red-900/10 border-red-700/40'}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          {compliant ? (
            <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-700/40">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-red-900/30 border border-red-700/40">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-slate-200">DOE Budget Compliance Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Variance threshold: ±{thresholdPct}% per 2 CFR § 200.308</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${
          compliant
            ? 'bg-emerald-900/30 border-emerald-600/50 text-emerald-300'
            : 'bg-red-900/30 border-red-600/50 text-red-300'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${compliant ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {compliant ? 'Compliant' : 'Out of Compliance'}
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {lines.map(line => {
          const isOver = line.actual > line.budgeted;
          const exceeds = !line.withinThreshold;
          return (
            <div key={line.key} className="bg-slate-900/30 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${exceeds ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-medium text-slate-200 leading-snug">{line.label}</span>
                </div>
                <span className={`text-[10px] font-semibold shrink-0 ${exceeds ? 'text-red-300' : 'text-emerald-300'}`}>
                  {exceeds ? 'EXCEEDS' : 'WITHIN'} ±{thresholdPct}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center mb-2">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Budgeted</p>
                  <p className="text-xs font-mono text-slate-300">{formatCurrency(line.budgeted)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Actual</p>
                  <p className={`text-xs font-mono ${isOver ? 'text-red-400' : 'text-slate-300'}`}>{formatCurrency(line.actual)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Variance</p>
                  <p className={`text-xs font-mono font-semibold ${line.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {line.variance >= 0 ? '+' : ''}{formatCurrency(line.variance)}
                    <span className="text-[9px] ml-1 opacity-70">({line.variancePct.toFixed(1)}%)</span>
                  </p>
                </div>
              </div>
              {line.budgeted > 0 && (
                <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : exceeds ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min((line.actual / line.budgeted) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`flex items-center justify-between pt-4 border-t ${compliant ? 'border-emerald-800/30' : 'border-red-800/30'}`}>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Budgeted</p>
            <p className="text-sm font-mono font-bold text-slate-200">{formatCurrency(totalBudgeted)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Actual</p>
            <p className="text-sm font-mono font-bold text-slate-200">{formatCurrency(totalActual)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Net Variance</p>
            <p className={`text-sm font-mono font-bold ${totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
              <span className="text-xs ml-1 opacity-70">({totalVariancePct.toFixed(1)}%)</span>
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 font-mono">2 CFR § 200.308</p>
      </div>
    </div>
  );
}

export default function CostAccountingPanel({ items }: Props) {
  const report = useMemo(() => generateCostAccountingReport(items), [items]);
  const doeReport = useMemo(() => buildDOEVarianceReport(items, 10), [items]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState(false);

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const errorCount = report.validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = report.validationIssues.filter(i => i.severity === 'warning').length;
  const infoCount = report.validationIssues.filter(i => i.severity === 'info').length;

  const displayedVariances = showAllCategories
    ? report.categoryVariances
    : report.categoryVariances.filter(v => v.items.length > 0);

  const { amendmentCheck, timeEffortRecords } = report;
  const teDocumented = timeEffortRecords.filter(r => r.hasDocumentation).length;
  const teTotal = timeEffortRecords.length;

  return (
    <div className="space-y-6">
      <DOEVariancePanel doeReport={doeReport} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Allocated</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(report.totalAllocated)}</p>
          <p className="text-xs text-slate-600 mt-0.5">Across all 2 CFR 200 categories</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Expended</p>
          <p className="text-xl font-bold text-slate-200 mt-1">{formatCurrency(report.totalSpent)}</p>
          <p className="text-xs text-slate-600 mt-0.5">{report.overallUtilization.toFixed(1)}% utilization</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Budget Variance</p>
          <p className={`text-xl font-bold mt-1 ${report.totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {report.totalVariance >= 0 ? '+' : ''}{formatCurrency(report.totalVariance)}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{report.totalVariance >= 0 ? 'Under budget' : 'Over budget — requires approval'}</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Audit Readiness</p>
          <p className={`text-xl font-bold mt-1 ${report.auditReadinessScore >= 80 ? 'text-emerald-400' : report.auditReadinessScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {report.auditReadinessScore}%
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{errorCount} error(s), {warningCount} warning(s)</p>
        </div>
      </div>

      {amendmentCheck.reason && (
        <div className={`flex gap-3 p-4 rounded-xl border ${amendmentCheck.requiresAmendment ? 'bg-red-900/15 border-red-700/40' : 'bg-amber-900/10 border-amber-700/30'}`}>
          <div className="shrink-0 mt-0.5">
            {amendmentCheck.requiresAmendment ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <Info className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div>
            <p className={`text-xs font-semibold mb-0.5 ${amendmentCheck.requiresAmendment ? 'text-red-300' : 'text-amber-300'}`}>
              {amendmentCheck.requiresAmendment ? 'Budget Amendment Required' : 'Budget Advisory'}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">{amendmentCheck.reason}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{amendmentCheck.cfrReference}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">2 CFR Part 200 — Cost Category Variance Report</h3>
          <button
            onClick={() => setShowAllCategories(v => !v)}
            className="ml-auto text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            {showAllCategories ? 'Show active only' : 'Show all categories'}
          </button>
        </div>
        <div className="space-y-2">
          {displayedVariances.map(v => (
            <CategoryRow
              key={v.category.key}
              variance={v}
              expanded={expandedCategories.has(v.category.key)}
              onToggle={() => toggleCategory(v.category.key)}
            />
          ))}
          {displayedVariances.length === 0 && (
            <p className="text-sm text-slate-500 py-4 text-center">
              No budget items recorded. Add items in the Budget Administration tab.
            </p>
          )}
        </div>
      </div>

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">Time & Effort Reporting — § 200.430(i)</h3>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            teDocumented === teTotal && teTotal > 0
              ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40'
              : 'text-amber-300 bg-amber-900/20 border-amber-700/30'
          }`}>
            {teDocumented}/{teTotal} Documented
          </span>
        </div>
        <div>
          {timeEffortRecords.map((record, idx) => (
            <TimeEffortRow key={idx} record={record} />
          ))}
        </div>
      </div>

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">Compliance Validation Issues</h3>
          </div>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="text-[10px] font-semibold text-red-300 bg-red-900/30 border border-red-700/40 px-2 py-0.5 rounded-full">
                {errorCount} Error{errorCount !== 1 ? 's' : ''}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] font-semibold text-amber-300 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
                {warningCount} Warning{warningCount !== 1 ? 's' : ''}
              </span>
            )}
            {infoCount > 0 && (
              <span className="text-[10px] font-semibold text-sky-300 bg-sky-900/20 border border-sky-700/30 px-2 py-0.5 rounded-full">
                {infoCount} Info
              </span>
            )}
          </div>
        </div>

        {report.validationIssues.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-300">No validation issues detected</p>
              <p className="text-xs text-slate-500 mt-0.5">All budget items conform to 2 CFR Part 200 requirements.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {report.validationIssues
              .sort((a, b) => {
                const order = { error: 0, warning: 1, info: 2 };
                return order[a.severity] - order[b.severity];
              })
              .map((issue, idx) => (
                <IssueRow key={idx} issue={issue} />
              ))}
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-600 text-right">
        Report generated: {new Date(report.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        &nbsp;|&nbsp; Standard: OMB Uniform Guidance (2 CFR Part 200)
      </div>
    </div>
  );
}
