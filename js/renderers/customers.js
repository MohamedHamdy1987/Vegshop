// ===================== renderers/customers.js — العملاء (معدل) =====================

function getCustBal(id) {
  const c = S.customers.find(x => x.id == id);
  if (!c) return 0;
  return c.ledger.reduce((s, e) =>
    e.type === 'order' ? s + e.amount : (e.type === 'payment' || e.type === 'discount') ? s - e.amount : s, 0);
}

function addCustomer() {
  const name  = document.getElementById('nc-name').value.trim();
  const phone = document.getElementById('nc-phone').value.trim();
  const bal   = parseFloat(document.getElementById('nc-balance').value) || 0;
  if (!name) return alert('أدخل اسم العميل');
  if (phone && !isValidPhone(phone)) return alert('رقم هاتف غير صحيح (يجب أن يبدأ بـ 01 متبوعاً بـ 9 أرقام)');
  
  const cust = { id: generateId(), name, phone, ledger: [] };
  if (bal > 0) cust.ledger.push({ date: S.date, type: 'order', amount: bal, ref: 'رصيد منقول من الدفاتر', isTarhil: false });
  S.customers.push(cust);
  ['nc-name', 'nc-phone', 'nc-balance'].forEach(id => document.getElementById(id).value = '');
  save();
  renderCustomersPage();  // استخدام الترقيم
  refreshDropdowns();
}

function delCustomer(id) {
  if (!confirm('حذف هذا العميل وكل حركاته؟')) return;
  
  // حذف العميل من قائمة العملاء
  S.customers = S.customers.filter(c => c.id != id);
  
  // حذف سجلات التحصيلات المرتبطة
  S.collections = S.collections.filter(c => c.custId != id);
  
  // حذف إدخالات الترحيلات (tarhilLog) المرتبطة بهذا العميل
  for (const dateStr in S.tarhilLog) {
    if (S.tarhilLog[dateStr][id]) {
      delete S.tarhilLog[dateStr][id];
    }
  }
  
  // حذف سجلات المبيعات (salesLog) من المنتجات المرتبطة بهذا العميل
  for (const product of S.products) {
    product.salesLog = product.salesLog.filter(sale => sale.custId != id);
    // إعادة حساب الكمية المباعة بعد الحذف
    product.sold = product.salesLog.reduce((sum, sale) => sum + (sale.qty || 0), 0);
  }
  
  save();
  renderCustomersPage();
  refreshDropdowns();
  showToast('تم حذف العميل وجميع بياناته', 'success');
}

