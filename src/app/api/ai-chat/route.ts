import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";

const AI_BASE_URL = "https://api.tokenrouter.com/v1";
const AI_API_KEY = "sk-wbNyUKEzeR81I36DHsOA8gEaCO5iKz7uksedde5pkhsLbbiw";
const AI_MODEL = "MiniMax-M3";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify user session
    const session = await requireSession();
    const db = await getDb();
    const ownerId = session.ownerId;

    // 2. Fetch business context data
    const [products, sales, purchases, expenses, parties, cashbox] = await Promise.all([
      db.collection("products").find({ owner_id: ownerId }).toArray(),
      db.collection("sales").find({ owner_id: ownerId }).sort({ created_at: -1 }).limit(200).toArray(),
      db.collection("purchases").find({ owner_id: ownerId }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection("expenses").find({ owner_id: ownerId }).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection("parties").find({ owner_id: ownerId }).toArray(),
      db.collection("cashbox_entries").find({ owner_id: ownerId }).sort({ created_at: -1 }).limit(100).toArray(),
    ]);

    // 3. Compute key business metrics
    const totalSales = sales.reduce((s, x) => s + (x.sell_price * x.qty), 0);
    const totalProfit = sales.reduce((s, x) => s + (x.profit || 0), 0);
    const totalExpenses = expenses.reduce((s, x) => s + (x.amount || 0), 0);
    const totalPurchases = purchases.reduce((s, x) => s + (x.total || 0), 0);
    const cashSales = sales.filter(s => s.type === "cash").reduce((a, x) => a + (x.sell_price * x.qty), 0);
    const creditSales = sales.filter(s => s.type === "credit").reduce((a, x) => a + (x.sell_price * x.qty), 0);
    const onlineSales = sales.filter(s => s.type === "online").reduce((a, x) => a + (x.sell_price * x.qty), 0);
    const totalDue = sales.filter(s => s.type === "credit").reduce((a, x) => a + (x.due_amount || 0), 0);

    // Low stock products (stock <= min_stock or stock <= 5)
    const lowStockProducts = products
      .filter(p => !p.archived && p.stock <= (p.min_stock || 5))
      .map(p => ({ name: p.name, stock: p.stock, min_stock: p.min_stock || 5 }))
      .slice(0, 20);

    // Best selling products
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const s of sales) {
      const key = s.product_name || "Unknown";
      if (!productSalesMap[key]) productSalesMap[key] = { name: key, qty: 0, revenue: 0 };
      productSalesMap[key].qty += s.qty || 0;
      productSalesMap[key].revenue += (s.sell_price * s.qty) || 0;
    }
    const bestSelling = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Recent sales (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentSales = sales.filter(s => s.created_at >= sevenDaysAgo);
    const recentSalesTotal = recentSales.reduce((a, x) => a + (x.sell_price * x.qty), 0);

    // Top parties by due
    const partyDueMap: Record<string, { name: string; due: number }> = {};
    for (const p of parties) {
      partyDueMap[p._id as string] = { name: p.name, due: 0 };
    }
    for (const s of sales.filter(x => x.type === "credit" && x.party_id)) {
      if (partyDueMap[s.party_id]) partyDueMap[s.party_id].due += (s.due_amount || 0);
    }
    const topDueParties = Object.values(partyDueMap)
      .filter(x => x.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 5);

    // Expense breakdown
    const expenseMap: Record<string, number> = {};
    for (const e of expenses) {
      expenseMap[e.title] = (expenseMap[e.title] || 0) + e.amount;
    }
    const topExpenses = Object.entries(expenseMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([title, amount]) => ({ title, amount }));

    // 4. Build system prompt with real business data
    const systemPrompt = `You are an expert AI business analyst for a retail fashion business management app called HakimEzy (also called DreamFashion). You have access to the business's real-time data and you are a trusted advisor.

## REAL BUSINESS DATA (Today: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })})

### Financial Overview
- Total Sales Revenue: ৳${totalSales.toLocaleString()}
- Total Profit: ৳${totalProfit.toLocaleString()}
- Total Expenses: ৳${totalExpenses.toLocaleString()}
- Total Purchases (inventory cost): ৳${totalPurchases.toLocaleString()}
- Net Position: ৳${(totalProfit - totalExpenses).toLocaleString()}
- Cash Sales: ৳${cashSales.toLocaleString()}
- Credit Sales: ৳${creditSales.toLocaleString()}
- Online Sales: ৳${onlineSales.toLocaleString()}
- Total Outstanding Dues: ৳${totalDue.toLocaleString()}
- Sales Last 7 Days: ৳${recentSalesTotal.toLocaleString()}

### Inventory
- Total Products: ${products.filter(p => !p.archived).length}
- Low Stock Products (stock ≤ reorder level): ${lowStockProducts.length}
${lowStockProducts.map(p => `  • ${p.name}: ${p.stock} units (min: ${p.min_stock})`).join("\n") || "  None"}

### Best Selling Products
${bestSelling.map((p, i) => `${i + 1}. ${p.name} — ${p.qty} units sold, ৳${p.revenue.toLocaleString()} revenue`).join("\n") || "No sales yet"}

### Top Customers by Outstanding Due
${topDueParties.map(p => `• ${p.name}: ৳${p.due.toLocaleString()}`).join("\n") || "No outstanding dues"}

### Top Expense Categories
${topExpenses.map(e => `• ${e.title}: ৳${e.amount.toLocaleString()}`).join("\n") || "No expenses recorded"}

### Business Counts
- Total Transactions: ${sales.length}
- Total Customers/Parties: ${parties.length}
- Total Expense Entries: ${expenses.length}
- Total Purchase Records: ${purchases.length}

## YOUR ROLE
You are a professional business advisor. Analyze the data above and give structured, actionable insights.

## RESPONSE RULES
- Give structured responses with clear headings, bullet points, and bold key numbers
- Use ৳ symbol for amounts (Bangladeshi Taka)  
- If the user asks in Bangla (Bengali), respond ENTIRELY in Bangla with proper Bengali numerals where appropriate
- If the user asks in English, respond in English
- Be concise but comprehensive — max 400 words unless detailed analysis is requested
- Highlight critical issues with ⚠️ and positive trends with ✅
- Always end with 1-2 actionable recommendations`;

    // 5. Parse request body
    const body = await req.json();
    const { messages, lang } = body as { messages: { role: string; content: string }[]; lang: string };

    // 6. Call tokenrouter AI
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12), // keep last 12 messages for context
        ],
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI error: ${response.status} — ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "No response from AI.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[ai-chat]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
