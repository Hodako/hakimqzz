import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Helper to convert Firestore documents into clean JSON objects
function docToData<T = any>(docSnap: any): T {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    created_at: data?.created_at?.toDate ? data.created_at.toDate().toISOString() : (data?.created_at || new Date().toISOString()),
  } as T;
}

// ── Products ─────────────────────────────────────────────────────────────────
export async function fsGetProducts() {
  try {
    const colRef = collection(db, "products");
    const q = query(colRef, orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(docToData);
  } catch (err) {
    console.warn("Firestore getProducts error, falling back to unsorted:", err);
    try {
      const snap = await getDocs(collection(db, "products"));
      return snap.docs.map(docToData);
    } catch (_) {
      return [];
    }
  }
}

export async function fsCreateProduct(data: any) {
  const colRef = collection(db, "products");
  const docRef = await addDoc(colRef, {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsUpdateProduct(id: string, data: any) {
  const docRef = doc(db, "products", id);
  await updateDoc(docRef, data);
  return { success: true, id };
}

export async function fsDeleteProduct(id: string) {
  const docRef = doc(db, "products", id);
  await deleteDoc(docRef);
  return { success: true, id };
}

// ── Sales ────────────────────────────────────────────────────────────────────
export async function fsGetSales() {
  try {
    const colRef = collection(db, "sales");
    const snap = await getDocs(colRef);
    return snap.docs.map(docToData);
  } catch (err) {
    console.error("Firestore getSales error:", err);
    return [];
  }
}

export async function fsCreateSale(data: any) {
  const colRef = collection(db, "sales");
  const docRef = await addDoc(colRef, {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsDeleteSale(id: string) {
  const docRef = doc(db, "sales", id);
  await deleteDoc(docRef);
  return { success: true, id };
}

export async function fsEditSale(id: string, data: any) {
  const docRef = doc(db, "sales", id);
  await updateDoc(docRef, data);
  return { success: true, id };
}

// ── Expenses ─────────────────────────────────────────────────────────────────
export async function fsGetExpenses() {
  try {
    const snap = await getDocs(collection(db, "expenses"));
    return snap.docs.map(docToData);
  } catch (err) {
    console.error("Firestore getExpenses error:", err);
    return [];
  }
}

export async function fsCreateExpense(data: any) {
  const docRef = await addDoc(collection(db, "expenses"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsDeleteExpense(id: string) {
  await deleteDoc(doc(db, "expenses", id));
  return { success: true, id };
}

// ── Parties ──────────────────────────────────────────────────────────────────
export async function fsGetParties() {
  try {
    const snap = await getDocs(collection(db, "parties"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreateParty(data: any) {
  const docRef = await addDoc(collection(db, "parties"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsUpdateParty(id: string, data: any) {
  await updateDoc(doc(db, "parties", id), data);
  return { success: true, id };
}

export async function fsDeleteParty(id: string) {
  await deleteDoc(doc(db, "parties", id));
  return { success: true, id };
}

// ── Customers ────────────────────────────────────────────────────────────────
export async function fsGetCustomers() {
  try {
    const snap = await getDocs(collection(db, "customers"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreateCustomer(data: any) {
  const docRef = await addDoc(collection(db, "customers"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsUpdateCustomer(id: string, data: any) {
  await updateDoc(doc(db, "customers", id), data);
  return { success: true, id };
}

export async function fsDeleteCustomer(id: string) {
  await deleteDoc(doc(db, "customers", id));
  return { success: true, id };
}

// ── Purchases ────────────────────────────────────────────────────────────────
export async function fsGetPurchases() {
  try {
    const snap = await getDocs(collection(db, "purchases"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreatePurchase(data: any) {
  const docRef = await addDoc(collection(db, "purchases"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsDeletePurchase(id: string) {
  await deleteDoc(doc(db, "purchases", id));
  return { success: true, id };
}

// ── Cashbox ──────────────────────────────────────────────────────────────────
export async function fsGetCashbox() {
  try {
    const snap = await getDocs(collection(db, "cashbox_logs"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreateCashbox(data: any) {
  const docRef = await addDoc(collection(db, "cashbox_logs"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

// ── Withdrawals ──────────────────────────────────────────────────────────────
export async function fsGetWithdrawals() {
  try {
    const snap = await getDocs(collection(db, "withdrawals"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreateWithdrawal(data: any) {
  const docRef = await addDoc(collection(db, "withdrawals"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

// ── Somiti ───────────────────────────────────────────────────────────────────
export async function fsGetSomiti() {
  try {
    const snap = await getDocs(collection(db, "somiti"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreateSomiti(data: any) {
  const docRef = await addDoc(collection(db, "somiti"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsUpdateSomiti(id: string, data: any) {
  await updateDoc(doc(db, "somiti", id), data);
  return { success: true, id };
}

export async function fsDeleteSomiti(id: string) {
  await deleteDoc(doc(db, "somiti", id));
  return { success: true, id };
}

// ── Reminders ────────────────────────────────────────────────────────────────
export async function fsGetReminders() {
  try {
    const snap = await getDocs(collection(db, "reminders"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreateReminder(data: any) {
  const docRef = await addDoc(collection(db, "reminders"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsToggleReminder(id: string, data: any) {
  await updateDoc(doc(db, "reminders", id), data);
  return { success: true, id };
}

export async function fsDeleteReminder(id: string) {
  await deleteDoc(doc(db, "reminders", id));
  return { success: true, id };
}

// ── Payments & Receivables / Payables ────────────────────────────────────────
export async function fsGetAllPayments() {
  try {
    const snap = await getDocs(collection(db, "payments"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreatePayment(data: any) {
  const docRef = await addDoc(collection(db, "payments"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsDeletePayment(id: string) {
  await deleteDoc(doc(db, "payments", id));
  return { success: true, id };
}

export async function fsGetAllPartyReceivables() {
  try {
    const snap = await getDocs(collection(db, "party_receivables"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreatePartyReceivable(data: any) {
  const docRef = await addDoc(collection(db, "party_receivables"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsGetAllPartyPayables() {
  try {
    const snap = await getDocs(collection(db, "party_payables"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}

export async function fsCreatePartyPayable(data: any) {
  const docRef = await addDoc(collection(db, "party_payables"), {
    ...data,
    created_at: Timestamp.now(),
  });
  return { success: true, id: docRef.id };
}

export async function fsGetAllPayableSettlements() {
  try {
    const snap = await getDocs(collection(db, "payable_settlements"));
    return snap.docs.map(docToData);
  } catch (err) {
    return [];
  }
}
