export interface EvidencePrintPayload {
  title: string;
  timestamp: string;
  operator: string;
  body: string;
}

export function printEvidenceBundle(payload: EvidencePrintPayload): void {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${payload.title}</title>
        <style>
          body { font-family: monospace; padding: 2rem; color: #000; background: #fff; }
          h1 { font-size: 1.2rem; border-bottom: 2px solid #000; padding-bottom: 0.5rem; }
          .meta { font-size: 0.85rem; color: #444; margin-bottom: 1rem; }
          pre { font-size: 0.8rem; white-space: pre-wrap; word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>${payload.title}</h1>
        <div class="meta">
          <div>Timestamp: ${payload.timestamp}</div>
          <div>Operator: ${payload.operator}</div>
        </div>
        <pre>${payload.body}</pre>
      </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

export async function exportElementToPDF(
  elementId: string,
  filename: string
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) return;

  const { default: html2canvas } = await import('html2canvas');
  const { default: jsPDF } = await import('jspdf');

  const canvas = await html2canvas(el, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
  pdf.save(`${filename}.pdf`);
}
