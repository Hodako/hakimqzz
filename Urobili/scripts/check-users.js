import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc",
  authDomain: "classicworld-pos.firebaseapp.com",
  projectId: "classicworld-pos",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUsers() {
  console.log("--- USERS ---");
  const s = await getDocs(collection(db, "users"));
  s.forEach(d => {
    const u = d.data();
    console.log("User doc:", d.id, "| email:", u.email, "| role:", u.role, "| owner_id:", u.owner_id, "| business_id:", u.business_id, "| full_name:", u.full_name);
  });

  console.log("\n--- EMPLOYEES ---");
  const empSnap = await getDocs(collection(db, "employees"));
  empSnap.forEach(d => {
    const e = d.data();
    console.log("Emp doc:", d.id, "| name:", e.name, "| owner_id:", e.owner_id, "| business_id:", e.business_id);
  });

  process.exit(0);
}
checkUsers().catch(console.error);
