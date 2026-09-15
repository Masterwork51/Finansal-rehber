#!/usr/bin/env python3
"""Patch aksama-panosu.html from clean PDF base."""
import json
import re
import subprocess
from pathlib import Path

import jsbeautifier

BASE = Path('/tmp/aksama-base.html')
OUT = Path('/workspace/aksama-panosu.html')

html = BASE.read_text()
m = re.search(r'(<script>)([\s\S]*?)(</script>)', html)
prefix, js, suffix = m.group(1), m.group(2), m.group(3)


def fix_mega_line_comment_bug(source: str) -> str:
    """PDF extraction leaves ~48k chars on one line; a // comment hides the whole tail."""
    marker = '} // Bugünden ÖNCEKI günleri'
    if marker not in source:
        return source
    line_start = source.rfind('\n', 0, source.find(marker)) + 1
    line_end = source.find('\n', line_start)
    if line_end < 0:
        line_end = len(source)
    mega = source[line_start:line_end]
    mega = mega.replace(
        '} // Bugünden ÖNCEKI günleri, en yeni en başta olacak şekilde döndürür (trend için) ',
        '}\n/* trend: önceki iş günleri */\n',
        1,
    )
    # "// açıklama    kod" -> açıklama satırı + kod satırı
    mega = re.sub(r'//([^\n]*?)\s{2,}', r'//\1\n', mega)
    mega = re.sub(r'([.;])\s+//', r'\1\n//', mega)
    mega = re.sub(r'(\*/)\s+//', r'\1\n//', mega)
    mega = mega.replace(
        'çalışır. if (typeof Chart !==',
        'çalışır.\nif (typeof Chart !==',
    )
    mega = mega.replace(
        'yazdırıyoruz.   if (document.fonts',
        'yazdırıyoruz.\nif (document.fonts',
    )
    mega = re.sub(r' (?=function )', '\n', mega)
    mega = re.sub(r' /\*', '\n/*', mega)
    opts = jsbeautifier.default_options()
    opts.indent_size = 2
    return source[:line_start] + mega + source[line_end:]


js = fix_mega_line_comment_bug(js)

helpers = """
function matchesSegment(normLabel, key) {
  if (key === 'BIREYSEL') return normLabel.includes('BIREYSEL') && !normLabel.includes('TARIM');
  if (key === 'TARIM') return normLabel.includes('TARIM');
  if (key === 'TICARI') {
    return normLabel.includes('TICARI') || normLabel.includes('KOBI') ||
      normLabel.includes('PERA') || normLabel.includes('ISLETME');
  }
  return false;
}
function getSegmentPayment(rows, key) {
  const r31 = rows.filter(r => r.section === '31-91');
  const totalRow = r31.find(r => matchesSegment(r.normLabel, key) && r.normLabel.includes('TOPLAM ODEME'));
  if (totalRow && (totalRow.tutar > 0 || totalRow.adet > 0)) {
    return { tutar: totalRow.tutar, adet: totalRow.adet || 0 };
  }
  let tutar = 0, adet = 0;
  r31.forEach(r => {
    if (!matchesSegment(r.normLabel, key)) return;
    if (!r.normLabel.includes('ODENEN') && !r.normLabel.includes('ODEME YAPAN')) return;
    if (r.normLabel.includes('TOPLAM')) return;
    tutar += r.tutar;
    adet += r.adet || 0;
  });
  return { tutar, adet };
}
function calcNetRollMovement() {
  if (!yestRows.length) return null;
  const gT = todayRows.filter(r => r.section === 'GENEL');
  const gY = yestRows.filter(r => r.section === 'GENEL');
  const t31 = findRow(gT, ['31-91', 'TOPLAM AKSAMA']);
  const y31 = findRow(gY, ['31-91', 'TOPLAM AKSAMA']);
  const t15 = findRow(gT, ['15-91', 'TOPLAM AKSAMA']);
  const y15 = findRow(gY, ['15-91', 'TOPLAM AKSAMA']);
  if (!t31 || !y31 || !t15 || !y15) return null;
  const earlyT = t15.tutar - t31.tutar;
  const earlyY = y15.tutar - y31.tutar;
  return { delta31: t31.tutar - y31.tutar, deltaEarly: earlyT - earlyY };
}
"""

