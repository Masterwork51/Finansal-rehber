/**
 * Maksimum Güvenli Yatırım Modülü — UI
 */

let invData = investLoad();

const INV_MODAL_IDS = ['why-modal', 'asset-modal', 'income-modal', 'expense-modal', 'goal-modal', 'cc-modal', 'invest-settings-modal'];

const INV_RISK_DESCRIPTIONS = {
  conservative: '3 aylık zorunlu giderin + giderlerinin %15\'i kenarda kalır. En rahat uyuduğun seçenek, yatırıma en az para kalır.',
  balanced: '2 aylık zorunlu giderin + giderlerinin %10\'u kenarda kalır. Güvenlik ve birikim dengesi — çoğu kişi için doğru seçim.',
  aggressive: '1 aylık zorunlu giderin + giderlerinin %5\'i kenarda kalır. Enflasyona karşı en fazla parayı korursun ama beklenmedik durumda alanın dar.'
};

document.addEventListener('DOMContentLoaded', invInit);

async function invInit() {
  await investLoadRates(invData);
  investSave(invData);
  invRenderAll();
  invBindEvents();
}

function invEsc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function invHasData() {
  return invData.assets.length > 0 || invData.incomes.length > 0 || invData.expenses.length > 0;
}

function invRenderAll() {
  invRenderHeader();
  invRenderEmptyCard();
  invRenderHero();
  invRenderSummary();
  invRenderRisk();
  invRenderScenarios();
  invRenderInflation();
  invRenderNextMonth();
  invRenderAssets();
  invRenderCreditCard();
  invRenderIncomes();
  invRenderExpenses();
  invRenderGoals();
}

function invRenderHeader() {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const now = new Date();
  document.getElementById('invest-month').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
  const r = invData.rates;
  document.getElementById('inv-rate-usd').textContent = r.usdTry ? `USD ${r.usdTry.toFixed(2)}` : 'USD —';
  document.getElementById('inv-rate-eur').textContent = r.eurTry ? `EUR ${r.eurTry.toFixed(2)}` : 'EUR —';
  document.getElementById('inv-rate-gold').textContent = r.goldGramTry ? `Altın ${Math.round(r.goldGramTry)}` : 'Altın —';
  document.getElementById('inv-rates-source').textContent = r.updatedAt ? `TCMB · ${r.updatedAt}` : 'Kur: manuel';
}

function invRenderEmptyCard() {
  document.getElementById('inv-empty-card').classList.toggle('hidden', invHasData());
}

function invRenderHero() {
  const res = InvestEngine.computeThisMonth(invData);
  const hero = document.getElementById('inv-hero');
  hero.classList.remove('status-safe', 'status-tight', 'status-risk');
  hero.classList.add('status-' + res.status);

  document.getElementById('inv-max').textContent = investFmtTL(res.max);

  const usdEl = document.getElementById('inv-max-usd');
  usdEl.textContent = (res.max > 0 && res.maxUsd != null) ? `≈ ${investFmtUsd(res.maxUsd)}` : '';

  const sub = document.getElementById('inv-max-sub');
  const badge = document.getElementById('inv-status-badge');
  if (!invHasData()) {
    sub.textContent = 'Önce varlık, gelir ve giderlerini gir.';
    badge.className = 'risk-badge warning';
    badge.innerHTML = '<span class="risk-dot"></span> Veri bekleniyor';
  } else if (res.status === 'safe') {
    sub.textContent = 'Tamponların ve hedeflerin ayrıldı — bu tutarı gönül rahatlığıyla yatırabilirsin.';
    badge.className = 'risk-badge safe';
    badge.innerHTML = '<span class="risk-dot"></span> Güvenli';
  } else if (res.status === 'tight') {
    sub.textContent = 'Paran giderleri karşılıyor ama güvenlik tamponu henüz dolmadı. Önce yastığını doldur.';
    badge.className = 'risk-badge warning';
    badge.innerHTML = '<span class="risk-dot"></span> Önce tampon';
  } else {
    sub.textContent = 'Erişilebilir paran bu ayın giderlerini karşılamıyor. Şu an yatırım yapma.';
    badge.className = 'risk-badge danger';
    badge.innerHTML = '<span class="risk-dot"></span> Riskli';
  }
}

