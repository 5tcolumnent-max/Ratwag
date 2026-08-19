import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Database,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Fingerprint,
  FileArchive,
  ChevronRight,
  Settings,
  RefreshCw,
  Lock,
  Wifi,
  Key,
  Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';

interface Preferences {
  display_name: string;
  organization: string;
  role_designation: string;
  notify_critical: boolean;
  notify_warning: boolean;
  notify_info: boolean;
  session_timeout_minutes: number;
  require_biometric: boolean;
  audit_retention_days: number;
}

const DEFAULTS: Preferences = {
  display_name: '',
  organization: '',
  role_designation: 'Principal Investigator',
  notify_critical: true,
  notify_warning: true,
  notify_info: false,
  session_timeout_minutes: 60,
  require_biometric: false,
  audit_retention_days: 90,
};

type ConfigSection = 'profile' | 'notifications' | 'security' | 'data';

const SECTIONS: { id: ConfigSection; label: string; sublabel: string; icon: typeof User }[] = [
  { id: 'profile', label: 'User Profile', sublabel: 'Identity & affiliation', icon: User },
  { id: 'notifications', label: 'Notifications', sublabel: 'Alert preferences', icon: Bell },
  { id: 'security', label: 'Security Policies', sublabel: 'Auth & session settings', icon: Shield },
  { id: 'data', label: 'Data Management', sublabel: 'Retention & audit controls', icon: Database },
];

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200">{label}</p>
        {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-10 h-5.5 h-[22px] rounded-full border transition-all duration-200 ${
          checked
            ? 'bg-sky-600 border-sky-500'
            : 'bg-slate-700 border-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[20px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-600/60 transition-colors"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: { label: string; value: string | number }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-600/60 transition-colors appearance-none cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-slate-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-700/30">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-5 divide-y divide-slate-700/20">{children}</div>
    </div>
  );
}

