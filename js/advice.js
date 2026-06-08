/**
 * Akıllı Tavsiye Motoru
 * Her açılışta ve yenilemede bağlama göre yorum üretir
 */

const AdviceEngine = {
  generate(data) {
    const tips = [];
    const visaUsd = data.assets.visaUsd;
    const visaTarget = data.goals.visaTargetUsd;
    const remaining = visaTarget - visaUsd;
    const buyable = data.goals.buyableUsdThisMonth;
    const ccDebt = data.creditCard.debt;
    const daysLeft = getDaysUntilDue(data.creditCard.dueDay);
    const progress = calcVisaProgress(data);
    const score = calcVisaScore(data);
    const emergencyPct = data.goals.emergencyFundCurrentPct;

    // Kredi kartı + dolar alım riski
    if (ccDebt > 75000 && buyable > 400) {
      tips.push({
        priority: 1,
        text: `Bu ay kredi kartı borcun (${formatTL(ccDebt)}) yüksek olduğu için ${buyable} USD üzeri alım riskli görünüyor. ${Math.max(300, buyable - 50)}–${buyable} USD arası alım güvenli bölge.`
      });
    } else if (ccDebt > 50000) {
      tips.push({
        priority: 2,
        text: `Kart borcun ${formatTL(ccDebt)}. Önce minimum ödemeyi planla; dolar alımını kart ödeme tarihinden sonraya bırakman nakit akışını rahatlatır.`
      });
    }

    // Vize hedefi yakınlığı
    if (remaining > 0 && remaining <= 700) {
      tips.push({
        priority: 1,
        text: `${formatUSD(visaTarget)} hedefi için yalnızca ${formatUSD(remaining)} eksik. Önümüzdeki iki maaş döneminde bu hedefe ulaşabilirsin.`
      });
    } else if (remaining <= 0) {
      tips.push({
        priority: 1,
        text: `Tebrikler! Vize hesabın ${formatUSD(visaUsd)} ile hedefin üzerinde. Son 3 ay düzenli giriş göstermek için hesabı aktif tut.`
      });
    }

    // Son ödeme yaklaşıyor
    if (daysLeft <= 7 && daysLeft > 0) {
      tips.push({
        priority: daysLeft <= 3 ? 1 : 2,
        text: `Kredi kartı son ödemesine ${daysLeft} gün kaldı. ${formatTL(ccDebt)} borç için ödeme planını bugün netleştir.`
      });
    }

    // Vize skoru önerileri
    if (score < 70) {
      tips.push({
        priority: 2,
        text: `Vize gücü skorun ${score}/100. Banka hesabında en az 3 ay düzenli maaş girişi ve ${formatUSD(visaTarget)} üzeri bakiye konsolosluk için güçlü sinyal verir.`
      });
    } else if (score >= 80 && remaining > 0) {
      tips.push({
        priority: 3,
        text: `Skorun ${score}/100 — iyi durumdasın. ${formatUSD(remaining)} daha biriktirerek hesabı 5.000 USD üzerine çıkarman başvuruyu güçlendirir.`
      });
    }

    // Acil durum fonu
    if (emergencyPct < 50) {
      tips.push({
        priority: 3,
        text: `Acil durum fonun hedefin %${emergencyPct}'inde. Vize önceliğin korunurken aylık giderlerinin en az %10'unu bu fona ayırmayı düşün.`
      });
    } else if (emergencyPct >= 50 && emergencyPct < 80) {
      tips.push({
        priority: 4,
        text: `Acil durum fonun %${emergencyPct} dolu — yarı yoldasın. 6 aylık gider hedefine ulaşınca dolar birikimine daha rahat odaklanabilirsin.`
      });
    }

    // İlerleme motivasyonu
    if (progress >= 85 && progress < 100) {
      tips.push({
        priority: 3,
        text: `Vize hesabın hedefin %${Math.round(progress)}'ine ulaştı. Bu tempoda devam edersen önümüzdeki 1–2 ayda tamamlayabilirsin.`
      });
    }

    // Düşük alım kapasitesi
    if (buyable < 300 && remaining > 0) {
      tips.push({
        priority: 2,
        text: `Bu ay alınabilir dolar (${formatUSD(buyable)}) düşük. Sabit giderleri gözden geçirerek gelecek ay birikim kapasiteni artırabilirsin.`
      });
    }

    // Varsayılan pozitif mesaj
    if (tips.length === 0) {
      tips.push({
        priority: 5,
        text: `Finansal durumun dengeli görünüyor. Vize hesabın ${formatUSD(visaUsd)}, net varlığın ${formatTL(calcNetWorth(data))}. Planına sadık kal.`
      });
    }

    tips.sort((a, b) => a.priority - b.priority);

    const primary = tips[0].text;
    const secondary = tips.length > 1 ? tips[1].text : null;

    return secondary ? `${primary} ${secondary}` : primary;
  },

  getVisaTips(data) {
    const tips = [];
    const remaining = data.goals.visaTargetUsd - data.assets.visaUsd;
    const score = calcVisaScore(data);

    if (remaining > 0) {
      tips.push(`${formatUSD(data.goals.visaTargetUsd)} üzerine çık — şu an ${formatUSD(remaining)} eksik.`);
    }
    tips.push('Son 3 ay düzenli maaş girişi göster.');
    if (score < 85) {
      tips.push('Kredi kartı borcunu düşürerek finansal profilini güçlendir.');
    }
    if (data.goals.emergencyFundCurrentPct < 60) {
      tips.push('Acil durum fonunu %60 üzerine çıkar.');
    }

    return tips;
  }
};
