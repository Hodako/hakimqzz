import * as jose from "jose";
import { getDb } from "@/lib/db";

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const pkcs8Key = privateKey.replace(/\\n/g, "\n");
  const alg = "RS256";

  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg })
    .sign(await jose.importPKCS8(pkcs8Key, alg));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets Auth failed: ${errText}`);
  }

  const tokenData = await res.json();
  return tokenData.access_token as string;
}

async function getEffectiveToken(biz: any): Promise<string | null> {
  if (biz.google_sheets_access_token) {
    return biz.google_sheets_access_token as string;
  }
  if (biz.google_sheets_credentials_json) {
    try {
      const creds = JSON.parse(biz.google_sheets_credentials_json.trim());
      if (creds.client_email && creds.private_key) {
        return await getAccessToken(creds.client_email, creds.private_key);
      }
    } catch {
      console.error("Failed to parse Google Sheets Credentials JSON");
    }
  }
  return null;
}

export async function appendRowToGoogleSheet(
  ownerId: string,
  tabName: string,
  headers: string[],
  row: any[],
) {
  try {
    const db = await getDb();
    const biz = (await db.collection("businesses").findOne({ owner_id: ownerId })) ||
                (await db.collection("businesses").findOne({ _id: ownerId as any }));
    if (!biz) return;

    // Feature Turn On / Off toggle check
    if (biz.google_sheets_sync_enabled === false) {
      return;
    }

    const spreadsheetId = biz.google_sheets_spreadsheet_id as string | undefined;
    if (!spreadsheetId) return;

    const token = await getEffectiveToken(biz);
    if (!token) return;

    // Google values.append endpoint
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${tabName}'!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    // Sheets append endpoint will automatically write the values
    const appendRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [row],
      }),
    });

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      console.error(`Failed to append row to sheet ${tabName}: ${errText}`);
      
      // If the sheet tab does not exist, the API will fail. We can attempt to create headers first by doing a value write to range A1
      if (errText.includes("Unable to parse range")) {
        // Try creating the tab with headers first by calling batchUpdate with addSheet
        const createTabUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
        await fetch(createTabUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: tabName,
                  },
                },
              },
            ],
          }),
        });
        
        // Write headers to Row 1
        const writeHeadersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${tabName}'!A1:1?valueInputOption=USER_ENTERED`;
        await fetch(writeHeadersUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [headers],
          }),
        });

        // Try appending row again
        await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [row],
          }),
        });
      }
    }
  } catch (err) {
    console.error("Google Sheet Append Error:", err);
  }
}

