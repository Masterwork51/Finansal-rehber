# Müşteri Not Defteri

Bankacılar için hızlı, **tamamen çevrimdışı** müşteri not sistemi. Kurulum yok, internet yok, sunucu yok.

## Nasıl kullanılır?

1. `index.html` dosyasını bilgisayarına kopyala (USB, e-posta eki, vb.).
2. Dosyaya **çift tıkla** → tarayıcıda (Edge / Chrome / Firefox) açılır.
3. Notunu yaz, **Enter**'a bas → kaydolur. Hepsi bu.

> İpucu: Tarayıcıda aç → adres çubuğundaki yıldıza/… tıklayıp **sık kullanılanlara** ekle veya masaüstüne kısayol at. Her seferinde hızlıca ulaş.

## Özellikler

- **Hızlı ekleme:** Not alanında Enter = kaydet (Shift+Enter = alt satır).
- **Öneme göre renk:** 🟢 Düşük · 🟡 Normal · 🔴 Yüksek (sol kenar rengi).
- **Tarih/Hatırlatma:** Tarih girersen "Tarihe göre" sırala; geçmiş tarihler kırmızı "Gecikti", bugün sarı "Bugün" olarak işaretlenir.
- **Kategoriler:** Kredi, Kredi Kartı, İmza/Evrak, Para Çekme/Yatırma vb. Kategoriye göre filtrele.
- **Arama:** İsim, not, telefon, TC/müşteri no içinde arar.
- **Arşivleme:** İş bitince ✅ ile arşive taşı. Arşiv sekmesinden geri alabilir veya silebilirsin.
- **Yedekle / Geri Yükle:** Notları `.json` dosyasına yedekle; başka bilgisayara taşı veya geri yükle.

## Verilerim nerede?

Tüm notlar **sadece kendi bilgisayarındaki tarayıcının hafızasında** (`localStorage`) tutulur. Hiçbir yere gönderilmez — banka gizliliği için idealdir.

**Önemli:**
- Aynı tarayıcıda aynı dosyayı açtığın sürece notların durur.
- Tarayıcı geçmişini/site verilerini temizlersen notlar silinebilir → düzenli **Yedekle**.
- Başka bilgisayara geçerken: eski cihazda **Yedekle**, yeni cihazda **Geri Yükle**.
