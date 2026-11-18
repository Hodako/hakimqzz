# Dream Fashion — Security, Auth, Access Control, Cashbox & Code Bugs Audit

> Scope: `dreamfashion` (`src/`). `Urobili/` and `Classic-World/` are untouched.
> Audited: 2026-11-18

---

## 1. Critical Authentication Flow Bugs

### [AUTH-01] Unauthenticated Account Takeover via `firebaseAuthSyncFn`
- **Location:** `src/lib/rpc-actions.ts` (`firebaseAuthSyncFn`, lines 690–753)
- **Root Cause:** `firebaseAuthSyncFn` accepts `{ email, fullName, firebaseUid, photoUrl }` and immediately looks up or creates the user in MongoDB and issues a signed JWT + `HttpOnly` `token` cookie **without verifying any Firebase ID token, password, or session**.
- **Impact:** Any unauthenticated caller can post `actionName: "firebaseAuthSyncFn"` with any victim's email to `/api/rpc` and receive a valid session token for that account.

### [AUTH-02] Hardcoded Fallback JWT Secret Accepted Always + Auto-Creation of Owner Accounts
- **Location:**
  - `src/lib/auth-helpers.ts` (`getSecret` lines 5–11, `verifyToken` lines 23–45)
  - `src/lib/session.ts` (`requireSession` lines 107–125)
- **Root Cause:**
  1. `verifyToken` always tries the hardcoded string `"dreamfashion-fallback-secret-key-123456"` even when `process.env.JWT_SECRET` is configured.
  2. If a valid JWT carries a `userId` that does not exist in `db.collection("users")`, `requireSession` automatically inserts a brand-new `owner` user with `activated: true`.
- **Impact:** Anyone knowing the fallback secret in source can mint an HS256 JWT for any existing or arbitrary `userId` and gain owner access.

### [AUTH-03] Case-Insensitive Password Matching in `comparePassword`
- **Location:** `src/lib/auth-helpers.ts` (`comparePassword`, lines 52–87)
- **Root Cause:** Fallback branches trim and lowercase both input and stored password (`pLower === lower`, `hLower === lower`), and `employeeLoginFn` (`src/lib/rpc-actions.ts` lines 336–340) also compares plaintext fields directly.
- **Impact:** Weakens password entropy and accepts wrong-case passwords.

### [AUTH-04] Client RPC Auto-Syncs With Cached `localStorage` Email & Synthesizes Invalid Fallback Tokens
- **Location:** `src/lib/rpc.ts` (`callRemoteRpc`, lines 25–96 and 120–173)
- **Root Cause:** When `auth_token` is missing or a request returns 401/403, the client reads `email` from `localStorage` (`dreamfashion_auth_profile` / `hz-auth-profile` / `user`) and calls `firebaseAuthSyncFn` without a Firebase ID token, or fabricates `token_${rawId}` / `token_emp_${rawId}` which `verifyToken` rejects.
- **Impact:** Breaks clean logout/session expiry and relies on the insecure `firebaseAuthSyncFn` bypass.

### [AUTH-05] Stale Auth State Not Cleared on Invalid/Expired Session & Incomplete Logout Cleanup
- **Location:** `src/hooks/use-auth.tsx` (`checkUser` lines 125–142, `logout` lines 162–173)
- **Root Cause:**
  1. When `getMeFn()` returns `user: null` or throws 401, `checkUser` only clears `user` if `auth_token` is already absent in `localStorage`. Otherwise, the stale cached `user` remains logged in on the client.
  2. `logout()` does not clear `df_active_employee_session`, `cw_active_employee_session`, `hz-brand`, or `df-offline-sync-queue`.

### [AUTH-06] Hardcoded `"1234"` Owner PIN Escalation & Unchecked `role` on Registration
- **Location:**
  - `src/app/auth/page.tsx` (`verifyQuickPinInput`, lines 96–107)
  - `src/lib/rpc-actions.ts` (`registerFn`, line 673)
- **Root Cause:**
  1. `verifyQuickPinInput` defaults `ownerPin` to `"1234"` if `app_pin_code_val` is not set, and entering `"1234"` clears `cw_active_employee_session` and sets `cw_active_session_role = "owner"`.
  2. `registerFn` accepts arbitrary `data.role || "owner"` without restricting allowed registration roles (and registering as `"employee"` without an `owner_id` creates an unusable account that fails `requireSession`).

