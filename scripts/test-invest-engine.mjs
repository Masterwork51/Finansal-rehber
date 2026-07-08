/**
 * Maksimum Güvenli Yatırım motoru — birim testleri
 * Çalıştırma: node scripts/test-invest-engine.mjs
 */
import { createRequire } from 'module';
import assert from 'assert';

const require = createRequire(import.meta.url);
const E = require('../js/invest-engine.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error('    ' + err.message);
    process.exitCode = 1;
  }
}
const approx = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `beklenen ~${b}, gelen ${a}`);

// Sabit test tarihi: 7 Temmuz 2026 (Temmuz 31 gün → kalan oran 25/31)
const DATE = new Date(2026, 6, 7);
const RATES = { usdTry: 46.82, eurTry: 53.47, goldGramTry: 4500 };

const STATE = {
  riskLevel: 'balanced',
  inflation: { annualPct: 45, mode: 'defaultAvg' },
  rates: RATES,
  creditCard: { debt: 82000, plannedPayment: 30000, dueDay: 15 },
  assets: [
    { id: 'a1', name: 'Banka TL', kind: 'bankAccount', currency: 'TRY', amount: 200000, accessibility: 'instant', purpose: 'cash' },
    { id: 'a2', name: 'Nakit USD (yatırımım)', kind: 'cash', currency: 'USD', amount: 1000, accessibility: 'instant', purpose: 'investment' },
    { id: 'a3', name: 'Gram altın', kind: 'cash', currency: 'XAU', amount: 10, accessibility: 'month1plus', purpose: 'investment' }
  ],
  incomes: [
    { id: 'i1', name: 'Maaş', amountTl: 85000, frequency: 'monthly', reliability: 'guaranteed', nextDate: '2026-07-15' },
    { id: 'i2', name: 'Kira geliri', amountTl: 10000, frequency: 'monthly', reliability: 'likely', nextDate: '2026-07-05' },
    { id: 'i3', name: '3 ayda bir yatan prim', amountTl: 30000, frequency: 'quarterly', reliability: 'guaranteed', nextDate: '2026-09-01' },
    { id: 'i4', name: 'Freelance', amountTl: 5000, frequency: 'irregular', reliability: 'uncertain', nextDate: null }
  ],
  expenses: [
    { id: 'e1', name: 'Kira', amountTl: 22000, category: 'bill', necessity: 'essential', cancelImpact: 'high', dueDay: 10 },
    { id: 'e2', name: 'Elektrik', amountTl: 850, category: 'bill', necessity: 'essential', cancelImpact: 'high', dueDay: 5 },
    { id: 'e3', name: 'Netflix', amountTl: 200, category: 'subscription', necessity: 'optional', cancelImpact: 'low', dueDay: 20 },
    { id: 'e4', name: 'Market', amountTl: 8500, category: 'living', necessity: 'essential', cancelImpact: 'high', dueDay: null },
    { id: 'e5', name: 'Yakıt', amountTl: 3200, category: 'living', necessity: 'semiEssential', cancelImpact: 'medium', dueDay: null }
  ],
  goals: [
    { id: 'g1', name: 'Tatil', targetTl: 60000, targetDate: '2026-12-01' }
  ]
};

console.log('\nVarlık dönüşümleri:');
test('TL varlık aynen sayılır', () => approx(E.assetTl(STATE.assets[0], RATES), 200000));
test('USD varlık kurla çarpılır', () => approx(E.assetTl(STATE.assets[1], RATES), 46820));
test('Altın gram fiyatıyla çarpılır', () => approx(E.assetTl(STATE.assets[2], RATES), 45000));

console.log('\nNakit / Yatırım ayrımı (KRİTİK):');
test('liquidTotals SADECE amaç=nakit varlıkları sayar', () => {
  const t = E.liquidTotals(STATE.assets, RATES);
  approx(t.quick, 200000); // sadece Banka TL — USD ve altın hariç
  approx(t.total, 200000);
});
test('investmentTotals SADECE amaç=yatırım varlıkları sayar, ayrı raporlanır', () => {
  const t = E.investmentTotals(STATE.assets, RATES);
  approx(t.total, 46820 + 45000);
  approx(t.byCurrency.USD.amount, 1000);
  approx(t.byCurrency.XAU.amount, 10);
});

console.log('\nGider toplamları:');
test('Zorunlu / yarı / isteğe bağlı kırılımı', () => {
  const t = E.expenseTotals(STATE.expenses);
  approx(t.total, 34750);
  approx(t.essential, 31350);
  approx(t.semiEssential, 3200);
  approx(t.optional, 200);
});

console.log('\nBu ay kalan gider (kesin):');
test('Günü geçmiş fatura sayılmaz, gelmemiş sayılır, günsüzler orantılı', () => {
  const r = E.remainingExpensesThisMonth(STATE.expenses, DATE);
  const ratio = 25 / 31;
  const expected = 22000 + 0 + 200 + 8500 * ratio + 3200 * ratio;
  approx(r.sum, expected);
});

console.log('\nBu ay kalan kesin gelir (periyot bağımsız):');
test('Garantili + bu ay içinde + günü gelmemiş gelir sayılır (aylık maaş)', () => {
  const r = E.remainingIncomeThisMonth(STATE.incomes, DATE);
  approx(r.sum, 85000); // sadece maaş: kira "likely" olduğu için hariç, prim eylülde, freelance tarihsiz
});
test('3 ayda bir yatan gelir SADECE geldiği ayda sayılır', () => {
  const septDate = new Date(2026, 8, 1); // 1 Eylül
  const r = E.remainingIncomeThisMonth(STATE.incomes, septDate);
  assert.ok(r.items.some((i) => i.id === 'i3'));
});

