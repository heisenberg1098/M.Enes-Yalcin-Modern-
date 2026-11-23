

if (typeof firebaseConfig === 'undefined') {
  var firebaseConfig = {
    apiKey: "AIzaSyBhTD31NWAq6DlnUQPwRcC4Q_-l-pNi1xs",
    authDomain: "okul-37a9d.firebaseapp.com",
    projectId: "okul-37a9d",
    storageBucket: "okul-37a9d.firebasestorage.app",
    messagingSenderId: "241414867800",
    appId: "1:241414867800:web:d32c7c7e88617e703e732d"
  };
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const db = firebase.firestore();
const auth = firebase.auth();
let authorizedAdmin = false;
let activeAdminUid = null;
let adminDataUnsubscribers = [];
let adminLoginInProgress = false;

async function hasAdminAccess(user = auth.currentUser) {
  if (!user) return false;
  const adminDoc = await db.collection('admin_users').doc(user.uid).get({ source: 'server' });
  return adminDoc.exists && adminDoc.get('role') === 'admin';
}

function adminAuthErrorMessage(error) {
  const code = error?.code || 'unknown';

  if (code === 'permission-denied') {
    return 'Firebase oturumu açıldı ancak admin_users belgesi okunamadı (permission-denied). Firestore Rules içinde oturum açmış kullanıcının kendi UID belgesine get izni olduğunu ve kuralların yayımlandığını kontrol edin.';
  }
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'auth/network-request-failed') {
    return `Firebase bağlantısı kurulamadı (${code}). Bağlantınızı kontrol edip tekrar deneyin.`;
  }

  return `Giriş doğrulanamadı (${code}). Firebase hata ayrıntısı tarayıcı konsoluna kaydedildi.`;
}

function clearAdminDataListeners() {
  adminDataUnsubscribers.forEach(unsubscribe => unsubscribe());
  adminDataUnsubscribers = [];
}

function hideAdminPanel() {
  clearAdminDataListeners();
  authorizedAdmin = false;
  activeAdminUid = null;
  const panel = document.getElementById('adminPanel');
  if (panel) panel.style.display = 'none';
  const projects = document.getElementById('adminProjeListesi');
  const messages = document.getElementById('adminMesajListesi');
  if (projects) projects.replaceChildren();
  if (messages) messages.replaceChildren();
}

function showAdminPanel(user) {
  authorizedAdmin = true;
  if (activeAdminUid === user.uid) return;
  activeAdminUid = user.uid;
  const panel = document.getElementById('adminPanel');
  if (panel) {
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
  }
  adminMesajlariYukle();
  adminProjeleriYukle();
}

auth.onAuthStateChanged(async user => {
  if (!user) {
    hideAdminPanel();
    return;
  }

  try {
    if (await hasAdminAccess(user)) {
      showAdminPanel(user);
      return;
    }
  } catch (error) {
    hideAdminPanel();
    console.error('Yönetici yetkisi doğrulanamadı:', { code: error?.code, message: error?.message });
    if (!adminLoginInProgress) {
      Toast.error(adminAuthErrorMessage(error), 'Yetki Kontrolü Hatası');
    }
    return;
  }

  hideAdminPanel();
  await auth.signOut();
});

async function requireAdmin() {
  if (auth.currentUser && authorizedAdmin) return true;
  Toast.error('Bu işlem için yetkili yönetici girişi gerekiyor.', 'Yetki Gerekli');
  return false;
}

// ─── 2. TOAST NOTIFICATION SYSTEM ───────────────
const Toast = (() => {
  const ICONS = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };
  const TITLES = {
    success: 'Başarılı',
    error: 'Hata',
    info: 'Bilgi',
    warning: 'Uyarı'
  };
  const DURATION = { success: 4000, info: 4000, warning: 5000, error: 6000 };

  function show(message, type = 'info', titleOverride = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas ${ICONS[type]}"></i></div>
      <div class="toast-body">
        <strong>${titleOverride || TITLES[type]}</strong>
        <span>${escapeHtml(message)}</span>
      </div>
      <button class="toast-close" aria-label="Kapat">
        <i class="fas fa-times"></i>
      </button>`;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismiss(toast));

    container.appendChild(toast);

    const timer = setTimeout(() => dismiss(toast), DURATION[type]);
    toast._timer = timer;
  }

  function dismiss(toast) {
    clearTimeout(toast._timer);
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }

  return {
    success: (msg, title) => show(msg, 'success', title),
    error: (msg, title) => show(msg, 'error', title),
    info: (msg, title) => show(msg, 'info', title),
    warning: (msg, title) => show(msg, 'warning', title),
  };
})();

// ─── 3. OFFLINE DETECTOR ─────────────────────────
const OfflineManager = (() => {
  function init() {
    const banner = document.getElementById('offlineBanner');
    if (!banner) return;

    function update() {
      if (!navigator.onLine) {
        banner.classList.add('show');
        Toast.warning('İnternet bağlantısı kesildi. Bazı veriler yüklenemeyebilir.', 'Çevrimdışı');
      } else {
        banner.classList.remove('show');
      }
    }

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }
  return { init };
})();

// ─── 4. THEME SYSTEM ─────────────────────────────
const ThemeManager = (() => {
  const root = document.documentElement;
  const STORAGE_KEY = 'mey-theme';

  function get() {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const mobileIcon = document.querySelector('#themeToggleMobile i');
    if (mobileIcon) {
      mobileIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  function toggle() {
    apply(get() === 'light' ? 'dark' : 'light');
  }

  function init() {
    apply(get());
    const btn = document.getElementById('themeToggle');
    const btnMobile = document.getElementById('themeToggleMobile');
    if (btn) btn.addEventListener('click', toggle);
    if (btnMobile) btnMobile.addEventListener('click', toggle);
  }

  return { init, toggle, get };
})();

// ─── 5. MOBILE SIDEBAR ───────────────────────────
// Düzeltme: Body scroll lock + smooth transition + z-index guarantee
const SidebarManager = (() => {
  let _sidebar, _overlay, _scrollY;

  function open() {
    if (!_sidebar) return;
    // Scroll lock: position fix trick (prevents background jump on iOS)
    _scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflowY = 'scroll'; // prevent layout shift

    _sidebar.classList.add('open');
    if (_overlay) _overlay.classList.add('active');
  }

  function close() {
    if (!_sidebar) return;
    // Restore scroll position
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflowY = '';
    window.scrollTo(0, _scrollY || 0);

    _sidebar.classList.remove('open');
    if (_overlay) _overlay.classList.remove('active');
  }

  function init() {
    _sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menuBtn');
    _overlay = document.getElementById('sidebarOverlay');

    if (menuBtn) menuBtn.addEventListener('click', open);
    if (_overlay) _overlay.addEventListener('click', close);

    // Close on nav link click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 900) close();
      });
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _sidebar?.classList.contains('open')) close();
    });
  }

  return { init, open, close };
})();

// ─── 6. ACTIVE NAV ON SCROLL ─────────────────────
const NavHighlighter = (() => {
  function init() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[data-section]');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => link.classList.remove('active'));
          const active = document.querySelector(`.nav-link[data-section="${entry.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });

    sections.forEach(s => observer.observe(s));
  }
  return { init };
})();

// ─── 7. SCROLL ANIMATIONS ────────────────────────
const AnimationManager = (() => {
  function init() {
    const elements = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach(el => observer.observe(el));
  }

  function animateSkills() {
    const fills = document.querySelectorAll('.skill-fill');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    fills.forEach(fill => observer.observe(fill));
  }

  return { init, animateSkills };
})();

