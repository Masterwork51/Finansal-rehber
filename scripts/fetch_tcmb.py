#!/usr/bin/env python3
"""TCMB günlük kurları çeker ve data/tcmb-rates.json dosyasını günceller."""

import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml"
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "tcmb-rates.json"

CURRENCY_TAGS = {
    "USD": "usd",
    "EUR": "eur",
    "GBP": "gbp",
}


def parse_rate(currency_elem):
    for tag in ("ForexSelling", "BanknoteSelling", "ForexBuying"):
        node = currency_elem.find(tag)
        if node is not None and node.text:
            value = float(node.text.replace(",", "."))
            if value > 0:
                return round(value, 4)
    return None


def fetch_rates():
    with urllib.request.urlopen(TCMB_URL, timeout=30) as response:
        root = ET.fromstring(response.read())

    rates = {}
    for currency in root.findall("Currency"):
        code = currency.get("CurrencyCode")
        key = CURRENCY_TAGS.get(code)
        if not key:
            continue
        value = parse_rate(currency)
        if value:
            rates[key] = value

    if "usd" not in rates:
        raise RuntimeError("TCMB yanıtında USD kuru bulunamadı")

    return rates


def main():
    rates = fetch_rates()
    payload = {
        "updated": date.today().isoformat(),
        "source": "TCMB",
        **rates,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Güncellendi: {OUTPUT} -> USD {rates.get('usd')}")


if __name__ == "__main__":
    main()
