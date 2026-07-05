import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction } from "./db";
import { fmtDate } from "./format";

interface LedgerPdfInput {
  businessName?: string;
  customerName: string;
  customerPhone?: string;
  balance: number;
  totalCredit: number;
  totalPaid: number;
  rows: (Transaction & { running: number })[];
}

export function buildLedgerPdf(input: LedgerPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(25, 118, 210);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(input.businessName || "Customer Ledger", 30, 28);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 30, 46);

  // Customer info
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(input.customerName, 30, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (input.customerPhone) doc.text(`Phone: ${input.customerPhone}`, 30, 106);

  // Summary boxes
  const y = 125;
  const boxW = (pageW - 60 - 20) / 3;
  const drawBox = (x: number, label: string, val: string, color: [number, number, number]) => {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, boxW, 50, 6, 6, "F");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(label, x + 10, y + 18);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(val, x + 10, y + 38);
    doc.setFont("helvetica", "normal");
  };
  const balColor: [number, number, number] = input.balance > 0 ? [46, 125, 50] : input.balance < 0 ? [198, 40, 40] : [80, 80, 80];
  const balLabel = input.balance === 0 ? "Settled" : input.balance > 0 ? "You will get" : "You will give";
  drawBox(30, balLabel, `Rs. ${Math.abs(input.balance).toLocaleString("en-IN")}`, balColor);
  drawBox(30 + boxW + 10, "Total Credit", `Rs. ${input.totalCredit.toLocaleString("en-IN")}`, [198, 40, 40]);
  drawBox(30 + (boxW + 10) * 2, "Total Paid", `Rs. ${input.totalPaid.toLocaleString("en-IN")}`, [46, 125, 50]);

  // Table
  autoTable(doc, {
    startY: y + 70,
    head: [["Date", "Details", "Method", "Credit", "Payment", "Balance"]],
    body: input.rows.map((t) => [
      fmtDate(t.date),
      t.description || (t.type === "credit" ? "Credit given" : "Payment received"),
      (t.paymentMethod || "cash").toUpperCase(),
      t.type === "credit" ? `Rs. ${t.amount.toLocaleString("en-IN")}` : "",
      t.type === "payment" ? `Rs. ${t.amount.toLocaleString("en-IN")}` : "",
      `Rs. ${Math.abs(t.running).toLocaleString("en-IN")} ${t.running > 0 ? "Dr" : t.running < 0 ? "Cr" : ""}`,
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      3: { textColor: [198, 40, 40], halign: "right" },
      4: { textColor: [46, 125, 50], halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 30, right: 30 },
  });

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} of ${pages}`, pageW - 60, doc.internal.pageSize.getHeight() - 20);
  }

  return doc;
}

export async function shareOrDownloadPdf(doc: jsPDF, filename: string, title: string): Promise<"shared" | "downloaded"> {
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  const nav: any = navigator;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: title });
      return "shared";
    } catch (e: any) {
      if (e?.name === "AbortError") return "shared";
      // fall through to download
    }
  }
  doc.save(filename);
  return "downloaded";
}
