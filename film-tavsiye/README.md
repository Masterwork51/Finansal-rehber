# Perde — Film Tavsiyesi

Moduna göre, senin zevkine özel film önerisi.

## Mantık

1. **Zevk kurulumu** — 50–100 film puanla: *Az beğendim / Normal / Çok beğendim*
2. **Profil** — Puanlar tür ağırlıklarına dönüşür (localStorage’da, cihazda kalır)
3. **Mod seç** — Rahat, Gerilim, Düşünceli, Epik, Karanlık, Sürpriz
4. **Öneri** — TMDB + senin profilinle sıralanmış filmler

İleride: eş profili + ortak izleme (iki zevkin kesişimi).

## Kurulum

```bash
cd film-tavsiye
cp .env.example .env
# .env içine TMDB API anahtarını yaz
npm install
npm run dev
```

TMDB anahtarı: [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

```
VITE_TMDB_API_KEY=senin_anahtarin
```

## Komutlar

| Komut | Açıklama |
|--------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build |
| `npm run preview` | Build önizleme |

## Not

API anahtarı tarayıcıya gider (Vite `VITE_` prefix). Kişisel kullanım için yeterli; ileride proxy eklenebilir.
