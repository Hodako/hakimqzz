import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findSaleDoc() {
  const targetId = "IQImdqk6875Wu689kVzB";
  console.log(`Checking doc ${targetId} in sales collection...`);
  const snap = await getDoc(doc(db, "sales", targetId));
  if (snap.exists()) {
    console.log("FOUND in sales:", snap.data());
  } else {
    console.log("NOT FOUND in sales!");
  }

  console.log(`Checking in recycle_bin...`);
  const rbSnap = await getDoc(doc(db, "recycle_bin", targetId));
  if (rbSnap.exists()) {
    console.log("FOUND in recycle_bin:", rbSnap.data());
  } else {
    console.log("NOT in recycle_bin");
  }

  // Also search any sale with product_name "RIPET BELT"
  console.log(`Searching for product_name containing RIPET...`);
  const allSales = await getDocs(collection(db, "sales"));
  allSales.forEach(d => {
    const s = d.data();
    if (s.product_name && s.product_name.includes("RIPET")) {
      console.log("Matched RIPET sale:", d.id, s);
    }
  });

  process.exit(0);
}
findSaleDoc().catch(console.error);