/** Aylık Özet — eski uygulamadaki gibi tek bakışta gelir/gider/kart/kalan akışı */
function invRenderSummary() {
  const res = InvestEngine.computeThisMonth(invData);
  const rows = [
    { label: 'Bu ay kalan kesin gelir', value: investFmtTL(res.incomeCounted), type: 'plus' },
    { label: 'Kullanılabilir nakit (bankada/elde)', value: investFmtTL(res.liquidQuick), type: 'plus' },
    { label: 'Bu ay çıkacak giderler', value: '−' + investFmtTL(res.expensesCounted), type: 'minus' },
    { label: 'Kredi kartı ödemesi', value: '−' + investFmtTL(res.cardPayment), type: 'minus' },
    { label: 'Hedeflere ayrılan pay', value: '−' + investFmtTL(res.goalReserve), type: 'minus' },
    { label: `Güvenlik yastığı (${res.params.label})`, value: '−' + investFmtTL(res.emergencyBuffer + res.stressReserve), type: 'minus' },
    { label: 'Yatırılabilir tutar', value: investFmtTL(res.max), type: res.max >= 0 ? 'result' : 'danger' }
  ];
  document.getElementById('summary-list').innerHTML = rows.map((r) =>
    `<li class="flow-row ${r.type}"><span>${r.label}</span><strong>${r.value}</strong></li>`
  ).join('');
  document.getElementById('summary-result').textContent =
    res.maxUsd != null ? `${investFmtTL(res.max)} ≈ ${investFmtUsd(res.maxUsd)}` : investFmtTL(res.max);
}

function invRenderRisk() {
  document.querySelectorAll('#risk-selector button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.risk === invData.riskLevel);
  });
  document.getElementById('risk-desc').textContent = INV_RISK_DESCRIPTIONS[invData.riskLevel] || '';
}

function invRenderScenarios() {
  const real = InvestEngine.computeThisMonth(invData);
  const pess = InvestEngine.computePessimistic(invData);
  document.getElementById('scenario-real').textContent = investFmtTL(real.max);
  document.getElementById('scenario-pess').textContent = investFmtTL(pess.max);

  const diff = real.max - pess.max;
  const el = document.getElementById('scenario-diff');
  if (!invHasData()) {
    el.textContent = '';
  } else if (diff > 0) {
    el.textContent = `İşler ters giderse yatırılabilir tutar ${investFmtTL(diff)} azalıyor. Kötümser rakamı yatırırsan her iki durumda da güvendesin.`;
  } else {
    el.textContent = 'İki senaryoda da sonuç aynı — durumun tamponlara takılmadan bu rakamı kaldırıyor.';
  }
}

function invRenderInflation() {
  const res = InvestEngine.computeThisMonth(invData);
  const months = Number(document.getElementById('inflation-months').value) || 3;
  const annual = invData.inflation.annualPct;
  const base = res.max > 0 ? res.max : res.liquidTotal;
  const loss = InvestEngine.inflationLoss(base, annual, months);

  document.getElementById('inflation-months-val').textContent = `${months} ay`;
  const text = document.getElementById('inflation-text');
  if (base <= 0) {
    text.textContent = 'Varlık girdiğinde paranın enflasyon karşısında ne kadar eriyeceğini burada görürsün.';
  } else {
    const label = res.max > 0 ? 'yatırılabilir paranı' : 'likit varlığını';
    text.innerHTML = `${investFmtTL(base)} tutarındaki ${label} <strong>${months} ay</strong> TL olarak bekletirsen alım gücünden yaklaşık <strong>${investFmtTL(loss)}</strong> kaybedersin.`;
  }
  document.getElementById('inflation-note').textContent =
    `Hesap, yıllık %${annual} enflasyon varsayımıyla yapıldı. Ayarlar'dan kendi tahminini girebilirsin.`;
}

