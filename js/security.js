// ===================== security.js — إدارة الصلاحيات والتحقق من الأمان =====================

/**
 * مستويات الصلاحية
 */
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  TRIAL: 'trial'
};

/**
 * التحقق مما إذا كان المستخدم الحالي هو مشرف
 * @returns {boolean}
 */
function isAdmin() {
  if (!currentUser) return false;
  const role = currentUser.user_metadata?.role;
  return role === ROLES.ADMIN;
}

/**
 * التحقق مما إذا كان المستخدم الحالي لديه اشتراك نشط أو تجربة
 * @returns {boolean}
 */
function hasActiveSubscription() {
  if (!currentUser) return false;
  const meta = currentUser.user_metadata;
  if (meta?.subscription === 'active') return true;
  if (meta?.subscription === 'trial') {
    const trialEnds = new Date(meta.trial_ends);
    return trialEnds > new Date();
  }
  return false;
}

/**
 * الحصول على أيام التجربة المتبقية
 * @returns {number}
 */
function getTrialDaysLeft() {
  if (!currentUser) return 0;
  const meta = currentUser.user_metadata;
  if (meta?.subscription !== 'trial') return 0;
  const trialEnds = new Date(meta.trial_ends);
  const days = Math.ceil((trialEnds - new Date()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

/**
 * التحقق من صلاحية الوصول إلى مورد معين (للـ RLS المحاكي)
 * @param {string} resourceId - معرف المورد (اختياري)
 * @param {string} action - 'read', 'write', 'delete'
 * @returns {boolean}
 */
function canAccess(resourceId = null, action = 'read') {
  // المشرف له كل الصلاحيات
  if (isAdmin()) return true;
  
  // المستخدم العادي له صلاحيات كاملة على بياناته (معرف المستخدم يتم التحقق منه في Supabase RLS)
  // لكن هنا نمنع الوصول إلى لوحة المشرف
  if (action === 'admin') return false;
  
  return true;
}

/**
 * تسجيل محاولة اختراق (للاستخدام في التطوير)
 * @param {string} action 
 * @param {object} details 
 */
function logSecurityEvent(action, details) {
  console.warn(`[SECURITY] ${action}:`, details);
  // يمكن إرسالها إلى خادم مراقبة إذا أردت
  const events = JSON.parse(localStorage.getItem('security_events') || '[]');
  events.push({ timestamp: new Date().toISOString(), action, details });
  if (events.length > 100) events.shift();
  localStorage.setItem('security_events', JSON.stringify(events));
}

/**
 * التحقق من صحة الإدخال (منع XSS و SQL Injection)
 * @param {string} input 
 * @returns {boolean}
 */
function isValidInput(input) {
  if (typeof input !== 'string') return true;
  // منع العلامات الخطرة
  const dangerous = /[<>{}[\]\\;`]/g;
  return !dangerous.test(input);
}

/**
 * تنظيف الإدخال للاستخدام الآمن
 * @param {string} input 
 * @returns {string}
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '');
}

/**
 * التحقق من صلاحية تنفيذ عملية حساسة (مثل تأكيد الدفع)
 * يجب استدعاؤها من واجهة المشرف فقط
 * @param {Function} callback 
 */
async function requireAdmin(callback) {
  if (!isAdmin()) {
    logSecurityEvent('unauthorized_admin_access', { user: currentUser?.email, callback: callback.name });
    alertMsg('غير مصرح بهذه العملية', 'error');
    return false;
  }
  try {
    await callback();
    return true;
  } catch (e) {
    AppError.log('requireAdmin', e);
    alertMsg('حدث خطأ', 'error');
    return false;
  }
}

/**
 * تحديث واجهة المستخدم بناءً على الصلاحيات (إظهار/إخفاء عناصر المشرف)
 */
function updateUIByPermissions() {
  const adminElements = document.querySelectorAll('.admin-only');
  const isAdminUser = isAdmin();
  for (const el of adminElements) {
    el.style.display = isAdminUser ? '' : 'none';
  }
  // إظهار تبويب المشرف إذا كان المستخدم مشرفًا
  const adminTab = document.getElementById('adminTabBtn');
  if (adminTab) adminTab.style.display = isAdminUser ? 'inline-block' : 'none';
}

/**
 * التحقق من أن المستخدم الحالي هو نفس صاحب البيانات (للاستخدام في العمليات الحساسة)
 * @param {string} userId 
 * @returns {boolean}
 */
function isOwner(userId) {
  if (!currentUser) return false;
  return currentUser.id === userId;
}

// مراقبة أي محاولات لتعديل الـ DOM بشكل خطير (اختياري)
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute && node.hasAttribute('onclick')) {
            const onclick = node.getAttribute('onclick');
            if (onclick && (onclick.includes('eval') || onclick.includes('document.write'))) {
              logSecurityEvent('dangerous_onclick', { onclick });
              node.removeAttribute('onclick');
            }
          }
        }
      }
    }
  });
  // نبدأ المراقبة بعد تحميل الصفحة
  window.addEventListener('load', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
