import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFExportPayload {
  distanceLoadedKm: number;
  distanceUnloadedKm: number;
  speedLoaded: number;
  speedUnloaded: number;
  loadingTime: number;
  unloadingTime: number;
  payloadTonnes: number;
  availabilityPercent: number;
  efficiencyPercent: number;
  utilizationPercent: number;

  cycleTimeSeconds: number;
  tonnesPerHour: number;
  tonnesPerTruckYear: number;
  effectiveFactor: number; // 0-1
  yearlyFleet: Array<{ year: number; tonnesPerYear: number; trucksRequired: number }>;

  scenarioName?: string;
  notes?: string;
  generatedDate: string; // ISO string
}

// Colour palette — neutral, professional, grayscale-safe
const C = {
  headerBg: "#1B2332",
  headerMeta: "#A0AAB4",
  sectionTitle: "#1B2332",
  tableHeadBg: "#F0F2F5",
  tableHeadText: "#1B2332",
  bodyText: "#2C3E50",
  rowAltBg: "#F7F8FA",
  accentBlue: "#2F6BFF",
  border: "#DFE2E7",
  footerText: "#8B949E",
  notesText: "#4A5568",
};

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const m = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}

export function generateFleetPdf(payload: PDFExportPayload): Blob {
  const landscape = payload.yearlyFleet.length > 7;
  const doc = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 50;
  const UW = W - M * 2;

  // Mutable cursor — shared by the section-heading helper below
  let y = 90;

  // ─── HEADER BAND ──────────────────────────────────────────────
  doc.setFillColor(C.headerBg);
  doc.rect(0, 0, W, 72, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Production & Fleet Sizing Summary", M, 28);

  let subtitleY = 44;
  if (payload.scenarioName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(C.headerMeta);
    doc.text(payload.scenarioName, M, subtitleY);
    subtitleY += 16;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.headerMeta);
  doc.text(
    `Generated: ${formatDate(payload.generatedDate)}`,
    W - M,
    subtitleY,
    { align: "right" }
  );

  // ─── HELPERS ──────────────────────────────────────────────────
  function sectionHeading(title: string) {
    doc.setTextColor(C.sectionTitle);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(title, M, y);
    y += 6;
    doc.setDrawColor(C.border);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 6;
  }

  // ─── SECTION 1: KEY INPUTS ────────────────────────────────────
  sectionHeading("KEY INPUTS");

  const paramCol = landscape ? 180 : 140;
  const inputRows: string[][] = [
    ["Distance Loaded", `${payload.distanceLoadedKm.toFixed(2)} km`],
    ["Distance Unloaded", `${payload.distanceUnloadedKm.toFixed(2)} km`],
    ["Speed Loaded", `${payload.speedLoaded.toFixed(0)} km/h`],
    ["Speed Unloaded", `${payload.speedUnloaded.toFixed(0)} km/h`],
    ["Loading Time", `${payload.loadingTime.toFixed(0)} sec`],
    ["Unloading Time", `${payload.unloadingTime.toFixed(0)} sec`],
    ["Payload Capacity", `${payload.payloadTonnes.toFixed(0)} tonnes`],
    ["Availability", `${payload.availabilityPercent.toFixed(0)}%`],
    ["Efficiency", `${payload.efficiencyPercent.toFixed(0)}%`],
    ["Utilization", `${payload.utilizationPercent.toFixed(0)}%`],
    ["Effective Factor", `${(payload.effectiveFactor * 100).toFixed(1)}%`],
  ];

  let finalY = y;
  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Value"]],
    body: inputRows,
    margin: { left: M, right: M },
    tableWidth: UW,
    columnStyles: {
      0: { cellWidth: paramCol },
      1: { cellWidth: UW - paramCol },
    },
    headStyles: {
      fillColor: hexToRgb(C.tableHeadBg),
      textColor: hexToRgb(C.tableHeadText),
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 5,
    },
    bodyStyles: {
      textColor: hexToRgb(C.bodyText),
      fontSize: 9,
      cellPadding: 5,
    },
    alternateRowStyles: { fillColor: hexToRgb(C.rowAltBg) },
    styles: {
      lineColor: hexToRgb(C.border),
      lineWidth: 0.5,
    },
    didDrawPage: (data) => {
      finalY = data.table.finalY ?? finalY;
    },
  });
  y = finalY + 16;

  // ─── SECTION 2: FLEET REQUIREMENTS ────────────────────────────
  if (y > H - 200) {
    doc.addPage();
    y = M;
  }

  sectionHeading("FLEET REQUIREMENTS");

  // 4 supporting metric boxes
  const boxH = 38;
  const boxGap = 3;
  const boxW = (UW - boxGap * 3) / 4;
  const metrics = [
    { label: "Cycle Time", value: `${payload.cycleTimeSeconds.toFixed(0)}s` },
    { label: "Tonnes / Hour", value: payload.tonnesPerHour.toFixed(1) },
    {
      label: "Annual Cap / Truck",
      value: `${(payload.tonnesPerTruckYear / 1000).toFixed(0)}k t`,
    },
    {
      label: "Effective Factor",
      value: `${Math.round(payload.effectiveFactor * 100)}%`,
    },
  ];

  metrics.forEach((m, i) => {
    const bx = M + i * (boxW + boxGap);
    doc.setDrawColor(C.border);
    doc.setFillColor("#FFFFFF");
    doc.setLineWidth(1);
    doc.roundedRect(bx, y, boxW, boxH, 3, 3, "FD");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.sectionTitle);
    doc.text(m.label, bx + boxW / 2, y + 12, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.bodyText);
    doc.text(m.value, bx + boxW / 2, y + 27, { align: "center" });
  });

  y += boxH + 10;

  // Transposed fleet table — years as columns
  const labelCol = landscape ? 120 : 100;
  const yearCol = (UW - labelCol) / payload.yearlyFleet.length;

  const colStyles: Record<
    string,
    { cellWidth: number; halign?: "center" | "left" | "right" }
  > = { 0: { cellWidth: labelCol } };
  payload.yearlyFleet.forEach((_, i) => {
    colStyles[i + 1] = { cellWidth: yearCol, halign: "center" };
  });

  finalY = y;
  autoTable(doc, {
    startY: y,
    head: [["", ...payload.yearlyFleet.map((f) => String(f.year))]],
    body: [
      [
        "Production (Mt)",
        ...payload.yearlyFleet.map((f) =>
          (f.tonnesPerYear / 1_000_000).toFixed(1)
        ),
      ],
      [
        "Trucks Required",
        ...payload.yearlyFleet.map((f) => String(f.trucksRequired)),
      ],
    ],
    margin: { left: M, right: M },
    tableWidth: UW,
    columnStyles: colStyles as Record<string, { cellWidth: number }>,
    headStyles: {
      fillColor: hexToRgb(C.tableHeadBg),
      textColor: hexToRgb(C.tableHeadText),
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 6,
      halign: "center",
    },
    bodyStyles: {
      textColor: hexToRgb(C.bodyText),
      fontSize: 9,
      cellPadding: 6,
    },
    alternateRowStyles: { fillColor: hexToRgb(C.rowAltBg) },
    styles: {
      lineColor: hexToRgb(C.border),
      lineWidth: 0.5,
    },
    didParseCell: (data) => {
      // Label column: left-aligned bold
      if (data.column.index === 0 && data.section === "body") {
        data.cell.styles.halign = "left";
        data.cell.styles.fontStyle = "bold";
      }
      // Trucks row (body row index 1): accent blue bold
      if (data.section === "body" && data.row.index === 1 && data.column.index > 0) {
        data.cell.styles.textColor = hexToRgb(C.accentBlue);
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 10;
      }
    },
    didDrawPage: (data) => {
      finalY = data.table.finalY ?? finalY;
    },
  });
  y = finalY + 16;

  // ─── SECTION 3: NOTES (conditional) ───────────────────────────
  if (payload.notes) {
    if (y > H - 100) {
      doc.addPage();
      y = M;
    }

    sectionHeading("NOTES");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.notesText);
    const lines = doc.splitTextToSize(payload.notes, UW);
    for (const line of lines) {
      if (y > H - 40) {
        doc.addPage();
        y = M;
      }
      doc.text(line, M, y);
      y += 12;
    }
  }

  // ─── FOOTERS (all pages, drawn last so page count is final) ───
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.footerText);
    doc.text("Fleet Sizing Calculator — Confidential", M, H - 20);
    doc.text(`Page ${p} of ${totalPages}`, W - M, H - 20, {
      align: "right",
    });
  }

  return doc.output("blob");
}
