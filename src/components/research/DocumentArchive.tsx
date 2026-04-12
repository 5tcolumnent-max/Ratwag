import { useState } from 'react';
import { FileText, ArrowUp, CheckCircle, Clock, AlertCircle, BookOpen } from 'lucide-react';
import type { ComplianceDocument } from '../../lib/database.types';
import {
  updateDocumentStatus,
  updateDocumentVersion,
  getStatusBadgeClasses,
  type DocumentStatus,
} from '../../compliance/GrantReportingEngine';

interface Props {
  documents: ComplianceDocument[];
  onRefresh: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  technical_narrative: 'Technical Narrative',
  budget_justification: 'Budget Justification',
  data_management_plan: 'Data Management Plan',
  security_assessment: 'Security Assessment',
  biosketch: 'PI Biosketch',
  facilities_statement: 'Facilities Statement',
  abstract: 'Project Abstract',
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'submitted':
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case 'review':
      return <Clock className="w-4 h-4 text-sky-400" />;
    case 'draft':
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
    default:
      return <FileText className="w-4 h-4 text-slate-400" />;
  }
}

const STATUS_FLOW: DocumentStatus[] = ['draft', 'review', 'approved', 'submitted'];

function getNextStatus(current: string): DocumentStatus | null {
  const idx = STATUS_FLOW.indexOf(current as DocumentStatus);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function DocumentCard({ doc, onRefresh }: { doc: ComplianceDocument; onRefresh: () => void }) {
  const [updating, setUpdating] = useState(false);

  const nextStatus = getNextStatus(doc.status);
  const typeLabel = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      await updateDocumentStatus(doc.id, nextStatus);
      onRefresh();
    } finally {
      setUpdating(false);
    }
  };

  const handleBumpVersion = async () => {
    setUpdating(true);
    try {
      await updateDocumentVersion(doc.id, doc.version + 1);
      onRefresh();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className={`bg-slate-800/20 border rounded-xl p-5 transition-all duration-200 ${
        doc.status === 'submitted' || doc.status === 'approved'
          ? 'border-emerald-800/30'
          : doc.status === 'review'
          ? 'border-sky-800/30'
          : 'border-slate-700/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 shrink-0">
          <BookOpen className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-200 truncate">{doc.title}</h4>
            <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40 font-mono shrink-0">
              v{doc.version}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{typeLabel}</p>
          {doc.notes && <p className="text-xs text-slate-400 mt-2 leading-relaxed">{doc.notes}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusIcon status={doc.status} />
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusBadgeClasses(doc.status)}`}>
            {doc.status}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  STATUS_FLOW.indexOf(doc.status as DocumentStatus) >= i
                    ? 'bg-emerald-400'
                    : 'bg-slate-600'
                }`}
              />
              {i < STATUS_FLOW.length - 1 && (
                <div
                  className={`w-6 h-px transition-all ${
                    STATUS_FLOW.indexOf(doc.status as DocumentStatus) > i
                      ? 'bg-emerald-600'
                      : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
          <span className="text-[10px] text-slate-600 ml-1">
            {STATUS_FLOW.map(s => s).join(' > ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {doc.status === 'draft' && (
            <button
              onClick={handleBumpVersion}
              disabled={updating}
              className="text-[11px] text-slate-400 hover:text-slate-200 px-3 py-1 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all disabled:opacity-50"
            >
              New Version
            </button>
          )}
          {nextStatus && (
            <button
              onClick={handleAdvance}
              disabled={updating}
              className="flex items-center gap-1.5 text-[11px] font-medium text-sky-400 hover:text-sky-300 bg-sky-900/20 hover:bg-sky-900/30 border border-sky-800/40 hover:border-sky-700/50 px-3 py-1 rounded-lg transition-all disabled:opacity-50"
            >
              <ArrowUp className="w-3 h-3" />
              Advance to {nextStatus}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentArchive({ documents, onRefresh }: Props) {
  const statusGroups = {
    draft: documents.filter(d => d.status === 'draft'),
    review: documents.filter(d => d.status === 'review'),
    approved: documents.filter(d => d.status === 'approved'),
    submitted: documents.filter(d => d.status === 'submitted'),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusGroups).map(([status, docs]) => (
          <div key={status} className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{docs.length}</div>
            <div className={`text-xs font-medium mt-0.5 ${getStatusBadgeClasses(status).split(' ').find(c => c.startsWith('text-'))}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Document Registry</h3>
        {documents.map(doc => (
          <DocumentCard key={doc.id} doc={doc} onRefresh={onRefresh} />
        ))}
        {documents.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">No documents found.</div>
        )}
      </div>
    </div>
  );
}
