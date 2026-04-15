import { supabase } from '../services/supabase';

export type LogSeverity = 'info' | 'warning' | 'critical' | 'error';

export interface AuditLogPayload {
  userId: string;
  module: string;
  action: string;
  detail: string;
  severity: LogSeverity;
  entityId?: string;
  entityType?: string;
}

export async function logAuditEntry(payload: AuditLogPayload): Promise<void> {
  await supabase.from('audit_log_entries').insert({
    user_id: payload.userId,
    module: payload.module,
    action: payload.action,
    detail: payload.detail,
    severity: payload.severity,
    entity_id: payload.entityId ?? '',
    entity_type: payload.entityType ?? '',
  });
}

export async function logCriticalEvent(
  userId: string,
  module: string,
  detail: string
): Promise<void> {
  await logAuditEntry({ userId, module, action: 'CRITICAL_EVENT', detail, severity: 'critical' });
}
