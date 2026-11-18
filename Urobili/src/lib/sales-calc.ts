/**
 * Shared date parsing and sales-amount calculation helpers.
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
  const rawDue = s.due_amount;
  const hasPaid = rawPaid !== null && rawPaid !== undefined && rawPaid !== "";
  const hasDue = rawDue !== null && rawDue !== undefined && rawDue !== "";
  const p = hasPaid ? Number(rawPaid) : NaN;
  const d = hasDue ? Number(rawDue) : 0;
  if (!isNaN(p) && !isNaN(d) && p + d > 0) return p + d;

  const q = Number(s.qty) || 1;
  const sp = Number(s.sell_price) || 0;
  const disc = Number(s.discount) || 0;
  return Math.max(0, sp * q - disc);
}

export function getSaleCashAmount(s: any, explicitTotal?: number): number {
  if (!s) return 0;
  const tot = explicitTotal !== undefined ? explicitTotal : getSaleTotalAmount(s);
  const rawPaid = s.paid_amount;
  const hasPaid = rawPaid !== null && rawPaid !== undefined && rawPaid !== "";
  const p = hasPaid ? Number(rawPaid) : NaN;
  const hasValidPaid = hasPaid && !isNaN(p) && p >= 0;
  const due = Number(s.due_amount) || 0;
  const type = String(s.type || "cash").trim().toLowerCase();

  if (type === "split" || type === "partial") {
    if (s.split_cash !== undefined || s.split_bkash !== undefined || s.split_bank !== undefined) {
      return Math.max(0, Number(s.split_cash) || 0);
    }
    return hasValidPaid && p > 0 ? p : 0;
  }

  if (type === "cash" || type === "hand_cash" || type === "pos" || type === "nagad" || type === "card") {
    if (hasValidPaid && (p > 0 || due > 0)) return p;
    return tot;
  }

  if (type === "credit") {
    return hasValidPaid && p > 0 ? p : 0;
  }

  if (type === "bkash" || type === "bank") {
    if (s.payment_status === "accepted" || s.payment_accepted) {
      return hasValidPaid && p > 0 ? p : tot;
    }
    return 0;
  }

  if (type === "online") {
    if (s.courier_status === "collected") {
      return hasValidPaid && p > 0 ? p : tot;
    }
    return 0;
  }

  if (hasValidPaid && (p > 0 || due > 0)) return p;
  return tot;
}