input_feedback_fn = r"""
function setInputFeedback(message, type) {
  const box = document.getElementById('inputFeedback');
  if (!box) {
    alert(String(message).replace(/<[^>]*>/g, ''));
    return;
  }
  const color = type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--amber)';
  box.style.display = 'block';
  box.style.borderLeftColor = color;
  box.innerHTML = message;
}

function clearInputFeedback() {
  const box = document.getElementById('inputFeedback');
  if (box) {
    box.style.display = 'none';
    box.innerHTML = '';
  }
}

function markScriptReady() {
  const health = document.getElementById('scriptHealth');
  if (health) health.style.display = 'none';
}

function attachInputFeedbackHandlers() {
  ['todayInput', 'yestInput'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', clearInputFeedback);
    }
  });
}

"""

action_fn = r"""
function renderActionSummary() {
  const panel = document.getElementById('actionSummaryPanel');
  const list = document.getElementById('actionSummaryList');
  const rollBox = document.getElementById('actionRollBox');
  if (!panel || !list || !rollBox) return;
  const insights = generateInsights();
  const roll = calcNetRollMovement();
  const stripHtml = function(s) { return String(s).replace(/<[^>]*>/g, ''); };
  if (roll) {
    const bad = roll.delta31 > 0;
    const cls = bad ? 't-bad' : roll.delta31 < 0 ? 't-good' : 't-flat';
    const arrow = roll.delta31 > 0 ? '\u25b2' : roll.delta31 < 0 ? '\u25bc' : '\u2248';
    const word = roll.delta31 > 0 ? 'k\u00f6t\u00fcle\u015fti' : roll.delta31 < 0 ? 'iyile\u015fti' : 'sabit';
    rollBox.innerHTML = '<div class="note" style="margin:0;"><b>31-91 net hareket (yakla\u015f\u0131k):</b> Son i\u015f g\u00fcn\u00fcne g\u00f6re 31-91 aksama <span class="' + cls + '" style="font-weight:700;">' + arrow + ' ' + fmtTL(Math.abs(roll.delta31)) + ' ' + word + '</span>. Erken dilim (15-30 g\u00fcn) de\u011fi\u015fimi: <b>' + fmtTL(roll.deltaEarly) + '</b>. <span style="color:var(--ink3);">Hafta sonu/tatil atland\u0131ysa k\u0131yas otomatik son girilen i\u015f g\u00fcn\u00fcne yap\u0131l\u0131r.</span></div>';
  } else {
    rollBox.innerHTML = '<div class="note" style="margin:0;"><b>31-91 net hareket:</b> K\u0131yas i\u00e7in \u00f6nceki g\u00fcn verisi gerekli.</div>';
  }
  const actions = insights.slice(0, 3).map(function(ins) {
    return '<li><b>' + ins.title + '</b> \u2014 ' + stripHtml(ins.desc) + '</li>';
  });
  if (!actions.length) {
    const gT = todayRows.filter(function(r) { return r.section === 'GENEL'; });
    const coll = (findRow(gT, ['31 GUN USTU']) || {}).tutar || 0;
    const aks31 = (findRow(gT, ['31-91', 'TOPLAM AKSAMA']) || {}).tutar || 0;
    const rate = aks31 > 0 ? (coll / aks31 * 100) : 0;
    actions.push('<li><b>Genel durum sakin.</b> 31-91 tahsilat oran\u0131 %' + rate.toFixed(1) + '. Segment karnesini ve yap\u0131land\u0131rma oran\u0131n\u0131 izlemeye devam edin.</li>');
  }
  list.innerHTML = actions.join('');
  panel.style.display = 'block';
}

"""

