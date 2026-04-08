// ===================== app.js — النقطة الرئيسية لتشغيل التطبيق (معدل) =====================

// ─────────────────────────────────────────────
// 🔄 Listener لشريط المزامنة
// ─────────────────────────────────────────────
let _syncHideTimer = null;

document.addEventListener('sync-status', (e) => {
  const { status, msg } = e.detail;
  const bar = document.getElementById('sync-bar');
  const text = document.getElementById('sync-text');
  if (!bar || !text) return;

  clearTimeout(_syncHideTimer);
  bar.className = 'sync-bar ' + (status === 'saving' ? 'saving' : status === 'error' ? 'error' : '');
  text.textContent = msg;

  if (!status || status === '') {
    _syncHideTimer = setTimeout(() => { bar.style.opacity = '0.5'; }, 3000);
    bar.style.opacity = '1';
  } else {
    bar.style.opacity = '1';
  }
});

// ─────────────────────────────────────────────
// 🛡️ Safe Render Wrapper
// ─────────────────────────────────────────────
function safeRender(name, fn) {
  try { fn(); }
  catch (e) { AppError.log(`render:${name}`, e); }
}

// ─────────────────────────────────────────────
// 🗂️ Render Registry
// ─────────────────────────────────────────────
const PAGE_RENDERS = {
  baqi:         () => { refreshDropdowns(); renderBaqi(); },
  nazil:        () => { refreshDropdowns(); renderNazilList(); },
  sales:        () => { refreshDropdowns(); renderSalesTable(); },
  tarhil:       () => { renderTarhil(); },
  customers:    () => { renderCustomersPage(); },
  suppliers:    () => { renderSuppliersPage(); },
  invoices:     () => { refreshDropdowns(); renderInvoicesPageWithPagination(); },
  employees:    () => { renderEmployees(); },
  partners:     () => { renderPartners(); },
  shops:        () => { renderShops(); },
  khazna:       () => { refreshDropdowns(); renderCollections(); renderExpenses(); renderDaySummary(); },
  subscription: () => { renderSubscriptionStatus(); },
  admin:        () => { if (isAdmin()) loadAdminPayments(); else document.getElementById('admin-payments-list').innerHTML = '<p>غير مصرح</p>'; }
};

let _activePage = 'sales';

function renderPage(page) {
  const target = page || _activePage;
  const fn = PAGE_RENDERS[target];
  if (fn) fn();
}

function renderAll() {
  safeRender('dropdowns', refreshDropdowns);
  safeRender('baqi', renderBaqi);
  safeRender('nazil', renderNazilList);
  safeRender('sales', renderSalesTable);
  safeRender('tarhil', renderTarhil);
  safeRender('customers', renderCustomersPage);
  safeRender('suppliers', renderSuppliersPage);
  safeRender('invoices', renderInvoicesPageWithPagination);
  safeRender('collections', renderCollections);
  safeRender('expenses', renderExpenses);
  safeRender('summary', renderDaySummary);
  safeRender('employees', renderEmployees);
  safeRender('partners', renderPartners);
  safeRender('shops', renderShops);
}

function refreshDropdowns() {
  const suppOpts = '<option value="">-- اختر --</option>' +
    S.suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  ['np-supplier', 'inv-supp-sel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = suppOpts;
  });

  const cc = document.getElementById('col-cust-sel');
  if (cc) cc.innerHTML = '<option value="">-- اختر --</option>' +
    S.customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${N(getCustBal(c.id))} ج)</option>`).join('');

  const es = document.getElementById('exp-supp-sel');
  if (es) es.innerHTML = '<option value="">-- بدون مورد --</option>' +
    S.suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

// ─────────────────────────────────────────────
// 📺 إدارة الصفحات
// ─────────────────────────────────────────────
function showPage(n, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
  const pageEl = document.getElementById('page-' + n);
  if (pageEl) pageEl.classList.add('active');
  if (btn) btn.classList.add('active');

  _activePage = n;
  renderPage(n);
}

function showKTab(t) {
  const colDiv = document.getElementById('ks-col');
  const expDiv = document.getElementById('ks-exp');
  if (colDiv) colDiv.style.display = t === 'col' ? 'block' : 'none';
  if (expDiv) expDiv.style.display = t === 'exp' ? 'block' : 'none';
}

// ─────────────────────────────────────────────
// 🚀 عرض التطبيق بعد تحميل البيانات
// ─────────────────────────────────────────────
function showApp() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';
  const appEl = document.getElementById('app');
  const authScreen = document.getElementById('auth-screen');
  if (appEl) appEl.style.display = 'block';
  if (authScreen) authScreen.style.display = 'none';

  if (currentUser) {
    const emailBadge = document.getElementById('user-email-badge');
    if (emailBadge) emailBadge.textContent = currentUser.email.split('@')[0];
    const meta = currentUser.user_metadata;
    const shopHeader = document.getElementById('shop-name-header');
    if (shopHeader && meta?.shop_name) shopHeader.textContent = meta.shop_name;
    checkTrial();
    updateAdminTabVisibility();
    renderSubscriptionStatus();
    updateUIByPermissions(); // من security.js
  } else {
    const shopHeader = document.getElementById('shop-name-header');
    if (shopHeader) shopHeader.textContent = 'نظام المحل (محلي)';
  }

  updateDates();
  renderAll();
  // بدء المزامنة الدورية بعد تحميل البيانات
  if (typeof startPeriodicSync === 'function') startPeriodicSync();
}

// ─────────────────────────────────────────────
// ⚡ نقطة البداية الرئيسية
// ─────────────────────────────────────────────
async function init() {
  try {
    // تحميل محلي فوري
    store.init(); // تم تعريف store.init() في data.js

    // محاولة استئناف الجلسة مع timeout
    let session = null;
    try {
      const res = await Promise.race([
        sb.auth.getSession(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]);
      session = res?.data?.session;
    } catch (e) {
      if (e.message !== 'timeout') AppError.log('init.getSession', e);
      else console.info('Supabase: تم التشغيل offline');
    }

    if (session) {
      currentUser = session.user;
      await loadUserData();
    }

    showApp();
  } catch (e) {
    AppError.log('init', e, false);
    showApp();
  } finally {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// حماية من تجمد التحميل
window.addEventListener('load', () => {
  setTimeout(() => {
    const loading = document.getElementById('loading');
    if (loading && loading.style.display !== 'none') loading.style.display = 'none';
  }, 5000);
});

// بدء التطبيق
init();

// تصدير الوظائف العامة (لضمان التوافق)
window.showPage = showPage;
window.showKTab = showKTab;
window.refreshDropdowns = refreshDropdowns;
window.renderAll = renderAll;
