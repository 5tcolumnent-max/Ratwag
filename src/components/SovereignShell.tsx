import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shield,
  LayoutDashboard,
  HardDrive,
  Cpu,
  Microscope,
  Terminal,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Wifi,
  WifiOff,
  Lock,
  X,
  FileWarning,
  Printer,
  Video,
  Camera,
  ScanLine,
  Type,
  FileText,
  Paperclip,
  Trash2,
  Settings,
  Power,
  VolumeX,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import Dashboard from './research/Dashboard';
import ForensicLayer from './ForensicLayer';
import RoboticsDashboard from './RoboticsDashboard';
import SafetyScanner from './SafetyScanner';
import AuditLog from './AuditLog';
import ConfigPanel from './config/ConfigPanel';
import { AudioErrorBoundary } from './AudioErrorBoundary';

type SectionId = 'dashboard' | 'forensic_ai' | 'robotics' | 'safety_scanner' | 'audit_log' | 'config';

interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
  sublabel: string;
  accent: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    sublabel: 'Research & Compliance',
    accent: 'sky',
  },
  {
    id: 'forensic_ai',
    label: 'Forensic AI',
    icon: HardDrive,
    sublabel: 'VSR · SLR · Video Feeds',
    accent: 'violet',
  },
  {
    id: 'robotics',
    label: 'Mechanical / Robotics',
    icon: Cpu,
    sublabel: 'Drone Fleet · LiDAR · Sonar',
    accent: 'cyan',
  },
  {
    id: 'safety_scanner',
    label: 'Safety Scanner',
    icon: Microscope,
    sublabel: 'Pathogen Detection',
    accent: 'orange',
  },
  {
    id: 'audit_log',
    label: 'Audit Log',
    icon: Terminal,
    sublabel: 'Federal-Nexus Documentation',
    accent: 'emerald',
  },
  {
    id: 'config',
    label: 'Configuration',
    icon: Settings,
    sublabel: 'Preferences & Security',
    accent: 'slate',
  },
];

const ACCENT_ACTIVE: Record<string, string> = {
  sky: 'bg-sky-900/40 border-sky-700/50 text-sky-300',
  violet: 'bg-violet-900/30 border-violet-700/40 text-violet-300',
  cyan: 'bg-cyan-900/30 border-cyan-700/40 text-cyan-300',
  orange: 'bg-orange-900/20 border-orange-700/30 text-orange-300',
  emerald: 'bg-emerald-900/20 border-emerald-700/30 text-emerald-300',
  slate: 'bg-slate-800/60 border-slate-600/50 text-slate-300',
};

const ACCENT_INDICATOR: Record<string, string> = {
  sky: 'bg-sky-400',
  violet: 'bg-violet-400',
  cyan: 'bg-cyan-400',
  orange: 'bg-orange-400',
  emerald: 'bg-emerald-400',
  slate: 'bg-slate-400',
};

const ACCENT_ICON: Record<string, string> = {
  sky: 'text-sky-400',
  violet: 'text-violet-400',
  cyan: 'text-cyan-400',
  orange: 'text-orange-400',
  emerald: 'text-emerald-400',
  slate: 'text-slate-300',
};

const SECTION_HEADERS: Record<SectionId, { title: string; sub: string }> = {
  dashboard: { title: 'Research Administration', sub: 'DOE Genesis Mission Phase I — Grants.gov compliance portal' },
  forensic_ai: { title: 'Forensic AI', sub: 'Video feed analysis with Visual Speech Recognition (VSR) and Sign Language Recognition (SLR)' },
  robotics: { title: 'Mechanical / Robotics', sub: 'Real-time telemetry — aerial and aquatic drone fleet — LiDAR / sonar spatial mapping' },
  safety_scanner: { title: 'Safety Scanner', sub: 'Micro-imagery pathogen detection — bacterial morphology analysis — BSL hazard classification' },
  audit_log: { title: 'Audit Log', sub: 'Federal-nexus activity documentation — all module events logged for transparency and compliance' },
  config: { title: 'Configuration', sub: 'Platform preferences, notification settings, security policies, and data management controls' },
};

