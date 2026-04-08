// ===================== export.js — تصدير واستيراد البيانات، النسخ الاحتياطي =====================

/**
 * تصدير جميع البيانات إلى ملف JSON
 */
function exportDataToFile() {
  try {
    const data = {
      version: S.version || 1,
      exportedAt: new Date().toISOString(),
      shopName: currentUser?.user_metadata?.shop_name || 'محل غير مسجل',
      email: currentUser?.email || 'unknown',
      state: deepClone(S)
    };
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${data.shopName}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('تم تصدير البيانات بنجاح', 'success');
    logExportEvent('export', data.shopName);
  } catch (e) {
    AppError.log('exportDataToFile', e, true);
    showToast('فشل تصدير البيانات', 'error');
  }
}

/**
 * استيراد البيانات من ملف JSON (دمج أو استبدال)
 * @param {boolean} replace - true: استبدال بالكامل، false: دمج مع البيانات الحالية
 */
async function importDataFromFile(replace = false) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return reject('No file selected');
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        // التحقق من صحة الملف
        if (!imported.state || !imported.version) {
          throw new Error('ملف غير صالح: لا يحتوي على بيانات النظام');
        }
        
        const confirmMsg = replace 
          ? 'سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة. هل أنت متأكد؟'
          : 'سيتم دمج البيانات المستوردة مع البيانات الحالية (إضافة العناصر الجديدة فقط). متابعة؟';
        
        if (!confirm(confirmMsg)) {
          resolve(false);
          return;
        }
        
        if (replace) {
          // استبدال كامل
          store.replace(imported.state);
          showToast('تم استبدال البيانات بنجاح', 'success');
        } else {
          // دمج ذكي
          const merged = mergeImportedData(store.state, imported.state);
          store.replace(merged);
          showToast('تم دمج البيانات بنجاح', 'success');
        }
        
        logExportEvent('import', imported.shopName || 'unknown');
        renderAll();
        resolve(true);
      } catch (err) {
        AppError.log('importDataFromFile', err, true);
        showToast('فشل استيراد البيانات: ' + err.message, 'error');
        reject(err);
      }
    };
    input.click();
  });
}

/**
 * دمج البيانات المستوردة مع الحالية (إضافة العناصر الجديدة فقط)
 */
function mergeImportedData(current, imported) {
  const merged = deepClone(current);
  
  // قائمة الحقول التي هي مصفوفات (نريد دمجها)
  const arrayFields = ['products', 'customers', 'suppliers', 'invoices', 'collections', 'expenses', 'employees', 'partners', 'shops'];
  
  for (const field of arrayFields) {
    if (Array.isArray(imported[field])) {
      const existingIds = new Set(merged[field].map(item => item.id));
      for (const item of imported[field]) {
        if (!existingIds.has(item.id)) {
          merged[field].push(item);
        }
      }
    }
  }
  
  // دمج كائن الترحيلات
  if (imported.tarhilLog) {
    merged.tarhilLog = { ...merged.tarhilLog, ...imported.tarhilLog };
  }
  
  // تحديث الإصدار والتاريخ
  merged.version = Math.max(merged.version || 1, imported.version || 1) + 1;
  merged.lastUpdated = new Date().toISOString();
  
  return merged;
}

/**
 * إنشاء نسخة احتياطية تلقائية (تُستدعى بشكل دوري)
 */
function autoBackup() {
  try {
    const backupKey = `auto_backup_${currentUser?.id || 'local'}`;
    const backup = {
      timestamp: new Date().toISOString(),
      state: deepClone(S),
      version: S.version
    };
    localStorage.setItem(backupKey, JSON.stringify(backup));
    
    // الاحتفاظ بآخر 5 نسخ احتياطية فقط
    const allBackups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('auto_backup_')) {
        allBackups.push(key);
      }
    }
    if (allBackups.length > 5) {
      const oldest = allBackups.sort().slice(0, allBackups.length - 5);
      oldest.forEach(key => localStorage.removeItem(key));
    }
  } catch (e) {
    AppError.log('autoBackup', e);
  }
}

/**
 * استعادة آخر نسخة احتياطية تلقائية
 */
function restoreLastAutoBackup() {
  const backupKey = `auto_backup_${currentUser?.id || 'local'}`;
  const backupStr = localStorage.getItem(backupKey);
  if (!backupStr) {
    showToast('لا توجد نسخة احتياطية سابقة', 'warning');
    return false;
  }
  try {
    const backup = JSON.parse(backupStr);
    if (confirm(`هل تريد استعادة النسخة الاحتياطية من تاريخ ${new Date(backup.timestamp).toLocaleString('ar-EG')}؟`)) {
      store.replace(backup.state);
      renderAll();
      showToast('تم استعادة النسخة الاحتياطية', 'success');
      return true;
    }
  } catch (e) {
    AppError.log('restoreLastAutoBackup', e, true);
    showToast('فشل استعادة النسخة الاحتياطية', 'error');
  }
  return false;
}

/**
 * تنظيف البيانات القديمة (أكثر من سنة)
 */
function cleanupOldData() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toLocaleDateString('ar-EG');
  
  let cleaned = false;
  
  // تنظيف سجلات المبيعات القديمة (مع الاحتفاظ بالإجماليات)
  for (const product of S.products) {
    const originalLength = product.salesLog.length;
    product.salesLog = product.salesLog.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= oneYearAgo;
    });
    if (originalLength !== product.salesLog.length) cleaned = true;
  }
  
  // تنظيف سجلات العملاء والموردين القديمة
  for (const customer of S.customers) {
    const originalLength = customer.ledger.length;
    customer.ledger = customer.ledger.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= oneYearAgo;
    });
    if (originalLength !== customer.ledger.length) cleaned = true;
  }
  
  for (const supplier of S.suppliers) {
    const originalLength = supplier.ledger.length;
    supplier.ledger = supplier.ledger.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= oneYearAgo;
    });
    if (originalLength !== supplier.ledger.length) cleaned = true;
  }
  
  // تنظيف الترحيلات القديمة (موجود بالفعل في data.js)
  
  if (cleaned) {
    save();
    showToast('تم تنظيف البيانات القديمة (أكثر من سنة)', 'info');
  } else {
    showToast('لا توجد بيانات قديمة للتنظيف', 'info');
  }
}

/**
 * تسجيل أحداث التصدير/الاستيراد
 */
function logExportEvent(type, shopName) {
  const events = JSON.parse(localStorage.getItem('export_events') || '[]');
  events.push({
    timestamp: new Date().toISOString(),
    type, // 'export' or 'import'
    shopName,
    userId: currentUser?.id
  });
  if (events.length > 20) events.shift();
  localStorage.setItem('export_events', JSON.stringify(events));
}

// إنشاء نسخة احتياطية تلقائية كل ساعة
setInterval(() => {
  if (currentUser) autoBackup();
}, 60 * 60 * 1000);

// تصدير للاستخدام العالمي
window.exportDataToFile = exportDataToFile;
window.importDataFromFile = importDataFromFile;
window.restoreLastAutoBackup = restoreLastAutoBackup;
window.cleanupOldData = cleanupOldData;
window.autoBackup = autoBackup;
