// ============================================================================
// NAAZ MAKEUP STUDIO — NATIVE MOBILE APK ENGINE, THEMES & ON-DEVICE STORAGE
// ============================================================================

const STORAGE_KEY = 'naaz_beauty_studio_en_v1';
const AUTO_DL_KEY = 'naaz_beauty_studio_auto_dl_v1';
const THEME_KEY = 'naaz_makeup_studio_theme_v2';
const IDB_NAME = 'NaazBeautyStudioDeviceDB';
const IDB_STORE = 'studio_records';

let linkedFileHandle = null;
let autoDownloadOnChange = false;
try {
  autoDownloadOnChange = localStorage.getItem(AUTO_DL_KEY) === 'true';
} catch (e) {}

function getOffsetDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DEFAULT_SERVICES = [
  { id: 'srv-1', name: 'Bridal Makeup', category: 'Makeup', duration: '2-3 Hours', price: 3500, iconType: 'bridal' },
  { id: 'srv-2', name: 'Party Makeup', category: 'Makeup', duration: '1-2 Hours', price: 2000, iconType: 'party' },
  { id: 'srv-3', name: 'Facial', category: 'Skin', duration: '1 Hour', price: 1500, iconType: 'facial' },
  { id: 'srv-4', name: 'Hair Styling', category: 'Hair', duration: '1 Hour', price: 1200, iconType: 'hairstyle' },
  { id: 'srv-5', name: 'Hair Spa', category: 'Hair', duration: '1 Hour', price: 1000, iconType: 'hairspa' },
  { id: 'srv-6', name: 'Threading', category: 'Others', duration: '30 Minutes', price: 300, iconType: 'threading' },
  { id: 'srv-7', name: 'Royal HD Bridal Package', category: 'Makeup', duration: '3-4 Hours', price: 15000, iconType: 'bridal' },
  { id: 'srv-8', name: 'Hydra Facial & De-Tan', category: 'Skin', duration: '1.5 Hours', price: 2500, iconType: 'facial' }
];

function getInitialBookings() {
  return [];
}

function getInitialJewellery() {
  const today = getOffsetDateStr(0);
  const tomorrow = getOffsetDateStr(1);
  return [
    {
      id: 'jew-1',
      code: 'J001',
      itemName: 'Gold Necklace',
      itemType: 'necklace',
      stockStatus: 'In Stock',
      clientName: '',
      phone: '',
      issueDate: today,
      dueDate: tomorrow,
      returnDate: '',
      depositAmount: 3000,
      notes: '24K gold-plated Kundan bridal choker necklace.'
    },
    {
      id: 'jew-2',
      code: 'J002',
      itemName: 'Diamond Earrings',
      itemType: 'earrings',
      stockStatus: 'In Stock',
      clientName: '',
      phone: '',
      issueDate: today,
      dueDate: tomorrow,
      returnDate: '',
      depositAmount: 2500,
      notes: 'Bridal diamond earrings set.'
    },
    {
      id: 'jew-3',
      code: 'J003',
      itemName: 'Bangles Set',
      itemType: 'bangles',
      stockStatus: 'In Stock',
      clientName: '',
      phone: '',
      issueDate: today,
      dueDate: tomorrow,
      returnDate: '',
      depositAmount: 1500,
      notes: 'Bridal velvet & stone chuda bangles set.'
    },
    {
      id: 'jew-4',
      code: 'J004',
      itemName: 'Ring',
      itemType: 'ring',
      stockStatus: 'In Stock',
      clientName: '',
      phone: '',
      issueDate: today,
      dueDate: tomorrow,
      returnDate: '',
      depositAmount: 1000,
      notes: 'Adjustable Kundan mirror cocktail ring.'
    },
    {
      id: 'jew-5',
      code: 'J005',
      itemName: 'Necklace Set',
      itemType: 'necklaceset',
      stockStatus: 'In Stock',
      clientName: '',
      phone: '',
      issueDate: today,
      dueDate: tomorrow,
      returnDate: '',
      depositAmount: 4000,
      notes: 'Full Rani Haar + Maang Tikka bridal set.'
    }
  ];
}

let appState = {
  parlourName: 'NAAZ MAKEUP STUDIO',
  theme: 'black-gold',
  activeScreen: 'home',
  previousScreen: 'home',
  bookingFilter: 'all',
  serviceFilter: 'All',
  jewelleryFilter: 'All',
  hisabFilter: 'all',
  services: [],
  bookings: [],
  rentals: [],
  customCustomers: [],
  deletedCustomers: []
};

// --- COLOR THEME SWITCHER ---
function setStudioTheme(themeName, silent = false) {
  appState.theme = themeName || 'black-gold';
  document.body.setAttribute('data-theme', appState.theme);
  document.querySelectorAll('.theme-swatch-btn').forEach(btn => {
    const active = btn.getAttribute('data-theme-opt') === appState.theme;
    btn.style.borderColor = active ? 'var(--brand-600)' : 'var(--border-color)';
    btn.style.background = active ? 'var(--brand-50)' : '#ffffff';
  });
  try {
    localStorage.setItem(THEME_KEY, appState.theme);
  } catch (e) {}
  if (!silent) {
    const labels = {
      'wine-rosegold': 'Rose Gold & Royal Wine Theme',
      'black-gold': 'Obsidian Black & Champagne Gold Theme',
      'blush-rose': 'Blush Pink & Rose Gold Theme',
      'emerald-gold': 'Royal Emerald & 24K Gold Theme'
    };
    showToast(labels[appState.theme] || 'Theme updated!');
  }
}

function cycleStudioTheme() {
  const order = ['black-gold', 'wine-rosegold', 'blush-rose', 'emerald-gold'];
  const next = order[(order.indexOf(appState.theme || 'black-gold') + 1) % order.length];
  setStudioTheme(next, false);
}

// --- STORAGE ENGINE ---
async function requestPersistentDeviceStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      const badge = document.getElementById('modalStoragePersistBadge');
      if (badge) {
        badge.textContent = isPersisted ? 'OS Persistent Active' : 'Device Active';
      }
    }
  } catch (e) {}
}

function openDeviceIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(data) {
  try {
    const db = await openDeviceIndexedDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(JSON.parse(JSON.stringify(data)), 'main_state');
  } catch (e) {}
}

async function loadFromIndexedDB() {
  try {
    const db = await openDeviceIndexedDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('main_state');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

async function writeToLinkedDeviceFile(data) {
  if (!linkedFileHandle) return;
  try {
    const writable = await linkedFileHandle.createWritable();
    const payload = JSON.stringify({
      app: 'NAAZ MAKEUP STUDIO',
      exportedAt: new Date().toISOString(),
      ...data
    }, null, 2);
    await writable.write(payload);
    await writable.close();
    updateDeviceStorageUI('Direct File Synced (' + linkedFileHandle.name + ')');
  } catch (e) {}
}

function updateDeviceStorageUI(statusText = null) {
  const sub = document.getElementById('deviceStorageSubtitle');
  if (sub && statusText) sub.textContent = statusText;
  const toggleBtn = document.getElementById('autoDownloadToggleBtn');
  if (toggleBtn) {
    toggleBtn.textContent = autoDownloadOnChange ? 'ON' : 'OFF';
    toggleBtn.style.background = autoDownloadOnChange ? '#15803d' : 'var(--brand-100)';
    toggleBtn.style.color = autoDownloadOnChange ? '#ffffff' : 'var(--brand-900)';
  }
}

function normalizeLoadedState(saved) {
  appState.parlourName = 'NAAZ MAKEUP STUDIO';

  appState.services = (saved && Array.isArray(saved.services))
    ? saved.services.map((s, idx) => ({
        id: s.id || ('srv-' + idx),
        name: s.name || 'Service',
        category: normalizeCategory(s.category),
        duration: s.duration || '1 Hour',
        price: Number(s.price) || 500,
        iconType: s.iconType || guessServiceIcon(s.name, s.category)
      }))
    : JSON.parse(JSON.stringify(DEFAULT_SERVICES));

  if (saved && Array.isArray(saved.bookings)) {
    appState.bookings = saved.bookings.map((b, idx) => ({
      id: b.id || ('bk-' + idx),
      clientName: b.clientName || 'Customer',
      phone: b.phone || b.clientPhone || '',
      date: b.date || getOffsetDateStr(0),
      time: b.time || '10:00',
      category: b.category || 'Makeup',
      services: Array.isArray(b.services) ? b.services : [String(b.services || 'Bridal Makeup')],
      totalAmount: Number(b.totalAmount) || 0,
      advancePaid: Number(b.advancePaid) || 0,
      paymentMode: b.paymentMode || 'UPI',
      status: b.status || 'Confirmed',
      notes: b.notes || '',
      bookingHistoryCount: Number(b.bookingHistoryCount) || 1,
      payments: Array.isArray(b.payments) ? b.payments : []
    }));
  } else {
    appState.bookings = getInitialBookings();
  }

  if (saved && Array.isArray(saved.rentals)) {
    appState.rentals = saved.rentals.map((r, i) => {
      const cName = String(r.clientName || '').trim();
      let st = r.stockStatus || (r.status === 'returned' || r.status === 'Returned' ? 'Returned' : (cName ? 'Issued' : 'In Stock'));
      // Auto-heal items where customer name was entered to issue jewellery but status remained "In Stock"
      if (cName && st === 'In Stock') {
        st = 'Issued';
      }
      return {
        id: r.id || ('jew-' + (i + 1)),
        code: r.code || `J00${i + 1}`,
        itemName: r.itemName || 'Jewellery Set',
        itemType: r.itemType || guessJewelleryType(r.itemName || ''),
        stockStatus: st,
        clientName: cName,
        phone: String(r.phone || r.clientPhone || '').trim(),
        issueDate: r.issueDate || getOffsetDateStr(0),
        dueDate: r.dueDate || getOffsetDateStr(1),
        returnDate: r.returnDate || '',
        depositAmount: Number(r.depositAmount) || 0,
        notes: r.notes || ''
      };
    });
  } else {
    appState.rentals = getInitialJewellery();
  }

  appState.customCustomers = (saved && Array.isArray(saved.customCustomers)) ? saved.customCustomers : [];
  appState.deletedCustomers = (saved && Array.isArray(saved.deletedCustomers)) ? saved.deletedCustomers : [];
}

function saveStorage() {
  const stateToPersist = {
    parlourName: 'NAAZ MAKEUP STUDIO',
    theme: appState.theme,
    services: appState.services,
    bookings: appState.bookings,
    rentals: appState.rentals,
    customCustomers: appState.customCustomers,
    deletedCustomers: appState.deletedCustomers,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
  } catch (e) {}
  saveToIndexedDB(stateToPersist);
  writeToLinkedDeviceFile(stateToPersist);
  if (autoDownloadOnChange) {
    downloadDeviceBackupFile(true);
  }
}

function getStudioBackupPayload() {
  return {
    app: 'NAAZ MAKEUP STUDIO',
    version: 4,
    savedAt: new Date().toISOString(),
    parlourName: 'NAAZ MAKEUP STUDIO',
    theme: appState.theme,
    services: appState.services,
    bookings: appState.bookings,
    rentals: appState.rentals,
    customCustomers: appState.customCustomers,
    deletedCustomers: appState.deletedCustomers
  };
}

function refreshJsonBackupPreviewBox() {
  const box = document.getElementById('jsonBackupTextarea');
  if (box) {
    box.value = JSON.stringify(getStudioBackupPayload(), null, 2);
  }
}

async function downloadDeviceBackupFile(silent = false) {
  const payload = getStudioBackupPayload();
  const jsonText = JSON.stringify(payload, null, 2);
  const filename = `naaz_makeup_studio_data_${getOffsetDateStr(0)}.json`;
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  refreshJsonBackupPreviewBox();

  // 1. Native Android APK Bridge (saves directly into Phone's Downloads folder)
  if (window.NaazAndroid && typeof window.NaazAndroid.saveFileToDownloads === 'function') {
    try {
      const res = window.NaazAndroid.saveFileToDownloads(filename, jsonText, 'application/json');
      if (res && String(res).startsWith('OK:')) {
        updateDeviceStorageUI(`Saved in Downloads (${filename}) at ${nowTime}`);
        if (!silent) {
          showToast('Saved in Phone Downloads: ' + filename);
        }
        return;
      }
    } catch (err) {}
  }

  // 2. Detect Android WebView / Capacitor environment where blob:<a> download is blocked
  const isAndroidWebView = Boolean(window.Capacitor) || /; wv\)/i.test(navigator.userAgent || '');

  if (isAndroidWebView && !silent) {
    // Try Web Share API with .json File if supported by Android System WebView
    if (navigator.share) {
      try {
        const file = new File([jsonText], filename, { type: 'application/json' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
            text: 'Naaz Makeup Studio JSON Backup'
          });
          updateDeviceStorageUI(`Exported ${filename} at ${nowTime}`);
          showToast('JSON Backup file exported!');
          return;
        }
      } catch (shareErr) {
        if (shareErr && shareErr.name === 'AbortError') return;
      }
      try {
        await navigator.share({
          title: filename,
          text: jsonText
        });
        updateDeviceStorageUI(`Shared JSON data at ${nowTime}`);
        return;
      } catch (shareTextErr) {
        if (shareTextErr && shareTextErr.name === 'AbortError') return;
      }
    }

    // Fallback: Copy JSON to clipboard & open the in-app JSON extractor box
    const wrap = document.getElementById('jsonBackupBoxWrap');
    if (wrap) wrap.classList.remove('hidden');
    await copyBackupJsonText(true);
    updateDeviceStorageUI(`JSON Extracted & Copied at ${nowTime}`);
    showToast('JSON data extracted & copied to clipboard!');
    return;
  }

  // 3. Standard Browser Download (Blob URL + Data URI fallback)
  try {
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);
  } catch (e) {
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonText);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  updateDeviceStorageUI(`Saved to Device at ${nowTime}`);
  if (!silent) {
    showToast('Studio data (.json) downloaded');
  }
}

