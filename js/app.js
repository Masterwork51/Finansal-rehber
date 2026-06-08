/**
 * Finans Paneli V2 — Ana uygulama
 */

let appData = loadData();

document.addEventListener('DOMContentLoaded', init);

function init() {
  hideSplash();
  renderAll();
  bindEvents();
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
  renderHero();
  renderAdvice();
  renderAssets();
  renderExpenses();
  renderCreditCard();
  renderDollarCenter();
  renderVisaScore();
  renderGoals();
  renderV3();
  Charts.renderAll(appData);
}

function renderHeader() {
  document.getElementById('current-month').textContent = getCurrentMonthLabel();
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

function renderAdvice() {
  document.getElementById('advice-text').textContent = AdviceEngine.generate(appData);
}

function renderAssets() {
  const tbody = document.getElementById('assets-tbody');
  const { assets, rates } = appData;
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

function renderV3() {
  const list = document.getElementById('v3-list');
  list.innerHTML = appData.v3Roadmap.map((item) => {
    const note = item.note ? ` <em>(${item.note})</em>` : '';
    const badge = item.status === 'planned' ? '<span class="v3-badge">V3</span>' : '';
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

  // Bottom nav
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

  // Settings modal
  const modal = document.getElementById('settings-modal');
  document.getElementById('btn-settings').addEventListener('click', () => {
    populateSettingsForm();
    modal.showModal();
  });

  modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveFromForm(new FormData(e.target));
    modal.close();
    renderAll();
    navigator.vibrate?.(20);
  });

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('Tüm veriler varsayılana dönecek. Emin misin?')) {
      appData = resetData();
      modal.close();
      renderAll();
    }
  });
}

function populateSettingsForm() {
  const form = document.getElementById('settings-form');
  const d = appData;
  form.rateUsd.value = d.rates.usd;
  form.rateEur.value = d.rates.eur;
  form.tlCash.value = d.assets.tlCash;
  form.usdCash.value = d.assets.usdCash;
  form.eurCash.value = d.assets.eurCash;
  form.visaUsd.value = d.assets.visaUsd;
  form.ccDebt.value = d.creditCard.debt;
  form.ccDueDay.value = d.creditCard.dueDay;
  form.visaGoal.value = d.goals.visaTargetUsd;
  form.buyableUsd.value = d.goals.buyableUsdThisMonth;
}

function saveFromForm(fd) {
  appData.rates.usd = Number(fd.get('rateUsd'));
  appData.rates.eur = Number(fd.get('rateEur'));
  appData.assets.tlCash = Number(fd.get('tlCash'));
  appData.assets.usdCash = Number(fd.get('usdCash'));
  appData.assets.eurCash = Number(fd.get('eurCash'));
  appData.assets.visaUsd = Number(fd.get('visaUsd'));
  appData.creditCard.debt = Number(fd.get('ccDebt'));
  appData.creditCard.dueDay = Number(fd.get('ccDueDay'));
  appData.goals.visaTargetUsd = Number(fd.get('visaGoal'));
  appData.goals.buyableUsdThisMonth = Number(fd.get('buyableUsd'));

  const lastUsd = appData.history.usd[appData.history.usd.length - 1];
  if (lastUsd) lastUsd.value = appData.assets.visaUsd;

  const lastNw = appData.history.netWorth[appData.history.netWorth.length - 1];
  if (lastNw) lastNw.value = calcNetWorth(appData);

  saveData(appData);
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
