// =========================
// DATE & TIME
// =========================
export function today() {
  return new Date().toISOString().split("T")[0];
}

export function nowISO() {
  return new Date().toISOString();
}

export function formatDate(d) {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("ar-EG"); }
  catch { return d; }
}

// =========================
// NUMBERS
// =========================
export function N(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function currency(v) {
  return N(v).toLocaleString("ar-EG") + " جنيه";
}

// =========================
// PAGE NAVIGATION
// =========================
export function showPage(id) {
  document.querySelectorAll(".page").forEach(p => (p.style.display = "none"));
  const el = document.getElementById(id);
  if (el) el.style.display = "block";

  // تفعيل sidebar desktop
  document.querySelectorAll(".sidebar nav button").forEach(btn => {
    btn.classList.remove("active");
    if (btn.getAttribute("onclick")?.includes(`'${id}'`)) btn.classList.add("active");
  });

  // تفعيل mobile bottom nav
  document.querySelectorAll("#mobileNav button[data-page]").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.page === id) {
      btn.classList.add("active");
      // scroll الزر ليكون مرئي
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
}

// =========================
// MODAL SYSTEM
// =========================
export function openModal(title, bodyHTML, footerHTML = "") {
  const modal = document.getElementById("modal");
  if (!modal) return;
  document.getElementById("modalTitle").innerText   = title;
  document.getElementById("modalBody").innerHTML    = bodyHTML;
  document.getElementById("modalFooter").innerHTML  = footerHTML;
  modal.classList.remove("hidden");
}

export function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.classList.add("hidden");
}

// اغلاق المودال بالنقر خارجه
document.addEventListener("click", e => {
  const modal = document.getElementById("modal");
  if (modal && e.target === modal) modal.classList.add("hidden");
});

// =========================
// VALIDATION
// =========================
export function required(val, fieldName = "هذا الحقل") {
  if (!val || String(val).trim() === "") {
    showToastMsg(`${fieldName} مطلوب`);
    return false;
  }
  return true;
}

export function validateNumber(val, fieldName = "القيمة") {
  if (isNaN(Number(val)) || Number(val) < 0) {
    showToastMsg(`${fieldName} يجب أن يكون رقم صحيح`);
    return false;
  }
  return true;
}

function showToastMsg(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.innerText = msg;
  t.style.display = "block";
  t.style.background = "#ef4444";
  setTimeout(() => (t.style.display = "none"), 3000);
}

// =========================
// SAFE JSON
// =========================
export function safeJSON(v, fallback = []) {
  try {
    if (typeof v === "string") return JSON.parse(v);
    return v ?? fallback;
  } catch { return fallback; }
}

// =========================
// ARRAY HELPERS
// =========================
export function sum(arr, field) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((s, x) => s + N(x[field]), 0);
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// =========================
// MISC
// =========================
export function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