async function shareDeviceBackupFile() {
  const payload = getStudioBackupPayload();
  const jsonText = JSON.stringify(payload, null, 2);
  const filename = `naaz_makeup_studio_data_${getOffsetDateStr(0)}.json`;

  refreshJsonBackupPreviewBox();

  if (window.NaazAndroid && typeof window.NaazAndroid.saveAndShareFile === 'function') {
    try {
      const res = window.NaazAndroid.saveAndShareFile(filename, jsonText, 'application/json');
      if (res && String(res).startsWith('OK:')) {
        showToast('Saved in Downloads & opening Share...');
        return;
      }
    } catch (e) {}
  }

  if (navigator.share) {
    try {
      const file = new File([jsonText], filename, { type: 'application/json' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: 'Naaz Makeup Studio Backup (.json)'
        });
        showToast('Backup file shared!');
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
    try {
      await navigator.share({
        title: filename,
        text: jsonText
      });
      return;
    } catch (err2) {
      if (err2 && err2.name === 'AbortError') return;
    }
  }

  await downloadDeviceBackupFile(false);
}

function toggleJsonBackupBox() {
  const wrap = document.getElementById('jsonBackupBoxWrap');
  if (!wrap) return;
  const isHidden = wrap.classList.contains('hidden');
  if (isHidden) {
    refreshJsonBackupPreviewBox();
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }
}

async function copyBackupJsonText(silent = false) {
  const jsonText = JSON.stringify(getStudioBackupPayload(), null, 2);
  const box = document.getElementById('jsonBackupTextarea');
  if (box) box.value = jsonText;

  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(jsonText);
      copied = true;
    } catch (e) {}
  }
  if (!copied && box) {
    try {
      const wrap = document.getElementById('jsonBackupBoxWrap');
      if (wrap) wrap.classList.remove('hidden');
      box.focus();
      box.select();
      box.setSelectionRange(0, jsonText.length);
      copied = document.execCommand('copy');
    } catch (e) {}
  }
  if (!silent) {
    showToast(copied ? 'JSON Backup copied to clipboard!' : 'JSON ready in text box below');
  }
  return copied;
}

function restoreFromJsonText() {
  const box = document.getElementById('jsonBackupTextarea');
  const raw = (box ? box.value : '').trim();
  if (!raw) {
    showToast('Please paste JSON backup text first');
    return;
  }
  try {
    const data = JSON.parse(raw);
    if (!data || (!Array.isArray(data.bookings) && !Array.isArray(data.services))) {
      showToast('Invalid JSON backup format');
      return;
    }
    normalizeLoadedState(data);
    saveStorage();
    renderAll();
    closeStorageModal();
    showToast('Backup restored from JSON!');
  } catch (err) {
    showToast('Invalid JSON text');
  }
}

