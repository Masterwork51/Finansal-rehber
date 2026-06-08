/**
 * Finans Paneli V3 — Ana uygulama
 */

let appData = loadData();
let deferredInstallPrompt = null;

const CHECKLIST_ITEMS = [
  { key: 'payCreditCard', label: 'Kredi kartı borcunu öde' },
  { key: 'buyUsd', label: 'Bu ay dolar al' },
  { key: 'payRent', label: 'Kira ve aidatı öde' },
  { key: 'checkVisaAccount', label: 'Vize hesabını kontrol et' }
];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await RatesService.loadInto(appData);
  hideSplash();
  renderAll();
  bindEvents();
  setupInstallPrompt();
  registerServiceWorker();

  window.addEventListener('resize', debounce(() => {
    Charts.renderAll(appData);
  }, 200));
}

function hideSplash() {
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
  }, 800);
}

function renderAll() {
  renderHeader();
  renderRates();
  renderHero();
  renderChecklist();
  renderAdvice();
  renderAssets();
  renderExpenses();
  renderCreditCard();
  renderDollarCenter();
  renderVisaScore();
  renderGoals();
  renderUkTravel();
  renderFethiye();
  renderV3();
  Charts.renderAll(appData);
}

function renderHeader() {
  document.getElementById('current-month').textContent = getCurrentMonthLabel();
}

function renderRates() {
  const { rates } = appData;
  document.getElementById('rate-usd').textContent = `USD ${rates.usd.toFixed(2)}`;
  document.getElementById('rate-eur').textContent = `EUR ${rates.eur.toFixed(2)}`;
  document.getElementById('rate-gbp').textContent = `GBP ${(rates.gbp || 0).toFixed(2)}`;
  document.getElementById('rates-source').textContent = RatesService.formatRateInfo(appData);
}

function renderHero() {
  const netWorth = calcNetWorth(appData);
  const visaPct = calcVisaProgress(appData);
  const risk = getRiskStatus(appData);
  const dueDay = appData.creditCard.dueDay;
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const monthName = months[new Date().getMonth()];

  document.getElementById('net-worth').textContent = formatTL(netWorth);
  document.getElementById('visa-account-text').textContent =
    `${formatUSD(appData.assets.visaUsd)} / ${formatUSD(appData.goals.visaTargetUsd)}`;
  document.getElementById('visa-progress').style.width = visaPct + '%';
  document.getElementById('visa-progress').parentElement.setAttribute('aria-valuenow', Math.round(visaPct));
  document.getElementById('visa-pct').textContent = Math.round(visaPct) + '%';
  document.getElementById('buyable-usd').textContent = formatUSD(appData.goals.buyableUsdThisMonth);

  document.getElementById('risk-date-label').textContent = `${dueDay} ${monthName} Risk Durumu`;
  const badge = document.getElementById('risk-badge');
  badge.className = 'risk-badge ' + risk.level;
  badge.innerHTML = `<span class="risk-dot"></span> ${risk.label}`;
}

function renderChecklist() {
  const list = document.getElementById('checklist');
  const progress = getMonthlyChecklistProgress(appData);
  document.getElementById('checklist-pct').textContent = progress.pct + '%';

  list.innerHTML = CHECKLIST_ITEMS.map((item) => {
    const checked = appData.checklist[item.key] ? 'checked' : '';
    return `<li>
      <label class="check-item">
        <input type="checkbox" data-key="${item.key}" ${checked}>
        <span class="check-box"></span>
        <span>${item.label}</span>
      </label>
    </li>`;
  }).join('');
}

function renderAdvice() {
  document.getElementById('advice-text').textContent = AdviceEngine.generate(appData);
}

function renderAssets() {
  const tbody = document.getElementById('assets-tbody');
  const { assets } = appData;
  const rows = [
    { name: 'TL Nakit', value: formatTL(assets.tlCash) },
    { name: 'USD Nakit', value: formatUSD(assets.usdCash) },
    { name: 'EUR Nakit', value: '€' + formatNumber(assets.eurCash) },
    { name: 'Vize USD', value: formatUSD(assets.visaUsd) }
  ];

  tbody.innerHTML = rows.map((r) =>
    `<tr><td>${r.name}</td><td>${r.value}</td></tr>`
  ).join('');

  document.getElementById('total-tl-equiv').textContent = formatTL(calcTotalAssetsTL(appData));
}

