const API = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'

/** Kişisel kullanım — .env varsa onu tercih eder */
const DEFAULT_KEY = 'af62b02452761de3f160e4c41f2244d7'

export function getApiKey() {
  const fromEnv = import.meta.env.VITE_TMDB_API_KEY
  if (fromEnv && fromEnv !== 'buraya_tmdb_api_key_yaz') return fromEnv
  return DEFAULT_KEY
}

export function hasApiKey() {
  return Boolean(getApiKey())
}

async function tmdb(path, params = {}) {
  const key = getApiKey()
  if (!key) {
    throw new Error('TMDB API anahtarı eksik.')
  }

  const url = new URL(`${API}${path}`)
  url.searchParams.set('api_key', key)
  url.searchParams.set('language', 'tr-TR')
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`TMDB ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}

export function posterUrl(path, size = 'w500') {
  if (!path) return null
  return `${IMG}/${size}${path}`
}

export function backdropUrl(path, size = 'w1280') {
  if (!path) return null
  return `${IMG}/${size}${path}`
}

export async function getGenres() {
  const data = await tmdb('/genre/movie/list')
  return data.genres || []
}

/** Onboarding için çeşitli, popüler film havuzu (50–100) */
export async function fetchOnboardingPool(target = 80) {
  const pages = [1, 2, 3, 4, 5]
  const lists = await Promise.all([
    ...pages.map((page) => tmdb('/movie/popular', { page })),
    ...pages.slice(0, 3).map((page) => tmdb('/movie/top_rated', { page })),
    tmdb('/discover/movie', {
      sort_by: 'popularity.desc',
      'vote_count.gte': 500,
      with_original_language: 'en',
      page: 1,
    }),
    tmdb('/discover/movie', {
      sort_by: 'vote_average.desc',
      'vote_count.gte': 1000,
      page: 1,
    }),
    tmdb('/discover/movie', {
      sort_by: 'popularity.desc',
      with_genres: '18|53|878|27|35',
      'vote_count.gte': 300,
      page: 1,
    }),
  ])

  const map = new Map()
  for (const list of lists) {
    for (const m of list.results || []) {
      if (!m.poster_path || !m.id) continue
      if (!map.has(m.id)) map.set(m.id, normalizeMovie(m))
    }
  }

  const all = [...map.values()]
  shuffleInPlace(all)
  return all.slice(0, target)
}

export async function discoverByGenres(genreIds, { page = 1, excludeIds = [] } = {}) {
  const data = await tmdb('/discover/movie', {
    sort_by: 'popularity.desc',
    'vote_count.gte': 200,
    with_genres: genreIds.slice(0, 3).join('|'),
    page,
  })
  const exclude = new Set(excludeIds)
  return (data.results || [])
    .filter((m) => m.poster_path && !exclude.has(m.id))
    .map(normalizeMovie)
}

export async function getMovieDetails(id) {
  const data = await tmdb(`/movie/${id}`, {
    append_to_response: 'credits,keywords',
  })
  return {
    ...normalizeMovie(data),
    runtime: data.runtime,
    tagline: data.tagline,
    genres: data.genres || [],
    cast: (data.credits?.cast || []).slice(0, 8).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
    })),
    directors: (data.credits?.crew || [])
      .filter((c) => c.job === 'Director')
      .map((c) => ({ id: c.id, name: c.name })),
    keywords: (data.keywords?.keywords || []).map((k) => k.name),
  }
}

export async function getSimilar(id) {
  const data = await tmdb(`/movie/${id}/similar`)
  return (data.results || []).filter((m) => m.poster_path).map(normalizeMovie)
}

export async function getRecommendations(id) {
  const data = await tmdb(`/movie/${id}/recommendations`)
  return (data.results || []).filter((m) => m.poster_path).map(normalizeMovie)
}

function normalizeMovie(m) {
  return {
    id: m.id,
    title: m.title || m.original_title,
    originalTitle: m.original_title,
    overview: m.overview || '',
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    releaseDate: m.release_date || '',
    year: (m.release_date || '').slice(0, 4),
    voteAverage: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    genreIds: m.genre_ids || (m.genres || []).map((g) => g.id),
    popularity: m.popularity ?? 0,
  }
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
