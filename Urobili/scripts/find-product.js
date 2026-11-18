import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findProduct() {
  const allProds = await getDocs(collection(db, "products"));
  console.log(`Found ${allProds.size} products`);
  allProds.forEach(d => {
    const p = d.data();
    if (p.name && (p.name.toLowerCase().includes("ripet") || p.name.toLowerCase().includes("belt"))) {
      console.log(`Matched: id=${d.id} | name=${p.name} | stock=${p.stock} | buy_price=${p.buy_price} | sell_price=${p.sell_price} | owner_id=${p.owner_id}`);
    }
  });
  process.exit(0);
}
findProduct().catch(console.error);
