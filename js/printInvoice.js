// ===================== printInvoice.js — طباعة فواتير المبيعات للعملاء =====================

/**
 * طباعة فاتورة مبيعات لعميل معين (كل المبيعات غير المسددة أو حسب التاريخ)
 * @param {number} custId - معرف العميل
 * @param {string} filterDate - (اختياري) تاريخ محدد للفواتير
 */
async function printCustomerInvoice(custId, filterDate = null) {
  const customer = S.customers.find(c => c.id == custId);
  if (!customer) {
    alertMsg('العميل غير موجود', 'error');
    return;
  }

  // تجميع المبيعات (الأوامر) من دفتر الأستاذ
  let orders = customer.ledger.filter(entry => entry.type === 'order');
  if (filterDate) {
    orders = orders.filter(entry => entry.date === filterDate);
  }
  
  if (orders.length === 0) {
    alertMsg(`لا توجد فواتير للعميل ${customer.name}`, 'warning');
    return;
  }

  // تجميع تفاصيل المنتجات لكل فاتورة (بحاجة للبحث في سجلات المبيعات)
  // نبني مصفوفة تحتوي على كل بند من بنود الفواتير
  const invoiceItems = [];
  let totalAmount = 0;
  
  for (const order of orders) {
    // البحث عن تفاصيل البضاعة في ترحيلات المبيعات (salesLog) أو في tarhilLog
    // نبحث في جميع المنتجات عن مبيعات لها نفس التاريخ ونفس العميل
    for (const product of S.products) {
      for (const sale of product.salesLog) {
        if (sale.custId == custId && sale.date === order.date) {
          const item = {
            date: sale.date,
            productName: product.name,
            quantity: sale.qty || 0,
            weight: sale.weight || 0,
            unit: product.unit,
            price: sale.price,
            total: sale.total
          };
          invoiceItems.push(item);
          totalAmount += sale.total;
        }
      }
    }
    // أيضاً نبحث في tarhilLog إذا كان هناك ترحيلات لنفس التاريخ
    const tarhilEntries = S.tarhilLog[order.date]?.[custId];
    if (tarhilEntries) {
      for (const entry of tarhilEntries) {
        const item = {
          date: order.date,
          productName: entry.productName,
          quantity: entry.qty || 0,
          weight: entry.weight || 0,
          unit: entry.unit || 'وحدة',
          price: entry.price,
          total: entry.total
        };
        // نتجنب الإضافة المكررة (قد تكون موجودة بالفعل من salesLog)
        const exists = invoiceItems.some(i => i.productName === item.productName && i.date === item.date && i.total === item.total);
        if (!exists) {
          invoiceItems.push(item);
          totalAmount += item.total;
        }
      }
    }
  }

  if (invoiceItems.length === 0) {
    alertMsg('لا توجد تفاصيل للفواتير', 'warning');
    return;
  }

  // إنشاء نافذة الطباعة
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alertMsg('الرجاء السماح للنوافذ المنبثقة', 'error');
    return;
  }

  const shopName = currentUser?.user_metadata?.shop_name || 'نظام المحل';
  const dateStr = filterDate ? `بتاريخ ${filterDate}` : 'كشف حساب';
  const title = `فاتورة مبيعات - ${customer.name} ${dateStr}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
          background: #fff;
          padding: 20px;
          color: #1e2a1e;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 0 10px rgba(0,0,0,0.05);
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #1a6b38;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header h1 { color: #1a6b38; font-size: 1.6rem; }
        .header p { color: #555; font-size: 0.85rem; }
        .customer-info {
          background: #f4f9f4;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .customer-info div { font-size: 0.9rem; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 8px 6px;
          text-align: center;
          font-size: 0.85rem;
        }
        th {
          background: #eafaf1;
          font-weight: 800;
        }
        .totals {
          text-align: left;
          font-size: 1rem;
          font-weight: bold;
          border-top: 2px solid #1a6b38;
          padding-top: 10px;
          margin-top: 10px;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 0.75rem;
          color: #777;
          border-top: 1px dashed #ccc;
          padding-top: 15px;
        }
        @media print {
          body { padding: 0; }
          .invoice-container { box-shadow: none; border: none; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>🥦 ${shopName}</h1>
          <p>نظام إدارة المحل المتكامل</p>
        </div>
        <div class="customer-info">
          <div><strong>العميل:</strong> ${escapeHtml(customer.name)}</div>
          <div><strong>الهاتف:</strong> ${escapeHtml(customer.phone || 'غير مسجل')}</div>
          <div><strong>التاريخ:</strong> ${S.date}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>الصنف</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة</th><th>الإجمالي</th>
             </tr>
          </thead>
          <tbody>
            ${invoiceItems.map((item, idx) => `
              <tr>
                <td>${idx+1}</td>
                <td>${escapeHtml(item.productName)}</td>
                <td>${item.weight > 0 ? item.weight + ' كجم' : (item.quantity || '-')}</td>
                <td>${item.weight > 0 ? 'كجم' : escapeHtml(item.unit)}</td>
                <td>${N(item.price)} جنيه</td>
                <td>${N(item.total)} جنيه</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          إجمالي الفاتورة: ${N(totalAmount)} جنيه
        </div>
        <div class="footer">
          هذه الفاتورة صادرة من نظام المحل الإلكتروني · شكراً لتعاملكم
        </div>
      </div>
      <div class="no-print" style="text-align:center; margin-top:20px;">
        <button onclick="window.print();" style="padding:6px 12px;">🖨️ طباعة</button>
        <button onclick="window.close();" style="padding:6px 12px;">❌ إغلاق</button>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * إضافة زر طباعة الفاتورة في صفحة تفاصيل العميل
 * يتم استدعاؤها داخل openCustDetail لتظهر زر الطباعة
 */
function addPrintInvoiceButtonToCustomerDetail() {
  const existingBtn = document.getElementById('printInvoiceBtn');
  if (existingBtn) return;
  
  const headerDiv = document.querySelector('#cust-detail-view .ch.b');
  if (headerDiv) {
    const printBtn = document.createElement('button');
    printBtn.id = 'printInvoiceBtn';
    printBtn.innerHTML = '🖨️ فاتورة';
    printBtn.className = 'btn btn-b btn-sm';
    printBtn.style.marginRight = '8px';
    printBtn.onclick = () => {
      const custName = document.getElementById('cd-name')?.textContent;
      const customer = S.customers.find(c => c.name === custName);
      if (customer) printCustomerInvoice(customer.id);
      else alertMsg('لم يتم العثور على العميل', 'error');
    };
    headerDiv.appendChild(printBtn);
  }
}

// تعديل دالة openCustDetail الأصلية لإضافة الزر (يتم استدعاؤها مرة واحدة)
// ولكن نظرًا لأن openCustDetail موجودة في customers.js، سنقوم بتوسيعها بطريقة غير تدخلية
// باستخدام Proxy أو إعادة تعريف الدالة بعد تحميلها. الأسهل: إضافة سطر في نهاية ملف customers.js
// أو هنا نقوم بالاستماع لحدث عرض تفاصيل العميل.
// نقوم بإنشاء MutationObserver لمراقبة ظهور div التفاصيل وإضافة الزر.

function setupPrintInvoiceButton() {
  const observer = new MutationObserver(() => {
    const detailView = document.getElementById('cust-detail-view');
    if (detailView && detailView.style.display === 'block') {
      setTimeout(addPrintInvoiceButtonToCustomerDetail, 50);
    }
  });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });
}

// بدء المراقبة عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', setupPrintInvoiceButton);

// تصدير الدوال للاستخدام العام
window.printCustomerInvoice = printCustomerInvoice;
