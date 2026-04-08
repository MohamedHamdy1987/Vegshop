// ===================== renderers/partners.js — الشركاء (معدل) =====================

function addPartner() {
  const name = document.getElementById('pt-name').value.trim();
  if (!name) return alertMsg('أدخل اسم الشريك', 'warning');
  
  const phone = document.getElementById('pt-phone').value.trim();
  if (phone && !isValidPhone(phone)) return alertMsg('رقم هاتف غير صحيح', 'warning');
  
  S.partners.push({
    id: generateId(),
    name,
    phone: phone,
    daily: parseFloat(document.getElementById('pt-daily').value) || 0,
    profit: parseFloat(document.getElementById('pt-profit').value) || 0,
    bank: document.getElementById('pt-bank').value.trim(),
    post: document.getElementById('pt-post').value.trim(),
    voda: document.getElementById('pt-voda').value.trim(),
    payments: [],
    absences: [],
    profits: []
  });
  
  ['pt-name', 'pt-phone', 'pt-daily', 'pt-profit', 'pt-bank', 'pt-post', 'pt-voda'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  save();
  renderPartners();
  showToast(`تم إضافة الشريك ${name}`, 'success');
}

function delPartner(id) {
  if (!confirm('حذف هذا الشريك وكل سجلاته؟')) return;
  S.partners = S.partners.filter(p => p.id != id);
  save();
  renderPartners();
  showToast('تم حذف الشريك', 'success');
}

function renderPartners() {
  const container = document.getElementById('part-list-cont');
  if (!container) return;
  
  if (!S.partners.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا يوجد شركاء</p>';
    return;
  }
  
  container.innerHTML = S.partners.map(p => {
    const presents = 30 - (p.absences?.length || 0);
    const earned = presents * (p.daily || 0);
    const paid = (p.payments || []).reduce((s, x) => s + x.amount, 0);
    const due = earned - paid;
    return `<div class="card" style="cursor:pointer" onclick="openPartDetail(${p.id})">
      <div class="ch b" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:9px">
          <span>🤝</span>
          <div>
            <div style="font-weight:800;color:var(--blue)">${escapeHtml(p.name)}</div>
            <div style="font-size:0.74rem;color:var(--gray)">${escapeHtml(p.phone || '-')} | ${N(p.daily)} جنيه/يوم | أرباح ${p.profit}%</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="text-align:left">
            <div style="font-size:0.74rem;color:var(--gray)">المستحق</div>
            <div style="font-weight:900;color:${due > 0 ? 'var(--green)' : 'var(--red)'}">${N(due)} جنيه</div>
          </div>
          <button class="btn btn-r btn-xs no-print" onclick="event.stopPropagation();delPartner(${p.id})">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openPartDetail(id) {
  const p = S.partners.find(x => x.id == id);
  if (!p) return;
  
  document.getElementById('part-list-view').style.display = 'none';
  document.getElementById('part-detail-view').style.display = 'block';
  document.getElementById('pd-name').textContent = escapeHtml(p.name);
  document.getElementById('pd-info').textContent = `${N(p.daily)} جنيه/يوم | أرباح ${p.profit}%`;

  const presents = 30 - (p.absences?.length || 0);
  const masarif = presents * (p.daily || 0);
  const paid = (p.payments || []).reduce((s, x) => s + x.amount, 0);
  const totalProfits = (p.profits || []).reduce((s, x) => s + x.amount, 0);
  const net = (masarif + totalProfits) - paid;

  const bankInfo = [
    p.bank ? `<div style="background:#f8f8f8;border-radius:7px;padding:7px 11px;flex:1;min-width:120px"><div style="font-size:0.71rem;color:#888">بنكي</div><div style="font-weight:700;font-size:0.82rem">${escapeHtml(p.bank)}</div></div>` : '',
    p.post ? `<div style="background:#f8f8f8;border-radius:7px;padding:7px 11px;flex:1;min-width:120px"><div style="font-size:0.71rem;color:#888">بريد</div><div style="font-weight:700;font-size:0.82rem">${escapeHtml(p.post)}</div></div>` : '',
    p.voda ? `<div style="background:#f8f8f8;border-radius:7px;padding:7px 11px;flex:1;min-width:120px"><div style="font-size:0.71rem;color:#888">فودافون</div><div style="font-weight:700;font-size:0.82rem">${escapeHtml(p.voda)}</div></div>` : ''
  ].filter(x => x).join('');

  const absRows = (p.absences || []).map((a, ai) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:0.82rem">
      <span>${escapeHtml(a.date)}</span>
      <span style="color:var(--red)">-${N(p.daily)} جنيه</span>
      <button class="btn btn-r btn-xs" onclick="delPartAbsence(${id},${ai})">🗑️</button>
    </div>`).join('') || '<p style="color:#aaa;text-align:center;padding:6px">لا توجد غيابات</p>';

  const payRows = (p.payments || []).map((x, xi) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:0.81rem">
      <span style="font-weight:700;color:var(--red)">-${N(x.amount)}</span>
      <span style="flex:1;margin:0 6px;color:#555;font-size:0.76rem">${escapeHtml(x.note || 'دفعة')}</span>
      <button class="btn btn-r btn-xs" onclick="delPartPayment(${id},${xi})">🗑️</button>
    </div>`).join('') || '<p style="color:#aaa;text-align:center;padding:6px">لا توجد مدفوعات</p>';

  const profitRows = (p.profits || []).map((x, xi) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:0.81rem">
      <span style="font-weight:700;color:var(--green)">+${N(x.amount)}</span>
      <span style="flex:1;margin:0 6px;color:#555;font-size:0.76rem">${escapeHtml(x.note || 'أرباح')}</span>
      <button class="btn btn-r btn-xs" onclick="delPartProfit(${id},${xi})">🗑️</button>
    </div>`).join('') || '<p style="color:#aaa;text-align:center;padding:6px">لا توجد أرباح مسجلة</p>';

  document.getElementById('pd-body').innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px">${bankInfo}</div>
    <div class="card">
      <div class="ch" style="background:#fef9e7;border-bottom-color:#f0d080;"><span>📅</span><h2 style="color:#d4ac0d">تسجيل الغياب</h2></div>
      <div class="cb">
        <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:9px">
          <div style="flex:1"><label class="lbl">التاريخ</label><input type="text" id="pabs-${id}" placeholder="${S.date}"></div>
          <button class="btn btn-r btn-sm" onclick="addPartAbsence(${id})">🔴 غياب</button>
        </div>
        ${absRows}
        <div style="margin-top:7px;font-size:0.85rem">
          أيام الحضور: <strong style="color:var(--green)">${presents} يوم</strong> |
          مصاريف: <strong style="color:var(--green)">${N(masarif)} جنيه</strong>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
      <div class="card">
        <div class="ch r"><h2 style="color:var(--red)">الواصل (مدفوعات للشريك)</h2></div>
        <div class="cb">
          <div style="display:flex;gap:7px;align-items:flex-end;margin-bottom:9px">
            <div style="flex:1"><label class="lbl">المبلغ</label><input type="number" id="pp-amt-${id}" placeholder="0" min="0"></div>
            <div style="flex:1"><label class="lbl">البيان</label><input type="text" id="pp-note-${id}" placeholder="نقدية..."></div>
            <button class="btn btn-r btn-xs" onclick="addPartPayment(${id})">✅</button>
          </div>
          ${payRows}
        </div>
      </div>
      <div class="card">
        <div class="ch g"><h2>الأرباح المستحقة للشريك</h2></div>
        <div class="cb">
          <div style="background:var(--green-light);border-radius:7px;padding:8px;margin-bottom:8px;font-size:0.82rem">مصاريف شهرية: <strong>${N(masarif)}</strong></div>
          <div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:7px">
            <div style="flex:1"><label class="lbl">ربح</label><input type="number" id="ppr-amt-${id}" placeholder="0" min="0"></div>
            <div style="flex:1"><label class="lbl">البيان</label><input type="text" id="ppr-note-${id}" placeholder="أرباح..."></div>
            <button class="btn btn-g btn-xs" onclick="addPartProfit(${id})">➕</button>
          </div>
          ${profitRows}
          <div style="background:var(--green-light);border-radius:7px;padding:8px;margin-top:8px;font-size:0.82rem">إجمالي الأرباح: <strong>${N(totalProfits)}</strong></div>
        </div>
      </div>
    </div>
    <div style="background:var(--green);color:#fff;border-radius:10px;padding:12px 15px;display:flex;justify-content:space-between;font-weight:900;margin-top:11px">
      <span>💰 الصافي المتبقي للشريك</span><span>${N(net)} جنيه</span>
    </div>`;
}

function addPartAbsence(id) {
  const p = S.partners.find(x => x.id == id);
  if (!p) return;
  const dateInput = document.getElementById(`pabs-${id}`);
  const date = (dateInput?.value.trim()) || S.date;
  if (!p.absences) p.absences = [];
  p.absences.push({ date });
  save();
  openPartDetail(id);
  showToast('تم تسجيل الغياب', 'success');
}

function delPartAbsence(id, idx) {
  const p = S.partners.find(x => x.id == id);
  if (p && p.absences) p.absences.splice(idx, 1);
  save();
  openPartDetail(id);
  showToast('تم حذف الغياب', 'success');
}

function addPartPayment(id) {
  const p = S.partners.find(x => x.id == id);
  if (!p) return;
  const amt = parseFloat(document.getElementById(`pp-amt-${id}`).value) || 0;
  const note = document.getElementById(`pp-note-${id}`).value.trim();
  if (!amt) return alertMsg('أدخل المبلغ', 'warning');
  if (!p.payments) p.payments = [];
  p.payments.push({ amount: amt, note, date: S.date });
  S.expenses.push({ id: generateId(), date: S.date, desc: `شريك — ${p.name}: ${note || 'دفعة'}`, suppId: '', amount: amt });
  save();
  openPartDetail(id);
  renderDaySummary();
  showToast(`تم تسجيل دفعة ${N(amt)} جنيه للشريك ${p.name}`, 'success');
  document.getElementById(`pp-amt-${id}`).value = '';
  document.getElementById(`pp-note-${id}`).value = '';
}

function delPartPayment(id, idx) {
  const p = S.partners.find(x => x.id == id);
  if (p && p.payments) p.payments.splice(idx, 1);
  save();
  openPartDetail(id);
  showToast('تم حذف الدفعة', 'success');
}

function addPartProfit(id) {
  const p = S.partners.find(x => x.id == id);
  if (!p) return;
  const amt = parseFloat(document.getElementById(`ppr-amt-${id}`).value) || 0;
  const note = document.getElementById(`ppr-note-${id}`).value.trim();
  if (!amt) return alertMsg('أدخل المبلغ', 'warning');
  if (!p.profits) p.profits = [];
  p.profits.push({ amount: amt, note, date: S.date });
  save();
  openPartDetail(id);
  showToast(`تم تسجيل ربح ${N(amt)} جنيه للشريك ${p.name}`, 'success');
  document.getElementById(`ppr-amt-${id}`).value = '';
  document.getElementById(`ppr-note-${id}`).value = '';
}

function delPartProfit(id, idx) {
  const p = S.partners.find(x => x.id == id);
  if (p && p.profits) p.profits.splice(idx, 1);
  save();
  openPartDetail(id);
  showToast('تم حذف الربح', 'success');
}

function showPartList() {
  document.getElementById('part-list-view').style.display = 'block';
  document.getElementById('part-detail-view').style.display = 'none';
  renderPartners();
}

// تصدير الدوال
window.addPartner = addPartner;
window.delPartner = delPartner;
window.renderPartners = renderPartners;
window.openPartDetail = openPartDetail;
window.addPartAbsence = addPartAbsence;
window.delPartAbsence = delPartAbsence;
window.addPartPayment = addPartPayment;
window.delPartPayment = delPartPayment;
window.addPartProfit = addPartProfit;
window.delPartProfit = delPartProfit;
window.showPartList = showPartList;
