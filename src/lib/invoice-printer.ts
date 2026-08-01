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
  tagline?: string;
  invoiceNo: string;
  invoiceDate: string;
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
  colorTheme?: string;
  terms?: string;
}

/**
 * Standard Invoice Print Engine (Identical layout across Invoice Management & Sell Widget)
 */
export function printPwaInvoice(data: PrintInvoiceParams) {
  const colorMap: Record<string, { main: string; bg: string; headerBg: string }> = {
    emerald: { main: "#047857", bg: "#ecfdf5", headerBg: "#d1fae5" },
    indigo: { main: "#4338ca", bg: "#eef2ff", headerBg: "#e0e7ff" },
    rose: { main: "#be123c", bg: "#fff1f2", headerBg: "#ffe4e6" },
    black: { main: "#18181b", bg: "#f4f4f5", headerBg: "#e4e4e7" },
  };

  const colors = colorMap[data.colorTheme || "black"] || colorMap.black;
  const status = data.paymentStatus || (data.due > 0 ? (data.paidAmount > 0 ? "PARTIAL" : "DUE") : "PAID");

  const itemsHtml = data.items
    .map(
      (item, i) => `
    <tr style="border-bottom: 1px solid #e4e4e7;">
      <td style="padding: 10px 8px; font-family: monospace; color: #71717a;">${i + 1}</td>
      <td style="padding: 10px 8px; font-weight: 600; color: #18181b;">${item.product.name}</td>
      <td style="padding: 10px 8px; text-align: right; font-family: monospace;">৳${item.sellPrice.toLocaleString()}</td>
      <td style="padding: 10px 8px; text-align: center; font-family: monospace; font-weight: 600;">${item.qty}</td>
      <td style="padding: 10px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #18181b;">৳${(item.qty * item.sellPrice).toLocaleString()}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en" style="color-scheme: light !important;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNo}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    *, *:before, *:after { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-scheme: light !important; }
    html, body { background: #ffffff !important; color: #000000 !important; padding: 20px; }
    .card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 28px; border: 1px solid #e4e4e7; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${colors.main}; padding-bottom: 16px; margin-bottom: 20px; }
    .biz-name { font-size: 24px; font-weight: 800; text-transform: uppercase; color: ${colors.main}; letter-spacing: 0.5px; }
    .tagline { font-size: 12px; color: #71717a; margin-top: 2px; }
    .inv-title { font-size: 22px; font-weight: 800; text-transform: uppercase; text-align: right; color: #18181b; letter-spacing: 1px; }
    .inv-meta { font-size: 12px; color: #52525b; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .client-box { background: ${colors.bg}; padding: 14px 18px; border-radius: 8px; border: 1px solid ${colors.headerBg}; }
    .client-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${colors.main}; margin-bottom: 4px; tracking: 0.5px; }
    .client-name { font-size: 15px; font-weight: 700; color: #000000; }
    .client-phone { font-size: 12px; color: #52525b; font-family: monospace; margin-top: 2px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #d1fae5; background: #ecfdf5; color: #047857; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    th { background: ${colors.headerBg}; color: ${colors.main}; padding: 10px 8px; text-align: left; font-weight: 700; border-bottom: 2px solid ${colors.main}; text-transform: uppercase; font-size: 11px; }
    .summary-wrap { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .summary-box { width: 280px; font-size: 12.5px; border-top: 2px solid ${colors.main}; padding-top: 12px; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; color: #52525b; }
    .row-total { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: 800; color: ${colors.main}; border-top: 1.5px solid ${colors.main}; border-bottom: 1.5px solid ${colors.main}; margin-top: 6px; margin-bottom: 6px; }
    .row-paid { display: flex; justify-content: space-between; padding: 5px 0; color: #047857; font-weight: 600; }
    .row-due { display: flex; justify-content: space-between; padding: 5px 0; color: #e11d48; font-weight: 700; border-top: 1px dashed #f43f5e; margin-top: 4px; }
    .footer { border-top: 1px solid #e4e4e7; padding-top: 16px; text-align: center; font-size: 11px; color: #71717a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="biz-name">${data.businessName}</div>
        ${data.tagline ? `<div class="tagline">${data.tagline}</div>` : ""}
        ${data.userEmail ? `<div style="font-size: 11px; color: #71717a; margin-top: 2px;">${data.userEmail}</div>` : ""}
      </div>
      <div style="text-align: right;">
        <div class="inv-title">INVOICE</div>
        <div class="inv-meta"><strong>Invoice No:</strong> #${data.invoiceNo}</div>
        <div class="inv-meta"><strong>Date:</strong> ${data.invoiceDate}</div>
      </div>
    </div>
    <div class="grid">
      <div class="client-box">
        <div class="client-title">BILLED TO:</div>
        <div class="client-name">${data.customerName || "Walk-in Customer"}</div>
        ${data.customerPhone ? `<div class="client-phone">Phone: ${data.customerPhone}</div>` : ""}
      </div>
      <div style="text-align: right; display: flex; flex-direction: column; justify-content: center; align-items: flex-end;">
        <div style="font-size: 11px; color: #71717a; margin-bottom: 4px; font-weight: 600; text-transform: uppercase;">Payment Status</div>
        <div><span class="status-badge">${status}</span></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Product / Item</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="summary-wrap">
      <div class="summary-box">
        <div class="row"><span>Subtotal</span><span style="font-family: monospace; font-weight: 600;">৳${data.subtotal.toLocaleString()}</span></div>
        ${data.discountAmount > 0 ? `<div class="row" style="color: #e11d48;"><span>Discount</span><span style="font-family: monospace;">-৳${data.discountAmount.toLocaleString()}</span></div>` : ""}
        <div class="row-total"><span>Payable Total</span><span style="font-family: monospace;">৳${data.total.toLocaleString()}</span></div>
        <div class="row-paid"><span>Paid Amount</span><span style="font-family: monospace;">৳${data.paidAmount.toLocaleString()}</span></div>
        ${data.due > 0 ? `<div class="row-due"><span>Due Amount</span><span style="font-family: monospace;">৳${data.due.toLocaleString()}</span></div>` : ""}
        ${(data.changeAmount || 0) > 0 ? `<div class="row" style="color: #0284c7; font-weight: 600;"><span>Change Return</span><span style="font-family: monospace;">৳${data.changeAmount?.toLocaleString()}</span></div>` : ""}
      </div>
    </div>
    <div class="footer">
      <p style="font-weight: 600; color: #374151;">${data.terms || "Thank you for your business!"}</p>
      <p style="font-size: 10px; margin-top: 4px; color: #a1a1aa;">Generated via ${data.businessName} Invoice Manager</p>
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
