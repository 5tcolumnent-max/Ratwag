export type AuthDecision = 'APPROVE' | 'DENY';
export type AuthorizationStatus = 'APPROVE' | 'DENY' | 'PENDING';

export interface AuthorizationPacket {
  missionId: string;
  requestedCommand: string;
  requestedAt: string;
  requestedBy: string;
}

export interface PendingAuthorization {
  missionId: string;
  requestedAt: string;
  requestedCommand: string;
}

export interface AuthorizationResult {
  packet: AuthorizationPacket;
  decision: AuthorizationStatus;
  decidedAt: string;
  decidedBy: string;
}

export interface MissionControlState {
  pendingAuthorization: PendingAuthorization | null;
  isSubmitting: boolean;
  error: string | null;
}
