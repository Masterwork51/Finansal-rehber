import { discoverByGenres, getRecommendations, getSimilar } from './tmdb.js'
import { buildTasteProfile, scoreCandidate } from './taste.js'

/** TMDB genre ids */
export const MOODS = [
  {
    id: 'rahat',
    label: 'Rahat',
    blurb: 'Yumuşak, keyifli, yormayan',
    preferGenres: [35, 10749, 16, 12], // comedy, romance, animation, adventure
    avoidGenres: [27, 53, 80], // horror, thriller, crime
  },
  {
    id: 'gerilim',
    label: 'Gerilim',
    blurb: 'Nabız yükselsin',
    preferGenres: [53, 80, 9648, 27], // thriller, crime, mystery, horror
    avoidGenres: [10751, 10749], // family, romance
  },
  {
    id: 'dusunceli',
    label: 'Düşünceli',
    blurb: 'Derin, yavaş, iz bırakan',
    preferGenres: [18, 36, 99, 10752], // drama, history, documentary, war
    avoidGenres: [28, 35], // action, comedy
  },
  {
    id: 'epik',
    label: 'Epik',
    blurb: 'Büyük dünya, büyük his',
    preferGenres: [12, 14, 878, 28], // adventure, fantasy, sci-fi, action
    avoidGenres: [99],
  },
  {
    id: 'karanlik',
    label: 'Karanlık',
    blurb: 'Noir, ağır, keskin',
    preferGenres: [80, 53, 9648, 27],
    avoidGenres: [16, 10751],
  },
  {
    id: 'surpriz',
    label: 'Sürpriz',
    blurb: 'Zevkine güven, şaşırt beni',
    preferGenres: [],
    avoidGenres: [],
  },
]

export async function recommendForMood(profile, moodId, { count = 8 } = {}) {
  const mood = MOODS.find((m) => m.id === moodId) || MOODS[0]
  const taste = buildTasteProfile(profile.ratings)
  const exclude = new Set([
    ...Object.keys(profile.ratings).map(Number),
    ...(profile.history || []),
  ])

  // Tür karışımı: zevk + mod
  const genrePool = [
    ...mood.preferGenres,
    ...taste.topGenres.map((g) => g.id),
  ].filter((id, i, arr) => arr.indexOf(id) === i)

  const discoverGenres =
    genrePool.length > 0
      ? genrePool.slice(0, 4)
      : taste.topGenres.map((g) => g.id).slice(0, 3)

  const candidates = new Map()

  // Discover sayfaları
  if (discoverGenres.length) {
    const pages = await Promise.all([
      discoverByGenres(discoverGenres, { page: 1, excludeIds: [...exclude] }),
      discoverByGenres(discoverGenres, { page: 2, excludeIds: [...exclude] }),
    ])
    for (const list of pages) {
      for (const m of list) candidates.set(m.id, m)
    }
  }

  // Sevilen filmlerden benzer / öneri
  const seeds = taste.loved.slice(0, 5)
  for (const seed of seeds) {
    try {
      const [sim, rec] = await Promise.all([
        getSimilar(seed.id),
        getRecommendations(seed.id),
      ])
      for (const m of [...sim, ...rec]) {
        if (!exclude.has(m.id)) candidates.set(m.id, m)
      }
    } catch {
      // tek film hatası tüm öneriyi bozmasın
    }
  }

  const ranked = [...candidates.values()]
    .map((m) => ({ movie: m, score: scoreCandidate(m, taste, mood) }))
    .sort((a, b) => b.score - a.score)

  // Çeşitlilik: aynı ilk türden peş peşe çok olmasın
  const picked = []
  const usedPrimary = new Map()
  for (const item of ranked) {
    const primary = item.movie.genreIds?.[0]
    const used = usedPrimary.get(primary) || 0
    if (used >= 2 && picked.length < count) continue
    picked.push(item)
    if (primary != null) usedPrimary.set(primary, used + 1)
    if (picked.length >= count) break
  }

  // yetersizse kalanlardan doldur
  if (picked.length < count) {
    for (const item of ranked) {
      if (picked.some((p) => p.movie.id === item.movie.id)) continue
      picked.push(item)
      if (picked.length >= count) break
    }
  }

  return {
    mood,
    taste,
    results: picked,
  }
}
