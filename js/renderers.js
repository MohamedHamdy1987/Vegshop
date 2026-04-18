// ================================================
// renderers.js — جميع صفحات العرض
// يُحمَّل بعد core.js
// يستخدم APP.DB و APP.dbInsert وغيرها
// ================================================

window.RENDER = {

  // ================================================
  // DASHBOARD
  // ================================================
  dashboard() {
    const { DB, N, currency, emptyState, statCard, getSupplierName } = APP;
    let sales = 0, cash = 0, credit = 0, expenses = 0;
    DB.products.forEach(p => (p.salesLog || []).forEach(s => sales += N(s.total)));
    DB.collections.forEach(c => c.isCash ? cash += N(c.amount) : credit += N(c.amount));
    DB.expenses.forEach(e => expenses += N(e.amount));
    const netCash = cash - expenses;

    const top5P = [...DB.products]
      .sort((a, b) => N(b.sold) - N(a.sold))
      .slice(0, 5);

    const top5C = DB.customers.map(c => {
      let bal = 0;
      (c.ledger || []).forEach(l => l.type === "sale" ? bal += N(l.amount) : bal -= N(l.amount));
      return { ...c, balance: bal };
    }).sort((a, b) => b.balance - a.balance).slice(0, 5);

    document.getElementById("dashboard").innerHTML = `
      <h2>📊 ملخص اليوم</h2>
      <div class="grid">
        ${statCard("إجمالي المبيعات", currency(sales))}
        ${statCard("الكاش المحصل", currency(cash))}
        ${statCard("الآجل المحصل", currency(credit))}
        ${statCard("المصروفات", currency(expenses))}
        ${statCard("صافي الخزنة", currency(netCash))}
      </div>

      <h3>📦 أكثر المنتجات مبيعاً</h3>
      ${top5P.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المنتج</th><th>المورد</th><th>المباع</th></tr></thead>
          <tbody>${top5P.map(p => `
            <tr>
              <td><b>${p.name}</b></td>
              <td>${getSupplierName(p.supplierId)}</td>
              <td>${N(p.sold)}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا يوجد منتجات")}

      <h3>👥 أعلى أرصدة العملاء</h3>
      ${top5C.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>العميل</th><th>الرصيد</th></tr></thead>
          <tbody>${top5C.map(c => `
            <tr>
              <td><b>${c.name}</b></td>
              <td style="color:${c.balance > 0 ? "var(--danger)" : "var(--success)"};font-weight:700">${currency(c.balance)}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا يوجد عملاء")}
    `;
  },

  // ================================================
  // CUSTOMERS
  // ================================================
  customers() {
    const { DB, N, currency, emptyState } = APP;
    const rows = DB.customers.map(c => {
      const bal = ACTIONS.calcCustomerBalance(c);
      return `<tr>
        <td><b>${c.name}</b></td>
        <td>${c.phone || "-"}</td>
        <td style="color:${bal > 0 ? "var(--danger)" : "var(--success)"};font-weight:700">${currency(bal)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm btn-primary" onclick="ACTIONS.viewCustomer(${c.id})">📋 كشف</button>
            <button class="btn btn-sm btn-warning" onclick="ACTIONS.editCustomer(${c.id})">✏️</button>
            <button class="btn btn-sm btn-danger"  onclick="ACTIONS.deleteCustomer(${c.id})">🗑</button>
            <button class="btn btn-sm btn-success" onclick="ACTIONS.shareCustomer(${c.id})">📤 واتساب</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    document.getElementById("customers").innerHTML = `
      <h2>👥 العملاء</h2>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="ACTIONS.openAddCustomer()">➕ إضافة عميل</button>
      </div>
      ${DB.customers.length
        ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>الاسم</th><th>الهاتف</th><th>الرصيد</th><th>إجراءات</th></tr></thead>
            <tbody>${rows}</tbody>
           </table></div>`
        : emptyState("لا يوجد عملاء — أضف عميلك الأول")}
    `;
  },

  // ================================================
  // SUPPLIERS
  // ================================================
  suppliers() {
    const { DB, currency, emptyState } = APP;
    const rows = DB.suppliers.map(s => {
      const bal = ACTIONS.calcSupplierBalance(s);
      return `<tr>
        <td><b>${s.name}</b></td>
        <td>${s.phone || "-"}</td>
        <td style="color:${bal > 0 ? "var(--warning)" : "var(--success)"};font-weight:700">${currency(bal)}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm btn-primary" onclick="ACTIONS.viewSupplier(${s.id})">📋 كشف</button>
            <button class="btn btn-sm"             onclick="ACTIONS.viewSupplierInvoices(${s.id})">🧾 فواتير</button>
            <button class="btn btn-sm btn-warning" onclick="ACTIONS.editSupplier(${s.id})">✏️</button>
            <button class="btn btn-sm btn-danger"  onclick="ACTIONS.deleteSupplier(${s.id})">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    document.getElementById("suppliers").innerHTML = `
      <h2>🚚 الموردين</h2>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="ACTIONS.openAddSupplier()">➕ إضافة مورد</button>
      </div>
      ${DB.suppliers.length
        ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>الاسم</th><th>الهاتف</th><th>المستحق له</th><th>إجراءات</th></tr></thead>
            <tbody>${rows}</tbody>
           </table></div>`
        : emptyState("لا يوجد موردين — أضف مورداً أولاً")}
    `;
  },

  // ================================================
  // SALES
  // ================================================
  sales() {
    const { DB, N, emptyState, getSupplierName } = APP;
    const products = DB.products.filter(p => !p.locked);
    const rows = products.map(p => {
      const avail = N(p.totalQty) - N(p.sold);
      const pct   = N(p.totalQty) > 0 ? Math.round(N(p.sold) / N(p.totalQty) * 100) : 0;
      return `<tr>
        <td><b>${p.name}</b></td>
        <td>${getSupplierName(p.supplierId)}</td>
        <td>${N(p.totalQty)} ${p.unit || ""}</td>
        <td>${N(p.sold)} <small style="color:var(--muted)">(${pct}%)</small></td>
        <td style="color:${avail > 0 ? "var(--success)" : "var(--danger)"};font-weight:700">${avail}</td>
        <td>${avail > 0
          ? `<button class="btn btn-sm btn-primary" onclick="ACTIONS.openSellModal(${p.id})">🛒 بيع</button>`
          : `<span class="badge badge-red">نفد</span>`}
        </td>
      </tr>`;
    }).join("");

    document.getElementById("sales").innerHTML = `
      <h2>🛒 المبيعات</h2>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="ACTIONS.openAddProduct()">➕ إضافة منتج</button>
      </div>
      ${products.length
        ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>المنتج</th><th>المورد</th><th>الإجمالي</th><th>المباع</th><th>المتاح</th><th>بيع</th></tr></thead>
            <tbody>${rows}</tbody>
           </table></div>`
        : emptyState("لا يوجد منتجات نشطة — أضف منتجاً أو افتح يوماً جديداً")}
    `;
  },

  // ================================================
  // INVOICES
  // ================================================
  invoices() {
    const { DB, currency, formatDate, emptyState } = APP;
    document.getElementById("invoices").innerHTML = `
      <h2>🧾 الفواتير</h2>
      ${DB.invoices.length ? `
        <div class="table-wrap"><table class="table">
          <thead>
            <tr>
              <th>المورد</th><th>التاريخ</th><th>الإجمالي</th>
              <th>نولون</th><th>مشال</th><th>عمولة 7%</th><th>الصافي</th>
            </tr>
          </thead>
          <tbody>${DB.invoices.map(i => `
            <tr>
              <td><b>${i.supplierName || "-"}</b></td>
              <td>${formatDate(i.date)}</td>
              <td>${currency(i.gross)}</td>
              <td>${currency(i.ded_noulon)}</td>
              <td>${currency(i.ded_mashal)}</td>
              <td>${currency(i.ded_commission)}</td>
              <td style="color:var(--primary-dark);font-weight:900">${currency(i.net)}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد فواتير — تُنشأ الفاتورة تلقائياً عند بيع جميع الأصناف")}
    `;
  },

  // ================================================
  // KHAZNA
  // ================================================
  khazna() {
    const { DB, N, currency, formatDate, emptyState, statCard } = APP;
    let cash = 0, credit = 0, expenses = 0;
    DB.collections.forEach(c => c.isCash ? cash += N(c.amount) : credit += N(c.amount));
    DB.expenses.forEach(e => expenses += N(e.amount));
    const net = cash + credit - expenses;

    document.getElementById("khazna").innerHTML = `
      <h2>💰 الخزنة</h2>
      <div class="grid">
        ${statCard("الكاش",           currency(cash))}
        ${statCard("الآجل المحصل",    currency(credit))}
        ${statCard("المصروفات",       currency(expenses))}
        ${statCard("الصافي الكلي",    currency(net))}
      </div>
      <div class="btn-group">
        <button class="btn btn-success" onclick="ACTIONS.openAddCollection()">➕ إضافة تحصيل</button>
        <button class="btn btn-danger"  onclick="ACTIONS.openAddExpense()">➕ إضافة مصروف</button>
      </div>

      <h3>📥 التحصيلات</h3>
      ${DB.collections.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المبلغ</th><th>النوع</th><th>ملاحظة</th><th>التاريخ</th></tr></thead>
          <tbody>${DB.collections.map(c => `
            <tr>
              <td style="font-weight:700">${currency(c.amount)}</td>
              <td><span class="badge ${c.isCash ? "badge-green" : "badge-yellow"}">${c.isCash ? "كاش" : "آجل"}</span></td>
              <td>${c.note || "-"}</td>
              <td>${formatDate(c.date)}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد تحصيلات")}

      <h3>📤 المصروفات</h3>
      ${DB.expenses.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>الوصف</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
          <tbody>${DB.expenses.map(e => `
            <tr>
              <td>${e.description || "-"}</td>
              <td style="color:var(--danger);font-weight:700">${currency(e.amount)}</td>
              <td>${formatDate(e.date)}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد مصروفات")}
    `;
  },

  // ================================================
  // EMPLOYEES
  // ================================================
  employees() {
    const { DB, N, currency, emptyState } = APP;
    document.getElementById("employees").innerHTML = `
      <h2>👷 الموظفين</h2>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="ACTIONS.openAddEmployee()">➕ إضافة موظف</button>
      </div>
      ${DB.employees.length
        ? DB.employees.map(e => {
            const absences = (e.absences || []).length;
            const paid     = (e.payments || []).reduce((s, p) => s + N(p.amount), 0);
            const daily    = N(e.salary) / 30;
            const deducts  = absences * daily;
            const net      = N(e.salary) - deducts - paid;
            return `<div class="card employee-card">
              <div class="card-header-row">
                <div>
                  <h3>${e.name}</h3>
                  <p class="card-meta">مرتب: ${currency(e.salary)} &nbsp;|&nbsp; غياب: ${absences} يوم &nbsp;|&nbsp; مدفوع: ${currency(paid)}</p>
                </div>
                <div class="net-amount" style="color:${net >= 0 ? "var(--primary-dark)" : "var(--danger)"}">
                  المستحق<br>${currency(net)}
                </div>
              </div>
              <div class="btn-group" style="margin-top:12px">
                <button class="btn btn-sm btn-warning" onclick="ACTIONS.addAbsence(${e.id})">📅 غياب</button>
                <button class="btn btn-sm btn-success" onclick="ACTIONS.openPayEmployee(${e.id})">💰 دفع</button>
                <button class="btn btn-sm btn-primary" onclick="ACTIONS.editEmployee(${e.id})">✏️ تعديل</button>
                <button class="btn btn-sm btn-danger"  onclick="ACTIONS.deleteEmployee(${e.id})">🗑</button>
              </div>
            </div>`;
          }).join("")
        : emptyState("لا يوجد موظفين")}
    `;
  },

  // ================================================
  // PARTNERS
  // ================================================
  partners() {
    const { DB, N, currency, emptyState } = APP;
    document.getElementById("partners").innerHTML = `
      <h2>🤝 الشركاء</h2>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="ACTIONS.openAddPartner()">➕ إضافة شريك</button>
      </div>
      ${DB.partners.length
        ? DB.partners.map(p => {
            const absences = (p.absences || []).length;
            const paid     = (p.payments || []).reduce((s, x) => s + N(x.amount), 0);
            const profits  = (p.profits  || []).reduce((s, x) => s + N(x.amount), 0);
            const present  = 30 - absences;
            const base     = present * N(p.daily);
            const net      = base + profits - paid;
            return `<div class="card employee-card">
              <div class="card-header-row">
                <div>
                  <h3>${p.name}</h3>
                  <p class="card-meta">يومية: ${currency(p.daily)} &nbsp;|&nbsp; غياب: ${absences} يوم &nbsp;|&nbsp; أرباح: ${currency(profits)} &nbsp;|&nbsp; مدفوع: ${currency(paid)}</p>
                </div>
                <div class="net-amount" style="color:var(--primary-dark)">
                  المستحق<br>${currency(net)}
                </div>
              </div>
              <div class="btn-group" style="margin-top:12px">
                <button class="btn btn-sm btn-warning" onclick="ACTIONS.addPartnerAbsence(${p.id})">📅 غياب</button>
                <button class="btn btn-sm btn-primary" onclick="ACTIONS.openPartnerProfit(${p.id})">📈 ربح</button>
                <button class="btn btn-sm btn-success" onclick="ACTIONS.openPartnerPay(${p.id})">💰 دفع</button>
                <button class="btn btn-sm btn-danger"  onclick="ACTIONS.deletePartner(${p.id})">🗑</button>
              </div>
            </div>`;
          }).join("")
        : emptyState("لا يوجد شركاء")}
    `;
  },

  // ================================================
  // SHOPS
  // ================================================
  shops() {
    const { DB, formatDate, emptyState } = APP;
    document.getElementById("shops").innerHTML = `
      <h2>🏬 المحلات</h2>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="ACTIONS.openAddShop()">➕ إضافة محل</button>
      </div>
      ${DB.shops.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>الاسم</th><th>العنوان</th><th>تاريخ الإضافة</th><th>إجراءات</th></tr></thead>
          <tbody>${DB.shops.map(s => `
            <tr>
              <td><b>${s.name}</b></td>
              <td>${s.address || "-"}</td>
              <td>${formatDate(s.created_at)}</td>
              <td><button class="btn btn-sm btn-danger" onclick="ACTIONS.deleteShop(${s.id})">🗑</button></td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد محلات")}
    `;
  },

  // ================================================
  // BAQI
  // ================================================
  baqi() {
    const { DB, N, emptyState, getSupplierName } = APP;
    const products = DB.products.filter(p => !p.locked && (N(p.totalQty) - N(p.sold)) > 0);
    document.getElementById("baqi").innerHTML = `
      <h2>📦 المنتجات المتبقية</h2>
      ${products.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المنتج</th><th>المورد</th><th>الإجمالي</th><th>المباع</th><th>المتبقي</th></tr></thead>
          <tbody>${products.map(p => `
            <tr>
              <td><b>${p.name}</b></td>
              <td>${getSupplierName(p.supplierId)}</td>
              <td>${N(p.totalQty)} ${p.unit || ""}</td>
              <td>${N(p.sold)}</td>
              <td style="color:var(--warning);font-weight:700">${N(p.totalQty) - N(p.sold)}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا يوجد منتجات متبقية 🎉")}
    `;
  },

  // ================================================
  // NAZIL
  // ================================================
  nazil() {
    const { DB, N, emptyState, getSupplierName } = APP;
    const products = DB.products.filter(p => N(p.sold) >= N(p.totalQty) && N(p.totalQty) > 0);
    document.getElementById("nazil").innerHTML = `
      <h2>🚛 المنتجات المنتهية</h2>
      ${products.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المنتج</th><th>المورد</th><th>الكمية</th><th>تم بيعه</th><th>الحالة</th></tr></thead>
          <tbody>${products.map(p => `
            <tr>
              <td><b>${p.name}</b></td>
              <td>${getSupplierName(p.supplierId)}</td>
              <td>${N(p.totalQty)} ${p.unit || ""}</td>
              <td>${N(p.sold)}</td>
              <td><span class="badge badge-green">نفد ✓</span></td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد منتجات منتهية بعد")}
    `;
  },

  // ================================================
  // TARHIL
  // ================================================
  tarhil() {
    const { DB, formatDate, emptyState } = APP;
    document.getElementById("tarhil").innerHTML = `
      <h2>📋 سجل الترحيلات</h2>
      ${DB.tarhil_log.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>التاريخ</th><th>عدد الأصناف المرحلة</th></tr></thead>
          <tbody>${DB.tarhil_log.map(l => `
            <tr>
              <td>${l.date || formatDate(l.created_at)}</td>
              <td><b>${l.movedCount || 0}</b> صنف</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد ترحيلات بعد")}
    `;
  },

  // ================================================
  // SUBSCRIPTION
  // ================================================
  subscription() {
    const { DB, currency, statusBadge, emptyState } = APP;
    document.getElementById("subscription").innerHTML = `
      <h2>💳 الاشتراك</h2>
      <div class="grid" style="max-width:600px">
        <div class="card" style="text-align:center">
          <h3>شهري</h3>
          <p style="font-size:30px;font-weight:900;color:var(--primary-dark);margin:12px 0">750 <span style="font-size:14px;font-weight:400">جنيه/شهر</span></p>
          <p style="color:var(--muted);font-size:13px;margin-bottom:16px">شهر تجربة مجاني</p>
          <button class="btn btn-primary" style="width:100%" onclick="ACTIONS.openPaymentModal(750,'monthly')">اشتراك</button>
        </div>
        <div class="card" style="text-align:center;border:2px solid var(--primary);position:relative">
          <span style="position:absolute;top:-12px;right:50%;transform:translateX(50%);background:var(--primary);color:white;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap">⭐ الأوفر</span>
          <h3>سنوي</h3>
          <p style="font-size:30px;font-weight:900;color:var(--primary-dark);margin:12px 0">6000 <span style="font-size:14px;font-weight:400">جنيه/سنة</span></p>
          <p style="color:var(--muted);font-size:13px;margin-bottom:16px">توفير 3000 جنيه</p>
          <button class="btn btn-primary" style="width:100%" onclick="ACTIONS.openPaymentModal(6000,'yearly')">اشتراك</button>
        </div>
      </div>

      <h3>📄 طلباتي</h3>
      ${DB.payments.length ? `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>الخطة</th><th>المبلغ</th><th>الطريقة</th><th>رقم العملية</th><th>الحالة</th></tr></thead>
          <tbody>${DB.payments.map(p => `
            <tr>
              <td>${p.plan === "yearly" ? "سنوي" : "شهري"}</td>
              <td>${currency(p.amount)}</td>
              <td>${p.method}</td>
              <td>${p.transaction_id || "-"}</td>
              <td>${statusBadge(p.status)}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد طلبات")}
    `;
  },

  // ================================================
  // ADMIN
  // ================================================
  admin() {
    const { DB, currency, statusBadge, emptyState } = APP;
    document.getElementById("admin").innerHTML = `
      <h2>🛠 لوحة المشرف</h2>
      <div class="card" style="background:#fef9c3;border:1px solid #fde047;margin-bottom:16px">
        <p style="font-size:13px;color:#854d0e">
          ⚠️ تفعيل الاشتراكات يدوي من المشرف.
          تأكد من التواصل عبر واتساب بعد إرسال الطلب.
        </p>
      </div>
      ${DB.payments.length ? `
        <h3>💳 طلبات الاشتراك</h3>
        <div class="table-wrap"><table class="table">
          <thead>
            <tr>
              <th>المستخدم</th><th>الخطة</th><th>المبلغ</th>
              <th>الطريقة</th><th>رقم العملية</th><th>الحالة</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody>${DB.payments.map(p => `
            <tr>
              <td style="font-size:11px">${(p.user_id || "").substring(0, 8)}...</td>
              <td>${p.plan === "yearly" ? "سنوي" : "شهري"}</td>
              <td>${currency(p.amount)}</td>
              <td>${p.method}</td>
              <td>${p.transaction_id || "-"}</td>
              <td>${statusBadge(p.status)}</td>
              <td>${p.status === "pending" ? `
                <button class="btn btn-sm btn-success" onclick="ACTIONS.approvePayment(${p.id})">✅</button>
                <button class="btn btn-sm btn-danger"  onclick="ACTIONS.rejectPayment(${p.id})">❌</button>
              ` : "-"}</td>
            </tr>`).join("")}
          </tbody>
        </table></div>
      ` : emptyState("لا توجد طلبات")}
    `;
  }

};
