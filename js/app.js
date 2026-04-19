// =========================
// IMPORTS
// =========================
import { supabase, loadAllData, setSyncStatus } from "./data.js";
import { showPage }    from "./utils.js";
import { showToast }   from "./ui.js";

import { renderDashboard }   from "./renderers/dashboard.js";
import { renderCustomers }   from "./renderers/customers.js";
import { renderSuppliers }   from "./renderers/suppliers.js";
import { renderKhazna }      from "./renderers/khazna.js";
import { renderEmployees }   from "./renderers/employees.js";
import { renderPartners }    from "./renderers/partners.js";
import { renderSubscription } from "./renderers/subscription.js";
import { renderAdmin }       from "./renderers/admin.js";
import { renderSales }       from "./renderers/sales.js";
import { renderInvoices }    from "./renderers/invoices.js";
import { renderBaqi, renderNazil, renderTarhil, renderShops } from "./renderers/extraPages.js";
import { triggerCloseDay }   from "./renderers/closeDay.js";

// =========================
// GLOBAL STATE
// =========================
let currentUser  = null;
let currentPage  = "dashboard";
let _refreshTimer = null;

// =========================
// MAKE closeDay GLOBAL
// =========================
window.triggerCloseDay = triggerCloseDay;

// =========================
// INIT APP
// =========================
async function initApp() {
  try {
    setSyncStatus("جارى الاتصال...");

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) { showAuth(); return; }

    currentUser = data.user;

    await loadAllData();

    // إظهار التطبيق
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("authScreen").style.display   = "none";
    document.getElementById("userInfo").innerText = currentUser.email;
    document.getElementById("closeDayBtn").style.display  = "inline-block";

    setSyncStatus("متصل ✓");
    navigate("dashboard");

    // تحديث تلقائي كل 30 ثانية
    _refreshTimer = setInterval(async () => {
      if (!currentUser) return;
      try {
        await loadAllData();
        renderPage(currentPage);
      } catch (e) { /* صامت */ }
    }, 30000);

  } catch (err) {
    console.error("[initApp]", err);
    setSyncStatus("فشل الاتصال", false);
    showAuth();
  }
}

function showAuth() {
  document.getElementById("loadingScreen").style.display = "none";
  document.getElementById("authScreen").style.display   = "flex";
}

// =========================
// AUTH FUNCTIONS
// =========================
window.login = async function () {
  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) { showToast("ادخل البريد وكلمة المرور", false); return; }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showToast("تم تسجيل الدخول ✓");
    location.reload();
  } catch (err) {
    showToast(err.message?.includes("Invalid") ? "بيانات خاطئة" : "فشل تسجيل الدخول", false);
  }
};

window.register = async function () {
  const name     = document.getElementById("regName").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!name || !email || !password) { showToast("اكمل جميع البيانات", false); return; }
  if (password.length < 6) { showToast("كلمة المرور 6 أحرف على الأقل", false); return; }

  try {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { shop_name: name, trial_start: new Date().toISOString() } }
    });
    if (error) throw error;
    showToast("تم إنشاء الحساب — تحقق من بريدك الإلكتروني");
  } catch (err) {
    showToast(err.message || "فشل التسجيل", false);
  }
};

window.logout = async function () {
  clearInterval(_refreshTimer);
  await supabase.auth.signOut();
  location.reload();
};

// =========================
// NAVIGATION
// =========================
window.navigate = async function (page) {
  try {
    currentPage = page;
    document.getElementById("pageTitle").innerText = getPageTitle(page);
    showPage(page);
    setSyncStatus("جارى التحديث...");
    await loadAllData();
    renderPage(page);
    setSyncStatus("تم التحديث ✓");
  } catch (err) {
    console.error("[navigate]", err);
    setSyncStatus("فشل التحديث", false);
    showToast("حدث خطأ أثناء تحميل الصفحة", false);
  }
};

// =========================
// RENDER DISPATCHER
// =========================
function renderPage(page) {
  try {
    switch (page) {
      case "dashboard":    renderDashboard();   break;
      case "customers":    renderCustomers();   break;
      case "suppliers":    renderSuppliers();   break;
      case "khazna":       renderKhazna();      break;
      case "employees":    renderEmployees();   break;
      case "partners":     renderPartners();    break;
      case "subscription": renderSubscription();break;
      case "admin":        renderAdmin();       break;
      case "sales":        renderSales();       break;
      case "invoices":     renderInvoices();    break;
      case "baqi":         renderBaqi();        break;
      case "nazil":        renderNazil();       break;
      case "tarhil":       renderTarhil();      break;
      case "shops":        renderShops();       break;
      default:
        const el = document.getElementById(page);
        if (el) el.innerHTML = `<div class="card"><p>🚧 الصفحة تحت التطوير</p></div>`;
    }
  } catch (err) {
    console.error(`[renderPage:${page}]`, err);
  }
}

function getPageTitle(page) {
  const map = {
    dashboard:    "لوحة التحكم",
    customers:    "العملاء",
    suppliers:    "الموردين",
    khazna:       "الخزنة",
    employees:    "الموظفين",
    partners:     "الشركاء",
    subscription: "الاشتراك",
    admin:        "لوحة المشرف",
    sales:        "المبيعات",
    invoices:     "الفواتير",
    baqi:         "المتبقي",
    nazil:        "المنتهي",
    tarhil:       "سجل الترحيلات",
    shops:        "المحلات"
  };
  return map[page] || page;
}

// =========================
// EXPOSE closeModal GLOBALLY
// (used in inline HTML onclick)
// =========================
import { closeModal, openModal } from "./utils.js";
window.closeModal = closeModal;
window.openModal  = openModal;

// =========================
// START
// =========================
initApp();
