# 3C-5 UAT — Gerçek Logo master data ile BERA günlük kullanım

Önkoşul: Admin Settings’ten manuel sync yapılmış olmalı (otomatik değil).

- Cari: ~1431 (`Logo'dan Cari Verilerini Al`)
- Stok: ~2391 (`Logo'dan Stok / Ürün Verilerini Al`)
- `Product.erpId` dolu; Conflict/Skip/Hata = 0

## Senaryo (BERA içi — Logo’ya sipariş YOK)

1. Cari listesinde Logo carilerini ara / seç (`code`, `name`).
2. Cari detayda şehir/ilçe (CITY/TOWN) görünüyorsa doğrula (görünüm tercihleri).
3. BERA-local şube oluştur veya mevcut şubeyi seç (`CustomerBranch`).
4. Yeni sipariş → gerçek Logo ürününü barkod / ad ile ara.
5. Stok miktarının `Product.stockQuantity` (MERKEZ) olduğunu gör.
6. Satış fiyatının `listPrice` (SATIS_FIYATI) ile satır tutarına yansıdığını gör.
7. Stok > 0 ürünü siparişe ekle; adedi değiştir.
8. Stok = 0 üründe “Stok Yok” / eklenemediğini doğrula.
9. Siparişi BERA içinde kaydet.
10. Sipariş geçmişinde gör; satır adı / sku / miktar / fiyat snapshot’ını kontrol et.
11. **Logo’ya gönderme yapma** (Send / ORFICHE / Wings export bu aşamada test dışı).

## Güvenlik kontrolleri

- Logo master sync öncesi/sonrası: CustomerBranch / Order / OrderLine / Outbox sayıları değişmemeli (sync UI paneli).
- Sipariş kaydı: mevcut outbox enqueue davranışı aynı; Logo LAN sync’ten bağımsız.

## Ayrı tutulanlar

| Yön | Durum |
|-----|--------|
| Logo → BERA master data | Manuel Admin sync (3C-3/3C-4) |
| BERA → Logo sipariş | Eski sistem — 3C-5’te değiştirilmedi |