function renderExpenses() {
  const fixedEl = document.getElementById('fixed-expenses');
  const varEl = document.getElementById('variable-expenses');

  fixedEl.innerHTML = appData.expenses.fixed.map((e) =>
    `<li><span>${e.name}</span><span class="amount">${formatTL(e.amount)}</span></li>`
  ).join('');

  varEl.innerHTML = appData.expenses.variable.map((e) =>
    `<li><span>${e.name}</span><span class="amount">${formatTL(e.amount)}</span></li>`
  ).join('');

  document.getElementById('fixed-total').textContent = formatTL(getFixedTotal(appData));
  document.getElementById('variable-total').textContent = formatTL(getVariableTotal(appData));
}

function renderCreditCard() {
  const days = getDaysUntilDue(appData.creditCard.dueDay);
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const monthName = months[new Date().getMonth()];

  document.getElementById('cc-debt').textContent = formatNumber(appData.creditCard.debt) + ' TL';
  document.getElementById('cc-due').textContent = `${appData.creditCard.dueDay} ${monthName}`;
  document.getElementById('cc-days').textContent = days + ' Gün';

  const urgency = Math.max(10, 100 - days * 12);
  document.getElementById('cc-urgency-bar').style.width = urgency + '%';
}

function renderDollarCenter() {
  updateDollarSim(appData.goals.buyableUsdThisMonth);
  const slider = document.getElementById('usd-slider');
  slider.max = Math.max(600, appData.goals.buyableUsdThisMonth + 100);
  slider.value = appData.goals.buyableUsdThisMonth;
}

function updateDollarSim(amount) {
  const visa = appData.assets.visaUsd;
  const target = appData.goals.visaTargetUsd;
  const newTotal = visa + amount;
  const remaining = Math.max(0, target - newTotal);

  document.getElementById('sim-buy').textContent = formatNumber(amount) + ' USD';
  document.getElementById('sim-new-total').textContent = formatNumber(newTotal) + ' USD';
  document.getElementById('sim-remaining').textContent =
    remaining > 0 ? formatNumber(remaining) + ' USD kaldı' : 'Hedef tamamlandı!';
  document.getElementById('slider-value').textContent = formatNumber(amount) + ' USD';
}

function renderVisaScore() {
  const score = calcVisaScore(appData);
  const filled = Math.round(score / 10);
  const stars = '★'.repeat(filled) + '☆'.repeat(10 - filled);

  document.getElementById('visa-stars').textContent = stars;
  document.getElementById('visa-stars').setAttribute('aria-label', `${filled}/10 yıldız`);
  document.getElementById('visa-score').textContent = score;

  const tips = AdviceEngine.getVisaTips(appData);
  document.getElementById('visa-tips').innerHTML = tips.map((t) =>
    `<div class="score-tip">${t}</div>`
  ).join('');
}

function renderGoals() {
  const container = document.getElementById('goals-list');
  const visaRemaining = Math.max(0, appData.goals.visaTargetUsd - appData.assets.visaUsd);
  const visaPct = calcVisaProgress(appData);
  const emergencyPct = appData.goals.emergencyFundCurrentPct;
  const emergencyTarget = getEmergencyTargetTL(appData);
  const emergencyCurrent = emergencyTarget * (emergencyPct / 100);

  container.innerHTML = `
    <div class="goal-item">
      <h3>İngiltere Vizesi</h3>
      <div class="goal-stats">
        <div class="goal-stat"><span>Hedef</span><strong>${formatUSD(appData.goals.visaTargetUsd)}</strong></div>
        <div class="goal-stat"><span>Mevcut</span><strong>${formatUSD(appData.assets.visaUsd)}</strong></div>
        <div class="goal-stat"><span>Kalan</span><strong>${formatUSD(visaRemaining)}</strong></div>
      </div>
      <div class="goal-progress"><div class="goal-progress-fill visa" style="width:${visaPct}%"></div></div>
    </div>
    <div class="goal-item">
      <h3>Acil Durum Fonu</h3>
      <div class="goal-stats">
        <div class="goal-stat"><span>Hedef</span><strong>6 ay gider</strong></div>
        <div class="goal-stat"><span>Mevcut</span><strong>%${emergencyPct}</strong></div>
        <div class="goal-stat"><span>Tutar</span><strong>${formatTL(emergencyCurrent)}</strong></div>
      </div>
      <div class="goal-progress"><div class="goal-progress-fill emergency" style="width:${emergencyPct}%"></div></div>
    </div>
  `;
}

