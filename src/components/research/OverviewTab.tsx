import { useEffect, useState } from 'react';
import { CheckSquare, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import type { GrantMilestone, ComplianceDocument, BudgetItem, InfrastructureReading } from '../../lib/database.types';

type TabId = 'overview' | 'milestones' | 'budget' | 'cost_accounting' | 'documents' | 'telemetry' | 'nist_profile' | 'access_control' | 'forensics' | 'threat_intel' | 'incidents' | 'vulnerabilities' | 'env_hazards';

interface ComplianceMetrics {
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

interface RiskProfile {
  overall: string;
  nistComplianceScore: number;
}

interface DoeVarianceReport {
  compliant: boolean;
  thresholdPct: number;
  lines: { key: string; label: string; variancePct: number; withinThreshold: boolean }[];
  totalVariance: number;
  totalVariancePct: number;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'amber' | 'red' | 'sky' | 'default';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-emerald-400'
      : accent === 'amber'
      ? 'text-amber-400'
      : accent === 'red'
      ? 'text-red-400'
      : accent === 'sky'
      ? 'text-sky-400'
      : 'text-white';

  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5 hover:border-slate-600/50 transition-all">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function OverviewTab({
  milestones,
  documents,
  readings,
  budgetItems,
  onNavigate,
}: {
  milestones: GrantMilestone[];
  documents: ComplianceDocument[];
  readings: InfrastructureReading[];
  budgetItems: BudgetItem[];
  onNavigate: (tab: TabId) => void;
}) {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [doeVariance, setDoeVariance] = useState<DoeVarianceReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ calculateComplianceMetrics }, { aggregateRiskProfile }, { buildDOEVarianceReport }] =
        await Promise.all([
          import('../../compliance/GrantReportingEngine'),
          import('../../telemetry/InfrastructureMonitor'),
          import('../../compliance/FederalCostAccounting'),
        ]);
      if (cancelled) return;
      setMetrics(calculateComplianceMetrics(milestones, documents));
      setRiskProfile(aggregateRiskProfile(readings));
      setDoeVariance(buildDOEVarianceReport(budgetItems, 10));
    })();
    return () => { cancelled = true; };
  }, [milestones, documents, readings, budgetItems]);

  if (!metrics || !riskProfile || !doeVariance) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );
  }

  const totalAllocated = budgetItems.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = budgetItems.reduce((s, i) => s + Number(i.spent_amount), 0);
  const utilizationPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const upcoming = milestones
    .filter(m => m.status !== 'completed')
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Milestone Progress"
          value={`${metrics.completedMilestones}/${metrics.totalMilestones}`}
          sub={`${metrics.completionRate.toFixed(0)}% complete`}
          accent={metrics.completionRate >= 80 ? 'green' : metrics.completionRate >= 40 ? 'amber' : 'default'}
        />
        <StatCard
          label="Budget Utilization"
          value={`${utilizationPct.toFixed(0)}%`}
          sub={`$${(totalAllocated / 1000).toFixed(0)}K allocated`}
          accent={utilizationPct > 90 ? 'red' : utilizationPct > 70 ? 'amber' : 'green'}
        />
        <StatCard
          label="Document Readiness"
          value={`${metrics.readyDocuments}/${metrics.totalDocuments}`}
          sub={`${metrics.draftDocuments} in draft`}
          accent={metrics.readyDocuments === metrics.totalDocuments && metrics.totalDocuments > 0 ? 'green' : 'amber'}
        />
        <StatCard
          label="Sensor Risk Level"
          value={riskProfile.overall.toUpperCase()}
          sub={`NIST: ${riskProfile.nistComplianceScore}% compliant`}
          accent={
            riskProfile.overall === 'low'
              ? 'green'
              : riskProfile.overall === 'medium'
              ? 'amber'
              : 'red'
          }
        />
      </div>

      <div
        onClick={() => onNavigate('cost_accounting')}
        className={`cursor-pointer flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-all hover:brightness-110 ${
          doeVariance.compliant
            ? 'bg-emerald-900/10 border-emerald-700/40 hover:border-emerald-600/60'
            : 'bg-red-900/10 border-red-700/40 hover:border-red-600/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${
            doeVariance.compliant
              ? 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300'
              : 'bg-red-900/40 border-red-600/50 text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${doeVariance.compliant ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {doeVariance.compliant ? 'Compliant' : 'Out of Compliance'}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">DOE Budget Compliance — Variance Reporting</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct Labor · Equipment · Consumables &nbsp;|&nbsp; ±{doeVariance.thresholdPct}% threshold per 2 CFR § 200.308
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          {doeVariance.lines.map(line => (
            <div key={line.key} className="text-right hidden md:block">
              <p className="text-[10px] text-slate-500 truncate max-w-[100px]">{line.label.split('(')[0].trim()}</p>
              <p className={`text-xs font-mono font-semibold ${line.withinThreshold ? 'text-emerald-400' : 'text-red-400'}`}>
                {line.variancePct.toFixed(1)}% var
              </p>
            </div>
          ))}
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Net Variance</p>
            <p className={`text-sm font-mono font-bold ${doeVariance.totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {doeVariance.totalVariance >= 0 ? '+' : ''}{doeVariance.totalVariancePct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Upcoming Milestones</h3>
            </div>
            <button
              onClick={() => onNavigate('milestones')}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {upcoming.map(m => {
              const days = Math.ceil(
                (new Date(m.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-700/20 last:border-0">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      m.status === 'in_progress'
                        ? 'bg-sky-400'
                        : days < 0
                        ? 'bg-red-400'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-sm text-slate-300 flex-1 truncate">{m.title}</span>
                  <span
                    className={`text-xs shrink-0 ${
                      days < 0 ? 'text-red-400' : days <= 5 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                  </span>
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <p className="text-sm text-slate-500 py-2">All milestones complete.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Compliance Status</h3>
            </div>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-slate-700/20 last:border-0">
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    doc.status === 'submitted' || doc.status === 'approved'
                      ? 'bg-emerald-400'
                      : doc.status === 'review'
                      ? 'bg-sky-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-sm text-slate-300 flex-1 truncate">{doc.title}</span>
                <span className="text-xs text-slate-500 shrink-0 capitalize">{doc.status}</span>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-slate-500 py-2">No documents loaded.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">Overall Compliance Score</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  metrics.overallCompliance >= 80
                    ? 'bg-emerald-500'
                    : metrics.overallCompliance >= 60
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${metrics.overallCompliance}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-slate-500">
              <span>0%</span>
              <span>Submission Ready: 100%</span>
            </div>
          </div>
          <div
            className={`text-3xl font-bold shrink-0 ${
              metrics.overallCompliance >= 80
                ? 'text-emerald-400'
                : metrics.overallCompliance >= 60
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            {metrics.overallCompliance.toFixed(0)}%
          </div>
        </div>
        {metrics.overdueMilestones > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{metrics.overdueMilestones} milestone{metrics.overdueMilestones > 1 ? 's' : ''} past due — immediate attention required.</span>
          </div>
        )}
      </div>
    </div>
  );
}
