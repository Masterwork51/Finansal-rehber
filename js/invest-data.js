/**
 * Maksimum Güvenli Yatırım Modülü — Veri katmanı
 * Ana uygulamanın verisine (finansPanelData) DOKUNMAZ; kendi anahtarını kullanır.
 */

const INVEST_STORAGE_KEY = 'safeInvestData';

/** Periyot → ay cinsinden aralık (gelirleri aylığa çevirmek için) */
const INVEST_FREQUENCY_MONTHS = { monthly: 1, quarterly: 3, biannual: 6, annual: 12, irregular: null };

const INVEST_DEFAULT = {
  schemaVersion: 2,
  onboarded: false,
  riskLevel: 'balanced',
  inflation: { annualPct: 45, mode: 'defaultAvg' },
  rates: { usdTry: 0, eurTry: 0, goldGramTry: 4500, updatedAt: null },
  assets: [],
  incomes: [],
  expenses: [],
  goals: [],
  creditCard: { debt: 0, plannedPayment: 0, dueDay: null },
  updatedAt: null
};

function investNewId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function investClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function investLoad() {
  try {
    const raw = localStorage.getItem(INVEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return investMigrate(parsed);
    }
  } catch (e) {
    console.warn('Yatırım verisi yüklenemedi:', e);
  }
  return investClone(INVEST_DEFAULT);
}

/** Varlığın türüne göre varsayılan amaç: TL nakit/hesap = harcanabilir, döviz/altın = zaten yatırım */
function investDefaultAssetPurpose(currency) {
  return currency === 'TRY' ? 'cash' : 'investment';
}

/** Eski gelir kaydını (recurrence/expectedDay) yeni periyot modeline taşır */
function investMigrateIncome(inc) {
  if (inc.frequency) return inc; // zaten yeni model
  const freq = inc.recurrence === 'regular' ? 'monthly' : 'irregular';
  let nextDate = null;
  if (inc.expectedDay) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    nextDate = new Date(y, m, Number(inc.expectedDay)).toISOString().slice(0, 10);
  }
  return {
    id: inc.id,
    name: inc.name,
    amountTl: inc.amountTl,
    frequency: freq,
    nextDate,
    reliability: inc.reliability || 'guaranteed'
  };
}

/** Eksik alanları varsayılanlarla tamamlar — mevcut kullanıcı verisini asla silmez */
function investMigrate(data) {
  const d = investClone(INVEST_DEFAULT);
  const out = Object.assign(d, data);
  out.inflation = Object.assign(investClone(INVEST_DEFAULT.inflation), data.inflation || {});
  out.rates = Object.assign(investClone(INVEST_DEFAULT.rates), data.rates || {});
  out.creditCard = Object.assign(investClone(INVEST_DEFAULT.creditCard), data.creditCard || {});
  out.assets = (Array.isArray(data.assets) ? data.assets : []).map((a) => ({
    ...a,
    purpose: a.purpose || investDefaultAssetPurpose(a.currency)
  }));
  out.incomes = (Array.isArray(data.incomes) ? data.incomes : []).map(investMigrateIncome);
  out.expenses = Array.isArray(data.expenses) ? data.expenses : [];
  out.goals = Array.isArray(data.goals) ? data.goals : [];
  out.schemaVersion = 2;
  return out;
}

function investSave(data) {
  data.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(INVEST_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Yatırım verisi kaydedilemedi:', e);
    Toast.show('Kayıt hatası! Depolama dolu olabilir.');
  }
}

/** TCMB kur dosyasını yükle (ana uygulamayla aynı kaynak, dış API yok) */
async function investLoadRates(data) {
  try {
    const base = new URL('.', window.location.href).href;
    const res = await fetch(new URL('data/tcmb-rates.json', base).href, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      if (json.usd) data.rates.usdTry = json.usd;
      if (json.eur) data.rates.eurTry = json.eur;
      data.rates.updatedAt = json.updated || null;
      return;
    }
  } catch (e) { /* çevrimdışı: kayıtlı kur kullanılır */ }
  if (!data.rates.usdTry) {
    try {
      const cached = localStorage.getItem('finansTcmbRates');
      if (cached) {
        const json = JSON.parse(cached);
        if (json.usd) data.rates.usdTry = json.usd;
        if (json.eur) data.rates.eurTry = json.eur;
        data.rates.updatedAt = json.updated || null;
      }
    } catch (e) { /* yoksay */ }
  }
}

// ---- Format yardımcıları ----

function investFmtTL(amount) {
  const n = Math.round(Number(amount) || 0);
  return '₺' + n.toLocaleString('tr-TR');
}

function investFmtSigned(amount) {
  const n = Math.round(Number(amount) || 0);
  return (n < 0 ? '−₺' : '₺') + Math.abs(n).toLocaleString('tr-TR');
}

function investFmtUsd(amount) {
  const n = Math.round(Number(amount) || 0);
  return '$' + n.toLocaleString('tr-TR');
}

// ---- Etiket sözlükleri (UI'da tek kaynak) ----

const INVEST_LABELS = {
  currency: { TRY: 'TL', USD: 'USD', EUR: 'EUR', XAU: 'Gram Altın' },
  accessibility: {
    instant: 'Anında',
    days1to3: '1-3 gün',
    week1: '~1 hafta',
    month1plus: '1 ay+'
  },
  assetKind: { cash: 'Nakit', bankAccount: 'Banka Hesabı' },
  purpose: { cash: 'Kullanılabilir Nakit', investment: 'Mevcut Yatırım' },
  frequency: { monthly: 'Her ay', quarterly: '3 ayda bir', biannual: '6 ayda bir', annual: 'Yılda bir', irregular: 'Düzensiz' },
  reliability: { guaranteed: 'Garantili', likely: 'Olası', uncertain: 'Belirsiz' },
  category: { bill: 'Fatura', subscription: 'Abonelik', living: 'Yaşam', debt: 'Borç', other: 'Diğer' },
  necessity: { essential: 'Zorunlu', semiEssential: 'Yarı-zorunlu', optional: 'İsteğe bağlı' },
  cancelImpact: { low: 'Az etkiler', medium: 'Orta etkiler', high: 'Çok etkiler' },
  risk: { conservative: 'Konservatif', balanced: 'Dengeli', aggressive: 'Agresif' }
};
