// ===================== reports.js — تقارير رسومية، إحصاءات، وتحليلات متقدمة =====================

/**
 * تهيئة مكتبة Chart.js (يجب تضمينها في index.html)
 * <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
 */

let salesChart = null;
let profitChart = null;
let topCustomersChart = null;

/**
 * الحصول على بيانات المبيعات اليومية لآخر 30 يومًا
 */
function getDailySalesData(days = 30) {
  const salesByDate = {};
  const today = new Date();
  
  // تهيئة آخر 30 يومًا بصفر
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toLocaleDateString('ar-EG');
    salesByDate[dateStr] = 0;
  }
  
  // جمع المبيعات من سجلات المنتجات
  for (const product of S.products) {
    for (const sale of product.salesLog) {
      if (salesByDate.hasOwnProperty(sale.date)) {
        salesByDate[sale.date] += sale.total;
      }
    }
  }
  
  // ترتيب التواريخ تصاعدياً
  const sortedDates = Object.keys(salesByDate).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA - dateB;
  });
  
  const values = sortedDates.map(date => salesByDate[date]);
  return { dates: sortedDates, values };
}

/**
 * الحصول على بيانات الأرباح (المبيعات - المصروفات) لآخر 30 يومًا
 */
function getDailyProfitData(days = 30) {
  const profitByDate = {};
  const expensesByDate = {};
  const today = new Date();
  
  // تهيئة آخر 30 يومًا بصفر
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toLocaleDateString('ar-EG');
    profitByDate[dateStr] = 0;
    expensesByDate[dateStr] = 0;
  }
  
  // جمع المبيعات
  for (const product of S.products) {
    for (const sale of product.salesLog) {
      if (profitByDate.hasOwnProperty(sale.date)) {
        profitByDate[sale.date] += sale.total;
      }
    }
  }
  
  // جمع المصروفات
  for (const expense of S.expenses) {
    if (expensesByDate.hasOwnProperty(expense.date)) {
      expensesByDate[expense.date] += expense.amount;
    }
  }
  
  // حساب الربح = المبيعات - المصروفات
  const sortedDates = Object.keys(profitByDate).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA - dateB;
  });
  
  const salesValues = sortedDates.map(date => profitByDate[date]);
  const expensesValues = sortedDates.map(date => expensesByDate[date]);
  const profitValues = sortedDates.map(date => profitByDate[date] - expensesByDate[date]);
  
  return { dates: sortedDates, sales: salesValues, expenses: expensesValues, profit: profitValues };
}

/**
 * الحصول على أفضل 10 عملاء (من حيث إجمالي المشتريات)
 */
function getTopCustomers(limit = 10) {
  const customerTotals = {};
  
  for (const customer of S.customers) {
    let total = 0;
    for (const entry of customer.ledger) {
      if (entry.type === 'order') {
        total += entry.amount;
      }
    }
    if (total > 0) {
      customerTotals[customer.name] = total;
    }
  }
  
  const sorted = Object.entries(customerTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return {
    names: sorted.map(item => item[0]),
    totals: sorted.map(item => item[1])
  };
}

/**
 * الحصول على أفضل 10 موردين (من حيث إجمالي المبيعات عبرهم)
 */
function getTopSuppliers(limit = 10) {
  const supplierTotals = {};
  
  for (const product of S.products) {
    const supplier = S.suppliers.find(s => s.id == product.supplierId);
    if (!supplier) continue;
    const totalSales = product.salesLog.reduce((sum, sale) => sum + sale.total, 0);
    if (totalSales > 0) {
      supplierTotals[supplier.name] = (supplierTotals[supplier.name] || 0) + totalSales;
    }
  }
  
  const sorted = Object.entries(supplierTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return {
    names: sorted.map(item => item[0]),
    totals: sorted.map(item => item[1])
  };
}

/**
 * رسم مخطط المبيعات اليومية
 * @param {string} canvasId - معرف عنصر canvas
 */
function renderSalesChart(canvasId = 'salesChart') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const { dates, values } = getDailySalesData(30);
  
  if (salesChart) salesChart.destroy();
  
  salesChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'المبيعات (جنيه)',
        data: values,
        borderColor: '#1a6b38',
        backgroundColor: 'rgba(26, 107, 56, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toLocaleString('ar-EG')} جنيه` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (val) => val.toLocaleString('ar-EG') } }
      }
    }
  });
}

/**
 * رسم مخطط الأرباح (المبيعات، المصروفات، صافي الربح)
 */
