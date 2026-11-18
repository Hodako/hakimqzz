import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Fetching sales...");
  const salesSnap = await getDocs(query(collection(db, "sales"), orderBy("created_at", "desc"), limit(20)));
  console.log("Total sales found (sample):", salesSnap.size);
  salesSnap.forEach(d => {
    const data = d.data();
    console.log("Sale ID:", d.id, "| product:", data.product_name, "| qty:", data.qty, "| sell_price:", data.sell_price, "| created_at:", data.created_at, "| owner_id:", data.owner_id, "| business_id:", data.business_id);
  });

  console.log("\nFetching cashbox_logs...");
  const cbSnap = await getDocs(query(collection(db, "cashbox_logs"), orderBy("created_at", "desc"), limit(20)));
  console.log("Total cashbox_logs found (sample):", cbSnap.size);
  cbSnap.forEach(d => {
    const data = d.data();
    console.log("CB ID:", d.id, "| kind:", data.kind, "| amount:", data.amount, "| ref_id:", data.ref_id, "| note:", data.note, "| created_at:", data.created_at, "| owner_id:", data.owner_id, "| business_id:", data.business_id);
  });
  process.exit(0);
}
check().catch(console.error);
