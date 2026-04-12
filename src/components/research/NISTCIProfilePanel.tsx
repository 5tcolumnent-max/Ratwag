import { useMemo, useState } from 'react';
import { Shield, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Activity, ScrollText } from 'lucide-react';
import type { InfrastructureReading } from '../../lib/database.types';
import {
  generateNISTCIProfile,
  getNISTStatusClasses,
  buildSensorTrends,
  buildAuditLog,
  getAuditReviewStatusClasses,
  NIST_CI_CONTROLS,
} from '../../telemetry/PerimeterTelemetry';
import { PERIMETER_SENSORS } from '../../telemetry/InfrastructureMonitor';
import type { NISTCIProfileResult } from '../../telemetry/PerimeterTelemetry';

interface Props {
  readings: InfrastructureReading[];
}

function ControlCard({
  result,
  expanded,
  onToggle,
}: {
  result: NISTCIProfileResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cls = getNISTStatusClasses(result.status);

  return (
    <div className={`border rounded-xl overflow-hidden ${cls.border}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity text-left ${cls.bg}`}
      >
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-300">{result.control.id}</span>
            <span className="text-sm font-medium text-slate-200">{result.control.title}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{result.control.family}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ background: 'transparent' }}
          >
            <span className={cls.text}>{cls.label}</span>
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            result.control.ciProfileTier === 'high'
              ? 'bg-red-900/20 text-red-300 border-red-700/30'
              : result.control.ciProfileTier === 'enhanced'
              ? 'bg-amber-900/20 text-amber-300 border-amber-700/30'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/40'
          }`}>
            {result.control.ciProfileTier.toUpperCase()}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-700/30 bg-slate-900/30 px-4 py-4 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">{result.control.description}</p>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Sensor Findings</p>
            <div className="space-y-1.5">
              {result.findings.map((finding, i) => (
                <p key={i} className="text-xs text-slate-300 font-mono leading-relaxed pl-2 border-l-2 border-slate-700/50">
                  {finding}
                </p>
              ))}
            </div>
          </div>
          {result.sensors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Mapped Sensors ({result.sensors.length})</p>
              <div className="flex flex-wrap gap-2">
                {result.sensors.map(s => (
                  <span key={s.sensor_id} className="text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded">
                    {s.sensor_id} — {s.location}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ trend, magnitude }: { trend: 'stable' | 'increasing' | 'decreasing'; magnitude: number }) {
  if (trend === 'increasing') {
    return (
      <span className="flex items-center gap-1 text-amber-400 text-xs">
        <TrendingUp className="w-3 h-3" />
        +{magnitude.toFixed(1)}
      </span>
    );
  }
  if (trend === 'decreasing') {
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-xs">
        <TrendingDown className="w-3 h-3" />
        -{magnitude.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-slate-500 text-xs">
      <Minus className="w-3 h-3" />
      Stable
    </span>
  );
}

export default function NISTCIProfilePanel({ readings }: Props) {
  const profile = useMemo(() => generateNISTCIProfile(readings), [readings]);
  const auditLog = useMemo(() => buildAuditLog(readings, 20), [readings]);
  const [expandedControls, setExpandedControls] = useState<Set<string>>(new Set());

  const toggleControl = (id: string) => {
    setExpandedControls(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const overallCls = getNISTStatusClasses(profile.overallStatus);

  const sensorTrends = useMemo(
    () => PERIMETER_SENSORS.map(s => buildSensorTrends(readings, s.sensor_id, 8)),
    [readings]
  );

  const nonCompliant = profile.controlResults.filter(r => r.status === 'non_compliant').length;
  const atRisk = profile.controlResults.filter(r => r.status === 'at_risk').length;
  const compliant = profile.controlResults.filter(r => r.status === 'compliant').length;
  const notAssessed = profile.controlResults.filter(r => r.status === 'not_assessed').length;

  const pendingReview = auditLog.filter(e => e.reviewStatus === 'pending').length;
  const escalated = auditLog.filter(e => e.reviewStatus === 'escalated').length;

  return (
    <div className="space-y-6">
      <div className={`border rounded-xl p-5 ${overallCls.bg} ${overallCls.border}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${overallCls.text}`} />
            <div>
              <p className="text-xs text-slate-500">{profile.profileName}</p>
              <p className={`text-base font-bold ${overallCls.text}`}>
                Overall Status: {overallCls.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500">Compliance Score</p>
              <p className={`text-2xl font-bold ${overallCls.text}`}>{profile.complianceScore}%</p>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 bg-slate-800/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              profile.complianceScore >= 80 ? 'bg-emerald-500' : profile.complianceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${profile.complianceScore}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Compliant', value: compliant, color: 'text-emerald-400' },
            { label: 'At Risk', value: atRisk, color: 'text-amber-400' },
            { label: 'Non-Compliant', value: nonCompliant, color: 'text-red-400' },
            { label: 'Not Assessed', value: notAssessed, color: 'text-slate-500' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {profile.recommendations.length > 0 && (
        <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Recommendations</p>
          {profile.recommendations.map((rec, i) => (
            <div key={i} className="flex gap-2 text-xs text-slate-300">
              <span className="text-slate-600 shrink-0 font-mono">{String(i + 1).padStart(2, '0')}.</span>
              <span className="leading-relaxed">{rec}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Control Assessments</h3>
        <div className="space-y-2">
          {profile.controlResults.map(result => (
            <ControlCard
              key={result.control.id}
              result={result}
              expanded={expandedControls.has(result.control.id)}
              onToggle={() => toggleControl(result.control.id)}
            />
          ))}
        </div>
      </div>

      {readings.length > 0 && (
        <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">Sensor Trend Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/40">
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Sensor</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Location</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">NIST Control</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Readings</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sensorTrends.map(trend => {
                  const sensor = PERIMETER_SENSORS.find(s => s.sensor_id === trend.sensorId);
                  if (!sensor) return null;
                  return (
                    <tr key={trend.sensorId} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className="text-xs font-mono text-slate-300">{trend.sensorId}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-xs text-slate-400">{sensor.location}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-xs font-mono text-sky-400">{sensor.nist_control}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className="text-xs text-slate-500">{trend.readings.length}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <TrendIndicator trend={trend.trend} magnitude={trend.trendMagnitude} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">AU-6 — Audit Record Review Log</h3>
          </div>
          <div className="flex items-center gap-2">
            {escalated > 0 && (
              <span className="text-[10px] font-semibold text-red-300 bg-red-900/30 border border-red-700/40 px-2 py-0.5 rounded-full">
                {escalated} Escalated
              </span>
            )}
            {pendingReview > 0 && (
              <span className="text-[10px] font-semibold text-amber-300 bg-amber-900/20 border border-amber-700/30 px-2 py-0.5 rounded-full">
                {pendingReview} Pending Review
              </span>
            )}
          </div>
        </div>

        {auditLog.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No elevated sensor events recorded. Run a perimeter scan to populate the audit log.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/40">
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Timestamp</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Control</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Sensor</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4 hidden md:table-cell">Event</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Risk</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {auditLog.map((entry, idx) => {
                  const statusCls = getAuditReviewStatusClasses(entry.reviewStatus);
                  return (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2 pr-4">
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(entry.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className="text-xs font-mono text-sky-400">{entry.controlId}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className="text-xs font-mono text-slate-400">{entry.sensorId}</span>
                      </td>
                      <td className="py-2 pr-4 hidden md:table-cell">
                        <span className="text-xs text-slate-400">{entry.event}</span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span className={`text-[10px] font-semibold uppercase ${
                          entry.riskLevel === 'critical' ? 'text-red-400' : entry.riskLevel === 'high' ? 'text-amber-400' : 'text-yellow-400'
                        }`}>
                          {entry.riskLevel}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusCls.text} ${statusCls.bg} ${statusCls.border}`}>
                          {entry.reviewStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-600 text-right">
        Profile generated: {new Date(profile.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        &nbsp;|&nbsp; Framework: NIST SP 800-53 Rev. 5
      </div>
    </div>
  );
}
