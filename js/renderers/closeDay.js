import { supabase, DB } from "../data.js";
import { N, today }     from "../utils.js";
import { showToast, confirmModal } from "../ui.js";

// تُستدعى من app.js كـ window.triggerCloseDay
export function triggerCloseDay() {
  confirmModal(
    "⚠️ هل تريد إغلاق اليوم؟\nسيتم ترحيل المتبقي وقفل المنتجات الحالية. لا يمكن التراجع.",
    closeDay
  );
}

async function closeDay() {
  try {
    const currentDate = today();
    let movedCount    = 0;

    // المنتجات غير المقفلة فقط
    const activeProducts = DB.products.filter(p => !p.locked);

    for (const p of activeProducts) {
      const remaining = N(p.totalQty) - N(p.sold);

      // ترحيل الباقي إلى يوم جديد
      if (remaining > 0) {
        const { error } = await supabase.from("products").insert({
          name:          p.name,
          unit:          p.unit || "",
          supplier_id:   p.supplier_id || p.supplierId || null,
          supplierId:    p.supplier_id || p.supplierId || null,
          totalQty:      remaining,
          sold:          0,
          salesLog:      [],
          noulon:        p.noulon || 0,
          mashal:        p.mashal || 0,
          carryover:     true,
          carryover_from: p.id,
          from_date:     currentDate,
          created_at:    new Date().toISOString()
        });
        if (!error) movedCount++;
        else console.warn("[closeDay] خطأ في ترحيل المنتج:", error.message);
      }

      // قفل المنتج القديم
      await supabase
        .from("products")
        .update({ locked: true, locked_at: new Date().toISOString() })
        .eq("id", p.id);
    }

    // تسجيل الترحيل في السجل
    await supabase.from("tarhil_log").insert({
      date:        currentDate,
      movedCount,
      total_products: activeProducts.length,
      created_at:  new Date().toISOString()
    });

    showToast(`✅ تم إغلاق اليوم — ${movedCount} صنف تم ترحيله`);

    setTimeout(() => navigate("dashboard"), 1500);

  } catch (err) {
    console.error("[closeDay]", err);
    showToast("فشل إغلاق اليوم", false);
  }
}