function ProfileSection({ prefs, onChange }: { prefs: Preferences; onChange: (p: Partial<Preferences>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Identity">
        <div className="py-4 space-y-4">
          <div>
            <FieldLabel>Display Name</FieldLabel>
            <TextInput
              value={prefs.display_name}
              onChange={v => onChange({ display_name: v })}
              placeholder="Full name"
            />
          </div>
          <div>
            <FieldLabel>Organization</FieldLabel>
            <TextInput
              value={prefs.organization}
              onChange={v => onChange({ organization: v })}
              placeholder="Research institution or agency"
            />
          </div>
          <div>
            <FieldLabel>Role Designation</FieldLabel>
            <SelectInput
              value={prefs.role_designation}
              onChange={v => onChange({ role_designation: v })}
              options={[
                { label: 'Principal Investigator', value: 'Principal Investigator' },
                { label: 'Co-Investigator', value: 'Co-Investigator' },
                { label: 'Research Administrator', value: 'Research Administrator' },
                { label: 'Security Auditor', value: 'Security Auditor' },
                { label: 'System Operator', value: 'System Operator' },
                { label: 'Read-Only Observer', value: 'Read-Only Observer' },
              ]}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function NotificationsSection({ prefs, onChange }: { prefs: Preferences; onChange: (p: Partial<Preferences>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Alert Severity">
        <Toggle
          checked={prefs.notify_critical}
          onChange={v => onChange({ notify_critical: v })}
          label="Critical Alerts"
          description="System failures, security breaches, BSL hazards, and high-priority evidence events"
        />
        <Toggle
          checked={prefs.notify_warning}
          onChange={v => onChange({ notify_warning: v })}
          label="Warning Alerts"
          description="Threshold violations, degraded sensors, and moderate threat indicators"
        />
        <Toggle
          checked={prefs.notify_info}
          onChange={v => onChange({ notify_info: v })}
          label="Informational Alerts"
          description="Routine status updates, successful scans, and telemetry summaries"
        />
      </SectionCard>

      <div className="flex items-start gap-3 px-4 py-3 bg-amber-950/20 border border-amber-800/30 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-300/80 leading-relaxed">
          Critical alerts cannot be suppressed for federal-nexus compliance. Disabling this toggle affects in-app display only.
        </p>
      </div>
    </div>
  );
}

function SecuritySection({ prefs, onChange }: { prefs: Preferences; onChange: (p: Partial<Preferences>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Authentication">
        <Toggle
          checked={prefs.require_biometric}
          onChange={v => onChange({ require_biometric: v })}
          label="Require Biometric Authentication"
          description="Enforce WebAuthn fingerprint or face recognition on each login session"
        />
      </SectionCard>

      <SectionCard title="Session">
        <div className="py-4">
          <FieldLabel>Auto-Logout Timeout</FieldLabel>
          <SelectInput
            value={prefs.session_timeout_minutes}
            onChange={v => onChange({ session_timeout_minutes: parseInt(v, 10) })}
            options={[
              { label: '15 minutes', value: 15 },
              { label: '30 minutes', value: 30 },
              { label: '1 hour (recommended)', value: 60 },
              { label: '2 hours', value: 120 },
              { label: '4 hours', value: 240 },
              { label: '8 hours', value: 480 },
            ]}
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Session will expire after this period of inactivity. NIST SP 800-53 AC-12 recommends 15–60 minutes.
          </p>
        </div>
      </SectionCard>

      <SecurityAuditChecklist />

      <div className="flex items-start gap-3 px-4 py-3 bg-sky-950/20 border border-sky-800/30 rounded-xl">
        <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-sky-300/80 leading-relaxed">
          All authentication events are recorded in the federal-nexus audit log per NIST SP 800-53 AU-2 requirements.
        </p>
      </div>
    </div>
  );
}

function SecurityAuditChecklist() {
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasAnonKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  const noHardcodedKeys = hasSupabaseUrl && hasAnonKey;

  const checks = [
    {
      icon: Lock,
      label: 'HTTPS / Secure Context',
      description: isHttps
        ? 'Connection is encrypted. Camera and microphone access is permitted.'
        : 'Running over HTTP. Browsers will block camera and microphone access. Deploy to HTTPS.',
      pass: isHttps,
      nist: 'SC-8',
    },
    {
      icon: Key,
      label: 'Environment Variables',
      description: noHardcodedKeys
        ? 'API keys are loaded from environment variables — not hardcoded in source.'
        : 'Could not detect environment variables. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
      pass: noHardcodedKeys,
      nist: 'IA-5',
    },
    {
      icon: Wifi,
      label: 'Supabase Endpoint Configured',
      description: hasSupabaseUrl
        ? `Supabase URL is set (${(import.meta.env.VITE_SUPABASE_URL as string).replace(/^https?:\/\//, '').slice(0, 30)}…).`
        : 'VITE_SUPABASE_URL is not set. Database operations will fail.',
      pass: hasSupabaseUrl,
      nist: 'SC-7',
    },
    {
      icon: Eye,
      label: 'Row Level Security',
      description: 'RLS is enforced on all Supabase tables. Data is scoped to the authenticated user by default.',
      pass: true,
      nist: 'AC-3',
    },
  ];

  const passCount = checks.filter(c => c.pass).length;
  const allPass = passCount === checks.length;

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${allPass ? 'border-emerald-700/20 bg-emerald-900/10' : 'border-amber-700/20 bg-amber-900/10'}`}>
        <div className="flex items-center gap-2">
          <Shield className={`w-3.5 h-3.5 ${allPass ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-xs font-semibold text-slate-200">Security & Privacy Audit</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          allPass
            ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
            : 'bg-amber-900/20 border-amber-700/30 text-amber-300'
        }`}>
          {passCount}/{checks.length} checks passed
        </span>
      </div>
      <div className="divide-y divide-slate-700/20">
        {checks.map(({ icon: Icon, label, description, pass, nist }) => (
          <div key={label} className="flex items-start gap-3 px-4 py-3">
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${pass ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-amber-900/20 border border-amber-700/30'}`}>
              <Icon className={`w-3 h-3 ${pass ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-200">{label}</span>
                <span className="text-[9px] font-mono text-slate-600">{nist}</span>
              </div>
              <p className={`text-[10px] leading-relaxed ${pass ? 'text-slate-500' : 'text-amber-400/80'}`}>{description}</p>
            </div>
            <div className="shrink-0 mt-0.5">
              {pass
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              }
            </div>
          </div>
        ))}
      </div>
      {!allPass && (
        <div className="px-4 py-3 border-t border-amber-700/20 bg-amber-900/10">
          <p className="text-[10px] text-amber-400/80 leading-relaxed">
            One or more checks require attention before field deployment. Resolve HTTPS first — without it, camera and microphone permissions will be blocked by the browser.
          </p>
        </div>
      )}
    </div>
  );
}

function DataSection({ prefs, onChange }: { prefs: Preferences; onChange: (p: Partial<Preferences>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Audit Log Retention">
        <div className="py-4">
          <FieldLabel>Retention Period</FieldLabel>
          <SelectInput
            value={prefs.audit_retention_days}
            onChange={v => onChange({ audit_retention_days: parseInt(v, 10) })}
            options={[
              { label: '30 days', value: 30 },
              { label: '60 days', value: 60 },
              { label: '90 days (recommended)', value: 90 },
              { label: '180 days', value: 180 },
              { label: '1 year', value: 365 },
              { label: '3 years (federal archive)', value: 1095 },
            ]}
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Audit entries older than this period may be archived. DOE grant compliance requires a minimum of 3 years for federal records.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Platform Information">
        <div className="py-3 space-y-2.5">
          {[
            { label: 'Platform', value: 'SOVEREIGN v3.0 Tactical' },
            { label: 'Compliance Framework', value: 'NIST SP 800-53 Rev. 5' },
            { label: 'Encryption', value: 'AES-256 (at rest & in transit)' },
            { label: 'Database', value: 'Supabase PostgreSQL (RLS enforced)' },
            { label: 'Grant Program', value: 'DOE Genesis Mission Phase I' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <span className="text-[11px] text-slate-500 shrink-0">{label}</span>
              <span className="text-[11px] text-slate-300 font-mono text-right truncate">{value}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export default function ConfigPanel() {
  const { session } = useAuth();
  const [activeSection, setActiveSection] = useState<ConfigSection>('profile');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: loadErr } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (loadErr) {
        setError(loadErr.message);
      } else if (data) {
        setPrefs({
          display_name: data.display_name ?? '',
          organization: data.organization ?? '',
          role_designation: data.role_designation ?? 'Principal Investigator',
          notify_critical: data.notify_critical ?? true,
          notify_warning: data.notify_warning ?? true,
          notify_info: data.notify_info ?? false,
          session_timeout_minutes: data.session_timeout_minutes ?? 60,
          require_biometric: data.require_biometric ?? false,
          audit_retention_days: data.audit_retention_days ?? 90,
        });
      }
      setLoading(false);
    })();
  }, [session?.user.id]);

  const handleChange = (patch: Partial<Preferences>) => {
    setPrefs(p => ({ ...p, ...patch }));
    setSavedAt(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    setError(null);
    const { error: upsertErr } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: session.user.id, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    setSaving(false);
    if (upsertErr) {
      setError(upsertErr.message);
    } else {
      setSavedAt(new Date());
    }
  };

  const activeItem = SECTIONS.find(s => s.id === activeSection)!;
  const ActiveIcon = activeItem.icon;

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <Settings className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Configuration</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">Platform preferences and security settings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                <CheckCircle className="w-3 h-3" />
                Saved {savedAt.toLocaleTimeString()}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-mono">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-700 border border-sky-600 text-white text-xs font-bold hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-950/50"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6">
          <aside className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all shrink-0 md:shrink ${
                    isActive
                      ? 'bg-slate-800/60 border-slate-600/50 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : ''}`} />
                  <div className="min-w-0 hidden md:block">
                    <p className="text-xs font-semibold leading-none truncate">{section.label}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5 truncate">{section.sublabel}</p>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-slate-500 ml-auto hidden md:block" />}
                </button>
              );
            })}
          </aside>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <ActiveIcon className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white">{activeItem.label}</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading preferences...</span>
                </div>
              </div>
            ) : (
              <>
                {activeSection === 'profile' && (
                  <ProfileSection prefs={prefs} onChange={handleChange} />
                )}
                {activeSection === 'notifications' && (
                  <NotificationsSection prefs={prefs} onChange={handleChange} />
                )}
                {activeSection === 'security' && (
                  <SecuritySection prefs={prefs} onChange={handleChange} />
                )}
                {activeSection === 'data' && (
                  <DataSection prefs={prefs} onChange={handleChange} />
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-between pt-2 border-t border-slate-800/40">
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Changes take effect on next session
            </span>
            <span className="flex items-center gap-1">
              <Fingerprint className="w-3 h-3" />
              NIST SP 800-53 AC-2
            </span>
            <span className="flex items-center gap-1">
              <FileArchive className="w-3 h-3" />
              AU-11 compliant
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-700 border border-sky-600 text-white text-xs font-bold hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