console.log('\nHedef rezervi:');
test('Hedefe kalan aya eşit bölünür', () => {
  const g = E.goalReserves(STATE.goals, DATE);
  approx(g.items[0].monthsLeft, 5);
  approx(g.sum, 12000);
});

console.log('\nKredi kartı:');
test('Ödeme borçtan fazla olamaz', () => {
  approx(E.creditCardPaymentThisMonth({ debt: 10000, plannedPayment: 30000 }), 10000);
  approx(E.creditCardPaymentThisMonth({ debt: 82000, plannedPayment: 30000 }), 30000);
});

console.log('\nAna hesap (bu ay, dengeli risk):');
test('Formül şeffaf şekilde tutuyor ve kredi kartı düşülüyor', () => {
  const res = E.computeThisMonth(STATE, DATE);
  const ratio = 25 / 31;
  const expRemain = 22000 + 200 + 8500 * ratio + 3200 * ratio;
  const expected = Math.floor(
    200000            // sadece nakit amaçlı likit (yatırımlar hariç!)
    + 85000           // kesin gelir (sadece maaş)
    - expRemain       // kalan gider
    - 30000           // kredi kartı ödemesi
    - 12000           // hedef payı
    - 2 * 31350       // 2 ay zorunlu gider yastığı (dengeli)
    - 0.10 * 34750    // %10 beklenmedik pay (dengeli)
  );
  assert.strictEqual(res.max, expected);
  assert.strictEqual(res.status, 'safe');
  approx(res.investmentTotal, 46820 + 45000);
});

test('USD karşılığı doğru hesaplanır', () => {
  const res = E.computeThisMonth(STATE, DATE);
  assert.strictEqual(res.maxUsd, Math.floor(res.max / RATES.usdTry));
});

test('Risk seviyesi arttıkça yatırılabilir tutar azalır', () => {
  const cons = E.computeMonth(STATE, { date: DATE, riskLevel: 'conservative' }).max;
  const bal = E.computeMonth(STATE, { date: DATE, riskLevel: 'balanced' }).max;
  const agg = E.computeMonth(STATE, { date: DATE, riskLevel: 'aggressive' }).max;
  assert.ok(agg > bal && bal > cons, `agresif ${agg} > dengeli ${bal} > konservatif ${cons} olmalı`);
});

test('Kötümser senaryo gerçekçiden düşük veya eşit', () => {
  const real = E.computeThisMonth(STATE, DATE);
  const pess = E.computePessimistic(STATE, DATE);
  assert.ok(pess.max <= real.max);
  assert.strictEqual(pess.riskLevel, 'conservative');
  approx(pess.expenseShock, 1.15);
});

test('Para yetmiyorsa sonuç 0 ve durum kırmızı', () => {
  const poor = { ...STATE, assets: [{ id: 'a', name: 'Az', kind: 'cash', currency: 'TRY', amount: 1000, accessibility: 'instant', purpose: 'cash' }], incomes: [], creditCard: { debt: 0, plannedPayment: 0 } };
  const res = E.computeThisMonth(poor, DATE);
  assert.strictEqual(res.max, 0);
  assert.strictEqual(res.status, 'risk');
});

test('Tampon yüzünden 0 ise durum turuncu (tight)', () => {
  const mid = { ...STATE, assets: [{ id: 'a', name: 'Orta', kind: 'cash', currency: 'TRY', amount: 10000, accessibility: 'instant', purpose: 'cash' }], creditCard: { debt: 0, plannedPayment: 0 } };
  const res = E.computeThisMonth(mid, DATE);
  assert.strictEqual(res.max, 0);
  assert.strictEqual(res.status, 'tight');
});

console.log('\nSonraki ay tahmini:');
test('Projeksiyon 3 satır ve tahmin negatif değil', () => {
  const next = E.computeNextMonth(STATE, DATE);
  assert.strictEqual(next.projection.length, 3);
  assert.ok(next.max >= 0);
  assert.ok(next.isEstimate);
});

test('Periyodik gelirler aylığa bölünerek tahmine katılır', () => {
  // dengeli: maaş 85000 + kira 10000*0.85 + prim 30000/3 (guaranteed, tam) + freelance düzensiz*uncertainFactor(0.4)
  const expected = 85000 + 10000 * 0.85 + 30000 / 3 + 5000 * 0.4;
  approx(E.projectedMonthlyIncome(STATE.incomes, 'balanced'), expected);
});

console.log('\nEnflasyon:');
test('Yıllık %45 → aylık ~%3.14', () => {
  approx(E.inflationMonthlyRate(45), 0.031447, 0.0001);
});
test('100.000 TL, 3 ay → ~8.870 TL alım gücü kaybı', () => {
  const loss = E.inflationLoss(100000, 45, 3);
  assert.ok(loss > 8500 && loss < 9200, `beklenen ~8870, gelen ${loss}`);
});
test('Süre uzadıkça kayıp artar', () => {
  assert.ok(E.inflationLoss(100000, 45, 6) > E.inflationLoss(100000, 45, 3));
});
test('Enflasyon 0 ise kayıp 0', () => {
  assert.strictEqual(E.inflationLoss(100000, 0, 3), 0);
});

console.log('\nRisk kademe yükseltme:');
test('agresif→dengeli, dengeli→konservatif, konservatif→konservatif', () => {
  assert.strictEqual(E.bumpRiskConservative('aggressive'), 'balanced');
  assert.strictEqual(E.bumpRiskConservative('balanced'), 'conservative');
  assert.strictEqual(E.bumpRiskConservative('conservative'), 'conservative');
});

console.log(`\n${passed} test geçti${process.exitCode ? ', HATALAR VAR' : ', hepsi başarılı ✓'}\n`);
