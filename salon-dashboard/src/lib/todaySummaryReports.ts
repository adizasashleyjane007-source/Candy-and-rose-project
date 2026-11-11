import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/client";

export type ReportCategory = "appointment" | "inventory" | "billing" | "nail_design";

interface SalonBrandingInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const DEFAULT_SALON_BRANDING: SalonBrandingInfo = {
  name: "CANDY & ROSE SALON",
  address: "Dasmariñas, Cavite, Philippines",
  phone: "+63 912 345 6789",
  email: "candyandroses@gmail.com",
};

// Theme Colors (RGB tuples)
const COLOR_PINK_PRIMARY: [number, number, number] = [217, 59, 120]; // #D93B78
const COLOR_PINK_ACCENT: [number, number, number] = [236, 72, 153]; // #EC4899
const COLOR_PINK_SOFT: [number, number, number] = [253, 242, 248]; // #FDF2F8
const COLOR_PINK_BORDER: [number, number, number] = [244, 182, 210]; // Soft rose border
const COLOR_TEXT_DARK: [number, number, number] = [24, 24, 27]; // #18181B
const COLOR_TEXT_MUTED: [number, number, number] = [100, 116, 139]; // #64748B
const COLOR_ROW_ALT: [number, number, number] = [253, 248, 251];

/**
 * Returns today's date formatted as YYYY-MM-DD in the Philippine timezone (Asia/Manila, UTC+8).
 */
