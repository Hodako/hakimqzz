# Pharmacy & Healthcare ERP — Sector Expert Implementation

## Core Capabilities Implemented
- **Locked Pharmacy Workspace (`/erp`)**: Locked automatically when tenant `industry === "pharmacy"` with three dedicated tabs:
  1. **Drug Inventory & POS**: Tracks medicine stock alongside `attributes.batch` (`batchId`) and `attributes.expiry` (`expireDate`), plus interactive batch filter pills (`All Batches`, `Expiring <= 90d`, `Expired Quarantine`, `Low Stock`). Expired drug batches are visually quarantined and automatically blocked from POS checkout.
  2. **Doctor / Rx Orders**: Structured prescription queue modeled on clinic/doctor order management (`doctorName`, `doctorID`, `doctorContact`, `drugNames`, `drugQuantity`, `pickupDate`) supporting a `Pending -> Verified -> Picked Up` workflow that loads verified prescriptions directly into the POS cart.
  3. **Suppliers & Drugs Directory**: Distributor management (`supplierID`, `name`, `email`, `contact`, `drugsAvailable` searchable tags) with automatic sync to Urobili supplier parties (`createPartyFn`) and direct restock links to `/purchases`.

## Recommended Next-Phase Enhancements
1. **FEFO (First-Expired, First-Out) Batch Picking**: Store multiple batches per medicine SKU in PostgreSQL and automatically pick the earliest non-expired batch during POS sales.
2. **Strip / Box / Piece Unit Conversion**: Allow purchasing by Box (100 tabs) and selling by Strip (10 tabs) or single tablet with automatic fractional stock calculation.
3. **Generic Name & Substitute Finder**: Index generic molecule names (`Paracetamol 500mg`) so pharmacists can recommend in-stock brand equivalents immediately.