// ─── 8. FIREBASE: WEB SITES LOADER ───────────────
// Sadece isPublished:true ve status:"active" olanları göster
// ─── 8. FIREBASE: WEB SITES LOADER ───────────────
// ÇÖZÜM: Sonsuz döngü yaratan views tetikleyicisi kaldırıldı, filtreleme esnekleştirildi.
const WebsiteLoader = (() => {
  let _retryCount = 0;
  const MAX_RETRY = 3;
  let _unsubscribe = null;

  function renderCard(doc, container) {
    const site = doc.data();
    if (site.font) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(site.font)}&display=swap`;
      document.head.appendChild(link);
    }

    const fontStyle = site.font ? `font-family:'${site.font}',sans-serif` : '';
    const imgEl = site.resim
      ? `<img src="${escapeHtml(site.resim)}" alt="${escapeHtml(site.isim)}" loading="lazy" />`
      : `<div class="thumb-placeholder"><i class="fas fa-globe"></i></div>`;

    const card = document.createElement('div');
    card.className = 'web-card';
    card.dataset.docId = doc.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.addEventListener('click', () => {
      tiklaniSayisiArtir(doc.id, site.isim);
      window.open(site.link, '_blank', 'noopener,noreferrer');
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') card.click();
    });

    // Gelişme durumuna göre karta ufak bir premium rozet ekleyelim
    let statusBadge = '';
    if (site.status === 'development') {
      statusBadge = `<span class="status-chip development" style="font-size:1rem; padding:0.2rem 0.8rem; margin-bottom:1rem; display:inline-flex;">Geliştirmede</span>`;
    }

    card.innerHTML = `
      <div class="web-card-thumb">${imgEl}</div>
      <div class="web-card-body">
        ${statusBadge}
        <h3 style="${fontStyle}">${escapeHtml(site.isim)}</h3>
        <p>${escapeHtml(site.aciklama || 'Açıklama eklenmedi.')}</p>
        <span class="web-card-link">
          Siteyi Görüntüle
          <i class="fas fa-arrow-up-right-from-square"></i>
        </span>
      </div>`;
    container.appendChild(card);
  }

  function load() {
    const container = document.getElementById('websiteContainer');
    if (!container) return;

    // Show loading
    container.innerHTML = `
      <div class="web-loading">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <p>Yükleniyor…</p>
      </div>`;

    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

    const feeds = new Map();
    const queries = [
      db.collection('websiteler').where('status', 'in', ['active', 'development']),
      db.collection('websiteler').where('isPublished', '==', true)
    ];

    const renderFeeds = () => {
      if (feeds.size !== queries.length) return;
      _retryCount = 0;
      container.replaceChildren();

      const publicDocs = new Map();
      feeds.forEach(snapshot => snapshot.forEach(doc => publicDocs.set(doc.id, doc)));
      const activeDocs = [...publicDocs.values()].sort((a, b) => {
        const aDate = a.data().tarih?.toMillis?.() || 0;
        const bDate = b.data().tarih?.toMillis?.() || 0;
        return bDate - aDate;
      });

      if (activeDocs.length === 0) {
        container.innerHTML = `
          <div class="web-loading" style="grid-column:1/-1">
            <i class="fas fa-globe" style="font-size:3.2rem; color: var(--c-text-3);"></i>
            <p>Henüz sergilenecek bir web sitesi eklenmemiş.</p>
          </div>`;
        return;
      }

      activeDocs.forEach(doc => renderCard(doc, container));
      container.querySelectorAll('.web-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`;
        requestAnimationFrame(() => setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50));
      });
    };

    const handleError = error => {
      console.error('Firestore web siteleri yükleme hatası:', error);
      _retryCount++;
      const canRetry = _retryCount < MAX_RETRY;
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-cloud-slash"></i>
          <p>Projeler yüklenemedi. ${canRetry ? 'Lütfen tekrar deneyin.' : 'Bağlantı sorunu devam ediyor.'}</p>
          ${canRetry ? `<button class="retry-btn" onclick="WebsiteLoader.load()">
            <i class="fas fa-rotate-right"></i> Tekrar Dene
          </button>` : ''}
        </div>`;
      Toast.error('Projeler yüklenemedi. İnternet bağlantınızı kontrol edin.', 'Yükleme Hatası');
    };

    const unsubscribers = queries.map((query, index) => query.onSnapshot(snapshot => {
      feeds.set(index, snapshot);
      renderFeeds();
    }, handleError));
    _unsubscribe = () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }

  return { load };
})();

window.WebsiteLoader = WebsiteLoader;

async function tiklaniSayisiArtir(docId, projeAdi) {
  try {
    await db.collection("websiteler").doc(docId).update({
      tiklanmaSayisi: firebase.firestore.FieldValue.increment(1),
      clicks: firebase.firestore.FieldValue.increment(1)
    });
    if (typeof Analytics !== 'undefined') {
      Analytics.track('proje_tikla', {
        event_category: 'portfolio',
        proje_id: docId,
        proje_adi: projeAdi || 'unknown'
      });
    }
  } catch (e) {
    console.warn("Tıklanma sayısı artırılamadı:", e);
  }
}

async function goruntulenmeSayisiArtir(docId) {
  try {
    await db.collection("websiteler").doc(docId).update({
      views: firebase.firestore.FieldValue.increment(1)
    });
  } catch (e) {
    console.warn("Görüntülenme sayısı artırılamadı:", e);
  }
}

// ─── 9. FIREBASE: CONTACT FORM — see section 16D ─

function showFormNotification(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = `form-notification ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ─── 10. ADMIN: LOGIN MODAL ──────────────────────
function adminPopUpAc() {
  if (auth.currentUser && authorizedAdmin) {
    showAdminPanel(auth.currentUser);
    return;
  }
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('adminEmail')?.focus(), 100);
  }
}
window.adminPopUpAc = adminPopUpAc;

async function adminGirisKontrol() {
  const email = document.getElementById('adminEmail')?.value.trim();
  const password = document.getElementById('pSifre')?.value;
  const button = document.querySelector('#adminModal .btn-primary');
  if (!email || !password) {
    Toast.error('E-posta ve şifre alanlarını doldurun.', 'Eksik Bilgi');
    return;
  }

  try {
    adminLoginInProgress = true;
    if (button) button.disabled = true;
    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    const credential = await auth.signInWithEmailAndPassword(email, password);
    if (!(await hasAdminAccess(credential.user))) {
      await auth.signOut();
      Toast.error('Firebase girişi başarılı, ancak bu UID için admin_users belgesinde role: "admin" bulunamadı.', 'Yönetici Yetkisi Yok');
      return;
    }

    showAdminPanel(credential.user);
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('pSifre').value = '';
  } catch (err) {
    console.error('Yönetici girişi başarısız:', { code: err?.code, message: err?.message });
    Toast.error(adminAuthErrorMessage(err), 'Giriş Başarısız');
  } finally {
    adminLoginInProgress = false;
    if (button) button.disabled = false;
  }
}
window.adminGirisKontrol = adminGirisKontrol;

// ─── 11. ADMIN: ADD PROJECT FORM ─────────────────
function siteEkleFormHazirla() {
  const form = document.getElementById('siteEkleForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!(await requireAdmin())) return;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Ekleniyor…';

    const status = document.getElementById('sStatus')?.value || 'active';
    const yeniSite = {
      isim: document.getElementById('sAd').value.trim(),
      link: document.getElementById('sLink').value.trim(),
      font: document.getElementById('sFont').value.trim(),
      aciklama: document.getElementById('sAciklama').value.trim(),
      resim: document.getElementById('sResim')?.value.trim() || '',
      tags: document.getElementById('sTags')?.value.trim() || '',
      status: status,
      isPublished: status === 'active',
      tarih: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("websiteler").add(yeniSite);
      form.reset();
      btn.innerHTML = '<i class="fas fa-check"></i> Eklendi!';
      Toast.success(`"${yeniSite.isim}" başarıyla yayınlandı.`);
      // Switch to projects tab to see the new entry
      setTimeout(() => switchAdminTab('projects'), 800);
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-rocket"></i> Siteyi Yayınla';
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      console.error("Site ekleme hatası:", err);
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Hata!';
      Toast.error('Proje eklenemedi. Tekrar deneyin.', 'Ekleme Hatası');
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-rocket"></i> Siteyi Yayınla';
        btn.disabled = false;
      }, 2000);
    }
  };
}

