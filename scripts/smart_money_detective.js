/**
 * Agent 3: 🐋 Smart Money & Orderflow Detective
 * Identifies stealth institutional accumulation, delivery surges, volume Z-score anomalies,
 * and high-conviction orderflow footprints across Nifty 500 equities.
 */

function computeSmartMoneyFootprint(stock) {
  if (!stock) {
    return {
      score: 50,
      tier: '⚖️ NEUTRAL_FLOW',
      tierColor: '#94a3b8',
      tierBadgeBg: 'rgba(148, 163, 184, 0.16)',
      signals: []
    };
  }

  let score = 0;
  const signals = [];

  const inst = stock.institutional || {};
  const adGrade = inst.ad_grade || 'C';
  const delivRatio = inst.deliv_ratio || 1.0;
  const delivPct = inst.deliv_pct || 0;
  const mfr = inst.mfr || 0.5;
  const udr = inst.udr || 1.0;
  const volRatio = stock.vol_ratio || 1.0;
  const volZ = stock.vol_zscore || (volRatio > 2.0 ? 2.5 : volRatio > 1.5 ? 1.6 : 0.8);

  // 1. Institutional Accumulation / Distribution (A/D) Grade (Up to 30 pts)
  if (adGrade === 'A+') {
    score += 30;
    signals.push('🏛️ Inst A+ Heavy Accumulation');
  } else if (adGrade === 'A') {
    score += 25;
    signals.push('🏛️ Inst A Accumulation');
  } else if (adGrade === 'B') {
    score += 15;
  } else if (adGrade === 'D') {
    score -= 15;
    signals.push('⚠️ Institutional Selling Pressure');
  }

  // 2. Delivery Volume Footprint (Up to 25 pts)
  if (delivRatio >= 2.0) {
    score += 25;
    signals.push(`📦 Massive Delivery Surge (${delivRatio.toFixed(1)}× 20D Avg)`);
  } else if (delivRatio >= 1.4) {
    score += 18;
    signals.push(`📦 Elevated Delivery (${delivRatio.toFixed(1)}×)`);
  } else if (delivPct >= 65) {
    score += 12;
    signals.push(`💎 High Delivery Concentration (${delivPct.toFixed(0)}%)`);
  }

  // 3. Statistical Volume Anomaly & Orderflow (Up to 20 pts)
  if (volZ >= 2.2 || volRatio >= 2.5) {
    score += 20;
    signals.push(`⚡ Volume Anomaly (${volZ >= 2.0 ? volZ.toFixed(1) + 'σ' : volRatio.toFixed(1) + '×'})`);
  } else if (volZ >= 1.5 || volRatio >= 1.5) {
    score += 14;
    signals.push(`⚡ Volume Expansion (${volRatio.toFixed(1)}×)`);
  }

  // 4. Money Flow & Up/Down Volume Ratio (Up to 15 pts)
  if (mfr >= 0.65 || udr >= 1.6) {
    score += 15;
    signals.push(`🌊 Money Flow Dominance (U/D: ${udr.toFixed(1)})`);
  } else if (mfr >= 0.55 || udr >= 1.2) {
    score += 10;
  }

  // 5. Pattern Confluence Bonus (Up to 15 pts)
  if (stock.pocket_pivot === true || stock.pocket_pivot?.is_pivot) {
    score += 10;
    signals.push('🎯 Institutional Pocket Pivot');
  }
  if (stock.vcp?.is_vcp || (stock.vcp_score && stock.vcp_score >= 70)) {
    score += 10;
    signals.push('🧘 VCP Volatility Squeeze');
  }
  if (stock.hi52_prox != null && stock.hi52_prox >= -0.05) {
    score += 5;
    signals.push('🔥 52W High Proximity');
  }

  const finalScore = Math.max(5, Math.min(99, Math.round(score)));

  let tier = '⚖️ NEUTRAL_FLOW';
  let tierColor = '#94a3b8';
  let tierBadgeBg = 'rgba(148, 163, 184, 0.16)';

  if (finalScore >= 80) {
    tier = '🐋 WHALE_ACCUMULATION';
    tierColor = '#00e676';
    tierBadgeBg = 'rgba(0, 230, 118, 0.22)';
  } else if (finalScore >= 60) {
    tier = '🏛️ SMART_MONEY_BUY';
    tierColor = '#10b981';
    tierBadgeBg = 'rgba(16, 185, 129, 0.18)';
  } else if (finalScore >= 40) {
    tier = '⚖️ BALANCED_FLOW';
    tierColor = '#f59e0b';
    tierBadgeBg = 'rgba(245, 158, 11, 0.16)';
  } else {
    tier = '⚠️ DISTRIBUTION_RISK';
    tierColor = '#ef4444';
    tierBadgeBg = 'rgba(239, 68, 68, 0.2)';
  }

  return {
    score: finalScore,
    tier,
    tierColor,
    tierBadgeBg,
    adGrade,
    delivRatio,
    delivPct,
    volZ,
    signals: signals.slice(0, 4)
  };
}

module.exports = {
  computeSmartMoneyFootprint
};
