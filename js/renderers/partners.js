import { DB, dbInsert, dbUpdate, dbDelete } from "../data.js";
import { N, currency, openModal, closeModal } from "../utils.js";
import { showToast, confirmModal, emptyState } from "../ui.js";

export function renderPartners() {
  const el = document.getElementById("partners");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <h2>🤝 الشركاء</h2>
      <button class="btn btn-primary" onclick="openAddPartner()">➕ إضافة شريك</button>
    </div>
    ${!DB.partners.length
      ? emptyState("لا يوجد شركاء بعد")
      : DB.partners.map(renderPartnerCard).join("")}
  `;
}

function arrSum(arr = []) {
  return (arr || []).reduce((s, x) => s + N(x.amount), 0);
}

function renderPartnerCard(p) {
  const absences = (p.absences || []).length;
  const payments = arrSum(p.payments);
  const profits  = arrSum(p.profits);
  const presentDays = 30 - absences;
  const base     = presentDays * N(p.daily);
  const net      = base + profits - payments;

  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="margin:0 0 6px;">${p.name}</h3>
          <p>اليومية: ${currency(p.daily)} × ${presentDays} يوم = ${currency(base)}</p>
          <p>الأرباح: <span style="color:var(--success);">${currency(profits)}</span></p>
          <p>المدفوع: ${currency(payments)}</p>
          <h4 style="margin:8px 0 0;color:${net >= 0 ? "var(--primary)" : "var(--danger)"};">
            المستحق: ${currency(net)}
          </h4>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button class="btn btn-sm" onclick="addPartnerAbsence('${p.id}')">📅 غياب</button>
          <button class="btn btn-sm btn-success" onclick="addPartnerProfit('${p.id}')">📈 ربح</button>
          <button class="btn btn-sm btn-primary" onclick="addPartnerPayment('${p.id}')">💰 دفع</button>
          <button class="btn btn-sm" onclick="editPartner('${p.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deletePartner('${p.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
}

// ADD
window.openAddPartner = function () {
  openModal("➕ إضافة شريك", `
    <label>الاسم *</label>
    <input id="par_name" placeholder="اسم الشريك">
    <label>اليومية *</label>
    <input id="par_daily" type="number" placeholder="0">
    <label>الموبايل</label>
    <input id="par_phone" placeholder="01XXXXXXXXX">
  `, `
    <button class="btn btn-primary" onclick="savePartner()">حفظ</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.savePartner = async function () {
  const name  = document.getElementById("par_name").value.trim();
  const daily = N(document.getElementById("par_daily").value);
  const phone = document.getElementById("par_phone").value.trim();
  if (!name)  { showToast("ادخل الاسم", false); return; }
  if (!daily) { showToast("ادخل اليومية", false); return; }
  const ok = await dbInsert("partners", {
    name, daily, phone, payments: [], absences: [], profits: [],
    created_at: new Date().toISOString()
  });
  if (ok) { showToast("تم إضافة الشريك ✓"); closeModal(); navigate("partners"); }
};

// ABSENCE
window.addPartnerAbsence = async function (id) {
  const p = DB.partners.find(x => String(x.id) === String(id));
  if (!p) return;
  const absences = [...(p.absences || []), { date: new Date().toISOString() }];
  const ok = await dbUpdate("partners", id, { absences });
  if (ok) { showToast("تم تسجيل الغياب"); navigate("partners"); }
};

// PROFIT
window.addPartnerProfit = function (id) {
  openModal("📈 إضافة ربح", `
    <label>المبلغ *</label>
    <input id="pp_amount" type="number" placeholder="0">
    <label>ملاحظة</label>
    <input id="pp_note" placeholder="اختياري">
  `, `
    <button class="btn btn-success" onclick="savePartnerProfit('${id}')">إضافة</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.savePartnerProfit = async function (id) {
  const amount = N(document.getElementById("pp_amount").value);
  const note   = document.getElementById("pp_note").value.trim();
  if (!amount || amount <= 0) { showToast("ادخل مبلغ صحيح", false); return; }
  const p = DB.partners.find(x => String(x.id) === String(id));
  if (!p) return;
  const profits = [...(p.profits || []), { amount, note, date: new Date().toISOString() }];
  const ok = await dbUpdate("partners", id, { profits });
  if (ok) { showToast("تم إضافة الربح ✓"); closeModal(); navigate("partners"); }
};

// PAYMENT
window.addPartnerPayment = function (id) {
  openModal("💰 دفع للشريك", `
    <label>المبلغ *</label>
    <input id="pm_amount" type="number" placeholder="0">
  `, `
    <button class="btn btn-success" onclick="savePartnerPayment('${id}')">دفع</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.savePartnerPayment = async function (id) {
  const amount = N(document.getElementById("pm_amount").value);
  if (!amount || amount <= 0) { showToast("ادخل مبلغ صحيح", false); return; }
  const p = DB.partners.find(x => String(x.id) === String(id));
  if (!p) return;
  const payments = [...(p.payments || []), { amount, date: new Date().toISOString() }];
  const ok = await dbUpdate("partners", id, { payments });
  if (ok) { showToast("تم الدفع ✓"); closeModal(); navigate("partners"); }
};

// EDIT
window.editPartner = function (id) {
  const p = DB.partners.find(x => String(x.id) === String(id));
  if (!p) return;
  openModal("✏️ تعديل الشريك", `
    <label>الاسم</label>
    <input id="par_name" value="${p.name}">
    <label>اليومية</label>
    <input id="par_daily" type="number" value="${p.daily}">
  `, `
    <button class="btn btn-primary" onclick="updatePartner('${id}')">تحديث</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.updatePartner = async function (id) {
  const name  = document.getElementById("par_name").value.trim();
  const daily = N(document.getElementById("par_daily").value);
  if (!name) { showToast("ادخل الاسم", false); return; }
  const ok = await dbUpdate("partners", id, { name, daily });
  if (ok) { showToast("تم التحديث ✓"); closeModal(); navigate("partners"); }
};

// DELETE
window.deletePartner = function (id) {
  confirmModal("هل تريد حذف هذا الشريك؟", async () => {
    const ok = await dbDelete("partners", id);
    if (ok) { showToast("تم الحذف"); navigate("partners"); }
  });
};
