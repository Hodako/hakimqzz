const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const app = initializeApp({
  apiKey: 'AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc',
  authDomain: 'classicworld-pos.firebaseapp.com',
  projectId: 'classicworld-pos'
});
const db = getFirestore(app);

async function run() {
  const cSnap = await getDocs(collection(db, 'cashbox_logs'));
  const lines = [];
  cSnap.docs.forEach((d, idx) => {
    const data = d.data();
    lines.push(`${idx + 1} | id: ${d.id} | ref_id: ${data.ref_id} | kind: ${data.kind} | amt: ${data.amount} | owner: ${data.owner_id} | biz: ${data.business_id} | created: ${JSON.stringify(data.created_at)} | note: ${data.note}`);
  });
  fs.writeFileSync('cashbox_dump.txt', lines.join('\n'), 'utf8');
  console.log('Saved', lines.length, 'cashbox logs to cashbox_dump.txt');
}
run().catch(console.error);