// ─── 12. ADMIN: PROJECT MANAGEMENT (CMS CRUD) ────
const STATUS_LABELS = {
  active: { label: 'Yayında', cls: 'active' },
  draft: { label: 'Taslak', cls: 'draft' },
  archived: { label: 'Arşiv', cls: 'archived' },
  development: { label: 'Geliştirme', cls: 'development' }
};

function adminProjeleriYukle() {
  const liste = document.getElementById('adminProjeListesi');
  if (!liste || !authorizedAdmin) return;

  const unsubscribe = db.collection("websiteler").orderBy("tarih", "desc").onSnapshot(snapshot => {
    // Update stats
    let total = 0, active = 0, draft = 0;
    snapshot.forEach(doc => {
      total++;
      const s = doc.data().status || 'active';
      if (s === 'active') active++;
      else if (s === 'draft') draft++;
    });
    const el = id => document.getElementById(id);
    if (el('statTotal')) el('statTotal').textContent = total;
    if (el('statActive')) el('statActive').textContent = active;
    if (el('statDraft')) el('statDraft').textContent = draft;

    // Render list
    liste.innerHTML = '';
    if (snapshot.empty) {
      liste.innerHTML = '<p style="color:var(--c-text-2); font-size:1.4rem; text-align:center; padding: 2rem;">Henüz proje eklenmemiş.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const p = doc.data();
      const status = p.status || 'active';
      const sInfo = STATUS_LABELS[status] || STATUS_LABELS.active;

      const item = document.createElement('div');
      item.className = 'admin-project-item';
      item.innerHTML = `
        <div class="admin-project-header">
          <div class="admin-project-name">${escapeHtml(p.isim || '—')}</div>
          <span class="status-chip ${sInfo.cls}">${sInfo.label}</span>
        </div>
        <p class="admin-project-desc">${escapeHtml(p.aciklama || 'Açıklama yok.')}</p>
        <div class="admin-actions-row">
          <button class="admin-action-btn btn-edit" onclick="projeEdit('${doc.id}')">
            <i class="fas fa-pen"></i> Düzenle
          </button>
          ${status !== 'active'
          ? `<button class="admin-action-btn btn-publish" onclick="projeYayinla('${doc.id}')">
                <i class="fas fa-eye"></i> Yayına Al
               </button>`
          : `<button class="admin-action-btn btn-unpublish" onclick="projeYayindanKaldir('${doc.id}')">
                <i class="fas fa-eye-slash"></i> Yayından Kaldır
               </button>`
        }
          <button class="admin-action-btn btn-delete" onclick="projeSil('${doc.id}', '${escapeHtml(p.isim || '')}')">
            <i class="fas fa-trash"></i> Sil
          </button>
        </div>`;
      liste.appendChild(item);
    });
  }, error => {
    console.error("Proje listeleme hatası:", error);
    Toast.error('Projeler listelenemedi.', 'Hata');
  });
  adminDataUnsubscribers.push(unsubscribe);
}

async function projeYayinla(id) {
  if (!(await requireAdmin())) return;
  try {
    await db.collection("websiteler").doc(id).update({
      status: 'active',
      isPublished: true
    });
    Toast.success('Proje yayına alındı.', 'Yayınlandı');
  } catch (err) {
    console.error(err);
    Toast.error('İşlem başarısız.', 'Hata');
  }
}

async function projeYayindanKaldir(id) {
  if (!(await requireAdmin())) return;
  try {
    await db.collection("websiteler").doc(id).update({
      status: 'draft',
      isPublished: false
    });
    Toast.info('Proje yayından kaldırıldı (taslak).', 'Güncellendi');
  } catch (err) {
    console.error(err);
    Toast.error('İşlem başarısız.', 'Hata');
  }
}

async function projeSil(id, isim) {
  if (!(await requireAdmin())) return;
  if (!confirm(`"${isim}" projesini kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)) return;
  try {
    await db.collection("websiteler").doc(id).delete();
    Toast.success(`"${isim}" silindi.`, 'Silindi');
  } catch (err) {
    console.error("Silme hatası:", err);
    Toast.error('Proje silinemedi.', 'Hata');
  }
}

async function projeEdit(id) {
  if (!(await requireAdmin())) return;
  try {
    const doc = await db.collection("websiteler").doc(id).get();
    if (!doc.exists) {
      Toast.error('Proje bulunamadı.', 'Hata');
      return;
    }
    const p = doc.data();
    document.getElementById('editDocId').value = id;
    document.getElementById('editAd').value = p.isim || '';
    document.getElementById('editLink').value = p.link || '';
    document.getElementById('editFont').value = p.font || '';
    document.getElementById('editTags').value = p.tags || '';
    document.getElementById('editAciklama').value = p.aciklama || '';
    document.getElementById('editResim').value = p.resim || '';
    document.getElementById('editStatus').value = p.status || 'active';
    editModalAc();
  } catch (err) {
    console.error(err);
    Toast.error('Proje bilgileri alınamadı.', 'Hata');
  }
}

function editModalAc() {
  document.getElementById('editModal').classList.add('open');
}
function editModalKapat() {
  document.getElementById('editModal').classList.remove('open');
}
window.editModalKapat = editModalKapat;

function editFormHazirla() {
  const form = document.getElementById('editForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!(await requireAdmin())) return;
    const id = document.getElementById('editDocId').value;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kaydediliyor…';

    const status = document.getElementById('editStatus').value;
    const guncelleme = {
      isim: document.getElementById('editAd').value.trim(),
      link: document.getElementById('editLink').value.trim(),
      font: document.getElementById('editFont').value.trim(),
      tags: document.getElementById('editTags').value.trim(),
      aciklama: document.getElementById('editAciklama').value.trim(),
      resim: document.getElementById('editResim').value.trim(),
      status: status,
      isPublished: status === 'active',
      guncelleme: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("websiteler").doc(id).update(guncelleme);
      editModalKapat();
      Toast.success('Proje güncellendi.', 'Kaydedildi');
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      Toast.error('Güncelleme başarısız. Tekrar deneyin.', 'Hata');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Değişiklikleri Kaydet';
    }
  };
}

// Global expose for onclick attributes
window.projeEdit = projeEdit;
window.projeYayinla = projeYayinla;
window.projeYayindanKaldir = projeYayindanKaldir;
window.projeSil = projeSil;

// ─── 13. ADMIN: LIST & DELETE MESSAGES ───────────
function adminMesajlariYukle() {
  const liste = document.getElementById('adminMesajListesi');
  if (!liste || !authorizedAdmin) return;

  const unsubscribe = db.collection("mesajlar").orderBy("tarih", "desc").onSnapshot(snapshot => {
    // Update stat
    const el = document.getElementById('statMessages');
    if (el) el.textContent = snapshot.size;

    liste.innerHTML = '';
    if (snapshot.empty) {
      liste.innerHTML = '<p style="color:var(--c-text-2); font-size:1.4rem; text-align:center; padding: 2rem;">Henüz mesaj yok.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const m = doc.data();
      const tarih = m.tarih
        ? new Date(m.tarih.seconds * 1000).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';

      const card = document.createElement('div');
      card.className = 'admin-mesaj-kart';
      card.innerHTML = `
        <button class="sil-btn" onclick="mesajSil('${doc.id}')" title="Sil">
          <i class="fas fa-trash"></i>
        </button>
        <strong>${escapeHtml(m.isim)}</strong>
        <small>${escapeHtml(m.email)}</small>
        <p style="margin-top:.8rem; font-weight:600; color: var(--c-text);">
          ${escapeHtml(m.konu)}
        </p>
        <p>${escapeHtml(m.mesaj)}</p>
        <p style="margin-top:.8rem; font-size:1.2rem; color: var(--c-text-3);">
          <i class="far fa-clock"></i> ${tarih}
        </p>`;
      liste.appendChild(card);
    });
  }, error => {
    console.error("Mesaj listeleme hatası:", error);
    Toast.error('Mesajlar yüklenemedi.', 'Hata');
  });
  adminDataUnsubscribers.push(unsubscribe);
}

async function mesajSil(id) {
  if (!(await requireAdmin())) return;
  if (confirm("Bu mesajı silmek istediğinize emin misiniz?")) {
    db.collection("mesajlar").doc(id).delete()
      .then(() => Toast.success('Mesaj silindi.'))
      .catch(err => {
        console.error("Silme hatası:", err);
        Toast.error('Mesaj silinemedi.', 'Hata');
      });
  }
}
window.mesajSil = mesajSil;

function panelKapat() {
  adminCikis();
}
window.panelKapat = panelKapat;

async function adminCikis() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Yönetici oturumu kapatılamadı:', error);
    Toast.error('Oturum kapatılamadı. Tekrar deneyin.', 'Hata');
  }
}
window.adminCikis = adminCikis;

// ─── 14. ADMIN TABS ──────────────────────────────
function switchAdminTab(tab) {
  if (!authorizedAdmin) return;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));

  const tabEl = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  const viewEl = document.getElementById(`view${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  if (tabEl) tabEl.classList.add('active');
  if (viewEl) viewEl.classList.add('active');
}
window.switchAdminTab = switchAdminTab;

// ─── 15. UTILITY ─────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── 16A. ANALYTICS MANAGER ──────────────────────
const Analytics = (() => {
  // Safe gtag wrapper — won't throw if GA not loaded
  function track(eventName, params = {}) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
  }

  function init() {
    // Page view (GA4 auto-tracks this, but we also fire manually)
    track('page_view', { page_title: document.title, page_location: window.location.href });

    // CV indir
    document.querySelectorAll('a[href*="CV"], a[download]').forEach(el => {
      el.addEventListener('click', () => track('cv_indir', { event_category: 'engagement' }));
    });

    // İletişime geç
    document.querySelectorAll('a[href="#contact"]').forEach(el => {
      el.addEventListener('click', () => track('iletisime_gec', { event_category: 'engagement' }));
    });

    // Sosyal medya tıklamaları
    document.querySelectorAll('.social-icon, .contact-link-item').forEach(el => {
      el.addEventListener('click', () => {
        const platform = el.getAttribute('aria-label') || 'unknown';
        track('sosyal_medya_tikla', { platform, event_category: 'social' });
      });
    });

    // GitHub ve Live Demo linkleri (web-card içindeki)
    document.addEventListener('click', e => {
      const card = e.target.closest('.web-card');
      if (card) {
        const title = card.querySelector('h3')?.textContent || 'unknown';
        track('proje_tikla', { proje_adi: title, event_category: 'portfolio' });
      }
    });
  }

  return { track, init };
})();

// ─── 16B. CLOUDINARY UPLOAD SYSTEM ───────────────
const CloudinaryUpload = (() => {
  // 🔑 Cloudinary credentials — kendi cloud name ve unsigned preset'ini buraya gir
  const CLOUD_NAME = 'duwnhsqw5';     // örn: 'mey-portfolio'
  const UPLOAD_PRESET = 'ml_default';       // örn: 'mey_unsigned'
  const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  async function upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'portfolio');

    const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Cloudinary upload başarısız: ' + res.status);
    const data = await res.json();
    return data.secure_url;
  }

  function showLoading() {
    document.getElementById('uploadIdle').style.display = 'none';
    document.getElementById('uploadLoading').style.display = 'flex';
    document.getElementById('uploadPreview').style.display = 'none';
  }

  function showPreview(url) {
    document.getElementById('uploadIdle').style.display = 'none';
    document.getElementById('uploadLoading').style.display = 'none';
    const preview = document.getElementById('uploadPreview');
    document.getElementById('uploadPreviewImg').src = url;
    preview.style.display = 'block';
  }

  function showIdle() {
    document.getElementById('uploadIdle').style.display = 'flex';
    document.getElementById('uploadLoading').style.display = 'none';
    document.getElementById('uploadPreview').style.display = 'none';
  }

  function init() {
    const area = document.getElementById('cloudinaryUploadArea');
    if (!area) return;

    // Drag & drop
    area.addEventListener('dragover', e => {
      e.preventDefault();
      area.classList.add('drag-over');
    });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        window.cloudinaryUpload(file);
      }
    });
  }

  return { upload, showLoading, showPreview, showIdle, init };
})();

