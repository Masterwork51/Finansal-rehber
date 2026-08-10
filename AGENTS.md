# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

**Birikim Hesaplayıcı** is a static Turkish-language PWA (no build step, no package manager). All app state lives in browser `localStorage`; exchange rates are loaded from `data/tcmb-rates.json`.

### Running locally

From the repo root:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 in a browser. Do **not** open `index.html` via `file://` — the service worker and JSON fetch require HTTP.

### Services

| Service | Required | Notes |
|---------|----------|-------|
| Static HTTP server | Yes | `python3 -m http.server 8080` |
| Web browser | Yes | Core UI, charts, `localStorage` |
| TCMB fetch script | No | `python3 scripts/fetch_tcmb.py` refreshes rates (stdlib only; needs network) |

### Lint / test / build

There is no linter, test runner, or build pipeline in this repo. Verification is manual in the browser or via HTTP checks (`curl http://localhost:8080/`).

### Hello-world smoke test

1. Load http://localhost:8080 and confirm header shows **v4.0** and USD rate in the rates bar.
2. Click **Güncelle**, change **Aylık maaş**, save — hero **Bu Ay Max Biriktirebileceğin** and **Paran Nereye Gidiyor?** should recalculate.
3. Optional: click **Düzenle** under Giderler to edit expenses and confirm max USD updates.

### Gotchas

- Default expenses + credit card payment often exceed a typical salary, so max savings may show **$0** until income is raised or expenses lowered — that is expected behavior, not a setup failure.
- Google Fonts load from CDN; offline/system fonts are acceptable fallbacks.
- `scripts/fetch_tcmb.py` writes `data/tcmb-rates.json`; only run when refreshing TCMB rates, not on every dev session.
