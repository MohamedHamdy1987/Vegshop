// ===================== data.js — نسخة محلية فقط (بدون Supabase) =====================

// Mock Supabase client (لا يقوم بأي اتصال حقيقي)
const sb = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error('محلي') }),
    signUp: async () => ({ data: null, error: new Error('محلي') }),
    signOut: async () => ({ error: null })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        order: () => ({ then: (cb) => cb({ data: [], error: null }) })
      })
    }),
    insert: async () => ({ error: null }),
    upsert: async () => ({ error: null }),
    update: () => ({ eq: () => ({ then: (cb) => cb({ error: null }) }) })
  })
};

// ─────────────────────────────────────────────
// 🗃️ State Manager (نفسه ولكن بدون مزامنة)
// ─────────────────────────────────────────────
const store = {
  _state: null,
  _version: 1,
  _saveTimer: null,

  init() {
    const saved = localStorage.getItem('veg_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this._state = parsed.state;
        this._version = parsed.version || 1;
      } catch(e) { 
        console.error('Failed to parse saved state', e);
        this._state = this._getDefaultState();
      }
    } else {
      this._state = this._getDefaultState();
    }
    this._normalize();
    this._persist();
  },

  _getDefaultState() {
    return {
      date: fmtDate(new Date()),
      products: [],
      customers: [],
      suppliers: [],
      invoices: [],
      collections: [],
      expenses: [],
      tarhilLog: {},
      employees: [],
      partners: [],
      shops: [],
      version: 1,
      lastUpdated: new Date().toISOString()
    };
  },

  _normalize() {
    const st = this._state;
    if (!st.employees)   st.employees = [];
    if (!st.partners)    st.partners = [];
    if (!st.shops)       st.shops = [];
    if (!st.tarhilLog)   st.tarhilLog = {};
    if (!st.collections) st.collections = [];
    if (!st.expenses)    st.expenses = [];
    if (!st.invoices)    st.invoices = [];
    if (!st.products)    st.products = [];
    if (!st.customers)   st.customers = [];
    if (!st.suppliers)   st.suppliers = [];
    if (!st.date)        st.date = fmtDate(new Date());
    if (!st.version)     st.version = 1;
    if (!st.lastUpdated) st.lastUpdated = new Date().toISOString();
    
    const now = new Date();
    for (const dateStr in st.tarhilLog) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime()) && (now - d) > 30 * 24 * 60 * 60 * 1000) {
        delete st.tarhilLog[dateStr];
      }
    }
  },

  get state() { return this._state; },

  set(updater) {
    try {
      updater(this._state);
      this._state.version = (this._state.version || 0) + 1;
      this._state.lastUpdated = new Date().toISOString();
      this._persist();
    } catch (e) {
      console.error('store.set error', e);
    }
  },

  replace(newState) {
    this._state = newState;
    this._normalize();
    this._persist();
  },

  _persist() {
    try {
      localStorage.setItem('veg_state', JSON.stringify({ state: this._state, version: this._state.version }));
    } catch (e) {
      console.error('localStorage.save error', e);
    }
  },

  serialize() {
    return JSON.stringify(this._state);
  }
};

const S = store.state;
let currentUser = null;
let xProd = null;

const AppError = {
  log(context, error, notifyUser = false) {
    console.error(`[${context}]`, error);
  },
  supabase(context, error) {
    console.error(`[Supabase/${context}]`, error);
  }
};

const syncUI = {
  setStatus(status, msg) {
    document.dispatchEvent(new CustomEvent('sync-status', { detail: { status, msg } }));
  }
};

// دوال وهمية (لا تفعل شيئاً)
async function syncWithCloud() { return; }
async function loadUserData() { return; }
function save() { store._persist(); }
function saveData() { return Promise.resolve(); }

store.init();

window.S = S;
window.store = store;
window.save = save;
window.saveData = saveData;
window.loadUserData = loadUserData;
window.syncWithCloud = syncWithCloud;
