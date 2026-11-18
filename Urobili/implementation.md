# Urobili Multi-Sector ERP & POS — Master Implementation & Architecture Guide

This document defines the complete engineering audit, Phone vs. PC parity matrix, sector-expert blueprints, zero-data-loss storage/backup pipeline, and dynamic UI & module framework for **Urobili** (Next.js 15 + PostgreSQL + Android PWA / Capacitor).

---

## 1. Infrastructure Overview

- **Frontend & API Runtime**: Next.js 15 App Router (`src/app/`), React 19, Tailwind CSS v4, TanStack Query, Framer Motion.
- **Database Engine**: PostgreSQL (`src/lib/postgres.ts`, `src/lib/postgres-collection.ts`, `src/lib/db.ts`) with:
  - Global `app_documents` table for `users`, `businesses`, `licenses`, `super_admins`, `platform_settings`, `employee_device_codes`, `admin_popups`, `transfer_keys`.
  - Per-tenant isolated PostgreSQL schemas (`t_<ownerId>`) containing 43+ indexed JSONB tables (`products`, `sales`, `purchases`, `expenses`, `cashbox_entries`, `parties`, `customers`, `returns`, `owner_wallet`, `bank_accounts`, `bank_transactions`, `bank_loans`, `employees`, `employee_salaries`, `somiti_entries`, `restaurant_floors`, `restaurant_tables`, `restaurant_orders`, `restaurant_billing_queue`, etc.).
- **Authentication & RBAC**:
  - Cryptographic HS256 JWT (`src/lib/auth-helpers.ts`, `src/lib/session.ts`) via HttpOnly cookie + Bearer header (`src/lib/rpc.ts`).
  - Role enforcement (`owner`, `employee`, `superadmin`) with `requireOwner`, `requirePermission`, and `PermissionGuard` (`src/components/permission-guard.tsx`).
  - Industry lock enforced on `updateBusinessSettingsFn` (`src/lib/rpc-admin-actions.ts`) and `/erp` (`src/app/(authenticated)/erp/page.tsx`) so an owner cannot mutate `business_type` / `industry` once configured.
- **Mobile Distribution**:
  - Mobile browser gate (`src/components/mobile-browser-gate.tsx` + `src/styles/hallmark-landing.css`) prevents ERP execution in raw mobile browsers and renders the Hallmark-designed Android PWA installation landing page.
  - Installed Android PWA (`public/manifest.json`, `public/sw.js`) and Capacitor WebView (`android/`) connect directly to `/api/rpc` and `/api/upload` via `getApiBase()`.

---

## 2. Phone vs. PC Feature Parity & Gap Matrix

| Capability | PC / Desktop | Phone (Installed PWA / Web App) | Status & Action Plan |
| --- | --- | --- | --- |
| **Industry Identity & Quick Actions** | Industry banner, characteristic badges, quick links | Horizontal industry quick-action pills on `/dashboard` | Implemented in `src/app/(authenticated)/dashboard/page.tsx` |
| **Header Switcher** | Single unified Owner/Profile pill | Single compact `size-8` icon switcher | Implemented in `src/components/app-shell.tsx` |
| **Restaurant Multi-Floor & Capacity** | Owner sets floors & seat capacities; Waiter toggles Free/Occupied | Multi-floor pill filter + Seat capacity badge + Mark Free/Occupied | Implemented in `src/app/(authenticated)/restaurant/page.tsx` |
| **Restaurant Cashier Billing Queue** | Full `Bill Queue` view (Print, Pass Bill, Cancel) | `To Queue` button in Mobile Waiter cart drawer | Implemented; **Next**: add mobile `Bill Queue` & `KDS` sub-tabs for phone cashiers |
| **Thermal Receipt & KOT Print** | Dedicated 80mm print window (`openThermalPrintWindow`) | Same helper; **Next**: add Bluetooth/ESC-POS raw print bridge on Android Capacitor | Print window fixed; Android BT bridge planned |
| **PC Dashboard UI Variations** | `PcThemeQuickStudio` (Presets, Backdrops, Fonts, Accent & Text Colors) + `EmeraldGlassStudio` | Automatic light/dark theme | Implemented in `src/components/pc-theme-quick-studio.tsx` |
| **Dynamic Module & KPI Customizer** | Sidebar + Dashboard + Settings (`ModuleCustomizerDialog`) | Respects disabled modules & KPIs automatically | Implemented in `src/components/module-customizer-dialog.tsx` |
| **Barcode Camera Scanner** | USB/HID Scanner + Webcam | Camera barcode scanner dialog | **Next**: unify single-tap scan-to-cart shortcut on phone `/sales` |
| **Offline Queue & Auto-Sync** | Offline queue (`src/lib/offline-sync.ts`) | Offline queue + PWA service worker cache | **Next**: add offline optimistic handlers for `enqueueBillFn` & `upsertRestaurantTableFn` |

