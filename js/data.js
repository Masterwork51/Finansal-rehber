/**
 * Finans Paneli — Veri modeli ve birikim motoru
 * Ana amaç: Bu ay max kaç dolar biriktirebilirsin?
 */

const DEFAULT_DATA = {
  meta: {
    version: 4,
    lastUpdated: null
  },
  rates: {
    usd: 34.50,
    eur: 37.20,
    updated: null,
    source: 'TCMB'
  },
  assets: {
    tlCash: 70000,
    usdCash: 1000,
    eurCash: 450,
    visaUsd: 4350
  },
  creditCard: {
    debt: 82000,
    dueDay: 15,
    plannedPayment: 82000
  },
  expenses: {
    fixed: [
      { name: 'Kira', amount: 22000 },
      { name: 'Aidat', amount: 1200 },
      { name: 'Elektrik', amount: 850 },
      { name: 'Doğalgaz', amount: 600 },
      { name: 'Telefonlar', amount: 450 },
      { name: 'İnternetler', amount: 380 }
    ],
    variable: [
      { name: 'Market', amount: 8500 },
      { name: 'Yakıt', amount: 3200 },
      { name: 'Dışarıda yemek', amount: 2800 },
      { name: 'Diğer', amount: 2000 }
    ]
  },
  income: {
    monthlySalary: 85000
  },
  savings: {
    tlBuffer: 10000
  },
  goals: {
    visaTargetUsd: 5000
  },
  checklist: {
    reviewExpenses: false,
    payCreditCard: false,
    buyMaxUsd: false,
    updateVisaAccount: false
  },
  history: {
    usd: [
      { month: 'Ocak', value: 3200 },
      { month: 'Şubat', value: 3500 },
      { month: 'Mart', value: 3800 },
      { month: 'Nisan', value: 4000 },
      { month: 'Mayıs', value: 4200 },
      { month: 'Haziran', value: 4350 }
    ]
  }
};

const STORAGE_KEY = 'finansPanelData';
const APP_VERSION = '4.0';

function cloneData(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = deepMerge(cloneData(DEFAULT_DATA), parsed);
      return migrateData(merged);
    }
  } catch (e) {
    console.warn('Veri yüklenemedi:', e);
  }
  return migrateData(cloneData(DEFAULT_DATA));
}

function migrateData(data) {
  const d = DEFAULT_DATA;

  if (!data.income) data.income = { ...d.income };
  if (!data.savings) data.savings = { ...d.savings };
  if (!data.expenses) data.expenses = cloneData(d.expenses);
  if (!data.checklist) data.checklist = { ...d.checklist };
  if (!data.goals) data.goals = { ...d.goals };
  if (!data.creditCard) data.creditCard = { ...d.creditCard };

  if (data.creditCard.plannedPayment == null) {
    data.creditCard.plannedPayment = data.creditCard.debt;
  }

  data.expenses.fixed = normalizeExpenseList(data.expenses.fixed, d.expenses.fixed);
  data.expenses.variable = normalizeExpenseList(data.expenses.variable, d.expenses.variable);

  if (data.goals.buyableUsdThisMonth != null) {
    delete data.goals.buyableUsdThisMonth;
  }
  if (data.goals.emergencyFundCurrentPct != null) {
    delete data.goals.emergencyFundCurrentPct;
  }
  if (data.travel) delete data.travel;

  resetChecklistIfNewMonth(data);
  return data;
}

function normalizeExpenseList(saved, fallback) {
  if (!Array.isArray(saved) || saved.length === 0) return cloneData(fallback);
  return saved.map((item) => ({
    name: String(item.name || 'Gider'),
    amount: Math.max(0, Number(item.amount) || 0)
  }));
}

function resetChecklistIfNewMonth(data) {
  const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  if (data.meta.checklistMonth !== monthKey) {
    data.checklist = {
      reviewExpenses: false,
      payCreditCard: false,
      buyMaxUsd: false,
      updateVisaAccount: false
    };
    data.meta.checklistMonth = monthKey;
    saveData(data);
  }
}

