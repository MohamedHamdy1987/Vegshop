// ===================== renderers/admin.js — لوحة تحكم المشرف (معدل) =====================

/**
 * تحديث ظهور تبويب المشرف بناءً على صلاحيات المستخدم
 */
function updateAdminTabVisibility() {
  const isAdminUser = isAdmin(); // من security.js
  const adminTab = document.getElementById('adminTabBtn');
  if (adminTab) {
    adminTab.style.display = isAdminUser ? 'inline-block' : 'none';
  }
  if (isAdminUser) {
    loadAdminPayments();
  }
}

/**
 * تحميل جميع طلبات الدفع للمشرف (مع تأمين إضافي)
 */
async function loadAdminPayments() {
  // التحقق من صلاحية المشرف قبل تحميل البيانات
  if (!isAdmin()) {
    const container = document.getElementById('admin-payments-list');
    if (container) container.innerHTML = '<p style="color:red">غير مصرح بهذه الصفحة</p>';
    logSecurityEvent('unauthorized_admin_access', { action: 'loadAdminPayments', user: currentUser?.email });
    return;
  }
  
  const container = document.getElementById('admin-payments-list');
  if (!container) return;
  container.innerHTML = '<div class="loading-spinner">جاري التحميل...</div>';

  try {
    const { data, error } = await sb
      .from('payments')
      .select('*, users:user_id(email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#aaa;padding:24px">لا توجد طلبات دفع حالياً</p>';
      return;
    }

    const methodNames = {
      vodafone: '📱 فودافون كاش',
      instapay: '🏦 إنستاباي',
      bank: '🏧 تحويل بنكي',
      fawry: '💳 فوري'
    };

    let html = `<div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:8px">المستخدم</th>
            <th style="padding:8px">المبلغ</th>
            <th style="padding:8px">الطريقة</th>
            <th style="padding:8px">رقم العملية</th>
            <th style="padding:8px">التفاصيل</th>
            <th style="padding:8px">الحالة</th>
            <th style="padding:8px">الإجراء</th>
           </tr>
        </thead>
        <tbody>`;

    for (const p of data) {
      const userEmail = p.users?.email || p.user_id;
      let details = '';
      try {
        const notes = JSON.parse(p.notes || '{}');
        details = Object.entries(notes).map(([k, v]) => `${k}: ${v}`).join(' | ');
      } catch (e) {
        details = p.notes || '';
      }

      const statusMap = { pending: 'قيد المراجعة', confirmed: 'مؤكد ✅', rejected: 'مرفوض ❌' };
      const statusText = statusMap[p.status] || p.status;
      const statusColor = p.status === 'confirmed' ? '#27ae60' : (p.status === 'rejected' ? '#c0392b' : '#f39c12');
      
      let actionBtns = '';
      if (p.status === 'pending') {
        actionBtns = `
          <button class="btn btn-success btn-sm" onclick="confirmPayment('${p.id}', ${p.amount}, '${p.user_id}')">تأكيد</button>
          <button class="btn btn-danger btn-sm" onclick="rejectPayment('${p.id}')">رفض</button>
        `;
      } else {
        actionBtns = `<button class="btn btn-warning btn-sm" onclick="resetPayment('${p.id}')">إعادة للمراجعة</button>`;
      }

      html += `<tr>
        <td style="padding:8px">${escapeHtml(userEmail)}</td>
        <td style="padding:8px">${N(p.amount)} جنيه</td>
        <td style="padding:8px">${methodNames[p.method] || p.method}</td>
        <td style="padding:8px">${escapeHtml(p.transaction_id || '-')}</td>
        <td style="padding:8px;font-size:12px;">${escapeHtml(details)}</td>
        <td style="padding:8px"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${statusColor}20;color:${statusColor};">${statusText}</span></td>
        <td style="padding:8px">${actionBtns}</td>
      </tr>`;
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
  } catch (e) {
    AppError.log('loadAdminPayments', e, true);
    container.innerHTML = '<p style="color:red">خطأ في تحميل البيانات</p>';
  }
}

/**
 * تأكيد الدفع (مع التحقق من الصلاحية)
 */
async function confirmPayment(paymentId, amount, userId) {
  if (!isAdmin()) {
    alertMsg('غير مصرح بهذه العملية', 'error');
    logSecurityEvent('unauthorized_confirm_payment', { paymentId, userId });
    return;
  }
  
  if (!confirm(`تأكيد دفع مبلغ ${N(amount)} جنيه للمستخدم ${userId}؟`)) return;
  
  try {
    const { error } = await sb
      .from('payments')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', paymentId);
    if (error) throw error;
    
    // تحديث حالة الاشتراك للمستخدم في metadata (يجب أن يتم عبر RPC أو تحديث يدوي)
    // ملاحظة: تحديث user_metadata يحتاج إلى admin key أو edge function
    // سنقوم بتسجيل الحدث فقط، والتحديث اليدوي يتم من Supabase Dashboard
    showToast('✅ تم تأكيد الدفع', 'success');
    loadAdminPayments();
  } catch (e) {
    AppError.log('confirmPayment', e, true);
    alertMsg('فشل تأكيد الدفع', 'error');
  }
}

/**
 * رفض الدفع
 */
async function rejectPayment(paymentId) {
  if (!isAdmin()) {
    alertMsg('غير مصرح بهذه العملية', 'error');
    return;
  }
  
  if (!confirm('رفض هذا الدفع؟')) return;
  
  try {
    const { error } = await sb
      .from('payments')
      .update({ status: 'rejected' })
      .eq('id', paymentId);
    if (error) throw error;
    showToast('تم رفض الدفع', 'warning');
    loadAdminPayments();
  } catch (e) {
    AppError.log('rejectPayment', e, true);
    alertMsg('فشل رفض الدفع', 'error');
  }
}

/**
 * إعادة طلب الدفع إلى حالة المراجعة
 */
async function resetPayment(paymentId) {
  if (!isAdmin()) {
    alertMsg('غير مصرح بهذه العملية', 'error');
    return;
  }
  
  try {
    const { error } = await sb
      .from('payments')
      .update({ status: 'pending', confirmed_at: null })
      .eq('id', paymentId);
    if (error) throw error;
    showToast('تم إعادة الطلب للمراجعة', 'info');
    loadAdminPayments();
  } catch (e) {
    AppError.log('resetPayment', e, true);
    alertMsg('فشل إعادة التعيين', 'error');
  }
}

// تصدير للاستخدام العام
window.updateAdminTabVisibility = updateAdminTabVisibility;
window.loadAdminPayments = loadAdminPayments;
window.confirmPayment = confirmPayment;
window.rejectPayment = rejectPayment;
window.resetPayment = resetPayment;
