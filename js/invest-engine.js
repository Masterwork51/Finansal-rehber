/**
 * Maksimum Güvenli Yatırım Modülü — Hesaplama Motoru
 *
 * Tamamen saf fonksiyonlar: DOM yok, localStorage yok, yan etki yok.
 * Hem tarayıcıda (window.InvestEngine) hem Node'da (module.exports) çalışır,
 * böylece tüm hesaplamalar birim testleriyle doğrulanabilir.
 *
 * Öncelik sırası (kullanıcı talebi):
 *   1. Enflasyona karşı koruma
 *   2. Uzun vadede maksimum servet birikimi
 *   3. Günlük hayatta rahat hissetmek
 *
 * ÖNEMLİ KURAL: Sadece "amaç = nakit" varlıklar bu ayın yatırım hesabına girer.
 * "amaç = yatırım" işaretli varlıklar (ör. zaten alınmış döviz/altın) ZATEN
 * yapılmış bir yatırım kabul edilir ve tekrar "yatırılabilir" havuza sayılmaz —
 * yalnızca bilgi amaçlı "mevcut portföy" olarak ayrı gösterilir.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.InvestEngine = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RISK_PARAMS = {
    conservative: { label: 'Konservatif', bufferMonths: 3, stressPct: 0.15, likelyFactor: 0.70, uncertainFactor: 0.00 },
    balanced:     { label: 'Dengeli',     bufferMonths: 2, stressPct: 0.10, likelyFactor: 0.85, uncertainFactor: 0.40 },
    aggressive:   { label: 'Agresif',     bufferMonths: 1, stressPct: 0.05, likelyFactor: 0.95, uncertainFactor: 0.60 }
  };

  const RISK_ORDER = ['aggressive', 'balanced', 'conservative'];
  const PESSIMISTIC_EXPENSE_SHOCK = 1.15;
  const FREQUENCY_MONTHS = { monthly: 1, quarterly: 3, biannual: 6, annual: 12, irregular: null };

  // ---------- Yardımcılar ----------

  function daysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function monthsBetween(from, toIso) {
    const to = new Date(toIso);
    if (isNaN(to)) return 1;
    const m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    return Math.max(1, m);
  }

  function sameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function assetTl(asset, rates) {
    const amount = Number(asset.amount) || 0;
    switch (asset.currency) {
      case 'TRY': return amount;
      case 'USD': return amount * (rates.usdTry || 0);
      case 'EUR': return amount * (rates.eurTry || 0);
      case 'XAU': return amount * (rates.goldGramTry || 0);
      default: return 0;
    }
  }

  /** Sadece "nakit" amaçlı varlıklar — bu ayın yatırım hesabına girer */
  function liquidTotals(assets, rates) {
    let quick = 0;
    let slow = 0;
    for (const a of assets) {
      if (a.purpose === 'investment') continue;
      const tl = assetTl(a, rates);
      if (a.accessibility === 'instant' || a.accessibility === 'days1to3') quick += tl;
      else slow += tl;
    }
    return { quick, slow, total: quick + slow };
  }

  /** "Yatırım" amaçlı varlıklar — zaten yapılmış yatırım, sadece bilgi amaçlı toplam */
  function investmentTotals(assets, rates) {
    let total = 0;
    const byCurrency = {};
    for (const a of assets) {
      if (a.purpose !== 'investment') continue;
      const tl = assetTl(a, rates);
      total += tl;
      const cur = a.currency;
      if (!byCurrency[cur]) byCurrency[cur] = { amount: 0, tl: 0 };
      byCurrency[cur].amount += Number(a.amount) || 0;
      byCurrency[cur].tl += tl;
    }
    return { total, byCurrency };
  }

  function expenseTotals(expenses) {
    const t = { total: 0, essential: 0, semiEssential: 0, optional: 0 };
    for (const e of expenses) {
      const amt = Number(e.amountTl) || 0;
      t.total += amt;
      if (e.necessity === 'essential') t.essential += amt;
      else if (e.necessity === 'optional') t.optional += amt;
      else t.semiEssential += amt;
    }
    return t;
  }

  /**
   * Bu ay içinde HÂLÂ çıkacak gider (kesin hesap).
   * - Vade günü (dueDay) olan kalemler: gün geçmediyse tam tutar, geçtiyse 0 (ödendi sayılır).
   * - Vade günü olmayan kalemler (market vb. yaşam giderleri): ayın kalan günü oranında.
   */
  function remainingExpensesThisMonth(expenses, date) {
    const day = date.getDate();
    const dim = daysInMonth(date);
    const remainRatio = Math.max(0, (dim - day + 1) / dim);
    let sum = 0;
    const items = [];
    for (const e of expenses) {
      const amt = Number(e.amountTl) || 0;
      let counted = 0;
      let note = '';
      if (e.dueDay != null && e.dueDay !== '') {
        if (Number(e.dueDay) >= day) { counted = amt; note = `ayın ${e.dueDay}. günü çıkacak`; }
        else { counted = 0; note = 'bu ay ödendi sayıldı'; }
      } else {
        counted = amt * remainRatio;
        note = 'ayın kalan günü oranında';
      }
      sum += counted;
      items.push({ id: e.id, name: e.name, monthly: amt, counted, note });
    }
    return { sum, items, remainRatio };
  }

  /**
   * Bu ay içinde HÂLÂ gelecek KESİN gelir.
   * Periyoda bakılmaksızın (aylık / 3 ayda bir / yılda bir / düzensiz):
   * gelir sadece GARANTİLİ ise ve "sıradaki ödeme tarihi" bu ay içinde, bugünden
   * sonra ise sayılır. Böylece 3 ayda bir yatan maaş da doğru ayda hesaba girer.
   */
  function remainingIncomeThisMonth(incomes, date) {
    let sum = 0;
    const items = [];
    for (const inc of incomes) {
      const amt = Number(inc.amountTl) || 0;
      if (!inc.nextDate) continue;
      const next = new Date(inc.nextDate);
      if (isNaN(next)) continue;
      const eligible = inc.reliability === 'guaranteed' && sameMonth(next, date) && next >= new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (eligible) {
        sum += amt;
        items.push({ id: inc.id, name: inc.name, counted: amt, note: `${next.getDate()}.${next.getMonth() + 1} tarihinde gelecek` });
      }
    }
    return { sum, items };
  }

  /** Sonraki ay(lar) için ortalama aylık gelir tahmini — periyodik gelirler aya bölünür */
  function projectedMonthlyIncome(incomes, riskLevel) {
    const p = RISK_PARAMS[riskLevel] || RISK_PARAMS.balanced;
    let sum = 0;
    for (const inc of incomes) {
      const amt = Number(inc.amountTl) || 0;
      const intervalMonths = FREQUENCY_MONTHS[inc.frequency];
      const monthlyEquivalent = intervalMonths ? amt / intervalMonths : amt;
      let factor = 1;
      if (inc.reliability === 'likely') factor = p.likelyFactor;
      else if (inc.reliability === 'uncertain') factor = p.uncertainFactor;
      if (inc.frequency === 'irregular') factor = Math.min(factor, p.uncertainFactor || 0.4);
      sum += monthlyEquivalent * factor;
    }
    return sum;
  }

  function goalReserves(goals, date) {
    let sum = 0;
    const items = [];
    for (const g of goals) {
      const target = Number(g.targetTl) || 0;
      if (target <= 0) continue;
      const monthsLeft = monthsBetween(date, g.targetDate);
      const monthly = target / monthsLeft;
      sum += monthly;
      items.push({ id: g.id, name: g.name, target, monthsLeft, monthly });
    }
    return { sum, items };
  }

  function bumpRiskConservative(riskLevel) {
    const i = RISK_ORDER.indexOf(riskLevel);
    return RISK_ORDER[Math.min(RISK_ORDER.length - 1, i + 1)] || 'conservative';
  }

  /** Bu ay ödenmesi planlanan kredi kartı tutarı (borçtan fazla olamaz) */
  function creditCardPaymentThisMonth(creditCard) {
    if (!creditCard) return 0;
    const debt = Math.max(0, Number(creditCard.debt) || 0);
    const planned = Math.max(0, Number(creditCard.plannedPayment) || 0);
    return Math.min(debt, planned);
  }

  // ---------- Ana hesap ----------

  /**
   * Bir ayın "maksimum güvenli yatırım" hesabı.
   * Formül (şeffaf):
   *   max = kullanılabilir nakit (yatırım amaçlı varlıklar HARİÇ)
   *       + bu ay kalan kesin gelir
   *       − bu ay kalan gider (şok çarpanı ile)
   *       − bu ay kredi kartı ödemesi
   *       − hedef rezervi (bu ayın payı)
   *       − acil durum yastığı (risk × zorunlu gider)
   *       − beklenmedik gider payı (risk % × aylık gider)
   */
  function computeMonth(state, opts) {
    const date = opts.date || new Date();
    const riskLevel = opts.riskLevel || state.riskLevel || 'balanced';
    const shock = opts.expenseShock || 1;
    const p = RISK_PARAMS[riskLevel];

    const liquid = liquidTotals(state.assets, state.rates);
    const investments = investmentTotals(state.assets, state.rates);
    const income = remainingIncomeThisMonth(state.incomes, date);
    const expRemain = remainingExpensesThisMonth(state.expenses, date);
    const totals = expenseTotals(state.expenses);
    const goals = goalReserves(state.goals, date);
    const cardPayment = creditCardPaymentThisMonth(state.creditCard);

    const expensesCounted = expRemain.sum * shock;
    const emergencyBuffer = p.bufferMonths * totals.essential;
    const stressReserve = p.stressPct * totals.total;

    const raw = liquid.quick + income.sum - expensesCounted - cardPayment - goals.sum - emergencyBuffer - stressReserve;
    const max = Math.max(0, Math.floor(raw));
    const maxUsd = state.rates.usdTry ? Math.floor(max / state.rates.usdTry) : null;

    let status = 'safe';
    if (max <= 0) {
      const beforeBuffers = liquid.quick + income.sum - expensesCounted - cardPayment - goals.sum;
      status = beforeBuffers > 0 ? 'tight' : 'risk';
    }

    return {
      riskLevel,
      params: p,
      date,
      liquidQuick: liquid.quick,
      liquidSlow: liquid.slow,
      liquidTotal: liquid.total,
      investmentTotal: investments.total,
      investmentByCurrency: investments.byCurrency,
      incomeCounted: income.sum,
      incomeItems: income.items,
      expensesCounted,
      expenseItems: expRemain.items,
      expenseShock: shock,
      cardPayment,
      goalReserve: goals.sum,
      goalItems: goals.items,
      emergencyBuffer,
      essentialMonthly: totals.essential,
      stressReserve,
      monthlyExpenseTotal: totals.total,
      raw,
      max,
      maxUsd,
      status
    };
  }

  function computeThisMonth(state, date) {
    return computeMonth(state, { date, riskLevel: state.riskLevel });
  }

  function computePessimistic(state, date) {
    return computeMonth(state, {
      date,
      riskLevel: bumpRiskConservative(state.riskLevel),
      expenseShock: PESSIMISTIC_EXPENSE_SHOCK
    });
  }

  /**
   * Sonraki ay tahmini + basit nakit akış projeksiyonu.
   * Varsayım: bu ay önerilen max yatırılır; tamponlar ve hedef rezervleri likitte kalır;
   * kredi kartı borcu bu ayki ödeme kadar azalır ve kalan borç için ödeme devam eder.
   */
  function computeNextMonth(state, date) {
    const now = date || new Date();
    const p = RISK_PARAMS[state.riskLevel] || RISK_PARAMS.balanced;
    const thisMonth = computeThisMonth(state, now);
    const totals = expenseTotals(state.expenses);
    const goals = goalReserves(state.goals, now);

    const closing = thisMonth.liquidTotal + thisMonth.incomeCounted - thisMonth.expensesCounted - thisMonth.cardPayment - thisMonth.max;

    const monthlyIncome = projectedMonthlyIncome(state.incomes, state.riskLevel);
    const monthlyExpense = totals.total;
    const stressReserve = p.stressPct * monthlyExpense;
    const emergencyBuffer = p.bufferMonths * totals.essential;

    const remainingDebt = Math.max(0, (Number(state.creditCard?.debt) || 0) - thisMonth.cardPayment);
    const nextCardPayment = remainingDebt > 0 ? Math.min(remainingDebt, Number(state.creditCard?.plannedPayment) || 0) : 0;

    const raw = closing + monthlyIncome - monthlyExpense - nextCardPayment - goals.sum * 2 - emergencyBuffer - stressReserve;
    const max = Math.max(0, Math.floor(raw));
    const maxUsd = state.rates.usdTry ? Math.floor(max / state.rates.usdTry) : null;

    const projection = [];
    let bal = closing;
    projection.push({ label: 'Bu ay sonu', balance: Math.round(closing) });
    for (let m = 1; m <= 2; m++) {
      bal = bal + monthlyIncome - monthlyExpense - (m === 1 ? nextCardPayment : 0);
      projection.push({ label: m === 1 ? 'Gelecek ay' : `${m} ay sonra`, balance: Math.round(bal) });
    }

    return {
      max,
      maxUsd,
      raw,
      closing,
      monthlyIncome,
      monthlyExpense,
      nextCardPayment,
      goalReserve: goals.sum,
      emergencyBuffer,
      stressReserve,
      projection,
      isEstimate: true
    };
  }

  // ---------- Enflasyon ----------

  function inflationMonthlyRate(annualPct) {
    return Math.pow(1 + (Number(annualPct) || 0) / 100, 1 / 12) - 1;
  }

  function inflationLoss(amount, annualPct, months) {
    const r = inflationMonthlyRate(annualPct);
    if (amount <= 0 || r <= 0 || months <= 0) return 0;
    return amount * (1 - 1 / Math.pow(1 + r, months));
  }

  return {
    RISK_PARAMS,
    PESSIMISTIC_EXPENSE_SHOCK,
    FREQUENCY_MONTHS,
    assetTl,
    liquidTotals,
    investmentTotals,
    expenseTotals,
    remainingExpensesThisMonth,
    remainingIncomeThisMonth,
    projectedMonthlyIncome,
    goalReserves,
    bumpRiskConservative,
    creditCardPaymentThisMonth,
    computeMonth,
    computeThisMonth,
    computePessimistic,
    computeNextMonth,
    inflationMonthlyRate,
    inflationLoss
  };
});
