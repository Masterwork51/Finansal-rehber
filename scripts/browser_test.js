const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('file://' + path.resolve('/workspace/aksama-panosu.html'));
  await page.waitForTimeout(500);

  const defined = await page.evaluate(() => ({
    loadDemoData: typeof loadDemoData,
    buildDashboard: typeof buildDashboard,
    renderActionSummary: typeof renderActionSummary,
    getSegmentPayment: typeof getSegmentPayment,
    scriptHealth: getComputedStyle(document.getElementById('scriptHealth')).display,
  }));
  console.log('DEFINED:', defined);
  if (errors.length) console.log('ERRORS:', errors);

  if (defined.loadDemoData !== 'function') {
    await browser.close();
    process.exit(1);
  }

  page.on('dialog', async (d) => { await d.accept(); });
  await page.click('text=Panoyu Oluştur');
  const emptyState = await page.evaluate(() => ({
    feedback: document.getElementById('inputFeedback')?.innerText || '',
    dash: getComputedStyle(document.getElementById('dash')).display,
  }));
  console.log('EMPTY_STATE:', emptyState);

  await page.click('text=Örnek Test Verisi Yükle');
  const demoState = await page.evaluate(() => ({
    feedback: document.getElementById('inputFeedback')?.innerText || '',
    todayLength: document.getElementById('todayInput')?.value.length || 0,
  }));
  console.log('DEMO_STATE:', demoState);
  await page.click('text=Panoyu Oluştur');
  await page.waitForSelector('#dash[style*="block"], #dash:not([style*="none"])', { timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const datepill = document.getElementById('datepill')?.innerText || '';
    const grid = document.getElementById('segmentRiskGrid')?.innerText || '';
    const tarim = (grid.match(/Tarım[\s\S]*?TAHSİLAT \(BUGÜN\)[\s\S]*?([\d.,]+)\s*₺/) || [])[1];
    const ticari = (grid.match(/Ticari[\s\S]*?TAHSİLAT \(BUGÜN\)[\s\S]*?([\d.,]+)\s*₺/) || [])[1];
    return { datepill, tarim, ticari, action: document.getElementById('actionSummaryPanel')?.style.display };
  });

  console.log('RESULT:', result);

  const offlinePage = await browser.newPage();
  const offlineErrors = [];
  offlinePage.on('pageerror', (e) => offlineErrors.push(e.message));
  await offlinePage.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('cdn.jsdelivr.net') || url.includes('cdnjs.cloudflare.com')) {
      route.abort();
      return;
    }
    route.continue();
  });
  await offlinePage.goto('file://' + path.resolve('/workspace/aksama-panosu.html'));
  await offlinePage.click('text=Örnek Test Verisi Yükle');
  await offlinePage.click('text=Panoyu Oluştur');
  await offlinePage.waitForSelector('#dash[style*="block"], #dash:not([style*="none"])', { timeout: 5000 }).catch(() => null);
  const offlineState = await offlinePage.evaluate(() => ({
    dash: getComputedStyle(document.getElementById('dash')).display,
    chartNotice: getComputedStyle(document.getElementById('chartUnavailableNote')).display,
    segment: document.getElementById('segmentRiskGrid')?.innerText || '',
  }));
  console.log('OFFLINE_STATE:', offlineState);

  await browser.close();

  const ok = emptyState.feedback.includes('Bugünün verisi yok') &&
    defined.scriptHealth === 'none' &&
    emptyState.dash === 'none' &&
    demoState.feedback.includes('Örnek veriler yüklendi') &&
    demoState.todayLength > 100 &&
    result.datepill.includes('23.06.2026') &&
    result.tarim && result.tarim.includes('210') &&
    result.ticari && result.ticari.includes('178') &&
    offlineErrors.length === 0 &&
    offlineState.dash !== 'none' &&
    offlineState.chartNotice !== 'none' &&
    offlineState.segment.includes('Tarım');
  process.exit(ok ? 0 : 1);
})();
