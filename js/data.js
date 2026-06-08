/**
 * Finans Paneli — Varsayılan veri modeli
 * localStorage'da 'finansPanelData' anahtarıyla saklanır
 */

const DEFAULT_DATA = {
  meta: {
    version: 2,
    lastUpdated: null
  },
  rates: {
    usd: 34.50,
    eur: 37.20
  },
  assets: {
    tlCash: 70000,
    usdCash: 1000,
    eurCash: 450,
    visaUsd: 4350
  },
  creditCard: {
    debt: 82000,
    dueDay: 15
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
  goals: {
    visaTargetUsd: 5000,
    buyableUsdThisMonth: 452,
    emergencyFundMonths: 6,
    emergencyFundCurrentPct: 48
  },
  history: {
    usd: [
      { month: 'Ocak', value: 3200 },
      { month: 'Şubat', value: 3500 },
      { month: 'Mart', value: 3800 },
      { month: 'Nisan', value: 4000 },
      { month: 'Mayıs', value: 4200 },
      { month: 'Haziran', value: 4350 }
    ],
    netWorth: [
      { month: 'Ocak', value: 285000 },
      { month: 'Şubat', value: 298000 },
      { month: 'Mart', value: 310000 },
      { month: 'Nisan', value: 322000 },
      { month: 'Mayıs', value: 331000 },
      { month: 'Haziran', value: 339000 }
    ]
  },
  v3Roadmap: [
    { title: 'TCMB kurunu otomatik çekme', status: 'planned' },
    { title: 'VakıfBank hesap entegrasyonu', status: 'planned', note: 'Manuel veri girişiyle' },
    { title: 'Kripto portföyü', status: 'planned' },
    { title: 'Hisse senedi takibi', status: 'planned' },
    { title: 'Emeklilik hesabı', status: 'planned' },
    { title: 'İngiltere seyahat bütçesi', status: 'planned' },
    { title: 'Fethiye tatil bütçesi', status: 'planned' },
    { title: 'Eşinle ortak bütçe ekranı', status: 'planned' }
  ]
};

const STORAGE_KEY = 'finansPanelData';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return deepMerge(structuredClone(DEFAULT_DATA), parsed);
    }
  } catch (e) {
    console.warn('Veri yüklenemedi, varsayılan kullanılıyor:', e);
  }
  return structuredClone(DEFAULT_DATA);
}

function saveData(data) {
  data.meta.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_DATA);
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
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
  return '$' + amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

function formatNumber(amount) {
  return amount.toLocaleString('tr-TR');
}

function calcTotalAssetsTL(data) {
  const { assets, rates } = data;
  return (
    assets.tlCash +
    assets.usdCash * rates.usd +
    assets.eurCash * rates.eur +
    assets.visaUsd * rates.usd
  );
}

function calcNetWorth(data) {
  return calcTotalAssetsTL(data) - data.creditCard.debt;
}

function calcVisaProgress(data) {
  return Math.min(100, (data.assets.visaUsd / data.goals.visaTargetUsd) * 100);
}

function calcVisaScore(data) {
  const progress = data.assets.visaUsd / data.goals.visaTargetUsd;
  const ccRatio = data.creditCard.debt / calcTotalAssetsTL(data);
  const emergency = data.goals.emergencyFundCurrentPct / 100;

  let score = progress * 50;
  score += Math.max(0, (1 - ccRatio) * 25);
  score += emergency * 15;
  score += data.history.usd.length >= 6 ? 10 : 5;

  return Math.min(100, Math.round(score));
}

function getDaysUntilDue(dueDay) {
  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (due < now) {
    due = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  }
  const diff = due - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getCurrentMonthLabel() {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const now = new Date();
  return months[now.getMonth()] + ' ' + now.getFullYear();
}

function getRiskStatus(data) {
  const daysLeft = getDaysUntilDue(data.creditCard.dueDay);
  const ccDebt = data.creditCard.debt;
  const buyable = data.goals.buyableUsdThisMonth;

  if (daysLeft <= 3 && ccDebt > 50000) {
    return { level: 'danger', label: 'Kritik' };
  }
  if (daysLeft <= 7 && ccDebt > 70000) {
    return { level: 'warning', label: 'Dikkat' };
  }
  if (buyable < 200) {
    return { level: 'warning', label: 'Dikkat' };
  }
  return { level: 'safe', label: 'Güvenli' };
}

function getFixedTotal(data) {
  return data.expenses.fixed.reduce((s, e) => s + e.amount, 0);
}

function getVariableTotal(data) {
  return data.expenses.variable.reduce((s, e) => s + e.amount, 0);
}

function getEmergencyTargetTL(data) {
  const monthly = getFixedTotal(data) + getVariableTotal(data);
  return monthly * data.goals.emergencyFundMonths;
}
