#!/usr/bin/env python3
import re, subprocess, json
from pathlib import Path

base = Path('/tmp/aksama-base.js').read_text()

def check(name, js):
    Path('/tmp/_chk.js').write_text(js)
    r = subprocess.run(['node', '--check', '/tmp/_chk.js'], capture_output=True, text=True)
    ok = r.returncode == 0
    print(f"{name}: {'OK' if ok else 'FAIL ' + r.stderr.strip()[:120]}")
    return ok

check('base', base)

# Load patch script pieces
import importlib.util
spec = importlib.util.spec_from_file_location('patch', '/workspace/scripts/patch_aksama.py')

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

js = base
steps = []

def step(name, fn):
    global js
    js = fn(js)
    steps.append(name)
    check(' + '.join(steps), js)

step('helpers', lambda j: j.replace(
    "function isPaymentRow(r) {\n   return r.normLabel.includes('ODENEN') || r.normLabel.includes('ODEME');\n }\n\n function fmtTL",
    "function isPaymentRow(r) {\n   return r.normLabel.includes('ODENEN') || r.normLabel.includes('ODEME');\n }\n" + helpers + "\n function fmtTL", 1))

step('coll', lambda j: j.replace(
    "const bireyselOd=fp(['BIREYSEL','TOPLAM ODEME']);   const tarimOd=fp(['TARIM','TOPLAM ODEME']);   const kobiOd=fp(['KOBI','TOPLAM ODEME']);    const hasAny = ustu||alti||bireyselOd||tarimOd||kobiOd;",
    "const bireyselOd=getSegmentPayment(todayRows,'BIREYSEL');   const tarimOd=getSegmentPayment(todayRows,'TARIM');   const kobiOd=getSegmentPayment(todayRows,'TICARI');    const hasAny = ustu||alti||bireyselOd.tutar||tarimOd.tutar||kobiOd.tutar;", 1))

step('datepill', lambda j: j.replace(
    "document.getElementById('datepill').innerHTML = `Bugün <b>${todayDate||'—'}</b><br>Dün ${yestDate||'(otomatik/yok)'}`;",
    "const compareLabel = yestDate ? `Son iş günü <b>${yestDate}</b>` : 'Kıyas verisi yok';   document.getElementById('datepill').innerHTML = `Bugün <b>${todayDate||'—'}</b><br>${compareLabel}`;", 1))

step('builddash', lambda j: j.replace(
    "renderKPIs();   renderCollection();",
    "renderKPIs();   renderActionSummary();   renderCollection();", 1))

patch_src = Path('/workspace/scripts/patch_aksama.py').read_text()
action = re.search(r'action_fn = r"""(.*?)"""', patch_src, re.S).group(1)

step('action', lambda j: j.replace('window.onload = function() {', action + 'window.onload = function() {', 1))

step('chartlabel', lambda j: j.replace("label: 'Dün'", "label: 'Son iş günü'", 1))

step('spangaps', lambda j: j.replace("tension: 0.3,", "tension: 0,           spanGaps: false,", 1))

def flex(j):
    for pat, repl in [
        (r"const segPay = r31\.find\(x => x\.normLabel\.includes\(segKey\) && x\.normLabel\.includes\('TOPLAM ODEME'\)\)\?\.tutar \|\| 0;\s*",
         "const segPay = getSegmentPayment(todayRows, segKey).tutar; "),
        (r"const pay = r31\.find\(x => x\.normLabel\.includes\(seg\.key\) && x\.normLabel\.includes\('TOPLAM ODEME'\)\)\?\.tutar \|\| 0;\s*",
         "const pay = getSegmentPayment(todayRows, seg.key).tutar; "),
    ]:
        j, n = re.subn(pat, repl, j, count=1)
        if n == 0:
            raise SystemExit(f'missing {pat}')
    return j

step('flex', flex)
