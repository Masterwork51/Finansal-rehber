# Finans Paneli V2

Kişisel finans paneli — vize hedefi, dolar birikimi, kredi kartı takibi ve akıllı tavsiye motoru.

## Özellikler

- **Ana özet:** Net varlık, vize hesabı ilerlemesi, alınabilir dolar, risk durumu
- **Varlıklar:** TL, USD, EUR nakit + vize USD (otomatik TL karşılığı)
- **Giderler:** Sabit ve değişken gider listesi
- **Kredi kartı merkezi:** Borç, son ödeme, kalan gün
- **Dolar biriktirme:** Simülasyon slider'ı ile alım planlama
- **Vize gücü skoru:** Konsolosluk perspektifinden 0–100 skor
- **Hedefler:** İngiltere vizesi + acil durum fonu
- **Grafikler:** USD birikim ve net servet trendi
- **Akıllı tavsiye:** Her açılışta bağlama göre öneri
- **V3 yol haritası:** Gelecek özellikler listesi
- **PWA:** Telefona "Ana Ekrana Ekle" ile uygulama gibi kullanım
- **Offline:** Service worker ile çevrimdışı erişim
- **Ayarlar:** Döviz kurları ve varlık verilerini düzenleme (localStorage)

## Kurulum

Statik dosyalar — sunucu gerekmez, ancak PWA için HTTPS veya localhost önerilir:

```bash
# Python ile yerel sunucu
python3 -m http.server 8080
```

Tarayıcıda `http://localhost:8080` adresini açın.

## Telefona Yükleme

1. Telefonda siteyi açın (aynı ağda bilgisayar IP'si veya deploy edilmiş URL)
2. **iOS Safari:** Paylaş → Ana Ekrana Ekle
3. **Android Chrome:** Menü → Uygulamayı yükle / Ana ekrana ekle

## Dosya Yapısı

```
index.html          Ana sayfa
css/styles.css      Stiller
js/data.js          Veri modeli ve hesaplamalar
js/advice.js        Akıllı tavsiye motoru
js/charts.js        Canvas grafikler
js/app.js           Uygulama mantığı
manifest.json       PWA manifest
sw.js               Service worker
icons/              Uygulama ikonları
```

## V3 Planı

- TCMB kurunu otomatik çekme
- VakıfBank hesap entegrasyonu
- Kripto, hisse, emeklilik takibi
- Seyahat bütçeleri (İngiltere, Fethiye)
- Eş ile ortak bütçe ekranı
