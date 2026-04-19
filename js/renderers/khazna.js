import { DB, dbInsert } from "../data.js";
import { N, currency, today, openModal, closeModal } from "../utils.js";
import { showToast, emptyState } from "../ui.js";

export function renderKhazna() {
  const el = document.getElementById("khazna");
  if (!el) return;

  const stats = calcKhazna();

  el.innerHTML = `
    <div class="section-header">
      <h2>💰 الخزنة</h2>
      <div>
        <button class="btn btn-success" onclick="openAddCollection()">➕ تحصيل</button>
        <button class="btn btn-danger"  onclick="openAddExpense()">➖ مصروف</button>
      </div>
    </div>

    <div class="grid">
      ${statCard("كاش وارد",    stats.cash,     "var(--success)")}
      ${statCard("تحصيل آجل",  stats.credit,   "var(--warning)")}
      ${statCard("مصروفات",    stats.expenses, "var(--danger)")}
      ${statCard("الصافي",     stats.net, stats.netRaw >= 0 ? "var(--primary)" : "var(--danger)")}
    </div>

    <div class="card">
      <h3>📥 التحصيلات</h3>
      ${renderCollections()}
    </div>

    <div class="card">
      <h3>📤 المصروفات</h3>
      ${renderExpenses()}
    </div>
  `;
}

function calcKhazna() {
  let cash = 0, credit = 0, expenses = 0;
  DB.collections.forEach(c => c.isCash ? cash += N(c.amount) : credit += N(c.amount));
  DB.expenses.forEach(e => expenses += N(e.amount));
  const netRaw = cash - expenses;
  return {
    cash:     currency(cash),
    credit:   currency(credit),
    expenses: currency(expenses),
    net:      currency(netRaw),
    netRaw
  };
}

function statCard(title, value, color) {
  return `<div class="stat-card">
    <h4>${title}</h4>
    <div class="stat-value" style="color:${color};">${value}</div>
  </div>`;
}

function renderCollections() {
  if (!DB.collections.length) return emptyState("لا يوجد تحصيلات");
  return `<table class="table">
    <thead><tr><th>المبلغ</th><th>النوع</th><th>البيان</th><th>التاريخ</th></tr></thead>
    <tbody>
      ${DB.collections.map(c => `
        <tr>
          <td style="font-weight:600;color:var(--success);">${currency(c.amount)}</td>
          <td>${c.isCash ? `<span class="badge badge-success">كاش</span>` : `<span class="badge badge-warning">آجل</span>`}</td>
          <td>${c.note || "-"}</td>
          <td>${(c.date || c.created_at || "")?.split("T")[0] || "-"}</td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderExpenses() {
  if (!DB.expenses.length) return emptyState("لا يوجد مصروفات");
  return `<table class="table">
    <thead><tr><th>الوصف</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
    <tbody>
      ${DB.expenses.map(e => `
        <tr>
          <td>${e.description || e.note || "-"}</td>
          <td style="font-weight:600;color:var(--danger);">${currency(e.amount)}</td>
          <td>${(e.date || e.created_at || "")?.split("T")[0] || "-"}</td>
        </tr>`).join("")}
    </tbody>
  </table>`;
}

// =========================
// ADD COLLECTION
// =========================
window.openAddCollection = function () {
  openModal("➕ إضافة تحصيل", `
    <label>المبلغ *</label>
    <input id="col_amount" type="number" placeholder="0">
    <label>النوع</label>
    <select id="col_type">
      <option value="cash">كاش</option>
      <option value="credit">آجل</option>
    </select>
    <label>ملاحظة</label>
    <input id="col_note" placeholder="اختياري">
  `, `
    <button class="btn btn-success" onclick="saveCollection()">حفظ</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveCollection = async function () {
  const amount = N(document.getElementById("col_amount").value);
  const type   = document.getElementById("col_type").value;
  const note   = document.getElementById("col_note").value.trim();
  if (!amount || amount <= 0) { showToast("ادخل مبلغ صحيح", false); return; }
  const ok = await dbInsert("collections", {
    amount, isCash: type === "cash", note,
    date: today(), created_at: new Date().toISOString()
  });
  if (ok) { showToast("تم إضافة التحصيل ✓"); closeModal(); navigate("khazna"); }
};

// =========================
// ADD EXPENSE
// =========================
window.openAddExpense = function () {
  openModal("➖ إضافة مصروف", `
    <label>الوصف *</label>
    <input id="exp_desc" placeholder="وصف المصروف">
    <label>المبلغ *</label>
    <input id="exp_amount" type="number" placeholder="0">
  `, `
    <button class="btn btn-danger" onclick="saveExpense()">حفظ</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveExpense = async function () {
  const description = document.getElementById("exp_desc").value.trim();
  const amount      = N(document.getElementById("exp_amount").value);
  if (!description) { showToast("ادخل وصف المصروف", false); return; }
  if (!amount || amount <= 0) { showToast("ادخل مبلغ صحيح", false); return; }
  const ok = await dbInsert("expenses", {
    description, amount,
    date: today(), created_at: new Date().toISOString()
  });
  if (ok) { showToast("تم إضافة المصروف ✓"); closeModal(); navigate("khazna"); }
};