function invRenderNextMonth() {
  const next = InvestEngine.computeNextMonth(invData);
  document.getElementById('next-month-max').textContent =
    next.maxUsd != null ? `≈ ${investFmtTL(next.max)} (≈ ${investFmtUsd(next.maxUsd)})` : `≈ ${investFmtTL(next.max)}`;

  const list = document.getElementById('projection-list');
  const maxAbs = Math.max(1, ...next.projection.map((p) => Math.abs(p.balance)));
  list.innerHTML = next.projection.map((p) => {
    const pct = Math.min(100, Math.abs(p.balance) / maxAbs * 100);
    const neg = p.balance < 0 ? ' neg' : '';
    return `<li>
      <span>${invEsc(p.label)}</span>
      <span class="bar-track"><span class="bar-fill${neg}" style="width:${pct}%"></span></span>
      <strong>${investFmtSigned(p.balance)}</strong>
    </li>`;
  }).join('');
}

// ---------- Veri listeleri ----------

function invAccessChip(acc) {
  const cls = (acc === 'instant' || acc === 'days1to3') ? 'green' : 'orange';
  return `<span class="inv-chip ${cls}">${INVEST_LABELS.accessibility[acc] || acc}</span>`;
}

function invAssetRow(a) {
  const tl = InvestEngine.assetTl(a, invData.rates);
  const unit = a.currency === 'XAU' ? 'gr' : INVEST_LABELS.currency[a.currency];
  const orig = a.currency === 'TRY' ? '' : `<small>${(Number(a.amount) || 0).toLocaleString('tr-TR')} ${unit}</small>`;
  return `<li data-edit="asset" data-id="${a.id}">
      <div class="inv-item-main">
        <span class="inv-item-name">${invEsc(a.name)}</span>
        <div class="inv-item-tags">
          <span class="inv-chip blue">${INVEST_LABELS.assetKind[a.kind] || ''}</span>
          ${a.purpose === 'cash' ? invAccessChip(a.accessibility) : ''}
        </div>
      </div>
      <span class="inv-item-amount">${investFmtTL(tl)}${orig}</span>
    </li>`;
}

function invRenderAssets() {
  const cashAssets = invData.assets.filter((a) => a.purpose !== 'investment');
  const investAssets = invData.assets.filter((a) => a.purpose === 'investment');

  const cashEl = document.getElementById('assets-cash-list');
  if (cashAssets.length === 0) {
    cashEl.innerHTML = '<li class="inv-list-empty" style="cursor:default">Henüz kullanılabilir nakit girmedin. "+ Ekle" ile başla.</li>';
  } else {
    cashEl.innerHTML = cashAssets.map(invAssetRow).join('');
  }
  const cashTotals = InvestEngine.liquidTotals(invData.assets, invData.rates);
  document.getElementById('assets-cash-total').innerHTML =
    `<strong>Kullanılabilir nakit toplamı: ${investFmtTL(cashTotals.total)}</strong>${cashTotals.slow > 0 ? ` <span class="inv-muted">(${investFmtTL(cashTotals.slow)} kısmı geç erişilir)</span>` : ''}`;

  const investEl = document.getElementById('assets-investment-list');
  if (investAssets.length === 0) {
    investEl.innerHTML = '<li class="inv-list-empty" style="cursor:default">Zaten sahip olduğun döviz/altın gibi yatırımların varsa buraya ekle — hesaba karışmaz.</li>';
  } else {
    investEl.innerHTML = investAssets.map(invAssetRow).join('');
  }
  const investTotals = InvestEngine.investmentTotals(invData.assets, invData.rates);
  document.getElementById('assets-investment-total').innerHTML =
    investAssets.length ? `Toplam mevcut yatırım değeri: <strong>${investFmtTL(investTotals.total)}</strong>` : '';
}

