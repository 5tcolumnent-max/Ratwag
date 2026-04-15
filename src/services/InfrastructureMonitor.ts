import { supabase } from './supabase';
import type { InfrastructureReading } from '../types/database.types';

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
  reading: InfrastructureReading | null;
  risk_level: RiskLevel;
}

export const PERIMETER_SENSORS: SensorProfile[] = [
  {
    sensor_id: 'PERI-N-001',
    sensor_type: 'perimeter',
    location: 'North Boundary — 15m',
    nist_control: 'PE-3',
    nist_description: 'Physical Access Control',
    unit: 'events/hr',
    thresholds: { low: 5, medium: 15, high: 30 },
  },
  {
    sensor_id: 'PERI-S-001',
    sensor_type: 'perimeter',
    location: 'South Boundary — 15m',
    nist_control: 'PE-3',
    nist_description: 'Physical Access Control',
    unit: 'events/hr',
    thresholds: { low: 5, medium: 15, high: 30 },
  },
  {
    sensor_id: 'PERI-E-001',
    sensor_type: 'perimeter',
    location: 'East Boundary — 15m',
    nist_control: 'PE-3',
    nist_description: 'Physical Access Control',
    unit: 'events/hr',
    thresholds: { low: 5, medium: 15, high: 30 },
  },
  {
    sensor_id: 'PERI-W-001',
    sensor_type: 'perimeter',
    location: 'West Boundary — 15m',
    nist_control: 'PE-3',
    nist_description: 'Physical Access Control',
    unit: 'events/hr',
    thresholds: { low: 5, medium: 15, high: 30 },
  },
  {
    sensor_id: 'NET-MON-001',
    sensor_type: 'network',
    location: 'Primary Network Interface',
    nist_control: 'SI-4',
    nist_description: 'Information System Monitoring',
    unit: 'Mbps',
    thresholds: { low: 100, medium: 500, high: 850 },
  },
  {
    sensor_id: 'THERM-SVR-001',
    sensor_type: 'thermal',
    location: 'Server Infrastructure',
    nist_control: 'PE-14',
    nist_description: 'Temperature and Humidity Controls',
    unit: '°C',
    thresholds: { low: 22, medium: 27, high: 32 },
  },
];

export function assessRiskLevel(value: number, thresholds: SensorProfile['thresholds']): RiskLevel {
  if (value >= thresholds.high) return 'critical';
  if (value >= thresholds.medium) return 'high';
  if (value >= thresholds.low) return 'medium';
  return 'low';
}

export function generateSimulatedValue(
  profile: SensorProfile,
  scenario: 'nominal' | 'elevated' | 'critical' = 'nominal'
): number {
  const max = profile.thresholds.high;
  const ranges = {
    nominal: [0, profile.thresholds.low * 0.7],
    elevated: [profile.thresholds.low * 0.8, profile.thresholds.medium * 0.85],
    critical: [profile.thresholds.medium * 0.95, max * 1.15],
  };
  const [min, rangeMax] = ranges[scenario];
  return Math.round((Math.random() * (rangeMax - min) + min) * 10) / 10;
}

export async function fetchLatestReadings(): Promise<InfrastructureReading[]> {
  const { data, error } = await supabase
    .from('infrastructure_readings')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(120);
  if (error) throw error;
  return data || [];
}

export async function recordPerimeterScan(
  userId: string,
  scenario: 'nominal' | 'elevated' | 'critical' = 'nominal'
): Promise<void> {
  const readings = PERIMETER_SENSORS.map(sensor => {
    const value = generateSimulatedValue(sensor, scenario);
    const risk_level = assessRiskLevel(value, sensor.thresholds);
    return {
      user_id: userId,
      sensor_id: sensor.sensor_id,
      sensor_type: sensor.sensor_type,
      location: sensor.location,
      value,
      unit: sensor.unit,
      risk_level,
      nist_control: sensor.nist_control,
      recorded_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from('infrastructure_readings').insert(readings);
  if (error) throw error;
}

export function buildLatestSensorStates(readings: InfrastructureReading[]): LatestSensorState[] {
  const latestBySensor: Record<string, InfrastructureReading> = {};
  for (const r of readings) {
    if (
      !latestBySensor[r.sensor_id] ||
      new Date(r.recorded_at) > new Date(latestBySensor[r.sensor_id].recorded_at)
    ) {
      latestBySensor[r.sensor_id] = r;
    }
  }

  return PERIMETER_SENSORS.map(profile => {
    const reading = latestBySensor[profile.sensor_id] || null;
    const risk_level: RiskLevel = reading
      ? assessRiskLevel(reading.value, profile.thresholds)
      : 'low';
    return { profile, reading, risk_level };
  });
}

export function aggregateRiskProfile(readings: InfrastructureReading[]): RiskProfile {
  const states = buildLatestSensorStates(readings);
  const withData = states.filter(s => s.reading !== null);

  const criticalCount = withData.filter(s => s.risk_level === 'critical').length;
  const highCount = withData.filter(s => s.risk_level === 'high').length;
  const mediumCount = withData.filter(s => s.risk_level === 'medium').length;
  const lowCount = withData.filter(s => s.risk_level === 'low').length;

  let overall: RiskLevel = 'low';
  if (criticalCount > 0) overall = 'critical';
  else if (highCount > 0) overall = 'high';
  else if (mediumCount > 0) overall = 'medium';

  const nistComplianceScore = Math.max(
    0,
    100 - criticalCount * 25 - highCount * 10 - mediumCount * 3
  );

  return {
    overall,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    nistComplianceScore,
    activeSensors: withData.length,
  };
}

export function getRiskLevelClasses(level: RiskLevel): { text: string; bg: string; border: string; dot: string } {
  switch (level) {
    case 'critical':
      return {
        text: 'text-red-400',
        bg: 'bg-red-900/20',
        border: 'border-red-700/50',
        dot: 'bg-red-400',
      };
    case 'high':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-900/20',
        border: 'border-amber-700/50',
        dot: 'bg-amber-400',
      };
    case 'medium':
      return {
        text: 'text-yellow-400',
        bg: 'bg-yellow-900/20',
        border: 'border-yellow-700/50',
        dot: 'bg-yellow-400',
      };
    default:
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-900/20',
        border: 'border-emerald-700/50',
        dot: 'bg-emerald-400',
      };
  }
}
