// ===================== pagination.js — ترقيم الصفحات وتحسين أداء القوائم الطويلة =====================

/**
 * كلاس لإدارة الترقيم
 */
class Paginator {
  constructor(items, itemsPerPage = 20) {
    this.items = items;
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
  }
  
  get totalPages() {
    return Math.ceil(this.items.length / this.itemsPerPage);
  }
  
  get currentItems() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.items.slice(start, end);
  }
  
  goToPage(page) {
    if (page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;
    this.currentPage = page;
    return this.currentItems;
  }
  
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
    return this.currentItems;
  }
  
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
    return this.currentItems;
  }
  
  setItems(newItems) {
    this.items = newItems;
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) this.currentPage = 1;
    return this.currentItems;
  }
  
  reset() {
    this.currentPage = 1;
  }
}

/**
 * إنشاء عناصر تحكم الترقيم في DOM
 * @param {string} containerId - معرف العنصر الذي سيحتوي أزرار الترقيم
 * @param {Paginator} paginator - كائن الترقيم
 * @param {Function} renderCallback - دالة لإعادة عرض العناصر بعد تغيير الصفحة
 */
function createPaginationControls(containerId, paginator, renderCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  function renderControls() {
    if (paginator.totalPages <= 1) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';
    container.innerHTML = '';
    
    // زر الصفحة الأولى
    const firstBtn = document.createElement('button');
    firstBtn.textContent = '⏮';
    firstBtn.className = 'pagination-btn';
    firstBtn.disabled = paginator.currentPage === 1;
    firstBtn.onclick = () => {
      if (paginator.currentPage !== 1) {
        paginator.goToPage(1);
        renderCallback();
        renderControls();
      }
    };
    container.appendChild(firstBtn);
    
    // زر السابق
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀';
    prevBtn.className = 'pagination-btn';
    prevBtn.disabled = paginator.currentPage === 1;
    prevBtn.onclick = () => {
      if (paginator.currentPage > 1) {
        paginator.prevPage();
        renderCallback();
        renderControls();
      }
    };
    container.appendChild(prevBtn);
    
    // عرض رقم الصفحة الحالية / الإجمالي
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `${paginator.currentPage} / ${paginator.totalPages}`;
    container.appendChild(pageInfo);
    
    // زر التالي
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '▶';
    nextBtn.className = 'pagination-btn';
    nextBtn.disabled = paginator.currentPage === paginator.totalPages;
    nextBtn.onclick = () => {
      if (paginator.currentPage < paginator.totalPages) {
        paginator.nextPage();
        renderCallback();
        renderControls();
      }
    };
    container.appendChild(nextBtn);
    
    // زر الصفحة الأخيرة
    const lastBtn = document.createElement('button');
    lastBtn.textContent = '⏭';
    lastBtn.className = 'pagination-btn';
    lastBtn.disabled = paginator.currentPage === paginator.totalPages;
    lastBtn.onclick = () => {
      if (paginator.currentPage !== paginator.totalPages) {
        paginator.goToPage(paginator.totalPages);
        renderCallback();
        renderControls();
      }
    };
    container.appendChild(lastBtn);
  }
  
  renderControls();
  return container;
}

/**
 * ترقيم العملاء
 */
let customersPaginator = null;

function initCustomersPagination() {
  customersPaginator = new Paginator(S.customers, 15);
  renderCustomersPage();
}

