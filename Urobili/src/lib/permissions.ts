export type PermissionSet = {
  dashboard: boolean;
  products: boolean;
  sales: boolean;
  parties: boolean;
  purchases: boolean;
  expenses: boolean;
  cashbox: boolean;
  somiti: boolean;
  profit_loss: boolean;
  settings: boolean;
  reports: boolean;
  danger_zone: boolean;
  owners_wallet: boolean;
  owners_wallet_edit?: boolean;
  can_returns?: boolean;
  can_discount?: boolean;
  can_delete?: boolean;
};

export const OWNER_PERMISSIONS: PermissionSet = {
  dashboard: true,
  products: true,
  sales: true,
  parties: true,
  purchases: true,
  expenses: true,
  cashbox: true,
  somiti: true,
  profit_loss: true,
  settings: true,
  reports: true,
  danger_zone: true,
  owners_wallet: true,
  owners_wallet_edit: true,
  can_returns: true,
  can_discount: true,
  can_delete: true,
};

export const DEFAULT_EMPLOYEE_PERMISSIONS: PermissionSet = {
  dashboard: true,
  products: true,
  sales: true,
  parties: false,
  purchases: false,
  expenses: false, // Default false, owner must grant
  cashbox: false,  // Default false, owner must grant
  somiti: false,   // Default false, owner must grant
  profit_loss: false, // Default false, owner must grant
  settings: false,
  reports: false,
  danger_zone: false,
  owners_wallet: false, // Strictly false by default for employees
  owners_wallet_edit: false, // Strictly false by default for employees
  can_returns: true,
  can_discount: false,
  can_delete: false,
};

/** Resolve effective permissions for the current user. */
export function resolvePermissions(role: string, permissions?: any): PermissionSet {
  if (role === "owner" || role === "admin" || role === "superadmin") return OWNER_PERMISSIONS;

  // Base default permissions for staff
  const base: PermissionSet = { ...DEFAULT_EMPLOYEE_PERMISSIONS };
  if (!permissions || typeof permissions !== "object") return base;

  // Normalize legacy "can_*" keys and standard keys
  const has = (k: string) => k in permissions;

  base.dashboard = true;

  if (has("sales")) base.sales = Boolean(permissions.sales);
  else if (has("can_sales")) base.sales = Boolean(permissions.can_sales);
  else base.sales = true;

  if (has("products")) base.products = Boolean(permissions.products);
  else if (has("can_products")) base.products = Boolean(permissions.can_products);
  else base.products = true;

  if (has("expenses")) base.expenses = Boolean(permissions.expenses);
  else if (has("can_expenses")) base.expenses = Boolean(permissions.can_expenses);
  else base.expenses = false;

  if (has("cashbox")) base.cashbox = Boolean(permissions.cashbox);
  else if (has("can_cashbox")) base.cashbox = Boolean(permissions.can_cashbox);
  else base.cashbox = false;

  // Somiti: default false for staff unless owner explicitly granted it
  if (has("somiti")) base.somiti = Boolean(permissions.somiti);
  else if (has("can_somiti")) base.somiti = Boolean(permissions.can_somiti);
  else base.somiti = false;

  // Profit / Loss: default false for staff unless owner explicitly granted it
  if (has("profit_loss")) base.profit_loss = Boolean(permissions.profit_loss);
  else if (has("can_profit_loss")) base.profit_loss = Boolean(permissions.can_profit_loss);
  else base.profit_loss = false;

  if (has("parties")) base.parties = Boolean(permissions.parties);
  else if (has("can_customers")) base.parties = Boolean(permissions.can_customers);

  if (has("purchases")) base.purchases = Boolean(permissions.purchases);
  else if (has("can_purchases")) base.purchases = Boolean(permissions.can_purchases);

  if (has("settings")) base.settings = Boolean(permissions.settings);
  else if (has("can_settings")) base.settings = Boolean(permissions.can_settings);

  if (has("reports")) base.reports = Boolean(permissions.reports);
  else if (has("can_reports")) base.reports = Boolean(permissions.can_reports);

  // Owners Wallet: strictly false unless owner explicitly granted it
  if (has("owners_wallet")) base.owners_wallet = Boolean(permissions.owners_wallet);
  else if (has("can_owners_wallet")) base.owners_wallet = Boolean(permissions.can_owners_wallet);
  else base.owners_wallet = false;

  // Owners Wallet Edit: strictly false unless owner explicitly granted it
  if (has("owners_wallet_edit")) base.owners_wallet_edit = Boolean(permissions.owners_wallet_edit);
  else if (has("can_owners_wallet_edit")) base.owners_wallet_edit = Boolean(permissions.can_owners_wallet_edit);
  else base.owners_wallet_edit = false;

  // Granular action permissions
  if (has("can_returns")) base.can_returns = Boolean(permissions.can_returns);
  if (has("can_discount")) base.can_discount = Boolean(permissions.can_discount);
  if (has("can_delete")) base.can_delete = Boolean(permissions.can_delete);

  return base;
}

/** Check if user permissions allow a module. */
export function canAccess(permissions: PermissionSet | undefined, module: keyof PermissionSet) {
  return permissions?.[module] ?? false;
}

/** Route prefix → required permission (employees without access are redirected). */
export const ROUTE_PERMISSIONS: { prefix: string; perm: keyof PermissionSet }[] = [
  { prefix: "/owners-wallet", perm: "owners_wallet" },
  { prefix: "/owner-expense", perm: "owners_wallet" },
  { prefix: "/parties", perm: "parties" },
  { prefix: "/customers", perm: "parties" },
  { prefix: "/dues", perm: "parties" },
  { prefix: "/expenses", perm: "expenses" },
  { prefix: "/trackback", perm: "reports" },
  { prefix: "/cash-management", perm: "cashbox" },
  { prefix: "/somiti", perm: "somiti" },
  { prefix: "/profits", perm: "profit_loss" },
  { prefix: "/losses", perm: "profit_loss" },
  { prefix: "/settings", perm: "settings" },
  { prefix: "/employees", perm: "sales" },
  { prefix: "/employee-hub", perm: "sales" },
  { prefix: "/printer-settings", perm: "sales" },
  { prefix: "/invoices", perm: "sales" },
  { prefix: "/purchases", perm: "purchases" },
  { prefix: "/labels", perm: "products" },
  { prefix: "/restaurant", perm: "sales" },
  { prefix: "/erp", perm: "products" },
];

/** Return required permission for a pathname, if any. */
export function permissionForPath(pathname: string): keyof PermissionSet | null {
  const match = ROUTE_PERMISSIONS.find(r => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return match?.perm ?? null;
}
