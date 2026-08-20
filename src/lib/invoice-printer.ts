import { fmtDateTime } from "@/lib/format";

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
  invoiceScale?: string;
  invoiceLineSpacing?: string;
}

/**
 * Clean Thermal POS Receipt Print Engine (Optimized for 58mm/80mm Thermal Printers & A4)
 */
export function printPwaInvoice(data: PrintInvoiceParams) {
  const now = new Date();
  const dateStr = data.invoiceDate || fmtDateTime(now);

  let pageSizeRule = "80mm auto";
  let bodyMaxWidth = "100%";

  if (data.pageSize === "58mm") {
    pageSizeRule = "58mm auto";
    bodyMaxWidth = "100%";
  } else if (data.pageSize === "A4") {
    pageSizeRule = "A4 portrait";
    bodyMaxWidth = "100%";
  } else if (data.pageSize === "A5") {
    pageSizeRule = "A5 portrait";
    bodyMaxWidth = "100%";
  } else if (data.pageSize === "custom" && data.pageWidth) {
    pageSizeRule = `${data.pageWidth} ${data.pageHeight || "auto"}`;
    bodyMaxWidth = "100%";
  }

  const rawScale = data.invoiceScale || "100%";
  const numScale = parseInt(rawScale.replace(/[^0-9]/g, ""), 10) || 100;
  const scaleRatio = numScale / 100;

  const rawFontSize = data.invoiceFontSize || "16px";
  const numFontSize = Math.round((parseInt(rawFontSize.replace(/[^0-9]/g, ""), 10) || 16) * scaleRatio);
  const baseSize = `${numFontSize}px`;
  const headerSize = `${Math.round(numFontSize * 1.25)}px`;
  const subSize = `${Math.round(numFontSize * 0.85)}px`;
  const metaSize = `${Math.round(numFontSize * 0.85)}px`;

  const lineSpacing = data.invoiceLineSpacing || "3px";

  const itemsRowsHtml = data.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px dotted #dddddd;">
      <td style="padding: ${lineSpacing} 0; text-align: left; vertical-align: top; font-weight: 600; font-size: ${baseSize}; word-break: normal; overflow-wrap: break-word; color: #000000;">
        ${item.product.name}
      </td>
      <td style="padding: ${lineSpacing} 2px; text-align: center; vertical-align: top; font-family: monospace; font-size: ${baseSize}; font-weight: 600; color: #000000; width: 18%;">
        ${item.qty}
      </td>
      <td style="padding: ${lineSpacing} 0; text-align: right; vertical-align: top; font-family: monospace; font-weight: 700; font-size: ${baseSize}; color: #000000; width: 28%;">
        ৳${(item.qty * item.sellPrice).toLocaleString()}
      </td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en" style="color-scheme: light !important;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt</title>
  <style>
    @page { size: ${pageSizeRule}; margin: 0 !important; }
    *, *:before, *:after { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-scheme: light !important; }
    html, body { background: #ffffff !important; color: #000000 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; font-size: ${baseSize} !important; line-height: 1.25; word-break: normal; overflow-wrap: break-word; }
    .receipt-wrap { position: relative !important; overflow: hidden !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 3mm 2mm; box-sizing: border-box !important; background: #ffffff; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 18px; font-weight: 900; color: rgba(0, 0, 0, 0.07); border: 1.5px solid rgba(0, 0, 0, 0.07); padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; pointer-events: none; z-index: 0; }
    .receipt-content { position: relative; z-index: 1; }
    .dashed-line { border-top: 1px dashed #000000; margin: 3px 0; height: 0; }
    .solid-line { border-top: 1px solid #000000; margin: 3px 0; height: 0; }
    table { width: 100% !important; border-collapse: collapse; margin: 2px 0; }
    th { text-transform: uppercase; font-size: ${subSize}; font-weight: 800; border-bottom: 1px dashed #000000; padding-bottom: 2px; color: #000000; }
  </style>
</head>
<body>
  <div class="receipt-wrap">
    <div class="watermark">${data.paymentMode === "CREDIT" || data.due > 0 ? "PAID BY: CREDIT" : "PAID BY: CASH"}</div>
    <div class="receipt-content">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 3px;">
        <div style="font-size: ${headerSize}; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #000000;">
          ${data.businessName}
        </div>
        ${data.tagline ? `<div style="font-size: ${subSize}; font-weight: 500; margin-top: 0.5px; color: #000000;">${data.tagline}</div>` : ""}
        ${data.shopAddress ? `<div style="font-size: ${subSize}; margin-top: 1px; color: #000000;">${data.shopAddress}</div>` : ""}
        ${data.shopPhoneNumbers ? `<div style="font-size: ${subSize}; font-family: monospace; font-weight: 600; margin-top: 1px; color: #000000;">${data.shopPhoneNumbers}</div>` : ""}
        ${data.userEmail ? `<div style="font-size: ${subSize}; margin-top: 0.5px; color: #000000;">${data.userEmail}</div>` : ""}
      </div>

      <div class="dashed-line"></div>

      <!-- Metadata Section -->
      <div style="font-size: ${metaSize}; line-height: 1.25; color: #000000;">
        <div style="display: flex; justify-content: flex-end; font-family: monospace;">
          <span>${dateStr}</span>
        </div>
        ${
          data.customerName
            ? `<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 4px; white-space: nowrap; overflow: hidden; margin-top: 1px;">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Customer: <strong>${data.customerName}</strong></span>
                <span style="font-family: monospace; white-space: nowrap; shrink-0;">${data.customerPhone || ""}</span>
              </div>`
            : ""
        }
      </div>

      <div class="dashed-line"></div>

      <!-- Items Table -->
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: center; width: 30px;">Qty</th>
            <th style="text-align: right; width: 60px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>

      <div class="dashed-line"></div>

      <!-- Financial Totals Section -->
      <div style="font-size: ${baseSize};">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: 700;">
          <span>Subtotal</span>
          <span style="font-family: monospace;">৳${data.subtotal.toLocaleString()}</span>
        </div>

        ${
          data.discountAmount > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Discount</span>
                <span style="font-family: monospace;">-৳${data.discountAmount.toLocaleString()}</span>
              </div>`
            : ""
        }

        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; margin-top: 2px;">
          <span>Cash Received</span>
          <span style="font-family: monospace; font-weight: 600;">৳${data.paidAmount.toLocaleString()}</span>
        </div>

        ${
          data.due > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: 700;">
                <span>Due Amount</span>
                <span style="font-family: monospace;">৳${data.due.toLocaleString()}</span>
              </div>`
            : ""
        }

        ${
          (data.changeAmount || 0) > 0
            ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Change Return</span>
                <span style="font-family: monospace;">৳${data.changeAmount?.toLocaleString()}</span>
              </div>`
            : ""
        }

        <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: ${subSize};">
          <span>Paid By:</span>
          <span style="font-weight: 800; text-transform: uppercase;">${data.paymentMode || (data.due > 0 ? "Credit" : "Cash")}</span>
        </div>
      </div>

      <div class="dashed-line"></div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 4px; width: 100%;">
        ${
          data.terms
            ? `<div style="font-size: ${subSize}; font-weight: 700; margin-top: 2px; white-space: pre-line; color: #000000;">${data.terms}</div>`
            : `<div style="font-size: ${baseSize}; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Thank You!</div>`
        }
      </div>
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
