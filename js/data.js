// =========================
// SUPABASE INIT
// =========================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qlixwdomshvocerxpamy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaXh3ZG9tc2h2b2NlcnhwYW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzc3MTMsImV4cCI6MjA5MjAxMzcxM30.PFSAQ4J6WBLPHiTpgED7l4JiK4jmhL82MQFuJogwZhs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================
// GLOBAL STATE
// =========================
export let currentUser = null;

export const DB = {
  customers:   [],
  suppliers:   [],
  products:    [],
  invoices:    [],
  collections: [],
  expenses:    [],
  employees:   [],
  partners:    [],
  shops:       [],
  tarhil_log:  [],
  payments:    []
};

// =========================
// SYNC STATUS UI
// =========================
export function setSyncStatus(msg, ok = true) {
  const el = document.getElementById("syncText");
  if (!el) return;
  el.innerText = msg;
  el.style.color = ok ? "#059669" : "#dc2626";
}

// =========================
// INIT USER
// =========================
export async function initUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) { currentUser = null; return null; }
  currentUser = data.user || null;
  return currentUser;
}

// =========================
// LOAD ALL DATA
// =========================
export async function loadAllData() {
  try {
    setSyncStatus("جارى تحميل البيانات...");
    await initUser();
    if (!currentUser) return;

    const tables = Object.keys(DB);

    // تحميل كل الجداول بشكل متوازي
    const results = await Promise.all(
      tables.map(table =>
        supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
      )
    );

    results.forEach((res, i) => {
      if (res.error) {
        console.warn(`[DB] خطأ في جدول "${tables[i]}":`, res.error.message);
        return;
      }
      DB[tables[i]] = res.data || [];
    });

    setSyncStatus("تم التحميل ✓");
  } catch (err) {
    console.error("[loadAllData]", err);
    setSyncStatus("فشل التحميل", false);
  }
}

// =========================
// GENERIC CRUD
// =========================
export async function dbInsert(table, data) {
  try {
    setSyncStatus("جارى الحفظ...");
    const payload = Array.isArray(data) ? data : [data];
    const { error } = await supabase.from(table).insert(payload);
    if (error) throw error;
    setSyncStatus("تم الحفظ ✓");
    return true;
  } catch (err) {
    console.error(`[insert:${table}]`, err.message);
    setSyncStatus("فشل الحفظ", false);
    return false;
  }
}

export async function dbUpdate(table, id, data) {
  try {
    setSyncStatus("جارى التحديث...");
    const { error } = await supabase.from(table).update(data).eq("id", id);
    if (error) throw error;
    setSyncStatus("تم التحديث ✓");
    return true;
  } catch (err) {
    console.error(`[update:${table}]`, err.message);
    setSyncStatus("فشل التحديث", false);
    return false;
  }
}

export async function dbDelete(table, id) {
  try {
    setSyncStatus("جارى الحذف...");
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    setSyncStatus("تم الحذف ✓");
    return true;
  } catch (err) {
    console.error(`[delete:${table}]`, err.message);
    setSyncStatus("فشل الحذف", false);
    return false;
  }
}

// =========================
// LEDGER HELPERS
// =========================
export async function appendToLedger(table, recordId, entry) {
  try {
    // نجيب السجل الحالي
    const { data, error } = await supabase
      .from(table)
      .select("ledger")
      .eq("id", recordId)
      .single();
    if (error) throw error;
    const ledger = Array.isArray(data.ledger) ? data.ledger : [];
    ledger.push({ ...entry, date: entry.date || new Date().toISOString() });
    return await dbUpdate(table, recordId, { ledger });
  } catch (err) {
    console.error(`[appendToLedger:${table}]`, err.message);
    return false;
  }
}

// shorthand
export const updateCustomerLedger = (id, entry) => appendToLedger("customers", id, entry);
export const updateSupplierLedger = (id, entry) => appendToLedger("suppliers", id, entry);

// =========================
// PRODUCT HELPERS
// =========================
export async function updateProduct(productId, updates) {
  return await dbUpdate("products", productId, updates);
}

export async function addCollection(record) {
  return await dbInsert("collections", record);
}

export async function addExpense(record) {
  return await dbInsert("expenses", record);
}

// =========================
// GET CURRENT USER
// =========================
export function getCurrentUser() {
  return currentUser;
}
