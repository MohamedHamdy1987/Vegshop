// ===================== sync.js — مزامنة متقدمة مع السحابة، إدارة التعارضات، واستراتيجيات إعادة المحاولة =====================

/**
 * حالة المزامنة الحالية
 */
const SyncState = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  ERROR: 'error'
};

let currentSyncState = SyncState.IDLE;
let pendingSync = false;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;

/**
 * الحصول على حالة المزامنة الحالية
 */
function getSyncState() {
  return currentSyncState;
}

/**
 * تعيين حالة المزامنة وتحديث واجهة المستخدم
 */
function setSyncState(state, msg = '') {
  currentSyncState = state;
  let status = '';
  let displayMsg = msg;
  
  switch (state) {
    case SyncState.SYNCING:
      status = 'saving';
      if (!displayMsg) displayMsg = 'جاري المزامنة...';
      break;
    case SyncState.OFFLINE:
      status = 'error';
      if (!displayMsg) displayMsg = 'لا يوجد اتصال - البيانات محفوظة محلياً';
      break;
    case SyncState.ERROR:
      status = 'error';
      if (!displayMsg) displayMsg = 'خطأ في المزامنة';
      break;
    default:
      status = '';
      if (!displayMsg) displayMsg = 'محفوظ على السحابة ✓';
  }
  
  syncUI.setStatus(status, displayMsg);
}

/**
 * التحقق من الاتصال بالإنترنت
 */
function isOnline() {
  return navigator.onLine !== false;
}

/**
 * استماع لتغير حالة الاتصال
 */
window.addEventListener('online', () => {
  setSyncState(SyncState.IDLE, 'تم استعادة الاتصال');
  if (pendingSync) {
    performFullSync();
  }
});

window.addEventListener('offline', () => {
  setSyncState(SyncState.OFFLINE, 'لا يوجد اتصال بالإنترنت');
});

/**
 * المزامنة الكاملة مع السحابة (مع إعادة محاولة تلقائية)
 */
async function performFullSync() {
  if (!currentUser) return;
  if (!isOnline()) {
    setSyncState(SyncState.OFFLINE);
    pendingSync = true;
    return;
  }
  
  if (currentSyncState === SyncState.SYNCING) {
    pendingSync = true;
    return;
  }
  
  setSyncState(SyncState.SYNCING);
  pendingSync = false;
  
  try {
    // الحصول على أحدث إصدار من السحابة مع معلومات التعارض
    const { data: remoteData, error: fetchError } = await sb
      .from('shop_data')
      .select('data, version, updated_at, sync_hash')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    // حساب hash للبيانات المحلية للمقارنة السريعة
    const localHash = await computeDataHash(store.state);
    const remoteHash = remoteData?.sync_hash || '';
    
    // إذا كانت البيانات متطابقة، لا داعي للمزامنة
    if (localHash === remoteHash && remoteData) {
      setSyncState(SyncState.IDLE, 'جميع البيانات محدثة');
      retryCount = 0;
      return;
    }
    
    const localVersion = store.state.version || 1;
    const remoteVersion = remoteData?.version || 0;
    const localUpdated = new Date(store.state.lastUpdated || 0);
    const remoteUpdated = new Date(remoteData?.updated_at || 0);
    
    let finalState = null;
    let finalVersion = Math.max(localVersion, remoteVersion) + 1;
    let resolution = 'none';
    
    // حل التعارض: من لديه تاريخ أحدث يفوز، مع دمج يدوي للتعارضات المعقدة
    if (remoteUpdated > localUpdated && remoteData?.data) {
      // السحابة أحدث
      finalState = JSON.parse(remoteData.data);
      finalVersion = remoteData.version + 1;
      resolution = 'cloud_wins';
      store.replace(finalState);
      setSyncState(SyncState.IDLE, 'تم التحديث من السحابة');
    } 
    else if (localUpdated > remoteUpdated) {
      // المحلي أحدث
      finalState = store.serialize();
      finalVersion = localVersion + 1;
      resolution = 'local_wins';
      
      const { error: upsertError } = await sb
        .from('shop_data')
        .upsert({
          user_id: currentUser.id,
          data: finalState,
          version: finalVersion,
          updated_at: new Date().toISOString(),
          sync_hash: localHash
        }, { onConflict: 'user_id' });
      
      if (upsertError) throw upsertError;
      store.state.version = finalVersion;
      store.state.lastUpdated = new Date().toISOString();
      store._persist();
      setSyncState(SyncState.IDLE, 'محفوظ على السحابة ✓');
    }
    else {
      // تواريخ متساوية ولكن محتوى مختلف - تعارض حقيقي
      resolution = 'conflict';
      // دمج بسيط: دمج المصفوفات (الحل المتقدم يحتاج واجهة مستخدم)
      const mergedState = mergeStates(store.state, JSON.parse(remoteData.data));
      finalState = JSON.stringify(mergedState);
      finalVersion = Math.max(localVersion, remoteVersion) + 1;
      
      const { error: upsertError } = await sb
        .from('shop_data')
        .upsert({
          user_id: currentUser.id,
          data: finalState,
          version: finalVersion,
          updated_at: new Date().toISOString(),
          sync_hash: await computeDataHash(mergedState)
        }, { onConflict: 'user_id' });
      
      if (upsertError) throw upsertError;
      store.replace(mergedState);
      setSyncState(SyncState.IDLE, 'تم دمج البيانات بنجاح');
      showToast('تم دمج التعارضات تلقائياً', 'warning');
    }
    
    // تسجيل سجل المزامنة
    logSyncEvent(resolution, { localVersion, remoteVersion, localUpdated, remoteUpdated });
    retryCount = 0;
    
  } catch (e) {
    AppError.supabase('performFullSync', e);
    retryCount++;
    if (retryCount <= MAX_RETRIES) {
      setSyncState(SyncState.ERROR, `خطأ - إعادة المحاولة (${retryCount}/${MAX_RETRIES})`);
      setTimeout(() => performFullSync(), RETRY_DELAY);
    } else {
      setSyncState(SyncState.ERROR, 'فشل المزامنة بعد عدة محاولات');
      retryCount = 0;
    }
  }
}

