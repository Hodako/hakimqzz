const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAZ0uwpS0CRqv-xRA9ZgDglY4KNAHIpyHc',
  authDomain: 'classicworld-pos.firebaseapp.com',
  projectId: 'classicworld-pos'
});
const db = getFirestore(app);

// Simulate user classicworld770@gmail.com
const user = {
  id: 'CrkR0F5b1EOWPXpw7vvNqhXrD6V2',
  email: 'classicworld770@gmail.com',
  role: 'owner',
  business_id: 'classic-world-default',
  activeProfile: 'default'
};

function getTenantScope(user) {
  const activeProfile = user.activeProfile || 'default';
  const rawOwner = String(user.owner_id || user.owner_uid || user.id || '');
  const rootOwnerId = rawOwner ? rawOwner.split(':')[0] : user.id;
  const isLegacyRoot = Boolean(user.role === 'superadmin' && user.email && user.email.toLowerCase().trim() === 'classicworld@gmail.com');
  const isIsolatedTenant = !isLegacyRoot;
  const effectiveOwnerId = activeProfile !== 'default' ? `${rootOwnerId}:${activeProfile}` : rootOwnerId;
  return { user, rootOwnerId, activeProfile, isIsolatedTenant, effectiveOwnerId };
}

function belongsToCurrentTenant(docData, scope) {
  if (!scope.user) return false;
  const docOwner = docData?.owner_id || docData?.owner_uid || null;
  const docBusiness = docData?.business_id || null;
  const docProfile = docData?.profile_id || 'default';

  if (scope.user.role === 'employee') {
    // ...
    return false;
  }

  const allowedOwnerIds = new Set(
    [scope.rootOwnerId, scope.effectiveOwnerId, scope.user.id, scope.user._id].filter(Boolean)
  );

  const matchesOwner = Boolean(docOwner && allowedOwnerIds.has(docOwner));
  const matchesBiz = Boolean(
    scope.user.business_id &&
    scope.user.business_id !== 'classic-world-default' &&
    docBusiness &&
    docBusiness === scope.user.business_id
  );

  console.log('belongsToCurrentTenant check:', {
    docOwner,
    docBusiness,
    allowedOwnerIds: Array.from(allowedOwnerIds),
    matchesOwner,
    matchesBiz
  });

  if (!matchesOwner && !matchesBiz) {
    const isMasterAdmin = scope.user.email?.toLowerCase().trim() === 'classicworld@gmail.com' && scope.user.role === 'superadmin';
    if (isMasterAdmin && (docOwner === 'classic-world-default' || !docOwner)) {
      return true;
    }
    return false;
  }

  if (scope.activeProfile !== 'default') {
    return docOwner === scope.effectiveOwnerId || docProfile === scope.activeProfile;
  }
  return docProfile === 'default' || !docProfile;
}

async function test() {
  const scope = getTenantScope(user);
  console.log('Scope:', scope);

  const sSnap = await getDoc(doc(db, 'sales', 'IQImdqk6875Wu689kVzB'));
  const sale = sSnap.data();
  console.log('\n--- TESTING SALE IQImdqk6875Wu689kVzB ---');
  console.log('Sale belongsToCurrentTenant:', belongsToCurrentTenant(sale, scope));

  const cSnap = await getDoc(doc(db, 'cashbox_logs', 'ig3ZMYQYdJGH4u5076Rg'));
  const cb = cSnap.data();
  console.log('\n--- TESTING CASHBOX ig3ZMYQYdJGH4u5076Rg ---');
  console.log('Cashbox belongsToCurrentTenant:', belongsToCurrentTenant(cb, scope));

  // Now test Date Parsing
  console.log('\n--- TESTING DATE PARSING ---');
  console.log('Sale raw created_at:', sale.created_at);
  const saleDate = sale.created_at.toDate();
  console.log('Sale toDate():', saleDate.toISOString(), 'Local string:', saleDate.toString());
  console.log('Sale en-CA:', saleDate.toLocaleDateString('en-CA'));

  // What does docToData do?
  let createdAtStr = new Date().toISOString();
  if (sale?.created_at?.toDate) createdAtStr = sale.created_at.toDate().toISOString();
  console.log('docToData created_at string:', createdAtStr);

  // Now test reports/page.tsx inDateRange when preset is "yesterday"
  const now = new Date();
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const from = y.toLocaleDateString('en-CA');
  const to = from;
  console.log('\nReports preset yesterday range:', { from, to, nowLocal: now.toLocaleDateString('en-CA') });

  // Test inDateRange in reports/page.tsx:
  // inDateRange receives s.created_at which is createdAtStr from docToData!
  // In reports/page.tsx:
  // if (typeof dateInput === "string") { dStr = dateInput.slice(0, 10); }
  const dStrReports = createdAtStr.slice(0, 10);
  console.log('reports/page.tsx dStr:', dStrReports, 'inRange:', Boolean(dStrReports && dStrReports >= from && dStrReports <= to));

  // Now test sales/page.tsx inDateRange:
  // in sales/page.tsx:
  // const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  // const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // return d >= yesterdayStart && d < yesterdayEnd;
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dSales = new Date(createdAtStr);
  console.log('\nsales/page.tsx dSales:', dSales.toString());
  console.log('sales/page.tsx yesterdayStart:', yesterdayStart.toString());
  console.log('sales/page.tsx yesterdayEnd:', yesterdayEnd.toString());
  console.log('sales/page.tsx inRange:', dSales >= yesterdayStart && dSales < yesterdayEnd);
}

test().catch(console.error);
