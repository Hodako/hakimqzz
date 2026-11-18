/**
 * Shared date parsing and sales-amount calculation helpers for Dream Fashion POS.
 * Centralizes timezone-safe local date handling (Asia/Dhaka +06:00 friendly)
 * and consistent cash/total calculation across Dashboard, Today's Sales,
 * Sales History, and Cash Management.
 */

export function parseSaleDate(dateInput: any): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === "") return null;

  let d: Date;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput?.toDate === "function") {
    d = dateInput.toDate();
  } else if (typeof dateInput?.seconds === "number") {
    d = new Date(dateInput.seconds * 1000);
  } else if (typeof dateInput?._seconds === "number") {
    d = new Date(dateInput._seconds * 1000);
  } else if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    // Parse bare YYYY-MM-DD strings as local midnight instead of UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, day] = trimmed.split("-").map(Number);
      d = new Date(y, m - 1, day, 0, 0, 0, 0);
    } else {
      d = new Date(trimmed);
    }
  } else if (typeof dateInput === "number") {
    d = new Date(dateInput);
  } else {
    d = new Date(dateInput);
  }

  return isNaN(d.getTime()) ? null : d;
}

export function toLocalDateStr(dateInput: any = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : parseSaleDate(dateInput);
  if (!d || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getSaleTotalAmount(s: any): number {
  if (!s) return 0;
  const rawPaid = s.paid_amount;
  const rawTotal = s.total_amount ?? s.total;
  const rawSubtotal = s.subtotal;
  const rawDue = s.due;

  const paidNum = Number(rawPaid);
  const totalNum = Number(rawTotal);
  const subtotalNum = Number(rawSubtotal);
  const dueNum = Number(rawDue);

  if (Number.isFinite(totalNum) && totalNum > 0) return totalNum;
  if (Number.isFinite(subtotalNum) && subtotalNum > 0) return subtotalNum;
  if (Number.isFinite(paidNum) && paidNum > 0) {
    if (Number.isFinite(dueNum) && dueNum > 0) return paidNum + dueNum;
    return paidNum;
  }
  return 0;
}

export function getSaleCashAmount(s: any): number {
  if (!s) return 0;
  const pMode = String(s.payment_mode || s.payment_type || "cash").toLowerCase();
  const total = getSaleTotalAmount(s);
  const paid = Number.isFinite(Number(s.paid_amount)) ? Number(s.paid_amount) : total;

  if (pMode === "cash") {
    return Math.max(0, paid);
  }
  if (pMode === "split") {
    const splitCash = Number(s.split_cash);
    if (Number.isFinite(splitCash) && splitCash > 0) {
      return splitCash;
    }
    return Math.max(0, paid);
  }
  // Digital / Bank / Credit do not count as physical drawer cash
  return 0;
}
