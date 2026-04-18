// ================================================
// core.js — القلب: Supabase + DB + CRUD + Helpers
// يُحمَّل بعد config.js مباشرةً
// ================================================

// ---- تهيئة Supabase ----
const { createClient } = supabase; // من CDN في app.html
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- كائن APP المشترك بين جميع الملفات ----
window.APP = {

  // ---- الحالة ----
  sb,
  currentUser: null,
  currentPage: "dashboard",

  // ---- قاعدة البيانات المحلية ----
  DB: {
    customers:    [],
    suppliers:    [],
    products:     [],
    invoices:     [],
    collections:  [],
    expenses:     [],
    employees:    [],
    partners:     [],
    shops:        [],
    tarhil_log:   [],
    payments:     []
  },

  // ================================================
  // HELPERS
  // ================================================
  N(v)       { return Number(v || 0); },
  currency(v){ return this.N(v).toLocaleString("ar-EG") + " جنيه"; },
  today()    { return new Date().toISOString().split("T")[0]; },
  formatDate(d){ return d ? new Date(d).toLocaleDateString("ar-EG") : "-"; },

  setSyncStatus(msg, ok = true) {
    const el = document.getElementById("syncText");
    if (!el) return;
    el.innerText = msg;
    el.style.color = ok ? "#0f766e" : "#ef4444";
  },

  // ---- Toast ----
  _toastTimer: null,
  showToast(msg, ok = true) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.innerText = msg;
    t.style.background = ok ? "#22c55e" : "#ef4444";
    t.style.display = "block";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.style.display = "none", 3500);
  },

  // ---- Modal ----
  openModal(title, body, footer = "") {
    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalBody").innerHTML = body;
    document.getElementById("modalFooter").innerHTML = footer;
    document.getElementById("modal").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("modal").classList.add("hidden");
  },

  // ---- Confirm ----
  confirmDo(text, fn) {
    this.openModal(
      "تأكيد",
      `<p style="font-size:15px;text-align:center;padding:14px 0;line-height:1.7">${text}</p>`,
      `<button class="btn btn-danger" onclick="APP.closeModal();APP._confirmCb()">✅ تأكيد</button>
       <button class="btn btn-outline" onclick="APP.closeModal()">إلغاء</button>`
    );
    this._confirmCb = fn;
  },

  // ---- Empty State ----
  emptyState(msg = "لا توجد بيانات") {
    return `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <p>${msg}</p>
    </div>`;
  },

  // ---- Status Badge ----
  statusBadge(status) {
    if (status === "approved") return `<span class="badge badge-green">✅ مفعل</span>`;
    if (status === "pending")  return `<span class="badge badge-yellow">⏳ قيد المراجعة</span>`;
    return `<span class="badge badge-red">❌ مرفوض</span>`;
  },

  // ---- Get Supplier Name ----
  getSupplierName(id) {
    const s = this.DB.suppliers.find(x => x.id == id);
    return s ? s.name : "-";
  },

  // ---- Show Page ----
  showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
    document.querySelectorAll(".sidebar nav button").forEach(b => {
      b.classList.toggle("active", b.dataset.page === id);
    });
  },

  // ---- Stat Card ----
  statCard(title, value, sub = "") {
    return `<div class="card stat-card">
      <h4>${title}</h4>
      <p>${value}</p>
      ${sub ? `<small>${sub}</small>` : ""}
    </div>`;
  },

  // ================================================
  // SUPABASE CRUD
  // ================================================
  async dbLoad() {
    this.setSyncStatus("جارى تحميل البيانات...");
   // if (!this.currentUser) return;
    const uid = this.currentUser.id;
    for (let table of Object.keys(this.DB)) {
      try {
        const { data, error } = await sb.from(table)
          .select("*")
       // .eq("user_id", uid)
          .order("created_at", { ascending: false });
        if (!error) this.DB[table] = data || [];
      } catch (e) {
        console.error(`Error loading ${table}:`, e);
      }
    }
    this.setSyncStatus("تم التحديث ✓");
  },

  async dbInsert(table, data) {
    this.setSyncStatus("جارى الحفظ...");
    try {
      const { error } = await sb.from(table).insert({
        ...data,
        user_id: this.currentUser.id
      });
      if (error) throw error;
      this.setSyncStatus("تم الحفظ ✓");
      return true;
    } catch (e) {
      console.error(e);
      this.setSyncStatus("فشل الحفظ", false);
      this.showToast("فشل الحفظ: " + e.message, false);
      return false;
    }
  },

  async dbUpdate(table, id, data) {
    this.setSyncStatus("جارى التحديث...");
    try {
      const { error } = await sb.from(table)
        .update(data)
        .eq("id", id)
        .eq("user_id", this.currentUser.id);
      if (error) throw error;
      this.setSyncStatus("تم التحديث ✓");
      return true;
    } catch (e) {
      console.error(e);
      this.setSyncStatus("فشل التحديث", false);
      this.showToast("فشل التحديث: " + e.message, false);
      return false;
    }
  },

  async dbDelete(table, id) {
    this.setSyncStatus("جارى الحذف...");
    try {
      const { error } = await sb.from(table)
        .delete()
        .eq("id", id)
        .eq("user_id", this.currentUser.id);
      if (error) throw error;
      this.setSyncStatus("تم الحذف ✓");
      return true;
    } catch (e) {
      console.error(e);
      this.setSyncStatus("فشل الحذف", false);
      this.showToast("فشل الحذف: " + e.message, false);
      return false;
    }
  },

  // ================================================
  // NAVIGATION
  // ================================================
  async navigate(page) {
    this.currentPage = page;
    const titles = {
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
      baqi:         "المنتجات المتبقية",
      nazil:        "المنتجات المنتهية",
      tarhil:       "سجل الترحيلات",
      shops:        "المحلات"
    };
    document.getElementById("pageTitle").innerText = titles[page] || "";
    this.showPage(page);
    this.setSyncStatus("جارى التحديث...");
    await this.dbLoad();
    this.renderPage(page);
  },

  renderPage(page) {
    const map = {
      dashboard:    () => RENDER.dashboard(),
      customers:    () => RENDER.customers(),
      suppliers:    () => RENDER.suppliers(),
      khazna:       () => RENDER.khazna(),
      employees:    () => RENDER.employees(),
      partners:     () => RENDER.partners(),
      subscription: () => RENDER.subscription(),
      admin:        () => RENDER.admin(),
      sales:        () => RENDER.sales(),
      invoices:     () => RENDER.invoices(),
      baqi:         () => RENDER.baqi(),
      nazil:        () => RENDER.nazil(),
      tarhil:       () => RENDER.tarhil(),
      shops:        () => RENDER.shops()
    };
    if (map[page]) map[page]();
    else document.getElementById(page).innerHTML = `<p class="muted" style="padding:20px">الصفحة تحت التطوير</p>`;
  },

  // ================================================
  // INVOICE ENGINE
  // ================================================
  async checkAndGenerateInvoice(supplierId) {
    try {
      const { DB, N, today, getSupplierName, dbInsert, dbUpdate, showToast } = this;
      const products = DB.products.filter(p => p.supplierId == supplierId && !p.locked);
      if (!products.length) return;

      const allSold = products.every(p => N(p.sold) >= N(p.totalQty));
      if (!allSold) return;

      let gross = 0, totalNoulon = 0, totalMashal = 0;
      products.forEach(p => {
        (p.salesLog || []).forEach(s => gross += N(s.total));
        totalNoulon += N(p.noulon);
        totalMashal += N(p.mashal);
      });
      const commission = Math.round(gross * 0.07);
      const net = gross - totalNoulon - totalMashal - commission;

      // منع التكرار: بنفس المورد في نفس اليوم
      const todayStr = this.today();
      const exists = DB.invoices.find(i =>
        i.supplierId == supplierId &&
        (i.date || "").startsWith(todayStr)
      );
      if (exists) return;

      // إنشاء الفاتورة مباشرة بدون dbInsert (لأن invoices لا يحتاج user_id filter في الـ insert)
      const { error } = await sb.from("invoices").insert({
        supplierId,
        supplierName: this.getSupplierName(supplierId),
        date: new Date().toISOString(),
        products,
        gross,
        ded_noulon:      totalNoulon,
        ded_mashal:      totalMashal,
        ded_commission:  commission,
        net,
        user_id: this.currentUser.id
      });
      if (error) throw error;

      // تحديث دفتر المورد
      const supplier = DB.suppliers.find(x => x.id == supplierId);
      if (supplier) {
        const ledger = [
          ...(supplier.ledger || []),
          { type: "invoice", amount: net, date: new Date().toISOString() }
        ];
        await this.dbUpdate("suppliers", supplierId, { ledger });
      }

      this.showToast(`✅ تم إنشاء فاتورة للمورد: ${this.getSupplierName(supplierId)}`);
    } catch (e) {
      console.error("Invoice Engine Error:", e);
    }
  },

  // ================================================
  // CLOSE DAY
  // ================================================
  confirmCloseDay() {
    this.confirmDo(
      "إغلاق اليوم سيرحّل المتبقي من المنتجات ويقفل جميع الأصناف.<br>⚠️ لا يمكن التراجع. هل أنت متأكد؟",
      () => this.closeDay()
    );
  },

  async closeDay() {
    try {
      const currentDate = this.today();
      // منع الإغلاق مرتين في نفس اليوم
      const alreadyClosed = this.DB.tarhil_log.find(l => l.date === currentDate);
      if (alreadyClosed) {
        this.showToast("⚠️ تم إغلاق اليوم مسبقاً اليوم", false);
        return;
      }

      let movedCount = 0;
      for (let p of this.DB.products) {
        if (p.locked) continue;
        const remaining = this.N(p.totalQty) - this.N(p.sold);
        if (remaining > 0) {
          await this.dbInsert("products", {
            name:           p.name,
            unit:           p.unit,
            supplierId:     p.supplierId,
            totalQty:       remaining,
            sold:           0,
            salesLog:       [],
            carryoverFrom:  currentDate,
            fromDate:       currentDate,
            noulon:         p.noulon,
            mashal:         p.mashal,
            locked:         false
          });
          movedCount++;
        }
        await this.dbUpdate("products", p.id, { locked: true });
      }

      await this.dbInsert("tarhil_log", {
        date:        currentDate,
        movedCount,
        created_at:  new Date().toISOString()
      });

      this.showToast(`✅ تم إغلاق اليوم — تم ترحيل ${movedCount} صنف`);
      await this.dbLoad();
      this.navigate("dashboard");
    } catch (e) {
      console.error(e);
      this.showToast("فشل إغلاق اليوم: " + e.message, false);
    }
  },

  // ================================================
  // AUTH
  // ================================================
  async initApp() {
    this.setSyncStatus("جارى الاتصال...");
    try {
      const { data } = await sb.auth.getUser();
      this.currentUser = data.user;
      if (!this.currentUser) {
        document.getElementById("loadingScreen").style.display = "none";
        document.getElementById("authScreen").style.display = "flex";
        return;
      }
      await this.dbLoad();
      document.getElementById("loadingScreen").style.display = "none";
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("authScreen").style.display = "none";
      document.getElementById("userInfo").innerText = "👤 " + this.currentUser.email;
      document.getElementById("closeDayBtn").style.display = "inline-flex";
      this.navigate("dashboard");

      // تحديث تلقائي كل 20 ثانية
      setInterval(async () => {
        if (!this.currentUser) return;
        await this.dbLoad();
        this.renderPage(this.currentPage);
      }, 20000);

    } catch (e) {
      console.error(e);
      this.setSyncStatus("فشل الاتصال", false);
      document.getElementById("loadingScreen").style.display = "none";
      document.getElementById("authScreen").style.display = "flex";
    }
  }
};

// ---- تعريض دوال Auth على window ----
window.login = async function () {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPassword").value;
  if (!email || !pass) { APP.showToast("ادخل البريد وكلمة المرور", false); return; }
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) { APP.showToast("فشل تسجيل الدخول: " + error.message, false); return; }
  location.reload();
};

window.register = async function () {
  const name  = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass  = document.getElementById("regPassword").value;
  if (!name || !email || !pass) { APP.showToast("اكمل جميع البيانات", false); return; }
  const { error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { shop_name: name, trial_start: new Date().toISOString() } }
  });
  if (error) { APP.showToast("فشل التسجيل: " + error.message, false); return; }
  APP.showToast("✅ تم إنشاء الحساب! تحقق من بريدك الإلكتروني");
};

window.logout = async function () {
  await sb.auth.signOut();
  location.reload();
};

window.navigate         = (page) => APP.navigate(page);
window.closeModal       = ()     => APP.closeModal();
window.confirmCloseDay  = ()     => APP.confirmCloseDay();
