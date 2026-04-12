import { User, Lock, CheckCircle, Clock, ShieldCheck, Key, Eye, CreditCard as Edit3, Radio } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export interface RBACPermission {
  key: string;
  label: string;
  description: string;
  granted: boolean;
}

export interface RBACRole {
  name: string;
  label: string;
  description: string;
  permissions: RBACPermission[];
}

interface PermissionGroup {
  label: string;
  icon: typeof Eye;
  permissions: RBACPermission[];
}

const PI_PERMISSIONS: RBACPermission[] = [
  {
    key: 'milestone:read',
    label: 'View Milestones',
    description: 'Read access to all project milestones and submission deadlines.',
    granted: true,
  },
  {
    key: 'milestone:write',
    label: 'Update Milestone Status',
    description: 'Modify milestone status and progress notes.',
    granted: true,
  },
  {
    key: 'budget:read',
    label: 'View Budget Items',
    description: 'Read access to all cost category line items.',
    granted: true,
  },
  {
    key: 'budget:write',
    label: 'Add Budget Line Items',
    description: 'Create new budget entries under approved cost categories.',
    granted: true,
  },
  {
    key: 'document:read',
    label: 'View Compliance Documents',
    description: 'Read access to all compliance and submission documents.',
    granted: true,
  },
  {
    key: 'document:write',
    label: 'Advance Document Status',
    description: 'Move documents through review, approval, and submission workflow.',
    granted: true,
  },
  {
    key: 'telemetry:read',
    label: 'View Telemetry',
    description: 'Read infrastructure sensor readings and NIST risk profiles.',
    granted: true,
  },
  {
    key: 'telemetry:scan',
    label: 'Run Perimeter Scans',
    description: 'Initiate sensor scan cycles and record new telemetry readings.',
    granted: true,
  },
  {
    key: 'admin:user_management',
    label: 'User Management',
    description: 'Add, remove, or modify project personnel accounts. Reserved for institutional administrators.',
    granted: false,
  },
  {
    key: 'admin:audit_export',
    label: 'Audit Log Export',
    description: 'Export full audit trails for federal review. Requires sponsored research office authorization.',
    granted: false,
  },
];

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Milestone & Reporting',
    icon: CheckCircle,
    permissions: PI_PERMISSIONS.filter(p => p.key.startsWith('milestone')),
  },
  {
    label: 'Budget & Cost Accounting',
    icon: Key,
    permissions: PI_PERMISSIONS.filter(p => p.key.startsWith('budget')),
  },
  {
    label: 'Document Management',
    icon: Edit3,
    permissions: PI_PERMISSIONS.filter(p => p.key.startsWith('document')),
  },
  {
    label: 'Infrastructure Telemetry',
    icon: Radio,
    permissions: PI_PERMISSIONS.filter(p => p.key.startsWith('telemetry')),
  },
  {
    label: 'Administrative Controls',
    icon: ShieldCheck,
    permissions: PI_PERMISSIONS.filter(p => p.key.startsWith('admin')),
  },
];

interface SessionEvent {
  timestamp: string;
  event: string;
  detail: string;
}

