import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function ensureSync() {
  const saleId = "IQImdqk6875Wu689kVzB";
  const saleSnap = await getDoc(doc(db, "sales", saleId));
  if (!saleSnap.exists()) {
    console.error("Sale doc does not exist!");
    process.exit(1);
  }
  const saleData = saleSnap.data();
  console.log("Sale data:", saleData.product_name, "sell_price:", saleData.sell_price, "owner_id:", saleData.owner_id);

  // Check if cashbox log exists
  const q = query(collection(db, "cashbox_logs"), where("ref_id", "==", saleId));
  const cbSnap = await getDocs(q);
  if (cbSnap.empty) {
    console.log("Adding matching cashbox_log for sale...");
    const createdAtTs = Timestamp.fromDate(new Date("2026-11-12T12:53:17.840Z"));
    const newDoc = await addDoc(collection(db, "cashbox_logs"), {
      kind: "sale",
      amount: 1950,
      note: "Sale [Paid by CASH]: RIPET BELT (x1)",
      ref_id: saleId,
      owner_id: saleData.owner_id || "CrkR0F5b1EOWPXpw7vvNqhXrD6V2",
      business_id: saleData.business_id || "classic-world-default",
      profile_id: saleData.profile_id || "default",
      is_isolated_tenant: true,
      created_at: createdAtTs,
    });
    console.log("Created cashbox_log:", newDoc.id);
  } else {
    console.log("Cashbox log already exists:", cbSnap.docs[0].id);
  }

  process.exit(0);
}

ensureSync().catch(console.error);
