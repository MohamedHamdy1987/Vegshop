import { DB, dbInsert, dbDelete } from "../data.js";
import { N, currency, openModal, closeModal } from "../utils.js";
import { showToast, confirmModal, emptyState } from "../ui.js";

// =========================
// باقي
// =========================
export function renderBaqi() {
  const el = document.getElementById("baqi");
  if (!el) return;

  const products = DB.products.filter(p => !p.locked && (N(p.totalQty) - N(p.sold)) > 0);

  el.innerHTML = `
    <div class="section-header"><h2>📦 المتبقي من المنتجات</h2></div>
    ${!products.length
      ? emptyState("لا توجد منتجات متبقية")
      : `<table class="table">
          <thead><tr><th>المنتج</th><th>المورد</th><th>الإجمالي</th><th>المباع</th><th>المتبقي</th></tr></thead>
          <tbody>
            ${products.map(p => {
              const sup  = DB.suppliers.find(s => String(s.id) === String(p.supplier_id || p.supplierId));
              const rem  = N(p.totalQty) - N(p.sold);
              return `<tr>
                <td>${p.name}</td>
                <td>${sup ? sup.name : "-"}</td>
                <td>${N(p.totalQty)}</td>
                <td>${N(p.sold)}</td>
                <td><strong style="color:var(--primary);">${rem}</strong> ${p.unit || ""}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>`}
  `;
}

// =========================
// نازل (منتهي)
// =========================
export function renderNazil() {
  const el = document.getElementById("nazil");
  if (!el) return;

  const products = DB.products.filter(p => N(p.sold) >= N(p.totalQty) && N(p.totalQty) > 0);

  el.innerHTML = `
    <div class="section-header"><h2>🚛 المنتجات المنتهية</h2></div>
    ${!products.length
      ? emptyState("لا توجد منتجات منتهية")
      : `<table class="table">
          <thead><tr><th>المنتج</th><th>المورد</th><th>الكمية</th><th>إيراد البيع</th></tr></thead>
          <tbody>
            ${products.map(p => {
              const sup = DB.suppliers.find(s => String(s.id) === String(p.supplier_id || p.supplierId));
              const rev = (p.salesLog || []).reduce((s, x) => s + N(x.total), 0);
              return `<tr>
                <td>${p.name}</td>
                <td>${sup ? sup.name : "-"}</td>
                <td>${N(p.sold)} ${p.unit || ""}</td>
                <td style="color:var(--success);font-weight:600;">${currency(rev)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>`}
  `;
}

// =========================
// ترحيلات
// =========================
export function renderTarhil() {
  const el = document.getElementById("tarhil");
  if (!el) return;

  const logs = DB.tarhil_log || [];

  el.innerHTML = `
    <div class="section-header"><h2>📋 سجل الترحيلات</h2></div>
    ${!logs.length
      ? emptyState("لا توجد ترحيلات بعد")
      : `<table class="table">
          <thead><tr><th>التاريخ</th><th>عدد الأصناف المرحلة</th></tr></thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td>${l.date || "-"}</td>
                <td><strong>${l.movedCount || 0}</strong> صنف</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
  `;
}

// =========================
// محلات
// =========================
export function renderShops() {
  const el = document.getElementById("shops");
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <h2>🏬 المحلات</h2>
      <button class="btn btn-primary" onclick="openAddShop()">➕ إضافة محل</button>
    </div>
    ${!DB.shops.length
      ? emptyState("لا توجد محلات بعد")
      : `<table class="table">
          <thead><tr><th>الاسم</th><th>العنوان</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${DB.shops.map(s => `
              <tr>
                <td>${s.name}</td>
                <td>${s.address || "-"}</td>
                <td>
                  <button class="btn btn-sm btn-danger" onclick="deleteShop('${s.id}')">🗑️</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>`}
  `;
}

window.openAddShop = function () {
  openModal("➕ إضافة محل", `
    <label>اسم المحل *</label>
    <input id="shop_name" placeholder="اسم المحل">
    <label>العنوان</label>
    <input id="shop_address" placeholder="العنوان">
  `, `
    <button class="btn btn-primary" onclick="saveShop()">حفظ</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);
};

window.saveShop = async function () {
  const name    = document.getElementById("shop_name").value.trim();
  const address = document.getElementById("shop_address").value.trim();
  if (!name) { showToast("ادخل اسم المحل", false); return; }
  const ok = await dbInsert("shops", { name, address, created_at: new Date().toISOString() });
  if (ok) { showToast("تمت الإضافة ✓"); closeModal(); navigate("shops"); }
};

window.deleteShop = function (id) {
  confirmModal("هل تريد حذف هذا المحل؟", async () => {
    const ok = await dbDelete("shops", id);
    if (ok) { showToast("تم الحذف"); navigate("shops"); }
  });
};