function StatusBar({ onKillSwitch }: { onKillSwitch: () => void }) {
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  return (
    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
      <span className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400">ONLINE</span>
      </span>
      <span className="flex items-center gap-1">
        <Wifi className="w-3 h-3" />
        915 MHz
      </span>
      <span className="flex items-center gap-1">
        <Lock className="w-3 h-3" />
        AES-256
      </span>
      <span className="flex items-center gap-1">
        <Activity className="w-3 h-3" />
        NIST-800-53
      </span>
      {!isHttps && (
        <span className="flex items-center gap-1 text-amber-500 border border-amber-700/40 bg-amber-900/10 px-1.5 py-0.5 rounded">
          <AlertTriangle className="w-2.5 h-2.5" />
          HTTP
        </span>
      )}
      <button
        onClick={onKillSwitch}
        title="Emergency Kill Switch — mute all audio and streams"
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-red-800/40 bg-red-900/10 text-red-600 hover:bg-red-900/25 hover:text-red-400 transition-all"
      >
        <Power className="w-2.5 h-2.5" />
        KILL
      </button>
    </div>
  );
}

function SecurityAuditBadge() {
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  const hasEnvVars = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const allGood = isHttps && hasEnvVars;

  return (
    <div className={`flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded-lg border ${
      allGood
        ? 'border-emerald-700/30 bg-emerald-900/10 text-emerald-600'
        : 'border-amber-700/40 bg-amber-900/10 text-amber-500'
    }`}>
      {allGood
        ? <><CheckCircle className="w-2.5 h-2.5" />SEC OK</>
        : <><AlertTriangle className="w-2.5 h-2.5" />SEC WARN</>
      }
    </div>
  );
}

interface MediaAttachment {
  id: string;
  type: 'video' | 'picture' | 'scan' | 'text' | 'pdf';
  name: string;
  dataUrl: string;
  size: number;
}

