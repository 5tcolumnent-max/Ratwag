import { supabase } from './supabase';

export type ShareChannel = 'twitter' | 'linkedin' | 'reddit' | 'email' | 'copy';

export interface ShareEventInput {
  channel: ShareChannel;
  section: string;
  entityId?: string | null;
  entityType?: string | null;
  shareUrl: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface ShareEventRow {
  id: string;
  channel: string;
  section: string;
  entity_id: string | null;
  entity_type: string | null;
  share_url: string;
  message: string;
  created_at: string;
}

export async function recordShareEvent(
  userId: string,
  input: ShareEventInput,
): Promise<ShareEventRow | null> {
  const { data, error } = await supabase
    .from('share_events')
    .insert({
      user_id: userId,
      channel: input.channel,
      section: input.section,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType ?? null,
      share_url: input.shareUrl,
      message: input.message ?? '',
      metadata: input.metadata ?? {},
    })
    .select('id, channel, section, entity_id, entity_type, share_url, message, created_at')
    .maybeSingle();

  if (error) {
    console.warn('[shareTelemetry] failed to record share event', error.message);
    return null;
  }
  return data as ShareEventRow | null;
}

export async function fetchShareCounts(
  userId: string,
  section?: string,
): Promise<Record<string, number>> {
  let query = supabase
    .from('share_events')
    .select('channel')
    .eq('user_id', userId);

  if (section) query = query.eq('section', section);

  const { data, error } = await query;
  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.channel] = (counts[row.channel] ?? 0) + 1;
  }
  return counts;
}

export function buildShareUrl(
  channel: ShareChannel,
  shareUrl: string,
  message: string,
): string {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedMsg = encodeURIComponent(message);
  switch (channel) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMsg}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedMsg}`;
    case 'email':
      return `mailto:?subject=${encodedMsg}&body=${encodedUrl}`;
    case 'copy':
      return shareUrl;
  }
}
