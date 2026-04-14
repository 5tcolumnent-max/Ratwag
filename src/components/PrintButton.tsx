import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      title="Print report"
      className="p-1.5 md:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-all"
    >
      <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />
    </button>
  );
}