replacements = [
    (
        "function isPaymentRow(r) {\n   return r.normLabel.includes('ODENEN') || r.normLabel.includes('ODEME');\n }\n\n function fmtTL",
        "function isPaymentRow(r) {\n   return r.normLabel.includes('ODENEN') || r.normLabel.includes('ODEME');\n }\n" + helpers + "\n function fmtTL",
    ),
    (
        "const bireyselOd=fp(['BIREYSEL','TOPLAM ODEME']);   const tarimOd=fp(['TARIM','TOPLAM ODEME']);   const kobiOd=fp(['KOBI','TOPLAM ODEME']);    const hasAny = ustu||alti||bireyselOd||tarimOd||kobiOd;",
        "const bireyselOd=getSegmentPayment(todayRows,'BIREYSEL');   const tarimOd=getSegmentPayment(todayRows,'TARIM');   const kobiOd=getSegmentPayment(todayRows,'TICARI');    const hasAny = ustu||alti||bireyselOd.tutar||tarimOd.tutar||kobiOd.tutar;",
    ),
    (
        "document.getElementById('datepill').innerHTML = `Bugün <b>${todayDate||'—'}</b><br>Dün ${yestDate||'(otomatik/yok)'}`;",
        "const compareLabel = yestDate ? `Son iş günü <b>${yestDate}</b>` : 'Kıyas verisi yok';   document.getElementById('datepill').innerHTML = `Bugün <b>${todayDate||'—'}</b><br>${compareLabel}`;",
    ),
    (
        "renderKPIs();   renderCollection();",
        "renderKPIs();   renderActionSummary();   renderCollection();",
    ),
    ("label: 'Dün'", "label: 'Son iş günü'"),
    ("tension: 0.3,", "tension: 0,           spanGaps: false,"),
]

for old, new in replacements:
    if old not in js:
        raise SystemExit(f'Missing pattern: {old[:80]}...')
    js = js.replace(old, new, 1)

# Flexible replacements (whitespace-tolerant)
flex = [
    (r"const segPay = r31\.find\(x => x\.normLabel\.includes\(segKey\) && x\.normLabel\.includes\('TOPLAM ODEME'\)\)\?\.tutar \|\| 0;\s*",
     "const segPay = getSegmentPayment(todayRows, segKey).tutar; "),
    (r"const pay = r31\.find\(x => x\.normLabel\.includes\(seg\.key\) && x\.normLabel\.includes\('TOPLAM ODEME'\)\)\?\.tutar \|\| 0;\s*",
     "const pay = getSegmentPayment(todayRows, seg.key).tutar; "),
]
for pat, repl in flex:
    js2, n = re.subn(pat, repl, js, count=1)
    if n == 0:
        raise SystemExit(f'Missing flex pattern: {pat}')
    js = js2

if 'function setInputFeedback(' not in js:
    marker = '/* ---------- Panoyu Oluştur ---------- */'
    if marker not in js:
        raise SystemExit('Missing buildDashboard marker')
    js = js.replace(marker, input_feedback_fn + marker, 1)

js, n = re.subn(
    r"const\s+todayText\s*=\s*document\.getElementById\('todayInput'\)\.value;\s*if\s*\(\s*!todayText\.trim\(\)\s*\)\s*\{\s*alert\('Lütfen bugünün verisini yapıştırın veya sürükleyin\.'\);\s*return;\s*\}",
    "const todayEl = document.getElementById('todayInput');\n"
    "  const todayText = todayEl.value;\n"
    "  if (!todayText.trim()) {\n"
    "    setInputFeedback('<b>Bugünün verisi yok.</b> Excel verisini üstteki kutuya yapıştırın ya da demo için <b>Örnek Test Verisi Yükle</b> butonuna basın; sonra tekrar <b>Panoyu Oluştur</b>\\'a basın.', 'warning');\n"
    "    todayEl.focus();\n"
    "    return;\n"
    "  }",
    js,
    count=1,
)
if n == 0:
    raise SystemExit('Missing empty today input validation pattern')

js, n = re.subn(
    r"if\s*\(\s*pT\.rows\.length\s*===\s*0\s*\)\s*\{\s*alert\([\"']Bugünün verisi tanınamadı\. Excel formatında kopyalayıp yapıştırdığınızdan emin olun\.[\"']\);\s*return;\s*\}",
    "if (pT.rows.length === 0) {\n"
    "    setInputFeedback('<b>Bugünün verisi tanınamadı.</b> Excel\\'den ilgili alanı kopyalayıp bu kutuya yapıştırın. İlk satırda tarih, altında AKSAMA VAZİYETİ ve TUTAR/ADET satırları olmalı.', 'error');\n"
    "    todayEl.focus();\n"
    "    return;\n"
    "  }\n"
    "  clearInputFeedback();",
    js,
    count=1,
)
if n == 0:
    raise SystemExit('Missing parse failure validation pattern')

