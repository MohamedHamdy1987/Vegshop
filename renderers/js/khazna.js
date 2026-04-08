// ===================== renderers/khazna.js — الخزنة (تحصيلات + مصروفات) (معدل) =====================

// --- التحصيلات ---
function addCollection() {
  const custId = document.getElementById('col-cust-sel').value;
  const amount = parseFloat(document.getElementById('col-amount').value) || 0;
  const discount = parseFloat(document.getElementById('col-discount').value) || 0;
  const note = document.getElementById('col-note').value.trim();
  
  if (!custId) return alertMsg('اختر العميل', 'warning');
  if (amount <= 0 && discount <= 0) return alertMsg('أدخل مبلغ أو قطعية', 'warning');
  
  const cust = S.customers.find(c => c.id == custId);
  if (!cust) return alertMsg('العميل غير موجود', 'error');

  if (amount > 0) {
    const collectionId = generateId();
    S.collections.push({
      id: collectionId,
      date: S.date,
      custId,
      amount,
      note: note || 'دفعة',
      isCash: false,
      isDiscount: false
    });
    cust.ledger.push({
      date: S.date,
      type: 'payment',
      amount,
      ref: note || 'دفعة',
      collectionId
    });
  }
  
  if (discount > 0) {
    cust.ledger.push({
      date: S.date,
      type: 'discount',
      amount: discount,
      ref: note ? `قطعية - ${note}` : 'قطعية'
    });
  }

  // تفريغ الحقول
  document.getElementById('col-amount').value = '';
  document.getElementById('col-discount').value = '';
  document.getElementById('col-note').value = '';
  
  save();
  renderCollections();
  renderExpenses();
  renderDaySummary();
  renderCustomersPage();
  refreshDropdowns();
  
  if (amount > 0) showToast(`✅ تم تسجيل دفعة بقيمة ${N(amount)} جنيه للعميل ${cust.name}`, 'success');
  if (discount > 0) showToast(`✅ تم تسجيل قطعية بقيمة ${N(discount)} جنيه للعميل ${cust.name}`, 'success');
}

function renderCollections() {
  const today = S.collections.filter(c => c.date === S.date);
  const cash = today.filter(c => c.isCash === true);
  const customerPayments = today.filter(c => c.isCash === false && c.isDiscount !== true);
  let html = '';

  if (cash.length) {
    html += '<div style="font-size:0.78rem;font-weight:800;color:var(--green);margin:8px 0 5px">💵 النقديات</div>';
    cash.forEach(c => {
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:0.83rem">
        <span style="flex:1;color:#444">${escapeHtml(c.note || '-')}</span>
        <span style="font-weight:900;color:var(--green)">${N(c.amount)} جنيه</span>
        <button class="btn btn-r btn-xs" style="margin-right:6px" onclick="delCollection(${c.id})">🗑️</button>
      </div>`;
    });
  }

  if (customerPayments.length) {
    html += '<div style="font-size:0.78rem;font-weight:800;color:var(--blue);margin:10px 0 5px">📋 تسديدات العملاء</div>';
    customerPayments.forEach(c => {
      const cust = S.customers.find(x => x.id == c.custId);
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:0.83rem">
        <span style="font-weight:700">${cust ? escapeHtml(cust.name) : 'عميل محذوف'}</span>
        <span style="font-size:0.79rem;color:var(--gray);flex:1;margin:0 8px">${escapeHtml(c.note || '-')}</span>
        <span style="font-weight:900;color:var(--blue)">${N(c.amount)} جنيه</span>
        <button class="btn btn-r btn-xs" style="margin-right:6px" onclick="delCollection(${c.id})">🗑️</button>
      </div>`;
    });
  }

  if (!html) html = '<p style="color:#aaa;text-align:center;padding:12px">لا توجد تحصيلات اليوم</p>';
  document.getElementById('col-body').innerHTML = html;

  const total = today.reduce((s, c) => s + c.amount, 0);
  document.getElementById('col-total').textContent = N(total) + ' جنيه';
}

function delCollection(id) {
  const col = S.collections.find(c => c.id == id);
  if (col && !col.isCash) {
    const cust = S.customers.find(c => c.id == col.custId);
    if (cust) {
      cust.ledger = cust.ledger.filter(e => !(e.type === 'payment' && e.collectionId === id));
    }
  }
  S.collections = S.collections.filter(c => c.id != id);
  save();
  renderCollections();
  renderExpenses();
  renderDaySummary();
  renderCustomersPage();
  refreshDropdowns();
  showToast('تم حذف التحصيل', 'success');
}