function saveData(data) {
  data.meta.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  return cloneData(DEFAULT_DATA);
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function formatTL(amount) {
  return '₺' + Math.round(amount).toLocaleString('tr-TR');
}

function formatUSD(amount) {
  return '$' + Math.round(amount).toLocaleString('tr-TR');
}

function formatNumber(amount) {
  return Math.round(amount).toLocaleString('tr-TR');
}

function getFixedTotal(data) {
  return data.expenses.fixed.reduce((s, e) => s + e.amount, 0);
}

function getVariableTotal(data) {
  return data.expenses.variable.reduce((s, e) => s + e.amount, 0);
}

function getMonthlyExpensesTotal(data) {
  return getFixedTotal(data) + getVariableTotal(data);
}

/**
 * Aylık nakit akışı — birikim motorunun kalbi
 */
function calcMonthlyCashFlow(data) {
  const salary = data.income?.monthlySalary || 0;
  const fixed = getFixedTotal(data);
  const variable = getVariableTotal(data);
  const ccPay = data.creditCard.plannedPayment ?? data.creditCard.debt;
  const buffer = data.savings?.tlBuffer ?? 10000;

  const afterExpenses = salary - fixed - variable;
  const afterCard = afterExpenses - ccPay;
  const savableTl = afterCard - buffer;

  return { salary, fixed, variable, ccPay, buffer, afterExpenses, afterCard, savableTl };
}

function calcMaxSavableUsd(data) {
  const { savableTl } = calcMonthlyCashFlow(data);
  if (savableTl <= 0 || !data.rates.usd) return 0;
  return Math.floor(savableTl / data.rates.usd);
}

function calcVisaRoom(data) {
  return Math.max(0, data.goals.visaTargetUsd - data.assets.visaUsd);
}

function calcRecommendedUsd(data) {
  const max = calcMaxSavableUsd(data);
  const room = calcVisaRoom(data);
  if (room === 0) return max;
  return Math.min(max, room);
}

function calcUsdFromTl(tl, data) {
  if (!data.rates.usd || tl <= 0) return 0;
  return Math.floor(tl / data.rates.usd);
}

function calcVisaProgress(data) {
  return Math.min(100, (data.assets.visaUsd / data.goals.visaTargetUsd) * 100);
}

function getDaysUntilDue(dueDay) {
  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (due < now) due = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  return Math.max(0, Math.ceil((due - now) / (1000 * 60 * 60 * 24)));
}

function getCurrentMonthLabel() {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return months[new Date().getMonth()] + ' ' + new Date().getFullYear();
}

function getRiskStatus(data) {
  const daysLeft = getDaysUntilDue(data.creditCard.dueDay);
  const maxUsd = calcRecommendedUsd(data);
  const { savableTl } = calcMonthlyCashFlow(data);

  if (daysLeft <= 3 && data.creditCard.debt > 50000) {
    return { level: 'danger', label: 'Kritik' };
  }
  if (savableTl < 0 || maxUsd < 100) {
    return { level: 'warning', label: 'Sıkı' };
  }
  if (daysLeft <= 7 && data.creditCard.debt > 70000) {
    return { level: 'warning', label: 'Dikkat' };
  }
  return { level: 'safe', label: 'Uygun' };
}

function getExpenseCutTips(data) {
  const tips = [];
  const variable = data.expenses.variable;

  variable.forEach((exp) => {
    if (exp.amount < 500) return;
    const cut10 = Math.round(exp.amount * 0.1);
    const usdGain = calcUsdFromTl(cut10, data);
    if (usdGain >= 5) {
      tips.push({
        name: exp.name,
        cutTl: cut10,
        usdGain,
        text: `${exp.name}'i ${formatTL(cut10)} azaltırsan +${usdGain} USD`
      });
    }
  });

  return tips.sort((a, b) => b.usdGain - a.usdGain).slice(0, 3);
}

function getMonthlyChecklistProgress(data) {
  const items = Object.values(data.checklist);
  const done = items.filter(Boolean).length;
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
}

function monthsToVisaGoal(data) {
  const room = calcVisaRoom(data);
  const monthly = calcRecommendedUsd(data);
  if (room <= 0) return 0;
  if (monthly <= 0) return null;
  return Math.ceil(room / monthly);
}