function renderProfitChart(canvasId = 'profitChart') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const { dates, sales, expenses, profit } = getDailyProfitData(30);
  
  if (profitChart) profitChart.destroy();
  
  profitChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'المبيعات',
          data: sales,
          backgroundColor: '#27ae60',
          borderRadius: 4
        },
        {
          label: 'المصروفات',
          data: expenses,
          backgroundColor: '#c0392b',
          borderRadius: 4
        },
        {
          label: 'صافي الربح',
          data: profit,
          type: 'line',
          borderColor: '#f39c12',
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString('ar-EG')} جنيه` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (val) => val.toLocaleString('ar-EG') } }
      }
    }
  });
}

/**
 * رسم مخطط أفضل العملاء
 */
function renderTopCustomersChart(canvasId = 'topCustomersChart') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const { names, totals } = getTopCustomers(10);
  
  if (topCustomersChart) topCustomersChart.destroy();
  
  topCustomersChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{
        label: 'إجمالي المشتريات (جنيه)',
        data: totals,
        backgroundColor: '#1a5276',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        tooltip: { callbacks: { label: (ctx) => `${ctx.raw.toLocaleString('ar-EG')} جنيه` } }
      }
    }
  });
}

/**
 * عرض لوحة التحليل والإحصائيات السريعة
 */
function showAnalyticsDashboard() {
  // إنشاء مودال أو صفحة مؤقتة لعرض التحليلات
  let modal = document.getElementById('analytics-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'analytics-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" style="max-width: 900px; width: 90%;">
        <button class="cx" onclick="closeModal('analytics-modal')">✕</button>
        <h3>📊 لوحة التحليلات والإحصائيات</h3>
        <div style="margin-top: 15px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="card" style="text-align: center; padding: 10px;">
              <div style="font-size: 1.8rem;">💰</div>
              <div style="font-size: 0.8rem; color: gray;">إجمالي المبيعات</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: var(--green);" id="stat-total-sales">-</div>
            </div>
            <div class="card" style="text-align: center; padding: 10px;">
              <div style="font-size: 1.8rem;">📉</div>
              <div style="font-size: 0.8rem; color: gray;">إجمالي المصروفات</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: var(--red);" id="stat-total-expenses">-</div>
            </div>
            <div class="card" style="text-align: center; padding: 10px;">
              <div style="font-size: 1.8rem;">📈</div>
              <div style="font-size: 0.8rem; color: gray;">صافي الربح</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: var(--orange);" id="stat-net-profit">-</div>
            </div>
            <div class="card" style="text-align: center; padding: 10px;">
              <div style="font-size: 1.8rem;">👥</div>
              <div style="font-size: 0.8rem; color: gray;">إجمالي العملاء</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: var(--blue);" id="stat-total-customers">-</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="card"><canvas id="salesChartAnalytics" style="max-height: 250px;"></canvas></div>
            <div class="card"><canvas id="profitChartAnalytics" style="max-height: 250px;"></canvas></div>
            <div class="card" style="grid-column: span 2;"><canvas id="topCustomersChartAnalytics" style="max-height: 300px;"></canvas></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  // حساب الإحصائيات
  let totalSales = 0;
  for (const product of S.products) {
    totalSales += product.salesLog.reduce((s, sale) => s + sale.total, 0);
  }
  const totalExpenses = S.expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalSales - totalExpenses;
  const totalCustomers = S.customers.length;
  
  document.getElementById('stat-total-sales').textContent = currency(totalSales);
  document.getElementById('stat-total-expenses').textContent = currency(totalExpenses);
  document.getElementById('stat-net-profit').textContent = currency(netProfit);
  document.getElementById('stat-total-customers').textContent = totalCustomers;
  
  openModal('analytics-modal');
  
  // رسم المخططات داخل المودال (استخدام معرفات مختلفة لتجنب التعارض)
  setTimeout(() => {
    renderSalesChart('salesChartAnalytics');
    renderProfitChart('profitChartAnalytics');
    renderTopCustomersChart('topCustomersChartAnalytics');
  }, 100);
}

// إضافة زر في واجهة المستخدم لفتح التحليلات (يمكن إضافته في أي مكان)
function addAnalyticsButton() {
  const existingBtn = document.getElementById('analytics-btn');
  if (existingBtn) return;
  const header = document.querySelector('.header-top .hright');
  if (header) {
    const btn = document.createElement('button');
    btn.id = 'analytics-btn';
    btn.innerHTML = '📊 تحليلات';
    btn.className = 'btn btn-g btn-sm';
    btn.style.marginRight = '8px';
    btn.onclick = showAnalyticsDashboard;
    header.appendChild(btn);
  }
}

// استدعاء إضافة الزر عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
  addAnalyticsButton();
});

// تصدير للاستخدام العالمي
window.showAnalyticsDashboard = showAnalyticsDashboard;
window.renderSalesChart = renderSalesChart;
window.renderProfitChart = renderProfitChart;
window.renderTopCustomersChart = renderTopCustomersChart;
window.getDailySalesData = getDailySalesData;
window.getDailyProfitData = getDailyProfitData;
window.getTopCustomers = getTopCustomers;
window.getTopSuppliers = getTopSuppliers;
