import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findRipetCashbox() {
  const allLogs = await getDocs(collection(db, "cashbox_logs"));
  console.log("Total cashbox_logs:", allLogs.size);
  let found = 0;
  allLogs.forEach(d => {
    const c = d.data();
    if (c.ref_id === "IQImdqk6875Wu689kVzB" || (c.note && c.note.includes("RIPET"))) {
      console.log("Found RIPET log:", d.id, c);
      found++;
    }
  });
  if (found === 0) {
    console.log("No RIPET cashbox log found! Checking doc P2e9apYx2FPMR1ibfGxo...");
    const snap = await getDoc(doc(db, "cashbox_logs", "P2e9apYx2FPMR1ibfGxo"));
    if (snap.exists()) {
      console.log("Doc P2e9apYx2FPMR1ibfGxo exists:", snap.data());
    } else {
      console.log("Doc P2e9apYx2FPMR1ibfGxo DOES NOT EXIST!");
    }
  }
  process.exit(0);
}
findRipetCashbox().catch(console.error);
