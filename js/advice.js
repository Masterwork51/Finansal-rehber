/**
 * Akıllı Tavsiye — Max birikim odaklı
 */

const AdviceEngine = {
  generate(data) {
    const tips = [];
    const flow = calcMonthlyCashFlow(data);
    const maxUsd = calcRecommendedUsd(data);
    const visaRoom = calcVisaRoom(data);
    const ccDebt = data.creditCard.debt;
    const daysLeft = getDaysUntilDue(data.creditCard.dueDay);

    if (flow.savableTl < 0) {
      tips.push({
        priority: 1,
        text: `Bu ay maaşın giderleri ve kart ödemesini ${formatTL(Math.abs(flow.savableTl))} karşılamıyor. Değişken giderleri hemen kıs — dolar alımı şu an mümkün değil.`
      });
    } else if (maxUsd > 0) {
      tips.push({
        priority: 1,
        text: `Bu ay max ${formatUSD(maxUsd)} biriktirebilirsin. Vize hesabına bu tutarı koyarsan hedefe ${visaRoom > 0 ? formatUSD(visaRoom) + ' kaldı' : 'ulaştın'}.`
      });
    }

    const cutTips = getExpenseCutTips(data);
    if (cutTips.length > 0 && maxUsd < 500) {
      tips.push({
        priority: 2,
        text: `Harcamayı kısarak artır: ${cutTips[0].text}.`
      });
    }

    if (ccDebt > 50000 && flow.ccPay >= ccDebt * 0.8) {
      tips.push({
        priority: 2,
        text: `Kart ödemesi (${formatTL(flow.ccPay)}) birikimini ciddi düşürüyor. Minimum ödeme seçeneğini değerlendir — ama faize dikkat.`
      });
    }

    if (daysLeft <= 7 && daysLeft > 0) {
      tips.push({
        priority: daysLeft <= 3 ? 1 : 2,
        text: `Kart son ödemesine ${daysLeft} gün kaldı. Önce ${formatTL(ccDebt)} borcunu planla, sonra kalanla dolar al.`
      });
    }

    const months = monthsToVisaGoal(data);
    if (months && months <= 3 && visaRoom > 0) {
      tips.push({
        priority: 3,
        text: `Bu tempoda ${months} ay içinde ${formatUSD(data.goals.visaTargetUsd)} vize hedefine ulaşırsın.`
      });
    }

    if (tips.length === 0) {
      tips.push({
        priority: 5,
        text: `Giderler kontrol altında. Bu ay ${formatUSD(maxUsd)} biriktirme kapasiten var.`
      });
    }

    tips.sort((a, b) => a.priority - b.priority);
    const primary = tips[0].text;
    const secondary = tips.length > 1 ? tips[1].text : null;
    return secondary ? `${primary} ${secondary}` : primary;
  }
};
