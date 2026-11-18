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
  console.log("=== CHECKING PRODUCTS IN FIRESTORE ===");
  const pSnap = await getDocs(collection(db, "products"));
  console.log(`Total products: ${pSnap.size}`);

  const added = [];
  const edited = [];

  pSnap.forEach(d => {
    const p = d.data();
    const cAt = p.created_at ? (p.created_at.toDate ? p.created_at.toDate() : p.created_at) : null;
    const uAt = p.updated_at ? (p.updated_at.toDate ? p.updated_at.toDate() : p.updated_at) : null;
    
    added.push({
      id: d.id,
      name: p.name,
      stock: p.stock,
      buy_price: p.buy_price,
      sell_price: p.sell_price,
      code: p.barcode || p.code,
      created_at: cAt,
    });

    if (uAt) {
      edited.push({
        id: d.id,
        name: p.name,
        stock: p.stock,
        buy_price: p.buy_price,
        sell_price: p.sell_price,
        code: p.barcode || p.code,
        updated_at: uAt,
      });
    }
  });

  console.log(`Products with explicit updated_at: ${edited.length}`);
  console.log("\n--- Sample of Added Products (first 10) ---");
  added.slice(0, 10).forEach((p, i) => {
    console.log(`${i+1}. [${p.id}] ${p.name} | Stock: ${p.stock} | Buy: ৳${p.buy_price} | Sell: ৳${p.sell_price} | Code: ${p.code} | Created: ${p.created_at}`);
  });

  if (edited.length > 0) {
    console.log("\n--- Products that have been Edited ---");
    edited.forEach((p, i) => {
      console.log(`${i+1}. [${p.id}] ${p.name} | Stock: ${p.stock} | Buy: ৳${p.buy_price} | Sell: ৳${p.sell_price} | Code: ${p.code} | Updated: ${p.updated_at}`);
    });
  }

  console.log("\n=== CHECKING ACTIVITY LOGS IN FIRESTORE ===");
  const logsSnap = await getDocs(collection(db, "activity_logs"));
  console.log(`Total activity_logs: ${logsSnap.size}`);
  logsSnap.forEach(d => {
    const l = d.data();
    const lAt = l.created_at ? (l.created_at.toDate ? l.created_at.toDate() : l.created_at) : null;
    console.log(`- [${d.id}] [${l.category}] [${l.action_type}] ${l.title} | ${l.details} | Actor: ${l.actor_name} (${l.actor_role}) | Date: ${lAt}`);
  });

  console.log("\n=== CHECKING PURCHASES (NEW STOCK ADDED) ===");
  const purSnap = await getDocs(collection(db, "purchases"));
  console.log(`Total purchase records (supplier/restock): ${purSnap.size}`);
  purSnap.forEach(d => {
    const pur = d.data();
    const purAt = pur.created_at ? (pur.created_at.toDate ? pur.created_at.toDate() : pur.created_at) : null;
    console.log(`- [${d.id}] Product: ${pur.product_name} | Qty: ${pur.qty} | Unit Cost: ৳${pur.unit_cost} | Total: ৳${pur.total} | Date: ${purAt}`);
  });

  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
