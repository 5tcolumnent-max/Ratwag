import { useState } from 'react';
import { Printer, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function PrintButton() {
  const [exporting, setExporting] = useState(false);

  async function exportPDF() {
    const el = document.getElementById('report-container');
    if (!el) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgH = pdfW / ratio;

      let posY = 0;
      let remaining = imgH;

      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, posY, pdfW, imgH);
        remaining -= pdfH;
        posY -= pdfH;
        if (remaining > 0) pdf.addPage();
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`DOE-Genesis-Report-${date}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => window.print()}
        title="Print report"
        className="p-1.5 md:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-all"
      >
        <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />
      </button>
      <button
        onClick={exportPDF}
        disabled={exporting}
        title="Export as PDF"
        className="p-1.5 md:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileDown className={`w-3.5 h-3.5 md:w-4 md:h-4 ${exporting ? 'animate-pulse' : ''}`} />
      </button>
    </div>
  );
}