function handleDeviceFileLoad(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = String(e.target.result || '').trim();
      const data = JSON.parse(text);
      if (!data || (!Array.isArray(data.bookings) && !Array.isArray(data.services))) {
        showToast('Invalid backup file');
        return;
      }
      normalizeLoadedState(data);
      saveStorage();
      renderAll();
      closeStorageModal();
      showToast('Device JSON file loaded!');
    } catch (err) {
      showToast('Could not read JSON file');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

async function connectDirectDeviceFile() {
  if (!window.showSaveFilePicker) {
    await shareDeviceBackupFile();
    return;
  }
  try {
    linkedFileHandle = await window.showSaveFilePicker({
      suggestedName: 'naaz_makeup_studio_data.json',
      types: [{
        description: 'Naaz Makeup Studio Device Data File',
        accept: { 'application/json': ['.json'] }
      }]
    });
    await writeToLinkedDeviceFile(appState);
    showToast('Connected to device file!');
  } catch (e) {}
}

function toggleAutoDownloadOnChange() {
  autoDownloadOnChange = !autoDownloadOnChange;
  try {
    localStorage.setItem(AUTO_DL_KEY, autoDownloadOnChange ? 'true' : 'false');
  } catch (e) {}
  updateDeviceStorageUI(autoDownloadOnChange ? 'Auto-Save ON' : 'IndexedDB Active');
  showToast(autoDownloadOnChange ? 'Auto-Download ON' : 'Auto-Download OFF');
}

function resetToMockupDemoData() {
  appState.services = JSON.parse(JSON.stringify(DEFAULT_SERVICES));
  appState.bookings = [];
  appState.rentals = getInitialJewellery();
  appState.customCustomers = [];
  appState.deletedCustomers = [];
  saveStorage();
  renderAll();
  closeStorageModal();
  showToast('All bookings cleared & reset!');
}

// --- FORMATTERS & HELPERS ---
function formatINR(num) {
  const n = Number(num) || 0;
  return '₹ ' + n.toLocaleString('en-IN');
}

function formatDatePretty(dateStr) {
  if (!dateStr) return '15 Apr 2025';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime12h(timeStr) {
  if (!timeStr) return '10:00 AM';
  const s = String(timeStr);
  if (s.toUpperCase().includes('AM') || s.toUpperCase().includes('PM')) return s;
  const [hStr, mStr] = s.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return s;
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function getInitials(name) {
  const parts = String(name || 'NM').trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return String(parts[0] || 'NM').slice(0, 2).toUpperCase();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeCategory(cat) {
  const c = String(cat || '').toLowerCase();
  if (c.includes('makeup') || c.includes('bridal')) return 'Makeup';
  if (c.includes('hair')) return 'Hair';
  if (c.includes('skin') || c.includes('facial')) return 'Skin';
  return 'Others';
}

function guessServiceIcon(name, category) {
  const n = String(name || '').toLowerCase();
  if (n.includes('bridal')) return 'bridal';
  if (n.includes('party')) return 'party';
  if (n.includes('facial') || n.includes('skin') || n.includes('clean')) return 'facial';
  if (n.includes('spa')) return 'hairspa';
  if (n.includes('hair')) return 'hairstyle';
  if (n.includes('thread') || n.includes('wax')) return 'threading';
  const cat = normalizeCategory(category);
  if (cat === 'Makeup') return 'bridal';
  if (cat === 'Hair') return 'hairstyle';
  if (cat === 'Skin') return 'facial';
  return 'threading';
}

function guessJewelleryType(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('earring') || n.includes('jhumka')) return 'earrings';
  if (n.includes('bangle') || n.includes('chuda') || n.includes('kangan')) return 'bangles';
  if (n.includes('ring') || n.includes('nath')) return 'ring';
  if (n.includes('set') || n.includes('rani') || n.includes('bridal')) return 'necklaceset';
  return 'necklace';
}

function getBalance(booking) {
  const total = Number(booking.totalAmount) || 0;
  const paid = Number(booking.advancePaid) || 0;
  return Math.max(0, total - paid);
}

// --- SVG ICONS ---
function getServiceSvgIcon(iconType) {
  switch (iconType) {
    case 'bridal':
      return `<svg class="icon-20" style="color:var(--brand-800)" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V4a1 1 0 0 1 2 0v6h2V6a1 1 0 0 1 2 0v4h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm2 4v4h6v-4H9z"/></svg>`;
    case 'party':
      return `<svg class="icon-20" style="color:var(--brand-800)" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h14l-6 7.5V18h3v2H8v-2h3v-6.5L5 4zm3.2 2 3.8 4.75L15.8 6H8.2z"/></svg>`;
    case 'facial':
      return `<svg class="icon-20" style="color:var(--brand-800)" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 6.03 4 11c0 4.97 3.58 9 8 9s8-4.03 8-9c0-4.97-3.58-9-8-9zm-2.5 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm-2.5 6.5c-1.9 0-3.5-1.1-4-2.5h8c-.5 1.4-2.1 2.5-4 2.5z"/></svg>`;
    case 'hairstyle':
      return `<svg class="icon-20" style="color:var(--brand-800)" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 3.8-9 8.5 0 3.1 1.7 5.8 4.2 7.3-.2-1.2-.2-2.6.2-3.9.7-2.2 2.4-3.9 4.6-3.9s3.9 1.7 4.6 3.9c.4 1.3.4 2.7.2 3.9 2.5-1.5 4.2-4.2 4.2-7.3C21 6.8 16.97 3 12 3zm0 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>`;
    case 'hairspa':
      return `<svg class="icon-20" style="color:var(--brand-800)" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.2 3.8L18 8l-2.5 3.2L16 15H8l.5-3.8L6 8l3.8-1.2L12 3zm-5 14h10a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/></svg>`;
    default:
      return `<svg class="icon-20" style="color:var(--brand-800)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 4l12 16M18 4L6 20M9 4h6"/></svg>`;
  }
}

function getJewellerySvgIcon(itemType) {
  switch (itemType) {
    case 'earrings':
      return `<svg class="icon-28" viewBox="0 0 40 40" fill="none"><circle cx="14" cy="12" r="3" fill="#D97706"/><path d="M14 15L10 25C10 28 18 28 18 25L14 15Z" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/><circle cx="26" cy="12" r="3" fill="#D97706"/><path d="M26 15L22 25C22 28 30 28 30 25L26 15Z" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/></svg>`;
    case 'bangles':
      return `<svg class="icon-28" viewBox="0 0 40 40" fill="none"><circle cx="18" cy="21" r="9.5" stroke="#D97706" stroke-width="3"/><circle cx="23" cy="19" r="9.5" stroke="#F59E0B" stroke-width="2.5" stroke-dasharray="3 1.5"/></svg>`;
    case 'ring':
      return `<svg class="icon-28" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="23" r="8.5" stroke="#D97706" stroke-width="3"/><polygon points="20,9 24,13 20,16 16,13" fill="#60A5FA" stroke="#1D4ED8" stroke-width="1"/></svg>`;
    case 'necklaceset':
      return `<svg class="icon-28" viewBox="0 0 40 40" fill="none"><path d="M9 12C9 21 14 27 20 27C26 27 31 21 31 12" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/><path d="M12 14C12 20 15.5 24 20 24C24.5 24 28 20 28 14" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="2 2"/><circle cx="20" cy="30" r="2.6" fill="#D97706"/></svg>`;
    default:
      return `<svg class="icon-28" viewBox="0 0 40 40" fill="none"><path d="M10 11C10 20.5 14.5 26.5 20 26.5C25.5 26.5 30 20.5 30 11" stroke="#D97706" stroke-width="2.8" stroke-linecap="round"/><circle cx="20" cy="29.5" r="2.8" fill="#F59E0B" stroke="#B45309" stroke-width="1"/><circle cx="16" cy="28" r="1.8" fill="#FBBF24"/><circle cx="24" cy="28" r="1.8" fill="#FBBF24"/></svg>`;
  }
}

// --- NATIVE SCREEN NAVIGATION ---
const SCREEN_TITLES = {
  'home': 'Naaz Makeup Studio',
  'bookings': 'Bookings',
  'add-booking': 'Add Booking',
  'hisab': 'Hisab Ledger',
  'services': 'Services & Rates',
  'customers': 'Customers',
  'jewellery': 'Jewellery Tracker'
};

const SCREEN_SUBTITLES = {
  'bookings': 'Appointments & Schedule',
  'add-booking': 'New Client Appointment',
  'hisab': 'Collections & Pending Dues',
  'services': 'Studio Rate Card',
  'customers': 'Client Directory',
  'jewellery': 'Bridal Sets & Return Status'
};

function navigateToScreen(screenId, options = {}) {
  if (appState.activeScreen !== screenId) {
    appState.previousScreen = appState.activeScreen;
  }
  appState.activeScreen = screenId;

  const screens = ['home', 'bookings', 'add-booking', 'hisab', 'services', 'customers', 'jewellery'];
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) {
      if (s === screenId) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });

  const homeHeader = document.getElementById('topBarHomeBrand');
  const subHeader = document.getElementById('topBarSubScreen');
  const subTitle = document.getElementById('topBarSubTitle');
  const subSubtitle = document.getElementById('topBarSubSubtitle');
  const subRightAction = document.getElementById('topBarRightActionContainer');

  if (screenId === 'home') {
    if (homeHeader) homeHeader.classList.remove('hidden');
    if (subHeader) subHeader.classList.add('hidden');
  } else {
    if (homeHeader) homeHeader.classList.add('hidden');
    if (subHeader) subHeader.classList.remove('hidden');
    if (subTitle) subTitle.textContent = SCREEN_TITLES[screenId] || 'Naaz Makeup Studio';
    if (subSubtitle) subSubtitle.textContent = SCREEN_SUBTITLES[screenId] || 'NAAZ MAKEUP STUDIO';
    if (subRightAction) {
      if (screenId === 'services') {
        subRightAction.innerHTML = `<button onclick="openAddServiceModal()" class="icon-btn-gold" title="Add Service">+</button>`;
      } else if (screenId === 'customers') {
        subRightAction.innerHTML = `<button onclick="openAddCustomerModal()" class="icon-btn-gold" title="Add Customer">+</button>`;
      } else if (screenId === 'jewellery') {
        subRightAction.innerHTML = `<button onclick="openAddJewelleryModal()" class="icon-btn-gold" title="Add Jewellery">+</button>`;
      } else if (screenId === 'hisab') {
        subRightAction.innerHTML = `<button onclick="exportHisabCSV()" class="icon-btn" title="Export CSV" style="font-weight:800;font-size:14px;">⬇</button>`;
      } else if (screenId === 'bookings') {
        subRightAction.innerHTML = `
          <label class="icon-btn" title="Filter by Date">
            <svg class="icon-18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <input id="bookingDateFilterInput" type="date" onchange="renderBookingsScreen()" style="position:absolute;opacity:0;width:1px;height:1px;" />
          </label>`;
      } else {
        subRightAction.innerHTML = ``;
      }
    }
  }

  // Update Bottom Navigation Bar active state
  const navMap = {
    'home': 'bnav-home',
    'bookings': 'bnav-bookings',
    'hisab': 'bnav-hisab',
    'services': 'bnav-more',
    'customers': 'bnav-more',
    'jewellery': 'bnav-more'
  };
  ['bnav-home', 'bnav-bookings', 'bnav-hisab', 'bnav-more'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      if (navMap[screenId] === id) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  if (screenId === 'add-booking' && !options.preserveForm) {
    prepareNewBookingForm(options.prefillClient || null, options.prefillService || null);
  }

  closeMoreDrawer();
  renderAll();
  const vp = document.getElementById('apkMainViewport');
  if (vp) vp.scrollTop = 0;
}

function navigateBack() {
  const target = appState.previousScreen && appState.previousScreen !== appState.activeScreen
    ? appState.previousScreen
    : 'home';
  navigateToScreen(target);
}

function showSplashScreen() {
  const splash = document.getElementById('splashScreenOverlay');
  if (splash) splash.classList.remove('splash-dismissed');
}

function dismissSplashScreen() {
  const splash = document.getElementById('splashScreenOverlay');
  if (splash) splash.classList.add('splash-dismissed');
}

function toggleMoreDrawer() {
  const drawer = document.getElementById('moreNavDrawer');
  if (drawer) drawer.classList.toggle('hidden');
}

function closeMoreDrawer() {
  const drawer = document.getElementById('moreNavDrawer');
  if (drawer) drawer.classList.add('hidden');
}

// --- MASTER RENDER ---
function renderAll() {
  renderGreetingAndStats();
  renderHomeTodayAppointments();
  renderBookingsScreen();
  renderHisabScreen();
  renderServicesScreen();
  renderCustomersScreen();
  renderJewelleryScreen();
  populateBookingServiceDropdown();
  renderTodayOrderNotifications();
}

function renderGreetingAndStats() {
  const hour = new Date().getHours();
  let greet = 'Good Morning,';
  if (hour >= 12 && hour < 17) greet = 'Good Afternoon,';
  else if (hour >= 17) greet = 'Good Evening,';
  const greetEl = document.getElementById('homeGreetingText');
  if (greetEl) greetEl.textContent = greet;

  const today = getOffsetDateStr(0);
  const totalBookings = appState.bookings.length;

  let todayCollection = 0;
  appState.bookings.forEach(b => {
    if (Array.isArray(b.payments) && b.payments.length) {
      b.payments.forEach(p => {
        if (p.date === today) todayCollection += Number(p.amount) || 0;
      });
    } else if (b.date === today) {
      todayCollection += Number(b.advancePaid) || 0;
    }
  });

  const uniqueCustomers = getCustomerDirectoryList().length;
  const pendingCount = appState.bookings.filter(b => getBalance(b) > 0).length;

  const elBookings = document.getElementById('statTotalBookings');
  const elTodayCol = document.getElementById('statTodayCollection');
  const elNewCust = document.getElementById('statNewCustomers');
  const elPending = document.getElementById('statPendingPayments');

  if (elBookings) elBookings.textContent = String(totalBookings);
  if (elTodayCol) elTodayCol.textContent = formatINR(todayCollection);
  if (elNewCust) elNewCust.textContent = String(uniqueCustomers);
  if (elPending) elPending.textContent = String(pendingCount);
}

function renderHomeTodayAppointments() {
  const container = document.getElementById('homeTodayAppointmentsList');
  if (!container) return;

  const today = getOffsetDateStr(0);
  let todaysList = appState.bookings.filter(b => b.date === today && b.status !== 'Completed');
  todaysList.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (todaysList.length === 0) {
    container.innerHTML = `<div style="padding:22px;text-align:center;font-size:13px;color:var(--text-muted);">No pending or confirmed appointments for today. Tap <b>+</b> below to add a booking!</div>`;
    return;
  }

  container.innerHTML = todaysList.map(b => {
    const serviceLabel = (b.services && b.services.length) ? b.services.join(', ') : (b.category || 'Makeup Service');
    const isPending = b.status === 'Pending';
    const statusPill = isPending
      ? `<span class="status-pill status-pending">Pending</span>`
      : `<span class="status-pill status-confirmed">Confirmed</span>`;
    return `
      <div onclick="openBookingActionModal('${b.id}')" class="list-row">
        <div class="row-center gap-3" style="min-width:0;flex:1;">
          <div style="width:72px;flex-shrink:0;font-size:12px;font-weight:800;color:var(--brand-800);">${escapeHtml(formatTime12h(b.time))}</div>
          <div style="min-width:0;flex:1;">
            <div class="text-truncate" style="font-size:13.5px;font-weight:800;color:var(--text-dark);">${escapeHtml(b.clientName)}</div>
            <div class="text-truncate" style="font-size:12px;color:var(--text-muted);margin-top:2px;">${escapeHtml(serviceLabel)}</div>
          </div>
        </div>
        <div class="row-center gap-2" style="flex-shrink:0;">
          ${statusPill}
          <svg class="icon-16" style="color:var(--text-light);" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </div>
      </div>
    `;
  }).join('');
}

// 2. BOOKINGS SCREEN
function setBookingFilter(filter) {
  appState.bookingFilter = filter;
  document.querySelectorAll('.booking-filter-pill').forEach(btn => {
    if (btn.dataset.filter === filter) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderBookingsScreen();
}

function renderBookingsScreen() {
  const container = document.getElementById('bookingsListContainer');
  if (!container) return;

  const q = (document.getElementById('bookingSearchInput')?.value || '').trim().toLowerCase();
  const dateFilter = document.getElementById('bookingDateFilterInput')?.value || '';
  const today = getOffsetDateStr(0);

  let filtered = appState.bookings.filter(b => {
    if (q) {
      const hay = `${b.clientName} ${b.phone} ${(b.services || []).join(' ')} ${b.category || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (dateFilter && b.date !== dateFilter) return false;
    if (appState.bookingFilter === 'completed') return b.status === 'Completed';
    if (b.status === 'Completed') return false;
    if (appState.bookingFilter === 'today') return b.date === today;
    if (appState.bookingFilter === 'upcoming') return b.date >= today;
    if (appState.bookingFilter === 'pending') return b.status === 'Pending';
    return true;
  });

  filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || '').localeCompare(b.time || '');
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="m-card" style="padding:28px;text-align:center;"><p style="font-size:14px;font-weight:700;color:var(--text-dark);">No bookings found</p><p style="font-size:12px;color:var(--text-muted);margin-top:4px;">Tap + Add Booking below to schedule a client.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const initials = getInitials(b.clientName);
    const serviceLabel = (b.services && b.services.length) ? b.services.join(', ') : (b.category || 'Makeup Service');
    const due = getBalance(b);
    const isPending = b.status === 'Pending';
    const badgeHtml = isPending
      ? `<span class="status-pill status-pending">Pending</span>`
      : `<span class="status-pill status-confirmed">${escapeHtml(b.status || 'Confirmed')}</span>`;

    return `
      <div onclick="openBookingActionModal('${b.id}')" class="booking-card">
        <div class="row-center gap-3" style="min-width:0;flex:1;align-items:flex-start;">
          <div class="avatar-brand">${escapeHtml(initials)}</div>
          <div style="min-width:0;flex:1;">
            <div class="text-truncate" style="font-size:14px;font-weight:800;color:var(--text-dark);">${escapeHtml(b.clientName)}</div>
            <div class="text-truncate" style="font-size:12px;color:var(--text-muted);margin-top:2px;">${escapeHtml(serviceLabel)}</div>
            <div style="font-size:11px;color:var(--text-light);margin-top:5px;font-weight:600;">${escapeHtml(formatTime12h(b.time))} • ${escapeHtml(formatDatePretty(b.date))}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;flex-shrink:0;">
          ${badgeHtml}
          <div style="text-align:right;margin-top:8px;">
            <div class="row-center" style="gap:4px;justify-content:flex-end;">
              <span style="font-size:12.5px;font-weight:800;color:var(--brand-800);">${formatINR(b.totalAmount)}</span>
              <svg class="icon-16" style="color:var(--text-light);" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </div>
            <div style="font-size:10.5px;font-weight:700;color:${due > 0 ? '#d97706' : '#15803d'};margin-top:2px;">
              ${due > 0 ? `Paid: ${formatINR(b.advancePaid)} • Due: ${formatINR(due)}` : `Paid: ${formatINR(b.advancePaid)} (Full Paid)`}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. ADD / EDIT BOOKING SCREEN
function populateBookingServiceDropdown() {
  const select = document.getElementById('bfServiceSelect');
  if (!select) return;
  const currentVal = select.value;
  let html = `<option value="">Select service</option>`;
  appState.services.forEach(s => {
    html += `<option value="${escapeHtml(s.name)}" data-price="${s.price}" data-cat="${escapeHtml(s.category)}">${escapeHtml(s.name)} (${formatINR(s.price)})</option>`;
  });
  select.innerHTML = html;
  if (currentVal) select.value = currentVal;
}

function onBookingServiceSelectChange() {
  const select = document.getElementById('bfServiceSelect');
  if (!select) return;
  const selectedOpt = select.options[select.selectedIndex];
  if (selectedOpt && selectedOpt.dataset.price) {
    const totalInput = document.getElementById('bfTotalAmount');
    if (totalInput) totalInput.value = selectedOpt.dataset.price;
  }
  updateBookingBalancePreview();
}

function updateBookingBalancePreview() {
  const totalVal = Number(document.getElementById('bfTotalAmount')?.value) || 0;
  const rawAdv = document.getElementById('bfAdvancePaid')?.value ?? '';
  const advVal = rawAdv.trim() === '' ? 0 : Math.max(0, Number(rawAdv) || 0);
  const due = Math.max(0, totalVal - advVal);



  const previewEl = document.getElementById('bfBalanceDuePreview');
  if (previewEl) {
    if (totalVal > 0 || advVal > 0) {
      previewEl.classList.remove('hidden');
      previewEl.innerHTML = `
        <span>Total: <strong>${formatINR(totalVal)}</strong></span>
        <span>Received: <strong style="color:#15803d;">${formatINR(advVal)}</strong></span>
        <span>Pending: <strong style="color:${due > 0 ? '#d97706' : '#15803d'};">${formatINR(due)}</strong></span>
      `;
    } else {
      previewEl.classList.add('hidden');
    }
  }
}

function prepareNewBookingForm(prefillClient = null, prefillService = null) {
  const titleEl = document.getElementById('topBarSubTitle');
  if (titleEl && appState.activeScreen === 'add-booking') titleEl.textContent = 'Add Booking';
  document.getElementById('bfBookingId').value = '';
  document.getElementById('bfClientName').value = prefillClient ? prefillClient.name : '';
  document.getElementById('bfClientPhone').value = prefillClient ? prefillClient.phone : '';
  populateBookingServiceDropdown();
  const srvSelect = document.getElementById('bfServiceSelect');
  if (srvSelect) srvSelect.value = prefillService ? prefillService.name : '';
  document.getElementById('bfDate').value = getOffsetDateStr(0);
  document.getElementById('bfTime').value = '10:00';
  document.getElementById('bfTotalAmount').value = prefillService ? prefillService.price : '';
  document.getElementById('bfAdvancePaid').value = '';
  document.getElementById('bfPaymentMode').value = 'UPI';
  document.getElementById('bfStatus').value = 'Confirmed';
  document.getElementById('bfNotes').value = '';
  updateBookingBalancePreview();
}

function openEditBookingScreen(bookingId) {
  const b = appState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  closeBookingActionModal();
  navigateToScreen('add-booking', { preserveForm: true });
  const titleEl = document.getElementById('topBarSubTitle');
  if (titleEl) titleEl.textContent = 'Edit Booking';
  document.getElementById('bfBookingId').value = b.id;
  document.getElementById('bfClientName').value = b.clientName || '';
  document.getElementById('bfClientPhone').value = b.phone || '';
  populateBookingServiceDropdown();
  const firstSrv = (b.services && b.services[0]) ? b.services[0] : '';
  const srvSelect = document.getElementById('bfServiceSelect');
  if (srvSelect) {
    if (firstSrv && !Array.from(srvSelect.options).some(o => o.value === firstSrv)) {
      const opt = document.createElement('option');
      opt.value = firstSrv;
      opt.textContent = firstSrv;
      srvSelect.appendChild(opt);
    }
    srvSelect.value = firstSrv;
  }
  document.getElementById('bfDate').value = b.date || getOffsetDateStr(0);
  document.getElementById('bfTime').value = b.time || '10:00';
  document.getElementById('bfTotalAmount').value = b.totalAmount !== undefined ? b.totalAmount : '';
  document.getElementById('bfAdvancePaid').value = b.advancePaid ? b.advancePaid : '';
  document.getElementById('bfPaymentMode').value = b.paymentMode || 'UPI';
  document.getElementById('bfStatus').value = b.status || 'Confirmed';
  document.getElementById('bfNotes').value = b.notes || '';
  updateBookingBalancePreview();
}

function handleSaveBookingForm(e) {
  e.preventDefault();
  const id = document.getElementById('bfBookingId').value;
  const clientName = document.getElementById('bfClientName').value.trim();
  const phone = document.getElementById('bfClientPhone').value.trim();
  const serviceName = document.getElementById('bfServiceSelect').value || 'Bridal Makeup';
  const date = document.getElementById('bfDate').value || getOffsetDateStr(0);
  const time = document.getElementById('bfTime').value || '10:00';
  const srvObj = appState.services.find(s => s.name === serviceName);
  const totalAmountRaw = document.getElementById('bfTotalAmount').value.trim();
  const totalAmount = totalAmountRaw === '' ? (srvObj ? Number(srvObj.price) || 0 : 0) : Math.max(0, Number(totalAmountRaw) || 0);
  const advancePaidRaw = document.getElementById('bfAdvancePaid').value.trim();
  const advancePaid = advancePaidRaw === '' ? 0 : Math.max(0, Number(advancePaidRaw) || 0);
  const paymentMode = document.getElementById('bfPaymentMode').value || 'UPI';
  const status = document.getElementById('bfStatus').value || 'Confirmed';
  const notes = document.getElementById('bfNotes').value.trim();

  if (!clientName) {
    showToast('Please enter customer name');
    return;
  }

  if (Array.isArray(appState.deletedCustomers)) {
    const cKey = clientName.toLowerCase();
    appState.deletedCustomers = appState.deletedCustomers.filter(k => String(k).toLowerCase() !== cKey);
  }

  const syncedPayments = advancePaid > 0
    ? [{ date: getOffsetDateStr(0), amount: advancePaid, mode: paymentMode, note: 'Booking Payment' }]
    : [];

  if (id) {
    const idx = appState.bookings.findIndex(x => x.id === id);
    if (idx > -1) {
      appState.bookings[idx] = {
        ...appState.bookings[idx],
        clientName, phone, services: [serviceName],
        category: srvObj ? srvObj.category : 'Makeup',
        date, time, totalAmount, advancePaid, paymentMode, status, notes,
        payments: syncedPayments
      };
    }
    showToast('Booking updated');
  } else {
    appState.bookings.unshift({
      id: 'bk-' + Date.now(),
      clientName,
      phone: phone || '+91 98765 43210',
      date, time,
      category: srvObj ? srvObj.category : 'Makeup',
      services: [serviceName],
      totalAmount, advancePaid, paymentMode, status, notes,
      bookingHistoryCount: 1,
      payments: syncedPayments
    });
    showToast('Booking saved');
  }

  saveStorage();
  navigateToScreen('bookings');
  if (date === getOffsetDateStr(0)) {
    setTimeout(() => triggerTodayOrdersDeviceNotification(false), 350);
  }
}

// 4. HISAB SCREEN
function setHisabFilter(filter) {
  appState.hisabFilter = filter;
  renderHisabScreen();
}

function renderHisabScreen() {
  let totalBilled = 0;
  let totalReceived = 0;
  let totalPending = 0;

  appState.bookings.forEach(b => {
    const t = Number(b.totalAmount) || 0;
    const r = Math.min(t, Number(b.advancePaid) || 0);
    const p = Math.max(0, t - r);
    totalBilled += t;
    totalReceived += r;
    totalPending += p;
  });

  const elTotal = document.getElementById('hisabTotalCollection');
  const elRec = document.getElementById('hisabReceivedAmount');
  const elPend = document.getElementById('hisabPendingAmount');

  if (elTotal) elTotal.textContent = formatINR(totalBilled);
  if (elRec) elRec.textContent = formatINR(totalReceived);
  if (elPend) elPend.textContent = formatINR(totalPending);

  const txContainer = document.getElementById('hisabTransactionsList');
  if (!txContainer) return;

  let rows = [];
  appState.bookings.forEach(b => {
    const due = getBalance(b);
    const paid = Number(b.advancePaid) || 0;
    if (due > 0 && b.status === 'Pending') {
      rows.push({ bookingId: b.id, clientName: b.clientName, date: b.date, modeLabel: 'Pending', amount: due, type: 'Pending' });
    }
    if (paid > 0) {
      rows.push({ bookingId: b.id, clientName: b.clientName, date: b.date, modeLabel: b.paymentMode || 'UPI', amount: paid, type: 'Received' });
    }
    if (due > 0 && b.status !== 'Pending') {
      rows.push({ bookingId: b.id, clientName: b.clientName, date: b.date, modeLabel: 'Pending', amount: due, type: 'Pending' });
    }
  });

  if (appState.hisabFilter === 'received') rows = rows.filter(r => r.type === 'Received');
  else if (appState.hisabFilter === 'pending') rows = rows.filter(r => r.type === 'Pending');

  if (rows.length === 0) {
    txContainer.innerHTML = `<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--text-muted);">No transactions found.</div>`;
    return;
  }

  txContainer.innerHTML = rows.map(r => {
    const initials = getInitials(r.clientName);
    const isPending = r.type === 'Pending';
    const badgeHtml = isPending
      ? `<span class="status-pill status-pending">Pending</span>`
      : `<span class="status-pill status-confirmed">Received</span>`;

    return `
      <div onclick="openBookingActionModal('${r.bookingId}')" class="list-row">
        <div class="row-center gap-3" style="min-width:0;flex:1;">
          <div class="avatar-soft">${escapeHtml(initials)}</div>
          <div style="min-width:0;flex:1;">
            <div class="text-truncate" style="font-size:13.5px;font-weight:800;color:var(--text-dark);">${escapeHtml(r.clientName)}</div>
            <div style="font-size:11.5px;color:var(--text-light);margin-top:2px;">${escapeHtml(formatDatePretty(r.date))} • ${escapeHtml(r.modeLabel)}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
          <div style="font-size:13.5px;font-weight:800;color:var(--text-dark);">${formatINR(r.amount)}</div>
          ${badgeHtml}
        </div>
      </div>
    `;
  }).join('');
}

// 5. SERVICES SCREEN
function setServiceFilter(cat) {
  appState.serviceFilter = cat;
  document.querySelectorAll('.service-filter-pill').forEach(btn => {
    if (btn.dataset.cat === cat) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderServicesScreen();
}

function renderServicesScreen() {
  const container = document.getElementById('servicesListContainer');
  if (!container) return;

  const filtered = appState.services.filter(s => {
    if (appState.serviceFilter === 'All') return true;
    return normalizeCategory(s.category) === appState.serviceFilter;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--text-muted);">No services in this category. Tap + to add one!</div>`;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const iconSvg = getServiceSvgIcon(s.iconType || guessServiceIcon(s.name, s.category));
    return `
      <div onclick="openServiceItemModal('${s.id}')" class="list-row">
        <div class="row-center gap-3" style="min-width:0;flex:1;">
          <div class="avatar-soft">${iconSvg}</div>
          <div style="min-width:0;flex:1;">
            <div class="text-truncate" style="font-size:14px;font-weight:800;color:var(--text-dark);">${escapeHtml(s.name)}</div>
            <div style="font-size:11.5px;color:var(--text-light);margin-top:2px;">${escapeHtml(s.duration || '1 Hour')}</div>
          </div>
        </div>
        <div class="row-center gap-2" style="flex-shrink:0;">
          <span style="font-size:14px;font-weight:800;color:var(--text-dark);">${formatINR(s.price)}</span>
          <svg class="icon-16" style="color:var(--text-light);" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </div>
      </div>
    `;
  }).join('');
}

// 6. CUSTOMERS SCREEN
function getCustomerDirectoryList() {
  const deletedSet = new Set((appState.deletedCustomers || []).map(k => String(k || '').trim().toLowerCase()));
  const map = new Map();
  appState.bookings.forEach(b => {
    const key = (b.clientName || '').trim().toLowerCase();
    if (!key || deletedSet.has(key)) return;
    if (!map.has(key)) {
      map.set(key, {
        name: b.clientName,
        phone: b.phone || '+91 98765 43210',
        count: b.bookingHistoryCount || 1,
        actualBookings: 1,
        totalSpent: Number(b.totalAmount) || 0,
        pendingDue: getBalance(b)
      });
    } else {
      const existing = map.get(key);
      existing.actualBookings += 1;
      existing.count = Math.max(existing.count, existing.actualBookings);
      existing.totalSpent += Number(b.totalAmount) || 0;
      existing.pendingDue += getBalance(b);
    }
  });
  (appState.customCustomers || []).forEach(c => {
    const key = (c.name || '').trim().toLowerCase();
    if (!key || deletedSet.has(key)) return;
    if (!map.has(key)) {
      map.set(key, { name: c.name, phone: c.phone || '+91 98765 43210', count: Number(c.count) || 1, actualBookings: 0, totalSpent: 0, pendingDue: 0 });
    }
  });
  return Array.from(map.values());
}

function renderCustomersScreen() {
  const container = document.getElementById('customersListContainer');
  if (!container) return;

  const q = (document.getElementById('customerSearchInput')?.value || '').trim().toLowerCase();
  let list = getCustomerDirectoryList();
  if (q) list = list.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(q));

  if (list.length === 0) {
    container.innerHTML = `<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--text-muted);">No customers found.</div>`;
    return;
  }

  container.innerHTML = list.map(c => {
    const initials = getInitials(c.name);
    const bookingWord = c.count === 1 ? '1 Booking' : `${c.count} Bookings`;
    const safeNameArg = escapeHtml(String(c.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
    return `
      <div onclick="openCustomerDetailModal('${safeNameArg}')" class="list-row">
        <div class="row-center gap-3" style="min-width:0;flex:1;">
          <div class="avatar-soft">${escapeHtml(initials)}</div>
          <div style="min-width:0;flex:1;">
            <div class="text-truncate" style="font-size:14px;font-weight:800;color:var(--text-dark);">${escapeHtml(c.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${escapeHtml(c.phone)}</div>
            <div style="font-size:11px;color:var(--text-light);margin-top:2px;font-weight:600;">${bookingWord}${c.pendingDue > 0 ? ` • <span style="color:#d97706;font-weight:700;">${formatINR(c.pendingDue)} Due</span>` : ''}</div>
          </div>
        </div>
        <div class="row-center gap-2" style="flex-shrink:0;">
          <button type="button" onclick="event.stopPropagation(); deleteCustomerFromDirectory('${safeNameArg}')" title="Delete Customer" style="width:32px;height:32px;border-radius:10px;border:none;background:#fee2e2;color:#b91c1c;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
            <svg class="icon-16" fill="none" stroke="currentColor" stroke-width="2.1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
          <svg class="icon-16" style="color:var(--text-light);" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </div>
      </div>
    `;
  }).join('');
}

// 7. JEWELLERY TRACKER SCREEN
function getEffectiveJewelleryStatus(j) {
  if (!j) return 'In Stock';
  const st = String(j.stockStatus || '').trim();
  if (st === 'Issued' || st === 'Returned') return st;
  if (j.clientName && String(j.clientName).trim() !== '') return 'Issued';
  return 'In Stock';
}

function setJewelleryFilter(filter) {
  appState.jewelleryFilter = filter || 'All';
  document.querySelectorAll('.jewellery-filter-pill').forEach(btn => {
    if (btn.dataset.filter === appState.jewelleryFilter) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderJewelleryScreen();
}

function renderJewelleryScreen() {
  const container = document.getElementById('jewelleryListContainer');
  if (!container) return;

  const allRentals = Array.isArray(appState.rentals) ? appState.rentals : [];
  // Normalize any item in-memory if needed
  allRentals.forEach(j => {
    j.stockStatus = getEffectiveJewelleryStatus(j);
  });

  const counts = {
    'All': allRentals.length,
    'In Stock': allRentals.filter(j => j.stockStatus === 'In Stock').length,
    'Issued': allRentals.filter(j => j.stockStatus === 'Issued').length,
    'Returned': allRentals.filter(j => j.stockStatus === 'Returned').length
  };

  document.querySelectorAll('.jewellery-filter-pill').forEach(btn => {
    const f = btn.dataset.filter;
    if (f && counts[f] !== undefined) {
      btn.textContent = `${f} (${counts[f]})`;
    }
    if (f === appState.jewelleryFilter) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  let list = allRentals;
  if (appState.jewelleryFilter && appState.jewelleryFilter !== 'All') {
    list = allRentals.filter(j => j.stockStatus === appState.jewelleryFilter);
  }

  if (list.length === 0) {
    container.innerHTML = `<div style="padding:24px;text-align:center;font-size:12.5px;color:var(--text-muted);">No jewellery items in "${escapeHtml(appState.jewelleryFilter)}".</div>`;
    return;
  }

  container.innerHTML = list.map(j => {
    const svgIcon = getJewellerySvgIcon(j.itemType || guessJewelleryType(j.itemName));
    let badgeHtml = `<span class="status-pill status-confirmed">In Stock</span>`;
    if (j.stockStatus === 'Issued') badgeHtml = `<span class="status-pill status-issued">Issued</span>`;
    else if (j.stockStatus === 'Returned') badgeHtml = `<span class="status-pill status-returned">Returned</span>`;

    const clientSub = j.clientName
      ? `<div style="font-size:11.5px;color:var(--brand-800);font-weight:700;margin-top:3px;">👤 ${escapeHtml(j.clientName)}${j.phone ? ' • ' + escapeHtml(j.phone) : ''}${j.depositAmount ? ' • Dep: ' + formatINR(j.depositAmount) : ''}</div>`
      : `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Security Deposit: ${formatINR(j.depositAmount || 0)}</div>`;

    let dateSub = '';
    if (j.stockStatus === 'Issued') {
      dateSub = `<div style="font-size:10.5px;color:#b45309;font-weight:600;margin-top:2px;">📅 Issued: ${escapeHtml(formatDatePretty(j.issueDate || getOffsetDateStr(0)))} • Due: ${escapeHtml(formatDatePretty(j.dueDate || getOffsetDateStr(1)))}</div>`;
    } else if (j.stockStatus === 'Returned' && j.returnDate) {
      dateSub = `<div style="font-size:10.5px;color:#15803d;font-weight:600;margin-top:2px;">✅ Returned on ${escapeHtml(formatDatePretty(j.returnDate))}</div>`;
    }

    let quickActionHtml = '';
    if (j.stockStatus === 'In Stock') {
      quickActionHtml = `
        <button type="button" onclick="event.stopPropagation(); openIssueJewelleryQuick('${j.id}')" style="padding:5px 10px;border-radius:8px;border:1px solid var(--brand-300);background:var(--brand-50);color:var(--brand-800);font-size:11px;font-weight:800;cursor:pointer;">
          Issue →
        </button>`;
    } else if (j.stockStatus === 'Issued') {
      quickActionHtml = `
        <div class="row-center gap-1" style="margin-top:4px;">
          <button type="button" onclick="event.stopPropagation(); quickUpdateJewelleryStatus('${j.id}', 'Returned')" style="padding:5px 9px;border-radius:8px;border:none;background:#dcfce7;color:#15803d;font-size:10.5px;font-weight:800;cursor:pointer;">
            ✓ Return
          </button>
          <button type="button" onclick="event.stopPropagation(); sendJewelleryWhatsAppById('${j.id}')" style="padding:5px 8px;border-radius:8px;border:none;background:#16a34a;color:#fff;font-size:10.5px;font-weight:800;cursor:pointer;" title="Send WhatsApp Reminder">
            WA
          </button>
        </div>`;
    } else if (j.stockStatus === 'Returned') {
      quickActionHtml = `
        <button type="button" onclick="event.stopPropagation(); quickUpdateJewelleryStatus('${j.id}', 'In Stock')" style="margin-top:4px;padding:5px 9px;border-radius:8px;border:1px solid var(--border-color);background:#fff;color:var(--text-dark);font-size:10.5px;font-weight:700;cursor:pointer;">
          ↺ In Stock
        </button>`;
    }

    return `
      <div onclick="openJewelleryActionModal('${j.id}')" class="list-row" style="align-items:flex-start;">
        <div class="row-center gap-3" style="min-width:0;flex:1;align-items:flex-start;">
          <div class="avatar-jewellery" style="margin-top:2px;">${svgIcon}</div>
          <div style="min-width:0;flex:1;">
            <div class="text-truncate" style="font-size:14px;font-weight:800;color:var(--text-dark);">${escapeHtml(j.itemName)}</div>
            <div style="font-size:11.5px;color:var(--text-light);margin-top:1px;">ID: ${escapeHtml(j.code || 'J001')}</div>
            ${clientSub}
            ${dateSub}
          </div>
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          ${badgeHtml}
          ${quickActionHtml}
        </div>
      </div>
    `;
  }).join('');
}

// --- MODALS ---
function openBookingActionModal(bookingId) {
  const b = appState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const due = getBalance(b);
  const serviceLabel = (b.services && b.services.length) ? b.services.join(', ') : (b.category || 'Makeup Service');
  const body = document.getElementById('bookingActionModalBody');
  if (body) {
    body.innerHTML = `
      <div class="row-center gap-3" style="padding-bottom:12px;border-bottom:1px solid var(--border-color);">
        <div class="avatar-brand">${escapeHtml(getInitials(b.clientName))}</div>
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text-dark);">${escapeHtml(b.clientName)}</div>
          <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(b.phone || '')}</div>
        </div>
      </div>
      <div class="grid-2" style="margin:12px 0;font-size:12px;">
        <div style="padding:10px;border-radius:12px;background:var(--brand-50);">
          <span style="color:var(--text-muted);display:block;">Service</span>
          <strong style="color:var(--text-dark);">${escapeHtml(serviceLabel)}</strong>
        </div>
        <div style="padding:10px;border-radius:12px;background:var(--brand-50);">
          <span style="color:var(--text-muted);display:block;">Date & Time</span>
          <strong style="color:var(--text-dark);">${escapeHtml(formatTime12h(b.time))} • ${escapeHtml(formatDatePretty(b.date))}</strong>
        </div>
        <div style="padding:10px;border-radius:12px;background:#dcfce7;">
          <span style="color:#15803d;display:block;">Received (${escapeHtml(b.paymentMode || 'UPI')})</span>
          <strong style="color:#15803d;font-size:14px;">${formatINR(b.advancePaid)}</strong>
        </div>
        <div style="padding:10px;border-radius:12px;background:${due > 0 ? '#fef3c7' : '#dcfce7'};">
          <span style="color:${due > 0 ? '#d97706' : '#15803d'};display:block;">${due > 0 ? 'Pending Balance' : 'Payment Status'}</span>
          <strong style="color:${due > 0 ? '#d97706' : '#15803d'};font-size:14px;">${due > 0 ? formatINR(due) : 'Full Paid (₹ 0)'}</strong>
        </div>
      </div>
      ${b.notes ? `<div style="font-size:12px;color:var(--text-muted);background:var(--brand-50);padding:10px;border-radius:10px;margin-bottom:12px;">Note: ${escapeHtml(b.notes)}</div>` : ''}
      ${due > 0 ? `
        <div style="padding:12px;border-radius:12px;background:var(--brand-50);border:1px solid var(--border-color);margin-bottom:12px;">
          <label class="field-label">Collect Balance Payment (₹)</label>
          <div class="row-center gap-2">
            <input id="quickCollectInput" type="number" value="${due}" class="m-input no-icon" style="padding:8px 10px;" />
            <select id="quickCollectMode" class="m-input no-icon" style="padding:8px 10px;width:95px;">
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>
            <button onclick="collectQuickPayment('${b.id}')" class="btn-primary-brand" style="width:auto;padding:9px 14px;font-size:12px;">Receive</button>
          </div>
        </div>
      ` : ''}
      <div class="grid-2" style="margin-bottom:8px;">
        <button onclick="sendWhatsAppBookingReceipt('${b.id}')" style="padding:11px;border-radius:12px;border:none;background:#16a34a;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">WhatsApp Receipt</button>
        <button onclick="sendWhatsAppBookingReminder('${b.id}')" style="padding:11px;border-radius:12px;border:none;background:#0d9488;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">WhatsApp Reminder</button>
      </div>
      <div style="margin-bottom:8px;">
        <button onclick="sendWhatsAppPaymentPendingReminder('${b.id}')" style="width:100%;padding:11px;border-radius:12px;border:none;background:#d97706;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">WhatsApp Payment Pending${due > 0 ? ' (' + formatINR(due) + ')' : ''}</button>
      </div>
      <div class="grid-3">
        <button onclick="openEditBookingScreen('${b.id}')" style="padding:10px 8px;border-radius:12px;border:none;background:var(--brand-100);color:var(--brand-900);font-size:11.5px;font-weight:700;cursor:pointer;">Edit</button>
        <button onclick="toggleBookingStatusQuick('${b.id}')" style="padding:10px 8px;border-radius:12px;border:none;background:#e0e7ff;color:#3730a3;font-size:11.5px;font-weight:700;cursor:pointer;">${escapeHtml(b.status || 'Confirmed')}</button>
        <button onclick="deleteBookingById('${b.id}')" style="padding:10px 8px;border-radius:12px;border:none;background:#fee2e2;color:#b91c1c;font-size:11.5px;font-weight:700;cursor:pointer;">Delete</button>
      </div>
    `;
  }
  document.getElementById('bookingActionModal').classList.remove('hidden');
}

function closeBookingActionModal() {
  document.getElementById('bookingActionModal').classList.add('hidden');
}

function collectQuickPayment(bookingId) {
  const b = appState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const amt = Number(document.getElementById('quickCollectInput')?.value) || 0;
  const mode = document.getElementById('quickCollectMode')?.value || 'UPI';
  if (amt <= 0) return;
  b.advancePaid = Math.min(Number(b.totalAmount) || 0, (Number(b.advancePaid) || 0) + amt);
  b.paymentMode = mode;
  
  if (!Array.isArray(b.payments)) b.payments = [];
  b.payments.push({ date: getOffsetDateStr(0), amount: amt, mode, note: 'Balance Collected' });
  saveStorage();
  renderAll();
  closeBookingActionModal();
  showToast(`Received ${formatINR(amt)} via ${mode}`);
}

function toggleBookingStatusQuick(bookingId) {
  const b = appState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const order = ['Confirmed', 'Pending', 'Completed'];
  b.status = order[(order.indexOf(b.status || 'Confirmed') + 1) % order.length];
  saveStorage();
  renderAll();
  if (b.status === 'Completed') {
    closeBookingActionModal();
    showToast('Moved to Completed section');
  } else {
    openBookingActionModal(bookingId);
    showToast(`Status: ${b.status}`);
  }
}

function deleteBookingById(bookingId) {
  appState.bookings = appState.bookings.filter(x => x.id !== bookingId);
  saveStorage();
  renderAll();
  closeBookingActionModal();
  showToast('Booking removed');
}

function sendWhatsAppBookingReceipt(bookingId) {
  const b = appState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const due = getBalance(b);
  const serviceLabel = (b.services && b.services.length) ? b.services.join(', ') : 'Makeup Service';
  const paymentStatusLine = due <= 0
    ? `✅ *Payment Status:* Fully Paid`
    : `⏳ *Balance Due:* *${formatINR(due)}*`;
  const notesLine = b.notes ? `\n📝 *Special Note:* _${b.notes}_\n` : '';

  const msg =
    `✨ *NAAZ MAKEUP STUDIO* ✨\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
    `💐 *BOOKING CONFIRMATION*\n\n` +
    `Thank you for booking with *Naaz Makeup Studio*! Here are your appointment details:\n\n` +
    `👤 *Client Name:* ${b.clientName}\n` +
    `💄 *Service:* ${serviceLabel}\n` +
    `📅 *Date:* ${formatDatePretty(b.date)}\n` +
    `⏰ *Time:* ${formatTime12h(b.time)}\n` +
    `📌 *Booking Status:* ${b.status || 'Confirmed'}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💳 *PAYMENT SUMMARY*\n` +
    `• *Total Bill:* ${formatINR(b.totalAmount)}\n` +
    `• *Payment Received:* ${formatINR(b.advancePaid)} (${b.paymentMode || 'UPI'})\n` +
    `• ${paymentStatusLine}\n` +
    `${notesLine}` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🌸 _We look forward to making your special day even more beautiful!_\n` +
    `📍 *Naaz Makeup Studio*`;

  const cleanPhone = String(b.phone || '').replace(/\D/g, '');
  const phoneParam = cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : '';
  window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

function sendWhatsAppBookingReminder(bookingId) {
  const b = appState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const due = getBalance(b);
  const serviceLabel = (b.services && b.services.length) ? b.services.join(', ') : 'Makeup Service';
  const dueLine = due > 0
    ? `• *Pending Balance:* ${formatINR(due)} _(Total: ${formatINR(b.totalAmount)}, Paid: ${formatINR(b.advancePaid)})_\n`
    : `• *Payment Status:* Fully Paid (${formatINR(b.totalAmount)}) ✅\n`;

  const msg =
    `✨ *NAAZ MAKEUP STUDIO* ✨\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔔 *APPOINTMENT REMINDER*\n\n` +
    `This is a gentle reminder for your upcoming appointment at *Naaz Makeup Studio*:\n\n` +
    `👤 *Client Name:* ${b.clientName}\n` +
    `💄 *Service:* ${serviceLabel}\n` +
    `📅 *Date:* ${formatDatePretty(b.date)}\n` +
    `⏰ *Time:* ${formatTime12h(b.time)}\n` +
    `${dueLine}` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✨ _Please arrive 10–15 minutes prior to your scheduled time so we can give you the best experience._\n\n` +
    `See you soon! 💖\n` +
    `📍 *Naaz Makeup Studio*`;

  const cleanPhone = String(b.phone || '').replace(/\D/g, '');
  const phoneParam = cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : '';
  window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

function sendWhatsAppPaymentPendingReminder(bookingId) {
  const b = appState.bookings.find(x => x.id === bookingId);
  if (!b) return;
  const due = getBalance(b);
  const serviceLabel = (b.services && b.services.length) ? b.services.join(', ') : 'Makeup Service';

  const msg =
    `✨ *NAAZ MAKEUP STUDIO* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💳 *PAYMENT PENDING REMINDER*\n\n` +
    `This is a gentle reminder regarding your pending balance payment at *Naaz Makeup Studio*:\n\n` +
    `👤 *Client Name:* ${b.clientName}\n` +
    `💄 *Service:* ${serviceLabel}\n` +
    `📅 *Date:* ${formatDatePretty(b.date)}\n` +
    `⏰ *Time:* ${formatTime12h(b.time)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *PAYMENT SUMMARY*\n` +
    `• *Total Bill:* ${formatINR(b.totalAmount)}\n` +
    `• *Payment Received:* ${formatINR(b.advancePaid)}\n` +
    `• ⏳ *Pending Balance:* *${formatINR(due)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🙏 _Kindly clear your pending balance of *${formatINR(due)}* at your earliest convenience. Thank you for choosing us!_\n\n` +
    `📍 *Naaz Makeup Studio*`;

  const cleanPhone = String(b.phone || '').replace(/\D/g, '');
  const phoneParam = cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : '';
  window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

// --- SERVICE MODAL ---
function openAddServiceModal(serviceId = null) {
  const s = serviceId ? appState.services.find(x => x.id === serviceId) : null;
  document.getElementById('serviceModalTitle').textContent = s ? 'Edit Service' : 'Add New Service';
  document.getElementById('smServiceId').value = s ? s.id : '';
  document.getElementById('smName').value = s ? s.name : '';
  document.getElementById('smCategory').value = s ? normalizeCategory(s.category) : 'Makeup';
  document.getElementById('smDuration').value = s ? (s.duration || '1 Hour') : '1 Hour';
  document.getElementById('smPrice').value = s ? s.price : '';
  const delBtn = document.getElementById('smDeleteBtn');
  if (delBtn) {
    if (s) delBtn.classList.remove('hidden');
    else delBtn.classList.add('hidden');
  }
  document.getElementById('serviceModal').classList.remove('hidden');
}

function openServiceItemModal(serviceId) {
  openAddServiceModal(serviceId);
}

function closeServiceModal() {
  document.getElementById('serviceModal').classList.add('hidden');
}

function handleSaveService(e) {
  e.preventDefault();
  const id = document.getElementById('smServiceId').value;
  const name = document.getElementById('smName').value.trim();
  const category = document.getElementById('smCategory').value;
  const duration = document.getElementById('smDuration').value.trim() || '1 Hour';
  const price = Number(document.getElementById('smPrice').value) || 500;
  if (!name) return;

  if (id) {
    const idx = appState.services.findIndex(x => x.id === id);
    if (idx > -1) {
      appState.services[idx] = { ...appState.services[idx], name, category, duration, price, iconType: guessServiceIcon(name, category) };
    }
  } else {
    appState.services.push({ id: 'srv-' + Date.now(), name, category, duration, price, iconType: guessServiceIcon(name, category) });
  }
  saveStorage();
  renderAll();
  closeServiceModal();
  showToast('Service saved');
}

function deleteCurrentService() {
  const id = document.getElementById('smServiceId').value;
  if (!id) return;
  appState.services = appState.services.filter(x => x.id !== id);
  saveStorage();
  renderAll();
  closeServiceModal();
  showToast('Service deleted');
}

function bookThisServiceNow() {
  const id = document.getElementById('smServiceId').value;
  const s = appState.services.find(x => x.id === id);
  closeServiceModal();
  navigateToScreen('add-booking', { prefillService: s || null });
}

// --- CUSTOMER MODAL ---
function openAddCustomerModal() {
  document.getElementById('cmName').value = '';
  document.getElementById('cmPhone').value = '+91 ';
  document.getElementById('addCustomerModal').classList.remove('hidden');
}

function closeAddCustomerModal() {
  document.getElementById('addCustomerModal').classList.add('hidden');
}

function handleSaveCustomer(e) {
  e.preventDefault();
  const name = document.getElementById('cmName').value.trim();
  const phone = document.getElementById('cmPhone').value.trim() || '+91 98765 43210';
  if (!name) return;
  if (Array.isArray(appState.deletedCustomers)) {
    const cKey = name.toLowerCase();
    appState.deletedCustomers = appState.deletedCustomers.filter(k => String(k).toLowerCase() !== cKey);
  }
  if (!Array.isArray(appState.customCustomers)) appState.customCustomers = [];
  appState.customCustomers = appState.customCustomers.filter(c => String(c.name || '').trim().toLowerCase() !== name.toLowerCase());
  appState.customCustomers.unshift({ name, phone, count: 1 });
  saveStorage();
  renderAll();
  closeAddCustomerModal();
  showToast('Customer added');
}

function deleteCustomerFromDirectory(customerName) {
  const key = String(customerName || '').trim().toLowerCase();
  if (!key) return;
  if (!Array.isArray(appState.deletedCustomers)) appState.deletedCustomers = [];
  if (!appState.deletedCustomers.some(k => String(k).toLowerCase() === key)) {
    appState.deletedCustomers.push(key);
  }
  if (Array.isArray(appState.customCustomers)) {
    appState.customCustomers = appState.customCustomers.filter(c => String(c.name || '').trim().toLowerCase() !== key);
  }
  saveStorage();
  renderAll();
  closeCustomerDetailModal();
  showToast('Customer deleted');
}

function openCustomerDetailModal(customerName) {
  const list = getCustomerDirectoryList();
  const c = list.find(x => x.name.toLowerCase() === String(customerName).toLowerCase());
  if (!c) return;
  const clientBookings = appState.bookings.filter(b => b.clientName.toLowerCase() === c.name.toLowerCase());
  const safeNameArg = escapeHtml(String(c.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
  const safePhoneArg = escapeHtml(String(c.phone || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
  const body = document.getElementById('customerDetailModalBody');
  if (body) {
    body.innerHTML = `
      <div class="row-center gap-3" style="padding-bottom:12px;border-bottom:1px solid var(--border-color);">
        <div class="avatar-brand">${escapeHtml(getInitials(c.name))}</div>
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text-dark);">${escapeHtml(c.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(c.phone)} • ${c.count} Bookings</div>
        </div>
      </div>
      <div style="margin:12px 0;max-height:180px;overflow-y:auto;">
        ${clientBookings.length ? clientBookings.map(b => `
          <div class="row-between" style="padding:10px;border-radius:10px;background:var(--brand-50);margin-bottom:6px;font-size:12px;">
            <div>
              <strong style="color:var(--text-dark);display:block;">${escapeHtml((b.services || []).join(', '))}</strong>
              <span style="color:var(--text-muted);">${escapeHtml(formatDatePretty(b.date))} • ${escapeHtml(formatTime12h(b.time))}</span>
            </div>
            <strong style="color:var(--brand-800);">${formatINR(b.totalAmount)}</strong>
          </div>
        `).join('') : '<p style="font-size:12px;color:var(--text-light);text-align:center;padding:12px;">No bookings yet.</p>'}
      </div>
      <div class="row-center gap-2">
        <button onclick="bookForCustomer('${safeNameArg}', '${safePhoneArg}')" class="btn-primary-brand" style="flex:1;">+ New Booking</button>
        <button onclick="deleteCustomerFromDirectory('${safeNameArg}')" style="padding:13.5px 16px;border-radius:13px;border:none;background:#fee2e2;color:#b91c1c;font-size:13px;font-weight:800;cursor:pointer;">Delete</button>
      </div>
    `;
  }
  document.getElementById('customerDetailModal').classList.remove('hidden');
}

function closeCustomerDetailModal() {
  document.getElementById('customerDetailModal').classList.add('hidden');
}

function bookForCustomer(name, phone) {
  closeCustomerDetailModal();
  navigateToScreen('add-booking', { prefillClient: { name, phone } });
}

// --- JEWELLERY MODAL ---
let jmStatusManuallyChanged = false;

function openAddJewelleryModal(jewId = null, forceIssueMode = false) {
  const j = jewId ? appState.rentals.find(x => x.id === jewId) : null;
  jmStatusManuallyChanged = false;

  document.getElementById('jewModalTitle').textContent = j
    ? (forceIssueMode ? 'Issue Jewellery to Customer' : 'Manage Jewellery Item')
    : 'Add / Issue Jewellery';
  document.getElementById('jmId').value = j ? j.id : '';
  document.getElementById('jmCode').value = j ? j.code : `J00${(appState.rentals?.length || 0) + 1}`;
  document.getElementById('jmName').value = j ? j.itemName : '';

  let initialStatus = j ? getEffectiveJewelleryStatus(j) : (appState.jewelleryFilter === 'Issued' ? 'Issued' : 'In Stock');
  if (forceIssueMode) initialStatus = 'Issued';
  document.getElementById('jmStatus').value = initialStatus;

  document.getElementById('jmClientName').value = j ? (j.clientName || '') : '';
  document.getElementById('jmPhone').value = j ? (j.phone || '') : '';
  document.getElementById('jmDeposit').value = j ? (j.depositAmount || 0) : 2000;

  const issueDateEl = document.getElementById('jmIssueDate');
  const dueDateEl = document.getElementById('jmDueDate');
  if (issueDateEl) issueDateEl.value = (j && j.issueDate) ? j.issueDate : getOffsetDateStr(0);
  if (dueDateEl) dueDateEl.value = (j && j.dueDate) ? j.dueDate : getOffsetDateStr(1);

  const delBtn = document.getElementById('jmDeleteBtn');
  const waBtn = document.getElementById('jmWhatsAppBtn');
  if (delBtn) {
    if (j) delBtn.classList.remove('hidden');
    else delBtn.classList.add('hidden');
  }
  if (waBtn) {
    if ((j && j.clientName) || initialStatus === 'Issued') waBtn.classList.remove('hidden');
    else waBtn.classList.add('hidden');
  }
  document.getElementById('jewelleryModal').classList.remove('hidden');

  if (forceIssueMode) {
    setTimeout(() => {
      const cInput = document.getElementById('jmClientName');
      if (cInput) cInput.focus();
    }, 80);
  }
}

function openIssueJewelleryQuick(jewId) {
  openAddJewelleryModal(jewId, true);
}

function openJewelleryActionModal(jewId) {
  openAddJewelleryModal(jewId, false);
}

function onJewelleryClientInput() {
  const clientName = (document.getElementById('jmClientName')?.value || '').trim();
  const statusEl = document.getElementById('jmStatus');
  const waBtn = document.getElementById('jmWhatsAppBtn');
  if (!statusEl) return;

  // Automatically switch status from "In Stock" to "Issued" as soon as a customer name is typed
  if (clientName.length > 0 && !jmStatusManuallyChanged && statusEl.value === 'In Stock') {
    statusEl.value = 'Issued';
  } else if (clientName.length === 0 && !jmStatusManuallyChanged && statusEl.value === 'Issued') {
    const id = document.getElementById('jmId')?.value;
    const existing = id ? appState.rentals.find(x => x.id === id) : null;
    if (!existing || existing.stockStatus === 'In Stock') {
      statusEl.value = 'In Stock';
    }
  }

  if (waBtn) {
    if (clientName.length > 0) waBtn.classList.remove('hidden');
    else waBtn.classList.add('hidden');
  }
}

function onJewelleryStatusChange() {
  jmStatusManuallyChanged = true;
  const statusEl = document.getElementById('jmStatus');
  if (!statusEl) return;
  if (statusEl.value === 'In Stock') {
    // If user manually switches back to In Stock, clear customer fields so item is ready for stock
    const cInput = document.getElementById('jmClientName');
    const pInput = document.getElementById('jmPhone');
    if (cInput) cInput.value = '';
    if (pInput) pInput.value = '';
  }
}

function closeJewelleryModal() {
  document.getElementById('jewelleryModal').classList.add('hidden');
}

function quickUpdateJewelleryStatus(jewId, newStatus) {
  const idx = appState.rentals.findIndex(x => x.id === jewId);
  if (idx === -1) return;
  const item = appState.rentals[idx];
  item.stockStatus = newStatus;
  if (newStatus === 'Returned') {
    item.returnDate = getOffsetDateStr(0);
  } else if (newStatus === 'In Stock') {
    item.clientName = '';
    item.phone = '';
    item.returnDate = '';
  }
  saveStorage();
  renderAll();
  showToast(newStatus === 'Returned' ? 'Jewellery marked Returned' : 'Moved back to In Stock');
}

function handleSaveJewellery(e) {
  e.preventDefault();
  const id = document.getElementById('jmId').value;
  const code = document.getElementById('jmCode').value.trim() || 'J001';
  const itemName = document.getElementById('jmName').value.trim();
  let stockStatus = document.getElementById('jmStatus').value;
  let clientName = document.getElementById('jmClientName').value.trim();
  let phone = document.getElementById('jmPhone').value.trim();
  const depositAmount = Number(document.getElementById('jmDeposit').value) || 0;
  const issueDate = document.getElementById('jmIssueDate')?.value || getOffsetDateStr(0);
  const dueDate = document.getElementById('jmDueDate')?.value || getOffsetDateStr(1);
  if (!itemName) return;

  const existing = id ? appState.rentals.find(x => x.id === id) : null;

  // Smart status resolution:
  // 1) If customer name is filled and status is still "In Stock" (user didn't explicitly reset an issued item back to In Stock), mark it "Issued"!
  if (clientName && stockStatus === 'In Stock') {
    if (!(existing && existing.stockStatus !== 'In Stock' && jmStatusManuallyChanged)) {
      stockStatus = 'Issued';
    }
  }
  // 2) If status is explicitly set to "In Stock", clear customer details so it doesn't stay attached to old customer
  if (stockStatus === 'In Stock') {
    clientName = '';
    phone = '';
  }

  const returnDate = stockStatus === 'Returned'
    ? ((existing && existing.returnDate) ? existing.returnDate : getOffsetDateStr(0))
    : '';

  if (id) {
    const idx = appState.rentals.findIndex(x => x.id === id);
    if (idx > -1) {
      appState.rentals[idx] = {
        ...appState.rentals[idx],
        code,
        itemName,
        itemType: guessJewelleryType(itemName),
        stockStatus,
        clientName,
        phone,
        depositAmount,
        issueDate,
        dueDate,
        returnDate
      };
    }
  } else {
    appState.rentals.push({
      id: 'jew-' + Date.now(),
      code,
      itemName,
      itemType: guessJewelleryType(itemName),
      stockStatus,
      clientName,
      phone,
      issueDate,
      dueDate,
      returnDate,
      depositAmount,
      notes: ''
    });
  }

  saveStorage();
  renderAll();
  closeJewelleryModal();
  if (stockStatus === 'Issued') {
    showToast(`Issued to ${clientName || 'Customer'}`);
  } else if (stockStatus === 'Returned') {
    showToast('Marked as Returned');
  } else {
    showToast('Jewellery saved in Stock');
  }
}

function deleteCurrentJewellery() {
  const id = document.getElementById('jmId').value;
  if (!id) return;
  appState.rentals = appState.rentals.filter(x => x.id !== id);
  saveStorage();
  renderAll();
  closeJewelleryModal();
  showToast('Item removed');
}

function sendJewelleryWhatsAppById(jewId) {
  const j = appState.rentals.find(x => x.id === jewId);
  if (!j) return;
  openJewelleryWhatsAppUrl(j);
}

function sendJewelleryWhatsAppReminder() {
  const id = document.getElementById('jmId').value;
  const existing = id ? appState.rentals.find(x => x.id === id) : null;
  const itemData = {
    code: document.getElementById('jmCode')?.value.trim() || existing?.code || 'J001',
    itemName: document.getElementById('jmName')?.value.trim() || existing?.itemName || 'Jewellery Set',
    stockStatus: document.getElementById('jmStatus')?.value || existing?.stockStatus || 'Issued',
    clientName: document.getElementById('jmClientName')?.value.trim() || existing?.clientName || 'Customer',
    phone: document.getElementById('jmPhone')?.value.trim() || existing?.phone || '',
    depositAmount: Number(document.getElementById('jmDeposit')?.value) || existing?.depositAmount || 0,
    issueDate: document.getElementById('jmIssueDate')?.value || existing?.issueDate || getOffsetDateStr(0),
    dueDate: document.getElementById('jmDueDate')?.value || existing?.dueDate || getOffsetDateStr(1)
  };
  openJewelleryWhatsAppUrl(itemData);
}

function openJewelleryWhatsAppUrl(j) {
  const msg =
    `✨ *NAAZ MAKEUP STUDIO* ✨\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💎 *BRIDAL JEWELLERY REMINDER*\n\n` +
    `Here are the details regarding the bridal jewellery set issued from *Naaz Makeup Studio*:\n\n` +
    `👤 *Client Name:* ${j.clientName || 'Customer'}\n` +
    `👑 *Jewellery Set:* ${j.itemName}\n` +
    `🏷️ *Item Code:* ${j.code || 'J001'}\n` +
    `📌 *Current Status:* ${j.stockStatus}\n` +
    `📅 *Issue Date:* ${formatDatePretty(j.issueDate || getOffsetDateStr(0))}\n` +
    `⏳ *Return Due Date:* ${formatDatePretty(j.dueDate || getOffsetDateStr(1))}\n` +
    `💰 *Security Deposit:* ${formatINR(j.depositAmount)}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🙏 _Kindly return the jewellery set safely on time to claim your security deposit._\n` +
    `📍 *Naaz Makeup Studio*`;
  const cleanPhone = String(j.phone || '').replace(/\D/g, '');
  const phoneParam = cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : '';
  window.open(`https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}

// --- STORAGE MODAL & CSV ---
function openStorageModal() {
  closeMoreDrawer();
  refreshJsonBackupPreviewBox();
  document.getElementById('storageModal').classList.remove('hidden');
}

function closeStorageModal() {
  document.getElementById('storageModal').classList.add('hidden');
}

async function exportHisabCSV() {
  const headers = ['Booking ID', 'Customer Name', 'Mobile', 'Date', 'Time', 'Service', 'Total Bill', 'Received', 'Pending', 'Mode', 'Status'];
  const rows = appState.bookings.map(b => [
    b.id, `"${(b.clientName || '').replace(/"/g, '""')}"`, `"${b.phone || ''}"`,
    b.date, b.time, `"${(b.services || []).join('; ')}"`,
    b.totalAmount, b.advancePaid, getBalance(b), b.paymentMode || 'UPI', b.status || 'Confirmed'
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `naaz_makeup_studio_hisab_${getOffsetDateStr(0)}.csv`;

  if (window.NaazAndroid && typeof window.NaazAndroid.saveFileToDownloads === 'function') {
    try {
      const res = window.NaazAndroid.saveFileToDownloads(filename, csv, 'text/csv');
      if (res && String(res).startsWith('OK:')) {
        showToast('Hisab CSV saved in Phone Downloads!');
        return;
      }
    } catch (e) {}
  }

  const isAndroidWebView = Boolean(window.Capacitor) || /; wv\)/i.test(navigator.userAgent || '');
  if (isAndroidWebView && navigator.share) {
    try {
      const file = new File([csv], filename, { type: 'text/csv' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        showToast('Hisab CSV exported!');
        return;
      }
    } catch (e) {}
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('Hisab CSV downloaded');
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('studioToast');
  const text = document.getElementById('studioToastText');
  if (!toast || !text) return;
  text.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
}


// --- TODAY'S ORDER NOTIFICATIONS ENGINE ---
const NOTIF_ENABLED_KEY = 'naaz_makeup_studio_notif_enabled_v1';
const NOTIF_LAST_SHOWN_KEY = 'naaz_makeup_studio_notif_date_v1';

function getTodayOrdersData() {
  const today = getOffsetDateStr(0);
  const todayBookings = appState.bookings
    .filter(b => b.date === today)
    .slice()
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const dueJewellery = (appState.rentals || []).filter(
    j => j.stockStatus === 'Issued' && (!j.dueDate || j.dueDate <= today)
  );

  return { today, todayBookings, dueJewellery };
}

function renderTodayOrderNotifications() {
  const { today, todayBookings, dueJewellery } = getTodayOrdersData();
  const activeTodayOrders = todayBookings.filter(b => b.status !== 'Completed');
  const totalAlerts = activeTodayOrders.length + dueJewellery.length;

  // 1. Update Header Bell Badge
  const bellBadge = document.getElementById('notifBellBadge');
  if (bellBadge) {
    bellBadge.textContent = String(activeTodayOrders.length);
    if (activeTodayOrders.length > 0 || totalAlerts > 0) {
      bellBadge.classList.remove('hidden');
    } else {
      bellBadge.classList.add('hidden');
    }
  }

  // 2. Update Home Screen Today's Order Notification Banner
  const homeBanner = document.getElementById('homeTodayOrderNotifBanner');
  if (homeBanner) {
    if (activeTodayOrders.length > 0) {
      const nextOrder = activeTodayOrders[0];
      const nextSrv = (nextOrder.services && nextOrder.services.length) ? nextOrder.services[0] : 'Makeup';
      homeBanner.innerHTML = `
        <div class="row-center gap-3" style="min-width:0;flex:1;">
          <div class="today-alert-bell-box">
            <svg class="icon-20" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:11px;font-weight:800;color:var(--brand-gold);letter-spacing:0.06em;text-transform:uppercase;">
              Today's Order Notification (${activeTodayOrders.length})
            </div>
            <div class="text-truncate" style="font-size:13px;font-weight:700;color:#ffffff;margin-top:2px;">
              Next: ${escapeHtml(nextOrder.clientName)} at ${escapeHtml(formatTime12h(nextOrder.time))} (${escapeHtml(nextSrv)})
            </div>
          </div>
        </div>
        <span style="padding:5px 10px;border-radius:999px;background:var(--gold-grad, var(--brand-gold));color:#120e09;font-size:11px;font-weight:800;flex-shrink:0;">
          View
        </span>
      `;
    } else {
      homeBanner.innerHTML = `
        <div class="row-center gap-3" style="min-width:0;flex:1;">
          <div class="today-alert-bell-box">
            <svg class="icon-20" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:11px;font-weight:800;color:var(--brand-gold);letter-spacing:0.06em;text-transform:uppercase;">
              Today's Order Notifications
            </div>
            <div style="font-size:12.5px;color:rgba(255,255,255,0.88);margin-top:2px;">
              No pending or confirmed orders for today. Tap + to book!
            </div>
          </div>
        </div>
      `;
    }
  }

  // 3. Update Notification Permission Status Pill in Modal
  const permBadge = document.getElementById('notifPermissionStatusBadge');
  const permBtn = document.getElementById('enablePhoneNotifBtn');
  if (permBadge) {
    const granted = ('Notification' in window) && Notification.permission === 'granted';
    permBadge.textContent = granted ? 'Phone Alerts Active' : 'In-App Alerts Active';
    permBadge.className = granted ? 'status-pill status-confirmed' : 'status-pill status-issued';
    if (permBtn) {
      permBtn.textContent = granted ? 'Send Phone Alert Now' : 'Enable Phone Notifications';
    }
  }

  // 4. Populate Notifications Modal List
  const listEl = document.getElementById('notificationsModalList');
  if (!listEl) return;

  if (activeTodayOrders.length === 0 && dueJewellery.length === 0) {
    listEl.innerHTML = `
      <div style="padding:26px 14px;text-align:center;background:var(--brand-50);border-radius:14px;border:1px solid var(--border-color);">
        <div style="font-size:14px;font-weight:800;color:var(--text-dark);">No active orders scheduled for today</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">When you add a booking for today (${escapeHtml(formatDatePretty(today))}), it will appear here with instant alerts.</div>
      </div>
    `;
    return;
  }

  let html = '';
  activeTodayOrders.forEach(b => {
    const serviceLabel = (b.services && b.services.length) ? b.services.join(', ') : (b.category || 'Makeup Service');
    const due = getBalance(b);
    const statusBadge = b.status === 'Pending'
      ? `<span class="status-pill status-pending">Pending</span>`
      : `<span class="status-pill status-confirmed">${escapeHtml(b.status || 'Confirmed')}</span>`;
    const paymentBadge = due > 0
      ? `<span style="color:#d97706;font-weight:800;">Due: ${formatINR(due)}</span>`
      : `<span style="color:#15803d;font-weight:800;">Full Paid</span>`;

    html += `
      <div class="notif-item-card">
        <div class="row-between" style="margin-bottom:6px;">
          <span style="font-size:11.5px;font-weight:800;color:var(--brand-800);background:var(--brand-100);padding:3px 9px;border-radius:999px;">
            Today • ${escapeHtml(formatTime12h(b.time))}
          </span>
          ${statusBadge}
        </div>
        <div style="font-size:14px;font-weight:800;color:var(--text-dark);">${escapeHtml(b.clientName)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
          Service: <strong style="color:var(--text-dark);">${escapeHtml(serviceLabel)}</strong> • Bill: <strong>${formatINR(b.totalAmount)}</strong> • ${paymentBadge}
        </div>
        <div class="row-center gap-2" style="margin-top:10px;">
          <button type="button" onclick="closeNotificationsModal(); openBookingActionModal('${b.id}');" style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid var(--border-color);background:#ffffff;color:var(--text-dark);font-size:11.5px;font-weight:800;cursor:pointer;">
            View Order Details
          </button>
          <button type="button" onclick="sendWhatsAppBookingReminder('${b.id}')" style="padding:8px 12px;border-radius:10px;border:none;background:#16a34a;color:#ffffff;font-size:11.5px;font-weight:800;cursor:pointer;">
            WhatsApp Reminder
          </button>
        </div>
      </div>
    `;
  });

  dueJewellery.forEach(j => {
    html += `
      <div class="notif-item-card" style="background:#fffbeb;border-color:#fde68a;">
        <div class="row-between" style="margin-bottom:6px;">
          <span style="font-size:11px;font-weight:800;color:#b45309;background:#fef3c7;padding:3px 9px;border-radius:999px;">
            Jewellery Return Alert
          </span>
          <span class="status-pill status-pending">Issued</span>
        </div>
        <div style="font-size:13.5px;font-weight:800;color:var(--text-dark);">${escapeHtml(j.itemName)} (${escapeHtml(j.code)})</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
          Issued to: <strong>${escapeHtml(j.clientName || 'Client')}</strong> • Deposit: <strong>${formatINR(j.depositAmount)}</strong>
        </div>
        <div class="row-center gap-2" style="margin-top:10px;">
          <button type="button" onclick="closeNotificationsModal(); openAddJewelleryModal('${j.id}');" style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid #fde68a;background:#ffffff;color:#92400e;font-size:11.5px;font-weight:800;cursor:pointer;">
            Manage Return
          </button>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

function openNotificationsModal() {
  closeMoreDrawer();
  renderTodayOrderNotifications();
  const modal = document.getElementById('notificationsModal');
  if (modal) modal.classList.remove('hidden');
}

function closeNotificationsModal() {
  const modal = document.getElementById('notificationsModal');
  if (modal) modal.classList.add('hidden');
}

async function handlePhoneNotificationAction() {
  if (!('Notification' in window)) {
    showToast('In-app order notifications are active');
    return;
  }
  if (Notification.permission !== 'granted') {
    try {
      const perm = await Notification.requestPermission();
      renderTodayOrderNotifications();
      if (perm === 'granted') {
        triggerTodayOrdersDeviceNotification(true);
        showToast('Phone notifications enabled');
      } else {
        showToast('Using in-app order notifications');
      }
    } catch (e) {
      showToast('In-app order notifications active');
    }
  } else {
    triggerTodayOrdersDeviceNotification(true);
  }
}

async function triggerTodayOrdersDeviceNotification(manual = false) {
  const { today, todayBookings } = getTodayOrdersData();
  if (todayBookings.length === 0) {
    if (manual) showToast('No orders scheduled for today yet');
    return;
  }

  const nextOrder = todayBookings.find(b => b.status !== 'Completed') || todayBookings[0];
  const nextSrv = (nextOrder.services && nextOrder.services.length) ? nextOrder.services[0] : 'Makeup';
  const title = `Naaz Makeup Studio — ${todayBookings.length} Order${todayBookings.length > 1 ? 's' : ''} Today`;
  const body = `Next: ${nextOrder.clientName} at ${formatTime12h(nextOrder.time)} (${nextSrv})`;

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: 'logo.png',
            badge: 'logo.png',
            tag: 'naaz-today-orders'
          });
          if (manual) showToast('Today order notification sent to phone');
          return;
        }
      }
      new Notification(title, { body, icon: 'logo.png' });
      if (manual) showToast('Today order notification sent');
      return;
    } catch (e) {}
  }

  showToast(`Today: ${todayBookings.length} orders • Next: ${nextOrder.clientName} (${formatTime12h(nextOrder.time)})`);
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    setStudioTheme(savedTheme || 'black-gold', true);
  } catch (e) {
    setStudioTheme('black-gold', true);
  }

  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.update();
    } catch (e) {}
  }

  requestPersistentDeviceStorage();
  const lsSaved = loadStorage();
  const idbSaved = await loadFromIndexedDB();
  let saved = null;
  if (lsSaved && idbSaved) {
    saved = (String(lsSaved.updatedAt || '') >= String(idbSaved.updatedAt || '')) ? lsSaved : idbSaved;
  } else {
    saved = lsSaved || idbSaved;
  }

  // One-time cleanup of old hardcoded demo bookings (bk-101..bk-105) if still in storage
  const DEMO_PURGE_KEY = 'naaz_studio_demo_purged_v2';
  try {
    if (!localStorage.getItem(DEMO_PURGE_KEY)) {
      if (saved && Array.isArray(saved.bookings)) {
        const oldDemoIds = new Set(['bk-101', 'bk-102', 'bk-103', 'bk-104', 'bk-105']);
        saved.bookings = saved.bookings.filter(b => !oldDemoIds.has(b.id));
      }
      if (saved && Array.isArray(saved.rentals)) {
        saved.rentals = saved.rentals.map(r => {
          if ((r.id === 'jew-2' && r.clientName === 'Reema Khan') || (r.id === 'jew-5' && r.clientName === 'Ayesha Malik')) {
            return { ...r, stockStatus: 'In Stock', clientName: '', phone: '', returnDate: '' };
          }
          return r;
        });
      }
      localStorage.setItem(DEMO_PURGE_KEY, 'true');
    }
  } catch (e) {}

  normalizeLoadedState(saved);
  saveStorage();
  updateDeviceStorageUI();
  renderAll();

  window.addEventListener('pagehide', () => saveStorage());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveStorage();
  });

  setTimeout(() => {
    dismissSplashScreen();
    const { todayBookings } = getTodayOrdersData();
    if (todayBookings.length > 0) {
      const nextB = todayBookings[0];
      showToast(`Today's Orders: ${todayBookings.length} (${nextB.clientName} at ${formatTime12h(nextB.time)})`);
      triggerTodayOrdersDeviceNotification(false);
    }
  }, 900);
});