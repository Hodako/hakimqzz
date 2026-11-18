import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const pSnap = await getDocs(collection(db, "products"));
  const products = [];
  pSnap.forEach(d => {
    const data = d.data();
    products.push({ id: d.id, ...data });
  });

  const logsSnap = await getDocs(collection(db, "activity_logs"));
  const logs = [];
  logsSnap.forEach(d => {
    logs.push({ id: d.id, ...d.data() });
  });

  const purSnap = await getDocs(collection(db, "purchases"));
  const purchases = [];
  purSnap.forEach(d => {
    purchases.push({ id: d.id, ...d.data() });
  });

  console.log("TOTAL_PRODUCTS:" + products.length);
  console.log("TOTAL_LOGS:" + logs.length);
  console.log("TOTAL_PURCHASES:" + purchases.length);

  // Group products by created date
  console.log("\n=== ALL PRODUCTS ADDED ===");
  products.sort((a, b) => {
    const da = a.created_at?.seconds || 0;
    const db = b.created_at?.seconds || 0;
    return db - da;
  });

  products.forEach((p, idx) => {
    const dateStr = p.created_at?.toDate ? p.created_at.toDate().toLocaleString("bn-BD") : "পূর্ববর্তী ডাটা";
    console.log(`${idx + 1}. ${p.name || 'Unknown'} | কোড: ${p.barcode || p.code || 'নেই'} | বর্তমান স্টক: ${p.stock || 0} পিস | ক্রয়: ৳${p.buy_price || 0} | বিক্রয়: ৳${p.sell_price || 0} | তারিখ: ${dateStr}`);
  });

  console.log("\n=== PRODUCTS EDITED / RESTOCKED IN ACTIVITY LOGS ===");
  logs.filter(l => l.category === "product").forEach(l => {
    const dateStr = l.created_at?.toDate ? l.created_at.toDate().toLocaleString("bn-BD") : "";
    console.log(`• [${l.action_type}] ${l.title} | ${l.details} | ইউজার: ${l.actor_name} (${l.actor_role}) | তারিখ: ${dateStr}`);
  });

  console.log("\n=== PRODUCTS WITH UPDATED_AT TIMESTAMP ===");
  products.filter(p => p.updated_at).forEach(p => {
    const uStr = p.updated_at?.toDate ? p.updated_at.toDate().toLocaleString("bn-BD") : "";
    console.log(`• ${p.name} | কোড: ${p.barcode || p.code} | স্টক: ${p.stock} | ক্রয়: ৳${p.buy_price} | বিক্রয়: ৳${p.sell_price} | আপডেট তারিখ: ${uStr}`);
  });

  process.exit(0);
}

run().catch(console.error);