js, n = re.subn(
    r"function renderCharts\(\) \{\s*destroyCharts\(\);",
    "function renderCharts() {\n"
    "  destroyCharts();\n"
    "  const chartNotice = document.getElementById('chartUnavailableNote');\n"
    "  if (typeof Chart === 'undefined') {\n"
    "    if (chartNotice) chartNotice.style.display = 'block';\n"
    "    ['chartKPIComparisonContainer', 'chartRatioTrendContainer'].forEach(function(id) {\n"
    "      const el = document.getElementById(id);\n"
    "      if (el) el.style.display = 'none';\n"
    "    });\n"
    "    return;\n"
    "  }\n"
    "  if (chartNotice) chartNotice.style.display = 'none';",
    js,
    count=1,
)
if n == 0:
    raise SystemExit('Missing renderCharts start pattern')

# Demo data
def tr(n):
    neg = n < 0
    n = abs(float(n))
    whole = int(n)
    frac = int(round((n - whole) * 100 + 1e-9))
    if frac == 100:
        whole += 1
        frac = 0
    s = str(whole)
    parts = []
    while s:
        parts.insert(0, s[-3:])
        s = s[:-3]
    return ('-' if neg else '') + '.'.join(parts) + f',{frac:02d}'


def day_block(date, rows):
    lines = [date, 'AKSAMA VAZİYETİ', '', 'TUTAR\tADET']
    for label, val, adet in rows:
        if val == '':
            lines.append(f'{label}\t\t')
        else:
            lines.append(f'{label}\t{tr(val)}\t{adet}')
    return '\n'.join(lines)


def build_rows(overrides=None):
    o = overrides or {}

    def g(k, default):
        return o.get(k, default)

    return [
        ('31-91 GÜN TOPLAM AKSAMA', g('31-91', 18620000), g('31-91-a', 88)),
        ('15-91 GÜN TOPLAM AKSAMA', g('15-91', 33800000), g('15-91-a', 176)),
        ('TOPLAM TAKIP BORCU', 14087447.65, 136),
        ('31 GÜN ÜSTÜ ÖDEME YAPANLAR', 1574508.04, 3),
        ('31 GÜN ALTI ÖDEME YAPANLAR', 156418, 7),
        ('BUGÜN YAPILDIRILAN KREDİ', 0, 0),
        ('PORTFÖY BAZLI VAZİYET 31-91 GÜN', '', ''),
        ('Bireysel Ürünler', 2933926.55, 39),
        ('Bireysel Yapılandırma', 13870190.60, 33),
        ('Tarım', 654612.66, 3),
        ('Tarım Yapılandırma', 264692.34, 2),
        ('Ticari / İşletme', 916568.30, 9),
        ('Ticari Yapılandırma', 206290.73, 1),
        ('TARIM TOPLAM AKSAMA', g('tarim_aks', 905000), g('tarim_aks_a', 4)),
        ('BİREYSEL TOPLAM AKSAMA', 16804117.15, 72),
        ('KOBİ/PERA. TOPLAM AKSAMA', g('kobi_aks', 1085000), g('kobi_aks_a', 9)),
        ('TOPLAM YAPILANDIRMA KREDİSİ', 14341173.67, 36),
        ('Bireysel Ürünler Ödenen', 223416.04, 1),
        ('Bireysel Yapılandırma Ödenen', 1347017, 2),
        ('Tarım Ödenen', g('tarim_od1', 120000), 1),
        ('Tarım Yapılandırma Ödenen', g('tarim_od2', 90000), 1),
        ('Ticari / İşletme Ödenen', g('tic_od1', 143500.50), 1),
        ('Ticari Yapılandırma Ödenen', g('tic_od2', 35000), 1),
        ('TARIM TOPLAM ÖDEME', g('tarim_pay', 210000), g('tarim_pay_a', 2)),
        ('BİREYSEL TOPLAM ÖDEME', 1570433.04, 3),
        ('KOBİ/PERA. TOPLAM ÖDEME', g('kobi_pay', 178500.50), g('kobi_pay_a', 2)),
        ('PORTFÖY BAZLI VAZİYET 15-91 GÜN', '', ''),
        ('Bireysel Ürünler', 9547196.24, 117),
        ('Bireysel Yapılandırma', 15459127.22, 39),
        ('Tarım', 6654612.66, 4),
        ('Tarım Yapılandırma', 264692.34, 2),
        ('Ticari / İşletme', 1844410.62, 14),
        ('Ticari Yapılandırma', 262115.94, 2),
        ('TARIM TOPLAM AKSAMA', g('tarim_aks15', g('tarim_aks', 905000)), 6),
        ('BİREYSEL TOPLAM AKSAMA', 25006323.46, 156),
        ('KOBİ/PERA. TOPLAM AKSAMA', g('kobi_aks15', g('kobi_aks', 1085000)), 16),
        ('TOPLAM YAPILANDIRMA KREDİSİ', 15985935.50, 43),
        ('Bireysel Ürünler Ödenen', 379834.04, 8),
        ('Bireysel Yapılandırma Ödenen', 1347017, 2),
        ('Tarım Ödenen', g('tarim_od1', 120000), 1),
        ('Tarım Yapılandırma Ödenen', g('tarim_od2', 90000), 1),
        ('Ticari / İşletme Ödenen', g('tic_od1', 143500.50), 1),
        ('Ticari Yapılandırma Ödenen', g('tic_od2', 35000), 1),
        ('TARIM TOPLAM ÖDEME', g('tarim_pay', 210000), g('tarim_pay_a', 2)),
        ('BİREYSEL TOPLAM ÖDEME', 1726851.04, 10),
        ('KOBİ/PERA. TOPLAM ÖDEME', g('kobi_pay', 178500.50), g('kobi_pay_a', 2)),
    ]


