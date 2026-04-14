import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  Archive,
  Radio,
  Shield,
  LogOut,
  RefreshCw,
  TrendingUp,
  FileText,
  AlertCircle,
  BookOpen,
  Users,
  HardDrive,
  Crosshair,
  Siren,
  ScanLine,
} from 'lucide-react';
import { PrintButton } from '../PrintButton';
import { useAuth } from '../../lib/authContext';
import {
  fetchMilestones,
  fetchComplianceDocuments,
  calculateComplianceMetrics,
  seedDefaultData,
} from '../../compliance/GrantReportingEngine';
import { buildDOEVarianceReport } from '../../compliance/FederalCostAccounting';
import { fetchLatestReadings, aggregateRiskProfile } from '../../telemetry/InfrastructureMonitor';
import { supabase } from '../../lib/supabase';
import type { GrantMilestone, ComplianceDocument, BudgetItem, InfrastructureReading } from '../../lib/database.types';
import { AudioButton } from '../AudioButton';
import { AudioErrorBoundary } from '../AudioErrorBoundary';
import CountdownTimer from './CountdownTimer';
import MilestoneTracker from './MilestoneTracker';
import BudgetModule from './BudgetModule';
import DocumentArchive from './DocumentArchive';
import InfrastructureTelemetry from './InfrastructureTelemetry';
import CostAccountingPanel from './CostAccountingPanel';
import NISTCIProfilePanel from './NISTCIProfilePanel';
import RBACPanel from './RBACPanel';
import ForensicLayer from './ForensicLayer';
import ThreatIntelligence from './ThreatIntelligence';
import IncidentResponse from './IncidentResponse';
import VulnerabilityScanner from './VulnerabilityScanner';

type TabId = 'overview' | 'milestones' | 'budget' | 'cost_accounting' | 'documents' | 'telemetry' | 'nist_profile' | 'access_control' | 'forensics' | 'threat_intel' | 'incidents' | 'vulnerabilities';

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'milestones', label: 'Milestones', icon: CheckSquare },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'cost_accounting', label: 'Cost Accounting', icon: BookOpen },
  { id: 'documents', label: 'Documents', icon: Archive },
  { id: 'telemetry', label: 'Telemetry', icon: Radio },
  { id: 'nist_profile', label: 'NIST CI Profile', icon: Shield },
  { id: 'access_control', label: 'Access Control', icon: Users },
  { id: 'forensics', label: 'Forensic Layer', icon: HardDrive },
  { id: 'threat_intel', label: 'Threat Intel', icon: Crosshair },
  { id: 'incidents', label: 'Incidents', icon: Siren },
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: ScanLine },
];

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

