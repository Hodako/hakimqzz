"use client";

export interface InvoiceItemData {
  product: {
    id?: string;
    name: string;
  };
  qty: number;
  sellPrice: number;
}

export interface PrintInvoiceParams {
  businessName: string;
  userEmail?: string;
  shopAddress?: string;
  shopPhoneNumbers?: string;
  pageSize?: string;
  pageWidth?: string;
  pageHeight?: string;
  tagline?: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTime?: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceItemData[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  due: number;
  changeAmount?: number;
  paymentStatus?: string;
  paymentMode?: string;
  colorTheme?: string;
  terms?: string;
  invoiceFontSize?: string;
}

const CODE39_PATTERNS: Record<string, string> = {
  "0": "101001101101", "1": "110100101011", "2": "101100101011", "3": "110110010101",
  "4": "101001101011", "5": "110100110101", "6": "101100110101", "7": "101001011011",
  "8": "110100101101", "9": "101100101101", "A": "110101001011", "B": "101101001011",
  "C": "110110100101", "D": "101011001011", "E": "110101100101", "F": "101101100101",
  "G": "101010011011", "H": "110101001101", "I": "101101001101", "J": "101011001101",
  "K": "110101010011", "L": "101101010011", "M": "110110101001", "N": "101011010011",
  "O": "110101101001", "P": "101101101001", "Q": "101010110011", "R": "110101011001",
  "S": "101101011001", "T": "101011011001", "U": "110010101011", "V": "100110101011",
  "W": "110011010101", "X": "100101101011", "Y": "110010110101", "Z": "100110110101",
  "-": "100101011011", ".": "110010101101", " ": "100110101101", "*": "100101101101",
  "$": "100100100101", "/": "100100101001", "+": "100101001001", "%": "10010101001"
};

export function generateBarcodeSvg(text: string, height = 34): string {
  const safeText = (text || "INV-001").toUpperCase().replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, "");
  const clean = ("*" + safeText + "*").slice(0, 24);
  let barModules = "";
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS["-"];
    barModules += pattern + "0";
  }
  const moduleWidth = 1.5;
  const totalWidth = Math.ceil(barModules.length * moduleWidth);

  let rects = "";
  let currentX = 0;
  for (let i = 0; i < barModules.length; i++) {
    if (barModules[i] === "1") {
      rects += `<rect x="${currentX.toFixed(1)}" y="0" width="${moduleWidth.toFixed(1)}" height="${height}" fill="#000000"/>`;
    }
    currentX += moduleWidth;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height + 14}" width="${totalWidth}" height="${height + 14}" style="display:block;margin:0 auto;">
    ${rects}
    <text x="${(totalWidth / 2).toFixed(1)}" y="${height + 11}" font-family="Courier, monospace" font-size="9" font-weight="bold" text-anchor="middle" fill="#000000">${text}</text>
  </svg>`;
}

/**
 * Clean Thermal POS Receipt Print Engine (Optimized for 58mm/80mm Thermal Printers & A4)
 */
export function printPwaInvoice(data: PrintInvoiceParams) {
  const now = new Date();
  const dateStr = data.invoiceDate || now.toLocaleDateString("en-CA");
  const timeStr = data.invoiceTime || now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const cashier = data.cashierName || "Owner / Cashier";

  let pageSizeRule = "80mm auto";
  let bodyMaxWidth = "76mm";

  if (data.pageSize === "58mm") {
    pageSizeRule = "58mm auto";
    bodyMaxWidth = "54mm";
  } else if (data.pageSize === "A4") {
    pageSizeRule = "A4 portrait";
    bodyMaxWidth = "80mm";
  } else if (data.pageSize === "A5") {
    pageSizeRule = "A5 portrait";
    bodyMaxWidth = "80mm";
  } else if (data.pageSize === "custom" && data.pageWidth) {
    pageSizeRule = `${data.pageWidth} ${data.pageHeight || "auto"}`;
    bodyMaxWidth = data.pageWidth;
  }

  const itemsRowsHtml = data.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px dotted #cccccc;">
      <td style="padding: 4px 0; text-align: left; vertical-align: top; font-weight: 600; font-size: 11px; word-break: break-word; color: #000000;">
        ${item.product.name}
      </td>
      <td style="padding: 4px 2px; text-align: center; vertical-align: top; font-family: monospace; font-size: 11px; font-weight: 600; color: #000000; width: 32px;">
        ${item.qty}
      </td>
      <td style="padding: 4px 0; text-align: right; vertical-align: top; font-family: monospace; font-weight: 700; font-size: 11px; color: #000000; width: 68px;">
        ৳${(item.qty * item.sellPrice).toLocaleString()}
      </td>
    </tr>`
    )
    .join("");

  const barcodeSvg = generateBarcodeSvg(data.invoiceNo, 32);

  const html = `<!DOCTYPE html>
<html lang="en" style="color-scheme: light !important;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${data.invoiceNo}</title>
  <style>
    @page { size: ${pageSizeRule}; margin: 0; }
    *, *:before, *:after { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-scheme: light !important; }
    html, body { background: #ffffff !important; color: #000000 !important; width: 100%; margin: 0 auto; padding: 4mm 2mm; font-size: 11px !important; line-height: 1.3; }
    .receipt-wrap { width: 100%; max-width: ${bodyMaxWidth}; margin: 0 auto; background: #ffffff; }
    .dashed-line { border-top: 1px dashed #000000; margin: 6px 0; height: 0; }
    .solid-line { border-top: 1.5px solid #000000; margin: 6px 0; height: 0; }
    .double-line { border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; padding: 4px 0; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th { text-transform: uppercase; font-size: 10px; font-weight: 800; border-bottom: 1px dashed #000000; padding-bottom: 4px; color: #000000; }
  </style>
</head>
<body>
  <div class="receipt-wrap">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 6px;">
      <div style="font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #000000;">
        ${data.businessName}
      </div>
      ${data.tagline ? `<div style="font-size: 10px; font-weight: 500; margin-top: 1px; color: #000000;">${data.tagline}</div>` : ""}
      ${data.shopAddress ? `<div style="font-size: 10px; margin-top: 1.5px; color: #000000;">${data.shopAddress}</div>` : ""}
      ${data.shopPhoneNumbers ? `<div style="font-size: 10px; font-family: monospace; font-weight: 600; margin-top: 1.5px; color: #000000;">Phone: ${data.shopPhoneNumbers}</div>` : ""}
      ${data.userEmail ? `<div style="font-size: 9.5px; margin-top: 1px; color: #000000;">${data.userEmail}</div>` : ""}
    </div>

    <div class="dashed-line"></div>

    <!-- Metadata Section -->
    <div style="font-size: 10.5px; line-height: 1.4; color: #000000;">
      <div style="display: flex; justify-content: space-between;">
        <span>Invoice No: <strong style="font-family: monospace;">${data.invoiceNo}</strong></span>
        <span style="font-family: monospace;">${dateStr}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Time: <span style="font-family: monospace;">${timeStr}</span></span>
        <span>Cashier: <strong>${cashier}</strong></span>
      </div>
      ${
        data.customerName
          ? `<div style="display: flex; justify-content: space-between; margin-top: 1px;">
              <span>Customer: <strong>${data.customerName}</strong></span>
              <span style="font-family: monospace;">${data.customerPhone || ""}</span>
            </div>`
          : ""
      }
    </div>

    <div class="dashed-line"></div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Item Name</th>
          <th style="text-align: center; width: 32px;">Qty</th>
          <th style="text-align: right; width: 68px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
      </tbody>
    </table>

    <div class="dashed-line"></div>

    <!-- Financial Totals Section -->
    <div style="font-size: 11px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2.5px;">
        <span>Subtotal</span>
        <span style="font-family: monospace; font-weight: 600;">৳${data.subtotal.toLocaleString()}</span>
      </div>

      ${
        data.discountAmount > 0
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2.5px;">
              <span>Discount</span>
              <span style="font-family: monospace;">-৳${data.discountAmount.toLocaleString()}</span>
            </div>`
          : ""
      }

      <div class="double-line" style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; font-weight: 900; text-transform: uppercase;">Grand Total</span>
        <span style="font-size: 15px; font-weight: 900; font-family: monospace;">৳${data.total.toLocaleString()}</span>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 2.5px; margin-top: 4px;">
        <span>Cash Received</span>
        <span style="font-family: monospace; font-weight: 600;">৳${data.paidAmount.toLocaleString()}</span>
      </div>

      ${
        data.due > 0
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2.5px; font-weight: 700;">
              <span>Due Amount</span>
              <span style="font-family: monospace;">৳${data.due.toLocaleString()}</span>
            </div>`
          : ""
      }

      ${
        (data.changeAmount || 0) > 0
          ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2.5px;">
              <span>Change Return</span>
              <span style="font-family: monospace;">৳${data.changeAmount?.toLocaleString()}</span>
            </div>`
          : ""
      }

      <div style="display: flex; justify-content: space-between; margin-top: 3px; font-size: 10px;">
        <span>Paid By:</span>
        <span style="font-weight: 800; text-transform: uppercase;">${data.paymentMode || (data.due > 0 ? "Credit" : "Cash")}</span>
      </div>
    </div>

    <div class="dashed-line"></div>

    <!-- Barcode & Footer -->
    <div style="text-align: center; margin-top: 8px;">
      <div style="margin-bottom: 6px;">
        ${barcodeSvg}
      </div>
      <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Thank You!</div>
      <div style="font-size: 10.5px; font-weight: 600; margin-top: 1px;">Please Visit Again</div>
      ${data.terms ? `<div style="font-size: 9.5px; margin-top: 4px; font-style: italic; white-space: pre-line;">${data.terms}</div>` : ""}
      <div style="font-size: 8.5px; margin-top: 6px; color: #444444;">Powered by Dream Fashion POS</div>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        window.print();
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      }, 1000);
    }, 250);
  } else {
    window.print();
  }
}
