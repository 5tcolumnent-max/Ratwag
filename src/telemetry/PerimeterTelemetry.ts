import type { RiskLevel, SensorProfile, RiskProfile } from './InfrastructureMonitor';
import { PERIMETER_SENSORS, assessRiskLevel, buildLatestSensorStates, aggregateRiskProfile } from './InfrastructureMonitor';
import type { InfrastructureReading } from '../lib/database.types';

export interface NISTControl {
  id: string;
  family: string;
  title: string;
  description: string;
  ciProfileTier: 'baseline' | 'enhanced' | 'high';
}

export interface NISTCIProfileResult {
  control: NISTControl;
  sensors: SensorProfile[];
  status: 'compliant' | 'at_risk' | 'non_compliant' | 'not_assessed';
  findings: string[];
  riskLevel: RiskLevel;
}

export interface PerimeterCIProfile {
  profileName: string;
  generatedAt: string;
  overallStatus: 'compliant' | 'at_risk' | 'non_compliant';
  complianceScore: number;
  controlResults: NISTCIProfileResult[];
  riskProfile: RiskProfile;
  recommendations: string[];
}

export interface SensorTrend {
  sensorId: string;
  readings: { timestamp: string; value: number; risk_level: RiskLevel }[];
  trend: 'stable' | 'increasing' | 'decreasing';
  trendMagnitude: number;
}

export interface AuditLogEntry {
  timestamp: string;
  controlId: string;
  sensorId: string;
  location: string;
  event: string;
  riskLevel: RiskLevel;
  reviewStatus: 'pending' | 'reviewed' | 'escalated';
}

const NIST_CI_CONTROLS: NISTControl[] = [
  {
    id: 'PE-3',
    family: 'Physical & Environmental Protection',
    title: 'Physical Access Control',
    description: 'Controls access to facilities and systems. Monitors entry/exit events at defined perimeter boundaries.',
    ciProfileTier: 'baseline',
  },
  {
    id: 'PE-6',
    family: 'Physical & Environmental Protection',
    title: 'Monitoring Physical Access',
    description: 'Monitors physical access to systems using physical intrusion alarms and surveillance equipment.',
    ciProfileTier: 'baseline',
  },
  {
    id: 'PE-14',
    family: 'Physical & Environmental Protection',
    title: 'Temperature and Humidity Controls',
    description: 'Maintains temperature and humidity levels within acceptable ranges for IT equipment operation.',
    ciProfileTier: 'baseline',
  },
  {
    id: 'SI-4',
    family: 'System & Information Integrity',
    title: 'Information System Monitoring',
    description: 'Monitors the information system to detect attacks, indicators of potential attacks, and unauthorized connections.',
    ciProfileTier: 'enhanced',
  },
  {
    id: 'IR-6',
    family: 'Incident Response',
    title: 'Incident Reporting',
    description: 'Requires personnel to report suspected security incidents. Automated alerting on threshold breaches.',
    ciProfileTier: 'baseline',
  },
  {
    id: 'AU-6',
    family: 'Audit & Accountability',
    title: 'Audit Record Review & Analysis',
    description: 'Reviews and analyzes information system audit records for signs of inappropriate activity.',
    ciProfileTier: 'enhanced',
  },
];

