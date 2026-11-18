const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc',
  authDomain: 'classicworld-pos.firebaseapp.com',
  projectId: 'classicworld-pos'
});
const db = getFirestore(app);

function toEpoch(val) {
  if (!val) return 0;
  if (typeof val === 'object') {
    if (val.toMillis) return val.toMillis();
    if (val.seconds) return val.seconds * 1000;
  }
  return new Date(val).getTime() || 0;
}

async function main() {
  console.log('--- FETCHING SALES ---');
  const sSnap = await getDocs(collection(db, 'sales'));
  console.log('Total sales count:', sSnap.size);

  const allSales = [];
  sSnap.docs.forEach(d => {
    const data = d.data();
    const t = toEpoch(data.created_at || data.date);
    allSales.push({
      id: d.id,
      epoch: t,
      iso: new Date(t).toISOString(),
      owner_id: data.owner_id,
      business_id: data.business_id,
      activeProfile: data.activeProfile,
      product: (data.items && data.items[0]?.name) || data.product_name,
      paid: data.paid_amount,
      total: data.total,
      type: data.payment_type || data.type,
      inv: data.invoice_number,
      created_at_raw: data.created_at
    });
  });

  allSales.sort((a,b) => b.epoch - a.epoch);

  console.log('\n--- FETCHING CASHBOX LOGS ---');
  const cSnap = await getDocs(collection(db, 'cashbox_logs'));
  console.log('Total cashbox count:', cSnap.size);

  const allCashbox = [];
  cSnap.docs.forEach(d => {
    const data = d.data();
    const t = toEpoch(data.created_at || data.date);
    allCashbox.push({
      id: d.id,
      epoch: t,
      iso: new Date(t).toISOString(),
      kind: data.kind,
      amount: data.amount,
      note: data.note,
      ref_id: data.ref_id,
      owner_id: data.owner_id,
      business_id: data.business_id,
      created_at_raw: data.created_at
    });
  });

  allCashbox.sort((a,b) => b.epoch - a.epoch);

  console.log('\n=== RECENT CASHBOX LOGS (Nov 11, 12, 13) ===');
  const recentCb = allCashbox.filter(c => c.iso >= '2026-11-11T00:00:00Z');
  recentCb.forEach(c => {
    console.log(`CB [${c.id}] ${c.iso} | kind: ${c.kind} | amt: ${c.amount} | ref: ${c.ref_id} | owner: ${c.owner_id} | biz: ${c.business_id} | note: ${c.note}`);
  });

  console.log('\n=== RECENT SALES (Nov 11, 12, 13) ===');
  const recentSales = allSales.filter(s => s.iso >= '2026-11-11T00:00:00Z');
  recentSales.forEach(s => {
    console.log(`SALE [${s.id}] ${s.iso} | paid: ${s.paid} | total: ${s.total} | type: ${s.type} | prod: ${s.product} | owner: ${s.owner_id} | biz: ${s.business_id} | activeProfile: ${s.activeProfile}`);
  });

  console.log('\n=== MATCHING CASHBOX LOGS WITH SALES ===');
  recentCb.forEach(c => {
    if (c.kind === 'sale' || c.ref_id) {
      const match = allSales.find(s => s.id === c.ref_id);
      if (match) {
        console.log(`MATCHED: CB [${c.id}] -> SALE [${match.id}] (prod: ${match.product}, sale owner: ${match.owner_id}, cb owner: ${c.owner_id})`);
      } else {
        console.log(`MISSING SALE: CB [${c.id}] has ref_id: ${c.ref_id} (amt: ${c.amount}, note: ${c.note}, cb owner: ${c.owner_id}) - NO SALE DOC WITH THIS ID!`);
      }
    }
  });

  // Also check if any sale has owner CrkR0F5b1EOWPXpw7vvNqhXrD6V2 (classicworld770@gmail.com)
  console.log('\n=== ALL SALES FOR USER CrkR0F5b1EOWPXpw7vvNqhXrD6V2 ===');
  const ownerSales = allSales.filter(s => s.owner_id === 'CrkR0F5b1EOWPXpw7vvNqhXrD6V2' || s.business_id === 'classic-world-default');
  ownerSales.forEach(s => {
    console.log(`OWNER SALE [${s.id}] ${s.iso} | paid: ${s.paid} | prod: ${s.product} | owner: ${s.owner_id} | biz: ${s.business_id}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