export function getPhilippineTodayDateString(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Converts any ISO timestamp or Date object into a YYYY-MM-DD string in Asia/Manila timezone.
 */
export function toPhilippineDateString(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "";
  if (typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate.trim())) {
    return isoOrDate.trim();
  }
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) {
    if (typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(isoOrDate)) {
      return isoOrDate.substring(0, 10);
    }
    return "";
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formats a YYYY-MM-DD date into a human-friendly date string (e.g. "November 8, 2026").
 */
export function formatPhilippineDateDisplay(dateStr?: string): string {
  const targetDate = dateStr ? new Date(`${dateStr}T12:00:00+08:00`) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(targetDate);
}

/**
 * Formats a Date or ISO timestamp into a full Philippine date & time string.
 */
export function formatPhilippineDateTimeDisplay(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "N/A";
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return String(isoOrDate);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Formats an ISO string or plain time string ("14:30:00" / "02:30 PM") to a friendly time string.
 */
export function formatPhilippineTimeDisplay(timeOrIso: string | Date | null | undefined): string {
  if (!timeOrIso) return "N/A";
  if (typeof timeOrIso === "string") {
    const trimmed = timeOrIso.trim();
    // Plain time like "14:30" or "14:30:00"
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2];
      const period = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, "0")}:${mins} ${period}`;
    }
    // Already formatted like "02:30 PM"
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }
  const d = typeof timeOrIso === "string" ? new Date(timeOrIso) : timeOrIso;
  if (isNaN(d.getTime())) return String(timeOrIso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Formats numeric values to Philippine Peso display (e.g. "₱1,250.00").
 */
export function formatCurrency(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Draws text in jsPDF while properly rendering the Philippine Peso sign (₱)
 * using a vector double-bar over 'P' so standard Helvetica fonts never garble U+20B1.
 */
function drawTextWithPeso(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: { align?: "left" | "center" | "right" }
) {
  if (!text.includes("₱")) {
    doc.text(text, x, y, options);
    return;
  }

  const safeText = text.replace(/₱/g, "P");
  doc.text(safeText, x, y, options);

  const totalWidth = doc.getTextWidth(safeText);
  let startX = x;
  if (options?.align === "center") {
    startX = x - totalWidth / 2;
  } else if (options?.align === "right") {
    startX = x - totalWidth;
  }

  const fontSize = doc.getFontSize();
  const prevLineWidth = doc.getLineWidth();
  const textColor = doc.getTextColor();

  doc.setDrawColor(textColor);
  doc.setLineWidth(Math.max(0.22, fontSize * 0.025));

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "₱") {
      const prefix = safeText.substring(0, i);
      const prefixW = doc.getTextWidth(prefix);
      const pW = doc.getTextWidth("P");
      const px = startX + prefixW;

      const lineXStart = px - 0.15;
      const lineXEnd = px + pW * 0.92;
      const yOffset1 = fontSize * 0.16;
      const yOffset2 = fontSize * 0.23;

      doc.line(lineXStart, y - yOffset1, lineXEnd, y - yOffset1);
      doc.line(lineXStart, y - yOffset2, lineXEnd, y - yOffset2);
    }
  }

  doc.setLineWidth(prevLineWidth);
}

/**
 * AutoTable hooks to ensure any cell containing '₱' renders crisp vector Peso bars
 * instead of WinAnsiEncoding fallback characters.
 */
function applyPesoAutoTableHooks() {
  return {
    didParseCell(data: any) {
      if (data.cell && Array.isArray(data.cell.text)) {
        const pesoLines: number[] = [];
        data.cell.text = data.cell.text.map((line: string, idx: number) => {
          if (typeof line === "string" && line.includes("₱")) {
            pesoLines.push(idx);
            return line.replace(/₱/g, "P");
          }
          return line;
        });
        if (pesoLines.length > 0) {
          data.cell.__pesoLines = pesoLines;
        }
      }
    },
    didDrawCell(data: any) {
      const pesoLines: number[] | undefined = data.cell?.__pesoLines;
      if (!pesoLines || pesoLines.length === 0) return;

      const doc: jsPDF = data.doc;
      const fontSize = data.cell.styles.fontSize || 8.5;
      const fontStyle = data.cell.styles.fontStyle || "normal";
      const fontName = data.cell.styles.font || "helvetica";
      const textColor = data.cell.styles.textColor || [24, 24, 27];

      doc.setFont(fontName, fontStyle);
      doc.setFontSize(fontSize);
      if (Array.isArray(textColor)) {
        doc.setDrawColor(textColor[0], textColor[1], textColor[2]);
      } else {
        doc.setDrawColor(24, 24, 27);
      }

      const prevLineWidth = doc.getLineWidth();
      doc.setLineWidth(Math.max(0.2, fontSize * 0.024));

      const paddingLeft = data.cell.padding("left");
      const paddingRight = data.cell.padding("right");
      const paddingTop = data.cell.padding("top");
      const halign = data.cell.styles.halign || "left";
      const lines: string[] = data.cell.text || [];

      const lineHeightFactor = data.cell.styles.lineHeightFactor || 1.15;
      const lineHeightMm = (fontSize * 0.352778) * lineHeightFactor;
      const totalTextHeight = lines.length * lineHeightMm;
      const valign = data.cell.styles.valign || "top";

      let firstBaselineY = data.cell.y + paddingTop + fontSize * 0.32;
      if (valign === "middle") {
        firstBaselineY =
          data.cell.y + (data.cell.height - totalTextHeight) / 2 + fontSize * 0.31;
      }

      pesoLines.forEach((lineIdx) => {
        const line = lines[lineIdx];
        if (!line) return;
        const pIndex = line.indexOf("P");
        if (pIndex === -1) return;

        const lineW = doc.getTextWidth(line);
        let lineStartX = data.cell.x + paddingLeft;
        if (halign === "right") {
          lineStartX = data.cell.x + data.cell.width - paddingRight - lineW;
        } else if (halign === "center") {
          lineStartX = data.cell.x + (data.cell.width - lineW) / 2;
        }

        const prefixW = doc.getTextWidth(line.substring(0, pIndex));
        const pW = doc.getTextWidth("P");
        const px = lineStartX + prefixW;
        const baselineY = firstBaselineY + lineIdx * lineHeightMm;

        const yOffset1 = fontSize * 0.16;
        const yOffset2 = fontSize * 0.23;

        doc.line(px - 0.1, baselineY - yOffset1, px + pW * 0.9, baselineY - yOffset1);
        doc.line(px - 0.1, baselineY - yOffset2, px + pW * 0.9, baselineY - yOffset2);
      });

      doc.setLineWidth(prevLineWidth);
    },
  };
}

/**
 * Fetches salon branding info from database (`salon_settings` key `salon_info`),
 * falling back cleanly to Candy & Rose defaults.
 */
async function fetchSalonBranding(supabase: ReturnType<typeof createClient>): Promise<SalonBrandingInfo> {
  try {
    const { data } = await supabase
      .from("salon_settings")
      .select("*")
      .eq("key", "salon_info")
      .maybeSingle();

    if (data) {
      const val = data.value || {};
      return {
        name: (data.name || val.name || DEFAULT_SALON_BRANDING.name).toUpperCase(),
        address: data.address || val.address || DEFAULT_SALON_BRANDING.address,
        phone: data.phone || val.phone || DEFAULT_SALON_BRANDING.phone,
        email: data.email || val.email || DEFAULT_SALON_BRANDING.email,
      };
    }
  } catch {
    // Fallback to default branding
  }
  return DEFAULT_SALON_BRANDING;
}

/**
 * Draws the official Candy & Rose Salon header, report title, and metadata banner.
 * Returns the next vertical Y coordinate (in mm).
 */
function drawReportHeader(
  doc: jsPDF,
  branding: SalonBrandingInfo,
  reportTitle: string,
  reportSubtitle: string,
  todayDisplay: string,
  todayStr: string,
  generatedAtDisplay: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Top decorative pink bar
  doc.setFillColor(...COLOR_PINK_PRIMARY);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Soft blush header card
  doc.setFillColor(...COLOR_PINK_SOFT);
  doc.setDrawColor(...COLOR_PINK_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, 9, pageWidth - margin * 2, 34, 3, 3, "FD");

  // Left side: Salon Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_PINK_PRIMARY);
  doc.text(branding.name || "CANDY & ROSE SALON", margin + 5, 17.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text(`${branding.address}  |  Tel: ${branding.phone}  |  ${branding.email}`, margin + 5, 22.5);

  // Divider inside header card
  doc.setDrawColor(...COLOR_PINK_BORDER);
  doc.setLineWidth(0.25);
  doc.line(margin + 5, 25.5, pageWidth - margin - 5, 25.5);

  // Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(reportTitle, margin + 5, 32.5);

  // Report Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text(reportSubtitle, margin + 5, 37.8);

  // Right side: Official Badge & Report Date
  const badgeText = "OFFICIAL DAILY REPORT";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const badgeWidth = doc.getTextWidth(badgeText) + 6;
  doc.setFillColor(...COLOR_PINK_PRIMARY);
  doc.roundedRect(pageWidth - margin - badgeWidth - 5, 13, badgeWidth, 5.5, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, pageWidth - margin - 5 - badgeWidth / 2, 16.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...COLOR_TEXT_DARK);
  doc.text(`Report Date: ${todayDisplay} (${todayStr})`, pageWidth - margin - 5, 32, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text(`Timezone: Asia/Manila (UTC+8) • Snapshot: ${generatedAtDisplay}`, pageWidth - margin - 5, 37.5, {
    align: "right",
  });

  return 48;
}

/**
 * Draws a 4-column row of KPI Summary Cards.
 * Returns the next vertical Y coordinate (in mm).
 */
function drawSummaryCards(
  doc: jsPDF,
  startY: number,
  cards: Array<{ label: string; value: string; sublabel?: string; highlight?: boolean }>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 3.5;
  const count = cards.length;
  const cardWidth = (pageWidth - margin * 2 - gap * (count - 1)) / count;
  const cardHeight = 20;

  cards.forEach((card, idx) => {
    const x = margin + idx * (cardWidth + gap);
    if (card.highlight) {
      doc.setFillColor(253, 242, 248);
      doc.setDrawColor(...COLOR_PINK_PRIMARY);
      doc.setLineWidth(0.4);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...COLOR_PINK_BORDER);
      doc.setLineWidth(0.3);
    }
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2.2, 2.2, "FD");

    // Top label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text(card.label.toUpperCase(), x + 3.2, startY + 5.5);

    // Main value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    if (card.highlight) {
      doc.setTextColor(...COLOR_PINK_PRIMARY);
    } else {
      doc.setTextColor(...COLOR_TEXT_DARK);
    }
    drawTextWithPeso(doc, card.value, x + 3.2, startY + 12.8);

    // Sublabel
    if (card.sublabel) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(card.sublabel, x + 3.2, startY + 17.5);
    }
  });

  return startY + cardHeight + 6;
}

/**
 * Draws a section heading bar above a table.
 */
function drawSectionHeading(doc: jsPDF, y: number, title: string, rightNote?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  if (y > doc.internal.pageSize.getHeight() - 35) {
    doc.addPage();
    y = 18;
  }

  doc.setFillColor(...COLOR_PINK_SOFT);
  doc.setDrawColor(...COLOR_PINK_BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 7.5, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_PINK_PRIMARY);
  doc.text(title.toUpperCase(), margin + 3, y + 5.1);

  if (rightNote) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    drawTextWithPeso(doc, rightNote, pageWidth - margin - 3, y + 5.1, { align: "right" });
  }

  return y + 10;
}

/**
 * Adds consistent footers with generation timestamp and "Page X of Y" across all pages.
 */
function finalizePdfFootersAndSave(
  doc: jsPDF,
  reportTitle: string,
  generatedAtDisplay: string,
  filename: string
) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Top thin pink bar on continuation pages
    if (pageNum > 1) {
      doc.setFillColor(...COLOR_PINK_PRIMARY);
      doc.rect(0, 0, pageWidth, 2.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_PINK_PRIMARY);
      doc.text(`CANDY & ROSE SALON — ${reportTitle.toUpperCase()}`, margin, 8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLOR_TEXT_MUTED);
      doc.text(`Generated: ${generatedAtDisplay} (Asia/Manila)`, pageWidth - margin, 8.5, {
        align: "right",
      });
    }

    // Bottom footer line
    const footerLineY = pageHeight - 12;
    doc.setDrawColor(...COLOR_PINK_BORDER);
    doc.setLineWidth(0.25);
    doc.line(margin, footerLineY, pageWidth - margin, footerLineY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text(
      `CANDY & ROSE SALON • Official Business Record • Generated on ${generatedAtDisplay} (Asia/Manila)`,
      margin,
      pageHeight - 7.5
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_PINK_PRIMARY);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7.5, {
      align: "right",
    });
  }

  doc.save(filename);
}

/**
 * Helper to load an image URL or Data URI into a base64 PNG/JPEG string for PDF embedding.
 * Resolves to null if the image cannot be loaded within timeout.
 */
async function loadImageAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(null), 3500);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement("canvas");
          const maxDim = 140;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          canvas.width = Math.max(1, Math.round((img.width || 80) * scale));
          canvas.height = Math.max(1, Math.round((img.height || 80) * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(null);
      };
      img.src = trimmed;
    } catch {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// A. TODAY'S APPOINTMENT REPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function generateTodayAppointmentReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const now = new Date();
  const todayStr = getPhilippineTodayDateString(now);
  const todayDisplay = formatPhilippineDateDisplay(todayStr);
  const generatedAtDisplay = formatPhilippineDateTimeDisplay(now);

  const [branding, { data: allAppointments, error }] = await Promise.all([
    fetchSalonBranding(supabase),
    supabase
      .from("appointments")
      .select(`
        id,
        customer_name,
        service_name,
        staff_name,
        appointment_date,
        appointment_time,
        date,
        time,
        duration,
        price,
        source,
        status,
        payment_method,
        payment_status,
        notes,
        cancellation_reason,
        created_at,
        customers(name, phone, email),
        services(name, price, duration, category),
        staff(name, role)
      `)
      .order("appointment_time", { ascending: true }),
  ]);

  if (error) {
    throw new Error(`Failed to fetch appointment records: ${error.message}`);
  }

  const rawAppointments = (allAppointments as any[]) || [];

  // Filter appointments scheduled for today (Asia/Manila)
  const todayApts = rawAppointments.filter((apt: any) => {
    const aptDate = apt.appointment_date || apt.date;
    if (aptDate && toPhilippineDateString(aptDate) === todayStr) return true;
    return false;
  });

  const totalAppointments = todayApts.length;
  const completedAppointments = todayApts.filter(
    (a: any) => (a.status || "").toLowerCase() === "completed"
  ).length;
  const pendingAppointments = todayApts.filter((a: any) => {
    const s = (a.status || "").toLowerCase();
    return s === "scheduled" || s === "pending" || s === "in progress" || s === "confirmed";
  }).length;
  const cancelledAppointments = todayApts.filter(
    (a: any) => (a.status || "").toLowerCase() === "cancelled"
  ).length;
  const noShowAppointments = todayApts.filter((a: any) => {
    const s = (a.status || "").toLowerCase();
    return s === "no-show" || s === "no_show" || s === "noshow";
  }).length;

  const totalScheduledValue = todayApts
    .filter((a: any) => {
      const s = (a.status || "").toLowerCase();
      return s !== "cancelled" && s !== "no-show" && s !== "no_show";
    })
    .reduce((sum: number, a: any) => sum + (Number(a.price ?? a.services?.price) || 0), 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const reportTitle = "Today's Appointment Report";

  let currentY = drawReportHeader(
    doc,
    branding,
    reportTitle,
    "Daily schedule of customer appointments, assigned stylists/technicians, booked services, and real-time statuses.",
    todayDisplay,
    todayStr,
    generatedAtDisplay
  );

  currentY = drawSummaryCards(doc, currentY, [
    {
      label: "Total Appointments",
      value: String(totalAppointments),
      sublabel: `Scheduled for ${todayStr}`,
      highlight: true,
    },
    {
      label: "Completed Appointments",
      value: String(completedAppointments),
      sublabel: "Fulfilled today",
    },
    {
      label: "Pending Appointments",
      value: String(pendingAppointments),
      sublabel: "Scheduled / In Progress",
    },
    {
      label: "Cancelled Appointments",
      value: String(cancelledAppointments),
      sublabel: noShowAppointments > 0 ? `Plus ${noShowAppointments} No-Show` : "Cancelled today",
    },
  ]);

  currentY = drawSectionHeading(
    doc,
    currentY,
    `Appointment Schedule & Status Details (${totalAppointments} Record${totalAppointments === 1 ? "" : "s"})`,
    `Active Scheduled Value: ${formatCurrency(totalScheduledValue)}`
  );

  const pesoHooks = applyPesoAutoTableHooks();

  const tableBody =
    todayApts.length === 0
      ? [
          [
            {
              content: `No appointments are scheduled for today (${todayDisplay}).`,
              colSpan: 8,
              styles: { halign: "center" as const, fontStyle: "italic" as const, textColor: COLOR_TEXT_MUTED, cellPadding: 6 },
            },
          ],
        ]
      : todayApts.map((apt: any, idx: number) => {
          const refCode = apt.id ? `#${String(apt.id).replace(/-/g, "").slice(0, 6).toUpperCase()}` : `#${idx + 1}`;
          const customerName = apt.customer_name || apt.customers?.name || "Walk-in Customer";
          const customerPhone = apt.phone || apt.customers?.phone || "";
          const customerCell = customerPhone ? `${customerName}\n${customerPhone}` : customerName;

          const aptDate = apt.appointment_date || apt.date || todayStr;
          const aptTime = formatPhilippineTimeDisplay(apt.appointment_time || apt.time);
          const dateTimeCell = `${aptDate}\n${aptTime}`;

          const serviceName = apt.service_name || apt.services?.name || "Salon Service";
          const duration = apt.duration || apt.services?.duration || "";
          const serviceCell = duration ? `${serviceName}\n(${duration})` : serviceName;

          const staffName = apt.staff_name || apt.staff?.name || "Unassigned";
          const priceVal = Number(apt.price ?? apt.services?.price) || 0;
          const priceCell = formatCurrency(priceVal);
          const status = apt.status || "Scheduled";

          const extraParts: string[] = [];
          if (apt.source) extraParts.push(`Source: ${apt.source}`);
          if (apt.payment_status) extraParts.push(`Payment: ${apt.payment_status}`);
          if (apt.cancellation_reason) extraParts.push(`Reason: ${apt.cancellation_reason}`);
          else if (apt.notes) extraParts.push(`Note: ${String(apt.notes).slice(0, 60)}`);

          return [
            refCode,
            customerCell,
            dateTimeCell,
            serviceCell,
            staffName,
            priceCell,
            status,
            extraParts.join("\n") || "-",
          ];
        });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    head: [
      [
        "Ref #",
        "Customer Name",
        "Date & Time",
        "Booked Service",
        "Assigned Staff",
        "Amount",
        "Status",
        "Booking Details",
      ],
    ],
    body: tableBody as any,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: 2.4,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_PINK_BORDER,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLOR_PINK_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: COLOR_ROW_ALT,
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold" },
      1: { cellWidth: 28 },
      2: { cellWidth: 23 },
      3: { cellWidth: 34 },
      4: { cellWidth: 22 },
      5: { cellWidth: 21, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      7: { cellWidth: 20 },
    },
    didParseCell(data) {
      pesoHooks.didParseCell(data);
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw || "").toLowerCase();
        if (val === "completed") {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (val === "cancelled" || val.includes("no-show") || val.includes("no_show")) {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
    didDrawCell(data) {
      pesoHooks.didDrawCell(data);
    },
  });

  const filename = `Candy-Rose-Appointment-Report-${todayStr}.pdf`;
  finalizePdfFootersAndSave(doc, reportTitle, generatedAtDisplay, filename);

  return { filename, count: totalAppointments };
}

