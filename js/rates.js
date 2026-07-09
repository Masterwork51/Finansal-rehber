/**
 * TCMB kurlarını otomatik yükler
 */

const RatesService = {
  async loadInto(data) {
    try {
      const base = new URL('.', window.location.href).href;
      const res = await fetch(new URL('data/tcmb-rates.json', base).href, { cache: 'no-cache' });
      if (!res.ok) return null;

      const json = await res.json();
      if (json.usd) data.rates.usd = json.usd;
      if (json.eur) data.rates.eur = json.eur;
      if (json.gbp) data.rates.gbp = json.gbp;
      data.rates.updated = json.updated;
      data.rates.source = json.source || 'TCMB';

      localStorage.setItem('finansTcmbRates', JSON.stringify(json));
      return json;
    } catch (e) {
      const cached = localStorage.getItem('finansTcmbRates');
      if (cached) {
        const json = JSON.parse(cached);
        if (json.usd) data.rates.usd = json.usd;
        if (json.eur) data.rates.eur = json.eur;
        if (json.gbp) data.rates.gbp = json.gbp;
        data.rates.updated = json.updated;
        return json;
      }
      return null;
    }
  },

  formatRateInfo(data) {
    if (!data.rates.updated) return 'Kur: manuel';
    const d = new Date(data.rates.updated);
    const label = isNaN(d) ? data.rates.updated : d.toLocaleDateString('tr-TR');
    return `TCMB · ${label}`;
  }
};