function buildSessionActivity(session: Session): SessionEvent[] {
  const events: SessionEvent[] = [];

  if (session.user.created_at) {
    events.push({
      timestamp: session.user.created_at,
      event: 'Account Created',
      detail: 'User account provisioned via email/password authentication.',
    });
  }

  if (session.user.last_sign_in_at) {
    events.push({
      timestamp: session.user.last_sign_in_at,
      event: 'Sign-In',
      detail: 'Successful authentication. Session token issued.',
    });
  }

  if (session.expires_at) {
    events.push({
      timestamp: new Date(session.expires_at * 1000).toISOString(),
      event: 'Session Expiry',
      detail: 'JWT token invalidation scheduled. Re-authentication required.',
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function PermissionRow({ permission }: { permission: RBACPermission }) {
  return (
    <div className={`flex items-start gap-3 py-2 border-b border-slate-800/40 last:border-0 ${
      permission.granted ? '' : 'opacity-55'
    }`}>
      <div className="shrink-0 mt-0.5">
        {permission.granted ? (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Lock className="w-3.5 h-3.5 text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium ${permission.granted ? 'text-slate-200' : 'text-slate-500'}`}>
            {permission.label}
          </span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            permission.granted
              ? 'text-emerald-400 border-emerald-800/50 bg-emerald-900/20'
              : 'text-slate-600 border-slate-700/40 bg-slate-800/30'
          }`}>
            {permission.key}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{permission.description}</p>
      </div>
      <span className={`text-[10px] font-semibold uppercase shrink-0 ${
        permission.granted ? 'text-emerald-400' : 'text-slate-600'
      }`}>
        {permission.granted ? 'Granted' : 'Denied'}
      </span>
    </div>
  );
}

function PermissionGroupCard({ group }: { group: PermissionGroup }) {
  const Icon = group.icon;
  const grantedInGroup = group.permissions.filter(p => p.granted).length;
  const allGranted = grantedInGroup === group.permissions.length;
  const noneGranted = grantedInGroup === 0;

  return (
    <div className="border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/20">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${allGranted ? 'text-emerald-400' : noneGranted ? 'text-slate-600' : 'text-amber-400'}`} />
        <span className="text-xs font-semibold text-slate-300 flex-1">{group.label}</span>
        <span className={`text-[10px] font-mono ${allGranted ? 'text-emerald-400' : noneGranted ? 'text-slate-600' : 'text-amber-400'}`}>
          {grantedInGroup}/{group.permissions.length}
        </span>
      </div>
      <div className="px-4 py-1">
        {group.permissions.map(permission => (
          <PermissionRow key={permission.key} permission={permission} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  session: Session;
}

export default function RBACPanel({ session }: Props) {
  const user = session.user;
  const accountCreated = new Date(user.created_at);
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
  const sessionExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
  const sessionActive = sessionExpiry ? sessionExpiry > new Date() : false;

  const grantedCount = PI_PERMISSIONS.filter(p => p.granted).length;
  const totalCount = PI_PERMISSIONS.length;
  const grantPct = Math.round((grantedCount / totalCount) * 100);

  const sessionEvents = buildSessionActivity(session);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Role</p>
          <p className="text-base font-bold text-white mt-1">Principal Investigator</p>
          <p className="text-xs text-slate-500 mt-0.5">DOE Phase I — PI Access</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Permissions Granted</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{grantedCount}/{totalCount}</p>
          <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${grantPct}%` }} />
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Session Status</p>
          <p className={`text-base font-bold mt-1 ${sessionActive ? 'text-emerald-400' : 'text-red-400'}`}>
            {sessionActive ? 'Active' : 'Expired'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {sessionExpiry
              ? sessionExpiry.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
              : 'Unknown expiry'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-sky-900/30 border border-sky-800/40">
              <User className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Authenticated User</p>
              <p className="text-sm font-semibold text-white mt-0.5">Identity Details</p>
            </div>
          </div>

          <div className="space-y-0">
            {[
              { label: 'User ID', value: user.id, mono: true, truncate: true },
              { label: 'Email', value: user.email ?? '—', mono: false, truncate: false },
              { label: 'Auth Provider', value: user.app_metadata?.provider ?? 'email', mono: false, truncate: false },
              {
                label: 'Account Created',
                value: accountCreated.toLocaleDateString('en-US', { dateStyle: 'medium' }),
                mono: false,
                truncate: false,
              },
              {
                label: 'Last Sign-In',
                value: lastSignIn
                  ? lastSignIn.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                  : '—',
                mono: false,
                truncate: false,
              },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-xs py-1.5 border-b border-slate-700/30 last:border-0">
                <span className="text-slate-500">{row.label}</span>
                <span className={`${row.mono ? 'font-mono text-[11px]' : ''} text-slate-300 ${row.truncate ? 'truncate max-w-[160px]' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Role Assignment</p>
              <p className="text-sm font-semibold text-white mt-0.5">DOE Phase I — PI Access</p>
            </div>
          </div>

          <div className="bg-emerald-900/10 border border-emerald-700/30 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-emerald-300">Principal Investigator (PI)</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Full read/write access to all project data within this grant scope. Cannot modify
              institutional user accounts or export raw audit logs without sponsored research office authorization.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Row-level security (RLS) enforced at the database layer. All queries are scoped to{' '}
              <span className="font-mono text-slate-400">user_id = auth.uid()</span>.
              Data isolation prevents cross-user access.
            </p>
            <p className="text-[11px] text-slate-500">
              Access control standard: NIST SP 800-53 AC-2 / AC-3 / AC-6 (Least Privilege)
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">Permission Matrix — PI Role</h3>
          <span className="ml-auto text-[10px] text-slate-500">{grantedCount} granted / {totalCount - grantedCount} denied</span>
        </div>
        <div className="space-y-3">
          {PERMISSION_GROUPS.map(group => (
            <PermissionGroupCard key={group.label} group={group} />
          ))}
        </div>
      </div>

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">Session Activity Log — AC-2</h3>
        </div>
        <div className="space-y-0">
          {sessionEvents.map((event, idx) => {
            const isFuture = new Date(event.timestamp) > new Date();
            return (
              <div key={idx} className="flex items-start gap-3 py-2.5 border-b border-slate-800/40 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${isFuture ? 'bg-sky-400' : 'bg-emerald-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">{event.event}</span>
                    <span className={`text-[10px] font-mono ${isFuture ? 'text-sky-400' : 'text-slate-500'}`}>
                      {new Date(event.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {isFuture && (
                      <span className="text-[10px] text-sky-400 bg-sky-900/20 border border-sky-800/30 px-1.5 py-0.5 rounded font-semibold">
                        Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{event.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-slate-600 text-right">
        Access control standard: NIST SP 800-53 AC-2 (Account Management) &nbsp;|&nbsp; AC-3 (Access Enforcement) &nbsp;|&nbsp; AC-6 (Least Privilege)
      </div>
    </div>
  );
}
