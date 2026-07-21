import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  Archive,
  Radio,
  Shield,
  LogOut,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Users,
  HardDrive,
  Crosshair,
  Siren,
  ScanLine,
  Flame,
} from 'lucide-react';
import { PrintButton } from '../PrintButton';
import { useAuth } from '../../lib/authContext';
import {
  fetchMilestones,
  fetchComplianceDocuments,
  seedDefaultData,
} from '../../compliance/GrantReportingEngine';
import { fetchLatestReadings } from '../../telemetry/InfrastructureMonitor';
import { supabase } from '../../lib/supabase';
import type { GrantMilestone, ComplianceDocument, BudgetItem, InfrastructureReading } from '../../lib/database.types';
import { AudioButton } from '../AudioButton';
import { AudioErrorBoundary } from '../AudioErrorBoundary';
import CountdownTimer from './CountdownTimer';
const OverviewTab = lazy(() => import('./OverviewTab'));
const MilestoneTracker = lazy(() => import('./MilestoneTracker'));
const BudgetModule = lazy(() => import('./BudgetModule'));
const DocumentArchive = lazy(() => import('./DocumentArchive'));
const InfrastructureTelemetry = lazy(() => import('./InfrastructureTelemetry'));
const CostAccountingPanel = lazy(() => import('./CostAccountingPanel'));
const NISTCIProfilePanel = lazy(() => import('./NISTCIProfilePanel'));
const RBACPanel = lazy(() => import('./RBACPanel'));
const ForensicLayer = lazy(() => import('./ForensicLayer'));
const ThreatIntelligence = lazy(() => import('./ThreatIntelligence'));
const IncidentResponse = lazy(() => import('./IncidentResponse'));
const VulnerabilityScanner = lazy(() => import('./VulnerabilityScanner'));
const EnvironmentalHazardMonitor = lazy(() => import('./EnvironmentalHazardMonitor'));

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
    </div>
  );
}

type TabId = 'overview' | 'milestones' | 'budget' | 'cost_accounting' | 'documents' | 'telemetry' | 'nist_profile' | 'access_control' | 'forensics' | 'threat_intel' | 'incidents' | 'vulnerabilities' | 'env_hazards';

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
  { id: 'env_hazards', label: 'Env. Hazards', icon: Flame },
];

export default function Dashboard() {
  const { session, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [milestones, setMilestones] = useState<GrantMilestone[]>([]);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [readings, setReadings] = useState<InfrastructureReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
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
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
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
      }).catch((err) => {
        setSeeding(false);
        setLoadError(err instanceof Error ? err.message : 'Failed to seed default data');
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
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-red-400">Error: {loadError}</p>
            <button onClick={loadData} className="mt-2 px-4 py-2 text-xs text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition-all">Retry</button>
          </div>
        ) : (
          <>
            <Suspense fallback={<TabLoader />}>
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
            {activeTab === 'env_hazards' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Environmental Hazard Monitor</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Smoke (MQ-2), heat (DS18B20), and flame (IR) sensor alert system — NIST PE-13 / PE-14
                  </p>
                </div>
                <EnvironmentalHazardMonitor />
              </div>
            )}
            </Suspense>
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