function renderUkTravel() {
  const uk = appData.travel.uk;
  const totalGbp = calcUkTravelTotalGbp(appData);
  const totalTl = calcUkTravelTotalTl(appData);
  const saved = uk.savedTl;
  const gap = Math.max(0, totalTl - saved);
  const pct = Math.min(100, (saved / totalTl) * 100);

  document.getElementById('uk-total').textContent =
    `£${formatNumber(totalGbp)} · ${formatTL(totalTl)}`;

  document.getElementById('uk-breakdown').innerHTML = [
    { label: 'Vize ücreti', value: `£${uk.visaFeeGbp}` },
    { label: 'Uçak', value: `£${uk.flightGbp}` },
    { label: 'Otel', value: `£${uk.hotelGbp}` },
    { label: `${uk.days} gün harcama`, value: `£${uk.dailyGbp * uk.days}` }
  ].map((i) => `<li><span>${i.label}</span><span>${i.value}</span></li>`).join('');

  document.getElementById('uk-saved').textContent = formatTL(saved);
  document.getElementById('uk-progress').style.width = pct + '%';
  document.getElementById('uk-gap').textContent =
    gap > 0 ? `${formatTL(gap)} daha biriktirmen gerekiyor.` : 'Seyahat bütçen hazır görünüyor!';
}

function renderFethiye() {
  const f = appData.travel.fethiye;
  const remaining = Math.max(0, f.targetTl - f.savedTl);
  const pct = calcFethiyeProgress(appData);

  document.getElementById('fethiye-target').textContent = formatTL(f.targetTl);
  document.getElementById('fethiye-saved').textContent = formatTL(f.savedTl);
  document.getElementById('fethiye-remaining').textContent = formatTL(remaining);
  document.getElementById('fethiye-progress').style.width = pct + '%';
}

function renderV3() {
  const list = document.getElementById('v3-list');
  list.innerHTML = appData.v3Roadmap.map((item) => {
    const note = item.note ? ` <em>(${item.note})</em>` : '';
    let badge = '';
    if (item.status === 'done') badge = '<span class="v3-badge done">Aktif</span>';
    else if (item.status === 'later') badge = '<span class="v3-badge">Yakında</span>';
    return `<li>${item.title}${note}${badge}</li>`;
  }).join('');
}

function bindEvents() {
  document.getElementById('btn-refresh-advice').addEventListener('click', () => {
    renderAdvice();
    navigator.vibrate?.(10);
  });

  document.getElementById('usd-slider').addEventListener('input', (e) => {
    updateDollarSim(Number(e.target.value));
  });

  document.getElementById('checklist').addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      appData.checklist[e.target.dataset.key] = e.target.checked;
      saveData(appData);
      renderChecklist();
      navigator.vibrate?.(10);
    }
  });

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.scroll;
      if (target === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(target) || document.querySelector('.' + target);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      navigator.vibrate?.(10);
    });
  });

  const quickModal = document.getElementById('quick-modal');
  const settingsModal = document.getElementById('settings-modal');
  const installModal = document.getElementById('install-modal');

  document.getElementById('btn-quick-update').addEventListener('click', () => {
    populateQuickForm();
    quickModal.showModal();
  });

  document.getElementById('btn-advanced').addEventListener('click', () => {
    quickModal.close();
    populateSettingsForm();
    settingsModal.showModal();
  });

  [quickModal, settingsModal, installModal].forEach((modal) => {
    modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  });

  document.getElementById('quick-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveFromQuickForm(new FormData(e.target));
    quickModal.close();
    renderAll();
    navigator.vibrate?.(20);
  });

  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveFromForm(new FormData(e.target));
    settingsModal.close();
    renderAll();
    navigator.vibrate?.(20);
  });

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('Tüm verilerin silinip başlangıç rakamlarına dönülecek. Emin misin?')) {
      appData = resetData();
      settingsModal.close();
      renderAll();
    }
  });

  document.getElementById('btn-install-help').addEventListener('click', showInstallHelp);
  document.getElementById('btn-dismiss-install').addEventListener('click', () => {
    document.getElementById('install-banner').classList.add('hidden');
    localStorage.setItem('finansInstallDismissed', '1');
  });

  document.getElementById('btn-copy-url').addEventListener('click', copyAppUrl);
}

function populateQuickForm() {
  const form = document.getElementById('quick-form');
  const d = appData;
  form.visaUsd.value = d.assets.visaUsd;
  form.ccDebt.value = d.creditCard.debt;
  form.tlCash.value = d.assets.tlCash;
  form.buyableUsd.value = d.goals.buyableUsdThisMonth;
  form.ukSaved.value = d.travel.uk.savedTl;
  form.fethiyeSaved.value = d.travel.fethiye.savedTl;
}

