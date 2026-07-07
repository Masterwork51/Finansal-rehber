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

  /**
   * Risk seviyesi parametreleri — tüm tamponların tek şeffaf kaynağı.
   * bufferMonths : kenarda tutulacak zorunlu gider (ay cinsinden)
   * stressPct    : beklenmedik gider payı (aylık toplam giderin yüzdesi)
   * likelyFactor / uncertainFactor : sonraki ay tahmininde gelir güvenilirlik katsayıları
   */
  const RISK_PARAMS = {
    conservative: { label: 'Konservatif', bufferMonths: 3, stressPct: 0.15, likelyFactor: 0.70, uncertainFactor: 0.00 },
    balanced:     { label: 'Dengeli',     bufferMonths: 2, stressPct: 0.10, likelyFactor: 0.85, uncertainFactor: 0.40 },
    aggressive:   { label: 'Agresif',     bufferMonths: 1, stressPct: 0.05, likelyFactor: 0.95, uncertainFactor: 0.60 }
  };

  const RISK_ORDER = ['aggressive', 'balanced', 'conservative'];

  /** Kötümser senaryoda giderlere uygulanan şok çarpanı */
  const PESSIMISTIC_EXPENSE_SHOCK = 1.15;

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

  /** Bir varlığın TL karşılığı */
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

  /** Varlıkları erişim hızına göre topla (TL) */
  function liquidTotals(assets, rates) {
    let quick = 0;
    let slow = 0;
    for (const a of assets) {
      const tl = assetTl(a, rates);
      if (a.accessibility === 'instant' || a.accessibility === 'days1to3') quick += tl;
      else slow += tl;
    }
    return { quick, slow, total: quick + slow };
  }

  /** Aylık gider toplamları (tam ay, kategori/zorunluluk kırılımı) */
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
   * Kesin hesap için sadece: düzenli + garantili + beklenen günü henüz geçmemiş gelirler.
   * (Geçmiş gelirler zaten hesap bakiyene girdi; tekrar sayarsak çift sayarız.)
   */
  function remainingIncomeThisMonth(incomes, date) {
    const day = date.getDate();
    let sum = 0;
    const items = [];
    for (const inc of incomes) {
      const amt = Number(inc.amountTl) || 0;
      const eligible =
        inc.recurrence === 'regular' &&
        inc.reliability === 'guaranteed' &&
        inc.expectedDay != null && inc.expectedDay !== '' &&
        Number(inc.expectedDay) >= day;
      if (eligible) {
        sum += amt;
        items.push({ id: inc.id, name: inc.name, counted: amt, note: `ayın ${inc.expectedDay}. günü gelecek` });
      }
    }
    return { sum, items };
  }

  /** Sonraki ay için güvenilirlik katsayılı gelir tahmini */
  function projectedMonthlyIncome(incomes, riskLevel) {
    const p = RISK_PARAMS[riskLevel] || RISK_PARAMS.balanced;
    let sum = 0;
    for (const inc of incomes) {
      if (inc.recurrence !== 'regular') continue;
      const amt = Number(inc.amountTl) || 0;
      if (inc.reliability === 'guaranteed') sum += amt;
      else if (inc.reliability === 'likely') sum += amt * p.likelyFactor;
      else sum += amt * p.uncertainFactor;
    }
    return sum;
  }

  /** Hedefler için bu ay ayrılması gereken toplam rezerv */
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

  /** Riski bir kademe konservatifleştir (kötümser senaryo için) */
  function bumpRiskConservative(riskLevel) {
    const i = RISK_ORDER.indexOf(riskLevel);
    return RISK_ORDER[Math.min(RISK_ORDER.length - 1, i + 1)] || 'conservative';
  }

  // ---------- Ana hesap ----------

  /**
   * Bir ayın "maksimum güvenli yatırım" hesabı.
   * opts: { riskLevel, expenseShock (çarpan), date }
   * Formül (şeffaf):
   *   max = hemen erişilebilir likit
   *       + bu ay kalan kesin gelir
   *       − bu ay kalan gider (şok çarpanı ile)
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
    const income = remainingIncomeThisMonth(state.incomes, date);
    const expRemain = remainingExpensesThisMonth(state.expenses, date);
    const totals = expenseTotals(state.expenses);
    const goals = goalReserves(state.goals, date);

    const expensesCounted = expRemain.sum * shock;
    const emergencyBuffer = p.bufferMonths * totals.essential;
    const stressReserve = p.stressPct * totals.total;

    const raw = liquid.quick + income.sum - expensesCounted - goals.sum - emergencyBuffer - stressReserve;
    const max = Math.max(0, Math.floor(raw));

    // Durum: yeşil = yatırım yapılabilir, turuncu = tampon yüzünden 0, kırmızı = giderler bile karşılanamıyor
    let status = 'safe';
    if (max <= 0) {
      const beforeBuffers = liquid.quick + income.sum - expensesCounted - goals.sum;
      status = beforeBuffers > 0 ? 'tight' : 'risk';
    }

    return {
      riskLevel,
      params: p,
      date,
      liquidQuick: liquid.quick,
      liquidSlow: liquid.slow,
      liquidTotal: liquid.total,
      incomeCounted: income.sum,
      incomeItems: income.items,
      expensesCounted,
      expenseItems: expRemain.items,
      expenseShock: shock,
      goalReserve: goals.sum,
      goalItems: goals.items,
      emergencyBuffer,
      essentialMonthly: totals.essential,
      stressReserve,
      monthlyExpenseTotal: totals.total,
      raw,
      max,
      status
    };
  }

  /** Bu ay — kesin, gerçekçi hesap */
  function computeThisMonth(state, date) {
    return computeMonth(state, { date, riskLevel: state.riskLevel });
  }

  /** Bu ay — kötümser senaryo: giderlere +%15 şok, risk bir kademe konservatif */
  function computePessimistic(state, date) {
    return computeMonth(state, {
      date,
      riskLevel: bumpRiskConservative(state.riskLevel),
      expenseShock: PESSIMISTIC_EXPENSE_SHOCK
    });
  }

  /**
   * Sonraki ay tahmini + basit nakit akış projeksiyonu.
   * Varsayım: bu ay önerilen max yatırılır; tamponlar ve hedef rezervleri likitte kalır.
   */
  function computeNextMonth(state, date) {
    const now = date || new Date();
    const p = RISK_PARAMS[state.riskLevel] || RISK_PARAMS.balanced;
    const thisMonth = computeThisMonth(state, now);
    const totals = expenseTotals(state.expenses);
    const goals = goalReserves(state.goals, now);

    // Bu ay sonunda kalan likit (yatırım yapıldıktan sonra)
    const closing = thisMonth.liquidTotal + thisMonth.incomeCounted - thisMonth.expensesCounted - thisMonth.max;

    const monthlyIncome = projectedMonthlyIncome(state.incomes, state.riskLevel);
    const monthlyExpense = totals.total;
    const stressReserve = p.stressPct * monthlyExpense;
    const emergencyBuffer = p.bufferMonths * totals.essential;

    // Sonraki ay: hedef rezervi birikir (2 aylık pay kenarda tutulur)
    const raw = closing + monthlyIncome - monthlyExpense - goals.sum * 2 - emergencyBuffer - stressReserve;
    const max = Math.max(0, Math.floor(raw));

    // 3 aylık basit nakit akış projeksiyonu (yatırım yapılmadığı varsayımıyla likit seyri)
    const projection = [];
    let bal = closing;
    projection.push({ label: 'Bu ay sonu', balance: Math.round(closing) });
    for (let m = 1; m <= 2; m++) {
      bal = bal + monthlyIncome - monthlyExpense;
      projection.push({ label: m === 1 ? 'Gelecek ay' : `${m} ay sonra`, balance: Math.round(bal) });
    }

    return {
      max,
      raw,
      closing,
      monthlyIncome,
      monthlyExpense,
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

  /**
   * "Bu parayı X ay TL olarak tutarsan yaklaşık kaybedeceğin alım gücü."
   * kayıp = tutar × (1 − 1 / (1 + aylıkOran)^ay)
   */
  function inflationLoss(amount, annualPct, months) {
    const r = inflationMonthlyRate(annualPct);
    if (amount <= 0 || r <= 0 || months <= 0) return 0;
    return amount * (1 - 1 / Math.pow(1 + r, months));
  }

  return {
    RISK_PARAMS,
    PESSIMISTIC_EXPENSE_SHOCK,
    assetTl,
    liquidTotals,
    expenseTotals,
    remainingExpensesThisMonth,
    remainingIncomeThisMonth,
    projectedMonthlyIncome,
    goalReserves,
    bumpRiskConservative,
    computeMonth,
    computeThisMonth,
    computePessimistic,
    computeNextMonth,
    inflationMonthlyRate,
    inflationLoss
  };
});
