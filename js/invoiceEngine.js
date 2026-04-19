import { supabase, DB, updateSupplierLedger } from "./data.js";
import { N } from "./utils.js";

// =========================
// CHECK & AUTO-GENERATE INVOICE
// =========================
export async function checkAndGenerateInvoice(supplierId) {
  try {
    const products = DB.products.filter(
      p => String(p.supplier_id || p.supplierId) === String(supplierId) && !p.locked
    );

    if (!products.length) return;

    // تحقق أن كل المنتجات نفدت
    const allSold = products.every(p => N(p.sold) >= N(p.totalQty) && N(p.totalQty) > 0);
    if (!allSold) return;

    // حساب الإجماليات
    let gross = 0, totalNoulon = 0, totalMashal = 0;

    products.forEach(p => {
      (p.salesLog || []).forEach(s => (gross += N(s.total)));
      totalNoulon += N(p.noulon);
      totalMashal += N(p.mashal);
    });

    if (gross === 0) return;

    const commission = Math.round(gross * 0.07);
    const net = gross - totalNoulon - totalMashal - commission;

    // منع التكرار
    const alreadyExists = DB.invoices.some(
      i => String(i.supplier_id || i.supplierId) === String(supplierId) && N(i.gross) === gross
    );
    if (alreadyExists) return;

    const sid = String(supplierId);

    const { error } = await supabase.from("invoices").insert({
      supplier_id:     sid,
      supplier_name:   getSupplierName(sid),
      date:            new Date().toISOString(),
      products:        products,
      gross:           gross,
      ded_noulon:      totalNoulon,
      ded_mashal:      totalMashal,
      ded_commission:  commission,
      net:             net,
      created_at:      new Date().toISOString()
    });

    if (error) throw error;

    await updateSupplierLedger(sid, {
      type:   "invoice",
      amount: net,
      note:   "فاتورة تلقائية",
      date:   new Date().toISOString()
    });

    console.log("[Invoice] تم إنشاء فاتورة للمورد", sid);
  } catch (err) {
    console.error("[invoiceEngine]", err.message);
  }
}

function getSupplierName(id) {
  const s = DB.suppliers.find(x => String(x.id) === String(id));
  return s ? s.name : "";
}
