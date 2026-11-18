import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkOwnerSales() {
  const ownerId = "CrkR0F5b1EOWPXpw7vvNqhXrD6V2";
  console.log(`--- SALES FOR ${ownerId} ---`);
  const salesSnap = await getDocs(query(collection(db, "sales"), where("owner_id", "==", ownerId)));
  console.log(`Found ${salesSnap.size} sales`);
  salesSnap.forEach(d => {
    const s = d.data();
    const dt = s.created_at?.toDate ? s.created_at.toDate() : new Date(s.created_at);
    console.log(`Sale: ${d.id} | Product: ${s.product_name} | Qty: ${s.qty} | Sell: ${s.sell_price} | Paid: ${s.paid_amount} | Due: ${s.due_amount} | Type: ${s.type} | Date: ${dt.toISOString()} (${dt.toLocaleString("en-US", { timeZone: "Asia/Dhaka" })})`);
  });

  console.log(`\n--- CASHBOX LOGS FOR ${ownerId} ---`);
  const cbSnap = await getDocs(query(collection(db, "cashbox_logs"), where("owner_id", "==", ownerId)));
  console.log(`Found ${cbSnap.size} cashbox logs`);
  cbSnap.forEach(d => {
    const c = d.data();
    const dt = c.created_at?.toDate ? c.created_at.toDate() : new Date(c.created_at);
    console.log(`Cashbox: ${d.id} | Kind: ${c.kind} | Amount: ${c.amount} | Ref: ${c.ref_id} | Note: ${c.note} | Date: ${dt.toISOString()} (${dt.toLocaleString("en-US", { timeZone: "Asia/Dhaka" })})`);
  });

  process.exit(0);
}
checkOwnerSales().catch(console.error);