// Global functions for inline onclick attributes
window.cloudinaryTikla = function () {
  document.getElementById('cloudinaryFileInput')?.click();
};

window.cloudinaryUpload = async function (file) {
  if (!file) return;
  if (!(await requireAdmin())) return;
  CloudinaryUpload.showLoading();
  try {
    const url = await CloudinaryUpload.upload(file);
    // Save URL to hidden field
    document.getElementById('sResim').value = url;
    document.getElementById('sResimUrl').value = url;
    CloudinaryUpload.showPreview(url);
    Toast.success('Görsel başarıyla yüklendi!', 'Yükleme Başarılı');
    Analytics.track('gorsel_yuklendi', { event_category: 'admin' });
  } catch (err) {
    console.error('Cloudinary Upload Error:', err);
    CloudinaryUpload.showIdle();
    Toast.error('Görsel yüklenemedi. Cloudinary ayarlarınızı kontrol edin.', 'Yükleme Hatası');
  }
};

window.uploadTemizle = function (e) {
  e.stopPropagation();
  document.getElementById('sResim').value = '';
  document.getElementById('sResimUrl').value = '';
  document.getElementById('cloudinaryFileInput').value = '';
  CloudinaryUpload.showIdle();
};

const BrandingAnimation = (() => {
  const PHRASES = [
    'M. Enes Yalçın',
    'Heisenberg',
    'Yazılımcı',
    'Siber Güvenlik',
    'M. Enes Yalçın',
  ];

  const TYPE_SPEED_MIN = 55;
  const TYPE_SPEED_MAX = 95;
  const DELETE_SPEED = 38;
  const PAUSE_AFTER_TYPE = 2600;
  const PAUSE_AFTER_DEL = 420;

  let currentIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let timeoutId = null;

  function getRand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function tick(el) {
    const phrase = PHRASES[currentIndex];
    const current = phrase.substring(0, charIndex);
    el.childNodes[0]?.nodeType === Node.TEXT_NODE
      ? (el.childNodes[0].textContent = current)
      : (el.insertBefore(document.createTextNode(current), el.firstChild));

    if (!isDeleting) {
      if (charIndex < phrase.length) {
        charIndex++;
        timeoutId = setTimeout(() => tick(el), getRand(TYPE_SPEED_MIN, TYPE_SPEED_MAX));
      } else {
        // Fully typed — pause then delete
        isDeleting = true;
        timeoutId = setTimeout(() => tick(el), PAUSE_AFTER_TYPE);
      }
    } else {
      if (charIndex > 0) {
        charIndex--;
        timeoutId = setTimeout(() => tick(el), DELETE_SPEED);
      } else {
        // Fully deleted — next phrase
        isDeleting = false;
        currentIndex = (currentIndex + 1) % PHRASES.length;
        timeoutId = setTimeout(() => tick(el), PAUSE_AFTER_DEL);
      }
    }
  }

  function init() {
    const el = document.getElementById('brandingText');
    if (!el) return;

    // Set initial text node
    el.textContent = '';
    charIndex = 0;
    isDeleting = false;
    currentIndex = 0;

    // Small delay before starting
    timeoutId = setTimeout(() => tick(el), 900);
  }

  return { init };
})();