function evaluateControlFromReadings(
  control: NISTControl,
  readings: InfrastructureReading[]
): NISTCIProfileResult {
  const relevantSensors = PERIMETER_SENSORS.filter(s => s.nist_control === control.id);
  const findings: string[] = [];

  if (relevantSensors.length === 0) {
    if (control.id === 'PE-6' || control.id === 'IR-6' || control.id === 'AU-6') {
      return {
        control,
        sensors: [],
        status: 'not_assessed',
        findings: [`${control.id} is assessed via procedural controls and audit log review, not sensor telemetry. Conduct manual review.`],
        riskLevel: 'low',
      };
    }
    return {
      control,
      sensors: [],
      status: 'not_assessed',
      findings: ['No sensors mapped to this control.'],
      riskLevel: 'low',
    };
  }

  const states = buildLatestSensorStates(readings).filter(
    s => s.profile.nist_control === control.id
  );

  const activeStates = states.filter(s => s.reading !== null);
  if (activeStates.length === 0) {
    return {
      control,
      sensors: relevantSensors,
      status: 'not_assessed',
      findings: [`${relevantSensors.length} sensor(s) mapped but no readings recorded. Run a perimeter scan to assess.`],
      riskLevel: 'low',
    };
  }

  let worstRisk: RiskLevel = 'low';
  for (const state of activeStates) {
    if (state.risk_level === 'critical') worstRisk = 'critical';
    else if (state.risk_level === 'high' && worstRisk !== 'critical') worstRisk = 'high';
    else if (state.risk_level === 'medium' && worstRisk === 'low') worstRisk = 'medium';

    if (state.risk_level === 'critical') {
      findings.push(`[CRITICAL] ${state.profile.location}: ${state.reading?.value} ${state.profile.unit} — exceeds high threshold (${state.profile.thresholds.high} ${state.profile.unit}).`);
    } else if (state.risk_level === 'high') {
      findings.push(`[HIGH] ${state.profile.location}: ${state.reading?.value} ${state.profile.unit} — exceeds medium threshold.`);
    } else if (state.risk_level === 'medium') {
      findings.push(`[MEDIUM] ${state.profile.location}: ${state.reading?.value} ${state.profile.unit} — elevated, within monitoring range.`);
    } else {
      findings.push(`[NOMINAL] ${state.profile.location}: ${state.reading?.value} ${state.profile.unit} — within normal operating range.`);
    }
  }

  const status: NISTCIProfileResult['status'] =
    worstRisk === 'critical' || worstRisk === 'high'
      ? 'non_compliant'
      : worstRisk === 'medium'
      ? 'at_risk'
      : 'compliant';

  return { control, sensors: relevantSensors, status, findings, riskLevel: worstRisk };
}

function buildRecommendations(results: NISTCIProfileResult[]): string[] {
  const recommendations: string[] = [];

  const nonCompliant = results.filter(r => r.status === 'non_compliant');
  const atRisk = results.filter(r => r.status === 'at_risk');
  const notAssessed = results.filter(r => r.status === 'not_assessed');

  if (nonCompliant.length > 0) {
    recommendations.push(
      `Immediate remediation required for ${nonCompliant.length} non-compliant control(s): ${nonCompliant.map(r => r.control.id).join(', ')}. Document incident per IR-6.`
    );
  }
  if (atRisk.length > 0) {
    recommendations.push(
      `Elevated readings on ${atRisk.length} control(s) (${atRisk.map(r => r.control.id).join(', ')}). Increase monitoring frequency and investigate root cause.`
    );
  }
  if (notAssessed.length > 0) {
    const sensorBased = notAssessed.filter(r => r.sensors.length > 0);
    const proceduralBased = notAssessed.filter(r => r.sensors.length === 0);
    if (sensorBased.length > 0) {
      recommendations.push(
        `${sensorBased.length} sensor-based control(s) have not been assessed. Conduct a full perimeter scan to establish baselines.`
      );
    }
    if (proceduralBased.length > 0) {
      recommendations.push(
        `${proceduralBased.length} procedural control(s) (${proceduralBased.map(r => r.control.id).join(', ')}) require manual review of audit logs and incident records.`
      );
    }
  }
  if (recommendations.length === 0) {
    recommendations.push('All assessed controls are within nominal operating parameters. Maintain current monitoring cadence.');
  }

  return recommendations;
}

export function generateNISTCIProfile(readings: InfrastructureReading[]): PerimeterCIProfile {
  const controlResults = NIST_CI_CONTROLS.map(control =>
    evaluateControlFromReadings(control, readings)
  );

  const assessed = controlResults.filter(r => r.status !== 'not_assessed');
  const compliantCount = assessed.filter(r => r.status === 'compliant').length;
  const complianceScore = assessed.length > 0
    ? Math.round((compliantCount / assessed.length) * 100)
    : 0;

  const hasNonCompliant = controlResults.some(r => r.status === 'non_compliant');
  const hasAtRisk = controlResults.some(r => r.status === 'at_risk');
  const overallStatus = hasNonCompliant
    ? 'non_compliant'
    : hasAtRisk
    ? 'at_risk'
    : 'compliant';

  const riskProfile = aggregateRiskProfile(readings);
  const recommendations = buildRecommendations(controlResults);

  return {
    profileName: 'NIST SP 800-53 Rev. 5 — Critical Infrastructure Profile',
    generatedAt: new Date().toISOString(),
    overallStatus,
    complianceScore,
    controlResults,
    riskProfile,
    recommendations,
  };
}

