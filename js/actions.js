// ================================================
// actions.js — جميع العمليات والـ modals
// يُحمَّل بعد renderers.js
// ================================================

window.ACTIONS = {

  // ================================================
  // CUSTOMERS
  // ================================================
  calcCustomerBalance(c) {
    let b = 0;
    (c.ledger || []).forEach(l => l.type === "sale" ? b += APP.N(l.amount) : b -= APP.N(l.amount));
    return b;
  },

  openAddCustomer() {
    APP.openModal("➕ إضافة عميل", `
      <label>اسم العميل *</label>
      <input id="c_name" placeholder="مثلاً: أحمد محمد">
      <label>رقم الهاتف</label>
      <input id="c_phone" placeholder="01xxxxxxxxx">
    `, `<button class="btn btn-primary" onclick="ACTIONS.saveCustomer()">💾 حفظ</button>`);
  },

  async saveCustomer() {
    const name  = document.getElementById("c_name").value.trim();
    const phone = document.getElementById("c_phone").value.trim();
    if (!name) { APP.showToast("ادخل اسم العميل", false); return; }
    const ok = await APP.dbInsert("customers", { name, phone, ledger: [] });
    if (ok) {
      APP.showToast("✅ تم إضافة العميل");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.customers();
    }
  },

  editCustomer(id) {
    const c = APP.DB.customers.find(x => x.id == id);
    APP.openModal("✏️ تعديل العميل", `
      <label>الاسم *</label>
      <input id="c_name" value="${c.name}">
      <label>الهاتف</label>
      <input id="c_phone" value="${c.phone || ""}">
    `, `<button class="btn btn-success" onclick="ACTIONS.updateCustomer(${id})">✅ تحديث</button>`);
  },

  async updateCustomer(id) {
    const name  = document.getElementById("c_name").value.trim();
    const phone = document.getElementById("c_phone").value.trim();
    if (!name) { APP.showToast("ادخل الاسم", false); return; }
    const ok = await APP.dbUpdate("customers", id, { name, phone });
    if (ok) {
      APP.showToast("✅ تم التحديث");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.customers();
    }
  },

  deleteCustomer(id) {
    APP.confirmDo("هل تريد حذف هذا العميل نهائياً؟", async () => {
      const ok = await APP.dbDelete("customers", id);
      if (ok) {
        APP.showToast("تم الحذف");
        await APP.dbLoad();
        RENDER.customers();
      }
    });
  },

  viewCustomer(id) {
    const c = APP.DB.customers.find(x => x.id == id);
    const ledger = c.ledger || [];
    let bal = 0;
    const rows = ledger.map(l => {
      l.type === "sale" ? bal += APP.N(l.amount) : bal -= APP.N(l.amount);
      const typeLabel = l.type === "sale" ? "مبيعات" : l.type === "collection" ? "تحصيل" : l.type;
      return `<tr>
        <td>${APP.formatDate(l.date)}</td>
        <td>${typeLabel}</td>
        <td>${l.note || "-"}</td>
        <td style="color:${APP.N(l.amount) > 0 && l.type === "sale" ? "var(--danger)" : "var(--success)"}">${APP.currency(l.amount)}</td>
        <td style="font-weight:700;color:${bal > 0 ? "var(--danger)" : "var(--success)"}">${APP.currency(bal)}</td>
      </tr>`;
    }).join("");

    APP.openModal(`📋 كشف حساب — ${c.name}`, `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>بيان</th><th>المبلغ</th><th>الرصيد</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:var(--muted)">لا توجد حركات</td></tr>`}</tbody>
      </table></div>
      <div style="margin-top:14px;padding:12px;background:${bal > 0 ? "#fee2e2" : "#dcfce7"};border-radius:8px;text-align:center;font-weight:700;font-size:15px;color:${bal > 0 ? "var(--danger)" : "var(--success)"}">
        الرصيد الحالي: ${APP.currency(bal)}
      </div>
    `);
  },

  shareCustomer(id) {
    const c   = APP.DB.customers.find(x => x.id == id);
    const bal = this.calcCustomerBalance(c);
    let text  = `كشف حساب - ${c.name}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    (c.ledger || []).forEach(l => {
      const type = l.type === "sale" ? "مبيعات" : "تحصيل";
      text += `${type}: ${APP.currency(l.amount)}${l.note ? " - " + l.note : ""}\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `الرصيد: ${APP.currency(bal)}`;
    window.open(`https://wa.me/${c.phone || ""}?text=${encodeURIComponent(text)}`, "_blank");
  },

  // ================================================
  // SUPPLIERS
  // ================================================
  calcSupplierBalance(s) {
    let b = 0;
    (s.ledger || []).forEach(l => l.type === "invoice" ? b += APP.N(l.amount) : b -= APP.N(l.amount));
    return b;
  },

  openAddSupplier() {
    APP.openModal("➕ إضافة مورد", `
      <label>اسم المورد *</label>
      <input id="s_name" placeholder="مثلاً: محمد الفاكهاني">
      <label>رقم الهاتف</label>
      <input id="s_phone" placeholder="01xxxxxxxxx">
    `, `<button class="btn btn-primary" onclick="ACTIONS.saveSupplier()">💾 حفظ</button>`);
  },

  async saveSupplier() {
    const name  = document.getElementById("s_name").value.trim();
    const phone = document.getElementById("s_phone").value.trim();
    if (!name) { APP.showToast("ادخل اسم المورد", false); return; }
    const ok = await APP.dbInsert("suppliers", { name, phone, ledger: [] });
    if (ok) {
      APP.showToast("✅ تم إضافة المورد");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.suppliers();
    }
  },

  editSupplier(id) {
    const s = APP.DB.suppliers.find(x => x.id == id);
    APP.openModal("✏️ تعديل المورد", `
      <label>الاسم *</label>
      <input id="s_name" value="${s.name}">
      <label>الهاتف</label>
      <input id="s_phone" value="${s.phone || ""}">
    `, `<button class="btn btn-success" onclick="ACTIONS.updateSupplier(${id})">✅ تحديث</button>`);
  },

  async updateSupplier(id) {
    const name  = document.getElementById("s_name").value.trim();
    const phone = document.getElementById("s_phone").value.trim();
    if (!name) { APP.showToast("ادخل الاسم", false); return; }
    const ok = await APP.dbUpdate("suppliers", id, { name, phone });
    if (ok) {
      APP.showToast("✅ تم التحديث");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.suppliers();
    }
  },

  deleteSupplier(id) {
    APP.confirmDo("هل تريد حذف هذا المورد نهائياً؟", async () => {
      const ok = await APP.dbDelete("suppliers", id);
      if (ok) {
        APP.showToast("تم الحذف");
        await APP.dbLoad();
        RENDER.suppliers();
      }
    });
  },

  viewSupplier(id) {
    const s = APP.DB.suppliers.find(x => x.id == id);
    const ledger = s.ledger || [];
    let bal = 0;
    const rows = ledger.map(l => {
      l.type === "invoice" ? bal += APP.N(l.amount) : bal -= APP.N(l.amount);
      return `<tr>
        <td>${APP.formatDate(l.date)}</td>
        <td>${l.type === "invoice" ? "فاتورة" : "دفعة"}</td>
        <td>${APP.currency(l.amount)}</td>
        <td style="font-weight:700">${APP.currency(bal)}</td>
      </tr>`;
    }).join("");

    APP.openModal(`📋 كشف حساب — ${s.name}`, `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الرصيد</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" style="text-align:center;color:var(--muted)">لا توجد حركات</td></tr>`}</tbody>
      </table></div>
      <div style="margin-top:14px;padding:12px;background:#fef9c3;border-radius:8px;text-align:center;font-weight:700;font-size:15px">
        المستحق للمورد: ${APP.currency(bal)}
      </div>
    `);
  },

  viewSupplierInvoices(id) {
    const invs = APP.DB.invoices.filter(i => i.supplierId == id);
    if (!invs.length) {
      APP.openModal("🧾 الفواتير", APP.emptyState("لا توجد فواتير لهذا المورد"));
      return;
    }
    APP.openModal("🧾 فواتير المورد", `
      <div class="table-wrap"><table class="table">
        <thead>
          <tr>
            <th>التاريخ</th><th>الإجمالي</th><th>نولون</th>
            <th>مشال</th><th>عمولة 7%</th><th>الصافي</th>
          </tr>
        </thead>
        <tbody>${invs.map(i => `
          <tr>
            <td>${APP.formatDate(i.date)}</td>
            <td>${APP.currency(i.gross)}</td>
            <td>${APP.currency(i.ded_noulon)}</td>
            <td>${APP.currency(i.ded_mashal)}</td>
            <td>${APP.currency(i.ded_commission)}</td>
            <td style="font-weight:900;color:var(--primary-dark)">${APP.currency(i.net)}</td>
          </tr>`).join("")}
        </tbody>
      </table></div>
    `);
  },

  // ================================================
  // SALES — ADD PRODUCT
  // ================================================
  openAddProduct() {
    const supplierOptions = APP.DB.suppliers.map(s =>
      `<option value="${s.id}">${s.name}</option>`
    ).join("");

    APP.openModal("➕ إضافة منتج", `
      <label>اسم المنتج *</label>
      <input id="p_name" placeholder="مثلاً: طماطم">

      <label>المورد *</label>
      <select id="p_supplier">
        <option value="">اختر المورد</option>
        ${supplierOptions}
      </select>

      <label>الكمية الإجمالية *</label>
      <input id="p_qty" type="number" min="1" placeholder="عدد الكراتين / الأكياس">

      <label>الوحدة</label>
      <input id="p_unit" placeholder="كرتونة / كيلو / طرد / شكارة">

      <label>نولون (جنيه)</label>
      <input id="p_noulon" type="number" value="0" min="0">

      <label>مشال (جنيه)</label>
      <input id="p_mashal" type="number" value="0" min="0">
    `, `<button class="btn btn-primary" onclick="ACTIONS.saveProduct()">💾 حفظ المنتج</button>`);
  },

  async saveProduct() {
    const name       = document.getElementById("p_name").value.trim();
    const supplierId = document.getElementById("p_supplier").value;
    const qty        = APP.N(document.getElementById("p_qty").value);
    const unit       = document.getElementById("p_unit").value.trim();
    const noulon     = APP.N(document.getElementById("p_noulon").value);
    const mashal     = APP.N(document.getElementById("p_mashal").value);

    if (!name || !supplierId || !qty) {
      APP.showToast("ادخل اسم المنتج والمورد والكمية", false);
      return;
    }
    const ok = await APP.dbInsert("products", {
      name,
      supplierId: Number(supplierId),
      totalQty: qty,
      unit,
      noulon,
      mashal,
      sold: 0,
      salesLog: [],
      locked: false
    });
    if (ok) {
      APP.showToast("✅ تم إضافة المنتج");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.sales();
    }
  },

  // ================================================
  // SALES — SELL MODAL
  // ================================================
  openSellModal(productId) {
    const p     = APP.DB.products.find(x => x.id == productId);
    const avail = APP.N(p.totalQty) - APP.N(p.sold);
    const customerOptions = APP.DB.customers.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join("");

    APP.openModal(`🛒 بيع: ${p.name}`, `
      <p style="color:var(--muted);margin-bottom:8px;font-size:13px">
        المتاح: <b style="color:var(--primary-dark)">${avail} ${p.unit || ""}</b>
      </p>

      <label>الكمية *</label>
      <input id="sale_qty" type="number" min="1" max="${avail}" placeholder="الكمية المباعة">

      <label>السعر للوحدة *</label>
      <input id="sale_price" type="number" min="0" placeholder="السعر بالجنيه">

      <label>نوع البيع</label>
      <select id="sale_type" onchange="ACTIONS.toggleCustomerField()">
        <option value="cash">💵 كاش</option>
        <option value="credit">📋 آجل</option>
      </select>

      <div id="customerField" style="display:none">
        <label>العميل *</label>
        <select id="sale_customer">
          <option value="">اختر العميل</option>
          ${customerOptions}
        </select>
      </div>

      <div id="saleTotalPreview" style="margin-top:12px;padding:10px;background:#f0fdf9;border-radius:8px;text-align:center;font-weight:700;font-size:15px;color:var(--primary-dark);display:none">
        الإجمالي: <span id="saleTotalNum"></span>
      </div>
    `, `<button class="btn btn-primary" onclick="ACTIONS.confirmSale(${productId})">✅ تأكيد البيع</button>`);

    // حساب الإجمالي live
    setTimeout(() => {
      const calcTotal = () => {
        const q = APP.N(document.getElementById("sale_qty")?.value);
        const p2 = APP.N(document.getElementById("sale_price")?.value);
        const preview = document.getElementById("saleTotalPreview");
        const num     = document.getElementById("saleTotalNum");
        if (q && p2 && preview && num) {
          num.innerText = APP.currency(q * p2);
          preview.style.display = "block";
        }
      };
      document.getElementById("sale_qty")?.addEventListener("input", calcTotal);
      document.getElementById("sale_price")?.addEventListener("input", calcTotal);
    }, 100);
  },

  toggleCustomerField() {
    const type = document.getElementById("sale_type")?.value;
    const field = document.getElementById("customerField");
    if (field) field.style.display = type === "credit" ? "block" : "none";
  },

  async confirmSale(productId) {
    const qty        = APP.N(document.getElementById("sale_qty").value);
    const price      = APP.N(document.getElementById("sale_price").value);
    const type       = document.getElementById("sale_type").value;
    const customerId = document.getElementById("sale_customer")?.value;

    if (!qty || qty <= 0)   { APP.showToast("ادخل الكمية", false); return; }
    if (!price || price <= 0) { APP.showToast("ادخل السعر", false); return; }

    const p     = APP.DB.products.find(x => x.id == productId);
    const avail = APP.N(p.totalQty) - APP.N(p.sold);

    if (qty > avail) {
      APP.showToast(`الكمية أكبر من المتاح (${avail})`, false);
      return;
    }
    if (type === "credit" && !customerId) {
      APP.showToast("اختر العميل للبيع الآجل", false);
      return;
    }

    const total   = qty * price;
    const newSold = APP.N(p.sold) + qty;
    const newLog  = [
      ...(p.salesLog || []),
      { qty, price, total, type, customerId: customerId || null, date: new Date().toISOString() }
    ];

    // تحديث المنتج
    await APP.dbUpdate("products", productId, { sold: newSold, salesLog: newLog });

    if (type === "cash") {
      // إضافة تحصيل كاش
      await APP.dbInsert("collections", {
        amount: total,
        isCash: true,
        note: `بيع ${p.name}`,
        date: new Date().toISOString()
      });
    } else {
      // تحديث دفتر العميل
      const c = APP.DB.customers.find(x => x.id == customerId);
      if (c) {
        const ledger = [
          ...(c.ledger || []),
          { type: "sale", amount: total, note: p.name, date: new Date().toISOString() }
        ];
        await APP.dbUpdate("customers", Number(customerId), { ledger });
      }
    }

    // محرك الفواتير
    await APP.checkAndGenerateInvoice(p.supplierId);

    APP.showToast(`✅ تم البيع — الإجمالي: ${APP.currency(total)}`);
    APP.closeModal();
    await APP.dbLoad();
    RENDER.sales();
  },

  // ================================================
  // KHAZNA
  // ================================================
  openAddCollection() {
    APP.openModal("➕ إضافة تحصيل", `
      <label>المبلغ *</label>
      <input id="col_amount" type="number" min="0" placeholder="0">
      <label>النوع</label>
      <select id="col_type">
        <option value="cash">💵 كاش</option>
        <option value="credit">📋 آجل محصل</option>
      </select>
      <label>ملاحظة</label>
      <input id="col_note" placeholder="مثلاً: تحصيل من أحمد">
    `, `<button class="btn btn-success" onclick="ACTIONS.saveCollection()">💾 حفظ</button>`);
  },

  async saveCollection() {
    const amount = APP.N(document.getElementById("col_amount").value);
    const type   = document.getElementById("col_type").value;
    const note   = document.getElementById("col_note").value.trim();
    if (!amount) { APP.showToast("ادخل المبلغ", false); return; }
    const ok = await APP.dbInsert("collections", {
      amount,
      isCash: type === "cash",
      note,
      date: new Date().toISOString()
    });
    if (ok) {
      APP.showToast("✅ تم إضافة التحصيل");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.khazna();
    }
  },

  openAddExpense() {
    APP.openModal("➕ إضافة مصروف", `
      <label>الوصف *</label>
      <input id="exp_desc" placeholder="مثلاً: نولون سيارة">
      <label>المبلغ *</label>
      <input id="exp_amount" type="number" min="0" placeholder="0">
    `, `<button class="btn btn-danger" onclick="ACTIONS.saveExpense()">💾 حفظ</button>`);
  },

  async saveExpense() {
    const description = document.getElementById("exp_desc").value.trim();
    const amount      = APP.N(document.getElementById("exp_amount").value);
    if (!description || !amount) { APP.showToast("ادخل الوصف والمبلغ", false); return; }
    const ok = await APP.dbInsert("expenses", {
      description,
      amount,
      date: new Date().toISOString()
    });
    if (ok) {
      APP.showToast("✅ تم إضافة المصروف");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.khazna();
    }
  },

  // ================================================
  // EMPLOYEES
  // ================================================
  openAddEmployee() {
    APP.openModal("➕ إضافة موظف", `
      <label>الاسم *</label>
      <input id="emp_name" placeholder="اسم الموظف">
      <label>المرتب الشهري *</label>
      <input id="emp_salary" type="number" min="0" placeholder="0">
      <label>الهاتف</label>
      <input id="emp_phone" placeholder="01xxxxxxxxx">
    `, `<button class="btn btn-primary" onclick="ACTIONS.saveEmployee()">💾 حفظ</button>`);
  },

  async saveEmployee() {
    const name   = document.getElementById("emp_name").value.trim();
    const salary = APP.N(document.getElementById("emp_salary").value);
    const phone  = document.getElementById("emp_phone").value.trim();
    if (!name || !salary) { APP.showToast("ادخل الاسم والمرتب", false); return; }
    const ok = await APP.dbInsert("employees", {
      name, salary, phone, payments: [], absences: []
    });
    if (ok) {
      APP.showToast("✅ تم إضافة الموظف");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.employees();
    }
  },

  async addAbsence(id) {
    const e        = APP.DB.employees.find(x => x.id == id);
    const absences = [...(e.absences || []), { date: new Date().toISOString() }];
    const ok = await APP.dbUpdate("employees", id, { absences });
    if (ok) {
      APP.showToast("تم تسجيل الغياب");
      await APP.dbLoad();
      RENDER.employees();
    }
  },

  openPayEmployee(id) {
    const e = APP.DB.employees.find(x => x.id == id);
    APP.openModal(`💰 دفع لـ ${e.name}`, `
      <label>المبلغ *</label>
      <input id="emp_pay" type="number" min="0" placeholder="0">
    `, `<button class="btn btn-success" onclick="ACTIONS.saveEmployeePayment(${id})">💰 دفع</button>`);
  },

  async saveEmployeePayment(id) {
    const amount = APP.N(document.getElementById("emp_pay").value);
    if (!amount) { APP.showToast("ادخل المبلغ", false); return; }
    const e        = APP.DB.employees.find(x => x.id == id);
    const payments = [...(e.payments || []), { amount, date: new Date().toISOString() }];
    const ok = await APP.dbUpdate("employees", id, { payments });
    if (ok) {
      APP.showToast("✅ تم الدفع");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.employees();
    }
  },

  editEmployee(id) {
    const e = APP.DB.employees.find(x => x.id == id);
    APP.openModal("✏️ تعديل الموظف", `
      <label>الاسم *</label>
      <input id="emp_name" value="${e.name}">
      <label>المرتب *</label>
      <input id="emp_salary" type="number" value="${e.salary}">
    `, `<button class="btn btn-success" onclick="ACTIONS.updateEmployee(${id})">✅ تحديث</button>`);
  },

  async updateEmployee(id) {
    const name   = document.getElementById("emp_name").value.trim();
    const salary = APP.N(document.getElementById("emp_salary").value);
    if (!name) { APP.showToast("ادخل الاسم", false); return; }
    const ok = await APP.dbUpdate("employees", id, { name, salary });
    if (ok) {
      APP.showToast("✅ تم التحديث");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.employees();
    }
  },

  deleteEmployee(id) {
    APP.confirmDo("هل تريد حذف هذا الموظف؟", async () => {
      const ok = await APP.dbDelete("employees", id);
      if (ok) {
        APP.showToast("تم الحذف");
        await APP.dbLoad();
        RENDER.employees();
      }
    });
  },

  // ================================================
  // PARTNERS
  // ================================================
  openAddPartner() {
    APP.openModal("➕ إضافة شريك", `
      <label>الاسم *</label>
      <input id="par_name" placeholder="اسم الشريك">
      <label>اليومية *</label>
      <input id="par_daily" type="number" min="0" placeholder="0">
      <label>الهاتف</label>
      <input id="par_phone" placeholder="01xxxxxxxxx">
    `, `<button class="btn btn-primary" onclick="ACTIONS.savePartner()">💾 حفظ</button>`);
  },

  async savePartner() {
    const name  = document.getElementById("par_name").value.trim();
    const daily = APP.N(document.getElementById("par_daily").value);
    const phone = document.getElementById("par_phone").value.trim();
    if (!name || !daily) { APP.showToast("ادخل الاسم واليومية", false); return; }
    const ok = await APP.dbInsert("partners", {
      name, daily, phone, payments: [], absences: [], profits: []
    });
    if (ok) {
      APP.showToast("✅ تم إضافة الشريك");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.partners();
    }
  },

  async addPartnerAbsence(id) {
    const p        = APP.DB.partners.find(x => x.id == id);
    const absences = [...(p.absences || []), { date: new Date().toISOString() }];
    const ok = await APP.dbUpdate("partners", id, { absences });
    if (ok) {
      APP.showToast("تم تسجيل الغياب");
      await APP.dbLoad();
      RENDER.partners();
    }
  },

  openPartnerProfit(id) {
    const p = APP.DB.partners.find(x => x.id == id);
    APP.openModal(`📈 إضافة ربح — ${p.name}`, `
      <label>المبلغ *</label>
      <input id="par_profit" type="number" min="0" placeholder="0">
    `, `<button class="btn btn-primary" onclick="ACTIONS.savePartnerProfit(${id})">💾 حفظ</button>`);
  },

  async savePartnerProfit(id) {
    const amount = APP.N(document.getElementById("par_profit").value);
    if (!amount) { APP.showToast("ادخل المبلغ", false); return; }
    const p       = APP.DB.partners.find(x => x.id == id);
    const profits = [...(p.profits || []), { amount, date: new Date().toISOString() }];
    const ok = await APP.dbUpdate("partners", id, { profits });
    if (ok) {
      APP.showToast("✅ تم إضافة الربح");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.partners();
    }
  },

  openPartnerPay(id) {
    const p = APP.DB.partners.find(x => x.id == id);
    APP.openModal(`💰 دفع لـ ${p.name}`, `
      <label>المبلغ *</label>
      <input id="par_pay" type="number" min="0" placeholder="0">
    `, `<button class="btn btn-success" onclick="ACTIONS.savePartnerPay(${id})">💰 دفع</button>`);
  },

  async savePartnerPay(id) {
    const amount   = APP.N(document.getElementById("par_pay").value);
    if (!amount) { APP.showToast("ادخل المبلغ", false); return; }
    const p        = APP.DB.partners.find(x => x.id == id);
    const payments = [...(p.payments || []), { amount, date: new Date().toISOString() }];
    const ok = await APP.dbUpdate("partners", id, { payments });
    if (ok) {
      APP.showToast("✅ تم الدفع");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.partners();
    }
  },

  deletePartner(id) {
    APP.confirmDo("هل تريد حذف هذا الشريك؟", async () => {
      const ok = await APP.dbDelete("partners", id);
      if (ok) {
        APP.showToast("تم الحذف");
        await APP.dbLoad();
        RENDER.partners();
      }
    });
  },

  // ================================================
  // SHOPS
  // ================================================
  openAddShop() {
    APP.openModal("➕ إضافة محل", `
      <label>اسم المحل *</label>
      <input id="shop_name" placeholder="مثلاً: محل أبو أحمد">
      <label>العنوان</label>
      <input id="shop_address" placeholder="الحي / الشارع">
    `, `<button class="btn btn-primary" onclick="ACTIONS.saveShop()">💾 حفظ</button>`);
  },

  async saveShop() {
    const name    = document.getElementById("shop_name").value.trim();
    const address = document.getElementById("shop_address").value.trim();
    if (!name) { APP.showToast("ادخل اسم المحل", false); return; }
    const ok = await APP.dbInsert("shops", {
      name, address, created_at: new Date().toISOString()
    });
    if (ok) {
      APP.showToast("✅ تم إضافة المحل");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.shops();
    }
  },

  deleteShop(id) {
    APP.confirmDo("حذف المحل نهائياً؟", async () => {
      const ok = await APP.dbDelete("shops", id);
      if (ok) {
        APP.showToast("تم الحذف");
        await APP.dbLoad();
        RENDER.shops();
      }
    });
  },

  // ================================================
  // SUBSCRIPTION
  // ================================================
  openPaymentModal(amount, plan) {
    APP.openModal("📤 طلب اشتراك", `
      <p style="margin-bottom:12px">الخطة: <b>${plan === "yearly" ? "سنوي" : "شهري"}</b> — المبلغ: <b style="color:var(--primary-dark)">${APP.currency(amount)}</b></p>
      <label>طريقة الدفع</label>
      <select id="pay_method">
        <option value="vodafone">فودافون كاش</option>
        <option value="instapay">انستاباي</option>
        <option value="bank">تحويل بنكي</option>
        <option value="fawry">فوري</option>
      </select>
      <label>رقم العملية *</label>
      <input id="pay_trx" placeholder="رقم الإيصال أو التحويل">
      <label>ملاحظات</label>
      <textarea id="pay_notes" placeholder="أي ملاحظات إضافية"></textarea>
    `, `<button class="btn btn-success" onclick="ACTIONS.submitPayment(${amount},'${plan}')">📤 إرسال الطلب</button>`);
  },

  async submitPayment(amount, plan) {
    const method = document.getElementById("pay_method").value;
    const trx    = document.getElementById("pay_trx").value.trim();
    const notes  = document.getElementById("pay_notes").value.trim();
    if (!trx) { APP.showToast("ادخل رقم العملية", false); return; }
    const ok = await APP.dbInsert("payments", {
      amount, plan, method,
      transaction_id: trx,
      notes,
      status: "pending",
      created_at: new Date().toISOString()
    });
    if (ok) {
      APP.showToast("✅ تم إرسال الطلب — سيتم مراجعته قريباً");
      APP.closeModal();
      await APP.dbLoad();
      RENDER.subscription();
    }
  },

  // ================================================
  // ADMIN
  // ================================================
  approvePayment(id) {
    APP.confirmDo("تأكيد الموافقة على هذا الطلب؟", async () => {
      const { error } = await APP.sb.from("payments")
        .update({ status: "approved", confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) { APP.showToast("خطأ: " + error.message, false); return; }
      APP.showToast("✅ تم التفعيل");
      await APP.dbLoad();
      RENDER.admin();
    });
  },

  rejectPayment(id) {
    APP.confirmDo("رفض هذا الطلب؟", async () => {
      await APP.sb.from("payments").update({ status: "rejected" }).eq("id", id);
      APP.showToast("تم الرفض");
      await APP.dbLoad();
      RENDER.admin();
    });
  }

};
