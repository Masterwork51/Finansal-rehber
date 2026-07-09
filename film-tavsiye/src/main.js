import './style.css'
import {
  hasApiKey,
  fetchOnboardingPool,
  posterUrl,
  getGenres,
  getMovieDetails,
} from './tmdb.js'
import {
  loadState,
  saveState,
  getActiveProfile,
  setRating,
  ratedCount,
  markOnboardingDone,
  setGenreMap,
  pushHistory,
  setLastMood,
  resetProfile,
  SCORE,
} from './storage.js'
import { buildTasteProfile } from './taste.js'
import { MOODS, recommendForMood } from './recommend.js'

const app = document.querySelector('#app')
let state = loadState()
let pool = []
let poolIndex = 0
let view = 'boot'
let recommendPayload = null
let detailMovie = null
let loading = false
let error = null

boot()

async function boot() {
  render()
  if (!hasApiKey()) {
    view = 'missing-key'
    render()
    return
  }

  try {
    loading = true
    render()
    if (!Object.keys(state.genreMap || {}).length) {
      const genres = await getGenres()
      state = setGenreMap(state, genres)
    }
    const profile = getActiveProfile(state)
    view = profile.onboardingDone ? 'home' : 'onboarding-intro'
  } catch (e) {
    error = e.message
    view = 'error'
  } finally {
    loading = false
    render()
  }
}

function render() {
  if (loading && view === 'boot') {
    app.innerHTML = shell(loader('Perde hazırlanıyor…'))
    return
  }

  switch (view) {
    case 'missing-key':
      app.innerHTML = shell(missingKeyView())
      break
    case 'error':
      app.innerHTML = shell(errorView())
      break
    case 'onboarding-intro':
      app.innerHTML = shell(onboardingIntroView())
      bindOnboardingIntro()
      break
    case 'rate':
      app.innerHTML = shell(rateView())
      bindRate()
      break
    case 'home':
      app.innerHTML = shell(homeView())
      bindHome()
      break
    case 'results':
      app.innerHTML = shell(resultsView())
      bindResults()
      break
    case 'detail':
      app.innerHTML = shell(detailView())
      bindDetail()
      break
    default:
      app.innerHTML = shell(loader('Yükleniyor…'))
  }
}

