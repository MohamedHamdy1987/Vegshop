// ===================== renderers/baqi.js — الباقي في المحل (معدل) =====================

function renderBaqi() {
  const items = S.products.filter(p => p.carryoverFrom);
  const container = document.getElementById('baqi-body');
  if (!container) return;
  
  if (!items.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد متبقيات</p>';
    return;
  }
  
  container.innerHTML = items.map((p, i) => {
    const sup = S.suppliers.find(s => s.id == p.supplierId);
    const remaining = p.totalQty - p.sold;
    return `<div style="background:#fff;border:1.5px solid #d2b4de;border-radius:10px;margin-bottom:8px;padding:11px 13px;display:flex;align-items:center;gap:10px;">
      <div style="background:#6c3483;color:#fff;border-radius:50%;width:25px;height:25px;display:flex;align-items:center;justify-content:center;font-size:0.77rem;font-weight:900;">${i + 1}</div>
      <div style="flex:1">
        <div style="font-weight:800;color:#6c3483">${escapeHtml(p.name)}</div>
        <div style="font-size:0.76rem;color:var(--gray)">المورد: ${sup ? escapeHtml(sup.name) : '-'} | من: ${escapeHtml(p.carryoverFrom)}</div>
      </div>
      <div style="font-weight:900;color:#6c3483">${remaining} ${escapeHtml(p.unit)}</div>
    </div>`;
  }).join('');
}

// تصدير للاستخدام العام
window.renderBaqi = renderBaqi;
