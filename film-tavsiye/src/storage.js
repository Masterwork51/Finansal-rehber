const STORAGE_KEY = 'perde.v1'

const defaultState = () => ({
  version: 1,
  profiles: {
    mehmet: createProfile('mehmet', 'Mehmet'),
    // eş profili sonra: partner: createProfile('partner', 'Eş')
  },
  activeProfileId: 'mehmet',
  genreMap: {}, // id -> name
})

function createProfile(id, name) {
  return {
    id,
    name,
    ratings: {}, // movieId -> { score: 1|2|3, movie, ratedAt }
    onboardingDone: false,
    onboardingTarget: 70,
    history: [], // recommended movie ids already shown
    lastMood: null,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    return {
      ...defaultState(),
      ...parsed,
      profiles: {
        ...defaultState().profiles,
        ...(parsed.profiles || {}),
      },
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getActiveProfile(state) {
  return state.profiles[state.activeProfileId]
}

export function setRating(state, movie, score) {
  const profile = getActiveProfile(state)
  if (score === 0) {
    delete profile.ratings[movie.id]
  } else {
    profile.ratings[movie.id] = {
      score,
      movie: {
        id: movie.id,
        title: movie.title,
        posterPath: movie.posterPath,
        genreIds: movie.genreIds,
        year: movie.year,
        voteAverage: movie.voteAverage,
      },
      ratedAt: Date.now(),
    }
  }
  saveState(state)
  return state
}

export function ratedCount(profile) {
  return Object.keys(profile.ratings).length
}

export function markOnboardingDone(state) {
  const profile = getActiveProfile(state)
  profile.onboardingDone = true
  saveState(state)
  return state
}

export function setGenreMap(state, genres) {
  state.genreMap = Object.fromEntries(genres.map((g) => [g.id, g.name]))
  saveState(state)
  return state
}

export function pushHistory(state, movieId) {
  const profile = getActiveProfile(state)
  profile.history = [movieId, ...profile.history.filter((id) => id !== movieId)].slice(0, 200)
  saveState(state)
  return state
}

export function setLastMood(state, moodId) {
  const profile = getActiveProfile(state)
  profile.lastMood = moodId
  saveState(state)
  return state
}

export function resetProfile(state) {
  const id = state.activeProfileId
  const name = state.profiles[id]?.name || 'Mehmet'
  state.profiles[id] = createProfile(id, name)
  saveState(state)
  return state
}

export const SCORE = {
  LOW: 1,
  OK: 2,
  LOVE: 3,
}

export const SCORE_LABELS = {
  1: 'Az beğendim',
  2: 'Normal',
  3: 'Çok beğendim',
}
