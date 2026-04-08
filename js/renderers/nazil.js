// ===================== renderers/nazil.js — الأصناف النازلة (معدل) =====================

function addProduct() {
  const name = document.getElementById('np-name').value.trim();
  const qty = parseFloat(document.getElementById('np-qty').value);
  const unit = document.getElementById('np-unit').value;
  const noulon = parseFloat(document.getElementById('np-noulon').value) || 0;
  const mashal = parseFloat(document.getElementById('np-mashal').value) || 0;
  const supplierId = document.getElementById('np-supplier').value;

  if (!name || !qty) return alertMsg('أدخل الصنف والكمية', 'warning');
  if (!supplierId) return alertMsg('اختر المورد', 'warning');
  if (qty <= 0) return alertMsg('الكمية يجب أن تكون أكبر من صفر', 'warning');

  // التحقق من عدم تكرار نفس الصنف لنفس المورد (لمنع الازدواجية)
  const existing = S.products.find(p => p.name === name && p.supplierId === supplierId && !p.carryoverFrom);
  if (existing) {
    if (confirm(`يوجد صنف "${name}" بالفعل للمورد الحالي. هل تريد إضافة كمية إضافية؟`)) {
      existing.totalQty += qty;
      existing.noulon = (existing.noulon || 0) + noulon;
      existing.mashal = (existing.mashal || 0) + mashal;
      save();
      renderNazilList();
      renderSalesTable();
      renderBaqi();
      refreshDropdowns();
      showToast(`تم إضافة ${qty} ${unit} إلى الصنف ${name}`, 'success');
    }
    return;
  }

  S.products.push({
    id: generateId(),
    name,
    unit,
    noulon,
    mashal,
    supplierId,
    totalQty: qty,
    sold: 0,
    totalWeight: 0,
    salesLog: [],
    fromDate: S.date,
    carryoverFrom: null
  });
  
  ['np-name', 'np-qty', 'np-noulon', 'np-mashal'].forEach(id => document.getElementById(id).value = '');
  save();
  renderNazilList();
  renderSalesTable();
  renderBaqi();
  refreshDropdowns();
  showToast(`تم إضافة صنف ${name} بنجاح`, 'success');
}

function renderNazilList() {
  const items = S.products.filter(p => !p.carryoverFrom);
  const container = document.getElementById('nazil-list');
  if (!container) return;
  
  if (!items.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:18px">لا توجد أصناف</p>';
    return;
  }
  
  container.innerHTML = items.map((p, i) => {
    const sup = S.suppliers.find(s => s.id == p.supplierId);
    const gi = S.products.indexOf(p);
    return `<div style="background:#fff;border:1.5px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden;">
      <div style="padding:10px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;background:#e8f8f5;" onclick="goToProduct(${gi})">
        <div style="background:#0e6655;color:#fff;border-radius:50%;width:25px;height:25px;display:flex;align-items:center;justify-content:center;font-size:0.77rem;font-weight:900;">${i + 1}</div>
        <div>
          <div style="font-weight:800;font-size:0.93rem;color:#0e6655">${escapeHtml(p.name)}</div>
          <div style="font-size:0.74rem;color:var(--gray)">المورد: ${sup ? escapeHtml(sup.name) : '-'} | ${escapeHtml(p.unit)}</div>
        </div>
        <div style="margin-right:auto;font-weight:900;color:#0e6655">${p.totalQty} ${escapeHtml(p.unit)}</div>
        <button class="btn btn-r btn-xs" onclick="event.stopPropagation();delProduct(${gi})">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// تصدير للاستخدام العام
window.addProduct = addProduct;
window.renderNazilList = renderNazilList;