function renderCustomersPage() {
  if (!customersPaginator) {
    initCustomersPagination();
  } else {
    customersPaginator.setItems(S.customers);
  }
  
  const currentCustomers = customersPaginator.currentItems;
  const container = document.getElementById('cust-list-cont');
  if (!container) return;
  
  if (!currentCustomers.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا يوجد عملاء</p>';
  } else {
    container.innerHTML = currentCustomers.map(cust => {
      const bal = getCustBal(cust.id);
      return `<div class="card customer-card" style="cursor:pointer"
        data-name="${cust.name.toLowerCase()}" data-phone="${(cust.phone || '').toLowerCase()}"
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
  
  // إعادة إنشاء أزرار الترقيم
  const paginationContainer = document.getElementById('customers-pagination');
  if (paginationContainer) {
    createPaginationControls('customers-pagination', customersPaginator, () => {
      renderCustomersPage();
      const kw = document.getElementById('searchCustomerInput')?.value.trim().toLowerCase();
      if (kw) filterCustomersList();
    });
  }
}

/**
 * ترقيم الموردين
 */
let suppliersPaginator = null;

function initSuppliersPagination() {
  suppliersPaginator = new Paginator(S.suppliers, 15);
  renderSuppliersPage();
}

function renderSuppliersPage() {
  if (!suppliersPaginator) {
    initSuppliersPagination();
  } else {
    suppliersPaginator.setItems(S.suppliers);
  }
  
  const currentSuppliers = suppliersPaginator.currentItems;
  const container = document.getElementById('supp-list-cont');
  if (!container) return;
  
  if (!currentSuppliers.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا يوجد موردون</p>';
  } else {
    container.innerHTML = currentSuppliers.map(sup => {
      const bal = getSuppBal(sup.id);
      return `<div class="card supplier-card" style="cursor:pointer"
        data-name="${sup.name.toLowerCase()}" data-phone="${(sup.phone || '').toLowerCase()}"
        onclick="openSuppDetail(${sup.id})">
        <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:#fef5ec;border-bottom:2px solid #f5cba7">
          <div style="display:flex;align-items:center;gap:9px">
            <span>🚛</span>
            <div>
              <div style="font-weight:800;color:var(--orange)">${escapeHtml(sup.name)}</div>
              <div style="font-size:0.74rem;color:var(--gray)">${escapeHtml(sup.phone || 'لا يوجد هاتف')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="text-align:left">
              <div style="font-size:0.74rem;color:var(--gray)">المستحق</div>
              <div style="font-weight:900;color:${bal > 0 ? 'var(--red)' : 'var(--green)'}">${N(bal)} جنيه</div>
            </div>
            <button class="btn btn-r btn-xs no-print" onclick="event.stopPropagation();delSupplier(${sup.id})">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  
  const paginationContainer = document.getElementById('suppliers-pagination');
  if (paginationContainer) {
    createPaginationControls('suppliers-pagination', suppliersPaginator, () => {
      renderSuppliersPage();
      const kw = document.getElementById('searchSupplierInput')?.value.trim().toLowerCase();
      if (kw) filterSuppliersList();
    });
  }
}

/**
 * ترقيم الفواتير
 */
let invoicesPaginator = null;

function initInvoicesPagination() {
  invoicesPaginator = new Paginator(S.invoices, 10);
  renderInvoicesPage();
}

function renderInvoicesPageWithPagination() {
  if (!invoicesPaginator) {
    initInvoicesPagination();
  } else {
    invoicesPaginator.setItems(S.invoices);
  }
  
  const currentInvoices = invoicesPaginator.currentItems;
  const container = document.getElementById('invoices-cont');
  if (!container) return;
  
  if (!currentInvoices.length) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;padding:32px">لا توجد فواتير</p>';
  } else {
    container.innerHTML = currentInvoices.map(inv => {
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
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:0.83rem">
              <thead><tr style="background:#f0f7f0"><th>الصنف</th><th>الوحدة</th><th>المباع</th><th>الوزن</th><th>الإجمالي</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr style="background:#eafaf1;font-weight:900">
                <td colspan="4" style="text-align:right;padding:5px">إجمالي المبيعات</td>
                <td style="padding:5px">${N(gross)} جنيه</td>
              </tr></tfoot>
            </table>
          </div>
          <div class="netbox"><span>💰 الصافي المستحق للمورد</span><span>${N(net)} جنيه</span></div>
        </div>
      </div>`;
    }).join('');
  }
  
  const paginationContainer = document.getElementById('invoices-pagination');
  if (paginationContainer) {
    createPaginationControls('invoices-pagination', invoicesPaginator, () => {
      renderInvoicesPageWithPagination();
    });
  }
}

// إضافة عناصر الترقيم إلى الـ HTML (يجب أن تُضاف يدوياً أو ديناميكياً)
function addPaginationContainers() {
  // للعملاء
  const custListCont = document.getElementById('cust-list-cont');
  if (custListCont && !document.getElementById('customers-pagination')) {
    const pagDiv = document.createElement('div');
    pagDiv.id = 'customers-pagination';
    pagDiv.className = 'pagination-container';
    custListCont.parentNode.insertBefore(pagDiv, custListCont.nextSibling);
  }
  // للموردين
  const suppListCont = document.getElementById('supp-list-cont');
  if (suppListCont && !document.getElementById('suppliers-pagination')) {
    const pagDiv = document.createElement('div');
    pagDiv.id = 'suppliers-pagination';
    pagDiv.className = 'pagination-container';
    suppListCont.parentNode.insertBefore(pagDiv, suppListCont.nextSibling);
  }
  // للفواتير
  const invoicesCont = document.getElementById('invoices-cont');
  if (invoicesCont && !document.getElementById('invoices-pagination')) {
    const pagDiv = document.createElement('div');
    pagDiv.id = 'invoices-pagination';
    pagDiv.className = 'pagination-container';
    invoicesCont.parentNode.insertBefore(pagDiv, invoicesCont.nextSibling);
  }
}

// استدعاء إضافة الحاويات عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
  addPaginationContainers();
});

// تصدير للاستخدام العالمي
window.initCustomersPagination = initCustomersPagination;
window.initSuppliersPagination = initSuppliersPagination;
window.initInvoicesPagination = initInvoicesPagination;
window.renderCustomersPage = renderCustomersPage;
window.renderSuppliersPage = renderSuppliersPage;
window.renderInvoicesPageWithPagination = renderInvoicesPageWithPagination;