// ─────────────────────────────────────────────────────────────────────────────
// B. TODAY'S INVENTORY REPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function generateTodayInventoryReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const now = new Date();
  const todayStr = getPhilippineTodayDateString(now);
  const todayDisplay = formatPhilippineDateDisplay(todayStr);
  const generatedAtDisplay = formatPhilippineDateTimeDisplay(now);

  const [branding, { data: inventoryData, error }, { data: notificationsData }] = await Promise.all([
    fetchSalonBranding(supabase),
    supabase.from("inventory").select("*").order("name", { ascending: true }),
    supabase
      .from("notifications")
      .select("id, title, message, type, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (error) {
    throw new Error(`Failed to fetch inventory records: ${error.message}`);
  }

  const items = (inventoryData as any[]) || [];
  const totalItems = items.length;

  const computeStockStatus = (item: any): "In Stock" | "Low Stock" | "Out of Stock" => {
    const qty = Number(item.quantity) || 0;
    const reorder = Number(item.reorder_level) || 10;
    const rawStatus = String(item.status || "").toLowerCase();
    if (qty <= 0 || rawStatus === "out of stock") return "Out of Stock";
    if (qty < reorder || rawStatus === "low stock") return "Low Stock";
    return "In Stock";
  };

  const totalAvailableUnits = items.reduce(
    (sum: number, item: any) => sum + Math.max(0, Number(item.quantity) || 0),
    0
  );

  const lowStockList = items.filter((item: any) => computeStockStatus(item) === "Low Stock");
  const outOfStockList = items.filter((item: any) => computeStockStatus(item) === "Out of Stock");
  const inStockList = items.filter((item: any) => computeStockStatus(item) === "In Stock");

  // Distinguish current inventory balances from stock movements / updates recorded TODAY (Asia/Manila)
  const itemsCreatedToday = items.filter(
    (item: any) => toPhilippineDateString(item.created_at) === todayStr
  );

  const todayInventoryLogs = ((notificationsData as any[]) || []).filter((n: any) => {
    if (toPhilippineDateString(n.created_at) !== todayStr) return false;
    const titleLower = String(n.title || "").toLowerCase();
    const msgLower = String(n.message || "").toLowerCase();
    return (
      titleLower.includes("product") ||
      titleLower.includes("inventory") ||
      titleLower.includes("stock") ||
      msgLower.includes("inventory")
    );
  });

  const todayMovements: Array<{
    time: string;
    action: string;
    itemOrDetail: string;
    categoryOrUnit: string;
  }> = [];

  todayInventoryLogs.forEach((log: any) => {
    todayMovements.push({
      time: formatPhilippineTimeDisplay(log.created_at),
      action: log.title || "Inventory Update",
      itemOrDetail: log.message || "Stock movement recorded today",
      categoryOrUnit: "System Activity Log",
    });
  });

  itemsCreatedToday.forEach((item: any) => {
    const alreadyLogged = todayMovements.some((m) =>
      m.itemOrDetail.toLowerCase().includes(String(item.name || "").toLowerCase())
    );
    if (!alreadyLogged) {
      todayMovements.push({
        time: formatPhilippineTimeDisplay(item.created_at),
        action: "New Inventory Item Added Today",
        itemOrDetail: `${item.name || "Unnamed Item"} (Qty: ${Number(item.quantity) || 0} ${item.unit || "units"})`,
        categoryOrUnit: item.category || "General",
      });
    }
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const reportTitle = "Today's Inventory Report";
  const pesoHooks = applyPesoAutoTableHooks();

  let currentY = drawReportHeader(
    doc,
    branding,
    reportTitle,
    "Current stock balance snapshot, low/out-of-stock alerts, and inventory movements recorded today.",
    todayDisplay,
    todayStr,
    generatedAtDisplay
  );

  currentY = drawSummaryCards(doc, currentY, [
    {
      label: "Total Catalog Products",
      value: `${totalItems} Items`,
      sublabel: `${inStockList.length} adequately stocked`,
      highlight: true,
    },
    {
      label: "Total Available Stock",
      value: `${totalAvailableUnits.toLocaleString()} Units`,
      sublabel: "Current balance across items",
    },
    {
      label: "Low-Stock Items",
      value: String(lowStockList.length),
      sublabel: "Below reorder threshold",
    },
    {
      label: "Out-of-Stock Items",
      value: String(outOfStockList.length),
      sublabel: `${todayMovements.length} update(s) recorded today`,
    },
  ]);

  // Section 1: Current Inventory Balances (Clearly distinguished from Today's Movements)
  currentY = drawSectionHeading(
    doc,
    currentY,
    `1. Current Inventory Balances Snapshot (${totalItems} Products)`,
    "Reflects total standing stock balances as of report generation"
  );

  const inventoryTableBody =
    items.length === 0
      ? [
          [
            {
              content: "No inventory items found in the database.",
              colSpan: 8,
              styles: { halign: "center" as const, fontStyle: "italic" as const, textColor: COLOR_TEXT_MUTED, cellPadding: 6 },
            },
          ],
        ]
      : items.map((item: any, idx: number) => {
          const qty = Number(item.quantity) || 0;
          const avail = Math.max(0, qty);
          const unit = item.unit || "pcs";
          const reorder = Number(item.reorder_level) || 10;
          const status = computeStockStatus(item);
          const addedDate = item.created_at ? toPhilippineDateString(item.created_at) : "N/A";
          const isAddedToday = addedDate === todayStr;

          return [
            String(idx + 1),
            item.name || "Unnamed Product",
            item.category || "General",
            unit,
            String(reorder),
            `${qty} ${unit}`,
            `${avail} ${unit}`,
            isAddedToday ? `${status}\n(Added Today)` : status,
          ];
        });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    head: [
      [
        "#",
        "Product / Item Name",
        "Product Category",
        "Unit",
        "Reorder Lvl",
        "Current Stock",
        "Available Stock",
        "Availability Status",
      ],
    ],
    body: inventoryTableBody as any,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: 2.3,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_PINK_BORDER,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLOR_PINK_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLOR_ROW_ALT,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 42, fontStyle: "bold" },
      2: { cellWidth: 32 },
      3: { cellWidth: 16, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 21, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 21, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 22, halign: "center", fontStyle: "bold" },
    },
    didParseCell(data) {
      pesoHooks.didParseCell(data);
      if (data.section === "body" && data.column.index === 7) {
        const val = String(data.cell.raw || "").toLowerCase();
        if (val.includes("out of stock")) {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (val.includes("low stock")) {
          data.cell.styles.textColor = [217, 119, 6];
        } else {
          data.cell.styles.textColor = [5, 150, 105];
        }
      }
    },
    didDrawCell(data) {
      pesoHooks.didDrawCell(data);
    },
  });

  let nextY = (doc as any).lastAutoTable.finalY + 7;

  // Section 2: Low-Stock & Out-of-Stock Items Requiring Attention
  const attentionItems = [...outOfStockList, ...lowStockList];
  nextY = drawSectionHeading(
    doc,
    nextY,
    `2. Low-Stock & Out-of-Stock Items (${attentionItems.length} Item${attentionItems.length === 1 ? "" : "s"})`,
    `Low Stock: ${lowStockList.length}  |  Out of Stock: ${outOfStockList.length}`
  );

  const attentionBody =
    attentionItems.length === 0
      ? [
          [
            {
              content: "All inventory items are currently above their minimum reorder levels.",
              colSpan: 5,
              styles: { halign: "center" as const, fontStyle: "italic" as const, textColor: COLOR_TEXT_MUTED, cellPadding: 4.5 },
            },
          ],
        ]
      : attentionItems.map((item: any) => {
          const qty = Number(item.quantity) || 0;
          const reorder = Number(item.reorder_level) || 10;
          const unit = item.unit || "pcs";
          const status = computeStockStatus(item);
          return [
            item.name || "Unnamed Product",
            item.category || "General",
            `${qty} ${unit}`,
            `${reorder} ${unit}`,
            status,
          ];
        });

  autoTable(doc, {
    startY: nextY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    head: [["Product / Item Name", "Category", "Current Stock", "Reorder Threshold", "Alert Status"]],
    body: attentionBody as any,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: 2.2,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_PINK_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [190, 24, 93],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.8,
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 4) {
        const val = String(data.cell.raw || "").toLowerCase();
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = val.includes("out") ? [220, 38, 38] : [217, 119, 6];
      }
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 7;

  // Section 3: Stock Movements / Inventory Updates Recorded Today
  nextY = drawSectionHeading(
    doc,
    nextY,
    `3. Stock Movements & Inventory Updates Recorded Today (${todayDisplay})`,
    `${todayMovements.length} Transaction(s) Today`
  );

  const movementsBody =
    todayMovements.length === 0
      ? [
          [
            {
              content: `No stock movements, restocks, or inventory edits were recorded today (${todayDisplay}). All quantities in Section 1 represent existing standing stock balances.`,
              colSpan: 4,
              styles: { halign: "center" as const, fontStyle: "italic" as const, textColor: COLOR_TEXT_MUTED, cellPadding: 5 },
            },
          ],
        ]
      : todayMovements.map((m) => [m.time, m.action, m.itemOrDetail, m.categoryOrUnit]);

  autoTable(doc, {
    startY: nextY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    head: [["Time (Asia/Manila)", "Movement / Action Type", "Product & Movement Details", "Source / Category"]],
    body: movementsBody as any,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: 2.3,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_PINK_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_PINK_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.8,
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      1: { cellWidth: 44, fontStyle: "bold" },
      2: { cellWidth: 76 },
      3: { cellWidth: 34 },
    },
  });

  const filename = `Candy-Rose-Inventory-Report-${todayStr}.pdf`;
  finalizePdfFootersAndSave(doc, reportTitle, generatedAtDisplay, filename);

  return { filename, count: totalItems };
}

