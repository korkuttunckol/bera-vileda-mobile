# BERA VİLEDA SİPARİŞ SİSTEMİ

Saha satış personelinin müşterilerden sipariş toplaması için geliştirilen offline-first PWA uygulaması.

**Sürüm:** 2.0.0

## Teknolojiler

- React 19 + Vite + TypeScript (Strict)
- Tailwind CSS
- Firebase Authentication + Firestore
- IndexedDB (Dexie.js)
- PWA (vite-plugin-pwa)
- React Router v7
- Zustand
- SheetJS (Excel içe aktarma)

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasına Firebase bilgilerinizi girin

# Geliştirme sunucusu
npm run dev

# Production build
npm run build

# Production önizleme (PWA test için önerilir)
npm run preview

# Lint kontrolü
npm run lint
```

## Proje Yapısı

```
src/
├── app/          # Uygulama kabuğu, router, layout
├── features/     # İş modülleri (auth, orders, customers...)
├── shared/       # Paylaşılan bileşenler, lib, utils
├── stores/       # Global state (Zustand)
└── config/       # Uygulama ve Firebase yapılandırması
```

## Geliştirme Fazları

| Faz | Durum | Kapsam |
|-----|-------|--------|
| Faz 1 | ✅ | Scaffold, Auth, Layout, PWA |
| Faz 2 | ✅ | IndexedDB, Sync Engine, Idempotency, SyncReport |
| Faz 3 | ✅ | Müşteriler (Cari + Şube) |
| Faz 4 | ✅ | Ürünler, Sepet, Sayısal Klavye |
| Faz 5 | ✅ | Offline Sipariş, Geçmiş, Sync Report |
| Faz 6 | ✅ | Ayarlar, Excel İçe Aktarma, Stok Güncelleme |
| V1.0 | ✅ | Derleme, lint, PWA doğrulama |
| Faz 7 | ✅ | Logo GO Wings dosya adapter, Firestore rules v2 |
| V2.0 | ✅ | Logo aktarım Excel, ERP deferred sync, rules uyumu |

## Firebase Yapılandırması

`.env` dosyasında aşağıdaki değişkenler gereklidir (canlı senkronizasyon için):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Firebase yapılandırması olmadan uygulama açılır; giriş ve bulut senkronizasyonu devre dışı kalır.

## Lisans

Proprietary — BERA VİLEDA
