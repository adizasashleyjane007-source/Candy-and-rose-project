import { jsPDF } from "jspdf";

export interface ReceiptPDFOptions {
  salonInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  invoiceNumber?: string;
  customerName?: string;
  staffName?: string;
  dateStr?: string;
  timeStr?: string;
  serviceName?: string;
  price?: number;
  paymentMethod?: string;
  cashReceived?: number;
  change?: number;
}

/**
 * Builds the authoritative Candy & Rose Sales Invoice PDF document.
 * Matches the layout and dimensions used in the Salon Dashboard.
 */
export function buildReceiptPDFDoc(options: ReceiptPDFOptions): jsPDF {
  const {
    salonInfo = {
      name: "Candy And Rose Salon",
      address: "Blk and Lot, Dasmarinas Cavite",
      phone: "032-123-4567",
      email: "candyandroses@gmail.com",
    },
    invoiceNumber = Math.random().toString(36).substring(2, 11).toUpperCase(),
    customerName = "Guest",
    staffName = "Staff",
    dateStr,
    timeStr,
    serviceName = "Salon Service",
    price = 0,
    paymentMethod = "Cash",
    cashReceived,
    change,
  } = options;

  const doc = new jsPDF({
    unit: "mm",
    format: [80, 160],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 8;
  let y = 15;

  const pink = [236, 72, 153]; // Pink-500

  // 1. Header
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text((salonInfo.name || "CANDY & ROSE").toUpperCase(), pageWidth / 2, y, {
    align: "center",
  });
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);

  // Address
  const addressText = salonInfo.address || "Cebu City, Philippines";
  const addressLines = doc.splitTextToSize(addressText, pageWidth - margin * 2.5);
  doc.text(addressLines, pageWidth / 2, y, { align: "center" });
  y += addressLines.length * 3.5;

  // Phone
  doc.text(salonInfo.phone || "+63 912 345 6789", pageWidth / 2, y, {
    align: "center",
  });
  y += 7;

  // Divider
  doc.setDrawColor(240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 2. Receipt Label & Invoice Number
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("SALES INVOICE", margin, y);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`#${invoiceNumber}`, pageWidth - margin, y, { align: "right" });
  y += 8;

  // 3. Customer Details
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("CUSTOMER:", margin, y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(customerName, margin + 18, y);
  y += 5;

  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("STAFF:", margin, y);
  doc.setTextColor(0);
  doc.text(staffName, margin + 18, y);
  y += 5;

  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.text("DATE:", margin, y);
  doc.setTextColor(0);
  const formattedDate =
    dateStr && timeStr
      ? `${dateStr} ${timeStr}`
      : dateStr ||
        `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
  doc.text(formattedDate, margin + 18, y);
  y += 8;

  // 4. Service Table header
  doc.setFillColor(255, 241, 242);
  doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(pink[0], pink[1], pink[2]);
  doc.text("DESCRIPTION", margin + 2, y);
  doc.text("PRICE", pageWidth - margin - 2, y, { align: "right" });
  y += 7;

  // Currency helper
  const drawCurrency = (
    text: string,
    x: number,
    currY: number,
    opt: { align?: "right" | "left" } = {}
  ) => {
    const isRight = opt.align === "right";
    const fullText = `P ${text}`;
    const pWidth = doc.getTextWidth("P ");
    const totalWidth = doc.getTextWidth(fullText);
    const startX = isRight ? x - totalWidth : x;

    doc.text("P", startX, currY);

    const fontSize = doc.getFontSize();
    const lineWidth = fontSize * 0.02;
    doc.setLineWidth(lineWidth);
    doc.setDrawColor(doc.getTextColor());

    const lineXStart = startX - 0.1;
    const lineXEnd = startX + pWidth * 0.45;
    const yOffset1 = fontSize * 0.18;
    const yOffset2 = fontSize * 0.25;

    doc.line(lineXStart, currY - yOffset1, lineXEnd, currY - yOffset1);
    doc.line(lineXStart, currY - yOffset2, lineXEnd, currY - yOffset2);

    doc.text(text, startX + pWidth, currY);
  };

  // 5. Service Item
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(serviceName, margin + 2, y);
  drawCurrency(price.toLocaleString(), pageWidth - margin - 2, y, {
    align: "right",
  });
  y += 8;

  // Divider
  doc.setDrawColor(240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 6. Totals
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Sub-total:", margin + 2, y);
  doc.setTextColor(0);
  drawCurrency(price.toLocaleString(), pageWidth - margin - 2, y, {
    align: "right",
  });
  y += 5;

  doc.setTextColor(80);
  doc.text("Tax (0%):", margin + 2, y);
  doc.setTextColor(0);
  drawCurrency("0.00", pageWidth - margin - 2, y, { align: "right" });
  y += 8;

  // Final Total
  doc.setFillColor(pink[0], pink[1], pink[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 9, "F");
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text("TOTAL AMOUNT:", margin + 2, y);
  drawCurrency(price.toLocaleString(), pageWidth - margin - 2, y, {
    align: "right",
  });
  y += 12;

  // 7. Cash/Change logic
  const isCash = (paymentMethod || "Cash").toLowerCase() === "cash";
  const displayCash =
    cashReceived !== undefined ? cashReceived : price;
  const displayChange =
    change !== undefined ? change : Math.max(0, displayCash - price);

  if (isCash) {
    doc.setTextColor(80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Cash Paid:", margin + 2, y);
    doc.setTextColor(0);
    drawCurrency(displayCash.toLocaleString(), pageWidth - margin - 2, y, {
      align: "right",
    });
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(pink[0], pink[1], pink[2]);
    doc.text("CHANGE:", margin + 2, y);
    drawCurrency(displayChange.toLocaleString(), pageWidth - margin - 2, y, {
      align: "right",
    });
    y += 15;
  } else {
    doc.setTextColor(80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Payment Method:", margin + 2, y);
    doc.setTextColor(0);
    doc.text(paymentMethod, pageWidth - margin - 2, y, { align: "right" });
    y += 15;
  }

  // 8. Footer
  doc.setTextColor(150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for your visit!", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(7);
  doc.text("Please visit us again soon.", pageWidth / 2, y, { align: "center" });

  return doc;
}

/**
 * Returns PDF ArrayBuffer/Buffer representation for email attachments.
 */
export function generateReceiptPDFBuffer(options: ReceiptPDFOptions): Buffer {
  const doc = buildReceiptPDFDoc(options);
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
