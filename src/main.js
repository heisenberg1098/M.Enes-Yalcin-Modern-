/* ═══════════════════════════════════════════════
   main.js — M.Enes Yalçın Portfolio
   Refactored: modern, modular, production-ready
   v2.0 — Toast · CMS CRUD · Error Handling · Status System
   ════════════════════════════════════════════ */

// ─── 1. FIREBASE INIT ────────────────────────────
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

// ─── 2. TOAST NOTIFICATION SYSTEM ───────────────
const Toast = (() => {
  const ICONS = {
    success: 'fa-check-circle',
    error:   'fa-exclamation-circle',
    info:    'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };
  const TITLES = {
    success: 'Başarılı',
    error:   'Hata',
    info:    'Bilgi',
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
    error:   (msg, title) => show(msg, 'error', title),
    info:    (msg, title) => show(msg, 'info', title),
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

    window.addEventListener('online',  update);
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
    document.body.style.position  = 'fixed';
    document.body.style.top       = `-${_scrollY}px`;
    document.body.style.width     = '100%';
    document.body.style.overflowY = 'scroll'; // prevent layout shift

    _sidebar.classList.add('open');
    if (_overlay) _overlay.classList.add('active');
  }

  function close() {
    if (!_sidebar) return;
    // Restore scroll position
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.width     = '';
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
      link.rel  = 'stylesheet';
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

    // ÇÖZÜM: Katı where filtresi yerine tüm listeyi çekip frontend üzerinde kontrollü süzüyoruz
    _unsubscribe = db.collection("websiteler")
      .orderBy("tarih", "desc")
      .onSnapshot(
        (querySnapshot) => {
          _retryCount = 0;
          container.innerHTML = '';

          const activeDocs = [];
          querySnapshot.forEach(doc => {
            const d = doc.data();
            const status = d.status || 'active';
            
            // Sadece aktif yayında olanları VEYA senin geliştirme aşamasında (development) bıraktığın siteleri vitrinde gösteriyoruz.
            // Taslak (draft) ve Arşivlenmiş (archived) siteler ana sayfada gizlenir.
            if (status === 'active' || status === 'development' || d.isPublished === true) {
              activeDocs.push(doc);
            }
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

          // Premium Fade-in Giriş Animasyonu (Sonsuz döngü yaratan viewObserver kaldırıldı)
          container.querySelectorAll('.web-card').forEach((card, i) => {
            card.style.opacity   = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`;
            requestAnimationFrame(() => setTimeout(() => {
              card.style.opacity   = '1';
              card.style.transform = 'translateY(0)';
            }, 50));
          });
        },
        (error) => {
          console.error("Firestore Websiteler Hatası:", error);
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
        }
      );
  }

  return { load };
})();

// Expose for retry button onclick (global scope, minimal)
window.WebsiteLoader = WebsiteLoader;

async function tiklaniSayisiArtir(docId, projeAdi) {
  try {
    await db.collection("websiteler").doc(docId).update({
      tiklanmaSayisi: firebase.firestore.FieldValue.increment(1),
      clicks: firebase.firestore.FieldValue.increment(1)
    });
    // Analytics event
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
  el.className   = `form-notification ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ─── 10. ADMIN: LOGIN MODAL ──────────────────────
function adminPopUpAc() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('pSifre')?.focus(), 100);
  }
}

async function adminGirisKontrol() {
  const girilen = document.getElementById('pSifre')?.value;
  if (!girilen) return;

  try {
    const doc = await db.collection("ayarlar").doc("admin").get();
    if (doc.exists && doc.data().sifre === girilen) {
      document.getElementById('adminModal').style.display = 'none';
      document.getElementById('pSifre').value = '';
      const panel = document.getElementById('adminPanel');
      panel.style.display        = 'flex';
      panel.style.flexDirection  = 'column';
      adminMesajlariYukle();
      adminProjeleriYukle();
    } else {
      const input = document.getElementById('pSifre');
      input.style.borderColor = '#ef4444';
      input.style.animation   = 'shake 0.4s ease';
      Toast.error('Yanlış şifre. Tekrar deneyin.', 'Giriş Başarısız');
      setTimeout(() => {
        input.style.borderColor = '';
        input.style.animation   = '';
        input.value  = '';
        input.focus();
      }, 500);
    }
  } catch (err) {
    console.error("Admin giriş hatası:", err);
    Toast.error('Bağlantı hatası. Firestore ayarlarını kontrol edin.', 'Bağlantı Hatası');
  }
}

// CSS shake animation injection
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-6px); }
    80%       { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeStyle);

// ─── 11. ADMIN: ADD PROJECT FORM ─────────────────
function siteEkleFormHazirla() {
  const form = document.getElementById('siteEkleForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Ekleniyor…';

    const status = document.getElementById('sStatus')?.value || 'active';
    const yeniSite = {
      isim:        document.getElementById('sAd').value.trim(),
      link:        document.getElementById('sLink').value.trim(),
      font:        document.getElementById('sFont').value.trim(),
      aciklama:    document.getElementById('sAciklama').value.trim(),
      resim:       document.getElementById('sResim')?.value.trim() || '',
      tags:        document.getElementById('sTags')?.value.trim() || '',
      status:      status,
      isPublished: status === 'active',
      tarih:       firebase.firestore.FieldValue.serverTimestamp()
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
        btn.disabled  = false;
      }, 2000);
    } catch (err) {
      console.error("Site ekleme hatası:", err);
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Hata!';
      Toast.error('Proje eklenemedi. Tekrar deneyin.', 'Ekleme Hatası');
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-rocket"></i> Siteyi Yayınla';
        btn.disabled  = false;
      }, 2000);
    }
  };
}

// ─── 12. ADMIN: PROJECT MANAGEMENT (CMS CRUD) ────
const STATUS_LABELS = {
  active:      { label: 'Yayında',     cls: 'active' },
  draft:       { label: 'Taslak',      cls: 'draft' },
  archived:    { label: 'Arşiv',       cls: 'archived' },
  development: { label: 'Geliştirme',  cls: 'development' }
};

function adminProjeleriYukle() {
  const liste = document.getElementById('adminProjeListesi');
  if (!liste) return;

  db.collection("websiteler").orderBy("tarih", "desc").onSnapshot(snapshot => {
    // Update stats
    let total = 0, active = 0, draft = 0;
    snapshot.forEach(doc => {
      total++;
      const s = doc.data().status || 'active';
      if (s === 'active')      active++;
      else if (s === 'draft')  draft++;
    });
    const el = id => document.getElementById(id);
    if (el('statTotal'))  el('statTotal').textContent  = total;
    if (el('statActive')) el('statActive').textContent = active;
    if (el('statDraft'))  el('statDraft').textContent  = draft;

    // Render list
    liste.innerHTML = '';
    if (snapshot.empty) {
      liste.innerHTML = '<p style="color:var(--c-text-2); font-size:1.4rem; text-align:center; padding: 2rem;">Henüz proje eklenmemiş.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const p      = doc.data();
      const status = p.status || 'active';
      const sInfo  = STATUS_LABELS[status] || STATUS_LABELS.active;

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
}

async function projeYayinla(id) {
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
  try {
    const doc = await db.collection("websiteler").doc(id).get();
    if (!doc.exists) {
      Toast.error('Proje bulunamadı.', 'Hata');
      return;
    }
    const p = doc.data();
    document.getElementById('editDocId').value       = id;
    document.getElementById('editAd').value          = p.isim || '';
    document.getElementById('editLink').value        = p.link || '';
    document.getElementById('editFont').value        = p.font || '';
    document.getElementById('editTags').value        = p.tags || '';
    document.getElementById('editAciklama').value    = p.aciklama || '';
    document.getElementById('editResim').value       = p.resim || '';
    document.getElementById('editStatus').value      = p.status || 'active';
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
    const id   = document.getElementById('editDocId').value;
    const btn  = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Kaydediliyor…';

    const status = document.getElementById('editStatus').value;
    const guncelleme = {
      isim:        document.getElementById('editAd').value.trim(),
      link:        document.getElementById('editLink').value.trim(),
      font:        document.getElementById('editFont').value.trim(),
      tags:        document.getElementById('editTags').value.trim(),
      aciklama:    document.getElementById('editAciklama').value.trim(),
      resim:       document.getElementById('editResim').value.trim(),
      status:      status,
      isPublished: status === 'active',
      guncelleme:  firebase.firestore.FieldValue.serverTimestamp()
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
window.projeEdit           = projeEdit;
window.projeYayinla        = projeYayinla;
window.projeYayindanKaldir = projeYayindanKaldir;
window.projeSil            = projeSil;

// ─── 13. ADMIN: LIST & DELETE MESSAGES ───────────
function adminMesajlariYukle() {
  const liste = document.getElementById('adminMesajListesi');
  if (!liste) return;

  db.collection("mesajlar").orderBy("tarih", "desc").onSnapshot(snapshot => {
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
}

function mesajSil(id) {
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
  document.getElementById('adminPanel').style.display = 'none';
}
window.panelKapat = panelKapat;

// ─── 14. ADMIN TABS ──────────────────────────────
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));

  const tabEl  = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  const viewEl = document.getElementById(`view${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
  if (tabEl)  tabEl.classList.add('active');
  if (viewEl) viewEl.classList.add('active');
}
window.switchAdminTab = switchAdminTab;

// ─── 15. UTILITY ─────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
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
    document.getElementById('uploadIdle').style.display    = 'none';
    document.getElementById('uploadLoading').style.display = 'flex';
    document.getElementById('uploadPreview').style.display = 'none';
  }

  function showPreview(url) {
    document.getElementById('uploadIdle').style.display    = 'none';
    document.getElementById('uploadLoading').style.display = 'none';
    const preview = document.getElementById('uploadPreview');
    document.getElementById('uploadPreviewImg').src = url;
    preview.style.display = 'block';
  }

  function showIdle() {
    document.getElementById('uploadIdle').style.display    = 'flex';
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
window.cloudinaryTikla = function() {
  document.getElementById('cloudinaryFileInput')?.click();
};

window.cloudinaryUpload = async function(file) {
  if (!file) return;
  CloudinaryUpload.showLoading();
  try {
    const url = await CloudinaryUpload.upload(file);
    // Save URL to hidden field
    document.getElementById('sResim').value    = url;
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

window.uploadTemizle = function(e) {
  e.stopPropagation();
  document.getElementById('sResim').value    = '';
  document.getElementById('sResimUrl').value = '';
  document.getElementById('cloudinaryFileInput').value = '';
  CloudinaryUpload.showIdle();
};

// ─── 16C. BRANDING TYPEWRITER ANIMATION ──────────
const BrandingAnimation = (() => {
  const PHRASES = [
    'M. Enes Yalçın',
    'Full Stack Dev',
    'AI Systems',
    'Building Digital Systems',
    'M. Enes Yalçın',
  ];

  // Timing (ms) — premium, unhurried feel
  const TYPE_SPEED_MIN  = 55;
  const TYPE_SPEED_MAX  = 95;
  const DELETE_SPEED    = 38;
  const PAUSE_AFTER_TYPE = 2600;
  const PAUSE_AFTER_DEL  = 420;

  let currentIndex = 0;
  let charIndex     = 0;
  let isDeleting    = false;
  let timeoutId     = null;

  function getRand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function tick(el) {
    const phrase   = PHRASES[currentIndex];
    const current  = phrase.substring(0, charIndex);
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

  const btn       = document.getElementById('mesajGonderBtn');
  const idleEl    = btn?.querySelector('.btn-send-idle');
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
      isim:  document.getElementById('isim').value.trim(),
      email: document.getElementById('email').value.trim(),
      konu:  document.getElementById('konu').value.trim(),
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

// ─── 16. INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  SidebarManager.init();
  NavHighlighter.init();
  AnimationManager.init();
  AnimationManager.animateSkills();
  OfflineManager.init();

  WebsiteLoader.load();
  iletisimFormuHazirla();
  siteEkleFormHazirla();
  editFormHazirla();
  CloudinaryUpload.init();
  BrandingAnimation.init();
  Analytics.init();

  // Password field Enter key
  const pSifre = document.getElementById('pSifre');
  if (pSifre) pSifre.addEventListener('keydown', e => {
    if (e.key === 'Enter') adminGirisKontrol();
  });

  // Close admin login modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('adminModal').style.display = 'none';
      editModalKapat();
    }
  });
});
