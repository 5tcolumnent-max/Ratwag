import { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Twitter, Linkedin, Mail, Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import { recordShareEvent, buildShareUrl, type ShareChannel } from '../services/shareTelemetry';

interface ShareButtonProps {
  userId: string;
  section: string;
  entityId?: string | null;
  entityType?: string | null;
  label?: string;
}

interface ChannelConfig {
  key: ShareChannel;
  label: string;
  icon: typeof Twitter;
  color: string;
  hoverBg: string;
}

const CHANNELS: ChannelConfig[] = [
  { key: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'text-sky-400', hoverBg: 'hover:bg-sky-900/40' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-400', hoverBg: 'hover:bg-blue-900/40' },
  { key: 'reddit', label: 'Reddit', icon: Share2, color: 'text-orange-400', hoverBg: 'hover:bg-orange-900/40' },
  { key: 'email', label: 'Email', icon: Mail, color: 'text-emerald-400', hoverBg: 'hover:bg-emerald-900/40' },
  { key: 'copy', label: 'Copy Link', icon: LinkIcon, color: 'text-slate-300', hoverBg: 'hover:bg-slate-800/60' },
];

export function ShareButton({
  userId,
  section,
  entityId = null,
  entityType = null,
  label = 'Share',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [pendingChannel, setPendingChannel] = useState<ShareChannel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const defaultMsg = `Sovereign v3.0 — ${section} module`;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleShare = useCallback(
    async (channel: ShareChannel) => {
      setPendingChannel(channel);
      const msg = message.trim() || defaultMsg;
      await recordShareEvent(userId, {
        channel,
        section,
        entityId,
        entityType,
        shareUrl,
        message: msg,
      });

      if (channel === 'copy') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard unavailable; still record the event
        }
      } else {
        const url = buildShareUrl(channel, shareUrl, msg);
        window.open(url, '_blank', 'noopener,noreferrer,width=620,height=540');
      }
      setPendingChannel(null);
    },
    [message, defaultMsg, userId, section, entityId, entityType, shareUrl],
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700/50 bg-slate-800/60 text-slate-300 text-xs font-semibold hover:bg-slate-700/60 hover:border-slate-600 active:scale-95 transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-800/60">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Share this section
            </p>
          </div>

          <div className="px-4 py-3 space-y-3">
            <textarea
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-600/60 resize-none leading-relaxed transition-colors"
              rows={2}
              placeholder={defaultMsg}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />

            <div className="space-y-1">
              {CHANNELS.map(({ key, label: chLabel, icon: Icon, color, hoverBg }) => {
                const isPending = pendingChannel === key;
                const isCopied = key === 'copy' && copied;
                return (
                  <button
                    key={key}
                    onClick={() => handleShare(key)}
                    disabled={isPending}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent text-left text-xs font-medium text-slate-300 ${hoverBg} hover:border-slate-700/40 transition-all disabled:opacity-60`}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isPending ? (
                      <Loader2 className="w-4 h-4 text-slate-400 shrink-0 animate-spin" />
                    ) : (
                      <Icon className={`w-4 h-4 ${color} shrink-0`} />
                    )}
                    <span className="flex-1">{isCopied ? 'Link copied!' : chLabel}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[9px] text-slate-600 font-mono leading-relaxed pt-1 border-t border-slate-800/40">
              Each share is logged to the audit telemetry table for compliance tracking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareButton;
