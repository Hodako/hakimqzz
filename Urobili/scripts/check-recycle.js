import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRecycle() {
  const targetId = "sales_IQImdqk6875Wu689kVzB";
  const snap = await getDoc(doc(db, "recycle_bin", targetId));
  if (snap.exists()) {
    console.log("FOUND in recycle_bin with sales_ prefix:", snap.data());
  } else {
    console.log("NOT in recycle_bin with sales_ prefix");
  }

  console.log("Listing all recycle_bin entries:");
  const allRb = await getDocs(collection(db, "recycle_bin"));
  allRb.forEach(d => {
    console.log(d.id, d.data().label, d.data().collection_name, d.data().deleted_at);
  });

  process.exit(0);
}
checkRecycle().catch(console.error);
