# BERA VİLEDA SİPARİŞ SİSTEMİ — Proje Kuralları

Bu dosya projenin **değişmeyecek** temel kurallarını tanımlar. Tüm geliştirmeler bu kurallara uymak zorundadır.

---

## 1. Mobil Öncelikli Geliştirme

- Tüm ekranlar önce mobil (320px+) için tasarlanır.
- Dokunmatik hedefler minimum 44px olmalıdır.
- Bottom Navigation birincil gezinme yöntemidir.
- Masaüstü görünüm ikincil önceliklidir.

## 2. Offline Çalışma Zorunludur

- Uygulama internet olmadan sipariş alabilmelidir.
- Tüm yazma işlemleri önce IndexedDB'ye yapılır.
- Senkronizasyon arka planda ve otomatik gerçekleşir.

## 3. Siparişler Asla Kaybolmaz

- Her sipariş cihazda kalıcı olarak saklanır.
- Sync başarısız olsa bile veri silinmez.
- Hatalı siparişler `failed` durumunda tutulur ve yeniden denenebilir.

## 4. Aynı Sipariş İkinci Kez Gönderilemez

- Her sipariş benzersiz `localId` (UUID) taşır.
- Outbox kuyruğunda `idempotencyKey` ile deduplicate edilir.
- Firestore'a yazmadan önce `localId` kontrolü yapılır.

## 5. Logo Wings Entegrasyonu — Adapter Pattern

- Doğrudan ERP API çağrısı yapılmaz.
- Tüm ERP işlemleri `ErpPort` arayüzü üzerinden geçer.
- REST, SOAP veya dosya (Excel) fark etmeksizin adapter değiştirilebilir olmalıdır.
- V2 varsayılan: `LogoWingsFileAdapter` (manuel Logo Aktarım Excel).

## 6. Excel İçe Aktarma — Rapor Zorunluluğu

- Her içe aktarma işlemi sonunda rapor üretilir.
- Rapor: başarılı/başarısız kayıt sayısı, hata detayları, tarih.
- Raporlar IndexedDB ve Firestore'da saklanır.

## 7. Veri Silme — Onay Gerektirir

- Kullanıcı verisi silinmeden önce `ConfirmDialog` gösterilir.
- Silme işlemleri soft-delete (`isDeleted: true`) ile yapılır.
- Fiziksel silme yapılmaz; ERP senkronizasyonunda veri kaybı önlenir.
- Hard delete yalnızca admin tarafından ve audit log ile yapılabilir (gelecek).

## 8. CHANGELOG Zorunluluğu

- Tüm önemli değişiklikler `CHANGELOG.md` dosyasına yazılır.
- Her giriş sürüm numarası ve tarih içermelidir.
- Format: [Keep a Changelog](https://keepachangelog.com/) standardı.

## 9. TypeScript Strict

- `strict: true` modu kapatılamaz.
- `any` kullanımı yasaktır.
- Tüm public API'ler tip güvenli olmalıdır.

## 10. SOLID Prensipleri

- **S**ingle Responsibility: Her sınıf/modül tek sorumluluk taşır.
- **O**pen/Closed: Genişletmeye açık, değişikliğe kapalı.
- **L**iskov Substitution: Interface implementasyonları birbirinin yerine geçebilir.
- **I**nterface Segregation: Küçük, odaklı arayüzler.
- **D**ependency Inversion: Üst katmanlar alt katmanlara değil, arayüzlere bağımlıdır.

## 11. Mimari Katmanlar

```
UI (Components/Hooks)
    ↓
Service Layer (business logic)
    ↓
Repository (data access abstraction)
    ↓
Data Source (IndexedDB / Firestore)
```

## 12. Senkronizasyon Raporu

- Her sync döngüsü sonunda `SyncReport` oluşturulur.
- Rapor: push/pull istatistikleri, hatalar, süre, tetikleyici.
- Son rapor dashboard'da görüntülenir.

---

*Son güncelleme: 2026-07-18 — Faz 2*