// --- المصروفات ---
function addExpense() {
  const desc = document.getElementById('exp-desc').value.trim();
  const suppId = document.getElementById('exp-supp-sel').value;
  const amount = parseFloat(document.getElementById('exp-amount').value);
  
  if (!desc) return alertMsg('أدخل البيان', 'warning');
  if (!amount || amount <= 0) return alertMsg('أدخل المبلغ', 'warning');
  
  S.expenses.push({
    id: generateId(),
    date: S.date,
    desc,
    suppId,
    amount
  });
  
  if (suppId) {
    const sup = S.suppliers.find(s => s.id == suppId);
    if (sup) {
      sup.ledger.push({ date: S.date, type: 'payment', amount, ref: desc });
    }
  }
  
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amount').value = '';
  save();
  renderCollections();
  renderExpenses();
  renderDaySummary();
  refreshDropdowns();
  showToast(`تم تسجيل مصروف بقيمة ${N(amount)} جنيه`, 'success');
}

function renderExpenses() {
  const today = S.expenses.filter(e => e.date === S.date);
  let html = '';
  if (today.length) {
    today.forEach(e => {
      const sup = S.suppliers.find(s => s.id == e.suppId);
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:0.83rem">
        <span style="font-weight:700;flex:1">${escapeHtml(e.desc)}</span>
        <span style="font-size:0.79rem;color:var(--gray);margin:0 8px">${sup ? escapeHtml(sup.name) : '-'}</span>
        <span style="font-weight:900;color:var(--red)">${N(e.amount)} جنيه</span>
        <button class="btn btn-r btn-xs" style="margin-right:6px" onclick="delExpense(${e.id})">🗑️</button>
      </div>`;
    });
  } else {
    html = '<p style="color:#aaa;text-align:center;padding:12px">لا توجد مصروفات اليوم</p>';
  }
  document.getElementById('exp-body').innerHTML = html;
  const tot = today.reduce((s, e) => s + e.amount, 0);
  document.getElementById('exp-total').textContent = N(tot) + ' جنيه';
}

function delExpense(id) {
  const exp = S.expenses.find(e => e.id == id);
  if (exp && exp.suppId) {
    const sup = S.suppliers.find(s => s.id == exp.suppId);
    if (sup) {
      sup.ledger = sup.ledger.filter(e => !(e.type === 'payment' && e.amount === exp.amount && e.date === exp.date));
    }
  }
  S.expenses = S.expenses.filter(e => e.id != id);
  save();
  renderCollections();
  renderExpenses();
  renderDaySummary();
  refreshDropdowns();
  showToast('تم حذف المصروف', 'success');
}

// --- ملخص الخزنة ---
function renderDaySummary() {
  const colTot = S.collections.filter(c => c.date === S.date).reduce((s, c) => s + c.amount, 0);
  const expTot = S.expenses.filter(e => e.date === S.date).reduce((s, e) => s + e.amount, 0);
  const salTot = S.products.reduce((s, p) => s + p.salesLog.reduce((ss, x) => ss + x.total, 0), 0);
  
  const sumColEl = document.getElementById('sum-col');
  const sumExpEl = document.getElementById('sum-exp');
  const sumSalesEl = document.getElementById('sum-sales');
  const sumNetEl = document.getElementById('sum-net');
  
  if (sumColEl) sumColEl.textContent = N(colTot) + ' جنيه';
  if (sumExpEl) sumExpEl.textContent = N(expTot) + ' جنيه';
  if (sumSalesEl) sumSalesEl.textContent = N(salTot) + ' جنيه';
  if (sumNetEl) sumNetEl.textContent = N(colTot - expTot) + ' جنيه';
}

// --- تبديل علامات التبويب ---
function showKTab(t) {
  const colDiv = document.getElementById('ks-col');
  const expDiv = document.getElementById('ks-exp');
  if (colDiv) colDiv.style.display = t === 'col' ? 'block' : 'none';
  if (expDiv) expDiv.style.display = t === 'exp' ? 'block' : 'none';
}

// تصدير للاستخدام العام
window.addCollection = addCollection;
window.renderCollections = renderCollections;
window.delCollection = delCollection;
window.addExpense = addExpense;
window.renderExpenses = renderExpenses;
window.delExpense = delExpense;
window.renderDaySummary = renderDaySummary;
window.showKTab = showKTab;
