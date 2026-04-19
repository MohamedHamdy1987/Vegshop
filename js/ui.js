import { openModal, closeModal } from "./utils.js";

// =========================
// TOAST
// =========================
let _toastTimer = null;

export function showToast(message, success = true, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = message;
  toast.style.display = "block";
  toast.style.background = success ? "#059669" : "#dc2626";
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => (toast.style.display = "none"), duration);
}

// =========================
// CONFIRM MODAL
// =========================
export function confirmModal(text, onConfirm) {
  openModal(
    "⚠️ تأكيد",
    `<p style="margin:8px 0;font-size:15px;">${text}</p>`,
    `<button class="btn btn-danger" id="confirmYes">تأكيد</button>
     <button class="btn" onclick="closeModal()" style="background:#f3f4f6;">إلغاء</button>`
  );
  setTimeout(() => {
    const btn = document.getElementById("confirmYes");
    if (btn) btn.onclick = () => { closeModal(); onConfirm(); };
  }, 50);
}

// =========================
// EMPTY STATE
// =========================
export function emptyState(message = "لا يوجد بيانات") {
  return `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <p>${message}</p>
    </div>`;
}

// =========================
// ERROR VIEW
// =========================
export function errorView(message = "حدث خطأ") {
  return `<div class="card" style="text-align:center;color:var(--danger);">
    <p>⚠️ ${message}</p>
  </div>`;
}

// =========================
// BUTTON LOADING STATE
// =========================
export function setButtonLoading(btn, loading = true) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerText;
    btn.innerText = "جارى...";
    btn.disabled = true;
  } else {
    btn.innerText = btn.dataset.originalText || "حفظ";
    btn.disabled = false;
  }
}

// =========================
// STATUS BADGE
// =========================
export function statusBadge(status) {
  const map = {
    approved: `<span class="badge badge-success">✅ مفعّل</span>`,
    pending:  `<span class="badge badge-warning">⏳ قيد المراجعة</span>`,
    rejected: `<span class="badge badge-danger">❌ مرفوض</span>`,
  };
  return map[status] || `<span class="badge badge-muted">${status}</span>`;
}
