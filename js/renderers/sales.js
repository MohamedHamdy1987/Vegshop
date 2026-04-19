import { DB, updateProduct, addCollection, updateCustomerLedger } from "../data.js";
import { openModal, closeModal, N } from "../utils.js";
import { showToast, confirmModal, emptyState } from "../ui.js";
import { checkAndGenerateInvoice } from "../invoiceEngine.js";

export function renderSales() {
  const el = document.getElementById("sales");
  if (!el) return;

  const available = DB.products.filter(p => !p.locked && (N(p.totalQty) - N(p.sold)) > 0);

  el.innerHTML = `
    <div class="section-header">
      <h2>🛒 المبيعات</h2>
    </div>
    ${!available.length
      ? emptyState("لا توجد منتجات متاحة للبيع")
      : `<table class="table">
          <thead>
            <tr><th>المنتج</th><th>المورد</th><th>المتاح</th><th>الوحدة</th><th>بيع</th></tr>
          </thead>
          <tbody>
            ${available.map(p => {
              const sup = DB.suppliers.find(s => String(s.id) === String(p.supplier_id || p.supplierId));
              return `
              <tr>
                <td>${p.name}</td>
                <td>${sup ? sup.name : "-"}</td>
                <td><strong>${N(p.totalQty) - N(p.sold)}</strong></td>
                <td>${p.unit || "-"}</td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="openSellModal('${p.id}')">🛒 بيع</button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>`}
  `;
}

// =========================
// OPEN SELL MODAL
// =========================
window.openSellModal = function (productId) {
  const p = DB.products.find(x => String(x.id) === String(productId));
  if (!p) return;

  const available = N(p.totalQty) - N(p.sold);

  openModal(`🛒 بيع: ${p.name}`, `
    <p style="color:var(--muted);font-size:13px;margin-top:0;">المتاح: <strong>${available}</strong> ${p.unit || ""}</p>

    <label>الكمية *</label>
    <input id="sell_qty" type="number" min="1" max="${available}" placeholder="0">

    <label>السعر للوحدة *</label>
    <input id="sell_price" type="number" min="0" placeholder="0">

    <label>طريقة الدفع</label>
    <select id="sell_type">
      <option value="cash">كاش</option>
      <option value="credit">آجل</option>
    </select>

    <div id="customerRow" style="display:none;">
      <label>العميل</label>
      <select id="sell_customer">
        <option value="">-- اختر العميل --</option>
        ${DB.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
      </select>
    </div>
  `, `
    <button class="btn btn-primary" onclick="confirmSale('${productId}')">✅ تأكيد البيع</button>
    <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>
  `);

  // إظهار/إخفاء العميل عند اختيار آجل
  setTimeout(() => {
    const sel = document.getElementById("sell_type");
    if (sel) sel.onchange = () => {
      const row = document.getElementById("customerRow");
      if (row) row.style.display = sel.value === "credit" ? "block" : "none";
    };
  }, 50);
};

// =========================
// CONFIRM SALE
// =========================
window.confirmSale = function (productId) {
  const qty   = N(document.getElementById("sell_qty")?.value);
  const price = N(document.getElementById("sell_price")?.value);

  if (!qty || qty <= 0)   { showToast("ادخل الكمية", false); return; }
  if (!price || price < 0) { showToast("ادخل السعر", false); return; }

  const p = DB.products.find(x => String(x.id) === String(productId));
  if (!p) return;

  const available = N(p.totalQty) - N(p.sold);
  if (qty > available) { showToast(`الكمية أكبر من المتاح (${available})`, false); return; }

  confirmModal(`بيع ${qty} ${p.unit || ""} من "${p.name}" بسعر ${price} جنيه؟`, () => {
    executeSale(productId, qty, price);
  });
};

// =========================
// EXECUTE SALE
// =========================
async function executeSale(productId, qty, price) {
  try {
    const type       = document.getElementById("sell_type")?.value || "cash";
    const customerId = document.getElementById("sell_customer")?.value || "";

    if (type === "credit" && !customerId) {
      showToast("اختر العميل للبيع الآجل", false);
      return;
    }

    const p     = DB.products.find(x => String(x.id) === String(productId));
    const total = qty * price;

    // تحديث المنتج
    const newSold = N(p.sold) + qty;
    const newLog  = [...(p.salesLog || []), {
      qty, price, total,
      type,
      customer_id: customerId || null,
      date: new Date().toISOString()
    }];

    const updated = await updateProduct(productId, { sold: newSold, salesLog: newLog });
    if (!updated) { showToast("فشل تحديث المنتج", false); return; }

    // تسجيل التحصيل
    if (type === "cash") {
      await addCollection({
        amount:     total,
        isCash:     true,
        product_id: productId,
        note:       p.name,
        date:       new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    } else {
      // آجل — تسجيل في حساب العميل
      const customer = DB.customers.find(x => String(x.id) === String(customerId));
      if (customer) {
        const ledger = Array.isArray(customer.ledger) ? [...customer.ledger] : [];
        ledger.push({
          type:       "sale",
          amount:     total,
          note:       `بيع ${qty} ${p.unit || ""} من ${p.name}`,
          product_id: productId,
          date:       new Date().toISOString()
        });
        const { dbUpdate } = await import("../data.js");
        await dbUpdate("customers", customerId, { ledger });
      }
    }

    // فحص وإنشاء الفاتورة تلقائياً
    await checkAndGenerateInvoice(p.supplier_id || p.supplierId);

    closeModal();
    showToast("✅ تم البيع بنجاح");
    navigate("sales");

  } catch (err) {
    console.error("[executeSale]", err);
    showToast("حدث خطأ أثناء البيع", false);
  }
}