function invRenderCreditCard() {
  const cc = invData.creditCard;
  document.getElementById('cc-debt').textContent = investFmtTL(cc.debt);
  document.getElementById('cc-planned').textContent = investFmtTL(cc.plannedPayment);
}

function invRenderIncomes() {
  const el = document.getElementById('incomes-list');
  if (invData.incomes.length === 0) {
    el.innerHTML = '<li class="inv-list-empty" style="cursor:default">Henüz gelir yok. Maaşını ekleyerek başla.</li>';
    document.getElementById('incomes-total').innerHTML = '';
    return;
  }
  const relCls = { guaranteed: 'green', likely: 'orange', uncertain: 'red' };
  el.innerHTML = invData.incomes.map((inc) => {
    const dateLabel = inc.nextDate ? new Date(inc.nextDate).toLocaleDateString('tr-TR') : null;
    return `
    <li data-edit="income" data-id="${inc.id}">
      <div class="inv-item-main">
        <span class="inv-item-name">${invEsc(inc.name)}</span>
        <div class="inv-item-tags">
          <span class="inv-chip blue">${INVEST_LABELS.frequency[inc.frequency] || ''}</span>
          <span class="inv-chip ${relCls[inc.reliability] || ''}">${INVEST_LABELS.reliability[inc.reliability] || ''}</span>
          ${dateLabel ? `<span class="inv-chip">sıradaki: ${dateLabel}</span>` : ''}
        </div>
      </div>
      <span class="inv-item-amount">${investFmtTL(inc.amountTl)}</span>
    </li>`;
  }).join('');

  const total = invData.incomes.reduce((s, i) => s + (Number(i.amountTl) || 0), 0);
  const monthlyAvg = InvestEngine.projectedMonthlyIncome(invData.incomes, invData.riskLevel);
  document.getElementById('incomes-total').innerHTML =
    `<strong>Girdiğin toplam kalem: ${investFmtTL(total)}</strong> · aylık ortalama ≈ ${investFmtTL(monthlyAvg)}`;
}

function invRenderExpenses() {
  const wrap = document.getElementById('expenses-groups');
  if (invData.expenses.length === 0) {
    wrap.innerHTML = '<p class="inv-list-empty">Henüz gider yok. Kira, faturalar ve aboneliklerinle başla.</p>';
    document.getElementById('expenses-total').innerHTML = '';
    return;
  }

  const necCls = { essential: 'red', semiEssential: 'orange', optional: 'green' };
  const groups = [
    { key: 'bill', title: 'Faturalar' },
    { key: 'subscription', title: 'Abonelikler' },
    { key: 'living', title: 'Yaşam Giderleri' },
    { key: 'debt', title: 'Borç Ödemeleri' },
    { key: 'other', title: 'Diğer' }
  ];

  wrap.innerHTML = groups.map((g) => {
    const items = invData.expenses.filter((e) => (e.category || 'other') === g.key);
    if (items.length === 0) return '';
    const subtotal = items.reduce((s, e) => s + (Number(e.amountTl) || 0), 0);
    const rows = items.map((e) => `
      <li data-edit="expense" data-id="${e.id}">
        <div class="inv-item-main">
          <span class="inv-item-name">${invEsc(e.name)}</span>
          <div class="inv-item-tags">
            <span class="inv-chip ${necCls[e.necessity] || ''}">${INVEST_LABELS.necessity[e.necessity] || ''}</span>
            ${e.dueDay ? `<span class="inv-chip">son gün ${e.dueDay}</span>` : ''}
          </div>
        </div>
        <span class="inv-item-amount">${investFmtTL(e.amountTl)}</span>
      </li>`).join('');
    return `<h3 class="inv-group-title">${g.title} <span class="inv-group-subtotal">${investFmtTL(subtotal)}</span></h3><ul class="inv-list">${rows}</ul>`;
  }).join('');

  const t = InvestEngine.expenseTotals(invData.expenses);
  document.getElementById('expenses-total').innerHTML =
    `<strong>Aylık toplam gider: ${investFmtTL(t.total)}</strong> · Zorunlu: ${investFmtTL(t.essential)}`;
}