/** Bulk export all existing data to Google Sheet tabs. */
export async function bulkExportToGoogleSheets(ownerId: string) {
  const db = await getDb();
  const biz = (await db.collection("businesses").findOne({ owner_id: ownerId })) ||
              (await db.collection("businesses").findOne({ _id: ownerId as any }));
  if (!biz) throw new Error("Business not found");

  const spreadsheetId = biz.google_sheets_spreadsheet_id as string | undefined;

  if (!spreadsheetId) {
    throw new Error("Google Sheets Spreadsheet ID is missing. Connect your Google account or provide a Spreadsheet ID in Settings.");
  }

  const token = await getEffectiveToken(biz);
  if (!token) {
    throw new Error("Google Sheets authorization token or Service Account credentials missing.");
  }

  // Queries
  const [
    products,
    sales,
    expenses,
    cashbox,
    purchases,
    parties,
    employees,
    employeeExpenses,
    employeeShoppings,
    returns,
    ownerWallet,
    bankAccounts,
    restaurantTables,
    restaurantOrders,
    restaurantQueue,
  ] = await Promise.all([
    db.collection("products").find({ owner_id: ownerId }).toArray(),
    db.collection("sales").find({ owner_id: ownerId }).toArray(),
    db.collection("expenses").find({ owner_id: ownerId }).toArray(),
    db.collection("cashbox_entries").find({ owner_id: ownerId }).toArray(),
    db.collection("purchases").find({ owner_id: ownerId }).toArray(),
    db.collection("parties").find({ owner_id: ownerId }).toArray(),
    db.collection("employees").find({ owner_id: ownerId }).toArray(),
    db.collection("employee_expenses").find({ owner_id: ownerId }).toArray(),
    db.collection("employee_shoppings").find({ owner_id: ownerId }).toArray(),
    db.collection("returns").find({ owner_id: ownerId }).toArray(),
    db.collection("owner_wallet").find({ owner_id: ownerId }).toArray(),
    db.collection("bank_accounts").find({ owner_id: ownerId }).toArray(),
    db.collection("restaurant_tables").find({ owner_id: ownerId }).toArray(),
    db.collection("restaurant_orders").find({ owner_id: ownerId }).toArray(),
    db.collection("restaurant_billing_queue").find({ owner_id: ownerId }).toArray(),
  ]);
  const partyMap = new Map(parties.map((p: any) => [String(p._id), p.name || p.phone || ""]));

  const dataSets = [
    {
      tab: "Sales",
      headers: ["Sale ID", "Date & Time", "Product Name", "Qty", "Sell Price (৳)", "Total (৳)", "Payment Type", "Customer / Party", "Paid Amount (৳)", "Due Amount (৳)", "Courier Status", "Note"],
      rows: sales.map(s => [
        String(s._id),
        s.created_at ? new Date(s.created_at).toLocaleString("en-GB") : "",
        s.product_name || "",
        s.qty ?? 1,
        s.sell_price ?? 0,
        (Number(s.sell_price) || 0) * (Number(s.qty) || 1),
        (s.type || "cash").toUpperCase(),
        s.party_name || partyMap.get(String(s.party_id)) || (s.party_id ? String(s.party_id) : "Walk-in"),
        s.paid_amount ?? 0,
        s.due_amount ?? 0,
        s.courier_status || (s.type === "online" ? "pending" : "completed"),
        s.note || ""
      ]),
    },
    {
      tab: "Products",
      headers: ["Product ID", "Product Name", "Buy Price (৳)", "Sell Price (৳)", "Stock Qty", "Min Alert Stock", "Category", "Created At"],
      rows: products.map(p => [
        String(p._id),
        p.name || "",
        p.buy_price ?? 0,
        p.sell_price ?? 0,
        p.stock ?? 0,
        p.min_stock ?? 5,
        p.category || "",
        p.created_at ? new Date(p.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Expenses",
      headers: ["Expense ID", "Expense Title", "Amount (৳)", "Note / Category", "Date & Time"],
      rows: expenses.map(e => [
        String(e._id),
        e.title || "",
        e.amount ?? 0,
        e.note || "",
        e.created_at ? new Date(e.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Cashbox",
      headers: ["Entry ID", "Kind / Source", "Amount (৳)", "Description / Note", "Reference ID", "Date & Time"],
      rows: cashbox.map(c => [
        String(c._id),
        (c.kind || "").toUpperCase(),
        c.amount ?? 0,
        c.note || "",
        c.ref_id || "",
        c.created_at ? new Date(c.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Purchases",
      headers: ["Purchase ID", "Product Name", "Quantity", "Unit Cost (৳)", "Total Cost (৳)", "Supplier / Note", "Date & Time"],
      rows: purchases.map(p => [
        String(p._id),
        p.product_name || "",
        p.qty ?? 1,
        p.unit_cost ?? 0,
        p.total ?? 0,
        p.note || "",
        p.created_at ? new Date(p.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Employees",
      headers: ["Employee ID", "Name", "Role", "Phone", "Monthly Salary (৳)", "Status", "Joined Date"],
      rows: employees.map(emp => [
        String(emp._id),
        emp.name || "",
        emp.role || "",
        emp.phone || "",
        emp.salary ?? 0,
        emp.status || "active",
        emp.created_at ? new Date(emp.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Employee Expenses",
      headers: ["Record ID", "Employee Name", "Title / Note", "Amount (৳)", "Date & Time"],
      rows: employeeExpenses.map(ee => [
        String(ee._id),
        ee.employee_name || "",
        ee.note || ee.title || "",
        ee.amount ?? 0,
        ee.created_at ? new Date(ee.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Employee Shoppings",
      headers: ["Record ID", "Employee Name", "Product Name", "Amount (৳)", "Payment Status", "Date & Time"],
      rows: employeeShoppings.map(es => [
        String(es._id),
        es.employee_name || "",
        es.product_name || "",
        es.total_amount ?? es.amount ?? 0,
        es.payment_status || "",
        es.created_at ? new Date(es.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Parties",
      headers: ["Party ID", "Name", "Phone", "Type", "Address", "Balance (৳)", "Created At"],
      rows: parties.map((p: any) => [
        String(p._id),
        p.name || "",
        p.phone || "",
        p.type || "customer",
        p.address || "",
        p.balance ?? 0,
        p.created_at ? new Date(p.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Returns",
      headers: ["Return ID", "Sale ID", "Product Name", "Qty", "Refund Amount (৳)", "Reason", "Date & Time"],
      rows: returns.map((r: any) => [
        String(r._id),
        r.sale_id || "",
        r.product_name || "",
        r.qty ?? 1,
        r.refund_amount ?? r.amount ?? 0,
        r.reason || r.note || "",
        r.created_at ? new Date(r.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Owner Wallet",
      headers: ["Entry ID", "Category", "Amount (৳)", "Cut From Profit", "Note", "Date & Time"],
      rows: ownerWallet.map((w: any) => [
        String(w._id),
        w.category || "personal",
        w.amount ?? 0,
        w.cut_from_profit === false ? "No" : "Yes",
        w.note || "",
        w.created_at ? new Date(w.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    {
      tab: "Bank Accounts",
      headers: ["Account ID", "Bank Name", "Account Number", "Branch", "Balance (৳)", "Created At"],
      rows: bankAccounts.map((b: any) => [
        String(b._id),
        b.bank_name || b.name || "",
        b.account_number || "",
        b.branch || "",
        b.balance ?? 0,
        b.created_at ? new Date(b.created_at).toLocaleString("en-GB") : ""
      ]),
    },
    ...(restaurantTables.length > 0 || restaurantOrders.length > 0 || restaurantQueue.length > 0
      ? [
          {
            tab: "Restaurant Tables",
            headers: ["Table ID", "Name", "Floor", "Seat Capacity", "Status", "Active Guests"],
            rows: restaurantTables.map((t: any) => [
              String(t.id || t._id),
              t.name || "",
              t.floor || "Ground Floor",
              t.capacity ?? 4,
              t.status || "available",
              t.guests ?? 0,
            ]),
          },
          {
            tab: "Restaurant Orders",
            headers: ["KOT ID", "Table", "Floor", "Order Type", "Waiter", "Status", "Subtotal (৳)", "Date & Time"],
            rows: restaurantOrders.map((o: any) => [
              String(o.id || o._id),
              o.table || "",
              o.floor || "",
              o.orderType || "dine_in",
              o.waiter || "",
              o.status || "pending",
              o.subtotal ?? 0,
              o.created_at ? new Date(o.created_at).toLocaleString("en-GB") : "",
            ]),
          },
          {
            tab: "Restaurant Bill Queue",
            headers: ["Bill ID", "Queue #", "Table", "Waiter", "Grand Total (৳)", "Payment Method", "Status", "Date & Time"],
            rows: restaurantQueue.map((q: any) => [
              String(q.id || q._id),
              q.queue_no || "",
              q.table || "",
              q.waiter || "",
              q.grandTotal ?? 0,
              q.paymentMethod || "cash",
              q.status || "queued",
              q.created_at ? new Date(q.created_at).toLocaleString("en-GB") : "",
            ]),
          },
        ]
      : []),
  ];

  let exportedTabs = 0;
  for (const ds of dataSets) {
    // 1. Create tab if it doesn't exist
    const createTabUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const tabRes = await fetch(createTabUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: ds.tab,
              },
            },
          },
        ],
      }),
    });
    if (tabRes.status === 401 || tabRes.status === 403) {
      throw new Error("Google Sheets authorization expired or missing permission. Please reconnect Google Sheets in Settings.");
    }

    // 2. Clear existing sheet values
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${ds.tab}'!A:Z:clear`;
    await fetch(clearUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 3. Write headers and rows
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${ds.tab}'!A1?valueInputOption=USER_ENTERED`;
    const values = [ds.headers, ...ds.rows];
    const writeRes = await fetch(writeUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values,
      }),
    });

    if (!writeRes.ok) {
      const errTxt = await writeRes.text();
      if (writeRes.status === 401 || writeRes.status === 403) {
        throw new Error("Google Sheets access token expired. Please reconnect Google Sheets in Settings.");
      }
      throw new Error(`Failed to write tab "${ds.tab}": ${errTxt}`);
    }
    exportedTabs++;
  }

  await db.collection("businesses").updateOne(
    { _id: biz._id as any },
    { $set: { last_google_backup_at: new Date().toISOString() } }
  );

  return { success: true, count: sales.length, tabs: exportedTabs, backedUpAt: new Date().toISOString() };
}
