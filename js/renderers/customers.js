import { DB, dbInsert, dbUpdate, dbDelete } from "../data.js";
import { openModal, closeModal, N, currency, formatDate } from "../utils.js";
import { showToast, confirmModal, emptyState } from "../ui.js";

// =========================
// RENDER
// =========================
export function renderCustomers() {
  const el = document.getElementById("customers");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <h2>👥 العملاء</h2>
      <button class="btn btn-primary" onclick="openAddCustomer()">➕ إضافة عميل</button>
    </div>
    ${!DB.customers.length
      ? emptyState("لا يوجد عملاء بعد")
      : `<table class="table">
          <thead>
            <tr><th>الاسم</th><th>الموبايل</th><th>الرصيد</th><th>إجراءات</th></tr>
          </thead>
          <tbody>
            ${DB.customers.map(c => {
              const bal = calcBalance(c);
              return `
              <tr>
                <td>${c.name}</td>
                <td>${c.phone || "-"}</td>
                <td style="color:${bal > 0 ? "var(--danger)" : "var(--success)"}; font-weight:600;">
                  ${currency(bal)}
                </td>
                <td>
                  <div class="actions">
                    <button class="btn btn-sm" onclick="viewCustomer('${c.id}')">👁 كشف</button>
                    <button class="btn btn-sm btn-primary" onclick="addCustomerPayment('${c.id}')">💰 تحصيل</button>
                    <button class="btn btn-sm" onclick="editCustomer('${c.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}')">🗑️</button>
                    <button class="btn btn-sm btn-success" onclick="shareCustomer('${c.id}')">📤</button>
                  </div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>`}
  `;
}

function calcBalance(c) {
  let b = 0;
  (c.ledger || []).forEach(l => {
    if (l.type === "sale" || l.type === "debit") b += N(l.amount);
    else b -= N(l.amount);
  });
  return b;
}

// =========================
// ADD CUSTOMER
// =========================
window.openAddCustomer = function () {
  openModal("➕ إضافة عميل", `
    <label>الاسم *</label>
    <input id="c_name" placeholder="اسم العميل">
    <label>رقم الهاتف</label>
    <input id="c_phone" placeholder="01XXXXXXXXX">
  `, `
    <button class="btn btn-primary" onclick="saveCustomer()">حفظ</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveCustomer = async function () {
  const name  = document.getElementById("c_name").value.trim();
  const phone = document.getElementById("c_phone").value.trim();
  if (!name) { showToast("ادخل اسم العميل", false); return; }

  const ok = await dbInsert("customers", { name, phone, ledger: [] });
  if (ok) {
    showToast("تم إضافة العميل ✓");
    closeModal();
    navigate("customers");
  }
};

// =========================
// EDIT CUSTOMER
// =========================
window.editCustomer = function (id) {
  const c = DB.customers.find(x => String(x.id) === String(id));
  if (!c) return;
  openModal("✏️ تعديل العميل", `
    <label>الاسم</label>
    <input id="c_name" value="${c.name}">
    <label>الهاتف</label>
    <input id="c_phone" value="${c.phone || ""}">
  `, `
    <button class="btn btn-primary" onclick="updateCustomer('${id}')">تحديث</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.updateCustomer = async function (id) {
  const name  = document.getElementById("c_name").value.trim();
  const phone = document.getElementById("c_phone").value.trim();
  if (!name) { showToast("ادخل الاسم", false); return; }
  const ok = await dbUpdate("customers", id, { name, phone });
  if (ok) { showToast("تم التحديث ✓"); closeModal(); navigate("customers"); }
};

// =========================
// DELETE CUSTOMER
// =========================
window.deleteCustomer = function (id) {
  confirmModal("هل تريد حذف هذا العميل؟", async () => {
    const ok = await dbDelete("customers", id);
    if (ok) { showToast("تم الحذف"); navigate("customers"); }
  });
};

// =========================
// ADD PAYMENT (تحصيل)
// =========================
window.addCustomerPayment = function (id) {
  const c = DB.customers.find(x => String(x.id) === String(id));
  if (!c) return;
  openModal(`💰 تحصيل من ${c.name}`, `
    <label>المبلغ المحصّل *</label>
    <input id="pay_amount" type="number" placeholder="0">
    <label>ملاحظة</label>
    <input id="pay_note" placeholder="اختياري">
  `, `
    <button class="btn btn-success" onclick="saveCustomerPayment('${id}')">تسجيل التحصيل</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveCustomerPayment = async function (id) {
  const amount = Number(document.getElementById("pay_amount").value);
  const note   = document.getElementById("pay_note").value.trim();
  if (!amount || amount <= 0) { showToast("ادخل مبلغ صحيح", false); return; }

  const c = DB.customers.find(x => String(x.id) === String(id));
  if (!c) return;

  const ledger = Array.isArray(c.ledger) ? [...c.ledger] : [];
  ledger.push({ type: "payment", amount, note, date: new Date().toISOString() });

  const ok = await dbUpdate("customers", id, { ledger });
  if (ok) { showToast("تم تسجيل التحصيل ✓"); closeModal(); navigate("customers"); }
};

// =========================
// VIEW LEDGER
// =========================
window.viewCustomer = function (id) {
  const c = DB.customers.find(x => String(x.id) === String(id));
  if (!c) return;

  const ledger  = c.ledger || [];
  const balance = calcBalance(c);

  const rows = ledger.length
    ? ledger.map(l => {
        const isDebit = l.type === "sale" || l.type === "debit";
        return `<tr class="${isDebit ? "ledger-row-debit" : "ledger-row-credit"}">
          <td>${formatDate(l.date)}</td>
          <td>${l.type === "sale" ? "بيع" : l.type === "payment" ? "تحصيل" : l.type}</td>
          <td>${l.note || "-"}</td>
          <td style="font-weight:600;">${isDebit ? "+" : "-"}${currency(l.amount)}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" style="text-align:center;">لا توجد حركات</td></tr>`;

  openModal(`📋 كشف حساب: ${c.name}`, `
    <p style="margin-bottom:10px;">
      الرصيد الحالي: <strong style="color:${balance > 0 ? "var(--danger)" : "var(--success)"}">
        ${currency(balance)}
      </strong>
    </p>
    <table class="table">
      <thead><tr><th>التاريخ</th><th>البيان</th><th>ملاحظة</th><th>المبلغ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);
};

// =========================
// WHATSAPP SHARE
// =========================
window.shareCustomer = function (id) {
  const c = DB.customers.find(x => String(x.id) === String(id));
  if (!c) return;

  const balance = calcBalance(c);
  let text = `🧾 كشف حساب: ${c.name}\n`;
  text += `─────────────\n`;
  (c.ledger || []).forEach(l => {
    const type = l.type === "sale" ? "مبيعات" : l.type === "payment" ? "تحصيل" : l.type;
    text += `${formatDate(l.date)} | ${type} | ${l.amount} جنيه\n`;
  });
  text += `─────────────\n`;
  text += `الرصيد المستحق: ${currency(balance)}`;

  if (!c.phone) { showToast("لا يوجد رقم هاتف", false); return; }
  window.open(`https://wa.me/${c.phone.replace(/^0/, "20")}?text=${encodeURIComponent(text)}`, "_blank");
};
