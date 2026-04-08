// ===================== renderers/tarhil.js — الترحيلات (معدل) =====================

function renderTarhil() {
  const log = S.tarhilLog[S.date] || {};
  const ids = Object.keys(log).filter(id => log[id] && log[id].length > 0);
  const container = document.getElementById('tarhil-body');
  if (!container) return;
  
  if (!ids.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد ترحيلات اليوم</p>';
    return;
  }
  
  container.innerHTML = ids.map(cid => {
    const cust = S.customers.find(c => c.id == cid);
    const items = log[cid];
    const tot = items.reduce((s, t) => s + t.total, 0);
    const rows = items.map(t => `<tr>
      <td style="padding:5px;font-weight:700">${escapeHtml(t.productName)}</td>
      <td style="padding:5px">${t.qty || '-'}</td>
      <td style="padding:5px">${t.weight || '-'}</td>
      <td style="padding:5px">${t.price} جنيه</td>
      <td style="padding:5px;font-weight:900;color:var(--green)">${N(t.total)} جنيه</td>
    </tr>`).join('');
    
    return `<div style="background:#fff;border:1.5px solid #d6eaf8;border-radius:10px;margin-bottom:8px;overflow:hidden;cursor:pointer;"
      onclick="let el=this.querySelector('.tc-b');if(el)el.style.display=el.style.display==='none'?'block':'none';">
      <div style="padding:9px 12px;background:var(--blue-light);display:flex;align-items:center;gap:8px">
        <span>👤</span>
        <span style="font-weight:800;color:var(--blue)">${cust ? escapeHtml(cust.name) : 'عميل محذوف'}</span>
        <span style="margin-right:auto;font-weight:900;color:var(--blue)">يومية: ${N(tot)} جنيه</span>
        <span>▼</span>
      </div>
      <div class="tc-b" style="display:none;padding:10px 12px;border-top:1.5px solid #d6eaf8">
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem">
          <thead><tr style="background:#f0f7f0"><th>الصنف</th><th>عدد</th><th>وزن(ك)</th><th>سعر</th><th>المبلغ</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="background:#eafaf1;font-weight:900">
            <td colspan="4" style="text-align:right;padding:5px">إجمالي اليومية</td>
            <td style="padding:5px;color:var(--green)">${N(tot)} جنيه</td>
          </tr></tfoot>
        </table>
      </div>
    </div>`;
  }).join('');
}

function goToTarhilDate(date) {
  // التبديل إلى صفحة الترحيلات
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-tarhil').classList.add('active');
  const tarhilTab = document.querySelector('nav.tabs button:nth-child(4)');
  if (tarhilTab) tarhilTab.classList.add('active');
  
  const badge = document.getElementById('tarhil-badge');
  if (badge) badge.textContent = date;
  
  const log = S.tarhilLog[date] || {};
  const ids = Object.keys(log).filter(id => log[id] && log[id].length > 0);
  const container = document.getElementById('tarhil-body');
  if (!container) return;
  
  if (!ids.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد ترحيلات في هذا التاريخ</p>';
    return;
  }
  
  container.innerHTML = ids.map(cid => {
    const cust = S.customers.find(c => c.id == cid);
    const items = log[cid];
    const tot = items.reduce((s, t) => s + t.total, 0);
    const rows = items.map(t => `<tr>
      <td style="padding:5px;font-weight:700">${escapeHtml(t.productName)}</td>
      <td style="padding:5px">${t.qty || '-'}</td>
      <td style="padding:5px">${t.weight || '-'}</td>
      <td style="padding:5px">${t.price} جنيه</td>
      <td style="padding:5px;font-weight:900;color:var(--green)">${N(t.total)} جنيه</td>
    </tr>`).join('');
    
    return `<div style="background:#fff;border:1.5px solid #d6eaf8;border-radius:10px;margin-bottom:8px;overflow:hidden;">
      <div style="padding:9px 12px;background:var(--blue-light);display:flex;align-items:center;gap:8px">
        <span>👤</span>
        <span style="font-weight:800;color:var(--blue)">${cust ? escapeHtml(cust.name) : 'عميل محذوف'}</span>
        <span style="margin-right:auto;font-weight:900;color:var(--blue)">${N(tot)} جنيه</span>
      </div>
      <div style="padding:10px 12px">
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem">
          <thead><tr style="background:#f0f7f0"><th>الصنف</th><th>عدد</th><th>وزن(ك)</th><th>سعر</th><th>المبلغ</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="background:#eafaf1;font-weight:900">
            <td colspan="4" style="text-align:right;padding:5px">إجمالي اليومية</td>
            <td style="padding:5px;color:var(--green)">${N(tot)} جنيه</td>
          </tr></tfoot>
        </table>
      </div>
    </div>`;
  }).join('');
}

// تنظيف الترحيلات القديمة (يتم استدعاؤها من data.js بالفعل، لكن نضيف دالة يدوية)
function cleanOldTarhil(days = 30) {
  const now = new Date();
  let cleaned = false;
  for (const dateStr in S.tarhilLog) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && (now - d) > days * 24 * 60 * 60 * 1000) {
      delete S.tarhilLog[dateStr];
      cleaned = true;
    }
  }
  if (cleaned) {
    save();
    showToast(`تم تنظيف الترحيلات الأقدم من ${days} يوم`, 'info');
    if (document.getElementById('page-tarhil').classList.contains('active')) {
      renderTarhil();
    }
  }
}

// تصدير للاستخدام العام
window.renderTarhil = renderTarhil;
window.goToTarhilDate = goToTarhilDate;
window.cleanOldTarhil = cleanOldTarhil;