function saveFromQuickForm(fd) {
  appData.assets.visaUsd = Number(fd.get('visaUsd'));
  appData.creditCard.debt = Number(fd.get('ccDebt'));
  appData.assets.tlCash = Number(fd.get('tlCash'));
  appData.goals.buyableUsdThisMonth = Number(fd.get('buyableUsd'));
  appData.travel.uk.savedTl = Number(fd.get('ukSaved'));
  appData.travel.fethiye.savedTl = Number(fd.get('fethiyeSaved'));
  updateHistory();
  saveData(appData);
}

function populateSettingsForm() {
  const form = document.getElementById('settings-form');
  const d = appData;
  form.tlCash.value = d.assets.tlCash;
  form.usdCash.value = d.assets.usdCash;
  form.eurCash.value = d.assets.eurCash;
  form.visaUsd.value = d.assets.visaUsd;
  form.ccDebt.value = d.creditCard.debt;
  form.ccDueDay.value = d.creditCard.dueDay;
  form.visaGoal.value = d.goals.visaTargetUsd;
  form.buyableUsd.value = d.goals.buyableUsdThisMonth;
  form.emergencyPct.value = d.goals.emergencyFundCurrentPct;
  form.fethiyeTarget.value = d.travel.fethiye.targetTl;
}

function saveFromForm(fd) {
  appData.assets.tlCash = Number(fd.get('tlCash'));
  appData.assets.usdCash = Number(fd.get('usdCash'));
  appData.assets.eurCash = Number(fd.get('eurCash'));
  appData.assets.visaUsd = Number(fd.get('visaUsd'));
  appData.creditCard.debt = Number(fd.get('ccDebt'));
  appData.creditCard.dueDay = Number(fd.get('ccDueDay'));
  appData.goals.visaTargetUsd = Number(fd.get('visaGoal'));
  appData.goals.buyableUsdThisMonth = Number(fd.get('buyableUsd'));
  appData.goals.emergencyFundCurrentPct = Number(fd.get('emergencyPct'));
  appData.travel.fethiye.targetTl = Number(fd.get('fethiyeTarget'));
  updateHistory();
  saveData(appData);
}

function updateHistory() {
  const lastUsd = appData.history.usd[appData.history.usd.length - 1];
  if (lastUsd) lastUsd.value = appData.assets.visaUsd;

  const lastNw = appData.history.netWorth[appData.history.netWorth.length - 1];
  if (lastNw) lastNw.value = calcNetWorth(appData);
}

function setupInstallPrompt() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (isStandalone || localStorage.getItem('finansInstallDismissed')) return;

  document.getElementById('install-banner').classList.remove('hidden');

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    document.getElementById('install-hint').textContent =
      'Safari\'de Paylaş → Ana Ekrana Ekle';
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('install-hint').textContent =
      'Aşağıdaki "Nasıl?" butonuna bas veya Chrome menüsünden yükle';
  });
}

function showInstallHelp() {
  const modal = document.getElementById('install-modal');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const url = window.location.href.split('?')[0];

  document.getElementById('install-url').textContent = url;

  let steps = '';
  if (isIOS) {
    steps = `
      <ol class="steps-list">
        <li>Safari ile bu sayfayı aç</li>
        <li>Alttaki <strong>Paylaş</strong> ikonuna dokun</li>
        <li><strong>Ana Ekrana Ekle</strong> seçeneğine bas</li>
        <li>İsim olarak "Finans Paneli" kalsın, Ekle'ye bas</li>
      </ol>`;
  } else if (isAndroid) {
    steps = `
      <ol class="steps-list">
        <li>Chrome ile bu sayfayı aç</li>
        <li>Sağ üstteki <strong>⋮</strong> menüsüne dokun</li>
        <li><strong>Ana ekrana ekle</strong> veya <strong>Uygulamayı yükle</strong> seç</li>
        <li>Onayla — artık uygulama gibi açılır</li>
      </ol>`;
  } else {
    steps = `
      <ol class="steps-list">
        <li>Telefonundan bu linki aç</li>
        <li>Tarayıcı menüsünden "Ana ekrana ekle" seç</li>
        <li>Her gün tek dokunuşla açabilirsin</li>
      </ol>`;
  }

  document.getElementById('install-steps').innerHTML = steps;
  modal.showModal();

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(() => {
      deferredInstallPrompt = null;
    });
  }
}

function copyAppUrl() {
  const url = window.location.href.split('?')[0];
  navigator.clipboard?.writeText(url).then(() => {
    const btn = document.getElementById('btn-copy-url');
    btn.textContent = 'Kopyalandı!';
    setTimeout(() => { btn.textContent = 'Linki Kopyala'; }, 2000);
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
