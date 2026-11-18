# Restaurant & Cafe ERP — Sector Expert Implementation

## Core Capabilities Implemented
- **Owner ERP Dashboard** (`/restaurant` -> `Owner Dashboard`): Live today revenue, estimated food profit, floor-by-floor occupancy, seat capacity tracking, and active KDS count.
- **Multi-Floor & Table Capacity Management**: Owners create/delete floors (`restaurant_floors`) and set seat capacity per table (`restaurant_tables`); non-owners are blocked server-side (`upsertRestaurantTableFn`).
- **Waiter Mode (Phone & PC)**: Multi-floor pill filter, seat capacity display, one-tap **Mark Free / Mark Occupied**, KOT dispatch to kitchen, and **To Queue** dispatch to cashier.
- **Kitchen Display System (KDS)**: Real-time KOT status pipeline (`pending` -> `preparing` -> `ready` -> `served`).
- **Cashier Billing Queue**: Sequenced queue tokens (`Q-001`+) in `restaurant_billing_queue`; cashiers **Print** 80mm thermal bills, **Pass Bill** (creates sale + updates cashbox + frees table), or **Cancel**.

## Recommended Next-Phase Enhancements
1. **Recipe / Ingredient BOM Deduction**: Link menu dishes to raw ingredient SKUs (`products`) so each KOT deducts flour/meat/oil grams automatically.
2. **Table Merge, Split & Transfer**: Allow moving an active cart from Table 2 to VIP 1 or splitting a single table bill across multiple payment methods (`cash` + `bkash`).
3. **Mobile Cashier Queue & KDS Tabs**: Expose `Bill Queue` and `KDS` inside the phone bottom bar for managers/cashiers using phones.
4. **Combo / Modifier Pricing**: Add paid modifiers (extra cheese, drink size upgrade) directly onto `CartItem` price calculation.
