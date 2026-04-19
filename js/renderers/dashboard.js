import { DB }         from "../data.js";
import { N, currency, formatDate } from "../utils.js";
import { emptyState }  from "../ui.js";

export function renderDashboard() {
  const el = document.getElementById("dashboard");
  if (!el) return;

  const stats = calcStats();

  el.innerHTML = `
    <div class="section-header">
      <h2>📊 لوحة التحكم</h2>
    </div>

    <div class="grid">
      ${statCard("إجمالي المبيعات",  stats.sales,    "#14b8a6")}
      ${statCard("تحصيل كاش",        stats.cash,     "#22c55e")}
      ${statCard("رصيد آجل",         stats.credit,   "#f59e0b")}
      ${statCard("المصروفات",         stats.expenses, "#ef4444")}
      ${statCard("صافي اليوم",        stats.net,      stats.netRaw >= 0 ? "#14b8a6" : "#ef4444")}
    </div>

    <div class="card">
      <h3>📦 أكثر المنتجات مبيعاً</h3>
      ${renderTopProducts()}
    </div>

    <div class="card">
      <h3>👥 أعلى أرصدة العملاء</h3>
      ${renderTopCustomers()}
    </div>
  `;
}

function calcStats() {
  let sales = 0, cash = 0, credit = 0, expenses = 0;

  DB.products.forEach(p =>
    (p.salesLog || []).forEach(s => (sales += N(s.total)))
  );

  DB.collections.forEach(c => {
    if (c.isCash) cash += N(c.amount);
    else credit += N(c.amount);
  });

  DB.expenses.forEach(e => (expenses += N(e.amount)));

  const netRaw = cash - expenses; // صافي الكاش فقط

  return {
    sales:    currency(sales),
    cash:     currency(cash),
    credit:   currency(credit),
    expenses: currency(expenses),
    net:      currency(netRaw),
    netRaw
  };
}

function statCard(title, value, color = "#14b8a6") {
  return `
    <div class="stat-card">
      <h4>${title}</h4>
      <div class="stat-value" style="color:${color};">${value}</div>
    </div>`;
}

function renderTopProducts() {
  if (!DB.products.length) return emptyState("لا توجد منتجات");

  const sorted = [...DB.products]
    .filter(p => N(p.sold) > 0)
    .sort((a, b) => N(b.sold) - N(a.sold))
    .slice(0, 5);

  if (!sorted.length) return emptyState("لم يتم البيع بعد");

  return `
    <table class="table">
      <thead>
        <tr><th>المنتج</th><th>المباع</th><th>المتبقي</th></tr>
      </thead>
      <tbody>
        ${sorted.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${N(p.sold)}</td>
            <td>${N(p.totalQty) - N(p.sold)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function renderTopCustomers() {
  if (!DB.customers.length) return emptyState("لا يوجد عملاء");

  const withBalance = DB.customers.map(c => ({
    name:    c.name,
    balance: calcCustomerBalance(c)
  })).filter(c => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  if (!withBalance.length) return emptyState("لا توجد أرصدة مستحقة");

  return `
    <table class="table">
      <thead>
        <tr><th>العميل</th><th>المستحق</th></tr>
      </thead>
      <tbody>
        ${withBalance.map(c => `
          <tr>
            <td>${c.name}</td>
            <td style="color:var(--danger);font-weight:600;">${currency(c.balance)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function calcCustomerBalance(c) {
  let b = 0;
  (c.ledger || []).forEach(l => {
    if (l.type === "sale")    b += N(l.amount);
    else                      b -= N(l.amount);
  });
  return b;
}