// ─────────────────────────────────────────────────────────────────────────────
// C. TODAY'S BILLING REPORT
// ─────────────────────────────────────────────────────────────────────────────

interface UnifiedBillingTransaction {
  refId: string;
  appointmentRef: string;
  customerName: string;
  serviceName: string;
  paymentMethod: string;
  paymentDateDisplay: string;
  status: "Paid" | "Pending" | "Refunded";
  amount: number;
  cashReceived: number;
}

export async function generateTodayBillingReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const now = new Date();
  const todayStr = getPhilippineTodayDateString(now);
  const todayDisplay = formatPhilippineDateDisplay(todayStr);
  const generatedAtDisplay = formatPhilippineDateTimeDisplay(now);

  const [branding, { data: allBilling, error: billingErr }, { data: allAppointments, error: aptErr }] =
    await Promise.all([
      fetchSalonBranding(supabase),
      supabase
        .from("billing")
        .select(`
          id,
          amount,
          cash_received,
          payment_method,
          status,
          notes,
          created_at,
          customer_id,
          appointment_id,
          customers(name),
          appointments(id, customer_name, service_name, price, appointment_date, appointment_time, status, payment_method, payment_status)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("appointments")
        .select(`
          id,
          customer_name,
          service_name,
          price,
          appointment_date,
          appointment_time,
          date,
          time,
          status,
          payment_method,
          payment_status,
          created_at,
          customers(name),
          services(name, price)
        `)
        .order("appointment_time", { ascending: true }),
    ]);

  if (billingErr) {
    throw new Error(`Failed to fetch billing records: ${billingErr.message}`);
  }
  if (aptErr) {
    throw new Error(`Failed to fetch appointment billing records: ${aptErr.message}`);
  }

  const rawBilling = (allBilling as any[]) || [];
  const rawAppointments = (allAppointments as any[]) || [];

  const transactions: UnifiedBillingTransaction[] = [];
  const seenAppointmentIds = new Set<string>();

  // 1. Billing records created today (deduplicated per appointment_id to avoid webhook duplicate rows)
  rawBilling.forEach((b: any) => {
    if (toPhilippineDateString(b.created_at) !== todayStr) return;

    const aptId = b.appointment_id ? String(b.appointment_id) : "";
    if (aptId) {
      if (seenAppointmentIds.has(aptId)) return;
      seenAppointmentIds.add(aptId);
    }

    const rawStatus = String(b.status || "Paid").toLowerCase();
    const normalizedStatus: "Paid" | "Pending" | "Refunded" =
      rawStatus === "refunded"
        ? "Refunded"
        : rawStatus === "paid" || rawStatus === "completed" || rawStatus === "success"
        ? "Paid"
        : "Pending";

    const amountVal = Number(b.amount ?? b.appointments?.price) || 0;
    const cashVal = Number(b.cash_received) || (normalizedStatus === "Paid" ? amountVal : 0);

    transactions.push({
      refId: b.id ? `#BILL-${String(b.id).replace(/-/g, "").slice(0, 6).toUpperCase()}` : "#BILL",
      appointmentRef: aptId
        ? `APT-${aptId.replace(/-/g, "").slice(0, 6).toUpperCase()}`
        : "Walk-in / Direct",
      customerName:
        b.customers?.name || b.appointments?.customer_name || "Walk-in Customer",
      serviceName: b.appointments?.service_name || b.notes || "Salon Service",
      paymentMethod: b.payment_method || b.appointments?.payment_method || "Cash",
      paymentDateDisplay: `${todayStr} ${formatPhilippineTimeDisplay(b.created_at)}`,
      status: normalizedStatus,
      amount: amountVal,
      cashReceived: cashVal,
    });
  });

  // 2. Today's appointments not already represented in today's billing rows
  //    (includes Completed/Paid appointments and Pending/Scheduled appointments for today)
  rawAppointments.forEach((apt: any) => {
    const aptId = String(apt.id || "");
    if (!aptId || seenAppointmentIds.has(aptId)) return;

    const aptDate = toPhilippineDateString(apt.appointment_date || apt.date);
    if (aptDate !== todayStr) return;

    const aptStatus = String(apt.status || "").toLowerCase();
    const payStatus = String(apt.payment_status || "").toLowerCase();

    // Skip cancelled or no-show appointments from billing transactions
    if (
      aptStatus === "cancelled" ||
      aptStatus === "no-show" ||
      aptStatus === "no_show" ||
      payStatus === "cancelled"
    ) {
      return;
    }

    seenAppointmentIds.add(aptId);
    const isPaid = aptStatus === "completed" || payStatus === "paid";
    const amountVal = Number(apt.price ?? apt.services?.price) || 0;

    transactions.push({
      refId: `#APT-${aptId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      appointmentRef: `APT-${aptId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      customerName: apt.customer_name || apt.customers?.name || "Walk-in Customer",
      serviceName: apt.service_name || apt.services?.name || "Salon Service",
      paymentMethod: apt.payment_method || (isPaid ? "Cash" : "Pending"),
      paymentDateDisplay: `${aptDate} ${formatPhilippineTimeDisplay(apt.appointment_time || apt.time)}`,
      status: isPaid ? "Paid" : "Pending",
      amount: amountVal,
      cashReceived: isPaid ? amountVal : 0,
    });
  });

  // Strict Financial Separation: ONLY Paid transactions count toward Collected Revenue
  const paidTransactions = transactions.filter((t) => t.status === "Paid");
  const pendingTransactions = transactions.filter((t) => t.status === "Pending");
  const refundedTransactions = transactions.filter((t) => t.status === "Refunded");

  const totalRevenueCollected = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
  const pendingPaymentsTotal = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
  const refundedTotal = refundedTransactions.reduce((sum, t) => sum + t.amount, 0);

  const cashRevenueCollected = paidTransactions
    .filter((t) => t.paymentMethod.toLowerCase().includes("cash"))
    .reduce((sum, t) => sum + t.amount, 0);
  const digitalRevenueCollected = totalRevenueCollected - cashRevenueCollected;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const reportTitle = "Today's Billing Report";
  const pesoHooks = applyPesoAutoTableHooks();

  let currentY = drawReportHeader(
    doc,
    branding,
    reportTitle,
    "Daily financial summary of collected revenue, payment transactions, and pending uncollected balances.",
    todayDisplay,
    todayStr,
    generatedAtDisplay
  );

  currentY = drawSummaryCards(doc, currentY, [
    {
      label: "Total Revenue Collected",
      value: formatCurrency(totalRevenueCollected),
      sublabel: "Paid transactions only",
      highlight: true,
    },
    {
      label: "Total Payments Received",
      value: `${paidTransactions.length} Paid`,
      sublabel: `Cash: ${formatCurrency(cashRevenueCollected)}`,
    },
    {
      label: "Pending Payments",
      value: `${pendingTransactions.length} (${formatCurrency(pendingPaymentsTotal)})`,
      sublabel: "Excluded from revenue",
    },
    {
      label: "Digital / GCash Collected",
      value: formatCurrency(digitalRevenueCollected),
      sublabel: refundedTransactions.length > 0 ? `Refunded: ${formatCurrency(refundedTotal)}` : "Verified non-cash",
    },
  ]);

  currentY = drawSectionHeading(
    doc,
    currentY,
    `1. Payment Transaction Details (${transactions.length} Record${transactions.length === 1 ? "" : "s"} Today)`,
    `Collected Revenue: ${formatCurrency(totalRevenueCollected)}`
  );

  const billingTableBody =
    transactions.length === 0
      ? [
          [
            {
              content: `No billing or payment transactions recorded for today (${todayDisplay}).`,
              colSpan: 7,
              styles: { halign: "center" as const, fontStyle: "italic" as const, textColor: COLOR_TEXT_MUTED, cellPadding: 6 },
            },
          ],
        ]
      : transactions.map((t) => [
          t.refId,
          t.customerName,
          `${t.appointmentRef}\n${t.serviceName}`,
          t.paymentMethod,
          t.paymentDateDisplay,
          t.status,
          formatCurrency(t.amount),
        ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    head: [
      [
        "Txn Ref",
        "Customer Name",
        "Booking Ref & Service",
        "Payment Method",
        "Payment Date",
        "Payment Status",
        "Amount",
      ],
    ],
    body: billingTableBody as any,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.8,
      cellPadding: 2.4,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_PINK_BORDER,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLOR_PINK_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLOR_ROW_ALT,
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold" },
      1: { cellWidth: 32 },
      2: { cellWidth: 44 },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 26 },
      5: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 18, halign: "right", fontStyle: "bold" },
    },
    didParseCell(data) {
      pesoHooks.didParseCell(data);
      if (data.section === "body" && data.column.index === 5) {
        const val = String(data.cell.raw || "").toLowerCase();
        if (val === "paid") {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (val === "refunded") {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
    didDrawCell(data) {
      pesoHooks.didDrawCell(data);
    },
  });

  let summaryY = (doc as any).lastAutoTable.finalY + 7;
  summaryY = drawSectionHeading(
    doc,
    summaryY,
    "2. Billing Subtotals & Official Revenue Reconciliation",
    "Only Paid transactions are counted in Total Collected Revenue"
  );

  autoTable(doc, {
    startY: summaryY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    head: [["Financial Breakdown Category", "Transaction Count", "Inclusion in Revenue", "Subtotal / Total"]],
    body: [
      [
        "Cash Payments Collected Today",
        String(paidTransactions.filter((t) => t.paymentMethod.toLowerCase().includes("cash")).length),
        "Included in Collected Revenue",
        formatCurrency(cashRevenueCollected),
      ],
      [
        "GCash / Digital / Card Payments Collected Today",
        String(paidTransactions.filter((t) => !t.paymentMethod.toLowerCase().includes("cash")).length),
        "Included in Collected Revenue",
        formatCurrency(digitalRevenueCollected),
      ],
      [
        "Pending / Unpaid Bookings Today",
        String(pendingTransactions.length),
        "Excluded (Uncollected)",
        formatCurrency(pendingPaymentsTotal),
      ],
      [
        "Refunded Transactions Today",
        String(refundedTransactions.length),
        "Excluded (Refunded)",
        formatCurrency(refundedTotal),
      ],
      [
        "TOTAL REVENUE COLLECTED TODAY (ACTUAL PAID REVENUE)",
        `${paidTransactions.length} Paid Transaction(s)`,
        "Official Net Collected Revenue",
        formatCurrency(totalRevenueCollected),
      ],
    ],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.2,
      cellPadding: 2.6,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_PINK_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_PINK_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.2,
    },
    columnStyles: {
      0: { cellWidth: 78, fontStyle: "bold" },
      1: { cellWidth: 34, halign: "center" },
      2: { cellWidth: 42 },
      3: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    didParseCell(data) {
      pesoHooks.didParseCell(data);
      if (data.section === "body" && data.row.index === 4) {
        data.cell.styles.fillColor = COLOR_PINK_SOFT;
        data.cell.styles.textColor = COLOR_PINK_PRIMARY;
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell(data) {
      pesoHooks.didDrawCell(data);
    },
  });

  const filename = `Candy-Rose-Billing-Report-${todayStr}.pdf`;
  finalizePdfFootersAndSave(doc, reportTitle, generatedAtDisplay, filename);

  return { filename, count: transactions.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// D. TODAY'S NAIL DESIGN BOOKED REPORT
// ─────────────────────────────────────────────────────────────────────────────

export async function generateTodayNailDesignBookedReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const now = new Date();
  const todayStr = getPhilippineTodayDateString(now);
  const todayDisplay = formatPhilippineDateDisplay(todayStr);
  const generatedAtDisplay = formatPhilippineDateTimeDisplay(now);

  const [branding, { data: allAppointments, error }, { data: nailCatalog }] = await Promise.all([
    fetchSalonBranding(supabase),
    supabase
      .from("appointments")
      .select(`
        id,
        customer_name,
        service_name,
        staff_name,
        design_id,
        design_name,
        design_image,
        price,
        appointment_date,
        appointment_time,
        date,
        time,
        status,
        payment_status,
        payment_method,
        source,
        notes,
        created_at,
        customers(name, phone),
        services(name, category),
        staff(name)
      `)
      .order("created_at", { ascending: false }),
    supabase.from("nail_designs").select("id, name, image_url, preview_url, category, shape"),
  ]);

  if (error) {
    throw new Error(`Failed to fetch nail design booking records: ${error.message}`);
  }

  const rawAppointments = (allAppointments as any[]) || [];
  const designsList = (nailCatalog as any[]) || [];

  // Filter nail design bookings created today in Asia/Manila timezone
  const todayNailBookings = rawAppointments.filter((apt: any) => {
    const createdDate = toPhilippineDateString(apt.created_at);
    if (createdDate !== todayStr) return false;

    const hasDesignName = Boolean(apt.design_name && String(apt.design_name).trim().length > 0);
    const hasDesignId = Boolean(apt.design_id && String(apt.design_id).trim().length > 0);
    const hasDesignImage = Boolean(apt.design_image && String(apt.design_image).trim().length > 0);
    const serviceName = String(apt.service_name || apt.services?.name || "").toLowerCase();
    const serviceCategory = String(apt.services?.category || "").toLowerCase();
    const isNailService =
      serviceName.includes("nail") ||
      serviceName.includes("manicure") ||
      serviceName.includes("pedicure") ||
      serviceName.includes("gel") ||
      serviceName.includes("acrylic") ||
      serviceCategory.includes("nail");
    const notesMatch = Boolean(apt.notes && String(apt.notes).toLowerCase().includes("nail"));

    return hasDesignName || hasDesignId || hasDesignImage || isNailService || notesMatch;
  });

  // Resolve reference image URLs and pre-load thumbnails for PDF embedding
  const resolvedBookings = await Promise.all(
    todayNailBookings.map(async (apt: any) => {
      let refImageUrl: string | null = apt.design_image || null;
      if (!refImageUrl && (apt.design_id || apt.design_name)) {
        const matched = designsList.find(
          (d: any) =>
            (apt.design_id && String(d.id) === String(apt.design_id)) ||
            (apt.design_name &&
              String(d.name || "").toLowerCase() === String(apt.design_name || "").toLowerCase())
        );
        if (matched) {
          refImageUrl = matched.image_url || matched.preview_url || null;
        }
      }
      const dataUrl = await loadImageAsDataUrl(refImageUrl);
      return {
        ...apt,
        resolvedImageUrl: refImageUrl,
        resolvedImageDataUrl: dataUrl,
      };
    })
  );

  const totalNailBookings = resolvedBookings.length;
  const completedCount = resolvedBookings.filter(
    (a) => String(a.status || "").toLowerCase() === "completed"
  ).length;
  const scheduledCount = resolvedBookings.filter((a) => {
    const s = String(a.status || "").toLowerCase();
    return s === "scheduled" || s === "pending" || s === "in progress";
  }).length;
  const withImageCount = resolvedBookings.filter((a) => Boolean(a.resolvedImageUrl)).length;

  const totalBookedValue = resolvedBookings
    .filter((a) => String(a.status || "").toLowerCase() !== "cancelled")
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const reportTitle = "Today's Nail Design Booked Report";
  const pesoHooks = applyPesoAutoTableHooks();

  let currentY = drawReportHeader(
    doc,
    branding,
    reportTitle,
    "Summary of nail art and manicure/pedicure design bookings created today, including reference images and schedules.",
    todayDisplay,
    todayStr,
    generatedAtDisplay
  );

  currentY = drawSummaryCards(doc, currentY, [
    {
      label: "Nail Bookings Today",
      value: String(totalNailBookings),
      sublabel: `Created on ${todayStr}`,
      highlight: true,
    },
    {
      label: "Scheduled / Active",
      value: String(scheduledCount),
      sublabel: `${completedCount} completed`,
    },
    {
      label: "With Reference Image",
      value: `${withImageCount} of ${totalNailBookings}`,
      sublabel: "Visual design attached",
    },
    {
      label: "Total Booked Value",
      value: formatCurrency(totalBookedValue),
      sublabel: "Active nail bookings",
    },
  ]);

  currentY = drawSectionHeading(
    doc,
    currentY,
    `Nail Design Bookings Created Today (${totalNailBookings} Record${totalNailBookings === 1 ? "" : "s"})`,
    `Report Date: ${todayDisplay}`
  );

  const nailTableBody =
    resolvedBookings.length === 0
      ? [
          [
            {
              content: `No nail design bookings were created today (${todayDisplay}).`,
              colSpan: 8,
              styles: { halign: "center" as const, fontStyle: "italic" as const, textColor: COLOR_TEXT_MUTED, cellPadding: 6 },
            },
          ],
        ]
      : resolvedBookings.map((apt: any, idx: number) => {
          const refCode = apt.id
            ? `#${String(apt.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`
            : `#${idx + 1}`;
          const customerName = apt.customer_name || apt.customers?.name || "Walk-in Customer";
          const phone = apt.customers?.phone || "";
          const customerCell = phone ? `${customerName}\n${phone}` : customerName;

          const designName = apt.design_name || apt.service_name || apt.services?.name || "Custom Nail Design";
          const serviceSub =
            apt.design_name && apt.service_name && apt.design_name !== apt.service_name
              ? `\n(${apt.service_name})`
              : "";

          const hasThumb = Boolean(apt.resolvedImageDataUrl);
          const imageLabel = hasThumb
            ? ""
            : apt.resolvedImageUrl
            ? "Image Linked"
            : "No Ref Image";

          const bookingCreated = `${toPhilippineDateString(apt.created_at)}\n${formatPhilippineTimeDisplay(
            apt.created_at
          )}`;
          const aptDate = apt.appointment_date || apt.date || "N/A";
          const aptTime = formatPhilippineTimeDisplay(apt.appointment_time || apt.time);
          const scheduleCell = `${aptDate}\n${aptTime}`;

          const staffName = apt.staff_name || apt.staff?.name || "Unassigned";
          const priceStr = formatCurrency(Number(apt.price) || 0);
          const detailsCell = `${staffName}\n${priceStr}`;
          const statusCell = `${apt.status || "Scheduled"}${
            apt.payment_status ? `\n(${apt.payment_status})` : ""
          }`;

          return [
            refCode,
            customerCell,
            `${designName}${serviceSub}`,
            imageLabel,
            bookingCreated,
            scheduleCell,
            detailsCell,
            statusCell,
          ];
        });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14, top: 14, bottom: 16 },
    head: [
      [
        "Ref #",
        "Customer Name",
        "Selected Nail Design",
        "Ref. Image",
        "Booking Created",
        "Appt. Date & Time",
        "Staff & Price",
        "Booking Status",
      ],
    ],
    body: nailTableBody as any,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.6,
      cellPadding: 2.3,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_PINK_BORDER,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLOR_PINK_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.8,
    },
    alternateRowStyles: {
      fillColor: COLOR_ROW_ALT,
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: "bold" },
      1: { cellWidth: 26 },
      2: { cellWidth: 34, fontStyle: "bold" },
      3: { cellWidth: 20, halign: "center", minCellHeight: 16 },
      4: { cellWidth: 23 },
      5: { cellWidth: 24 },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 18, halign: "center", fontStyle: "bold" },
    },
    didParseCell(data) {
      pesoHooks.didParseCell(data);
      if (data.section === "body" && resolvedBookings.length > 0) {
        const rowBooking = resolvedBookings[data.row.index];
        if (rowBooking?.resolvedImageDataUrl) {
          data.cell.styles.minCellHeight = 17;
        }
        if (data.column.index === 7) {
          const val = String(data.cell.raw || "").toLowerCase();
          if (val.includes("completed")) {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (val.includes("cancelled")) {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      }
    },
    didDrawCell(data) {
      pesoHooks.didDrawCell(data);
      if (data.section === "body" && data.column.index === 3 && resolvedBookings.length > 0) {
        const rowBooking = resolvedBookings[data.row.index];
        const imgData = rowBooking?.resolvedImageDataUrl;
        if (imgData) {
          try {
            const imgSize = 13;
            const imgX = data.cell.x + (data.cell.width - imgSize) / 2;
            const imgY = data.cell.y + (data.cell.height - imgSize) / 2;
            doc.addImage(imgData, "JPEG", imgX, imgY, imgSize, imgSize);
          } catch {
            // Ignore image draw failure and leave cell clean
          }
        }
      }
    },
  });

  const filename = `Candy-Rose-Nail-Design-Booked-Report-${todayStr}.pdf`;
  finalizePdfFootersAndSave(doc, reportTitle, generatedAtDisplay, filename);

  return { filename, count: totalNailBookings };
}
