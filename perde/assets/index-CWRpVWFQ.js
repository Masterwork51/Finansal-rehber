(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`https://api.themoviedb.org/3`,t=`https://image.tmdb.org/t/p`;function n(){return`af62b02452761de3f160e4c41f2244d7`}function r(){return!!n()}async function i(t,r={}){let i=n();if(!i)throw Error(`TMDB API anahtarı eksik.`);let a=new URL(`${e}${t}`);a.searchParams.set(`api_key`,i),a.searchParams.set(`language`,`tr-TR`);for(let[e,t]of Object.entries(r))t!=null&&t!==``&&a.searchParams.set(e,String(t));let o=await fetch(a);if(!o.ok){let e=await o.text().catch(()=>``);throw Error(`TMDB ${o.status}: ${e||o.statusText}`)}return o.json()}function a(e,n=`w500`){return e?`${t}/${n}${e}`:null}async function o(){return(await i(`/genre/movie/list`)).genres||[]}async function s(e=80){let t=[1,2,3,4,5],n=await Promise.all([...t.map(e=>i(`/movie/popular`,{page:e})),...t.slice(0,3).map(e=>i(`/movie/top_rated`,{page:e})),i(`/discover/movie`,{sort_by:`popularity.desc`,"vote_count.gte":500,with_original_language:`en`,page:1}),i(`/discover/movie`,{sort_by:`vote_average.desc`,"vote_count.gte":1e3,page:1}),i(`/discover/movie`,{sort_by:`popularity.desc`,with_genres:`18|53|878|27|35`,"vote_count.gte":300,page:1})]),r=new Map;for(let e of n)for(let t of e.results||[])!t.poster_path||!t.id||r.has(t.id)||r.set(t.id,d(t));let a=[...r.values()];return f(a),a.slice(0,e)}async function c(e,{page:t=1,excludeIds:n=[]}={}){let r=await i(`/discover/movie`,{sort_by:`popularity.desc`,"vote_count.gte":200,with_genres:e.slice(0,3).join(`|`),page:t}),a=new Set(n);return(r.results||[]).filter(e=>e.poster_path&&!a.has(e.id)).map(d)}async function l(e){let t=await i(`/movie/${e}`,{append_to_response:`credits,keywords`});return{...d(t),runtime:t.runtime,tagline:t.tagline,genres:t.genres||[],cast:(t.credits?.cast||[]).slice(0,8).map(e=>({id:e.id,name:e.name,character:e.character})),directors:(t.credits?.crew||[]).filter(e=>e.job===`Director`).map(e=>({id:e.id,name:e.name})),keywords:(t.keywords?.keywords||[]).map(e=>e.name)}}async function u(e){return((await i(`/movie/${e}/similar`)).results||[]).filter(e=>e.poster_path).map(d)}async function ee(e){return((await i(`/movie/${e}/recommendations`)).results||[]).filter(e=>e.poster_path).map(d)}function d(e){return{id:e.id,title:e.title||e.original_title,originalTitle:e.original_title,overview:e.overview||``,posterPath:e.poster_path,backdropPath:e.backdrop_path,releaseDate:e.release_date||``,year:(e.release_date||``).slice(0,4),voteAverage:e.vote_average??0,voteCount:e.vote_count??0,genreIds:e.genre_ids||(e.genres||[]).map(e=>e.id),popularity:e.popularity??0}}function f(e){for(let t=e.length-1;t>0;t--){let n=Math.floor(Math.random()*(t+1));[e[t],e[n]]=[e[n],e[t]]}return e}var p=`perde.v1`,m=()=>({version:1,profiles:{mehmet:h(`mehmet`,`Mehmet`)},activeProfileId:`mehmet`,genreMap:{}});function h(e,t){return{id:e,name:t,ratings:{},onboardingDone:!1,onboardingTarget:70,history:[],lastMood:null}}function te(){try{let e=localStorage.getItem(p);if(!e)return m();let t=JSON.parse(e);return{...m(),...t,profiles:{...m().profiles,...t.profiles||{}}}}catch{return m()}}function g(e){localStorage.setItem(p,JSON.stringify(e))}function _(e){return e.profiles[e.activeProfileId]}function v(e,t,n){let r=_(e);return n===0?delete r.ratings[t.id]:r.ratings[t.id]={score:n,movie:{id:t.id,title:t.title,posterPath:t.posterPath,genreIds:t.genreIds,year:t.year,voteAverage:t.voteAverage},ratedAt:Date.now()},g(e),e}function y(e){return Object.keys(e.ratings).length}function ne(e){let t=_(e);return t.onboardingDone=!0,g(e),e}function b(e,t){return e.genreMap=Object.fromEntries(t.map(e=>[e.id,e.name])),g(e),e}function x(e,t){let n=_(e);return n.history=[t,...n.history.filter(e=>e!==t)].slice(0,200),g(e),e}function re(e,t){let n=_(e);return n.lastMood=t,g(e),e}function ie(e){let t=e.activeProfileId,n=e.profiles[t]?.name||`Mehmet`;return e.profiles[t]=h(t,n),g(e),e}var S={LOW:1,OK:2,LOVE:3};function C(e){let t={},n=[],r=[],i=[],a=0;for(let o of Object.values(e)){let{score:e,movie:s}=o,c=e===S.LOVE?3:e===S.OK?1:-1.5;a+=Math.abs(c),e===S.LOVE?n.push(s):e===S.OK?r.push(s):i.push(s);for(let e of s.genreIds||[])t[e]=(t[e]||0)+c}let o=Object.entries(t).map(([e,t])=>({id:Number(e),weight:t})).sort((e,t)=>t.weight-e.weight);return{genreWeights:t,topGenres:o.filter(e=>e.weight>0).slice(0,5),avoidGenres:o.filter(e=>e.weight<0).slice(0,4),loved:n,liked:r,disliked:i,ratedTotal:Object.keys(e).length,totalWeight:a}}function ae(e,t,n){let r=0,i=e.genreIds||[];for(let e of i)r+=(t.genreWeights[e]||0)*1.2;if(r+=Math.min(e.voteAverage||0,9)*.35,r+=Math.min((e.voteCount||0)/5e3,2),n?.preferGenres?.length){let e=i.filter(e=>n.preferGenres.includes(e)).length;r+=e*4}if(n?.avoidGenres?.length){let e=i.filter(e=>n.avoidGenres.includes(e)).length;r-=e*3.5}for(let e of t.avoidGenres)i.includes(e.id)&&(r-=2.5);let a=[...t.loved,...t.liked.slice(0,10)],o=0;for(let e of a){let t=i.filter(t=>(e.genreIds||[]).includes(t)).length;o+=t}return r+=Math.min(o*.15,4),r}var w=[{id:`rahat`,label:`Rahat`,blurb:`Yumuşak, keyifli, yormayan`,preferGenres:[35,10749,16,12],avoidGenres:[27,53,80]},{id:`gerilim`,label:`Gerilim`,blurb:`Nabız yükselsin`,preferGenres:[53,80,9648,27],avoidGenres:[10751,10749]},{id:`dusunceli`,label:`Düşünceli`,blurb:`Derin, yavaş, iz bırakan`,preferGenres:[18,36,99,10752],avoidGenres:[28,35]},{id:`epik`,label:`Epik`,blurb:`Büyük dünya, büyük his`,preferGenres:[12,14,878,28],avoidGenres:[99]},{id:`karanlik`,label:`Karanlık`,blurb:`Noir, ağır, keskin`,preferGenres:[80,53,9648,27],avoidGenres:[16,10751]},{id:`surpriz`,label:`Sürpriz`,blurb:`Zevkine güven, şaşırt beni`,preferGenres:[],avoidGenres:[]}];async function T(e,t,{count:n=8}={}){let r=w.find(e=>e.id===t)||w[0],i=C(e.ratings),a=new Set([...Object.keys(e.ratings).map(Number),...e.history||[]]),o=[...r.preferGenres,...i.topGenres.map(e=>e.id)].filter((e,t,n)=>n.indexOf(e)===t),s=o.length>0?o.slice(0,4):i.topGenres.map(e=>e.id).slice(0,3),l=new Map;if(s.length){let e=await Promise.all([c(s,{page:1,excludeIds:[...a]}),c(s,{page:2,excludeIds:[...a]})]);for(let t of e)for(let e of t)l.set(e.id,e)}let d=i.loved.slice(0,5);for(let e of d)try{let[t,n]=await Promise.all([u(e.id),ee(e.id)]);for(let e of[...t,...n])a.has(e.id)||l.set(e.id,e)}catch{}let f=[...l.values()].map(e=>({movie:e,score:ae(e,i,r)})).sort((e,t)=>t.score-e.score),p=[],m=new Map;for(let e of f){let t=e.movie.genreIds?.[0],r=m.get(t)||0;if(!(r>=2&&p.length<n)&&(p.push(e),t!=null&&m.set(t,r+1),p.length>=n))break}if(p.length<n){for(let e of f)if(!p.some(t=>t.movie.id===e.movie.id)&&(p.push(e),p.length>=n))break}return{mood:r,taste:i,results:p}}var E=document.querySelector(`#app`),D=te(),O=[],k=0,A=`boot`,j=null,M=null,N=!1,P=null;F();async function F(){if(I(),!r()){A=`missing-key`,I();return}try{if(N=!0,I(),!Object.keys(D.genreMap||{}).length){let e=await o();D=b(D,e)}A=_(D).onboardingDone?`home`:`onboarding-intro`}catch(e){P=e.message,A=`error`}finally{N=!1,I()}}function I(){if(N&&A===`boot`){E.innerHTML=L(G(`Perde hazırlanıyor…`));return}switch(A){case`missing-key`:E.innerHTML=L(R());break;case`error`:E.innerHTML=L(z());break;case`onboarding-intro`:E.innerHTML=L(B()),K();break;case`rate`:E.innerHTML=L(V()),q();break;case`home`:E.innerHTML=L(H()),oe();break;case`results`:E.innerHTML=L(U()),se();break;case`detail`:E.innerHTML=L(W()),ce();break;default:E.innerHTML=L(G(`Yükleniyor…`))}}function L(e){let t=_(D);return`
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand__name">Per<em>de</em></div>
          <div class="brand__tag">${t.name} · kişisel perde</div>
        </div>
        ${t.onboardingDone?`<button class="ghost-btn" type="button" data-action="reset">Zevki sıfırla</button>`:``}
      </header>
      ${P&&A!==`error`?`<div class="alert">${$(P)}</div>`:``}
      ${e}
    </div>
  `}function R(){return`
    <section class="hero">
      <h1>API anahtarı gerekli</h1>
      <p>TMDB anahtarını <code>film-tavsiye/.env</code> dosyasına ekle, sonra sunucuyu yeniden başlat.</p>
    </section>
    <div class="panel">
      <p class="muted">Örnek:</p>
      <pre style="white-space:pre-wrap;color:var(--gold);font-size:.9rem;margin:0">VITE_TMDB_API_KEY=senin_anahtarin</pre>
      <p class="muted" style="margin-top:1rem">Anahtar: <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style="color:var(--gold)">themoviedb.org/settings/api</a></p>
    </div>
  `}function z(){return`
    <section class="hero">
      <h1>Bir şey ters gitti</h1>
      <p>${$(P||`Bilinmeyen hata`)}</p>
      <div class="cta-row">
        <button class="btn btn--primary" type="button" data-action="retry">Tekrar dene</button>
      </div>
    </section>
  `}function B(){let e=_(D),t=y(e);return`
    <section class="hero">
      <h1>Önce zevkini tanıyalım</h1>
      <p>Sana ${e.onboardingTarget} film göstereceğim. Her birini az / normal / çok beğendim diye işaretle. Bu senin perdeni kuracak.</p>
      <div class="cta-row">
        <button class="btn btn--primary" type="button" data-action="start-rate">
          ${t>0?`Kaldığın yerden devam`:`Filmleri puanla`}
        </button>
        ${t>=20?`<button class="btn btn--secondary" type="button" data-action="skip-rest">Şimdilik yeterli (${t})</button>`:``}
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
  `}function V(){let e=_(D),t=y(e),n=e.onboardingTarget,r=Math.min(100,Math.round(t/n*100)),i=O[k];if(!i)return G(`Filmler yükleniyor…`);let o=(i.genreIds||[]).map(e=>D.genreMap[e]).filter(Boolean).slice(0,3).join(` · `);return`
    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>Zevkini kur</h2>
          <p>Hızlı ol — içinden geldiği gibi işaretle.</p>
        </div>
        <div class="progress">
          <div class="progress__bar"><div class="progress__fill" style="width:${r}%"></div></div>
          <div class="progress__label">${t} / ${n}</div>
        </div>
      </div>

      <div class="rate-stage">
        <div class="poster-frame">
          ${i.posterPath?`<img src="${a(i.posterPath,`w500`)}" alt="${fe(i.title)}" />`:``}
        </div>
        <div class="rate-meta">
          <h3>${$(i.title)}</h3>
          <div class="meta-row">
            ${i.year?`<span>${i.year}</span>`:``}
            ${i.voteAverage?`<span>★ ${i.voteAverage.toFixed(1)}</span>`:``}
            ${o?`<span>${$(o)}</span>`:``}
          </div>
          <p class="overview">${$(i.overview||`Özet yok.`)}</p>
          <div class="score-row">
            <button class="score-btn score-btn--low" type="button" data-score="${S.LOW}">
              <strong>Az beğendim</strong><span>uzak dur</span>
            </button>
            <button class="score-btn score-btn--ok" type="button" data-score="${S.OK}">
              <strong>Normal</strong><span>idare eder</span>
            </button>
            <button class="score-btn score-btn--love" type="button" data-score="${S.LOVE}">
              <strong>Çok beğendim</strong><span>benim tarzım</span>
            </button>
          </div>
          <div class="skip-row">
            <button class="ghost-btn" type="button" data-action="skip-film">Atla</button>
            ${t>=25?`<button class="btn btn--secondary" type="button" data-action="finish-early">Bitir (${t})</button>`:`<span class="muted">En az 25 film önerilir</span>`}
          </div>
        </div>
      </div>
    </div>
  `}function H(){let e=_(D),t=C(e.ratings).topGenres.map(e=>D.genreMap[e.id]).filter(Boolean).slice(0,5);return`
    <section class="hero">
      <h1>Bugün nasıl bir perde?</h1>
      <p>Modunu seç. Senin puanladığın ${y(e)} filme göre öneri çıkaracağım.</p>
    </section>

    ${t.length?`<div class="taste-summary">${t.map(e=>`<span class="chip">${$(e)}</span>`).join(``)}</div>`:``}

    <div class="panel" style="margin-top:1.25rem">
      <div class="panel__head">
        <div>
          <h2>Mod seç</h2>
          <p>O anki hissine en yakın olanı seç.</p>
        </div>
      </div>
      <div class="mood-grid">
        ${w.map(t=>`
          <button class="mood-card ${e.lastMood===t.id?`is-active`:``}" type="button" data-mood="${t.id}">
            <strong>${$(t.label)}</strong>
            <span>${$(t.blurb)}</span>
          </button>
        `).join(``)}
      </div>
    </div>

    <div class="cta-row" style="margin-top:1.25rem">
      <button class="btn btn--secondary" type="button" data-action="more-rate">Daha fazla film puanla</button>
    </div>
  `}function U(){if(N)return G(`Sana özel filmler seçiliyor…`);if(!j)return`<div class="empty">Öneri bulunamadı.</div>`;let{mood:e,results:t}=j;return`
    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>${$(e.label)} perde</h2>
          <p>${$(e.blurb)} · zevkine göre sıralandı</p>
        </div>
        <button class="ghost-btn" type="button" data-action="back-home">Modlar</button>
      </div>
      <div class="results">
        ${t.map(({movie:e},t)=>`
          <button class="result-card" type="button" data-movie-id="${e.id}" style="animation-delay:${t*.05}s">
            ${e.posterPath?`<img src="${a(e.posterPath,`w342`)}" alt="" />`:`<div></div>`}
            <div>
              <h3>${$(e.title)}</h3>
              <div class="meta-row">
                ${e.year?`<span>${e.year}</span>`:``}
                ${e.voteAverage?`<span>★ ${e.voteAverage.toFixed(1)}</span>`:``}
              </div>
              <p>${$(e.overview||``)}</p>
            </div>
          </button>
        `).join(``)}
      </div>
      <div class="cta-row" style="margin-top:1.25rem">
        <button class="btn btn--primary" type="button" data-action="reshuffle">Yeniden öner</button>
      </div>
    </div>
  `}function W(){if(N||!M)return G(`Film açılıyor…`);let e=M,t=(e.genres||[]).map(e=>e.name);return`
    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>${$(e.title)}</h2>
          <p>${[e.year,e.runtime?`${e.runtime} dk`:``,e.voteAverage?`★ ${e.voteAverage.toFixed(1)}`:``].filter(Boolean).join(` · `)}</p>
        </div>
        <button class="ghost-btn" type="button" data-action="back-results">Geri</button>
      </div>
      <div class="detail">
        <div class="detail__poster">
          ${e.posterPath?`<img src="${a(e.posterPath,`w500`)}" alt="" />`:``}
        </div>
        <div>
          ${e.tagline?`<p style="font-family:var(--font-display);font-style:italic;font-size:1.25rem;margin:0 0 .75rem;color:var(--gold)">${$(e.tagline)}</p>`:``}
          <div class="chip-row">
            ${t.map(e=>`<span class="chip">${$(e)}</span>`).join(``)}
          </div>
          <p class="overview">${$(e.overview||`Özet yok.`)}</p>
          ${e.directors?.length?`<p class="muted"><strong style="color:var(--ink)">Yönetmen:</strong> ${$(e.directors.map(e=>e.name).join(`, `))}</p>`:``}
          ${e.cast?.length?`<p class="muted" style="margin-top:.5rem"><strong style="color:var(--ink)">Oyuncular:</strong> ${$(e.cast.map(e=>e.name).join(`, `))}</p>`:``}
          <div class="cta-row" style="margin-top:1.25rem">
            <a class="btn btn--primary" href="https://www.themoviedb.org/movie/${e.id}" target="_blank" rel="noreferrer">TMDB'de aç</a>
            <button class="btn btn--secondary" type="button" data-action="rate-love">Çok beğendim diye işaretle</button>
          </div>
        </div>
      </div>
    </div>
  `}function G(e){return`<div class="loader"><div class="spinner"></div><div>${$(e)}</div></div>`}function K(){E.querySelector(`[data-action="start-rate"]`)?.addEventListener(`click`,()=>Y()),E.querySelector(`[data-action="skip-rest"]`)?.addEventListener(`click`,()=>Z()),E.querySelector(`[data-action="retry"]`)?.addEventListener(`click`,()=>F()),J()}function q(){E.querySelectorAll(`[data-score]`).forEach(e=>{e.addEventListener(`click`,()=>{le(Number(e.dataset.score))})}),E.querySelector(`[data-action="skip-film"]`)?.addEventListener(`click`,()=>X()),E.querySelector(`[data-action="finish-early"]`)?.addEventListener(`click`,()=>Z()),J()}function oe(){E.querySelectorAll(`[data-mood]`).forEach(e=>{e.addEventListener(`click`,()=>Q(e.dataset.mood))}),E.querySelector(`[data-action="more-rate"]`)?.addEventListener(`click`,()=>Y()),J()}function se(){E.querySelectorAll(`[data-movie-id]`).forEach(e=>{e.addEventListener(`click`,()=>de(Number(e.dataset.movieId)))}),E.querySelector(`[data-action="back-home"]`)?.addEventListener(`click`,()=>{A=`home`,I()}),E.querySelector(`[data-action="reshuffle"]`)?.addEventListener(`click`,()=>{let e=j?.mood?.id||_(D).lastMood;e&&Q(e)}),J()}function ce(){E.querySelector(`[data-action="back-results"]`)?.addEventListener(`click`,()=>{A=`results`,I()}),E.querySelector(`[data-action="rate-love"]`)?.addEventListener(`click`,()=>{if(!M)return;D=v(D,M,S.LOVE),P=null;let e=E.querySelector(`[data-action="rate-love"]`);e&&(e.textContent=`Kaydedildi`,e.disabled=!0)}),J()}function J(){E.querySelector(`[data-action="reset"]`)?.addEventListener(`click`,()=>{confirm(`Zevk profilin silinecek. Emin misin?`)&&(D=ie(D),O=[],k=0,j=null,A=`onboarding-intro`,I())}),E.querySelector(`[data-action="retry"]`)?.addEventListener(`click`,()=>F())}async function Y(){P=null,N=!0,A=`rate`,I();try{if(!O.length){let e=_(D),t=await s(Math.max(e.onboardingTarget+20,90)),n=new Set(Object.keys(e.ratings).map(Number));O=t.filter(e=>!n.has(e.id)),k=0}if(!O.length){Z();return}A=`rate`}catch(e){P=e.message,A=`error`}finally{N=!1,I()}}function le(e){let t=O[k];if(!t)return;D=v(D,t,e);let n=_(D);if(y(n)>=n.onboardingTarget){Z();return}X()}function X(){if(k+=1,k>=O.length){ue();return}I()}async function ue(){N=!0,I();try{let e=_(D),t=await s(40),n=new Set(Object.keys(e.ratings).map(Number)),r=new Set(O.map(e=>e.id)),i=t.filter(e=>!n.has(e.id)&&!r.has(e.id));if(O=[...O,...i],k>=O.length){Z();return}}catch(e){P=e.message}finally{N=!1,I()}}function Z(){D=ne(D),A=`home`,I()}async function Q(e){P=null,D=re(D,e),N=!0,A=`results`,j=null,I();try{j=await T(_(D),e,{count:8});for(let{movie:e}of j.results.slice(0,3))D=x(D,e.id)}catch(e){P=e.message,A=`error`}finally{N=!1,I()}}async function de(e){P=null,N=!0,M=null,A=`detail`,I();try{M=await l(e),D=x(D,e)}catch(e){P=e.message,A=`error`}finally{N=!1,I()}}function $(e){return String(e||``).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`)}function fe(e){return $(e).replaceAll(`'`,`&#39;`)}