export function buildSensorTrends(
  readings: InfrastructureReading[],
  sensorId: string,
  limit = 10
): SensorTrend {
  const sensorReadings = readings
    .filter(r => r.sensor_id === sensorId)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .slice(-limit);

  const profile = PERIMETER_SENSORS.find(s => s.sensor_id === sensorId)!;
  const mapped = sensorReadings.map(r => ({
    timestamp: r.recorded_at,
    value: Number(r.value),
    risk_level: assessRiskLevel(Number(r.value), profile?.thresholds ?? { low: 0, medium: 0, high: 0 }),
  }));

  let trend: SensorTrend['trend'] = 'stable';
  let trendMagnitude = 0;

  if (mapped.length >= 2) {
    const first = mapped[0].value;
    const last = mapped[mapped.length - 1].value;
    trendMagnitude = Math.abs(last - first);
    const threshold = (profile?.thresholds.low ?? 1) * 0.15;
    if (last - first > threshold) trend = 'increasing';
    else if (first - last > threshold) trend = 'decreasing';
  }

  return { sensorId, readings: mapped, trend, trendMagnitude };
}

export function buildAuditLog(readings: InfrastructureReading[], limit = 20): AuditLogEntry[] {
  const elevated = readings
    .filter(r => r.risk_level === 'critical' || r.risk_level === 'high' || r.risk_level === 'medium')
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .slice(0, limit);

  return elevated.map((r, idx) => {
    const risk = r.risk_level as RiskLevel;
    const eventLabel =
      risk === 'critical'
        ? 'Threshold breach — critical alert generated'
        : risk === 'high'
        ? 'Elevated reading — monitoring threshold exceeded'
        : 'Sensor value in medium-risk range';

    const reviewStatus: AuditLogEntry['reviewStatus'] =
      risk === 'critical' ? 'escalated' : idx < 3 ? 'pending' : 'reviewed';

    return {
      timestamp: r.recorded_at,
      controlId: r.nist_control,
      sensorId: r.sensor_id,
      location: r.location,
      event: eventLabel,
      riskLevel: risk,
      reviewStatus,
    };
  });
}

export function getAuditReviewStatusClasses(status: AuditLogEntry['reviewStatus']): {
  text: string;
  bg: string;
  border: string;
} {
  switch (status) {
    case 'escalated':
      return { text: 'text-red-300', bg: 'bg-red-900/30', border: 'border-red-700/40' };
    case 'pending':
      return { text: 'text-amber-300', bg: 'bg-amber-900/20', border: 'border-amber-700/30' };
    default:
      return { text: 'text-emerald-300', bg: 'bg-emerald-900/20', border: 'border-emerald-700/30' };
  }
}

export function getNISTStatusClasses(status: NISTCIProfileResult['status']): {
  bg: string;
  border: string;
  text: string;
  badge: string;
  label: string;
} {
  switch (status) {
    case 'compliant':
      return {
        bg: 'bg-emerald-900/20',
        border: 'border-emerald-700/40',
        text: 'text-emerald-300',
        badge: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
        label: 'Compliant',
      };
    case 'at_risk':
      return {
        bg: 'bg-amber-900/20',
        border: 'border-amber-700/40',
        text: 'text-amber-300',
        badge: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
        label: 'At Risk',
      };
    case 'non_compliant':
      return {
        bg: 'bg-red-900/20',
        border: 'border-red-700/40',
        text: 'text-red-300',
        badge: 'bg-red-900/40 text-red-300 border-red-700/50',
        label: 'Non-Compliant',
      };
    default:
      return {
        bg: 'bg-slate-800/20',
        border: 'border-slate-700/40',
        text: 'text-slate-400',
        badge: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
        label: 'Not Assessed',
      };
  }
}

export { NIST_CI_CONTROLS };
