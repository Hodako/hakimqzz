# Grocery & Superstore ERP — Sector Expert Implementation

## Core Capabilities Implemented
- **Locked Grocery Workspace**: `/erp` locked to `grocery` with unit tracking (`Kg`, `Litre`, `Pcs`), wholesale pricing tiers (`attributes.unit`, `attributes.wholesale`), low-stock alerts, and fast counter POS.

## Recommended Next-Phase Enhancements
1. **Weighted Barcode Parsing (EAN-13 Price/Weight Scales)**: Parse scale-printed barcodes (`20XXXXXWWWWW C`) automatically into item weight and price at checkout.
2. **Hold & Resume Cart**: Allow cashiers to park a walk-in customer's large cart when another customer has 1-2 items, then resume in one click.
3. **Dynamic Wholesale Quantity Tiers**: Auto-switch from retail unit price to wholesale price when cart quantity crosses threshold (e.g. `>= 12 pcs`).