---

## 2. Broken Access Control & Tenant Isolation Bugs

### [BAC-01] Unauthenticated Cross-Tenant Data Leak in `/api/ai-chat`
- **Location:** `src/app/api/ai-chat/route.ts` (lines 30–53)
- **Root Cause:** If `requireSession(false)` fails/returns `null`, `ownerId` remains `"default"`, and queries use `ownerId !== "default" ? { owner_id: ownerId } : {}` — an **empty filter `{}`** that reads products, sales, purchases, expenses, parties, and cashbox entries across **all tenants**.
- **Impact:** Unauthenticated callers can query and exfiltrate financial/inventory data from every business in the database.

### [BAC-02] Cross-Tenant IDOR on `products` in `createSaleFn`, `createPurchaseFn`, `editPurchaseFn`, `createReturnFn`
- **Location:** `src/lib/rpc-actions.ts`
  - `createSaleFn` (lines 1118–1119)
  - `createReturnFn` (lines 1502, 1514)
  - `createPurchaseFn` (lines 1908–1917)
  - `editPurchaseFn` (lines 2042–2048)
  - `restoreRecycleItemFn` (lines 5185–5239)
- **Root Cause:** `findOne` / `updateOne` on `products` (and `sales` / `cashbox_entries` in `restoreRecycleItemFn`) filter only by `_id` without `owner_id: session.ownerId`.
- **Impact:** A logged-in user can modify another business's product stock or prices by supplying their `product_id`.

### [BAC-03] Missing Backend Permission Enforcement for Employees Across RPCs
- **Location:** `src/lib/rpc-actions.ts` (throughout) and `src/lib/session.ts` (lines 191–199)
- **Root Cause:**
  1. `ROUTE_PERMISSIONS` (`src/lib/permissions.ts`) only hides/redirects routes on the client. Backend RPCs (`getCashboxFn`, `createCashboxFn`, `getExpensesFn`, `createExpenseFn`, `deleteExpenseFn`, `getPurchasesFn`, `createPurchaseFn`, `deletePurchaseFn`, `getOwnerWalletFn`, `createOwnerWalletEntryFn`, `updateOwnerWalletEntryFn`, `deleteOwnerWalletEntryFn`, `createEmployeeFn`, `deleteEmployeeFn`, `getBankAccountsFn`, `createBankTransactionFn`, etc.) only call `requireSession()` and **never verify `session.permissions` or `session.role`**.
  2. `session.ts` accepts any `activeProfile` string from cookie/request body without verifying that the profile belongs to `ownerUser.profiles` or that an employee is allowed to switch profiles.

---

## 3. Cash Merging From Nowhere & Cashbox Synchronization Bugs

### [CASH-01] `repairCashboxDbFn` Injects Phantom Cash, Loses Owner Withdrawals & Bank Flows, and Double-Counts Salaries/Expenses
- **Location:** `src/lib/rpc-actions.ts` (`repairCashboxDbFn`, lines 3277–3541)
- **Root Causes:**
  1. **Pending digital & online sales merged as cash:** Lines 3333–3345 add `bkash`/`bank`/`rocket` sales even when `payment_status === "pending"` (before `acceptDigitalPaymentFn` is called), and add `online` sales whenever `paid_amount > 0` even if `courier_status === "pending"`.
  2. **Wrong collection name for owner withdrawals:** Line 3302 queries `db.collection("withdrawals")` instead of `db.collection("owner_withdrawals")` (used by `createWithdrawalFn` at line 2364). Every owner withdrawal disappears from cashbox after repair!
  3. **Non-cash employee salaries & expenses deducted from cashbox:** `createEmployeeSalaryFn` (line 5579) and `createEmployeeExpenseFn` (line 5672) always insert an `expenses` document regardless of `payment_method` (e.g., bank/bKash), and `repairCashboxDbFn` deducts all `expenses` without checking whether `payment_method === "cash"` or whether it was already deleted!
  4. **Customer/party payments ignoring `payment_method`:** Lines 3499–3514 add the full `pay.amount` to cashbox even when `payment_method` is `bkash`, `bank`, or `split` (where only `split_cash` entered the physical cashbox).
  5. **Missing financial flows in repair:** `bank_transactions` (deposits/withdrawals with `sync_cashbox !== false`), `bank_loans` (`receive_to_cashbox`), `bank_loan_payments`, and `party_payable_settlements` are completely omitted from `repairCashboxDbFn`, so repairing the cashbox wipes those cash movements!
  6. **Broken `seenRefIds` init:** Line 3312 builds `seenRefIds` from `manualEntries` (`!e.ref_id`), which always yields an empty `Set`.

