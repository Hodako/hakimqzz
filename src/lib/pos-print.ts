"use client";

export interface PosPaperSettings {
  widthMm: number;
  heightMm: number | "auto";
  canvasWidthMm: number;
  marginMm: number;
}

export const DEFAULT_POS_CONFIG: PosPaperSettings = {
  widthMm: 58,
  heightMm: 40,
  canvasWidthMm: 82,
  marginMm: 1,
};

export function getPosPaperConfig(): PosPaperSettings {
  if (typeof window === "undefined") return DEFAULT_POS_CONFIG;
  try {
    const saved = localStorage.getItem("dreamfashion_pos_paper_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        widthMm: Number(parsed.widthMm) || 58,
        heightMm: parsed.heightMm === "auto" ? "auto" : (Number(parsed.heightMm) || 40),
        canvasWidthMm: Number(parsed.canvasWidthMm) || 82,
        marginMm: Number(parsed.marginMm) ?? 1,
      };
    }
  } catch (e) {}
  return DEFAULT_POS_CONFIG;
}

export function savePosPaperConfig(config: Partial<PosPaperSettings>): PosPaperSettings {
  const current = getPosPaperConfig();
  const updated: PosPaperSettings = {
    ...current,
    ...config,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem("dreamfashion_pos_paper_config", JSON.stringify(updated));
    window.dispatchEvent(new Event("hz-pos-config-updated"));
  }
  return updated;
}

export function printPwaPosReceipt(data: {
  businessName: string;
  tagline?: string;
  phone?: string;
  invoiceNo: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
}) {
  const config = getPosPaperConfig();
  const width = config.widthMm || 58;
  const canvasW = config.canvasWidthMm || 82;
  const heightStr = config.heightMm === "auto" ? "auto" : `${config.heightMm || 40}mm`;
  const margin = config.marginMm ?? 1;

  const itemsRows = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px dashed #cccccc;">
        <td style="padding: 3px 0; word-break: break-word; font-weight: 600;">${item.name}</td>
        <td style="padding: 3px 0; text-align: center;">${item.qty}</td>
        <td style="padding: 3px 0; text-align: right; font-family: monospace;">৳${(item.qty * item.price).toLocaleString()}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>POS Receipt ${data.invoiceNo}</title>
  <style>
    @page {
      size: ${width}mm ${heightStr};
      margin: 0 ${margin}mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: "Courier New", Courier, monospace, monospace;
      font-size: 11px;
      color: #000000 !important;
    }
    body {
      width: 100%;
      max-width: ${canvasW}mm;
      margin: 0 auto;
      padding: 4px ${margin}mm;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    .divider { border-bottom: 1px dashed #000000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th { border-bottom: 1px solid #000000; padding: 2px 0; text-align: left; }
    .summary-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; font-weight: bold; border-top: 1px solid #000000; border-bottom: 1px solid #000000; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">${data.businessName}</div>
    ${data.tagline ? `<div style="font-size: 9px;">${data.tagline}</div>` : ""}
    ${data.phone ? `<div style="font-size: 9px;">Mob: ${data.phone}</div>` : ""}
  </div>
  <div class="divider"></div>
  <div style="font-size: 9px;">
    <div><strong>Inv:</strong> ${data.invoiceNo}</div>
    <div><strong>Date:</strong> ${data.date}</div>
    ${data.customerName ? `<div><strong>Cust:</strong> ${data.customerName}</div>` : ""}
  </div>
  <div class="divider"></div>
  <table>
    <thead>
      <tr>
        <th style="width: 55%;">Item</th>
        <th style="width: 15%; text-align: center;">Qty</th>
        <th style="width: 30%; text-align: right;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>
  <div class="divider"></div>
  <div style="font-size: 10px;">
    <div class="summary-row"><span>Subtotal:</span><span class="bold">৳${data.subtotal.toLocaleString()}</span></div>
    ${data.discount > 0 ? `<div class="summary-row"><span>Discount:</span><span>-৳${data.discount.toLocaleString()}</span></div>` : ""}
    <div class="total-row"><span>Total:</span><span>৳${data.total.toLocaleString()}</span></div>
    <div class="summary-row"><span>Paid:</span><span>৳${data.paid.toLocaleString()}</span></div>
    ${data.due > 0 ? `<div class="summary-row" style="font-weight: bold;"><span>Due:</span><span>৳${data.due.toLocaleString()}</span></div>` : ""}
  </div>
  <div class="divider"></div>
  <div class="text-center" style="font-size: 9px; margin-top: 4px;">
    Thank you for shopping!
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