---

## 3. Business Growth Features & What Improves Each Sector

### Cross-Sector Business Improvements
1. **Dead-Stock & Slow-Mover Alerts**: Surface items with zero sales in 30/60/90 days on `/product-analytics` and suggest clearance discounts.
2. **Customer Credit Limit & Auto WhatsApp/SMS Reminders**: Enforce max credit/due limits per party and schedule automated due reminders via `/sms`.
3. **Shift Closing & Z-Report Reconciliation**: End-of-day drawer count vs. PostgreSQL cashbox delta (`expected_cash` vs `counted_cash`) to prevent cashier shrinkage.
4. **Multi-Branch Stock Transfer**: One-click stock transfer between `profiles` (branches) with audit trail in `activity_logs`.
5. **Zero-Data-Loss Dual Backup**:
   - **Real-time Google Sheets Sync** (`src/lib/google-sheets.ts`) covering 15+ tabs including Sales, Products, Expenses, Cashbox, Purchases, Parties, Returns, Owner Wallet, Bank Accounts, and Restaurant Tables/Orders/Queue — with strict HTTP 401/403 detection so expired tokens never silently report success.
   - **1-Click Full PostgreSQL JSON Snapshot** (`exportFullBackupFn` in `src/lib/rpc-actions.ts` & `settings/page.tsx`) for instant offline archival.

---

## 4. Sector-Specific Expert Modules (`docs/sectors/`)

Detailed implementation specs for each vertical:
- [Restaurant & Cafe ERP](file:///c:/Users/Windows/Downloads/dreamfashion/Urobili/docs/sectors/restaurant.md)
- [Fashion & Boutique ERP](file:///c:/Users/Windows/Downloads/dreamfashion/Urobili/docs/sectors/fashion.md)
- [Pharmacy & Healthcare ERP](file:///c:/Users/Windows/Downloads/dreamfashion/Urobili/docs/sectors/pharmacy.md)
- [Electronics & Gadgets ERP](file:///c:/Users/Windows/Downloads/dreamfashion/Urobili/docs/sectors/electronics.md)
- [Grocery & Superstore ERP](file:///c:/Users/Windows/Downloads/dreamfashion/Urobili/docs/sectors/grocery.md)

---

## 5. Lightning-Fast Performance & Zero-Data-Loss Standards

1. **Instant Hydration (`useCachedQuery`)**: All read queries hydrate immediately from `localStorage` (`src/lib/query-cache.ts`) and revalidate in the background (`staleTime: 60s`).
2. **Parallel PostgreSQL Queries**: Heavy aggregation endpoints (`bulkExportToGoogleSheets`, `exportFullBackupFn`, `/restaurant` initial load) execute via `Promise.all` with GIN JSONB indexes on every tenant table (`scripts/sync-postgres-schemas.mjs`).
3. **Strict Mutation Integrity**: Every write endpoint verifies session, role (`requireOwner` / `requirePermission`), and `owner_id` tenant isolation before mutating PostgreSQL.
4. **No Silent Failures**: Google Sheets sync and backup actions verify upstream HTTP status codes and surface actionable reconnection prompts on expired OAuth tokens.

---

## 6. Dynamic Module Architecture (Settings-Driven)

1. Registry & Industry Profiles live in `src/lib/module-config.ts` (`MODULE_CATALOG`, `KPI_CATALOG`, `getIndustryProfile`, `getIndustryDefaultDisabledModules`).
2. Owners customize enabled modules, KPIs, and custom navigation items via `ModuleCustomizerDialog` (`src/components/module-customizer-dialog.tsx`) accessible from both the Sidebar and `/settings`.
3. Configurations persist to `businesses.module_config` in PostgreSQL via `updateBusinessSettingsFn` and broadcast live updates via the `urobili-module-config-updated` event.

---

## 7. PC Dashboard UI Variations & Theme Engine

- `src/components/pc-theme-quick-studio.tsx` + `src/components/custom-theme-manager.tsx` + `src/lib/emerald-theme.ts` power instant switching of:
  - **6 UI Presets**: *Emerald Glass*, *Frosted Glass*, *Warm Paper*, *Midnight Ink*, *Bold Brutalism*, *Classic Clean*.
  - **6+ Glass & Dashboard Wallpapers**: Including `/glass-refresh-bg.jpg` (Refreshing Mint Aurora), *Emerald Botanical*, *Warm Abstract*, *Silk Mesh*, *Soft Studio*, or custom URL.
  - **Typography**: System UI, *Schibsted Grotesk*, *Plus Jakarta Sans*, *Instrument Sans*, *Hind Siliguri (বাংলা)*, *DM Mono*.
  - **Accent & Text Colors**: Live swatch + native color picker for brand primary and foreground text ink.
