import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSync() {
  const salesSnap = await getDocs(collection(db, "sales"));
  const cbSnap = await getDocs(collection(db, "cashbox_logs"));

  const cbByRef = new Map();
  cbSnap.forEach(d => {
    const c = d.data();
    if (c.ref_id) cbByRef.set(c.ref_id, d.id);
  });

  console.log(`Total sales: ${salesSnap.size}, Total cashbox logs: ${cbSnap.size}`);

  let missingCb = 0;
  salesSnap.forEach(d => {
    const s = d.data();
    if (!cbByRef.has(d.id)) {
      console.log(`Sale WITHOUT cashbox log: id=${d.id} | product=${s.product_name} | sell=${s.sell_price} | type=${s.type} | owner=${s.owner_id}`);
      missingCb++;
    }
  });
  console.log(`Total sales missing cashbox log: ${missingCb}`);

  process.exit(0);
}
checkSync().catch(console.error);