/**
 * حساب hash بسيط للبيانات (للمقارنة السريعة)
 */
async function computeDataHash(data) {
  const str = JSON.stringify(data);
  // Simple hash using browser crypto if available
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(str));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple checksum
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

/**
 * دمج بسيط بين حالتين عند التعارض (يُفضل تحسينه)
 */
function mergeStates(local, remote) {
  const merged = JSON.parse(JSON.stringify(local));
  // دمج المصفوفات: إضافة العناصر الموجودة في remote فقط إذا لم تكن في local
  const arrayFields = ['products', 'customers', 'suppliers', 'invoices', 'collections', 'expenses', 'employees', 'partners', 'shops'];
  for (const field of arrayFields) {
    if (Array.isArray(local[field]) && Array.isArray(remote[field])) {
      const localIds = new Set(local[field].map(item => item.id));
      for (const item of remote[field]) {
        if (!localIds.has(item.id)) {
          merged[field].push(item);
        }
      }
    }
  }
  // دمج كائن الترحيلات
  if (remote.tarhilLog) {
    merged.tarhilLog = { ...local.tarhilLog, ...remote.tarhilLog };
  }
  merged.version = Math.max(local.version || 1, remote.version || 1) + 1;
  merged.lastUpdated = new Date().toISOString();
  return merged;
}

/**
 * تسجيل أحداث المزامنة
 */
function logSyncEvent(resolution, details) {
  const events = JSON.parse(localStorage.getItem('sync_events') || '[]');
  events.push({
    timestamp: new Date().toISOString(),
    resolution,
    details,
    userId: currentUser?.id
  });
  if (events.length > 50) events.shift();
  localStorage.setItem('sync_events', JSON.stringify(events));
}

/**
 * طلب مزامنة فورية
 */
function requestSync() {
  if (isOnline()) {
    performFullSync();
  } else {
    pendingSync = true;
    setSyncState(SyncState.OFFLINE);
  }
}

/**
 * تعيين مؤقت دوري للمزامنة (كل 5 دقائق)
 */
let periodicSyncInterval = null;

function startPeriodicSync(intervalMs = 5 * 60 * 1000) {
  if (periodicSyncInterval) clearInterval(periodicSyncInterval);
  periodicSyncInterval = setInterval(() => {
    if (isOnline() && currentUser) {
      requestSync();
    }
  }, intervalMs);
}

function stopPeriodicSync() {
  if (periodicSyncInterval) {
    clearInterval(periodicSyncInterval);
    periodicSyncInterval = null;
  }
}

// بدء المزامنة الدورية تلقائياً عند تحميل الصفحة
window.addEventListener('load', () => {
  startPeriodicSync();
  // مراقبة حالة الاتصال
  window.addEventListener('online', () => requestSync());
});

// تصدير للاستخدام العالمي
window.performFullSync = performFullSync;
window.requestSync = requestSync;
window.getSyncState = getSyncState;
window.startPeriodicSync = startPeriodicSync;
window.stopPeriodicSync = stopPeriodicSync;