function OverviewTab({
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
  const metrics = calculateComplianceMetrics(milestones, documents);
  const riskProfile = aggregateRiskProfile(readings);
  const totalAllocated = budgetItems.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const totalSpent = budgetItems.reduce((s, i) => s + Number(i.spent_amount), 0);
  const utilizationPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const doeVariance = buildDOEVarianceReport(budgetItems, 10);

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

export default function Dashboard() {
  const { session, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [milestones, setMilestones] = useState<GrantMilestone[]>([]);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [readings, setReadings] = useState<InfrastructureReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ms, docs, budget, ir] = await Promise.all([
        fetchMilestones(),
        fetchComplianceDocuments(),
        supabase
          .from('budget_items')
          .select('*')
          .order('created_at', { ascending: true })
          .then(r => r.data || []),
        fetchLatestReadings(),
      ]);
      setMilestones(ms as GrantMilestone[]);
      setDocuments(docs as ComplianceDocument[]);
      setBudgetItems(budget as BudgetItem[]);
      setReadings(ir as InfrastructureReading[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading && milestones.length === 0 && documents.length === 0 && session && !seeding) {
      setSeeding(true);
      seedDefaultData(session.user.id).then(() => {
        setSeeding(false);
        loadData();
      });
    }
  }, [loading, milestones.length, documents.length, session, seeding, loadData]);

  const piEmail = session?.user?.email || 'pi@research.gov';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="p-1.5 md:p-2 rounded-xl bg-sky-900/30 border border-sky-800/40 shrink-0">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                  <h1 className="text-sm md:text-base font-bold text-white tracking-tight truncate">
                    DOE Genesis Mission — Phase I
                  </h1>
                  <span className="hidden sm:inline text-[10px] font-semibold text-sky-300 bg-sky-900/40 border border-sky-800/50 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                    NIST-800-53
                  </span>
                </div>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 truncate">
                  <span className="hidden sm:inline">Research Administration System &nbsp;|&nbsp; PI: </span>{piEmail}
                </p>
              </div>
            </div>
            <div className="no-print flex items-center gap-1.5 md:gap-3 shrink-0">
              <div className="hidden md:block">
                <AudioErrorBoundary>
                  <AudioButton />
                </AudioErrorBoundary>
              </div>
              <div className="hidden sm:block">
                <CountdownTimer />
              </div>
              <PrintButton />
              <button
                onClick={loadData}
                className="p-1.5 md:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-all"
                title="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={signOut}
                className="hidden md:flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="no-print mt-3 md:mt-4 -mb-px overflow-x-auto scrollbar-none">
            <nav className="flex gap-0.5 md:gap-1 min-w-max">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-sky-400 border-sky-500 bg-sky-950/20'
                        : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main id="report-container" className="report-container max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8">
        <div className="report-stamp hidden print:flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
          <span className="text-xs font-semibold text-slate-300 tracking-widest uppercase">DOE Genesis — Research Command</span>
          <span className="text-xs text-slate-500 tabular-nums">
            Generated: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        {loading || seeding ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
            <p className="text-sm text-slate-500">
              {seeding ? 'Initializing Phase I workspace...' : 'Loading research data...'}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                milestones={milestones}
                documents={documents}
                readings={readings}
                budgetItems={budgetItems}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === 'milestones' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Administrative Lifecycle</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Phase I submission milestones — Grants.gov deadline April 28, 2026
                  </p>
                </div>
                <MilestoneTracker milestones={milestones} onRefresh={loadData} />
              </div>
            )}
            {activeTab === 'budget' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Budget Administration</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Personnel salary, hardware asset acquisition, and overhead tracking
                  </p>
                </div>
                <BudgetModule items={budgetItems} onRefresh={loadData} />
              </div>
            )}
            {activeTab === 'documents' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Document Archive</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Federal compliance documents — version control and audit readiness
                  </p>
                </div>
                <DocumentArchive documents={documents} onRefresh={loadData} />
              </div>
            )}
            {activeTab === 'cost_accounting' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Federal Cost Accounting</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    2 CFR Part 200 — cost category validation, variance reporting, and audit readiness
                  </p>
                </div>
                <CostAccountingPanel items={budgetItems} />
              </div>
            )}
            {activeTab === 'telemetry' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Infrastructure Telemetry</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    15m perimeter sensor monitoring — NIST SP 800-53 risk profiles
                  </p>
                </div>
                <InfrastructureTelemetry readings={readings} onRefresh={loadData} />
              </div>
            )}
            {activeTab === 'nist_profile' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">NIST CI Profile Assessment</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    NIST SP 800-53 Rev. 5 — critical infrastructure control compliance status
                  </p>
                </div>
                <NISTCIProfilePanel readings={readings} />
              </div>
            )}
            {activeTab === 'access_control' && session && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Access Control</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    RBAC role assignments and permission matrix — NIST SP 800-53 AC-2 / AC-3
                  </p>
                </div>
                <RBACPanel session={session} />
              </div>
            )}
            {activeTab === 'forensics' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Forensic Layer</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Digital artifact ingestion, chain-of-custody tracking, and hash verification — NIST IR-4 / IR-5
                  </p>
                </div>
                <ForensicLayer />
              </div>
            )}
            {activeTab === 'threat_intel' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Threat Intelligence</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    IOC management, MITRE ATT&amp;CK mapping, and adversary profiling — TLP-classified feeds
                  </p>
                </div>
                <ThreatIntelligence />
              </div>
            )}
            {activeTab === 'incidents' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Incident Response</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Incident lifecycle management aligned to NIST SP 800-61 — detection through lessons learned
                  </p>
                </div>
                <IncidentResponse />
              </div>
            )}
            {activeTab === 'vulnerabilities' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Vulnerability Scanner</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    CVSS-scored findings, exploitability tracking, and remediation workflow — NIST RA-5
                  </p>
                </div>
                <VulnerabilityScanner />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/40 mt-10 md:mt-16 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] md:text-xs text-slate-600 text-center sm:text-left">
          <span>DOE Genesis Mission Phase I — Research Administration System</span>
          <span>NIST SP 800-53 Compliant &nbsp;|&nbsp; Grants.gov Submission April 28, 2026</span>
        </div>
      </footer>
    </div>
  );
}
