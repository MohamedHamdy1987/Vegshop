// ===================== renderers/subscription.js — الاشتراك والدفع (معدل) =====================

let selectedPlan = null;
const planAmount = { monthly: 750, yearly: 6000 };

function selectPlan(plan) {
  if (!currentUser) {
    alertMsg('يجب تسجيل الدخول أولاً', 'warning');
    return;
  }
  selectedPlan = plan;
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) paymentForm.style.display = 'block';
  updatePaymentDetails();
}

function updatePaymentDetails() {
  const method = document.getElementById('payment-method').value;
  const detailsDiv = document.getElementById('payment-details');
  if (!detailsDiv) return;
  let html = '';

  if (method === 'vodafone') {
    html = `
      <div class="frow"><label>📱 رقم فودافون كاش</label><input type="text" id="phone" placeholder="01xxxxxxxxx"></div>
      <div class="frow"><label>🔢 رقم العملية</label><input type="text" id="trans_id" placeholder="رقم العملية"></div>
      <div style="background:#fef9e7;padding:10px;border-radius:8px;">⚠️ يرجى تحويل المبلغ إلى 0123456789 (محل الخضار)</div>`;
  } else if (method === 'instapay') {
    html = `
      <div class="frow"><label>🏦 رقم IBAN</label><input type="text" id="iban" placeholder="EG..."></div>
      <div class="frow"><label>🔢 رقم العملية</label><input type="text" id="trans_id" placeholder="رقم العملية"></div>
      <div style="background:#fef9e7;padding:10px;border-radius:8px;">⚠️ التحويل إلى EG123456789 بنك مصر</div>`;
  } else if (method === 'bank') {
    html = `
      <div class="frow"><label>🏦 اسم البنك</label><input type="text" id="bank_name" placeholder="بنك مصر"></div>
      <div class="frow"><label>🔢 رقم الحساب</label><input type="text" id="account_no" placeholder="رقم الحساب"></div>
      <div class="frow"><label>🔢 رقم العملية</label><input type="text" id="trans_id" placeholder="رقم العملية"></div>
      <div style="background:#fef9e7;padding:10px;border-radius:8px;">⚠️ بنك مصر، حساب: 123456789</div>`;
  } else if (method === 'fawry') {
    html = `
      <div class="frow"><label>📱 رقم الهاتف</label><input type="text" id="phone" placeholder="01xxxxxxxxx"></div>
      <div class="frow"><label>🔢 كود الدفع</label><input type="text" id="fawry_code" placeholder="الكود"></div>
      <button class="btn btn-b" onclick="payWithFawry()">💳 الدفع عبر فوري</button>`;
  }

  detailsDiv.innerHTML = html;
}

function payWithFawry() {
  alertMsg('🚧 بوابة فوري قيد التطوير', 'info');
}

async function submitPayment() {
  if (!currentUser) {
    alertMsg('يجب تسجيل الدخول أولاً', 'error');
    return;
  }
  if (!selectedPlan) {
    alertMsg('اختر باقة أولاً', 'warning');
    return;
  }
  
  const method = document.getElementById('payment-method').value;
  const amount = planAmount[selectedPlan];
  const transactionId = document.getElementById('trans_id')?.value.trim() || '';
  let additionalData = {};

  if (method === 'vodafone') {
    additionalData.phone = document.getElementById('phone')?.value.trim() || '';
    if (!additionalData.phone || !transactionId) {
      alertMsg('يرجى إدخال رقم الهاتف ورقم العملية', 'warning');
      return;
    }
    if (!isValidPhone(additionalData.phone)) {
      alertMsg('رقم الهاتف غير صحيح', 'warning');
      return;
    }
  } else if (method === 'instapay') {
    additionalData.iban = document.getElementById('iban')?.value.trim() || '';
    if (!additionalData.iban || !transactionId) {
      alertMsg('يرجى إدخال رقم IBAN ورقم العملية', 'warning');
      return;
    }
  } else if (method === 'bank') {
    additionalData.bank_name = document.getElementById('bank_name')?.value.trim() || '';
    additionalData.account_no = document.getElementById('account_no')?.value.trim() || '';
    if (!additionalData.bank_name || !additionalData.account_no || !transactionId) {
      alertMsg('يرجى إدخال بيانات البنك ورقم العملية', 'warning');
      return;
    }
  } else if (method === 'fawry') {
    // فوري سيتم التعامل معه لاحقاً
    alertMsg('الدفع عبر فوري قيد التطوير', 'info');
    return;
  }

  if (method !== 'fawry' && !transactionId) {
    alertMsg('أدخل رقم العملية', 'warning');
    return;
  }

  const submitBtn = document.getElementById('submit-payment-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإرسال...';
  }

  try {
    const { error } = await sb.from('payments').insert({
      user_id: currentUser.id,
      amount,
      method,
      transaction_id: transactionId,
      notes: JSON.stringify(additionalData),
      status: 'pending',
      created_at: new Date().toISOString()
    });

    if (error) throw error;
    
    alertMsg('✅ تم إرسال طلب الدفع بنجاح، سيتم تفعيل الاشتراك بعد التأكيد', 'success');
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) paymentForm.style.display = 'none';
    renderSubscriptionStatus();
  } catch (e) {
    AppError.log('submitPayment', e, true);
    alertMsg('فشل إرسال طلب الدفع: ' + e.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '✅ تأكيد الدفع';
    }
  }
}

function renderSubscriptionStatus() {
  const meta = currentUser?.user_metadata;
  const div = document.getElementById('sub-status');
  if (!div) return;

  if (meta?.subscription === 'active') {
    const ends = new Date(meta.subscription_ends);
    div.innerHTML = `<div style="background:#e8f5e9;padding:12px;border-radius:8px;">✅ اشتراكك نشط حتى ${ends.toLocaleDateString('ar-EG')}</div>`;
  } else if (meta?.subscription === 'trial') {
    const ends = new Date(meta.trial_ends);
    const daysLeft = Math.ceil((ends - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      div.innerHTML = `<div style="background:#fff3e0;padding:12px;border-radius:8px;">⏳ تجربة مجانية: متبقي ${daysLeft} يوم.
        <a href="#" onclick="document.getElementById('payment-form').scrollIntoView({behavior:'smooth'}); return false;">اشترك الآن</a></div>`;
    } else {
      div.innerHTML = `<div style="background:#ffebee;padding:12px;border-radius:8px;">⚠️ انتهت الفترة التجريبية. يرجى الاشتراك للمتابعة.</div>`;
    }
  } else {
    div.innerHTML = `<div style="background:#ffebee;padding:12px;border-radius:8px;">⚠️ اشتراكك منتهٍ. يرجى تجديد الاشتراك.</div>`;
  }
}

// إضافة زر تأكيد الدفع في الـ DOM إذا لم يكن موجوداً
function ensureSubmitButton() {
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm && !document.getElementById('submit-payment-btn')) {
    const btn = document.createElement('button');
    btn.id = 'submit-payment-btn';
    btn.className = 'btn btn-g';
    btn.textContent = '✅ تأكيد الدفع';
    btn.style.width = '100%';
    btn.style.marginTop = '15px';
    btn.onclick = submitPayment;
    paymentForm.appendChild(btn);
  }
}

window.addEventListener('DOMContentLoaded', ensureSubmitButton);

// تصدير الدوال
window.selectPlan = selectPlan;
window.updatePaymentDetails = updatePaymentDetails;
window.payWithFawry = payWithFawry;
window.submitPayment = submitPayment;
window.renderSubscriptionStatus = renderSubscriptionStatus;
