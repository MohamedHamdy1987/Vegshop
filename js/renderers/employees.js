import { DB, dbInsert, dbUpdate, dbDelete } from "../data.js";
import { N, currency, openModal, closeModal } from "../utils.js";
import { showToast, confirmModal, emptyState } from "../ui.js";

export function renderEmployees() {
  const el = document.getElementById("employees");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <h2>👷 الموظفين</h2>
      <button class="btn btn-primary" onclick="openAddEmployee()">➕ إضافة موظف</button>
    </div>
    ${!DB.employees.length
      ? emptyState("لا يوجد موظفين بعد")
      : DB.employees.map(renderEmployeeCard).join("")}
  `;
}

function renderEmployeeCard(e) {
  const absences  = (e.absences || []).length;
  const payments  = (e.payments || []).reduce((s, p) => s + N(p.amount), 0);
  const daily     = N(e.salary) / 30;
  const deductions = absences * daily;
  const net       = N(e.salary) - deductions - payments;

  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="margin:0 0 6px;">${e.name}</h3>
          <p>المرتب: ${currency(e.salary)}</p>
          <p>الغياب: <span style="color:var(--danger);">${absences} يوم</span> = خصم ${currency(deductions)}</p>
          <p>المدفوع: ${currency(payments)}</p>
          <h4 style="margin:8px 0 0;color:${net > 0 ? "var(--primary)" : "var(--danger)"};">
            المستحق: ${currency(net)}
          </h4>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button class="btn btn-sm" onclick="addAbsence('${e.id}')">📅 غياب</button>
          <button class="btn btn-sm btn-success" onclick="addEmployeePayment('${e.id}')">💰 دفع</button>
          <button class="btn btn-sm" onclick="editEmployee('${e.id}')">✏️ تعديل</button>
          <button class="btn btn-sm btn-danger" onclick="deleteEmployee('${e.id}')">🗑️</button>
        </div>
      </div>
    </div>`;
}

// =========================
// ADD
// =========================
window.openAddEmployee = function () {
  openModal("➕ إضافة موظف", `
    <label>الاسم *</label>
    <input id="emp_name" placeholder="اسم الموظف">
    <label>المرتب الشهري *</label>
    <input id="emp_salary" type="number" placeholder="0">
    <label>الموبايل</label>
    <input id="emp_phone" placeholder="01XXXXXXXXX">
  `, `
    <button class="btn btn-primary" onclick="saveEmployee()">حفظ</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveEmployee = async function () {
  const name   = document.getElementById("emp_name").value.trim();
  const salary = N(document.getElementById("emp_salary").value);
  const phone  = document.getElementById("emp_phone").value.trim();
  if (!name)   { showToast("ادخل الاسم", false); return; }
  if (!salary) { showToast("ادخل المرتب", false); return; }
  const ok = await dbInsert("employees", {
    name, salary, phone, payments: [], absences: [],
    created_at: new Date().toISOString()
  });
  if (ok) { showToast("تم إضافة الموظف ✓"); closeModal(); navigate("employees"); }
};

// =========================
// ABSENCE
// =========================
window.addAbsence = async function (id) {
  const e = DB.employees.find(x => String(x.id) === String(id));
  if (!e) return;
  const absences = [...(e.absences || []), { date: new Date().toISOString() }];
  const ok = await dbUpdate("employees", id, { absences });
  if (ok) { showToast("تم تسجيل الغياب"); navigate("employees"); }
};

// =========================
// PAYMENT
// =========================
window.addEmployeePayment = function (id) {
  const e = DB.employees.find(x => String(x.id) === String(id));
  if (!e) return;
  openModal(`💰 دفع لـ ${e.name}`, `
    <label>المبلغ *</label>
    <input id="ep_amount" type="number" placeholder="0">
  `, `
    <button class="btn btn-success" onclick="saveEmployeePayment('${id}')">دفع</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveEmployeePayment = async function (id) {
  const amount = N(document.getElementById("ep_amount").value);
  if (!amount || amount <= 0) { showToast("ادخل مبلغ صحيح", false); return; }
  const e = DB.employees.find(x => String(x.id) === String(id));
  if (!e) return;
  const payments = [...(e.payments || []), { amount, date: new Date().toISOString() }];
  const ok = await dbUpdate("employees", id, { payments });
  if (ok) { showToast("تم الدفع ✓"); closeModal(); navigate("employees"); }
};

// =========================
// EDIT
// =========================
window.editEmployee = function (id) {
  const e = DB.employees.find(x => String(x.id) === String(id));
  if (!e) return;
  openModal("✏️ تعديل الموظف", `
    <label>الاسم</label>
    <input id="emp_name" value="${e.name}">
    <label>المرتب</label>
    <input id="emp_salary" type="number" value="${e.salary}">
  `, `
    <button class="btn btn-primary" onclick="updateEmployee('${id}')">تحديث</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.updateEmployee = async function (id) {
  const name   = document.getElementById("emp_name").value.trim();
  const salary = N(document.getElementById("emp_salary").value);
  if (!name) { showToast("ادخل الاسم", false); return; }
  const ok = await dbUpdate("employees", id, { name, salary });
  if (ok) { showToast("تم التحديث ✓"); closeModal(); navigate("employees"); }
};

// =========================
// DELETE
// =========================
window.deleteEmployee = function (id) {
  confirmModal("هل تريد حذف هذا الموظف؟", async () => {
    const ok = await dbDelete("employees", id);
    if (ok) { showToast("تم الحذف"); navigate("employees"); }
  });
};
