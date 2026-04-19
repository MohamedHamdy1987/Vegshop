import { DB }                  from "../data.js";
import { N, currency, formatDate } from "../utils.js";
import { openModal }             from "../utils.js";
import { emptyState }            from "../ui.js";

export function renderInvoices() {
  const el = document.getElementById("invoices");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <h2>🧾 الفواتير</h2>
    </div>
    ${!DB.invoices.length
      ? emptyState("لا توجد فواتير بعد — تُنشأ تلقائياً عند نفاد مخزون المورد")
      : `<table class="table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المورد</th>
              <th>الإجمالي</th>
              <th>نولون</th>
              <th>مشال</th>
              <th>عمولة 7%</th>
              <th>الصافي</th>
              <th>تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            ${DB.invoices.map(inv => `
              <tr>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.supplier_name || inv.supplierName || "-"}</td>
                <td>${currency(inv.gross)}</td>
                <td>${currency(inv.ded_noulon)}</td>
                <td>${currency(inv.ded_mashal)}</td>
                <td>${currency(inv.ded_commission)}</td>
                <td style="font-weight:700;color:var(--success);">${currency(inv.net)}</td>
                <td>
                  <button class="btn btn-sm" onclick="viewInvoice('${inv.id}')">👁 عرض</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>`}
  `;
}

window.viewInvoice = function (id) {
  const inv = DB.invoices.find(x => String(x.id) === String(id));
  if (!inv) return;

  const products = inv.products || [];

  openModal(`🧾 فاتورة: ${inv.supplier_name || inv.supplierName}`, `
    <p style="color:var(--muted);margin-bottom:12px;">التاريخ: ${formatDate(inv.date)}</p>

    <table class="table">
      <thead><tr><th>المنتج</th><th>المباع</th><th>الإيراد</th></tr></thead>
      <tbody>
        ${products.map(p => {
          const rev = (p.salesLog || []).reduce((s, x) => s + N(x.total), 0);
          return `<tr>
            <td>${p.name}</td>
            <td>${N(p.sold)} ${p.unit || ""}</td>
            <td>${currency(rev)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>

    <table class="table" style="margin-top:15px;">
      <tr><td>الإجمالي</td><td style="font-weight:600;">${currency(inv.gross)}</td></tr>
      <tr><td>(-) نولون</td><td style="color:var(--danger);">${currency(inv.ded_noulon)}</td></tr>
      <tr><td>(-) مشال</td><td style="color:var(--danger);">${currency(inv.ded_mashal)}</td></tr>
      <tr><td>(-) عمولة 7%</td><td style="color:var(--danger);">${currency(inv.ded_commission)}</td></tr>
      <tr style="background:#f0fdf4;">
        <td><strong>الصافي للمورد</strong></td>
        <td><strong style="color:var(--success);font-size:16px;">${currency(inv.net)}</strong></td>
      </tr>
    </table>
  `);
};
