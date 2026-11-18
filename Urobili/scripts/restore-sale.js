import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function restoreSale() {
  const recycleId = "sales_IQImdqk6875Wu689kVzB";
  const snap = await getDoc(doc(db, "recycle_bin", recycleId));
  if (!snap.exists()) {
    console.log("Recycle bin item not found!");
    return;
  }
  const item = snap.data();
  console.log("Restoring:", item.label);

  const saleData = { ...item.data };
  delete saleData.id;
  delete saleData._id;

  // Ensure created_at is a proper Firestore Timestamp
  saleData.created_at = Timestamp.fromDate(new Date("2026-11-12T12:53:17.840Z"));

  // 1. Write back to sales collection
  const saleRef = doc(db, "sales", item.original_id);
  await setDoc(saleRef, saleData);
  console.log("Restored document to sales collection:", item.original_id);

  // 2. Adjust product stock back down (-1 for RIPET BELT)
  if (saleData.product_id) {
    try {
      const prodRef = doc(db, "products", saleData.product_id);
      await updateDoc(prodRef, { stock: increment(-1) });
      console.log("Adjusted stock for product:", saleData.product_id);
    } catch (e) {
      console.warn("Stock adjust warning:", e);
    }
  }

  // 3. Remove from recycle_bin
  await deleteDoc(doc(db, "recycle_bin", recycleId));
  console.log("Removed from recycle_bin");

  console.log("SUCCESS! Sale restored.");
  process.exit(0);
}

restoreSale().catch(console.error);
