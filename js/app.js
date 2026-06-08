/**
 * Birikim Hesaplayıcı v4 — Max dolar odaklı
 */

let appData = loadData();
let expensesEditing = false;

const CHECKLIST_ITEMS = [
  { key: 'reviewExpenses', label: 'Giderleri kontrol et ve kıs' },
  { key: 'payCreditCard', label: 'Kart borcunu öde' },
  { key: 'buyMaxUsd', label: 'Max doları vize hesabına koy' },
  { key: 'updateVisaAccount', label: 'Vize hesabı bakiyesini güncelle' }
];

const MODAL_IDS = ['quick-modal', 'cc-modal'];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    await RatesService.loadInto(appData);
    hideSplash();
    renderAll();
    bindEvents();
    registerServiceWorker();
  } catch (err) {
    console.error(err);
    hideSplash();
  }
}

function hideSplash() {
  setTimeout(() => document.getElementById('splash')?.classList.add('hidden'), 500);
}

function renderAll() {
  renderHeader();
  renderSavingsHero();
  renderFlow();
  renderCutTips();
  renderAdvice();
  renderExpenses();
  renderCreditCard();
  renderVisaGoal();
  renderChecklist();
  Charts.renderUsd(appData);
}

function renderHeader() {
  document.getElementById('current-month').textContent = getCurrentMonthLabel();
  document.getElementById('rate-usd').textContent = `USD ${appData.rates.usd.toFixed(2)}`;
  document.getElementById('rates-source').textContent = RatesService.formatRateInfo(appData);
}

function renderSavingsHero() {
  const flow = calcMonthlyCashFlow(appData);
  const maxUsd = calcRecommendedUsd(appData);
  const risk = getRiskStatus(appData);

  document.getElementById('max-usd').textContent = formatUSD(maxUsd);
  document.getElementById('max-tl').textContent =
    flow.savableTl > 0
      ? `${formatTL(flow.savableTl)} kalan nakit`
      : `${formatTL(Math.abs(flow.savableTl))} açık var`;

  const badge = document.getElementById('risk-badge');
  badge.className = 'risk-badge ' + risk.level;
  badge.innerHTML = `<span class="risk-dot"></span> ${risk.label}`;
}

function renderFlow() {
  const flow = calcMonthlyCashFlow(appData);
  const maxUsd = calcRecommendedUsd(appData);

  const rows = [
    { label: 'Maaş', value: formatTL(flow.salary), type: 'plus' },
    { label: 'Sabit giderler', value: '−' + formatTL(flow.fixed), type: 'minus' },
    { label: 'Değişken giderler', value: '−' + formatTL(flow.variable), type: 'minus' },
    { label: 'Kart ödemesi', value: '−' + formatTL(flow.ccPay), type: 'minus' },
    { label: 'Güvenlik payı (elde tut)', value: '−' + formatTL(flow.buffer), type: 'minus' },
    { label: 'Kalan TL', value: formatTL(flow.savableTl), type: flow.savableTl >= 0 ? 'result' : 'danger' }
  ];

  document.getElementById('flow-list').innerHTML = rows.map((r) =>
    `<li class="flow-row ${r.type}"><span>${r.label}</span><strong>${r.value}</strong></li>`
  ).join('');

  document.getElementById('flow-result').textContent =
    `${formatTL(Math.max(0, flow.savableTl))} → ${formatUSD(maxUsd)}`;
}

function renderCutTips() {
  const tips = getExpenseCutTips(appData);
  const el = document.getElementById('cut-tips-list');

  if (tips.length === 0) {
    el.innerHTML = '<li class="cut-tip-empty">Değişken giderler zaten düşük veya maaş-gider dengesi negatif.</li>';
    return;
  }

  el.innerHTML = tips.map((t) =>
    `<li class="cut-tip"><span>${t.name}</span><strong>+${t.usdGain} USD</strong><span class="cut-detail">${formatTL(t.cutTl)} kısarsan</span></li>`
  ).join('');
}

function renderAdvice() {
  document.getElementById('advice-text').textContent = AdviceEngine.generate(appData);
}