function invRenderGoals() {
  const el = document.getElementById('goals-list');
  if (invData.goals.length === 0) {
    el.innerHTML = '<li class="inv-list-empty" style="cursor:default">Hedef yok. Hedefin varsa ekle, sistem her ay pay ayırır.</li>';
    return;
  }
  const now = new Date();
  el.innerHTML = invData.goals.map((g) => {
    const info = InvestEngine.goalReserves([g], now).items[0];
    return `<li data-edit="goal" data-id="${g.id}">
      <div class="inv-item-main">
        <span class="inv-item-name">${invEsc(g.name)}</span>
        <div class="inv-item-tags">
          <span class="inv-chip blue">${info.monthsLeft} ay kaldı</span>
          <span class="inv-chip orange">aylık ${investFmtTL(info.monthly)} ayrılıyor</span>
        </div>
      </div>
      <span class="inv-item-amount">${investFmtTL(g.targetTl)}</span>
    </li>`;
  }).join('');
}

// ---------- Neden bu rakam? ----------

function invRenderBreakdown() {
  const res = InvestEngine.computeThisMonth(invData);
  const rows = [
    {
      label: 'Kullanılabilir nakit',
      sub: 'bankada/elde duran, harcamaya karar vermediğin TL — zaten yatırım olan döviz/altın DAHİL DEĞİL',
      value: res.liquidQuick, sign: 'plus'
    },
    {
      label: 'Bu ay gelecek kesin gelir',
      sub: 'garantili ve sıradaki ödeme tarihi bu ay içinde olan gelirler',
      value: res.incomeCounted, sign: 'plus'
    },
    {
      label: 'Bu ay çıkacak giderler',
      sub: 'günü gelmemiş faturalar + kalan yaşam giderleri',
      value: -res.expensesCounted, sign: 'minus'
    },
    {
      label: 'Kredi kartı ödemesi',
      sub: 'Kredi Kartı bölümünde girdiğin bu ayki ödeme',
      value: -res.cardPayment, sign: 'minus'
    },
    {
      label: 'Hedeflere ayrılan pay',
      sub: 'her hedefin bu aylık taksiti',
      value: -res.goalReserve, sign: 'minus'
    },
    {
      label: 'Acil durum yastığı',
      sub: `${res.params.bufferMonths} ay × ${investFmtTL(res.essentialMonthly)} zorunlu gider (${res.params.label})`,
      value: -res.emergencyBuffer, sign: 'minus'
    },
    {
      label: 'Beklenmedik gider payı',
      sub: `aylık giderlerin %${Math.round(res.params.stressPct * 100)}'i`,
      value: -res.stressReserve, sign: 'minus'
    }
  ];

  const list = document.getElementById('breakdown-list');
  const resultCls = res.max > 0 ? 'result' : 'result warn';
  const resultLine = res.maxUsd != null && res.max > 0
    ? `${investFmtTL(res.max)} <span class="inv-breakdown-usd">≈ ${investFmtUsd(res.maxUsd)}</span>`
    : investFmtTL(res.max);
  list.innerHTML = rows.map((r) => `
    <li class="${r.sign}">
      <span>${r.label}<span class="inv-breakdown-sub">${r.sub}</span></span>
      <strong>${investFmtSigned(r.value)}</strong>
    </li>`).join('') +
    `<li class="${resultCls}">
      <span>Güvenle yatırabileceğin</span>
      <strong>${resultLine}</strong>
    </li>`;

  const detail = document.getElementById('breakdown-detail');
  const parts = [];
  if (res.raw < 0) {
    parts.push(`Ham sonuç ${investFmtSigned(res.raw)} çıktığı için yatırılabilir tutar <strong>₺0</strong> olarak gösterildi — önce tamponun dolmalı.`);
  }
  if (res.investmentTotal > 0) {
    parts.push(`Zaten sahip olduğun <strong>${investFmtTL(res.investmentTotal)}</strong> değerindeki döviz/altın "mevcut yatırım" sayıldı ve bu hesaba HİÇ katılmadı — o para zaten yatırımda.`);
  }
  if (res.liquidSlow > 0) {
    parts.push(`Nakit varlıklarından ${investFmtTL(res.liquidSlow)} tutarına 1 haftadan geç eriştiğin için bu ayın hesabına katılmadı.`);
  }
  parts.push(`Risk seviyesi: <strong>${res.params.label}</strong>. Seviyeyi değiştirirsen yastık ve pay miktarları değişir, rakam anında güncellenir.`);
  detail.innerHTML = parts.join('<br><br>');
}