configs = {
    '16': {'31-91': 19231450.22, '31-91-a': 92, 'tarim_aks': 925000, 'tarim_pay': 0, 'kobi_pay': 0, 'tarim_pay_a': 0, 'kobi_pay_a': 0},
    '17': {'31-91': 18846281.18, 'tarim_pay': 125000, 'kobi_pay': 155000, 'tarim_pay_a': 2, 'kobi_pay_a': 2},
    '18': {'31-91': 18700000, 'tarim_pay': 95000, 'kobi_pay': 80000, 'tarim_pay_a': 1, 'kobi_pay_a': 1},
    '23': {'31-91': 18680000, 'tarim_pay': 110000, 'kobi_pay': 120000, 'tarim_pay_a': 1, 'kobi_pay_a': 1},
    '24': {'31-91': 18620000, 'tarim_pay': 210000, 'kobi_pay': 178500.50, 'tarim_pay_a': 2, 'kobi_pay_a': 2},
}
blocks = {k: day_block(f'{k}.06.2026', build_rows(v)) for k, v in configs.items()}

start = js.find('function loadDemoData()')
end = js.find('window.onload = function()', start)
demo_parts = []
for key in ['16', '17', '18', '23']:
    demo_parts.append(
        "{ const p = parseBlock(" + json.dumps(blocks[key], ensure_ascii=False) + "); if (p.date && p.rows.length) saveToHistory(p.date, p.rows); }"
    )
new_demo = (
    "function loadDemoData() {   localStorage.removeItem('aksama_panosu_history');   "
    + "   ".join(demo_parts)
    + "   document.getElementById('todayInput').value = "
    + json.dumps(blocks['24'], ensure_ascii=False)
    + ";   document.getElementById('yestInput').value = '';   "
    + "setInputFeedback('<b>Örnek veriler yüklendi.</b> 16-18 ve 23 Haziran hafızada, 24 Haziran bugünün verisi olarak kutuya eklendi. 19-22 atlandı; kıyas otomatik son iş gününe (23.06) yapılacak. Şimdi <b>Panoyu Oluştur</b>\\'a basın.', 'success');   document.getElementById('todayInput').scrollIntoView({behavior:'smooth', block:'start'}); }  "
)
js = js[:start] + new_demo + js[end:]