function renderExpenses() {
  if (expensesEditing) return;

  const fixedEl = document.getElementById('fixed-expenses');
  const varEl = document.getElementById('variable-expenses');

  fixedEl.innerHTML = appData.expenses.fixed.map((e) =>
    `<li class="expense-row" role="button"><span>${escapeHtml(e.name)}</span><span class="amount">${formatTL(e.amount)}</span></li>`
  ).join('');

  varEl.innerHTML = appData.expenses.variable.map((e) => {
    const usd = calcUsdFromTl(e.amount, appData);
    return `<li class="expense-row" role="button">
      <span>${escapeHtml(e.name)}</span>
      <span class="amount">${formatTL(e.amount)} <em>≈${usd}$</em></span>
    </li>`;
  }).join('');

  document.getElementById('fixed-total').textContent = formatTL(getFixedTotal(appData));
  document.getElementById('variable-total').textContent = formatTL(getVariableTotal(appData));
  document.getElementById('monthly-total').textContent = formatTL(getMonthlyExpensesTotal(appData));
}

function renderCreditCard() {
  const cc = appData.creditCard;
  const days = getDaysUntilDue(cc.dueDay);
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  document.getElementById('cc-debt').textContent = formatNumber(cc.debt) + ' TL';
  document.getElementById('cc-planned').textContent = formatTL(cc.plannedPayment ?? cc.debt);
  document.getElementById('cc-days').textContent = `${cc.dueDay} ${months[new Date().getMonth()]} · ${days} gün`;
}

function renderVisaGoal() {
  const current = appData.assets.visaUsd;
  const remaining = calcVisaRoom(appData);
  const pct = calcVisaProgress(appData);
  const months = monthsToVisaGoal(appData);

  document.getElementById('visa-current').textContent = formatUSD(current);
  document.getElementById('visa-remaining').textContent = formatUSD(remaining);
  document.getElementById('visa-eta').textContent =
    remaining <= 0 ? 'Tamam!' : months ? `${months} ay` : '—';
  document.getElementById('visa-progress').style.width = pct + '%';
}

