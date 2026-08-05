# Changelog

Tüm önemli değişiklikler bu dosyada sürüm numarası ve tarih ile kayıt altına alınır.

Format [Keep a Changelog](https://keepachangelog.com/) standardına uygundur.

---

## [2.0.0] - 2026-07-24

### BERA Sipariş Sistemi v2 — Logo GO Wings & Firestore Rules

#### Eklenen
- **Logo GO Wings dosya adapter'ı** (`LogoWingsFileAdapter`) — `ErpPort` üzerinden manuel aktarım
- **Logo Aktarım Excel** (`logoWingsTransferExcel.ts`) — Cari Kod | Şube | Barkod | Ürün Kodu | Miktar
- Gönder ekranında **Logo GO Wings** seçeneği (tek sipariş)
- Toplu gönderimde **Logo GO Wings Aktarım**
- Sipariş detayında **Logo GO Wings Aktarım** paylaşımı
- `exportToLogoGoWings` — aktarım dosyasını indirir / paylaşır
- ERP factory (`src/shared/lib/erp/index.ts`)

#### Değiştirilen
- Firestore security rules: yerel login mimarisine uyumlu v2 kurallar (alan doğrulama)
- Sync sonrası ERP durumu: Logo aktarımı beklerken `erpSyncStatus: pending` (artık `failed` değil)
- NullErpAdapter: sync'i bozmayan deferred başarı modeli
- Uygulama sürümü: **2.0.0**
- `html2canvas` doğrudan bağımlılık olarak eklendi

#### Korunan
- Offline-first sipariş akışı, PDF/Excel/WhatsApp paylaşımı
- Mevcut Excel içe aktarma (Ayarlar) Logo Wings formatı ile çalışmaya devam eder

---

---

## [1.0.0-rc.4] - 2026-07-24

### Toplu Sipariş Gönderme Modülü

#### Eklenen
- Gönderildi sekmesinde çoklu sipariş seçimi (checkbox)
- Sabit alt panel: Seçilen Müşteri, Toplam Kalem, Toplam Adet, **TOPLU GÖNDER**
- Toplu gönderim seçenekleri: PDF, Excel, WhatsApp (Logo GO Wings hazır mimari)
- `shareBulkOrderReport` — seçilen siparişlerden tek PDF + tek Excel
- `useBulkOrderSelection`, `BulkSendPanel`, `bulkOrderSendService`

#### Değiştirilen
- Rapor şablonu: Müşteri 1/2/3 başlıkları, müşteri toplam satırı, ayırıcılar
- Excel: müşteriler arası belirgin bölüm başlıkları
- Sipariş Geçmişi varsayılan filtre: Gönderildi (toplu akış)

#### Korunan
- Tek sipariş paylaşımı (detay ekranı + GÖNDER akışı)

---

## [1.0.0-rc.3] - 2026-07-23

### Rapor Modülü — Son Revizyon (PDF + Excel)

#### Eklenen
- Tek şablon modeli (`orderReportTemplateModel.ts`) — PDF ve Excel aynı veri kaynağı
- Ortak HTML şablon (`orderReportTemplateHtml.ts`) — PDF çıktısı Excel ile aynı görünüm
- PDF: `html2canvas` doğrudan kullanımı (boş PDF hatası giderildi)
- Canvas piksel ve PDF boyutu doğrulaması — boş rapor engellenir

#### Değiştirilen
- Excel: logo hizalama, belirgin başlık, etiket/değer bilgi kutusu (açık gri etiket hücreleri)
- Genel toplam: kutulu, kalın, belirgin satır
- Yazdırma: A4 dikey, fit-to-width, print area, başlık tekrarı (satır 1–5)
- Müşteri/şube/ürün/toplam verisi export öncesi doğrulanır

#### Doğrulanan
- `npm run build` hatasız
- `npm run lint` temiz

---

## [1.0.0-rc.2] - 2026-07-23

### Raporlama Modülü — Kurumsal Görünüm Revizyonu

#### Eklenen
- ExcelJS ile profesyonel yazdırılabilir Excel raporu (kenarlık, gri müşteri kutusu, koyu tablo başlığı, logo görselleri)
- Paylaşılan layout tanımı (`orderReportLayout.ts`) — PDF ve Excel aynı yapıyı kullanır
- Rapor doğrulama (`orderReportValidation.ts`) — boş veri/boş PDF engellenir
- Logo PNG dönüştürme ve yükleme (`orderReportAssets.ts`)

#### Değiştirilen
- Excel: grid gizli, A4 dikey, fit-to-width, başlık satırları yazdırmada tekrar eder
- Müşteri bilgi kutusu: Cari Kod, Cari Adı, Şube, Toplam Kalem, Toplam Adet
- Tablo sütun sırası: Barkod | Ürün Kodu | Ürün Adı | Miktar
- PDF: boş çıktı hatası giderildi (scale düzeltmesi, DOM görünürlük, logo bekleme, içerik doğrulama)
- PDF ve Excel görsel olarak aynı şablondan üretilir
- Alt bilgi ortalanmış; son satır **GENEL TOPLAM ADET**

#### Doğrulanan
- `npm run build` hatasız
- `npm run lint` temiz

---

## [1.0.0-rc.1] - 2026-07-23

### Raporlama ve Paylaşım Modülü Revizyonu

#### Eklenen
- Merkezi rapor mimarisi: `src/features/orders/report/` (builder, PDF, Excel, paylaşım)
- BERA ve Vileda Professional logo varlıkları (`public/assets/logos/`)
- HTML tabanlı kurumsal PDF şablonu (Türkçe karakter desteği, otomatik sayfa kırılımı)
- Excel Sayfa 1: PDF ile aynı mantıkta kurumsal rapor
- Excel Sayfa 2: Logo Aktarım (Cari Kod, Şube, Barkod, Ürün Kodu, Miktar)
- `OrderShareActions`: Gönderilen siparişlerde tekrar paylaşım (PDF / Excel / WhatsApp)
- Her paylaşımda rapor dosyaları yeniden oluşturulur

#### Değiştirilen
- Sipariş detay ekranı: tarih/saat, cari bilgileri, toplam kalem/adet, ürün listesi, durum
- Gönderilen siparişler detaydan tekrar açılabilir ve paylaşılabilir
- `orderExportService` ince facade katmanına indirildi

#### Doğrulanan
- `npm run build` hatasız
- `npm run lint` temiz

---

## [1.0.0-rc] - 2026-07-23

### v1.0 Release Candidate — Saha Kullanımına Hazırlık

#### Eklenen
- **Ayarlar → Senkronizasyon** ekranı: online/offline durumu, bekleyen sayaç, manuel senkronizasyon, tam sync raporu
- **GÖNDER ekranı** (`/orders/:id/send`): PDF, Excel, WhatsApp seçenekleri; tek GÖNDER butonu
- **PDF rapor** (`jspdf`): BERA / Vileda başlık, cari bilgileri, ürün tablosu, genel toplam, iletişim bilgileri
- **Excel rapor** (`xlsx`): Sayfa 1 profesyonel sipariş raporu; Sayfa 2 Logo Aktarım (GO Wings hazırlığı)
- **WhatsApp paylaşım**: Web Share API ile PDF+Excel birlikte; desteklenmeyen cihazlarda indirme + WhatsApp açılışı
- **Şube arama** (sipariş akışı): Canlı filtre, büyük/küçük harf duyarsız, mobil uyumlu
- `usePendingSyncCount` hook — tek kaynak senkron sayaç
- `orderExportService` — PDF/Excel üretimi ve paylaşım

#### Değiştirilen
- **Dashboard sadeleştirildi**: yalnızca tarih, online/offline, bekleyen senkronizasyon; sync kartı ve manuel buton kaldırıldı
- Sipariş kaydı sonrası yönlendirme: Sipariş Geçmişi yerine **GÖNDER** ekranı
- Offline → online geçişte otomatik senkronizasyon `syncService` üzerinden (30 sn aralık + reconnect)
- Bekleyen sayaç: `countPendingOrders` tek kaynak; Dashboard, Ayarlar, Sync, Sipariş Geçmişi aynı sayıyı gösterir
- `PushSync`: Firestore push yalnızca Firebase yapılandırıldığında
- `SyncEngine`: arka plan dinleyicileri `AppProviders` + `syncService` ile merkezileştirildi

#### Doğrulanan
- `npm run build` hatasız
- `npm run lint` temiz
- TypeScript strict mode uyumlu
- Vercel deploy edilebilir (`dist/`)

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