# Insert renderActionSummary after loadDemoData (loadDemoData replace would strip earlier insertion)
if 'function renderActionSummary()' not in js:
    marker = 'window.onload = function() {'
    if marker not in js:
        raise SystemExit('Missing window.onload marker')
    js = js.replace(marker, action_fn + marker, 1)

js = js.replace(
    "window.onload = function() {",
    "window.onload = function() {\n  markScriptReady();\n  attachInputFeedbackHandlers();",
    1,
)

opts = jsbeautifier.default_options()
opts.indent_size = 2
js = jsbeautifier.beautify(js, opts)
Path('/tmp/aksama-modern.js').write_text(js)

babel = Path('/workspace/node_modules/.bin/babel')
preset_env = Path('/workspace/node_modules/@babel/preset-env')
if babel.exists() and preset_env.exists():
    es5 = Path('/tmp/aksama-es5.js')
    subprocess.run(
        [str(babel), '/tmp/aksama-modern.js', '--presets=@babel/preset-env', '--out-file', str(es5)],
        check=True,
    )
    js = es5.read_text()

html_out = html[: m.start()] + prefix + js + suffix + html[m.end() :]

action_panel = """    <div class="panel" id="actionSummaryPanel" style="display:none; background:linear-gradient(135deg,var(--card),var(--card2)); border-left:5px solid var(--amber); margin-bottom:14px;">
      <h2 style="font-size:1rem;">Bugün Dikkat Et</h2>
      <div class="sub">Son iş gününe göre en önemli 3 sinyal ve 31-91 net hareket özeti.</div>
      <div id="actionRollBox" style="margin:12px 0 14px;"></div>
      <ol id="actionSummaryList" style="margin:0; padding-left:18px; display:flex; flex-direction:column; gap:10px; font-size:0.8rem; line-height:1.5;"></ol>
    </div>

"""
html_out = html_out.replace('    <div class="panel" id="insightsPanel"', action_panel + '    <div class="panel" id="insightsPanel"', 1)
html_out = re.sub(
    r'Örnek Test Verisi Yükle \(16-[\s\S]*?Haziran\)',
    'Örnek Test Verisi Yükle (16-18, 23-24 Haziran)',
    html_out,
    count=1,
)
html_out = html_out.replace(
    "    <div class=\"sub\">Excel'den kopyaladığınız veriyi metin alanlarına yapıştırın veya Excel \n"
    "dosyasını (.xlsx) doğrudan kutunun içine sürükleyip bırakın.</div> \n",
    "    <div class=\"sub\">Excel'den kopyaladığınız veriyi metin alanlarına yapıştırın veya Excel \n"
    "dosyasını (.xlsx) doğrudan kutunun içine sürükleyip bırakın.</div> \n"
    "    <div id=\"scriptHealth\" class=\"note\" style=\"border-left-color:var(--red);\"><b>JavaScript henüz çalışmadı.</b> Bu mesaj kaybolmuyorsa dosya eksik/bozuk kopyalanmış, tarayıcı JavaScript'i kapatmış veya Edge uyumluluk modu kullanıyor demektir. Dosyayı kopyala-yapıştır yerine doğrudan indirin.</div>\n",
    1,
)
html_out, n = re.subn(
    r'(<button class="btn btn-ghost btn-block"[\s\S]*?onclick="loadDemoData\(\)">\s*Örnek Test Verisi Yükle \(16-18, 23-24 Haziran\)</button>\s*)',
    r'\1    <div id="inputFeedback" class="note" style="display:none; border-left-color:var(--amber);"></div>\n',
    html_out,
    count=1,
)
if n == 0:
    raise SystemExit('Missing demo button for input feedback insertion')
html_out = html_out.replace(
    '    <!-- Değişim Analizi Grafiği --> \n',
    '    <div id="chartUnavailableNote" class="note no-print" style="display:none; border-left-color:var(--amber);">Grafikler için internet bağlantısı/CDN erişimi gerekli. Ana pano, tablolar ve segment karnesi oluşturuldu.</div>\n\n'
    '    <!-- Değişim Analizi Grafiği --> \n',
    1,
)

OUT.write_text(html_out)
Path('/tmp/aksama-test.js').write_text(js)
print('Patched OK')
