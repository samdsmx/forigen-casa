"use client";

interface ExportButtonsProps {
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  pdfTargetId?: string;
}

export default function ExportButtons({ onExportExcel, onExportPdf, pdfTargetId }: ExportButtonsProps) {
  const exportPdf = async () => {
    if (onExportPdf) { onExportPdf(); return; }
    if (!pdfTargetId) return;
    const el = document.getElementById(pdfTargetId);
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("reporte.pdf");
  };

  return (
    <div className="flex gap-2">
      {(onExportPdf || pdfTargetId) && (
        <button type="button" onClick={exportPdf} className="btn btn-secondary btn-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </button>
      )}
      {onExportExcel && (
        <button type="button" onClick={onExportExcel} className="btn btn-secondary btn-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
      )}
    </div>
  );
}