// ---------- Formlar ----------

function invUpdateAssetPurposeDefault() {
  const cur = document.getElementById('asset-currency').value;
  const purposeSelect = document.getElementById('asset-purpose');
  if (purposeSelect.dataset.userTouched === 'true') return;
  purposeSelect.value = cur === 'TRY' ? 'cash' : 'investment';
}

function invOpenAssetModal(id) {
  const f = document.getElementById('asset-form');
  f.reset();
  document.getElementById('asset-purpose').dataset.userTouched = 'false';
  const a = id ? invData.assets.find((x) => x.id === id) : null;
  document.getElementById('asset-modal-title').textContent = a ? 'Varlık Düzenle' : 'Varlık Ekle';
  document.getElementById('btn-delete-asset').classList.toggle('hidden', !a);
  f.id.value = a ? a.id : '';
  if (a) {
    f.name.value = a.name;
    f.kind.value = a.kind;
    f.currency.value = a.currency;
    f.amount.value = a.amount;
    f.accessibility.value = a.accessibility;
    f.purpose.value = a.purpose || 'cash';
    document.getElementById('asset-purpose').dataset.userTouched = 'true';
  } else {
    invUpdateAssetPurposeDefault();
  }
  invUpdateAssetHint();
  Modal.open('asset-modal');
}

function invUpdateAssetHint() {
  const cur = document.getElementById('asset-currency').value;
  document.getElementById('asset-amount-hint').textContent =
    cur === 'XAU' ? '(gram cinsinden)' : `(${INVEST_LABELS.currency[cur]} cinsinden)`;
}

function invOpenIncomeModal(id) {
  const f = document.getElementById('income-form');
  f.reset();
  const inc = id ? invData.incomes.find((x) => x.id === id) : null;
  document.getElementById('income-modal-title').textContent = inc ? 'Gelir Düzenle' : 'Gelir Ekle';
  document.getElementById('btn-delete-income').classList.toggle('hidden', !inc);
  f.id.value = inc ? inc.id : '';
  if (inc) {
    f.name.value = inc.name;
    f.amountTl.value = inc.amountTl;
    f.frequency.value = inc.frequency;
    f.reliability.value = inc.reliability;
    f.nextDate.value = inc.nextDate || '';
  }
  Modal.open('income-modal');
}

function invOpenExpenseModal(id) {
  const f = document.getElementById('expense-form');
  f.reset();
  const e = id ? invData.expenses.find((x) => x.id === id) : null;
  document.getElementById('expense-modal-title').textContent = e ? 'Gider Düzenle' : 'Gider Ekle';
  document.getElementById('btn-delete-expense').classList.toggle('hidden', !e);
  f.id.value = e ? e.id : '';
  if (e) {
    f.name.value = e.name;
    f.amountTl.value = e.amountTl;
    f.category.value = e.category;
    f.necessity.value = e.necessity;
    f.cancelImpact.value = e.cancelImpact;
    f.dueDay.value = e.dueDay ?? '';
  }
  Modal.open('expense-modal');
}