// ─── 16D. PAPER PLANE SEND BUTTON ────────────────
function iletisimFormuHazirla() {
  const form = document.getElementById('iletisimForm');
  if (!form) return;

  const btn = document.getElementById('mesajGonderBtn');
  const idleEl = btn?.querySelector('.btn-send-idle');
  const loadingEl = btn?.querySelector('.btn-send-loading');
  const successEl = btn?.querySelector('.btn-send-success');

  function setState(state) {
    if (!btn) return;
    // Reset classes
    btn.classList.remove('state-loading', 'state-success');
    [idleEl, loadingEl, successEl].forEach(el => el && (el.style.display = 'none'));

    if (state === 'idle') {
      btn.classList.remove('state-loading', 'state-success');
      if (idleEl) idleEl.style.display = 'flex';
      btn.disabled = false;
    } else if (state === 'loading') {
      btn.classList.add('state-loading');
      if (loadingEl) loadingEl.style.display = 'flex';
      btn.disabled = true;
    } else if (state === 'success') {
      btn.classList.add('state-success');
      if (successEl) successEl.style.display = 'flex';
      btn.disabled = true;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bildirim = document.getElementById('mesajBildirim');

    setState('loading');

    const mesajVerisi = {
      isim: document.getElementById('isim').value.trim(),
      email: document.getElementById('email').value.trim(),
      konu: document.getElementById('konu').value.trim(),
      mesaj: document.getElementById('mesaj').value.trim(),
      tarih: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Analytics
    Analytics.track('mesaj_gonder', {
      event_category: 'engagement',
      konu: mesajVerisi.konu
    });

    try {
      await db.collection("mesajlar").add(mesajVerisi);
      form.reset();
      setState('success');
      showFormNotification(bildirim, 'Mesajınız başarıyla iletildi! 🎉', 'success');
      Toast.success('Mesajınız gönderildi. En kısa sürede dönüş yapacağım!');
      setTimeout(() => setState('idle'), 3500);
    } catch (error) {
      console.error("Mesaj Gönderme Hatası:", error);
      setState('idle');
      showFormNotification(bildirim, 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
      Toast.error('Mesaj gönderilemedi. Bağlantınızı kontrol edin.', 'Gönderim Hatası');
    }
  });
}



// ─── 16. CURRENT FOCUS PROJECTS ───────────────────
const FocusProjects = (() => {
  const projects = [
  {
    "icon": "fa-solid fa-house-signal",
    "tag": "ESP8266 · Arduino Nano · IoT",
    "status": "Tamamlandı",
    "title": "Akıllı Ev Otomasyonu",
    "summary": "Wi-Fi üzerinden kontrol edilen, sensör destekli akıllı ev ve güvenlik sistemi.",
    "description": "Bu projede Wi-Fi üzerinden kontrol edilebilen ve çeşitli sensörlerle donatılmış bir akıllı ev ve güvenlik sistemi geliştirdim. NodeMCU (ESP8266) ile Arduino Nano, UART seri haberleşmesi üzerinden senkronize çalışıyor. Web arayüzüne yerel ağdan erişilebiliyor; ngrok ile sisteme internet üzerinden farklı konumlardan da ulaşılabiliyor.\n\nGüvenlik senaryosunda kızılötesi sıcaklık ve hareket sensörleri izinsiz girişleri algılıyor. Algılama sonrası kullanıcıya alarmı web arayüzünden kapatması için 10 saniye veriliyor. Alarm bu sürede kapatılmazsa buzzer ve siren devreye giriyor; siren 5 dakika boyunca çalıyor.\n\nYazılım tarafında C++ ve JavaScript kullandım; web arayüzünde Bootstrap’ten yararlandım. ESP8266WiFi.h, EEPROM, SoftwareSerial, WiFiUDP ve NTPClient kütüphaneleriyle çalıştım. Donanımda NodeMCU, Arduino Nano, 16 kanallı röle, LED’ler, transistör ve kontaktör kullandım.",
    "highlights": [
      "NodeMCU (ESP8266) ve Arduino Nano arasında UART haberleşmesi",
      "Wi-Fi ve web arayüzü üzerinden uzaktan kontrol",
      "Ngrok ile yerel ağ dışından erişim",
      "Kızılötesi sıcaklık ve hareket sensörleriyle algılama",
      "Alarmı web arayüzünden kapatmak için 10 saniyelik süre",
      "İptal edilmezse 5 dakika çalışan siren",
      "16 kanallı röle ile cihaz kontrolü",
      "Donanım: NodeMCU, Arduino Nano, LED, transistör ve kontaktör",
      "Ölçüm ve kurulum araçları: multimetre ve röleler"
    ],
    "tech": [
      "C++",
      "JavaScript",
      "NodeMCU ESP8266",
      "Arduino Nano",
      "UART",
      "ESP8266WiFi.h",
      "EEPROM",
      "SoftwareSerial",
      "WiFiUDP",
      "NTPClient",
      "Bootstrap",
      "Röle"
    ],
    "image": "",
    "links": [],
    "images": [
      "assets/img/projeIMG/1. akilli ev sistemi gorsel 1.jpeg",
      "assets/img/projeIMG/1. akilli ev sistemi gorsel 2.jpeg",
      "assets/img/projeIMG/1. akilli ev sistemi gorsel 3.jpeg",
      "assets/img/projeIMG/1. akilli ev sistemi gorsel 4.jpeg",
      "assets/img/projeIMG/1. akilli ev sistemi kamera.jpeg",
      "assets/img/projeIMG/2. akilli ev sistemi gorsel 1.jpeg",
      "assets/img/projeIMG/2. akilli ev sistemi gorsel 2.jpeg",
      "assets/img/projeIMG/2. akilli ev sistemi gorsel 3.jpeg",
      "assets/img/projeIMG/2. akilli ev sistemi gorsel 4.jpeg",
      "assets/img/projeIMG/3. akilli ev sistemi.jpeg",
      "assets/img/projeIMG/akilli ev ortak gorsel.jpeg"
    ]
  },
  {
    "icon": "fa-solid fa-robot",
    "tag": "Raspberry Pi · Python · Computer Vision",
    "status": "Takım projesi",
    "title": "Otonom Robotik Kol",
    "summary": "Kamera ile nesnelerin rengini, üzerindeki şekilleri ve konumlarını algılayarak küpleri doğru kutulara yerleştiren otonom robotik kol.",
    "description": "18. Uluslararası MEB Robot Yarışması kapsamında düzenlenen Endüstriyel Robotik Kol kategorisi için bir takım olarak otonom çalışan bir robotik kol geliştirdik. Projenin amacı, başlangıç alanında bulunan renkli ve desenli pleksi küpleri algılayarak özelliklerine uygun hedef kutulara otomatik olarak yerleştirmekti.\n\nGörüntü işleme tarafında Raspberry Pi 4, kamera ve Python kullandık. Kamera üzerinden alınan görüntüleri işleyerek küplerin yalnızca renklerini değil, üzerlerindeki şekilleri ve konumlarını da tespit eden bir sistem geliştirdik. Elde edilen veriler doğrultusunda nesnelerin sınıflandırılması ve hangi hedefe yerleştirileceğinin belirlenmesi üzerine çalıştık.\n\nMekanik tarafta en az dört eksenli eklemli bir robot kol kullandık. Nesnelerin alınması ve bırakılması için servo motor kontrollü bir tutucu tasarladık. Robotun mekanik tasarımında mevcut bir 3D modelden yararlandık ve bu modeli kendi ihtiyaçlarımıza uygun olacak şekilde düzenledik.\n\nYarışmanın en önemli gereksinimlerinden biri sistemin tamamen otonom çalışmasıydı. Bu nedenle robotun başlangıç komutundan sonra dışarıdan yönlendirme almadan algılama, karar verme ve hareket etme süreçlerini gerçekleştirmesi gerekiyordu.\n\nBu projede görüntü işleme, mekanik tasarım ve yazılımın fiziksel bir sistem üzerinde birlikte çalışmasını deneyimledim. Özellikle kamera üzerinden elde edilen bilgilerin robotun hareketlerine dönüştürülmesi, üzerinde yoğunlaştığımız temel konulardan biriydi.",
    "highlights": [
      "Kamera üzerinden nesne algılama",
      "Küplerin renklerini tespit etme",
      "Küpler üzerindeki şekilleri tanıma",
      "Nesnelerin konumlarını belirleme",
      "Python ile görüntü işleme",
      "Raspberry Pi 4 üzerinde sistem geliştirme",
      "En az dört eksenli eklemli robot kol",
      "Servo motor kontrollü tutucu",
      "Otonom nesne alma ve yerleştirme",
      "Yarışma gereksinimlerine uygun mekanik tasarım"
    ],
    "tech": [
      "Raspberry Pi 4",
      "Python",
      "Computer Vision",
      "Camera",
      "Servo Motors",
      "Robotics",
      "3D Design"
    ],
    "image": "",
    "links": [],
    "images": [
      "assets/img/projeIMG/robotkol.jpg"
    ]
  },
  {
    "icon": "fa-solid fa-plane",
    "tag": "YOLOv11 · Python · OpenCV · UAV",
    "status": "Takım projesi",
    "title": "CAPELLA – SİHA Projesi",
    "summary": "Görüntü işleme, elektronik entegrasyon ve 3D tasarım çalışmalarında görev aldığım insansız hava aracı projesi.",
    "description": "CAPELLA projesi kapsamında bir takım olarak insansız hava aracı geliştirme çalışmalarında yer aldım. Projenin farklı aşamalarında görüntü işleme, elektronik bağlantılar, araştırma, deneme ve tasarım süreçlerine katkı sağladım.\n\nGörüntü işleme tarafında Python, OpenCV ve YOLOv11 üzerine çalıştım. Görüntüler üzerinden nesne algılama ve sınıflandırma süreçleriyle ilgilendim. Modelin eğitimi ve görüntü işleme çalışmalarının yanı sıra bu sistemlerin projenin genel yapısına nasıl entegre edilebileceği üzerinde de çalıştım.\n\nElektronik tarafta genel kablolama ve bileşenlerin birbiriyle uyumlu çalışması üzerine görev aldım. Uçuş kontrol sistemi, güç dağıtımı ve diğer elektronik bileşenlerin birlikte çalışması için yapılan araştırma ve deneme süreçlerine katıldım.\n\nMekanik tasarım aşamasında Blender ağırlıklı olmak üzere 3D tasarım çalışmaları gerçekleştirdim. İhtiyaç duyduğumuz bazı tasarım ve modelleme işlemlerinde Tinkercad de kullandım.\n\nBu proje bana yalnızca yazılım geliştirme değil, bir hava aracının farklı disiplinlerden oluşan sistemlerinin birlikte çalışmasını anlama fırsatı verdi. Özellikle görüntü işleme, elektronik ve mekanik tasarımın aynı proje içerisinde buluşması benim açımdan önemli bir deneyim oldu.",
    "highlights": [
      "YOLOv11 ile nesne algılama çalışmaları",
      "Python ve OpenCV ile görüntü işleme",
      "Model eğitimi üzerine çalışmalar",
      "Elektronik sistemlerin genel kablolaması",
      "Bileşenlerin entegrasyonu ve test süreçleri",
      "Teknik araştırma ve deneysel çalışmalar",
      "Blender ile 3D tasarım",
      "Tinkercad ile modelleme çalışmaları",
      "Takım içerisinde farklı teknik alanlarda görev alma"
    ],
    "tech": [
      "Python",
      "YOLOv11",
      "OpenCV",
      "Blender",
      "Tinkercad",
      "UAV",
      "Image Processing",
      "Electronics"
    ],
    "image": "",
    "links": [],
    "images": [
      "assets/img/projeIMG/insansiz hava araci.jpeg",
      "assets/img/projeIMG/siha1.jpeg",
      "assets/img/projeIMG/siha2.jpeg",
      "assets/img/projeIMG/siha3.jpeg",
      "assets/img/projeIMG/siha4.jpeg",
      "assets/img/projeIMG/siha5.jpeg"
    ]
  },
  {
    "icon": "fa-solid fa-door-open",
    "tag": "C++ · Python · Web Automation",
    "status": "Tamamlandı",
    "title": "Kapı ve Aydınlatma Otomasyonu",
    "summary": "Bilgisayar üzerinden klavye komutları, web arayüzü ve Siri ile kapı ve aydınlatma sistemlerini kontrol eden otomasyon altyapısı.",
    "description": "Bu projede bir şirketin kapı ve aydınlatma sistemlerini uzaktan ve farklı kontrol yöntemleriyle yönetebileceğim bir otomasyon altyapısı geliştirdim. Projenin yazılım tarafını kendim hazırladım ve bilgisayar, web sunucusu ve ESP tabanlı donanım arasında çalışan bir yapı oluşturdum.\n\nDonanım tarafındaki kontrol yazılımını C++ ile geliştirdim. Web arayüzünü ise HTML, CSS ve JavaScript kullanarak hazırladım. Böylece fiziksel sistemlerin web üzerinden kontrol edilebilmesini sağladım.\n\nSistemin önemli parçalarından biri, bilgisayarda arka planda sürekli çalışan Python uygulamasıydı. Bu uygulama belirlediğim F9, F10 ve F11 gibi klavye tuşlarını dinliyor, ilgili tuşa basıldığında web sunucusuna HTTP isteği gönderiyordu. Sunucuya ulaşan istekler de ilgili kapı veya aydınlatma işleminin gerçekleştirilmesini sağlıyordu.\n\nAydınlatma kontrolünde tek ve çift basma gibi farklı komut davranışları oluşturdum. Kapı kontrolünde ise kısa süreli açma, açık tutma ve kapatma gibi farklı çalışma senaryoları geliştirdim. Ayrıca web ve Siri entegrasyonlarını da sisteme dahil ettim.\n\nBu projede özellikle Python ile arka plan uygulaması, HTTP istekleri, web teknolojileri ve mikrodenetleyici yazılımı arasında bağlantı kurarak farklı sistemleri tek bir otomasyon akışında birleştirdim.",
    "highlights": [
      "ESP üzerinde C++ ile kontrol yazılımı",
      "HTML, CSS ve JavaScript ile web arayüzü",
      "Arka planda sürekli çalışan Python uygulaması",
      "Klavye tuşlarını algılayan kontrol mekanizması",
      "HTTP istekleri ile sunucu iletişimi",
      "Farklı tuş kombinasyonlarıyla aydınlatma kontrolü",
      "Kapının süreli açılması ve açık tutulması",
      "Web üzerinden uzaktan kontrol",
      "Siri entegrasyonu"
    ],
    "tech": [
      "C++",
      "Python",
      "HTML",
      "CSS",
      "JavaScript",
      "HTTP",
      "ESP",
      "Web Automation",
      "IoT"
    ],
    "image": "",
    "links": [],
    "images": [
      "assets/img/projeIMG/sirket 1.jpeg",
      "assets/img/projeIMG/sirket 2.jpeg",
      "assets/img/projeIMG/sirket3.jpeg",
      "assets/img/projeIMG/WhatsApp Image 2026-11-23 at 15.32.34.jpeg"
    ]
  },
  {
    "icon": "fa-solid fa-car-side",
    "tag": "C# · Arduino · Bluetooth",
    "status": "Tamamlandı",
    "title": "Bluetooth Kontrollü Robot Araba",
    "summary": "C# ile geliştirdiğim masaüstü uygulaması üzerinden Bluetooth bağlantısıyla kontrol edilebilen, kamera destekli robot araba.",
    "description": "Bu projede Arduino ve HC-05 Bluetooth modülünü kullanarak uzaktan kontrol edilebilen bir robot araba geliştirdim. Projenin masaüstü yazılımını C# ve .NET Framework Windows Forms kullanarak kendim hazırladım.\n\nBilgisayar ile Arduino arasındaki iletişimi seri haberleşme üzerinden gerçekleştirdim. C# tarafında SerialPort kullanarak gönderilen komutların Bluetooth bağlantısı üzerinden Arduino’ya ulaşmasını sağladım. Arduino ise aldığı komutları işleyerek motorların hareketlerini kontrol ediyordu.\n\nKontrol uygulamasında hem WASD tuşlarıyla hem de arayüz üzerindeki butonlarla aracı yönlendirebilecek bir yapı oluşturdum. Ayrıca farları açıp kapatma, hız ayarı ve kamera görüntüsünü takip etme gibi özellikleri de uygulamaya ekledim.\n\nKamera tarafında AForge.NET kütüphanesinden yararlandım. Böylece kontrol uygulamasını yalnızca hareket komutlarının gönderildiği bir yazılım olmaktan çıkarıp kamera görüntüsünün de takip edilebildiği bir sisteme dönüştürdüm.\n\nBu projede özellikle C# ile masaüstü uygulama geliştirme, seri haberleşme, Bluetooth iletişimi ve Arduino tabanlı donanım kontrolü konularında çalıştım.",
    "highlights": [
      "Bluetooth üzerinden kablosuz kontrol",
      "Arduino ve HC-05 haberleşmesi",
      "C# Windows Forms kontrol uygulaması",
      "WASD tuşlarıyla araç kontrolü",
      "Arayüz butonlarıyla yönlendirme",
      "Farları açma ve kapatma",
      "Hız ayarı için slider kontrolü",
      "Kamera görüntüsünü uygulama üzerinden takip etme",
      "SerialPort ile seri haberleşme",
      "AForge.NET kullanımı"
    ],
    "tech": [
      "C#",
      ".NET Framework",
      "Windows Forms",
      "Arduino",
      "HC-05",
      "SerialPort",
      "AForge.NET",
      "Bluetooth"
    ],
    "image": "",
    "links": [
      {
        "label": "GitHub'da incele",
        "href": "https://github.com/heisenberg1098/Bluetooth-Kontrollu-Arac-C-"
      }
    ],
    "images": [
      "assets/img/projeIMG/bluetooth kontrollu arac.jpeg"
    ]
  },
  {
    "icon": "fa-solid fa-robot",
    "tag": "AI · Agent · Web",
    "status": "Aktif geliştirme",
    "title": "Web AI Agent",
    "summary": "Yapay zekâ servislerinden yararlanarak web üzerinde görev gerçekleştirebilen bir ajan geliştirme çalışması.",
    "description": "Bu projede yapay zekâ servislerini web teknolojileriyle bir araya getirerek web üzerinde belirli görevleri gerçekleştirebilen bir AI Agent geliştiriyorum.\n\nAmacım yalnızca kullanıcının sorularına yanıt veren bir sistem oluşturmak değil, verilen talimatları anlayabilen ve bu talimatlar doğrultusunda web üzerinde işlem yapabilen bir yapı geliştirmek.\n\nProje üzerinde yapay zekâ servislerinin entegrasyonu, görevlerin yönetilmesi ve web ortamındaki işlemlerin otomatikleştirilmesi üzerine çalışıyorum.",
    "highlights": [
      "Yapay zekâ servislerinin entegrasyonu",
      "Web tabanlı görev yönetimi",
      "Talimatları işleyebilen agent altyapısı",
      "Web işlemlerinin otomatikleştirilmesi"
    ],
    "tech": [
      "AI",
      "Agent",
      "Web",
      "Automation"
    ],
    "image": "",
    "links": [
      {
        "label": "GitHub'da incele",
        "href": "https://github.com/heisenberg1098/Web_Agent"
      }
    ],
    "images": [
      "assets/img/yapayZekaimg.png"
    ]
  },
  {
    "icon": "fa-solid fa-lightbulb",
    "tag": "ESP32 · Electronics · IoT",
    "status": "Tamamlandı",
    "title": "Masa Üstü Polis Çakarı",
    "summary": "ESP32 ve röleler kullanarak farklı yanıp sönme modlarına sahip, web ve Siri üzerinden kontrol edilebilen ışık sistemi.",
    "description": "Bu projeyi masaüstümde kullanmak amacıyla geliştirdiğim küçük bir elektronik otomasyon çalışması olarak tasarladım. ESP32 ve röleler kullanarak birden fazla ışığın farklı yanıp sönme senaryolarıyla çalışmasını sağladım.\n\nSistemde ışıkların sırayla yanıp sönmesi, bir ışık açıkken diğerinin kapalı kalması ve farklı flaş düzenlerinin oluşturulması gibi çalışma modları bulunuyor.\n\nDonanımın kontrolünü ESP32 üzerinden gerçekleştirdim. Ayrıca sistemi yalnızca fiziksel olarak kontrol edilen bir düzenek olarak bırakmayıp web arayüzü ve Siri entegrasyonu ile uzaktan yönetilebilir hâle getirdim.\n\nKüçük ölçekli bir proje olmasına rağmen mikrodenetleyici, röle kontrolü ve otomasyon mantığını bir araya getiren uygulamalı bir çalışma oldu.",
    "highlights": [
      "ESP32 tabanlı kontrol sistemi",
      "Rölelerle ışık kontrolü",
      "Alternatif yanıp sönme modları",
      "Sıralı ışık kontrolü",
      "Web üzerinden kontrol",
      "Siri entegrasyonu"
    ],
    "tech": [
      "ESP32",
      "Relay",
      "Electronics",
      "IoT",
      "Web Control",
      "Siri"
    ],
    "image": "",
    "links": [],
    "images": [
      "assets/img/projeIMG/kirmizi mavi isik.jpeg"
    ]
  }
];

  function init() {
    const list = document.getElementById('focusProjectList');
    const modal = document.getElementById('focusProjectModal');
    const closeButton = modal?.querySelector('.focus-project-close');
    const backdrop = modal?.querySelector('.focus-project-backdrop');
    if (!list || !modal || !closeButton || !backdrop) return;

    const image = document.getElementById('focusModalImage');
    const imageEmpty = document.getElementById('focusModalImageEmpty');
    const imageIcon = document.getElementById('focusModalIcon');
    const imagePrevious = document.getElementById('focusGalleryPrevious');
    const imageNext = document.getElementById('focusGalleryNext');
    const imageCount = document.getElementById('focusGalleryCount');
    const tag = document.getElementById('focusModalTag');
    const status = document.getElementById('focusModalStatus');
    const title = document.getElementById('focusModalTitle');
    const description = document.getElementById('focusModalDescription');
    const highlightsWrap = document.getElementById('focusModalHighlightsWrap');
    const highlights = document.getElementById('focusModalHighlights');
    const techList = document.getElementById('focusModalTech');
    const links = document.getElementById('focusModalLinks');
    const projectCount = document.getElementById('focusModalProjectCount');
    const projectPrevious = document.getElementById('focusModalPrevious');
    const projectNext = document.getElementById('focusModalNext');
    let lastTrigger = null;
    let previousOverflow = '';
    let currentProject = 0;
    let currentImage = 0;

    projects.forEach((project, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'focus-project-item';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-label', `${project.title} proje ayrıntılarını aç`);

      const icon = document.createElement('span');
      icon.className = 'focus-project-list-icon';
      icon.setAttribute('aria-hidden', 'true');
      const iconElement = document.createElement('i');
      iconElement.className = project.icon;
      icon.appendChild(iconElement);

      const content = document.createElement('span');
      content.className = 'focus-project-list-content';
      const label = document.createElement('span');
      label.className = 'focus-project-label';
      label.textContent = project.tag;

      const projectTitle = document.createElement('span');
      projectTitle.className = 'focus-project-title';
      projectTitle.textContent = project.title;

      const summary = document.createElement('span');
      summary.className = 'focus-project-summary';
      summary.textContent = project.summary;

      content.append(label, projectTitle, summary);
      const arrow = document.createElement('span');
      arrow.className = 'focus-project-list-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = '<i class="fas fa-arrow-right"></i>';
      button.append(icon, content, arrow);
      button.addEventListener('click', () => open(index, button));
      list.appendChild(button);
    });

    function showImage() {
      const project = projects[currentProject];
      const images = project.images || [];
      const hasImages = images.length > 0;
      image.hidden = !hasImages;
      imageEmpty.hidden = hasImages;
      imageIcon.className = project.icon;
      imagePrevious.hidden = images.length < 2;
      imageNext.hidden = images.length < 2;
      imageCount.hidden = images.length < 2;

      if (!hasImages) {
        image.removeAttribute('src');
        image.alt = '';
        return;
      }

      currentImage = (currentImage + images.length) % images.length;
      image.src = images[currentImage];
      image.alt = `${project.title} — görsel ${currentImage + 1}`;
      imageCount.textContent = `${currentImage + 1} / ${images.length}`;
    }

    function fillProject(index) {
      currentProject = (index + projects.length) % projects.length;
      currentImage = 0;
      const project = projects[currentProject];

      tag.textContent = project.tag;
      status.textContent = project.status;
      title.textContent = project.title;
      description.textContent = project.description;

      highlights.replaceChildren(...(project.highlights || []).map(item => {
        const li = document.createElement('li');
        li.textContent = item;
        return li;
      }));
      highlightsWrap.hidden = !project.highlights?.length;

      techList.replaceChildren(...project.tech.map(tech => {
        const pill = document.createElement('span');
        pill.className = 'focus-project-tech';
        pill.textContent = tech;
        return pill;
      }));

      links.replaceChildren(...project.links.map(link => {
        const anchor = document.createElement('a');
        anchor.className = 'focus-project-link';
        anchor.href = link.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = link.label;
        const externalIcon = document.createElement('i');
        externalIcon.className = 'fas fa-arrow-up-right-from-square';
        externalIcon.setAttribute('aria-hidden', 'true');
        anchor.appendChild(externalIcon);
        return anchor;
      }));
      projectCount.textContent = `${currentProject + 1} / ${projects.length}`;
      showImage();
      modal.querySelector('.focus-project-dialog').scrollTop = 0;
    }

    function open(index, trigger) {
      lastTrigger = trigger;
      previousOverflow = document.body.style.overflow;
      fillProject(index);

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeButton.focus();
    }

    function close() {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = previousOverflow;
      lastTrigger?.focus();
    }

    function stepProject(direction) {
      fillProject(currentProject + direction);
    }

    function stepImage(direction) {
      const imageTotal = projects[currentProject].images?.length || 0;
      if (imageTotal < 2) return;
      currentImage = (currentImage + direction + imageTotal) % imageTotal;
      showImage();
    }

    closeButton.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    projectPrevious.addEventListener('click', () => stepProject(-1));
    projectNext.addEventListener('click', () => stepProject(1));
    imagePrevious.addEventListener('click', () => stepImage(-1));
    imageNext.addEventListener('click', () => stepImage(1));
    document.addEventListener('keydown', event => {
      if (!modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') return close();
      if (event.key === 'ArrowLeft') return stepProject(-1);
      if (event.key === 'ArrowRight') return stepProject(1);
      if (event.key !== 'Tab') return;

      const focusable = [...modal.querySelectorAll('button:not([hidden]), a[href]')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  return { init };
})();

const AchievementDetails = (() => {
  function init() {
    const modal = document.getElementById('achievementDetailModal');
    const trigger = document.querySelector('[data-achievement-detail]');
    const closeButton = modal?.querySelector('.focus-project-close');
    const backdrop = modal?.querySelector('.focus-project-backdrop');
    const dialog = modal?.querySelector('.focus-project-dialog');
    if (!modal || !trigger || !closeButton || !backdrop || !dialog) return;

    let lastTrigger = null;
    let previousOverflow = '';

    function open() {
      lastTrigger = document.activeElement;
      previousOverflow = document.body.style.overflow;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeButton.focus();
    }

    function close() {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = previousOverflow;
      lastTrigger?.focus();
    }

    trigger.addEventListener('click', open);
    modal.querySelectorAll('[data-achievement-close]').forEach(element => {
      element.addEventListener('click', close);
    });
    document.addEventListener('keydown', event => {
      if (!modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') return close();
      if (event.key !== 'Tab') return;

      const focusable = [...modal.querySelectorAll('button:not([hidden]), a[href]')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  return { init };
})();

// ─── 17. INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  SidebarManager.init();
  NavHighlighter.init();
  AnimationManager.init();
  AnimationManager.animateSkills();
  OfflineManager.init();
  FocusProjects.init();
  AchievementDetails.init();

  WebsiteLoader.load();
  BilgilendirmeLoader.load();
  iletisimFormuHazirla();
  siteEkleFormHazirla();
  editFormHazirla();
  CloudinaryUpload.init();
  BrandingAnimation.init();
  Analytics.init();

  ['adminEmail', 'pSifre'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', event => {
      if (event.key === 'Enter') adminGirisKontrol();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('adminModal').style.display = 'none';
      editModalKapat();
    }
  });
});


function updateStat(id, value) {
  const stat = document.getElementById(id);
  if (!stat) return;
  stat.textContent = value;
  const card = stat.closest('.stat-card');
  if (card) card.setAttribute('aria-busy', 'false');
}

db.collection("websiteler").where("isPublished", "==", true).get().then((querySnapshot) => {
  updateStat("yayınlanmissite", querySnapshot.size);
  const totalViews = querySnapshot.docs.reduce((total, doc) => {
    const views = Number(doc.data().views);
    return total + (Number.isFinite(views) ? views : 0);
  }, 0);
  updateStat("sitegoruntulenme", totalViews);
}).catch((error) => {
  console.error("Site sayaçları yüklenirken hata:", error);
  updateStat("yayınlanmissite", "—");
  updateStat("sitegoruntulenme", "—");
});



const BilgilendirmeLoader = (() => {

  function load() {
    const BilgiGor = document.getElementById("bilgilendirmeContainer");

    if (!BilgiGor) return; 

    db.collection("Bilgilendirme").onSnapshot(snapshot => {
      let toplam = 0;
      let htmlIcerik = ""; 

      const el = id => document.getElementById(id);
      updateStat("bilgilendirme", snapshot.size);

      // Veri yoksa yapılacaklar
      if (snapshot.empty) {
        BilgiGor.innerHTML = '<p style="color:var(--c-text-2); font-size:1.4rem; text-align:center; padding: 2rem;">Henüz Bilgi eklenmemiş.</p>';
        if (el('statTotal')) el('statTotal').textContent = 0;
        return;
      }

      snapshot.forEach(doc => {
        toplam++;
        
        const veri = doc.data(); 

        htmlIcerik += `
<div class="robot-featured in-view" data-animate> 
    <div class="robot-featured-content"> 
        <div class="robot-featured-label"> 
            <i class="fas fa-virus"></i> Yazılım
        </div> 
        <h3 class="robot-featured-title"> ${veri.baslik || 'Başlık Yok'} </h3> 
        <p id="bilgiicerik" class="bilgi-featured-desc-kisa"> ${veri.uzunAciklama || ''}  </p><span class="devamigorBtn" onclick="devamigor(this)" style="cursor:pointer; color:var(--c-primary, #0066ff); font-weight:600; display:inline-block; margin-bottom:1rem;">Devamını Göster</span> 
        <div class="robot-tag-row"> 
            <span class="robot-tag">${veri.tag1 || 'Bilgi'}</span> 
            <span class="robot-tag">${veri.tag2 || 'Yazılım'}</span> 
        </div> 
    </div> 
</div>`;
      });

      BilgiGor.innerHTML = htmlIcerik;

    }, error => {
      console.error("Bilgilendirme verileri yüklenirken hata:", error);
      updateStat("bilgilendirme", "—");
      BilgiGor.innerHTML = '<p style="color:var(--c-text-2); font-size:1.4rem; text-align:center; padding: 2rem;">Bilgilendirme içerikleri şu anda yüklenemiyor.</p>';
    });
  }

  return {
    load
  };
})();

function devamigor(tikananSpan) {
  const aciklamaP = tikananSpan.previousElementSibling;
  
  if (!aciklamaP) return;

  if (aciklamaP.classList.contains("bilgi-featured-desc-kisa")) {
    aciklamaP.classList.remove("bilgi-featured-desc-kisa");
    aciklamaP.classList.add("bilgi-featured-desc-uzun");
    tikananSpan.innerHTML = "Daha Az Göster";
  } else {
    aciklamaP.classList.remove("bilgi-featured-desc-uzun");
    aciklamaP.classList.add("bilgi-featured-desc-kisa");
    tikananSpan.innerHTML = "Devamını Göster";
  }
}

