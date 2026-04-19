import { supabase, DB, dbUpdate } from "../data.js";
import { showToast, confirmModal, emptyState, statusBadge } from "../ui.js";
import { formatDate, currency } from "../utils.js";

export function renderAdmin() {
  const el = document.getElementById("admin");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header"><h2>🛠 لوحة المشرف</h2></div>

    <div class="card">
      <h3>💳 طلبات الاشتراك</h3>
      ${!DB.payments.length
        ? emptyState("لا توجد طلبات")
        : `<table class="table">
            <thead>
              <tr>
                <th>المستخدم</th><th>الخطة</th><th>المبلغ</th>
                <th>الطريقة</th><th>رقم العملية</th>
                <th>التاريخ</th><th>الحالة</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${DB.payments.map(p => `
                <tr>
                  <td>${p.user_email || p.user_id || "-"}</td>
                  <td>${p.plan || "-"}</td>
                  <td>${p.amount} جنيه</td>
                  <td>${p.method || "-"}</td>
                  <td>${p.transaction_id || "-"}</td>
                  <td>${formatDate(p.created_at)}</td>
                  <td>${statusBadge(p.status)}</td>
                  <td>
                    ${p.status === "pending" ? `
                      <button class="btn btn-sm btn-success" onclick="approvePayment('${p.id}')">✅ قبول</button>
                      <button class="btn btn-sm btn-danger"  onclick="rejectPayment('${p.id}')">❌ رفض</button>
                    ` : "-"}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>`}
    </div>
  `;
}

window.approvePayment = function (id) {
  confirmModal("تأكيد الموافقة على طلب الاشتراك؟", async () => {
    try {
      const { error } = await supabase.from("payments")
        .update({ status: "approved", confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      showToast("✅ تم تفعيل الاشتراك");
      navigate("admin");
    } catch (err) {
      console.error(err);
      showToast("فشل التفعيل", false);
    }
  });
};

window.rejectPayment = function (id) {
  confirmModal("هل تريد رفض هذا الطلب؟", async () => {
    try {
      const { error } = await supabase.from("payments")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      showToast("تم الرفض");
      navigate("admin");
    } catch (err) {
      showToast("فشل", false);
    }
  });
};