function invOpenGoalModal(id) {
  const f = document.getElementById('goal-form');
  f.reset();
  const g = id ? invData.goals.find((x) => x.id === id) : null;
  document.getElementById('goal-modal-title').textContent = g ? 'Hedef Düzenle' : 'Hedef Ekle';
  document.getElementById('btn-delete-goal').classList.toggle('hidden', !g);
  f.id.value = g ? g.id : '';
  if (g) {
    f.name.value = g.name;
    f.targetTl.value = g.targetTl;
    f.targetDate.value = (g.targetDate || '').slice(0, 7);
  }
  Modal.open('goal-modal');
}

function invSaveAndRefresh(msg) {
  investSave(invData);
  invRenderAll();
  const res = InvestEngine.computeThisMonth(invData);
  Toast.show(msg || `Max güvenli yatırım: ${investFmtTL(res.max)} ✓`);
}

// ---------- Olaylar ----------

function invBindEvents() {
  INV_MODAL_IDS.forEach((id) => Modal.bind(id));

  document.querySelectorAll('#risk-selector button').forEach((btn) => {
    btn.addEventListener('click', () => {
      invData.riskLevel = btn.dataset.risk;
      invSaveAndRefresh();
    });
  });

  document.getElementById('inflation-months').addEventListener('input', invRenderInflation);

  document.getElementById('btn-why').addEventListener('click', () => {
    invRenderBreakdown();
    Modal.open('why-modal');
  });

  document.getElementById('btn-start-setup').addEventListener('click', () => invOpenAssetModal());
  document.getElementById('btn-add-asset').addEventListener('click', () => invOpenAssetModal());
  document.getElementById('btn-add-income').addEventListener('click', () => invOpenIncomeModal());
  document.getElementById('btn-add-expense').addEventListener('click', () => invOpenExpenseModal());
  document.getElementById('btn-add-goal').addEventListener('click', () => invOpenGoalModal());

  document.querySelector('.main').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-edit]');
    if (!li) return;
    const id = li.dataset.id;
    if (li.dataset.edit === 'asset') invOpenAssetModal(id);
    else if (li.dataset.edit === 'income') invOpenIncomeModal(id);
    else if (li.dataset.edit === 'expense') invOpenExpenseModal(id);
    else if (li.dataset.edit === 'goal') invOpenGoalModal(id);
  });

  document.getElementById('asset-currency').addEventListener('change', () => {
    invUpdateAssetHint();
    invUpdateAssetPurposeDefault();
  });
  document.getElementById('asset-purpose').addEventListener('change', (e) => {
    e.target.dataset.userTouched = 'true';
  });
  document.getElementById('asset-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: fd.get('id') || investNewId(),
      name: String(fd.get('name')).trim() || 'Varlık',
      kind: fd.get('kind'),
      currency: fd.get('currency'),
      amount: Math.max(0, Number(fd.get('amount')) || 0),
      accessibility: fd.get('accessibility'),
      purpose: fd.get('purpose') || 'cash'
    };
    const i = invData.assets.findIndex((x) => x.id === item.id);
    if (i >= 0) invData.assets[i] = item; else invData.assets.push(item);
    Modal.close('asset-modal');
    invSaveAndRefresh();
  });
  document.getElementById('btn-delete-asset').addEventListener('click', () => {
    const id = document.querySelector('#asset-form [name="id"]').value;
    invData.assets = invData.assets.filter((x) => x.id !== id);
    Modal.close('asset-modal');
    invSaveAndRefresh('Varlık silindi');
  });

  document.getElementById('income-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: fd.get('id') || investNewId(),
      name: String(fd.get('name')).trim() || 'Gelir',
      amountTl: Math.max(0, Number(fd.get('amountTl')) || 0),
      frequency: fd.get('frequency'),
      reliability: fd.get('reliability'),
      nextDate: fd.get('nextDate') || null
    };
    const i = invData.incomes.findIndex((x) => x.id === item.id);
    if (i >= 0) invData.incomes[i] = item; else invData.incomes.push(item);
    Modal.close('income-modal');
    invSaveAndRefresh();
  });
  document.getElementById('btn-delete-income').addEventListener('click', () => {
    const id = document.querySelector('#income-form [name="id"]').value;
    invData.incomes = invData.incomes.filter((x) => x.id !== id);
    Modal.close('income-modal');
    invSaveAndRefresh('Gelir silindi');
  });

  document.getElementById('expense-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const day = fd.get('dueDay');
    const item = {
      id: fd.get('id') || investNewId(),
      name: String(fd.get('name')).trim() || 'Gider',
      amountTl: Math.max(0, Number(fd.get('amountTl')) || 0),
      category: fd.get('category'),
      necessity: fd.get('necessity'),
      cancelImpact: fd.get('cancelImpact'),
      dueDay: day ? Number(day) : null
    };
    const i = invData.expenses.findIndex((x) => x.id === item.id);
    if (i >= 0) invData.expenses[i] = item; else invData.expenses.push(item);
    Modal.close('expense-modal');
    invSaveAndRefresh();
  });
  document.getElementById('btn-delete-expense').addEventListener('click', () => {
    const id = document.querySelector('#expense-form [name="id"]').value;
    invData.expenses = invData.expenses.filter((x) => x.id !== id);
    Modal.close('expense-modal');
    invSaveAndRefresh('Gider silindi');
  });

  document.getElementById('goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item = {
      id: fd.get('id') || investNewId(),
      name: String(fd.get('name')).trim() || 'Hedef',
      targetTl: Math.max(0, Number(fd.get('targetTl')) || 0),
      targetDate: fd.get('targetDate') ? `${fd.get('targetDate')}-01` : new Date().toISOString().slice(0, 10)
    };
    const i = invData.goals.findIndex((x) => x.id === item.id);
    if (i >= 0) invData.goals[i] = item; else invData.goals.push(item);
    Modal.close('goal-modal');
    invSaveAndRefresh();
  });
  document.getElementById('btn-delete-goal').addEventListener('click', () => {
    const id = document.querySelector('#goal-form [name="id"]').value;
    invData.goals = invData.goals.filter((x) => x.id !== id);
    Modal.close('goal-modal');
    invSaveAndRefresh('Hedef silindi');
  });

  document.getElementById('btn-edit-cc').addEventListener('click', () => {
    const f = document.getElementById('cc-form');
    f.debt.value = invData.creditCard.debt || 0;
    f.plannedPayment.value = invData.creditCard.plannedPayment || 0;
    f.dueDay.value = invData.creditCard.dueDay ?? '';
    Modal.open('cc-modal');
  });
  document.getElementById('cc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    invData.creditCard.debt = Math.max(0, Number(fd.get('debt')) || 0);
    invData.creditCard.plannedPayment = Math.max(0, Number(fd.get('plannedPayment')) || 0);
    const due = fd.get('dueDay');
    invData.creditCard.dueDay = due ? Number(due) : null;
    Modal.close('cc-modal');
    invSaveAndRefresh('Kredi kartı güncellendi ✓');
  });

  document.getElementById('btn-invest-settings').addEventListener('click', () => {
    const f = document.getElementById('invest-settings-form');
    f.annualPct.value = invData.inflation.annualPct;
    f.goldGramTry.value = invData.rates.goldGramTry || '';
    f.usdTry.value = invData.rates.usdTry || '';
    f.eurTry.value = invData.rates.eurTry || '';
    Modal.open('invest-settings-modal');
  });
  document.getElementById('invest-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    invData.inflation.annualPct = Math.max(0, Number(fd.get('annualPct')) || 0);
    invData.inflation.mode = 'manual';
    invData.rates.goldGramTry = Math.max(0, Number(fd.get('goldGramTry')) || 0);
    invData.rates.usdTry = Math.max(0, Number(fd.get('usdTry')) || 0);
    invData.rates.eurTry = Math.max(0, Number(fd.get('eurTry')) || 0);
    Modal.close('invest-settings-modal');
    invSaveAndRefresh('Ayarlar kaydedildi ✓');
  });

  document.querySelectorAll('.nav-item[data-scroll]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
