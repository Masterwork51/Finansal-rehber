import { SCORE } from './storage.js'

/**
 * Puanlardan zevk vektörü çıkarır.
 * score: 1 az, 2 normal, 3 çok
 */
export function buildTasteProfile(ratings) {
  const genreWeights = {}
  const loved = []
  const liked = []
  const disliked = []
  let totalWeight = 0

  for (const entry of Object.values(ratings)) {
    const { score, movie } = entry
    const w = score === SCORE.LOVE ? 3 : score === SCORE.OK ? 1 : -1.5
    totalWeight += Math.abs(w)

    if (score === SCORE.LOVE) loved.push(movie)
    else if (score === SCORE.OK) liked.push(movie)
    else disliked.push(movie)

    for (const gid of movie.genreIds || []) {
      genreWeights[gid] = (genreWeights[gid] || 0) + w
    }
  }

  const rankedGenres = Object.entries(genreWeights)
    .map(([id, weight]) => ({ id: Number(id), weight }))
    .sort((a, b) => b.weight - a.weight)

  const topGenres = rankedGenres.filter((g) => g.weight > 0).slice(0, 5)
  const avoidGenres = rankedGenres.filter((g) => g.weight < 0).slice(0, 4)

  return {
    genreWeights,
    topGenres,
    avoidGenres,
    loved,
    liked,
    disliked,
    ratedTotal: Object.keys(ratings).length,
    totalWeight,
  }
}

export function scoreCandidate(movie, taste, mood) {
  let score = 0
  const genres = movie.genreIds || []

  for (const gid of genres) {
    score += (taste.genreWeights[gid] || 0) * 1.2
  }

  // TMDB kalite sinyali
  score += Math.min(movie.voteAverage || 0, 9) * 0.35
  score += Math.min((movie.voteCount || 0) / 5000, 2)

  // Mod uyumu
  if (mood?.preferGenres?.length) {
    const hit = genres.filter((g) => mood.preferGenres.includes(g)).length
    score += hit * 4
  }
  if (mood?.avoidGenres?.length) {
    const miss = genres.filter((g) => mood.avoidGenres.includes(g)).length
    score -= miss * 3.5
  }

  // Az beğenilen türleri cezalandır
  for (const g of taste.avoidGenres) {
    if (genres.includes(g.id)) score -= 2.5
  }

  // Seed filmlerle benzerlik (basit: ortak tür)
  const seeds = [...taste.loved, ...taste.liked.slice(0, 10)]
  let overlap = 0
  for (const seed of seeds) {
    const shared = genres.filter((g) => (seed.genreIds || []).includes(g)).length
    overlap += shared
  }
  score += Math.min(overlap * 0.15, 4)

  return score
}