const MEDIA_TYPES = [
  { key: 'video' as const, label: 'Video', icon: Video, accept: 'video/*', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700/40', hoverBg: 'hover:bg-blue-900/50' },
  { key: 'picture' as const, label: 'Photo', icon: Camera, accept: 'image/*', color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700/40', hoverBg: 'hover:bg-emerald-900/50' },
  { key: 'scan' as const, label: 'Scan', icon: ScanLine, accept: 'image/*', color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700/40', hoverBg: 'hover:bg-amber-900/50' },
  { key: 'text' as const, label: 'Text', icon: Type, accept: '.txt,.csv,.log,.md', color: 'text-slate-300', bg: 'bg-slate-800/50', border: 'border-slate-600/40', hoverBg: 'hover:bg-slate-700/50' },
  { key: 'pdf' as const, label: 'PDF', icon: FileText, accept: '.pdf', color: 'text-red-300', bg: 'bg-red-900/20', border: 'border-red-700/30', hoverBg: 'hover:bg-red-900/40' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EvidenceModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [description, setDescription] = useState('');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loggedAt, setLoggedAt] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingMediaType, setPendingMediaType] = useState<MediaAttachment['type'] | null>(null);

  const handleMediaClick = (type: MediaAttachment['type'], accept: string) => {
    setPendingMediaType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingMediaType) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(),
        type: pendingMediaType,
        name: file.name,
        dataUrl,
        size: file.size,
      }]);
      setPendingMediaType(null);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    const now = new Date().toISOString();

    const attachmentSummary = attachments.length > 0
      ? ` | Attachments (${attachments.length}): ${attachments.map(a => `${a.type.toUpperCase()}:${a.name}`).join(', ')}`
      : '';

    await supabase.from('audit_log_entries').insert({
      user_id: userId,
      module: 'EvidenceInput',
      action: '4:11_INPUT',
      detail: `[HIGH-PRIORITY EVIDENCE] Timestamp: ${new Date(timestamp).toLocaleString()} — ${description.trim()}${attachmentSummary}`,
      severity: 'critical',
      entity_type: 'evidence',
    });

    setSubmitting(false);
    setSubmitted(true);
    setLoggedAt(now);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>4:11 Evidence Bundle</title>
          <style>
            body { font-family: 'Courier New', monospace; background: #fff; color: #000; margin: 40px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
            .header p { font-size: 11px; margin: 2px 0; color: #444; }
            .badge { display: inline-block; background: #000; color: #fff; font-size: 9px; font-weight: bold; letter-spacing: 2px; padding: 2px 8px; margin-bottom: 16px; }
            .field { margin-bottom: 20px; }
            .field label { font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #666; display: block; margin-bottom: 6px; }
            .field .value { font-size: 13px; color: #000; border: 1px solid #ccc; padding: 10px 14px; white-space: pre-wrap; word-break: break-word; }
            .footer { border-top: 1px solid #ccc; padding-top: 12px; margin-top: 32px; font-size: 9px; color: #888; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>4:11 HIGH-PRIORITY EVIDENCE BUNDLE</h1>
            <p>SOVEREIGN v3.0 · TACTICAL — Federal-Nexus Audit System</p>
            <p>Classification: CRITICAL · Chain-of-Custody Record</p>
          </div>
          <div class="badge">CLASSIFICATION: CRITICAL</div>
          <div class="field">
            <label>Evidence Timestamp</label>
            <div class="value">${new Date(timestamp).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}</div>
          </div>
          <div class="field">
            <label>Evidence Description</label>
            <div class="value">${description.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
          <div class="field">
            <label>Audit Log Entry Time</label>
            <div class="value">${loggedAt ? new Date(loggedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' }) : '—'}</div>
          </div>
          <div class="field">
            <label>Module</label>
            <div class="value">EvidenceInput · Action: 4:11_INPUT · Severity: CRITICAL</div>
          </div>
          ${attachments.length > 0 ? `
          <div class="field">
            <label>Attachments (${attachments.length})</label>
            <div class="value">${attachments.map(a => `[${a.type.toUpperCase()}] ${a.name} (${formatBytes(a.size)})`).join('\n')}</div>
          </div>
          ` : ''}
          <div class="footer">
            <p>This document is an official federal-nexus audit record. Printed from SOVEREIGN v3.0 Tactical Platform.</p>
            <p>Printed: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}</p>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current && !submitted) onClose(); }}
    >
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-red-700/50 rounded-2xl shadow-2xl shadow-red-950/60 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-800/40 bg-red-950/30">
          <div className="p-2 rounded-xl bg-red-900/50 border border-red-700/60 shrink-0">
            <FileWarning className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-red-300 tracking-wide">4:11 High-Priority Evidence Input</h2>
            <p className="text-[10px] text-red-700 mt-0.5 font-mono">CLASSIFICATION: CRITICAL · Appended to Audit Log</p>
          </div>
          {!submitted && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {!submitted ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Attach Media
                </label>
                <div className="flex items-center gap-2">
                  {MEDIA_TYPES.map(({ key, label, icon: Icon, accept, color, bg, border, hoverBg }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleMediaClick(key, accept)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border ${bg} ${border} ${hoverBg} transition-all group`}
                      title={`Attach ${label}`}
                    >
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className={`text-[9px] font-semibold tracking-widest uppercase ${color} opacity-80`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {attachments.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Attached Files ({attachments.length})
                  </label>
                  <div className="space-y-1.5">
                    {attachments.map(att => {
                      const meta = MEDIA_TYPES.find(m => m.key === att.type)!;
                      const Icon = meta.icon;
                      return (
                        <div key={att.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${meta.bg} ${meta.border}`}>
                          <Icon className={`w-3.5 h-3.5 ${meta.color} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 truncate">{att.name}</p>
                            <p className="text-[9px] text-slate-600 font-mono">{att.type.toUpperCase()} · {formatBytes(att.size)}</p>
                          </div>
                          {att.type === 'picture' || att.type === 'scan' ? (
                            <img src={att.dataUrl} alt={att.name} className="w-8 h-8 rounded object-cover border border-slate-700/50 shrink-0" />
                          ) : (
                            <Paperclip className="w-3 h-3 text-slate-600 shrink-0" />
                          )}
                          <button
                            onClick={() => removeAttachment(att.id)}
                            className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Evidence Description
                </label>
                <textarea
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600/60 resize-none leading-relaxed transition-colors"
                  rows={4}
                  placeholder="Describe the high-priority evidence in detail..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Evidence Timestamp
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-600/60 transition-colors"
                  value={timestamp}
                  onChange={e => setTimestamp(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm font-medium hover:text-slate-200 hover:border-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!description.trim() || submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border bg-red-700 border-red-600 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Evidence'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center">
                  <FileWarning className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-emerald-300">Logged to Audit</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Entry recorded — {loggedAt ? new Date(loggedAt).toLocaleString() : ''}
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 space-y-2">
                <div>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Evidence Timestamp</p>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono">{new Date(timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Description</p>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed line-clamp-3">{description.trim()}</p>
                </div>
                {attachments.length > 0 && (
                  <div>
                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Attachments</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {attachments.map(att => {
                        const meta = MEDIA_TYPES.find(m => m.key === att.type)!;
                        const Icon = meta.icon;
                        return (
                          <span key={att.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border ${meta.bg} ${meta.border} ${meta.color}`}>
                            <Icon className="w-2.5 h-2.5" />
                            {att.type.toUpperCase()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm font-medium hover:text-slate-200 hover:border-slate-600 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border bg-sky-700 border-sky-600 text-white hover:bg-sky-600 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Print Bundle
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-6 pb-4">
          <p className="text-[9px] font-mono text-slate-700 text-center">
            {submitted
              ? 'Immutable chain-of-custody entry recorded in federal-nexus audit log'
              : 'Submission will be recorded in the federal-nexus audit log with CRITICAL severity — immutable chain-of-custody entry'}
          </p>
        </div>
      </div>
    </div>
  );
}

type ConnectivityStatus = 'online' | 'degraded' | 'offline';

function useConnectivityWatchdog(): { status: ConnectivityStatus; lastOnlineAt: Date | null; retry: () => void } {
  const [status, setStatus] = useState<ConnectivityStatus>('online');
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());

  const check = useCallback(() => {
    if (navigator.onLine) {
      setStatus('online');
      setLastOnlineAt(new Date());
    } else {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', check);
    window.addEventListener('offline', check);

    const id = setInterval(() => {
      if (navigator.onLine) {
        setLastOnlineAt(prev => {
          const age = prev ? Date.now() - prev.getTime() : Infinity;
          if (age > 20000) {
            setStatus('degraded');
          } else {
            setStatus('online');
          }
          return prev;
        });
      } else {
        setStatus('offline');
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
      clearInterval(id);
    };
  }, [check]);

  return { status, lastOnlineAt, retry: check };
}

function ConnectivityBanner({ status, lastOnlineAt, onRetry }: { status: ConnectivityStatus; lastOnlineAt: Date | null; onRetry: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (status !== 'online') setDismissed(false);
  }, [status]);

  useEffect(() => {
    if (status === 'offline') {
      const id = setInterval(() => setBlink(b => !b), 700);
      return () => clearInterval(id);
    }
  }, [status]);

  if (status === 'online' || dismissed) return null;

  return (
    <div className={`sticky top-0 z-[100] flex items-center gap-3 px-4 py-2 text-xs font-medium transition-all ${
      status === 'offline'
        ? `border-b border-red-700/60 bg-red-950/90 text-red-300 ${blink ? 'opacity-100' : 'opacity-80'}`
        : 'border-b border-amber-700/50 bg-amber-950/80 text-amber-300'
    }`} style={{ backdropFilter: 'blur(8px)' }}>
      {status === 'offline'
        ? <WifiOff className="w-3.5 h-3.5 shrink-0 text-red-400" />
        : <Wifi className="w-3.5 h-3.5 shrink-0 text-amber-400" />
      }
      <div className="flex-1 min-w-0">
        {status === 'offline'
          ? <span><span className="font-bold text-red-400">CONNECTION LOST</span> — Sensor data feed interrupted. Attempting reconnect. Last online: {lastOnlineAt ? lastOnlineAt.toLocaleTimeString() : 'unknown'}</span>
          : <span><span className="font-bold text-amber-400">SIGNAL DEGRADED</span> — Connection quality reduced. Live feeds may have increased latency.</span>
        }
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-current/30 hover:bg-white/10 transition-all shrink-0 text-[10px]"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
      {status !== 'offline' && (
        <button onClick={() => setDismissed(true)} className="text-current/50 hover:text-current transition-colors shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function KillSwitchPanel({ onClose }: { onClose: () => void }) {
  const [audioKilled, setAudioKilled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const killAllAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const ctx = (window as unknown as { _audioCtx?: AudioContext })._audioCtx;
    if (ctx) ctx.suspend();
    const videos = document.querySelectorAll<HTMLVideoElement>('video');
    videos.forEach(v => { v.muted = true; v.pause(); });
    const audios = document.querySelectorAll<HTMLAudioElement>('audio');
    audios.forEach(a => { a.muted = true; a.pause(); });
    setAudioKilled(true);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800/60">
          <div className="p-2 rounded-xl bg-red-900/40 border border-red-700/50">
            <Power className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Emergency Kill Switch</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Immediately halt all active streams and audio</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <button
              onClick={killAllAudio}
              disabled={audioKilled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                audioKilled
                  ? 'border-emerald-700/40 bg-emerald-900/20 text-emerald-400 cursor-default'
                  : 'border-red-700/50 bg-red-900/20 text-red-300 hover:bg-red-900/30 active:scale-[0.98]'
              }`}
            >
              {audioKilled
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <VolumeX className="w-4 h-4 shrink-0" />
              }
              {audioKilled ? 'All Audio Halted' : 'Mute All Audio + Speech'}
            </button>

            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">What this does</p>
              <ul className="space-y-1 text-[10px] text-slate-400">
                <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-600" />Cancels all Web Speech synthesis (alarms, TTS)</li>
                <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-600" />Mutes and pauses all video/audio elements</li>
                <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-slate-600" />Suspends AudioContext if active</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-900/10 border border-amber-700/30 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400 leading-relaxed">
                To fully stop a microphone or camera feed, navigate to that module and deactivate it directly. This switch handles OS-level audio output and TTS only.
              </p>
            </div>
          </div>

          {!confirmed ? (
            <button
              onClick={() => setConfirmed(true)}
              className="w-full px-4 py-2.5 rounded-xl border border-red-700/50 bg-red-900/20 text-red-300 text-sm font-bold hover:bg-red-900/30 transition-all"
            >
              Reload Page (Full Reset)
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-center text-amber-400 font-semibold">Confirm — this will reload the page and end all sessions</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmed(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-700/40 text-slate-400 text-sm hover:border-slate-600 transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-700 border border-red-600 text-white text-sm font-bold hover:bg-red-600 transition-all"
                >
                  Reload Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SovereignShell() {
  const { session, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const { status: connStatus, lastOnlineAt, retry: retryConn } = useConnectivityWatchdog();
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('action') === 'open-411';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'open-411') {
      params.delete('action');
      const newUrl = [window.location.pathname, params.toString()].filter(Boolean).join('?');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleCloseModal = () => {
    setEvidenceModalOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'open-411') {
      params.delete('action');
      const newUrl = [window.location.pathname, params.toString()].filter(Boolean).join('?');
      window.history.replaceState({}, '', newUrl);
    }
  };

  const activeItem = NAV_ITEMS.find(n => n.id === activeSection)!;
  const header = SECTION_HEADERS[activeSection];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <ConnectivityBanner status={connStatus} lastOnlineAt={lastOnlineAt} onRetry={retryConn} />
      {killSwitchOpen && <KillSwitchPanel onClose={() => setKillSwitchOpen(false)} />}

      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:relative md:flex flex-col bg-slate-900/90 border-r border-slate-800/60 shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800/40 ${collapsed ? 'justify-center' : ''}`}>
          <div className="p-2 rounded-xl bg-sky-900/30 border border-sky-800/40 shrink-0">
            <Shield className="w-4 h-4 text-sky-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-white tracking-tight leading-none">SOVEREIGN</p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5 tracking-widest">v3.0 · TACTICAL</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? ACCENT_ACTIVE[item.accent]
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className={`w-4 h-4 ${isActive ? ACCENT_ICON[item.accent] : ''}`} />
                  {isActive && (
                    <div className={`absolute -right-1 -top-1 w-1.5 h-1.5 rounded-full ${ACCENT_INDICATOR[item.accent]}`} />
                  )}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-none truncate">{item.label}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5 truncate">{item.sublabel}</p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-3 py-3 border-t border-slate-800/40">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-6 h-6 rounded-full bg-slate-700/60 border border-slate-600/30 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-slate-300">
                  {session?.user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-slate-300 truncate">{session?.user?.email}</p>
                <p className="text-[9px] text-slate-600">Principal Investigator</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 text-[10px] hover:text-slate-300 hover:bg-slate-800/30 transition-all"
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
          </div>
        )}

        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top header */}
        <header className="md:hidden bg-slate-900/90 border-b border-slate-800/60 px-4 py-3 sticky top-0 z-40 flex items-center justify-between" style={{ backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-900/30 border border-sky-800/40">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight leading-none">SOVEREIGN</p>
              <p className="text-[8px] text-slate-500 font-mono tracking-widest">v3.0 · TACTICAL</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400">LIVE</span>
            </div>
            <button
              onClick={() => setEvidenceModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-700 border border-red-600 text-white text-[10px] font-bold hover:bg-red-600 active:scale-95 transition-all"
            >
              <FileWarning className="w-3 h-3" />
              4:11
            </button>
          </div>
        </header>

        {/* Desktop section header */}
        {activeSection !== 'dashboard' && (
          <header className="hidden md:block bg-slate-900/60 border-b border-slate-800/50 px-6 py-4 sticky top-0 z-40" style={{ backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${ACCENT_ACTIVE[activeItem.accent]}`}>
                  <activeItem.icon className={`w-4 h-4 ${ACCENT_ICON[activeItem.accent]}`} />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white">{header.title}</h1>
                  <p className="text-[10px] text-slate-500 mt-0.5 max-w-xl">{header.sub}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SecurityAuditBadge />
                <StatusBar onKillSwitch={() => setKillSwitchOpen(true)} />
                <button
                  onClick={() => setEvidenceModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 border border-red-600 text-white text-xs font-bold hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-950/50"
                >
                  <FileWarning className="w-3.5 h-3.5" />
                  4:11 Input
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Mobile section title bar (non-dashboard) */}
        {activeSection !== 'dashboard' && (
          <div className="md:hidden bg-slate-900/40 border-b border-slate-800/30 px-4 py-2.5 flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${ACCENT_ACTIVE[activeItem.accent]}`}>
              <activeItem.icon className={`w-3 h-3 ${ACCENT_ICON[activeItem.accent]}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{header.title}</p>
            </div>
          </div>
        )}

        <main className={`flex-1 overflow-y-auto pb-16 md:pb-0 ${activeSection === 'dashboard' ? '' : 'p-4 md:p-6'}`}>
          {activeSection === 'dashboard' && (
            <div className="relative">
              <div className="absolute top-4 right-4 md:right-6 z-30">
                <button
                  onClick={() => setEvidenceModalOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 border border-red-600 text-white text-xs font-bold hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-950/50"
                >
                  <FileWarning className="w-3.5 h-3.5" />
                  4:11 Input
                </button>
              </div>
              <Dashboard />
            </div>
          )}
          {activeSection === 'forensic_ai' && <AudioErrorBoundary><ForensicLayer /></AudioErrorBoundary>}
          {activeSection === 'robotics' && <RoboticsDashboard />}
          {activeSection === 'safety_scanner' && <AudioErrorBoundary><SafetyScanner /></AudioErrorBoundary>}
          {activeSection === 'audit_log' && <AuditLog />}
          {activeSection === 'config' && <ConfigPanel />}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-slate-800/60" style={{ backdropFilter: 'blur(12px)' }}>
        <div className="flex items-stretch">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-all relative ${
                  isActive ? '' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {isActive && (
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${ACCENT_INDICATOR[item.accent]}`} />
                )}
                <Icon className={`w-4.5 h-4.5 w-[18px] h-[18px] ${isActive ? ACCENT_ICON[item.accent] : ''}`} />
                <span className={`text-[9px] font-semibold leading-none ${isActive ? ACCENT_ICON[item.accent] : ''}`}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
          <button
            onClick={signOut}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-3 text-slate-600 hover:text-slate-400 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="text-[9px] font-semibold leading-none">Logout</span>
          </button>
        </div>
      </nav>

      {evidenceModalOpen && session && (
        <EvidenceModal
          userId={session.user.id}
          onClose={handleCloseModal}
        />
      )}
      </div>
    </div>
  );
}