function shell(content) {
  const profile = getActiveProfile(state)
  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand__name">Per<em>de</em></div>
          <div class="brand__tag">${profile.name} · kişisel perde</div>
        </div>
        ${
          profile.onboardingDone
            ? `<button class="ghost-btn" type="button" data-action="reset">Zevki sıfırla</button>`
            : ''
        }
      </header>
      ${error && view !== 'error' ? `<div class="alert">${escapeHtml(error)}</div>` : ''}
      ${content}
    </div>
  `
}

function missingKeyView() {
  return `
    <section class="hero">
      <h1>API anahtarı gerekli</h1>
      <p>TMDB anahtarını <code>film-tavsiye/.env</code> dosyasına ekle, sonra sunucuyu yeniden başlat.</p>
    </section>
    <div class="panel">
      <p class="muted">Örnek:</p>
      <pre style="white-space:pre-wrap;color:var(--gold);font-size:.9rem;margin:0">VITE_TMDB_API_KEY=senin_anahtarin</pre>
      <p class="muted" style="margin-top:1rem">Anahtar: <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style="color:var(--gold)">themoviedb.org/settings/api</a></p>
    </div>
  `
}

function errorView() {
  return `
    <section class="hero">
      <h1>Bir şey ters gitti</h1>
      <p>${escapeHtml(error || 'Bilinmeyen hata')}</p>
      <div class="cta-row">
        <button class="btn btn--primary" type="button" data-action="retry">Tekrar dene</button>
      </div>
    </section>
  `
}

function onboardingIntroView() {
  const profile = getActiveProfile(state)
  const done = ratedCount(profile)
  return `
    <section class="hero">
      <h1>Önce zevkini tanıyalım</h1>
      <p>Sana ${profile.onboardingTarget} film göstereceğim. Her birini az / normal / çok beğendim diye işaretle. Bu senin perdeni kuracak.</p>
      <div class="cta-row">
        <button class="btn btn--primary" type="button" data-action="start-rate">
          ${done > 0 ? 'Kaldığın yerden devam' : 'Filmleri puanla'}
        </button>
        ${
          done >= 20
            ? `<button class="btn btn--secondary" type="button" data-action="skip-rest">Şimdilik yeterli (${done})</button>`
            : ''
        }
      </div>
    </section>
    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>Nasıl çalışır?</h2>
          <p>Puanların tür ağırlıklarına dönüşür. Sonra moda göre öneri üretiriz.</p>
        </div>
      </div>
      <div class="score-row" style="pointer-events:none">
        <div class="score-btn score-btn--low"><strong>Az</strong><span>sevmiyorum / uzak</span></div>
        <div class="score-btn score-btn--ok"><strong>Normal</strong><span>idare eder</span></div>
        <div class="score-btn score-btn--love"><strong>Çok</strong><span>benim tarzım</span></div>
      </div>
    </div>
  `
}

function rateView() {
  const profile = getActiveProfile(state)
  const done = ratedCount(profile)
  const target = profile.onboardingTarget
  const pct = Math.min(100, Math.round((done / target) * 100))
  const movie = pool[poolIndex]

  if (!movie) {
    return loader('Filmler yükleniyor…')
  }

  const genres = (movie.genreIds || [])
    .map((id) => state.genreMap[id])
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')

  return `
    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>Zevkini kur</h2>
          <p>Hızlı ol — içinden geldiği gibi işaretle.</p>
        </div>
        <div class="progress">
          <div class="progress__bar"><div class="progress__fill" style="width:${pct}%"></div></div>
          <div class="progress__label">${done} / ${target}</div>
        </div>
      </div>

      <div class="rate-stage">
        <div class="poster-frame">
          ${
            movie.posterPath
              ? `<img src="${posterUrl(movie.posterPath, 'w500')}" alt="${escapeAttr(movie.title)}" />`
              : ''
          }
        </div>
        <div class="rate-meta">
          <h3>${escapeHtml(movie.title)}</h3>
          <div class="meta-row">
            ${movie.year ? `<span>${movie.year}</span>` : ''}
            ${movie.voteAverage ? `<span>★ ${movie.voteAverage.toFixed(1)}</span>` : ''}
            ${genres ? `<span>${escapeHtml(genres)}</span>` : ''}
          </div>
          <p class="overview">${escapeHtml(movie.overview || 'Özet yok.')}</p>
          <div class="score-row">
            <button class="score-btn score-btn--low" type="button" data-score="${SCORE.LOW}">
              <strong>Az beğendim</strong><span>uzak dur</span>
            </button>
            <button class="score-btn score-btn--ok" type="button" data-score="${SCORE.OK}">
              <strong>Normal</strong><span>idare eder</span>
            </button>
            <button class="score-btn score-btn--love" type="button" data-score="${SCORE.LOVE}">
              <strong>Çok beğendim</strong><span>benim tarzım</span>
            </button>
          </div>
          <div class="skip-row">
            <button class="ghost-btn" type="button" data-action="skip-film">Atla</button>
            ${
              done >= 25
                ? `<button class="btn btn--secondary" type="button" data-action="finish-early">Bitir (${done})</button>`
                : `<span class="muted">En az 25 film önerilir</span>`
            }
          </div>
        </div>
      </div>
    </div>
  `
}

function homeView() {
  const profile = getActiveProfile(state)
  const taste = buildTasteProfile(profile.ratings)
  const topNames = taste.topGenres
    .map((g) => state.genreMap[g.id])
    .filter(Boolean)
    .slice(0, 5)

  return `
    <section class="hero">
      <h1>Bugün nasıl bir perde?</h1>
      <p>Modunu seç. Senin puanladığın ${ratedCount(profile)} filme göre öneri çıkaracağım.</p>
    </section>

    ${
      topNames.length
        ? `<div class="taste-summary">${topNames
            .map((n) => `<span class="chip">${escapeHtml(n)}</span>`)
            .join('')}</div>`
        : ''
    }

    <div class="panel" style="margin-top:1.25rem">
      <div class="panel__head">
        <div>
          <h2>Mod seç</h2>
          <p>O anki hissine en yakın olanı seç.</p>
        </div>
      </div>
      <div class="mood-grid">
        ${MOODS.map(
          (m) => `
          <button class="mood-card ${profile.lastMood === m.id ? 'is-active' : ''}" type="button" data-mood="${m.id}">
            <strong>${escapeHtml(m.label)}</strong>
            <span>${escapeHtml(m.blurb)}</span>
          </button>
        `,
        ).join('')}
      </div>
    </div>

    <div class="cta-row" style="margin-top:1.25rem">
      <button class="btn btn--secondary" type="button" data-action="more-rate">Daha fazla film puanla</button>
    </div>
  `
}

function resultsView() {
  if (loading) return loader('Sana özel filmler seçiliyor…')
  if (!recommendPayload) return `<div class="empty">Öneri bulunamadı.</div>`

  const { mood, results } = recommendPayload
  return `
    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>${escapeHtml(mood.label)} perde</h2>
          <p>${escapeHtml(mood.blurb)} · zevkine göre sıralandı</p>
        </div>
        <button class="ghost-btn" type="button" data-action="back-home">Modlar</button>
      </div>
      <div class="results">
        ${results
          .map(
            ({ movie }, i) => `
          <button class="result-card" type="button" data-movie-id="${movie.id}" style="animation-delay:${i * 0.05}s">
            ${
              movie.posterPath
                ? `<img src="${posterUrl(movie.posterPath, 'w342')}" alt="" />`
                : '<div></div>'
            }
            <div>
              <h3>${escapeHtml(movie.title)}</h3>
              <div class="meta-row">
                ${movie.year ? `<span>${movie.year}</span>` : ''}
                ${movie.voteAverage ? `<span>★ ${movie.voteAverage.toFixed(1)}</span>` : ''}
              </div>
              <p>${escapeHtml(movie.overview || '')}</p>
            </div>
          </button>
        `,
          )
          .join('')}
      </div>
      <div class="cta-row" style="margin-top:1.25rem">
        <button class="btn btn--primary" type="button" data-action="reshuffle">Yeniden öner</button>
      </div>
    </div>
  `
}

function detailView() {
  if (loading || !detailMovie) return loader('Film açılıyor…')
  const m = detailMovie
  const genres = (m.genres || []).map((g) => g.name)

  return `
    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>${escapeHtml(m.title)}</h2>
          <p>${[m.year, m.runtime ? `${m.runtime} dk` : '', m.voteAverage ? `★ ${m.voteAverage.toFixed(1)}` : '']
            .filter(Boolean)
            .join(' · ')}</p>
        </div>
        <button class="ghost-btn" type="button" data-action="back-results">Geri</button>
      </div>
      <div class="detail">
        <div class="detail__poster">
          ${m.posterPath ? `<img src="${posterUrl(m.posterPath, 'w500')}" alt="" />` : ''}
        </div>
        <div>
          ${m.tagline ? `<p style="font-family:var(--font-display);font-style:italic;font-size:1.25rem;margin:0 0 .75rem;color:var(--gold)">${escapeHtml(m.tagline)}</p>` : ''}
          <div class="chip-row">
            ${genres.map((g) => `<span class="chip">${escapeHtml(g)}</span>`).join('')}
          </div>
          <p class="overview">${escapeHtml(m.overview || 'Özet yok.')}</p>
          ${
            m.directors?.length
              ? `<p class="muted"><strong style="color:var(--ink)">Yönetmen:</strong> ${escapeHtml(m.directors.map((d) => d.name).join(', '))}</p>`
              : ''
          }
          ${
            m.cast?.length
              ? `<p class="muted" style="margin-top:.5rem"><strong style="color:var(--ink)">Oyuncular:</strong> ${escapeHtml(m.cast.map((c) => c.name).join(', '))}</p>`
              : ''
          }
          <div class="cta-row" style="margin-top:1.25rem">
            <a class="btn btn--primary" href="https://www.themoviedb.org/movie/${m.id}" target="_blank" rel="noreferrer">TMDB'de aç</a>
            <button class="btn btn--secondary" type="button" data-action="rate-love">Çok beğendim diye işaretle</button>
          </div>
        </div>
      </div>
    </div>
  `
}

function loader(text) {
  return `<div class="loader"><div class="spinner"></div><div>${escapeHtml(text)}</div></div>`
}

function bindOnboardingIntro() {
  app.querySelector('[data-action="start-rate"]')?.addEventListener('click', () => startRating())
  app.querySelector('[data-action="skip-rest"]')?.addEventListener('click', () => finishOnboarding())
  app.querySelector('[data-action="retry"]')?.addEventListener('click', () => boot())
  bindReset()
}

function bindRate() {
  app.querySelectorAll('[data-score]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const score = Number(btn.dataset.score)
      rateCurrent(score)
    })
  })
  app.querySelector('[data-action="skip-film"]')?.addEventListener('click', () => nextFilm())
  app.querySelector('[data-action="finish-early"]')?.addEventListener('click', () => finishOnboarding())
  bindReset()
}

function bindHome() {
  app.querySelectorAll('[data-mood]').forEach((btn) => {
    btn.addEventListener('click', () => runRecommend(btn.dataset.mood))
  })
  app.querySelector('[data-action="more-rate"]')?.addEventListener('click', () => startRating())
  bindReset()
}

function bindResults() {
  app.querySelectorAll('[data-movie-id]').forEach((btn) => {
    btn.addEventListener('click', () => openDetail(Number(btn.dataset.movieId)))
  })
  app.querySelector('[data-action="back-home"]')?.addEventListener('click', () => {
    view = 'home'
    render()
  })
  app.querySelector('[data-action="reshuffle"]')?.addEventListener('click', () => {
    const mood = recommendPayload?.mood?.id || getActiveProfile(state).lastMood
    if (mood) runRecommend(mood)
  })
  bindReset()
}

function bindDetail() {
  app.querySelector('[data-action="back-results"]')?.addEventListener('click', () => {
    view = 'results'
    render()
  })
  app.querySelector('[data-action="rate-love"]')?.addEventListener('click', () => {
    if (!detailMovie) return
    state = setRating(state, detailMovie, SCORE.LOVE)
    error = null
    // soft feedback via re-render chip area not needed; toast-like via muted
    const btn = app.querySelector('[data-action="rate-love"]')
    if (btn) {
      btn.textContent = 'Kaydedildi'
      btn.disabled = true
    }
  })
  bindReset()
}

function bindReset() {
  app.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    if (!confirm('Zevk profilin silinecek. Emin misin?')) return
    state = resetProfile(state)
    pool = []
    poolIndex = 0
    recommendPayload = null
    view = 'onboarding-intro'
    render()
  })
  app.querySelector('[data-action="retry"]')?.addEventListener('click', () => boot())
}

async function startRating() {
  error = null
  loading = true
  view = 'rate'
  render()
  try {
    if (!pool.length) {
      const profile = getActiveProfile(state)
      const raw = await fetchOnboardingPool(Math.max(profile.onboardingTarget + 20, 90))
      const rated = new Set(Object.keys(profile.ratings).map(Number))
      pool = raw.filter((m) => !rated.has(m.id))
      poolIndex = 0
    }
    if (!pool.length) {
      finishOnboarding()
      return
    }
    view = 'rate'
  } catch (e) {
    error = e.message
    view = 'error'
  } finally {
    loading = false
    render()
  }
}

function rateCurrent(score) {
  const movie = pool[poolIndex]
  if (!movie) return
  state = setRating(state, movie, score)
  const profile = getActiveProfile(state)
  if (ratedCount(profile) >= profile.onboardingTarget) {
    finishOnboarding()
    return
  }
  nextFilm()
}

function nextFilm() {
  poolIndex += 1
  if (poolIndex >= pool.length) {
    // daha fazla çek
    startRatingMore()
    return
  }
  render()
}

async function startRatingMore() {
  loading = true
  render()
  try {
    const profile = getActiveProfile(state)
    const more = await fetchOnboardingPool(40)
    const rated = new Set(Object.keys(profile.ratings).map(Number))
    const seen = new Set(pool.map((m) => m.id))
    const fresh = more.filter((m) => !rated.has(m.id) && !seen.has(m.id))
    pool = [...pool, ...fresh]
    if (poolIndex >= pool.length) {
      finishOnboarding()
      return
    }
  } catch (e) {
    error = e.message
  } finally {
    loading = false
    render()
  }
}

function finishOnboarding() {
  state = markOnboardingDone(state)
  view = 'home'
  render()
}

async function runRecommend(moodId) {
  error = null
  state = setLastMood(state, moodId)
  loading = true
  view = 'results'
  recommendPayload = null
  render()
  try {
    const profile = getActiveProfile(state)
    recommendPayload = await recommendForMood(profile, moodId, { count: 8 })
    for (const { movie } of recommendPayload.results.slice(0, 3)) {
      state = pushHistory(state, movie.id)
    }
  } catch (e) {
    error = e.message
    view = 'error'
  } finally {
    loading = false
    render()
  }
}

async function openDetail(id) {
  error = null
  loading = true
  detailMovie = null
  view = 'detail'
  render()
  try {
    detailMovie = await getMovieDetails(id)
    state = pushHistory(state, id)
  } catch (e) {
    error = e.message
    view = 'error'
  } finally {
    loading = false
    render()
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", '&#39;')
}

// keep saveState referenced for future profile switch
void saveState
