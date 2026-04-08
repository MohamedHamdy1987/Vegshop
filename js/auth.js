// ===================== auth.js — تسجيل الدخول، التسجيل، تأكيد البريد، وإعادة تعيين كلمة المرور =====================

function switchAuthTab(tab) {
  const loginBtn = document.querySelector('.auth-tab:first-child');
  const registerBtn = document.querySelector('.auth-tab:last-child');
  if (tab === 'login') {
    loginBtn.classList.add('active');
    registerBtn.classList.remove('active');
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
  } else {
    loginBtn.classList.remove('active');
    registerBtn.classList.add('active');
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  }
  const errEl = document.getElementById('auth-err');
  if (errEl) errEl.classList.remove('show');
}

function showAuthErr(msg) {
  const el = document.getElementById('auth-err');
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
  } else {
    alert(msg);
  }
}

function showAuth() {
  const authScreen = document.getElementById('auth-screen');
  const appEl = document.getElementById('app');
  if (authScreen) authScreen.style.display = 'flex';
  if (appEl) appEl.style.display = 'none';
  // إخفاء أي شاشة تحميل
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) return showAuthErr('أدخل البريد وكلمة المرور');
  if (!isValidEmail(email)) return showAuthErr('بريد إلكتروني غير صحيح');

  const btn = document.getElementById('login-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'جاري الدخول...';

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    
    currentUser = data.user;
    
    // التحقق من تأكيد البريد إذا كانت السياسة تتطلب ذلك
    if (!currentUser.email_confirmed_at) {
      await sb.auth.signOut();
      showAuthErr('يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد.');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }
    
    await loadUserData();
    showApp();
    showToast('تم تسجيل الدخول بنجاح', 'success');
  } catch (e) {
    let msg = 'بريد إلكتروني أو كلمة مرور خاطئة';
    if (e.message.includes('Email not confirmed')) msg = 'البريد غير مؤكد، تحقق من بريدك';
    else if (e.message.includes('network')) msg = 'خطأ في الاتصال، حاول مرة أخرى';
    showAuthErr(msg);
    AppError.log('doLogin', e);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function doRegister() {
  const shop = document.getElementById('reg-shop').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  if (!shop || !email || !pass) return showAuthErr('أكمل جميع البيانات');
  if (pass !== pass2) return showAuthErr('كلمة المرور غير متطابقة');
  if (pass.length < 8) return showAuthErr('كلمة المرور أقل من ٨ أحرف');
  if (!isValidEmail(email)) return showAuthErr('بريد إلكتروني غير صحيح');

  const btn = document.getElementById('reg-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'جاري الإنشاء...';

  try {
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          shop_name: shop,
          subscription: 'trial',
          trial_ends: trialEnds,
          role: 'user'
        },
        emailRedirectTo: window.location.origin
      }
    });
    if (error) throw error;
    
    currentUser = data.user;
    showToast('تم إنشاء الحساب بنجاح. يرجى تأكيد بريدك الإلكتروني.', 'success');
    // لا ندخل التطبيق مباشرة حتى يؤكد البريد
    showAuth();
  } catch (e) {
    let msg = 'حدث خطأ: ' + (e.message || 'تحقق من الاتصال');
    if (e.message.includes('already registered')) msg = 'هذا البريد مسجّل بالفعل، جرّب تسجيل الدخول';
    showAuthErr(msg);
    AppError.log('doRegister', e);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function doLogout() {
  try {
    await sb.auth.signOut();
  } catch (e) {
    AppError.log('doLogout', e);
  }
  currentUser = null;
  closeModal('user-modal');
  // إعادة تعيين الحالة المحلية
  store.init();
  showAuth();
  showToast('تم تسجيل الخروج', 'info');
}

function checkTrial() {
  if (!currentUser) return;
  const banner = document.getElementById('trial-banner');
  const text = document.getElementById('trial-text');
  if (!banner || !text) return;
  const meta = currentUser.user_metadata;
  if (meta?.subscription === 'trial') {
    const ends = new Date(meta.trial_ends || Date.now() + 14 * 24 * 60 * 60 * 1000);
    const days = Math.ceil((ends - Date.now()) / (1000 * 60 * 60 * 24));
    if (days > 0) {
      banner.style.display = 'block';
      text.textContent = `متبقي ${days} يوم من التجربة المجانية`;
    } else {
      banner.style.display = 'none';
      // إظهار تنبيه انتهاء التجربة
      if (!localStorage.getItem('trial_alert_shown')) {
        showToast('انتهت الفترة التجريبية، يرجى الاشتراك للمتابعة', 'warning');
        localStorage.setItem('trial_alert_shown', 'true');
      }
    }
  } else {
    banner.style.display = 'none';
  }
}

// إعادة تعيين كلمة المرور
async function sendResetPasswordEmail() {
  const email = prompt('أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور:');
  if (!email || !isValidEmail(email)) {
    alert('بريد إلكتروني غير صحيح');
    return;
  }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
    if (error) throw error;
    alert('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني');
  } catch (e) {
    AppError.log('resetPassword', e);
    alert('حدث خطأ: ' + e.message);
  }
}

// إضافة زر إعادة تعيين كلمة المرور في واجهة المصادقة (يُستدعى بعد تحميل DOM)
function addResetPasswordLink() {
  const loginForm = document.getElementById('login-form');
  if (loginForm && !document.getElementById('reset-pwd-link')) {
    const link = document.createElement('p');
    link.id = 'reset-pwd-link';
    link.style.cssText = 'text-align:center;margin-top:10px;font-size:0.75rem;';
    link.innerHTML = '<a href="#" onclick="sendResetPasswordEmail(); return false;">نسيت كلمة المرور؟</a>';
    loginForm.appendChild(link);
  }
}

// تحديث واجهة المستخدم بعد تسجيل الدخول
function showApp() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';
  const appEl = document.getElementById('app');
  const authScreen = document.getElementById('auth-screen');
  if (appEl) appEl.style.display = 'block';
  if (authScreen) authScreen.style.display = 'none';

  if (currentUser) {
    const emailBadge = document.getElementById('user-email-badge');
    if (emailBadge) emailBadge.textContent = currentUser.email.split('@')[0];
    const meta = currentUser.user_metadata;
    const shopHeader = document.getElementById('shop-name-header');
    if (shopHeader && meta?.shop_name) shopHeader.textContent = meta.shop_name;
    checkTrial();
    updateAdminTabVisibility();
    renderSubscriptionStatus();
  } else {
    const shopHeader = document.getElementById('shop-name-header');
    if (shopHeader) shopHeader.textContent = 'نظام المحل (محلي)';
  }

  updateDates();
  renderAll();
}

// استدعاء عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
  addResetPasswordLink();
});
