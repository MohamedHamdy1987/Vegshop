import { supabase, DB } from "../data.js";
import { openModal, closeModal } from "../utils.js";
import { showToast, statusBadge, emptyState } from "../ui.js";

export function renderSubscription() {
  const el = document.getElementById("subscription");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header"><h2>💳 الاشتراك</h2></div>

    <div class="grid">
      ${planCard("شهري",  750,  "monthly")}
      ${planCard("سنوي",  6000, "yearly")}
    </div>

    <div class="card">
      <h3>📄 طلباتي السابقة</h3>
      ${renderMyPayments()}
    </div>
  `;
}

function planCard(title, price, plan) {
  return `
    <div class="card" style="text-align:center;">
      <h3>${title}</h3>
      <div style="font-size:28px;font-weight:700;color:var(--primary);margin:10px 0;">
        ${price.toLocaleString("ar-EG")} جنيه
      </div>
      <button class="btn btn-primary" onclick="openPaymentModal(${price}, '${plan}')">
        اشتراك الآن
      </button>
    </div>`;
}

window.openPaymentModal = function (amount, plan) {
  openModal("💳 طلب اشتراك", `
    <p>الخطة: <strong>${plan === "monthly" ? "شهري" : "سنوي"}</strong></p>
    <p>المبلغ: <strong>${amount} جنيه</strong></p>

    <label>طريقة الدفع</label>
    <select id="pay_method">
      <option value="vodafone">فودافون كاش</option>
      <option value="instapay">انستاباي</option>
      <option value="bank">تحويل بنكي</option>
      <option value="fawry">فوري</option>
    </select>

    <label>رقم العملية / المرجع *</label>
    <input id="pay_trx" placeholder="أدخل رقم العملية">

    <label>ملاحظات</label>
    <textarea id="pay_notes" placeholder="أي ملاحظات إضافية"></textarea>
  `, `
    <button class="btn btn-success" onclick="submitPayment(${amount}, '${plan}')">إرسال الطلب</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.submitPayment = async function (amount, plan) {
  const method = document.getElementById("pay_method").value;
  const trx    = document.getElementById("pay_trx").value.trim();
  const notes  = document.getElementById("pay_notes").value.trim();

  if (!trx) { showToast("ادخل رقم العملية", false); return; }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      user_id:        user?.id || null,
      user_email:     user?.email || null,
      amount,
      plan,
      method,
      transaction_id: trx,
      notes,
      status:         "pending",
      created_at:     new Date().toISOString()
    });
    if (error) throw error;
    showToast("✅ تم إرسال طلب الاشتراك — سيتم التفعيل قريباً");
    closeModal();
    navigate("subscription");
  } catch (err) {
    console.error(err);
    showToast("فشل الإرسال", false);
  }
};

function renderMyPayments() {
  if (!DB.payments.length) return emptyState("لا توجد طلبات بعد");
  return `
    <table class="table">
      <thead>
        <tr><th>الخطة</th><th>المبلغ</th><th>الطريقة</th><th>التاريخ</th><th>الحالة</th></tr>
      </thead>
      <tbody>
        ${DB.payments.map(p => `
          <tr>
            <td>${p.plan || "-"}</td>
            <td>${p.amount} جنيه</td>
            <td>${p.method || "-"}</td>
            <td>${(p.created_at || "")?.split("T")[0]}</td>
            <td>${statusBadge(p.status)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}
