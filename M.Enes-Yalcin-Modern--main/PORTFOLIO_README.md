# 🎨 Premium Portfolio Yönetim Sistemi

Modern, yönetilebilir ve ajans kalitesinde portföy web sitesi.

---

## ✨ Özellikler

### 🎯 Frontend (index.html)
- **Premium tasarım** — Pigment-inspired, düşük lighting, glassmorphism
- **Smooth animasyonlar** — Fade-in, hover effects, cursor glow
- **Scroll progress bar** — Sayfa ilerlemesi göstergesi
- **Lazy loading** — Performans optimize edilmiş görsel yükleme
- **Responsive** — Tüm cihazlarda mükemmel görünüm

### 🛠️ Admin Panel (admin.html)
- **Modern dashboard** — Sidebar + main content layout
- **İstatistik kartları** — Toplam, aktif, pasif site sayıları
- **CRUD işlemleri** — Ekle, düzenle, sil
- **Yayın kontrolü** — Toggle ile siteleri aktif/pasif yapma
- **Arama & filtreleme** — Hızlı erişim
- **Firebase Authentication** — Güvenli giriş sistemi

### 🎨 Tasarım Detayları
- **Renk paleti:**
  - Primary: `#0a0a0a` (Mat siyah)
  - Accent: `#6366f1 → #a855f7` (Mor-lacivert gradient)
  - Text: `#eaeaea` (Off-white)
  
- **Tipografi:**
  - Manrope (display)
  - Inter (body)
  
- **Efektler:**
  - Cursor glow
  - Glassmorphism
  - Soft shadows
  - Gradient borders

---

## 🚀 Kurulum

### 1. Firebase Ayarları

`admin.html` ve `index.html` dosyalarında Firebase config bilgilerini güncelle:

```javascript
const firebaseConfig = {
    apiKey: "SENIN_API_KEY",
    authDomain: "SENIN_AUTH_DOMAIN",
    projectId: "SENIN_PROJECT_ID",
    storageBucket: "SENIN_STORAGE_BUCKET",
    messagingSenderId: "SENIN_SENDER_ID",
    appId: "SENIN_APP_ID"
};
```

### 2. Firestore Koleksiyon

Firestore'da `websites` koleksiyonu oluştur.

**Veri yapısı:**

```javascript
{
  title: "Site Adı",
  description: "Site açıklaması",
  link: "https://site.com",
  image: "https://gorsel-url.com/image.jpg",
  isActive: true,
  createdAt: timestamp
}
```

### 3. Firebase Authentication

Admin paneli için Authentication'ı aktive et:
- Firebase Console → Authentication → Email/Password yöntemini aç
- Bir admin kullanıcısı oluştur

### 4. Firestore Kuralları

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /websites/{website} {
      // Herkes okuyabilir (frontend için)
      allow read: if true;
      
      // Sadece giriş yapmış kullanıcılar yazabilir (admin için)
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📖 Kullanım

### Frontend (Ana Sayfa)

1. `index.html` dosyasını aç
2. Sadece `isActive: true` olan siteler görünür
3. Kullanıcılar sitelere tıklayarak proje detaylarına gidebilir

### Admin Panel

1. `admin.html` dosyasını aç
2. Email ve şifre ile giriş yap
3. **Yeni site ekle:**
   - "Yeni Site Ekle" butonuna tıkla
   - Formu doldur
   - Kaydet

4. **Site düzenle:**
   - Düzenle ikonuna tıkla
   - Bilgileri güncelle
   - Kaydet

5. **Yayın kontrolü:**
   - Toggle switch ile aktif/pasif yap
   - Değişiklik anında Firestore'a kaydedilir

6. **Site sil:**
   - Çöp kutusu ikonuna tıkla
   - Onay ver

---

## 🎯 Özellik Detayları

### Yayın Kontrolü

Toggle switch kullanarak siteleri yayınla/kaldır:

```javascript
// Frontend (index.html) sadece bunları gösterir:
where('isActive', '==', true)
```

### Arama & Filtreleme

- **Arama:** Site adı ve açıklamada ara
- **Filtreler:**
  - Tümü
  - Yayında
  - Pasif

### İstatistikler

Real-time olarak güncellenir:
- Toplam site sayısı
- Yayında olan siteler
- Pasif siteler

---

## 🎨 Tasarım Değişiklikleri

### Renkleri Özelleştir

`index.html` ve `admin.html` dosyalarındaki CSS değişkenlerini düzenle:

```css
:root {
    --bg-primary: #0a0a0a;
    --accent-primary: #6366f1;
    --accent-secondary: #a855f7;
}
```

### Logo Değiştir

```html
<div class="logo">Portfolio</div>
```

Buraya kendi logo metnini veya `<img>` tagini ekle.

---

## 📱 Responsive

- **Desktop:** Full sidebar + main content
- **Tablet:** Optimized layout
- **Mobile:** Sidebar gizli, tek sütun

---

## 🔒 Güvenlik

1. **Firebase Rules:** Sadece authenticated kullanıcılar yazabilir
2. **Environment Variables:** Production'da config bilgilerini environment variable olarak sakla
3. **Admin URL:** `admin.html` dosyasını robots.txt'e ekle

---

## 🚀 Production

### Hosting (Firebase Hosting)

```bash
firebase init hosting
firebase deploy
```

### Custom Domain

Firebase Console → Hosting → Add custom domain

---

## 📊 Performans

- **Lazy Loading:** Görseller lazy load
- **CSS Optimizasyonu:** Inline critical CSS
- **Firebase Caching:** Firestore cache aktif
- **Smooth Animations:** GPU-accelerated transforms

---

## 🐛 Sorun Giderme

### Sites loading error

**Çözüm:** Firestore kurallarını kontrol et, `websites` koleksiyonu var mı?

### Admin login failed

**Çözüm:** Firebase Authentication aktif mi? Email/password yöntemi açık mı?

### Images not loading

**Çözüm:** Görsel URL'leri kontrol et, CORS hatası var mı?

---

## 📝 TODO (Gelecek Özellikler)

- [ ] Drag & drop ile sıralama
- [ ] Bulk operations (toplu aktif/pasif)
- [ ] Analytics entegrasyonu
- [ ] Image upload (Firebase Storage)
- [ ] Dark/Light mode toggle
- [ ] Export to PDF
- [ ] Multi-language support

---

## 🎯 Amaç

Bu sistem:
- Profesyonel ajans hissi verir
- Kolayca yönetilebilir
- Tek tıkla siteler yayınlanır/kaldırılır
- Production-ready

---

## 👨‍💻 Geliştirici

**M.Enes Yalçın**

---

## 📄 Lisans

Bu proje eğitim amaçlıdır. İstediğiniz gibi kullanabilirsiniz.

