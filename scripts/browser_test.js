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
  }));
  console.log('DEFINED:', defined);
  if (errors.length) console.log('ERRORS:', errors);

  if (defined.loadDemoData !== 'function') {
    await browser.close();
    process.exit(1);
  }

  page.on('dialog', async (d) => { await d.accept(); });
  await page.click('text=Örnek Test Verisi Yükle');
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
  await browser.close();

  const ok = result.datepill.includes('23.06.2026') &&
    result.tarim && result.tarim.includes('210') &&
    result.ticari && result.ticari.includes('178');
  process.exit(ok ? 0 : 1);
})();
