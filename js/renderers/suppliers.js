// ===================== renderers/suppliers.js — الموردون (معدل) =====================

function getSuppBal(id) {
  const s = S.suppliers.find(x => x.id == id);
  if (!s) return 0;
  return s.ledger.reduce((sum, e) => e.type === 'invoice' ? sum + e.amount : sum - e.amount, 0);
}

function addSupplier() {
  const name  = document.getElementById('ns-name').value.trim();
  const phone = document.getElementById('ns-phone').value.trim();
  if (!name) return alert('أدخل اسم المورد');
  if (phone && !isValidPhone(phone)) return alert('رقم هاتف غير صحيح (يجب أن يبدأ بـ 01 متبوعاً بـ 9 أرقام)');
  
  S.suppliers.push({ id: generateId(), name, phone, ledger: [] });
  ['ns-name', 'ns-phone'].forEach(id => document.getElementById(id).value = '');
  save();
  renderSuppliersPage();  // استخدام الترقيم
  refreshDropdowns();
}

function delSupplier(id) {
  if (!confirm('حذف هذا المورد وكل حركاته؟')) return;
  
  // حذف المورد
  S.suppliers = S.suppliers.filter(s => s.id != id);
  
  // حذف الفواتير المرتبطة بهذا المورد
  S.invoices = S.invoices.filter(inv => inv.supplierId != id);
  
  // تحديث المنتجات: إزالة relation للمورد (تعيين supplierId فارغ)
  for (const product of S.products) {
    if (product.supplierId == id) {
      product.supplierId = '';
    }
  }
  
  // حذف المصروفات المرتبطة بهذا المورد
  S.expenses = S.expenses.filter(exp => exp.suppId != id);
  
  save();
  renderSuppliersPage();
  refreshDropdowns();
  showToast('تم حذف المورد وجميع بياناته', 'success');
}

function renderSuppListFiltered(keyword) {
  const filtered = S.suppliers.filter(s =>
    s.name.toLowerCase().includes(keyword) || (s.phone && s.phone.toLowerCase().includes(keyword)));
  const container = document.getElementById('supp-list-cont');
  if (!filtered.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد نتائج مطابقة</p>';
    return;
  }
  container.innerHTML = filtered.map(sup => {
    const bal = getSuppBal(sup.id);
    return `<div class="card supplier-card" style="cursor:pointer"
      data-name="${sup.name.toLowerCase()}" data-phone="${(sup.phone||'').toLowerCase()}"
      onclick="openSuppDetail(${sup.id})">
      <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:#fef5ec;border-bottom:2px solid #f5cba7">
        <div style="display:flex;align-items:center;gap:9px">
          <span>🚛</span>
          <div>
            <div style="font-weight:800;color:var(--orange)">${escapeHtml(sup.name)}</div>
            <div style="font-size:0.74rem;color:var(--gray)">${escapeHtml(sup.phone || 'لا يوجد هاتف')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="text-align:left">
            <div style="font-size:0.74rem;color:var(--gray)">المستحق</div>
            <div style="font-weight:900;color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${N(bal)} جنيه</div>
          </div>
          <button class="btn btn-r btn-xs no-print" onclick="event.stopPropagation();delSupplier(${sup.id})">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterSuppliersList() {
  const kw = document.getElementById('searchSupplierInput').value.trim().toLowerCase();
  if (suppliersPaginator) {
    const cards = document.querySelectorAll('#supp-list-cont .supplier-card');
    if (cards.length) {
      cards.forEach(card => {
        const name  = card.getAttribute('data-name')  || '';
        const phone = card.getAttribute('data-phone') || '';
        card.style.display = (name.includes(kw) || phone.includes(kw)) ? '' : 'none';
      });
    } else {
      renderSuppListFiltered(kw);
    }
  } else {
    renderSuppListFiltered(kw);
  }
}

function openSuppDetail(id) {
  const s = S.suppliers.find(x => x.id == id);
  if (!s) return;
  document.getElementById('supp-list-view').style.display   = 'none';
  document.getElementById('supp-detail-view').style.display = 'block';
  document.getElementById('sd-name').textContent = escapeHtml(s.name);
  const bal = getSuppBal(id);
  document.getElementById('sd-bal').textContent = N(bal) + ' جنيه';
  let run = 0, html = '';
  if (!s.ledger.length) {
    html = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد حركات</p>';
  } else {
    html = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.83rem">
      <thead><tr style="background:#f0f7f0"><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>المستحق</th></tr></thead>
      <tbody>`;
    s.ledger.forEach(e => {
      if (e.type === 'invoice') run += e.amount; else run -= e.amount;
      const isInv = e.type === 'invoice';
      html += `<tr>
        <td style="padding:6px 5px;font-size:0.78rem">${e.date}</td>
        <td style="padding:6px 5px">${isInv
          ? `<span style="background:#d6eaf8;color:var(--blue);border-radius:4px;padding:2px 6px;font-size:0.7rem;cursor:pointer" onclick="goToInvoice(${e.invId})">فاتورة ↗</span>`
          : `<span style="background:#fde8e8;color:var(--red);border-radius:4px;padding:2px 6px;font-size:0.7rem">خصم</span>`}</td>
        <td style="padding:6px 5px;font-weight:900;color:${isInv ? 'var(--green)' : 'var(--red)'}">${isInv ? '+' : '-'}${N(e.amount)} جنيه</td>
        <td style="padding:6px 5px;font-weight:900;color:${run > 0 ? 'var(--red)' : 'var(--green)'}">${N(run)} جنيه</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }
  document.getElementById('sd-body').innerHTML = html;
}

function showSuppList() {
  document.getElementById('supp-list-view').style.display   = 'block';
  document.getElementById('supp-detail-view').style.display = 'none';
  renderSuppliersPage(); // إعادة عرض القائمة مع الترقيم
}

// تعديل دالة renderSuppList لاستخدام pagination إذا كانت موجودة
window.renderSuppList = function() {
  if (typeof renderSuppliersPage === 'function') {
    renderSuppliersPage();
  } else {
    // fallback أصلي
    const c = document.getElementById('supp-list-cont');
    if (!S.suppliers.length) { c.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا يوجد موردون</p>'; return; }
    c.innerHTML = S.suppliers.map(s => {
      const bal = getSuppBal(s.id);
      return `<div class="card supplier-card" style="cursor:pointer"
        data-name="${s.name.toLowerCase()}" data-phone="${(s.phone||'').toLowerCase()}"
        onclick="openSuppDetail(${s.id})">
        <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:#fef5ec;border-bottom:2px solid #f5cba7">
          <div style="display:flex;align-items:center;gap:9px">
            <span>🚛</span>
            <div>
              <div style="font-weight:800;color:var(--orange)">${escapeHtml(s.name)}</div>
              <div style="font-size:0.74rem;color:var(--gray)">${escapeHtml(s.phone || 'لا يوجد هاتف')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="text-align:left">
              <div style="font-size:0.74rem;color:var(--gray)">المستحق</div>
              <div style="font-weight:900;color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${N(bal)} جنيه</div>
            </div>
            <button class="btn btn-r btn-xs no-print" onclick="event.stopPropagation();delSupplier(${s.id})">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
};
