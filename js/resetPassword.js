// ===================== resetPassword.js — إعادة تعيين كلمة المرور وإدارة تأكيد البريد الإلكتروني =====================

/**
 * التحقق من وجود رمز إعادة التعيين في URL (لصفحة منفصلة)
 * يمكن استخدام هذه الدالة في صفحة reset-password.html
 */
function checkResetToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const type = urlParams.get('type');
  
  if (accessToken && refreshToken && type === 'recovery') {
    // تخزين الرموز مؤقتاً
    sessionStorage.setItem('reset_access_token', accessToken);
    sessionStorage.setItem('reset_refresh_token', refreshToken);
    showResetPasswordForm();
    return true;
  }
  return false;
}

/**
 * عرض نموذج إعادة تعيين كلمة المرور
 */
function showResetPasswordForm() {
  // إنشاء النموذج إذا لم يكن موجوداً
  let formContainer = document.getElementById('reset-password-container');
  if (!formContainer) {
    formContainer = document.createElement('div');
    formContainer.id = 'reset-password-container';
    formContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    formContainer.innerHTML = `
      <div style="background: white; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; text-align: center;">
        <h3 style="margin-bottom: 16px;">🔐 إعادة تعيين كلمة المرور</h3>
        <p style="font-size: 0.85rem; color: #555; margin-bottom: 16px;">أدخل كلمة المرور الجديدة</p>
        <input type="password" id="new-password" placeholder="كلمة المرور الجديدة" style="width: 100%; padding: 10px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px;">
        <input type="password" id="confirm-password" placeholder="تأكيد كلمة المرور" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <button id="reset-pwd-submit" style="background: #1a6b38; color: white; border: none; padding: 10px 20px; border-radius: 8px; width: 100%; font-weight: bold;">تحديث كلمة المرور</button>
        <button id="reset-pwd-cancel" style="background: #ccc; margin-top: 10px; border: none; padding: 8px; border-radius: 8px; width: 100%;">إلغاء</button>
      </div>
    `;
    document.body.appendChild(formContainer);
    
    document.getElementById('reset-pwd-submit').onclick = async () => {
      const newPass = document.getElementById('new-password').value;
      const confirmPass = document.getElementById('confirm-password').value;
      
      if (!newPass || newPass.length < 8) {
        alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        return;
      }
      if (newPass !== confirmPass) {
        alert('كلمة المرور غير متطابقة');
        return;
      }
      
      const accessToken = sessionStorage.getItem('reset_access_token');
      const refreshToken = sessionStorage.getItem('reset_refresh_token');
      
      if (!accessToken) {
        alert('رمز إعادة التعيين غير صالح. يرجى طلب رابط جديد.');
        return;
      }
      
      try {
        // تعيين الجلسة باستخدام الرموز
        const { error: sessionError } = await sb.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (sessionError) throw sessionError;
        
        // تحديث كلمة المرور
        const { error } = await sb.auth.updateUser({ password: newPass });
        if (error) throw error;
        
        alert('تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.');
        sessionStorage.removeItem('reset_access_token');
        sessionStorage.removeItem('reset_refresh_token');
        formContainer.remove();
        window.location.href = '/';
      } catch (e) {
        AppError.log('resetPassword', e);
        alert('فشل تحديث كلمة المرور: ' + e.message);
      }
    };
    
    document.getElementById('reset-pwd-cancel').onclick = () => {
      formContainer.remove();
      window.location.href = '/';
    };
  }
}

/**
 * إرسال رابط إعادة تعيين كلمة المرور (تم تضمينه في auth.js، ولكن نضيفه هنا كدالة مستقلة)
 */
async function requestPasswordReset() {
  const email = prompt('أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور:');
  if (!email) return;
  if (!isValidEmail(email)) {
    alert('بريد إلكتروني غير صحيح');
    return;
  }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
    if (error) throw error;
    alert('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. تحقق من صندوق الوارد (والرسائل غير المرغوب فيها).');
  } catch (e) {
    AppError.log('requestPasswordReset', e);
    alert('حدث خطأ: ' + e.message);
  }
}

/**
 * تأكيد البريد الإلكتروني (معالجة رابط التأكيد)
 */
async function confirmEmail() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('confirmation_token');
  const type = urlParams.get('type');
  
  if (token && type === 'signup') {
    try {
      const { error } = await sb.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      if (error) throw error;
      alert('تم تأكيد بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول.');
      window.location.href = '/';
    } catch (e) {
      AppError.log('confirmEmail', e);
      alert('فشل تأكيد البريد: ' + e.message);
    }
    return true;
  }
  return false;
}

// التنفيذ التلقائي عند تحميل الصفحة (إذا كانت صفحة منفصلة أو الصفحة الرئيسية)
window.addEventListener('DOMContentLoaded', () => {
  // التحقق من رابط إعادة التعيين
  if (checkResetToken()) return;
  // التحقق من رابط تأكيد البريد
  if (confirmEmail()) return;
});

// تصدير للاستخدام العام (إذا احتاجها مكان آخر)
window.requestPasswordReset = requestPasswordReset;
window.checkResetToken = checkResetToken;
window.confirmEmail = confirmEmail;
