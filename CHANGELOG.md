# Changelog

Tüm önemli değişiklikler bu dosyada sürüm numarası ve tarih ile kayıt altına alınır.

Format [Keep a Changelog](https://keepachangelog.com/) standardına uygundur.

---

---

---

---

---

---

## [1.0.0] - 2026-07-18

### V1.0 — İlk Kararlı Sürüm

#### Düzeltilen
- TypeScript derleme hataları: `auth/index.ts` ve `NullErpAdapter` import yolları
- ESLint strict kuralları: 111 uyarı/hata giderildi (`npm run lint` temiz)
- `FormEvent` → `SubmitEvent` (React 19 uyumu)
- PWA manifest `lang: tr` ayarı
- Firebase env tipleri opsiyonel yapıldı (`.env` olmadan geliştirme)

#### Doğrulanan
- `npm run build` hatasız tamamlanıyor
- PWA: `sw.js`, `workbox`, `manifest.webmanifest`, ikonlar (`192`/`512`) üretiliyor
- Production bundle: `dist/` klasörü hazır

---

## [0.6.0] - 2026-07-18

### Faz 6 — Excel İçe Aktarma & Ayarlar

#### Eklenen
- Ayarlar menüsü: Ürün/Cari içe aktarma, Depo stok güncelleme, İçe Aktarma Raporları, Sipariş Verilerini Temizle, Uygulama Bilgileri
- SheetJS (`xlsx`) ile Excel parse — Türkçe sütun alias desteği
- Ürün içe aktarma: yeni kayıt oluştur, mevcut SKU güncelle, silme yok
- Cari içe aktarma: yeni kayıt oluştur, mevcut kod güncelle, silme yok (`source: excel`)
- Depo stok güncelleme: yalnızca Excel'deki ürünlerin stokları güncellenir
- İçe aktarma sonrası ayrıntılı rapor (yeni/güncellenen/hatalı/bulunamayan)
- `ImportReportCard`, `ExcelFilePicker` bileşenleri
- İçe aktarma raporları IndexedDB `importLogs` store'da saklanır
- Sipariş verilerini temizleme (onaylı): siparişler, satırlar ve sipariş sync kuyruğu
- IndexedDB v5: `importLogs` store

#### Değiştirilen
- Uygulama sürümü: `0.6.0`

---

## [0.5.0] - 2026-07-18

### Faz 5 — Offline Sipariş & Sipariş Geçmişi

#### Eklenen
- Sipariş senkronizasyon durumları: Bekliyor (Offline), Gönderiliyor, Gönderildi, Hatalı
- `orderService.createFromDraft` — offline-first sipariş kaydı (UUID `localId`)
- `SaveOrderStep` — sipariş kaydetme adımı (tam akış tamamlandı)
- Offline mesaj: "Sipariş telefon hafızasına kaydedildi."
- Sipariş Geçmişi: Tümü / Bekleyen / Gönderildi / Hatalı filtreleri
- `OrderCard`, `OrderStatusBadge` bileşenleri
- "Bekleyen Siparişleri Gönder" butonu (Sipariş Geçmişi)
- Sync Report genişletildi: Gönderilen, Başarılı, Başarısız, Bekleyen
- Sipariş soft delete altyapısı (`isDeleted`)
- Idempotency: aynı sipariş (`localId`) ikinci kez gönderilemez
- Dashboard: bugünkü sipariş sayısı
- IndexedDB v4: `orderSyncStatus`, `isDeleted` indexleri

#### Değiştirilen
- PushSync: sipariş durumu `sending` → `sent` / `failed` güncellemesi
- SyncReportCard: yeni rapor metrikleri
- Uygulama sürümü: `0.5.0`

---

## [0.4.0] - 2026-07-18

### Faz 4 — Ürünler, Sepet & Sayısal Klavye

#### Eklenen
- Ürün veri modeli: barkod, ürün kodu (`sku`), ad, birim, depo stok (`stockQuantity`)
- Ürün listesi ve arama (barkod, kod, ad — Türkçe locale)
- `ProductCard` — ad, kod, depo stok; stok 0 ise kırmızı uyarı
- `NumericQuantityInput` — +/- butonlar, mobil sayısal klavye (`inputMode="numeric"`)
- Sepet: anlık toplam (ara toplam + KDV + genel toplam)
- Sepet satırı silme ve miktar güncelleme
- Sipariş akışı: Ürünler ve Sepet adımları tam çalışır
- `FloatingCartBar` — ürün adımında anlık sepet özeti
- Barkod okuma hazır yapı (Enter ile barkod/kod eşleştirme)
- Demo ürün seed (ilk açılışta katalog boşsa 5 örnek ürün)
- `orderCalculations` utility — satır ve sipariş toplamları

#### Değiştirilen
- `orderDraftStore` — `addToCart`, `updateLineQuantity`, `removeLine`
- `OrderDraftLine` — `unit`, `stockQuantity` alanları
- Kaydet adımı özet gösterir (Faz 5'te persist)
- Uygulama sürümü: `0.4.0`

---

## [0.3.0] - 2026-07-18

### Faz 3 — Müşteri & Şube Yönetimi

#### Eklenen
- Müşteri listesi: hızlı arama, cari kodu/ad arama, alfabetik sıralama
- Aktif/Pasif filtre altyapısı (`ActiveFilter` bileşeni)
- Müşteri CRUD: Yeni Müşteri, Müşteri Düzenle (offline-first)
- Şube yönetimi: liste, ekle, düzenle, soft delete
- Soft delete altyapısı (`isDeleted: true`) — müşteri ve şube
- `CustomerBranch` veri modeli (ad, adres, telefon, yetkili)
- Manuel ve Excel müşterileri aynı `Customer` yapısını kullanır (`source` alanı)
- IndexedDB v3: `branches` store, `isActive`/`isDeleted` indexleri
- PushSync: müşteri ve şube Firestore senkronizasyonu
- Sipariş akışı mimarisi: Müşteri → Şube → Ürün → Sepet → Kaydet
- `orderDraftStore` + adım göstergesi (`OrderStepIndicator`)
- Yeni Sipariş: müşteri ve şube seçim adımları çalışır durumda
- Ortak bileşenler: `SearchInput`, `Badge`, `ActiveFilter`

#### Değiştirilen
- `Customer` tipi: `isActive`, `isDeleted`, `source` alanları eklendi
- Firestore rules: şube subcollection yetkileri
- Uygulama sürümü: `0.3.0`

---

## [0.2.0] - 2026-07-18

### Faz 2 — Offline Sync Altyapısı

#### Eklenen
- `PROJECT_RULES.md` — projenin değişmeyecek kuralları
- Domain tipleri: `Order`, `OrderLine`, `Customer`, `Product` (`erpId` alanları dahil)
- IndexedDB v2 şeması: `syncReports` store, `erpId` indexleri
- Repository'ler: `syncQueueRepository`, `syncReportRepository`, `customerRepository`, `productRepository`
- Sync motoru: `SyncEngine`, `OutboxProcessor`, `PushSync`, `PullSync`
- `ConflictResolver` — version tabanlı çakışma çözümü
- `IdempotencyGuard` — çift gönderim engeli (`idempotencyKey` + `localId` kontrolü)
- `RetryPolicy` — exponential backoff (max 5 deneme)
- `SyncReport` — her sync döngüsü sonunda rapor oluşturma ve saklama
- Firestore katmanı: converters, `firestoreService`, composite index tanımları
- `syncStore` + `syncService` + `useSync` hook
- UI: Dashboard sync raporu, manuel sync butonu, OfflineBanner sync durumu
- Sipariş Geçmişi: "Bekleyen Siparişleri Gönder" butonu
- Firestore security rules iskeleti

#### Değiştirilen
- `SyncEngine` stub → gerçek implementasyon
- `orderLocalRepository` — `saveWithLines`, `getLinesByOrderId` eklendi
- Uygulama sürümü: `0.2.0`

---

## [0.1.0] - 2026-07-18

### Faz 1 — Proje İskeleti & Altyapı

#### Eklenen
- Vite + React 19 + TypeScript (Strict Mode) proje yapısı
- Tailwind CSS kurumsal tema (Beyaz + Lacivert `#1e3a5f` + Açık Gri)
- ESLint + Prettier yapılandırması
- PWA desteği (`vite-plugin-pwa`, manifest, service worker)
- Firebase Authentication entegrasyonu (.env tabanlı yapılandırma)
- React Router v7 ile V1 route yapısı
- Mobil öncelikli layout (Bottom Navigation, Page Header)
- Ortak UI bileşenleri: Button, Input, Card, Modal, ConfirmDialog, LoadingSpinner, Toast, EmptyState
- Offline altyapı iskeleti: Dexie IndexedDB şeması, SyncEngine stub, connectivity hook
- ERP adapter iskeleti: `ErpPort` interface + `NullErpAdapter` (entegrasyon yok)
- Repository Pattern: `BaseRepository`, `OrderLocalRepository`
- Service Layer: `AuthService`
- Zustand store'lar: auth, offline, toast
- V1 placeholder sayfalar: Dashboard, Yeni Sipariş, Müşteriler, Ürünler, Sipariş Geçmişi, Ayarlar
- CHANGELOG.md

#### Notlar
- Firebase bilgileri `.env` dosyasından okunur; koda gömülmez
- Logo Wings entegrasyonu henüz yazılmadı; sadece adapter katmanı hazır
- Senkronizasyon motoru Faz 2'de implement edilecek