### [CASH-02] Deleted Employee Salaries & Expenses Leave Orphan `expenses` Records That Re-Appear in Cashbox
- **Location:** `src/lib/rpc-actions.ts` (`deleteEmployeeSalaryFn` lines 5603–5615, `deleteEmployeeExpenseFn` lines 5697–5704)
- **Root Cause:** Both delete from `cashbox_entries` and `employee_salaries`/`employee_expenses`, **but never delete the mirror document in `expenses`** (`note: "Employee Salary ID: ..."` / `"Employee Expense ID: ..."`). Running `repairCashboxDbFn` resurrects them as phantom cashbox deductions.

### [CASH-03] `editPurchaseFn` Fails to Sync Cashbox When Changing Between `cash` and `credit`
- **Location:** `src/lib/rpc-actions.ts` (`editPurchaseFn`, lines 2069–2084)
- **Root Cause:**
  - Editing a `credit` purchase to `cash` does not insert a cashbox deduction (`if (existingCashbox)` is `null`).
  - Editing a `cash` purchase to `credit` does not delete the existing cashbox deduction or expense record.

### [CASH-04] `createBankLoanFn` / `deleteBankLoanFn` & `createBankTransactionFn` Cashbox Edge Cases
- **Location:** `src/lib/rpc-actions.ts` (`createBankTransactionFn` lines 3594–3632, `createBankLoanFn` lines 3641–3675, `deleteBankLoanFn` lines 3724–3740)
- **Root Cause:**
  - `createBankTransactionFn` does not store `sync_cashbox` on `txDoc`, so `repairCashboxDbFn` cannot know whether a bank transaction should sync to cashbox.
  - `createBankLoanFn` stores `receive_to_cashbox` only in the input, not on `doc`, so `repairCashboxDbFn` cannot reconstruct loan disbursement cashbox entries.
  - `createPurchaseFn` (line 1922) deducts cashbox for any `payment_type !== "credit"`, including `"online"`/`"bank"`/`"bkash"` if passed from `purchase-dialog.tsx`, whereas `repairCashboxDbFn` (line 3394) skips `"bank"`! And `purchase-dialog.tsx` Split mode (`splitCash`, `splitOnline`, `splitCredit`) isn't wired up.

### [CASH-05] Offline Queue & Local Cache Key Mismatches
- **Location:** `src/lib/query-cache.ts` (lines 14–46), `src/lib/offline-sync.ts` (lines 14–120)
- **Root Cause:**
  - `df-offline-sync-queue` is NOT scoped per tenant/user (`QUEUE_KEY = "df-offline-sync-queue"`). If user A queues offline actions (including cashbox/sales) and logs out or switches to user B, user B's session replays user A's queued actions into user B's database and cashbox!
  - `query-cache.ts` checks `cw_active_employee_session` but not `df_active_employee_session`.

---

## 4. TypeScript & Runtime Errors in `dreamfashion`

### [ERR-01] Missing State & Type Mismatches in `purchase-dialog.tsx`
- **Location:** `src/components/purchase-dialog.tsx` (lines 280–300)
- **Root Cause:** `paymentType` is typed as `"cash" | "credit"`, but buttons call `setPaymentType("online")` and `setPaymentType("split")` plus undefined setters `setSplitCash`, `setSplitOnline`, `setSplitCredit` (causes `ReferenceError` at runtime when clicking Split!).

### [ERR-02] Missing `owners_wallet` Field in `more/page.tsx`
- **Location:** `src/app/(authenticated)/more/page.tsx` (line 2504)
- **Root Cause:** `setEmpPermissions({...})` omits `owners_wallet: false`, failing TypeScript compilation against `PermissionSet`.

### [ERR-03] `tsconfig.json` Includes `Urobili/` and `Classic-World/` Subfolders
- **Location:** `tsconfig.json`
- **Root Cause:** `tsc --noEmit` in `dreamfashion` scans `Urobili/` and `Classic-World/`, producing cross-repo type errors.