function renderChecklist() {
  const progress = getMonthlyChecklistProgress(appData);
  document.getElementById('checklist-pct').textContent = progress.pct + '%';

  document.getElementById('checklist').innerHTML = CHECKLIST_ITEMS.map((item) => {
    const checked = appData.checklist[item.key] ? 'checked' : '';
    return `<li><label class="check-item">
      <input type="checkbox" data-key="${item.key}" ${checked}>
      <span class="check-box"></span><span>${item.label}</span>
    </label></li>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function bindEvents() {
  document.getElementById('btn-edit-expenses').addEventListener('click', openExpensesEdit);
  document.getElementById('btn-cancel-expenses').addEventListener('click', closeExpensesEdit);
  document.getElementById('fixed-expenses').addEventListener('click', openExpensesEdit);
  document.getElementById('variable-expenses').addEventListener('click', openExpensesEdit);

  document.getElementById('btn-quick-update').addEventListener('click', () => {
    populateQuickForm();
    Modal.open('quick-modal');
  });

  document.getElementById('btn-edit-cc').addEventListener('click', () => {
    const f = document.getElementById('cc-form');
    f.ccDebt.value = appData.creditCard.debt;
    f.ccPlanned.value = appData.creditCard.plannedPayment ?? appData.creditCard.debt;
    f.ccDueDay.value = appData.creditCard.dueDay;
    Modal.open('cc-modal');
  });

  document.getElementById('btn-refresh-advice').addEventListener('click', () => {
    renderAdvice();
    navigator.vibrate?.(10);
  });

  MODAL_IDS.forEach((id) => Modal.bind(id));

  document.querySelectorAll('#expenses-edit .btn-add').forEach((btn) => {
    btn.addEventListener('click', () => addExpenseRow(btn.dataset.type));
  });

  document.getElementById('expenses-inline-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveExpensesFromForm();
    closeExpensesEdit();
    renderAll();
    Toast.show(`Max birikim: ${formatUSD(calcRecommendedUsd(appData))} ✓`);
  });

  document.getElementById('quick-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    appData.income.monthlySalary = Number(fd.get('monthlySalary'));
    appData.assets.visaUsd = Number(fd.get('visaUsd'));
    appData.creditCard.debt = Number(fd.get('ccDebt'));
    appData.creditCard.plannedPayment = Number(fd.get('ccPlanned'));
    updateHistory();
    saveData(appData);
    Modal.close('quick-modal');
    renderAll();
    Toast.show(`Max birikim: ${formatUSD(calcRecommendedUsd(appData))} ✓`);
  });

  document.getElementById('cc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    appData.creditCard.debt = Number(fd.get('ccDebt'));
    appData.creditCard.plannedPayment = Number(fd.get('ccPlanned'));
    appData.creditCard.dueDay = Number(fd.get('ccDueDay'));
    saveData(appData);
    Modal.close('cc-modal');
    renderAll();
    Toast.show('Kart güncellendi ✓');
  });

  document.getElementById('checklist').addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      appData.checklist[e.target.dataset.key] = e.target.checked;
      saveData(appData);
      renderChecklist();
    }
  });

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function openExpensesEdit() {
  expensesEditing = true;
  document.getElementById('expenses-view').classList.add('hidden');
  document.getElementById('expenses-edit').classList.remove('hidden');
  renderExpenseEditor('fixed', appData.expenses.fixed);
  renderExpenseEditor('variable', appData.expenses.variable);
  document.querySelector('#expenses-inline-form [name="monthlySalary"]').value = appData.income.monthlySalary || 0;
  document.querySelector('#expenses-inline-form [name="tlBuffer"]').value = appData.savings?.tlBuffer ?? 10000;
  document.getElementById('expenses-section').scrollIntoView({ behavior: 'smooth' });
}

function closeExpensesEdit() {
  expensesEditing = false;
  document.getElementById('expenses-view').classList.remove('hidden');
  document.getElementById('expenses-edit').classList.add('hidden');
  renderExpenses();
}

function renderExpenseEditor(type, items) {
  const container = document.getElementById(`${type}-expenses-editor`);
  container.innerHTML = items.map((item, i) =>
    `<div class="editor-row">
      <input type="text" class="editor-name" value="${escapeHtml(item.name)}" placeholder="Ad">
      <input type="number" class="editor-amount" value="${item.amount}" min="0" inputmode="decimal">
      <button type="button" class="editor-delete">&times;</button>
    </div>`
  ).join('');
  container.querySelectorAll('.editor-delete').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.editor-row').remove());
  });
}

function addExpenseRow(type) {
  const container = document.getElementById(`${type}-expenses-editor`);
  const div = document.createElement('div');
  div.className = 'editor-row';
  div.innerHTML = `<input type="text" class="editor-name" placeholder="Ad">
    <input type="number" class="editor-amount" value="0" min="0" inputmode="decimal">
    <button type="button" class="editor-delete">&times;</button>`;
  container.appendChild(div);
  div.querySelector('.editor-delete').addEventListener('click', () => div.remove());
  div.querySelector('.editor-name').focus();
}

function readExpenseEditor(type) {
  const rows = document.getElementById(`${type}-expenses-editor`).querySelectorAll('.editor-row');
  const items = [];
  rows.forEach((row) => {
    const name = row.querySelector('.editor-name').value.trim();
    const amount = Number(row.querySelector('.editor-amount').value);
    if (!name && amount <= 0) return;
    items.push({ name: name || 'Gider', amount: Math.max(0, amount) });
  });
  return items.length ? items : [{ name: 'Gider', amount: 0 }];
}

function saveExpensesFromForm() {
  appData.expenses.fixed = readExpenseEditor('fixed');
  appData.expenses.variable = readExpenseEditor('variable');
  appData.income.monthlySalary = Number(document.querySelector('[name="monthlySalary"]').value);
  if (!appData.savings) appData.savings = {};
  appData.savings.tlBuffer = Number(document.querySelector('[name="tlBuffer"]').value);
  saveData(appData);
}

function populateQuickForm() {
  const f = document.getElementById('quick-form');
  f.monthlySalary.value = appData.income.monthlySalary || 0;
  f.visaUsd.value = appData.assets.visaUsd;
  f.ccDebt.value = appData.creditCard.debt;
  f.ccPlanned.value = appData.creditCard.plannedPayment ?? appData.creditCard.debt;
}

function updateHistory() {
  const last = appData.history.usd[appData.history.usd.length - 1];
  if (last) last.value = appData.assets.visaUsd;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=4.0').catch(() => {});
  }
}
