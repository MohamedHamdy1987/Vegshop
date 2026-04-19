import { DB, dbInsert, dbUpdate, dbDelete } from "../data.js";
import { openModal, closeModal, N, currency, formatDate } from "../utils.js";
import { showToast, confirmModal, emptyState } from "../ui.js";

export function renderSuppliers() {
  const el = document.getElementById("suppliers");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <h2>🚚 الموردين</h2>
      <button class="btn btn-primary" onclick="openAddSupplier()">➕ إضافة مورد</button>
    </div>
    ${!DB.suppliers.length
      ? emptyState("لا يوجد موردين بعد")
      : `<table class="table">
          <thead>
            <tr><th>الاسم</th><th>الموبايل</th><th>الرصيد</th><th>إجراءات</th></tr>
          </thead>
          <tbody>
            ${DB.suppliers.map(s => {
              const bal = calcBalance(s);
              return `
              <tr>
                <td>${s.name}</td>
                <td>${s.phone || "-"}</td>
                <td style="color:${bal > 0 ? "var(--warning)" : "var(--success)"};font-weight:600;">
                  ${currency(bal)}
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-sm" onclick="viewSupplier('${s.id}')">👁 كشف</button>
                    <button class="btn btn-sm btn-primary" onclick="addSupplierPayment('${s.id}')">💰 دفع</button>
                    <button class="btn btn-sm" onclick="viewSupplierInvoices('${s.id}')">🧾 فواتير</button>
                    <button class="btn btn-sm" onclick="editSupplier('${s.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier('${s.id}')">🗑️</button>
                  </div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>`}
  `;
}

function calcBalance(s) {
  let b = 0;
  (s.ledger || []).forEach(l => {
    if (l.type === "invoice") b += N(l.amount);
    else                      b -= N(l.amount);
  });
  return b;
}

// =========================
// ADD
// =========================
window.openAddSupplier = function () {
  openModal("➕ إضافة مورد", `
    <label>الاسم *</label>
    <input id="s_name" placeholder="اسم المورد">
    <label>رقم الهاتف</label>
    <input id="s_phone" placeholder="01XXXXXXXXX">
  `, `
    <button class="btn btn-primary" onclick="saveSupplier()">حفظ</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveSupplier = async function () {
  const name  = document.getElementById("s_name").value.trim();
  const phone = document.getElementById("s_phone").value.trim();
  if (!name) { showToast("ادخل اسم المورد", false); return; }
  const ok = await dbInsert("suppliers", { name, phone, ledger: [] });
  if (ok) { showToast("تم إضافة المورد ✓"); closeModal(); navigate("suppliers"); }
};

// =========================
// EDIT
// =========================
window.editSupplier = function (id) {
  const s = DB.suppliers.find(x => String(x.id) === String(id));
  if (!s) return;
  openModal("✏️ تعديل المورد", `
    <label>الاسم</label>
    <input id="s_name" value="${s.name}">
    <label>الهاتف</label>
    <input id="s_phone" value="${s.phone || ""}">
  `, `
    <button class="btn btn-primary" onclick="updateSupplier('${id}')">تحديث</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.updateSupplier = async function (id) {
  const name  = document.getElementById("s_name").value.trim();
  const phone = document.getElementById("s_phone").value.trim();
  if (!name) { showToast("ادخل الاسم", false); return; }
  const ok = await dbUpdate("suppliers", id, { name, phone });
  if (ok) { showToast("تم التحديث ✓"); closeModal(); navigate("suppliers"); }
};

// =========================
// DELETE
// =========================
window.deleteSupplier = function (id) {
  confirmModal("هل تريد حذف هذا المورد؟", async () => {
    const ok = await dbDelete("suppliers", id);
    if (ok) { showToast("تم الحذف"); navigate("suppliers"); }
  });
};

// =========================
// ADD PAYMENT (دفع للمورد)
// =========================
window.addSupplierPayment = function (id) {
  const s = DB.suppliers.find(x => String(x.id) === String(id));
  if (!s) return;
  openModal(`💰 دفع للمورد: ${s.name}`, `
    <label>المبلغ *</label>
    <input id="sp_amount" type="number" placeholder="0">
    <label>ملاحظة</label>
    <input id="sp_note" placeholder="اختياري">
  `, `
    <button class="btn btn-success" onclick="saveSupplierPayment('${id}')">تسجيل الدفع</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveSupplierPayment = async function (id) {
  const amount = Number(document.getElementById("sp_amount").value);
  const note   = document.getElementById("sp_note").value.trim();
  if (!amount || amount <= 0) { showToast("ادخل مبلغ صحيح", false); return; }

  const s = DB.suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  const ledger = Array.isArray(s.ledger) ? [...s.ledger] : [];
  ledger.push({ type: "payment", amount, note, date: new Date().toISOString() });

  const ok = await dbUpdate("suppliers", id, { ledger });
  if (ok) { showToast("تم تسجيل الدفع ✓"); closeModal(); navigate("suppliers"); }
};

// =========================
// VIEW LEDGER
// =========================
window.viewSupplier = function (id) {
  const s = DB.suppliers.find(x => String(x.id) === String(id));
  if (!s) return;

  const ledger  = s.ledger || [];
  const balance = calcBalance(s);

  const rows = ledger.length
    ? ledger.map(l => `
        <tr>
          <td>${formatDate(l.date)}</td>
          <td>${l.type === "invoice" ? "فاتورة" : l.type === "payment" ? "دفع" : l.type}</td>
          <td>${l.note || "-"}</td>
          <td style="font-weight:600;">${currency(l.amount)}</td>
        </tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;">لا توجد حركات</td></tr>`;

  openModal(`📋 كشف حساب: ${s.name}`, `
    <p style="margin-bottom:10px;">
      الرصيد: <strong style="color:var(--warning);">${currency(balance)}</strong>
    </p>
    <table class="table">
      <thead><tr><th>التاريخ</th><th>البيان</th><th>ملاحظة</th><th>المبلغ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);
};

// =========================
// VIEW INVOICES
// =========================
window.viewSupplierInvoices = function (supplierId) {
  const invs = DB.invoices.filter(
    i => String(i.supplier_id || i.supplierId) === String(supplierId)
  );

  if (!invs.length) {
    openModal("🧾 الفواتير", "<div class='empty-state'><div class='empty-icon'>🧾</div><p>لا توجد فواتير</p></div>");
    return;
  }

  openModal("🧾 فواتير المورد", `
    <table class="table">
      <thead>
        <tr><th>التاريخ</th><th>الإجمالي</th><th>العمولة</th><th>الصافي</th></tr>
      </thead>
      <tbody>
        ${invs.map(i => `
          <tr>
            <td>${formatDate(i.date)}</td>
            <td>${currency(i.gross)}</td>
            <td>${currency(i.ded_commission)}</td>
            <td style="font-weight:600;color:var(--success);">${currency(i.net)}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  `);
};