function renderCustListFiltered(keyword) {
  const filtered = S.customers.filter(c =>
    c.name.toLowerCase().includes(keyword) || (c.phone && c.phone.toLowerCase().includes(keyword)));
  const container = document.getElementById('cust-list-cont');
  if (!filtered.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد نتائج مطابقة</p>';
    return;
  }
  container.innerHTML = filtered.map(cust => {
    const bal = getCustBal(cust.id);
    return `<div class="card customer-card" style="cursor:pointer"
      data-name="${cust.name.toLowerCase()}" data-phone="${(cust.phone||'').toLowerCase()}"
      onclick="openCustDetail(${cust.id})">
      <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:var(--blue-light);border-bottom:2px solid #c5d8e8">
        <div style="display:flex;align-items:center;gap:9px">
          <span>👤</span>
          <div>
            <div style="font-weight:800;color:var(--blue)">${escapeHtml(cust.name)}</div>
            <div style="font-size:0.74rem;color:var(--gray)">${escapeHtml(cust.phone || 'لا يوجد هاتف')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="text-align:left">
            <div style="font-size:0.74rem;color:var(--gray)">الرصيد</div>
            <div style="font-weight:900;color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${N(bal)} جنيه</div>
          </div>
          <button class="btn btn-r btn-xs no-print" onclick="event.stopPropagation();delCustomer(${cust.id})">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterCustomersList() {
  const kw    = document.getElementById('searchCustomerInput').value.trim().toLowerCase();
  // إذا كان الترقيم مفعلاً، نستخدم البحث على الصفحة الحالية فقط
  if (customersPaginator) {
    const cards = document.querySelectorAll('#cust-list-cont .customer-card');
    if (cards.length) {
      cards.forEach(card => {
        const name  = card.getAttribute('data-name')  || '';
        const phone = card.getAttribute('data-phone') || '';
        card.style.display = (name.includes(kw) || phone.includes(kw)) ? '' : 'none';
      });
    } else {
      renderCustListFiltered(kw);
    }
  } else {
    renderCustListFiltered(kw);
  }
}

function openCustDetail(id) {
  const c = S.customers.find(x => x.id == id);
  if (!c) return;
  document.getElementById('cust-list-view').style.display   = 'none';
  document.getElementById('cust-detail-view').style.display = 'block';
  document.getElementById('cd-name').textContent = escapeHtml(c.name);
  const bal = getCustBal(id);
  document.getElementById('cd-bal').textContent = N(bal) + ' جنيه';
  const sorted = [...c.ledger].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) {
    document.getElementById('cd-body').innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد حركات</p>';
    return;
  }
  let run = 0, html = '';
  sorted.forEach(e => {
    const isOrd = e.type === 'order';
    if (isOrd) run += e.amount; else run -= e.amount;
    const ac = isOrd ? 'var(--blue)' : 'var(--red)';
    const bc = run > 0 ? 'var(--red)' : 'var(--green)';
    let lbl = '';
    if (isOrd && e.isTarhil) lbl = `<span style="color:#784212;font-weight:800;cursor:pointer;text-decoration:underline" onclick="goToTarhilDate('${e.tarhilDate}')">يومية ${e.date}</span>`;
    else if (isOrd)          lbl = `<span style="color:#555">${escapeHtml(e.ref || 'طلب')}</span>`;
    else                     lbl = `<span style="color:var(--red)">${e.type === 'discount' ? 'خصم — ' : 'دفعة — '}${escapeHtml(e.ref || '')}</span>`;
    html += `<div style="display:flex;align-items:center;gap:7px;padding:7px 3px;border-bottom:1px solid #f0f0f0;font-size:0.84rem;flex-wrap:wrap">
      <span style="font-weight:900;color:${ac};font-size:0.93rem;min-width:85px">${isOrd ? '+' : '-'}${N(e.amount)} جنيه</span>
      <span style="flex:1;font-size:0.79rem">${lbl}</span>
      <span style="font-weight:800;font-size:0.78rem;color:${bc}">باقي: ${N(run)}</span>
    </div>${isOrd ? '<div style="border-bottom:1.5px dashed #ddd;margin:2px 0"></div>' : ''}`;
  });
  html += `<div class="netbox"><span>إجمالي الحساب</span><span>${N(bal)} جنيه</span></div>`;
  document.getElementById('cd-body').innerHTML = html;
  
  // إضافة زر طباعة الفاتورة (إذا كانت الدالة موجودة)
  if (typeof addPrintInvoiceButtonToCustomerDetail === 'function') {
    addPrintInvoiceButtonToCustomerDetail();
  }
}

function showCustList() {
  document.getElementById('cust-list-view').style.display   = 'block';
  document.getElementById('cust-detail-view').style.display = 'none';
  renderCustomersPage(); // إعادة عرض القائمة مع الترقيم
}

function shareCustomerWhatsApp() {
  const custName = document.getElementById('cd-name').textContent;
  const customer = S.customers.find(c => c.name === custName);
  if (!customer) return alert('لم يتم العثور على العميل');
  const entries = customer.ledger || [];
  if (!entries.length) return alert('لا توجد حركات لهذا العميل');
  let ledgerText = '', running = 0;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach(e => {
    if (e.type === 'order') running += e.amount; else running -= e.amount;
    const typeDesc = e.type === 'order' ? 'فاتورة' : (e.type === 'discount' ? 'خصم' : 'دفعة');
    ledgerText += `${e.date} | ${typeDesc} | ${e.amount} ج | الرصيد: ${running} ج\n`;
  });
  const finalBalance = running;
  const status   = finalBalance > 0 ? 'مدين' : (finalBalance < 0 ? 'دائن' : 'متزن');
  const shopName = currentUser?.user_metadata?.shop_name || 'المحل';
  const msg = `*بيان حساب العميل*\n🏢 ${shopName}\n👤 العميل: ${customer.name}\n📞 الهاتف: ${customer.phone || 'غير مسجل'}\n📅 التاريخ: ${S.date}\n━━━━━━━━━━━━━━━━━━━\n*الحركات:*\n${ledgerText}━━━━━━━━━━━━━━━━━━━\n💰 *الرصيد الحالي:* ${Math.abs(finalBalance)} ج\n📝 *الحالة:* ${status}\n━━━━━━━━━━━━━━━━━━━\n_تم إنشاء هذا التقرير آلياً من نظام إدارة المحل._`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// تعديل دالة renderCustList لاستخدام pagination إذا كانت موجودة
// ولكن renderCustList الأصلية قد تُستدعى من external. سنقوم بتعريفها هنا بشكل آمن.
window.renderCustList = function() {
  if (typeof renderCustomersPage === 'function') {
    renderCustomersPage();
  } else {
    // fallback
    const c = document.getElementById('cust-list-cont');
    if (!S.customers.length) { c.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا يوجد عملاء</p>'; return; }
    c.innerHTML = S.customers.map(cust => {
      const bal = getCustBal(cust.id);
      return `<div class="card customer-card" style="cursor:pointer"
        data-name="${cust.name.toLowerCase()}" data-phone="${(cust.phone||'').toLowerCase()}"
        onclick="openCustDetail(${cust.id})">
        <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:var(--blue-light);border-bottom:2px solid #c5d8e8">
          <div style="display:flex;align-items:center;gap:9px">
            <span>👤</span>
            <div>
              <div style="font-weight:800;color:var(--blue)">${escapeHtml(cust.name)}</div>
              <div style="font-size:0.74rem;color:var(--gray)">${escapeHtml(cust.phone || 'لا يوجد هاتف')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="text-align:left">
              <div style="font-size:0.74rem;color:var(--gray)">الرصيد</div>
              <div style="font-weight:900;color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${N(bal)} جنيه</div>
            </div>
            <button class="btn btn-r btn-xs no-print" onclick="event.stopPropagation();delCustomer(${cust.id})">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
};
