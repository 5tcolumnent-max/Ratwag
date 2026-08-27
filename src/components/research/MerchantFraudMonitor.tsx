import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Filter,
  TrendingUp,
  Globe,
  Zap,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { MerchantTransaction, StixThreatIndicator } from '../../lib/database.types';

type FilterMode = 'all' | 'flagged' | 'high_velocity' | 'geo_mismatch';

function statusBadge(status: string) {
  switch (status) {
    case 'BLOCKED':
      return 'text-red-300 bg-red-900/40 border-red-700/50';
    case 'FLAGGED':
      return 'text-orange-300 bg-orange-900/40 border-orange-700/50';
    default:
      return 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40';
  }
}

function riskScoreColor(score: number) {
  if (score >= 90) return 'text-red-400';
  if (score >= 75) return 'text-orange-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-emerald-400';
}

function riskBarColor(score: number) {
  if (score >= 90) return 'bg-red-500';
  if (score >= 75) return 'bg-orange-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: 'green' | 'amber' | 'red' | 'sky' | 'default';
  icon: typeof CreditCard;
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
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${accentClass}`} />
      </div>
      <p className={`text-2xl font-bold ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function TransactionRow({ tx }: { tx: MerchantTransaction }) {
  const [expanded, setExpanded] = useState(false);
  const [stix, setStix] = useState<StixThreatIndicator | null>(null);
  const [loadingStix, setLoadingStix] = useState(false);

  const isFlagged = tx.status === 'FLAGGED' || tx.status === 'BLOCKED';
  const geoMismatch =
    tx.customer_geo_location &&
    tx.card_country &&
    !tx.customer_geo_location.toLowerCase().includes(tx.card_country.toLowerCase());

  const loadStix = async () => {
    if (stix || !isFlagged) return;
    setLoadingStix(true);
    const { data } = await supabase
      .from('stix_threat_indicators')
      .select('*')
      .ilike('value', `${tx.merchant_id}:${tx.terminal_id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setStix(data as StixThreatIndicator);
    setLoadingStix(false);
  };

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isFlagged
          ? 'bg-red-900/10 border-red-700/40 hover:border-red-600/50'
          : 'bg-slate-800/20 border-slate-700/30 hover:border-slate-600/40'
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => {
          setExpanded((e) => !e);
          if (isFlagged && !stix) loadStix();
        }}
      >
        <div
          className={`p-2 rounded-lg shrink-0 ${
            isFlagged ? 'bg-red-900/30 text-red-400' : 'bg-slate-700/30 text-slate-400'
          }`}
        >
          {tx.status === 'BLOCKED' ? (
            <Ban className="w-4 h-4" />
          ) : tx.status === 'FLAGGED' ? (
            <ShieldAlert className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-slate-200 truncate">
              {tx.merchant_id}
            </span>
            <span className="text-slate-700">/</span>
            <span className="text-xs font-mono text-slate-500 truncate">
              {tx.terminal_id}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 font-mono">
              ${Number(tx.transaction_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency}
            </span>
            {tx.spending_velocity_count > 5 && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                <Zap className="w-3 h-3" />
                Velocity: {tx.spending_velocity_count}
              </span>
            )}
            {geoMismatch && (
              <span className="flex items-center gap-1 text-[10px] text-orange-400 font-semibold uppercase tracking-wider">
                <Globe className="w-3 h-3" />
                Geo Mismatch
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Risk Score</span>
            <span className={`text-sm font-bold font-mono ${riskScoreColor(tx.fraud_risk_score)}`}>
              {tx.fraud_risk_score}
            </span>
          </div>
          <div className="w-16 h-1.5 bg-slate-700/50 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all ${riskBarColor(tx.fraud_risk_score)}`}
              style={{ width: `${tx.fraud_risk_score}%` }}
            />
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadge(tx.status)}`}
          >
            {tx.status}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/30 px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Customer Geo</p>
              <p className="text-xs text-slate-300">{tx.customer_geo_location || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Card Country</p>
              <p className="text-xs text-slate-300">{tx.card_country || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Velocity (10min)</p>
              <p className="text-xs text-slate-300">{tx.spending_velocity_count}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Timestamp</p>
              <p className="text-xs text-slate-300">
                {new Date(tx.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          {isFlagged && (
            <div className="border-t border-slate-700/20 pt-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                STIX 2.1 Cyber Observable Forwarding
              </p>
              {loadingStix ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Loading STIX indicator...
                </div>
              ) : stix ? (
                <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-sky-300">{stix.indicator_id}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                        stix.severity === 'critical'
                          ? 'text-red-300 bg-red-900/30 border-red-700/50'
                          : stix.severity === 'high'
                          ? 'text-orange-300 bg-orange-900/30 border-orange-700/50'
                          : 'text-amber-300 bg-amber-900/30 border-amber-700/50'
                      }`}
                    >
                      {stix.severity}
                    </span>
                    <span className="text-[10px] text-slate-500">Confidence: {stix.confidence}%</span>
                  </div>
                  {stix.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">{stix.description}</p>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
                      View STIX Bundle JSON
                    </summary>
                    <pre className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-950/60 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(stix.stix_bundle, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No STIX indicator linked.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MerchantFraudMonitor() {
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('merchant_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'flagged') {
      query = query.in('status', ['FLAGGED', 'BLOCKED']);
    } else if (filter === 'high_velocity') {
      query = query.gt('spending_velocity_count', 5);
    }

    const { data, error } = await query;
    if (error) {
      setTransactions([]);
    } else {
      let rows = (data || []) as MerchantTransaction[];
      if (filter === 'geo_mismatch') {
        rows = rows.filter(
          (tx) =>
            tx.customer_geo_location &&
            tx.card_country &&
            !tx.customer_geo_location
              .toLowerCase()
              .includes(tx.card_country.toLowerCase())
        );
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        rows = rows.filter(
          (tx) =>
            tx.merchant_id.toLowerCase().includes(q) ||
            tx.terminal_id.toLowerCase().includes(q) ||
            (tx.customer_geo_location || '').toLowerCase().includes(q) ||
            (tx.card_country || '').toLowerCase().includes(q)
        );
      }
      setTransactions(rows);
    }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const flagged = transactions.filter((t) => t.status === 'FLAGGED' || t.status === 'BLOCKED');
  const blocked = transactions.filter((t) => t.status === 'BLOCKED');
  const highVelocity = transactions.filter((t) => t.spending_velocity_count > 5);
  const geoMismatches = transactions.filter(
    (t) =>
      t.customer_geo_location &&
      t.card_country &&
      !t.customer_geo_location.toLowerCase().includes(t.card_country.toLowerCase())
  );
  const avgRisk =
    transactions.length > 0
      ? Math.round(transactions.reduce((s, t) => s + t.fraud_risk_score, 0) / transactions.length)
      : 0;

  const filterButtons: { id: FilterMode; label: string; icon: typeof Filter }[] = [
    { id: 'all', label: 'All Transactions', icon: Activity },
    { id: 'flagged', label: 'Flagged / Blocked', icon: ShieldAlert },
    { id: 'high_velocity', label: 'High Velocity', icon: Zap },
    { id: 'geo_mismatch', label: 'Geo Mismatch', icon: Globe },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Transactions"
          value={transactions.length}
          accent="sky"
          icon={CreditCard}
        />
        <StatCard
          label="Flagged"
          value={flagged.length}
          sub={blocked.length > 0 ? `${blocked.length} blocked` : undefined}
          accent={flagged.length > 0 ? 'red' : 'green'}
          icon={ShieldAlert}
        />
        <StatCard
          label="High Velocity"
          value={highVelocity.length}
          accent={highVelocity.length > 0 ? 'amber' : 'default'}
          icon={Zap}
        />
        <StatCard
          label="Geo Mismatches"
          value={geoMismatches.length}
          accent={geoMismatches.length > 0 ? 'amber' : 'default'}
          icon={Globe}
        />
        <StatCard
          label="Avg Risk Score"
          value={avgRisk}
          accent={avgRisk >= 75 ? 'red' : avgRisk >= 50 ? 'amber' : 'green'}
          icon={TrendingUp}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant, terminal, geo, or card country..."
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-600/60 placeholder-slate-600"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {filterButtons.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border whitespace-nowrap transition-all ${
                  filter === btn.id
                    ? 'bg-sky-900/30 border-sky-700/50 text-sky-300'
                    : 'bg-slate-800/30 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {btn.label}
              </button>
            );
          })}
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg border border-slate-700/40 transition-all shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
            <p className="text-sm text-slate-500">Loading transaction stream...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CreditCard className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-500">
              No transactions match the current filter. Ingest payment data via the fraud detection endpoint to populate this monitor.
            </p>
          </div>
        ) : (
          transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}
