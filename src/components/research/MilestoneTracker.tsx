import { useState } from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { GrantMilestone } from '../../lib/database.types';
import {
  updateMilestoneStatus,
  getStatusBadgeClasses,
  getPriorityBadgeClasses,
  formatDueDate,
  getDaysUntilDue,
  type MilestoneStatus,
} from '../../compliance/GrantReportingEngine';

interface Props {
  milestones: GrantMilestone[];
  onRefresh: () => void;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case 'in_progress':
      return <Clock className="w-4 h-4 text-sky-400" />;
    case 'overdue':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    default:
      return <Circle className="w-4 h-4 text-slate-500" />;
  }
}

function DueBadge({ daysUntil, status }: { daysUntil: number; status: string }) {
  if (status === 'completed') return null;
  if (daysUntil < 0) {
    return (
      <span className="text-[10px] font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full border border-red-700/40">
        {Math.abs(daysUntil)}d overdue
      </span>
    );
  }
  if (daysUntil <= 3) {
    return (
      <span className="text-[10px] font-medium text-red-300 bg-red-900/20 px-2 py-0.5 rounded-full border border-red-700/30">
        {daysUntil}d remaining
      </span>
    );
  }
  if (daysUntil <= 7) {
    return (
      <span className="text-[10px] font-medium text-amber-300 bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-700/30">
        {daysUntil}d remaining
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40">
      {daysUntil}d remaining
    </span>
  );
}

export default function MilestoneTracker({ milestones, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: MilestoneStatus) => {
    setUpdating(id);
    try {
      await updateMilestoneStatus(id, status);
      onRefresh();
    } finally {
      setUpdating(null);
    }
  };

  const statusOptions: MilestoneStatus[] = ['pending', 'in_progress', 'completed', 'overdue'];

  return (
    <div className="space-y-2">
      {milestones.map((milestone, index) => {
        const daysUntil = getDaysUntilDue(milestone.due_date);
        const isExpanded = expandedId === milestone.id;

        return (
          <div
            key={milestone.id}
            className={`rounded-xl border transition-all duration-200 ${
              milestone.status === 'completed'
                ? 'border-emerald-800/30 bg-slate-900/30'
                : milestone.status === 'overdue' || (daysUntil < 0 && milestone.status !== 'completed')
                ? 'border-red-800/40 bg-red-950/10'
                : 'border-slate-700/40 bg-slate-800/20'
            }`}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
              onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800/80 border border-slate-700/60 shrink-0">
                <span className="text-[10px] font-bold text-slate-500">{index + 1}</span>
              </div>
              <StatusIcon status={milestone.status} />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    milestone.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'
                  }`}
                >
                  {milestone.title}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{formatDueDate(milestone.due_date)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DueBadge daysUntil={daysUntil} status={milestone.status} />
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getPriorityBadgeClasses(milestone.priority)}`}>
                  {milestone.priority}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusBadgeClasses(milestone.status)}`}>
                  {milestone.status.replace('_', ' ')}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-700/30 pt-3">
                <p className="text-sm text-slate-400 leading-relaxed mb-4">{milestone.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">Update status:</span>
                  {statusOptions.map(s => (
                    <button
                      key={s}
                      disabled={updating === milestone.id || milestone.status === s}
                      onClick={() => handleStatusChange(milestone.id, s)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                        milestone.status === s
                          ? getStatusBadgeClasses(s) + ' cursor-default'
                          : 'border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-700/40'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {milestones.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">No milestones found.</p>
        </div>
      )}
    </div>
  );
}
