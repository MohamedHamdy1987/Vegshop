// ===================== renderers/invoices.js — فواتير الموردين (معدل) =====================

function generateInvoice() {
  const id = document.getElementById('inv-supp-sel').value;
  if (!id) return alert('اختر مورداً');
  generateInvoiceFor(id, false);
}

function generateInvoiceFor(supplierId, auto) {
  const sup = S.suppliers.find(s => s.id == supplierId);
  if (!sup) return;
  
  // التحقق من وجود فاتورة لنفس المورد في نفس اليوم
  const existingInvoice = S.invoices.find(inv => inv.supplierId == supplierId && inv.date === S.date);
  if (existingInvoice) {
    if (!auto) alert(`يوجد فاتورة لهذا المورد بتاريخ ${S.date} بالفعل. يمكنك تعديلها.`);
    return;
  }
  
  // جمع المنتجات الخاصة بهذا المورد والتي تم بيعها في اليوم الحالي (وليس المرحلة)
  const prods = S.products.filter(p => p.supplierId == supplierId && 
    p.salesLog.some(log => log.date === S.date));
  
  if (!prods.length) {
    if (!auto) alert('لا توجد مبيعات لهذا المورد في اليوم الحالي');
    return;
  }

  const gross = prods.reduce((s, p) => s + p.salesLog
    .filter(log => log.date === S.date)
    .reduce((ss, x) => ss + x.total, 0), 0);
    
  const noulon = prods.reduce((s, p) => s + (p.noulon || 0), 0);
  const mashal = prods.reduce((s, p) => s + (p.mashal || 0), 0);
  const commission = Math.round(gross * 0.07);
  const net = gross - noulon - mashal - commission;

  const inv = {
    id: generateId(),
    supplierId,
    supplierName: sup.name,
    date: S.date,
    products: prods.map(p => ({
      name: p.name,
      unit: p.unit,
      sold: p.salesLog.filter(log => log.date === S.date).reduce((sum, log) => sum + (log.qty || 0), 0),
      totalWeight: p.salesLog.filter(log => log.date === S.date).reduce((sum, log) => sum + (log.weight || 0), 0),
      total: p.salesLog.filter(log => log.date === S.date).reduce((sum, log) => sum + log.total, 0),
      dates: [S.date]
    })),
    gross,
    ded_noulon: noulon,
    ded_commission: commission,
    ded_mashal: mashal,
    net
  };

  S.invoices.unshift(inv);
  
  // تحديث دفتر أستاذ المورد
  if (!sup.ledger.some(e => e.invId == inv.id)) {
    sup.ledger.push({
      date: S.date,
      type: 'invoice',
      amount: net,
      ref: prods.map(p => `${p.name}`).join('+'),
      invId: inv.id
    });
  }
  
  save();
  renderInvoicesPageWithPagination(); // استخدام الترقيم
  renderSuppliersPage();
  
  if (auto) {
    showToast(`✅ فاتورة "${sup.name}" — الصافي: ${N(net)} جنيه`, 'success');
  } else {
    alert(`✅ تم إنشاء فاتورة "${sup.name}" — الصافي: ${N(net)} جنيه`);
  }
}

function updateDed(invId, field, val) {
  const inv = S.invoices.find(i => i.id == invId);
  if (!inv) return;
  inv[field] = parseFloat(val) || 0;
  const ded = (inv.ded_noulon || 0) + (inv.ded_commission || 0) + (inv.ded_mashal || 0);
  inv.net = inv.gross - ded;
  
  const sup = S.suppliers.find(s => s.id == inv.supplierId);
  if (sup) {
    const entry = sup.ledger.find(e => e.invId == invId);
    if (entry) entry.amount = inv.net;
  }
  save();
  
  // تحديث العرض المباشر
  const dedEl = document.getElementById('ded-' + invId);
  if (dedEl) dedEl.textContent = N(ded) + ' جنيه';
  const netEl = document.getElementById('net-' + invId);
  if (netEl) netEl.textContent = N(inv.net) + ' جنيه';
}

function delInvoice(id) {
  if (!confirm('حذف هذه الفاتورة؟')) return;
  const inv = S.invoices.find(i => i.id == id);
  if (inv) {
    const sup = S.suppliers.find(s => s.id == inv.supplierId);
    if (sup) sup.ledger = sup.ledger.filter(e => e.invId != id);
  }
  S.invoices = S.invoices.filter(i => i.id != id);
  save();
  renderInvoicesPageWithPagination();
  renderSuppliersPage();
  showToast('تم حذف الفاتورة', 'success');
}

function goToInvoice(invId) {
  // التبديل إلى صفحة الفواتير
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-invoices').classList.add('active');
  const invoicesTab = document.querySelector('nav.tabs button:nth-child(7)');
  if (invoicesTab) invoicesTab.classList.add('active');
  renderInvoicesPageWithPagination();
  setTimeout(() => {
    const el = document.getElementById('inv-' + invId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// دالة عرض الفواتير مع الترقيم (تستدعي من pagination.js)
window.renderInvoicesPage = function() {
  if (typeof renderInvoicesPageWithPagination === 'function') {
    renderInvoicesPageWithPagination();
  } else {
    // fallback أصلي
    const c = document.getElementById('invoices-cont');
    if (!S.invoices.length) { c.innerHTML = '<p style="text-align:center;color:#aaa;padding:32px">لا توجد فواتير</p>'; return; }
    c.innerHTML = S.invoices.map(inv => {
      const gross = inv.gross || inv.products.reduce((s, p) => s + p.total, 0);
      const n = parseFloat(inv.ded_noulon) || 0;
      const cm = parseFloat(inv.ded_commission) || 0;
      const m = parseFloat(inv.ded_mashal) || 0;
      const ded = n + cm + m, net = gross - ded;
      const rows = inv.products.map(p =>
        `<tr>
          <td style="padding:5px;font-weight:700">${escapeHtml(p.name)}</td>
          <td style="padding:5px">${escapeHtml(p.unit)}</td>
          <td style="padding:5px">${p.sold || 0}</td>
          <td style="padding:5px">${p.totalWeight > 0 ? p.totalWeight + ' ك' : '-'}</td>
          <td style="padding:5px;font-weight:900;color:var(--green)">${N(p.total)} جنيه</td>
        </tr>`).join('');
      return `<div class="card" id="inv-${inv.id}">
        <div class="ch g" style="justify-content:space-between">
          <div>
            <h2>🧾 فاتورة: ${escapeHtml(inv.supplierName)}</h2>
            <div style="font-size:0.76rem;color:var(--gray)">${inv.date}</div>
          </div>
          <div style="display:flex;gap:6px" class="no-print">
            <button class="btn btn-b btn-sm" onclick="window.print()">🖨️</button>
            <button class="btn btn-r btn-sm" onclick="delInvoice(${inv.id})">🗑️</button>
          </div>
        </div>
        <div class="cb">
          <div style="overflow-x:auto"><table>...</table></div>
          <div class="netbox"><span>💰 الصافي المستحق للمورد</span><span>${N(net)} جنيه</span></div>
        </div>
      </div>`;
    }).join('');
  }
};
