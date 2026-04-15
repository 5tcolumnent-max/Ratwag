export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SensorProfile {
  sensor_id: string;
  sensor_type: string;
  location: string;
  nist_control: string;
  nist_description: string;
  unit: string;
  thresholds: { low: number; medium: number; high: number };
}

export interface RiskProfile {
  overall: RiskLevel;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  nistComplianceScore: number;
  activeSensors: number;
}

export interface LatestSensorState {
  profile: SensorProfile;
  reading: import('./database.types').InfrastructureReading | null;
  risk_level: RiskLevel;
}

export interface TelemetryUpdatePayload {
  sensorId: string;
  value: number;
  unit: string;
  riskLevel: RiskLevel;
  recordedAt: string;
}
