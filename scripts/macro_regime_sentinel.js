/**
 * Agent 1: 🛰️ Macro & Market Regime Sentinel
 * Evaluates holistic macro health across India VIX, FII/DII net flows, Market Breadth,
 * Nifty 50 momentum, and CNN/S&P 7-Pillar Fear & Greed Index.
 * Acts as an automated circuit breaker to protect portfolio cash during hostile regimes.
 */

function evaluateMacroRegime(screenerData) {
  if (!screenerData) {
    return {
      regime: 'NEUTRAL_BALANCED',
      regimeColor: '#f59e0b',
      regimeBadgeBg: 'rgba(245, 158, 11, 0.16)',
      marketScore: 50,
      vixLevel: 15.0,
      vixRegime: 'MODERATE',
      fiiNet: 0,
      diiNet: 0,
      circuitBreakerActive: false,
      maxAllowedSlots: 7,
      maxCapitalPerTradePct: 10,
      guidance: 'Standard market conditions. Focus on high RS Quad-1 setups.'
    };
  }

  const sentiment = screenerData.sentiment_pillars || {};
  const marketScore = typeof sentiment.score === 'number' ? sentiment.score : 50;
  const fiiDii = screenerData.fii_dii || {};
  const fiiNet = typeof fiiDii.fii === 'number' ? fiiDii.fii : 0;
  const diiNet = typeof fiiDii.dii === 'number' ? fiiDii.dii : 0;
  const combinedNet = fiiNet + diiNet;

  // Extract VIX from pillars or fallback
  const vixPillar = Array.isArray(sentiment.pillars) ? sentiment.pillars.find(p => p.id === 'volatility') : null;
  let vixLevel = 15.0;
  if (vixPillar && vixPillar.desc) {
    const m = vixPillar.desc.match(/VIX at ([\d\.]+)/i);
    if (m) vixLevel = parseFloat(m[1]);
  }

  // 1. Classify Volatility Regime
  let vixRegime = 'MODERATE';
  if (vixLevel < 13.5) vixRegime = 'CALM_BULL';
  else if (vixLevel <= 17.5) vixRegime = 'ELEVATED_CHOPPY';
  else if (vixLevel <= 22.0) vixRegime = 'HIGH_RISK';
  else vixRegime = 'PANIC_EXTREME';

  // 2. Classify Master Macro Regime
  let regime = 'NEUTRAL_BALANCED';
  let regimeColor = '#f59e0b';
  let regimeBadgeBg = 'rgba(245, 158, 11, 0.16)';
  let circuitBreakerActive = false;
  let maxAllowedSlots = 10;
  let maxCapitalPerTradePct = 10;
  let guidance = '';

  // Hostile Conditions (Circuit Breaker Triggered)
  if (marketScore < 30 || vixLevel >= 22.0 || fiiNet < -5500) {
    regime = 'PANIC_LOCKDOWN';
    regimeColor = '#ef4444';
    regimeBadgeBg = 'rgba(239, 68, 68, 0.22)';
    circuitBreakerActive = true;
    maxAllowedSlots = 0; // ZERO new buying permitted
    guidance = '🚨 Severe institutional selling & elevated risk. New buying locked. 100% Capital preservation defense.';
  } else if (marketScore < 42 || vixLevel >= 18.0 || (fiiNet < -3500 && combinedNet < -2000)) {
    regime = 'CORRECTION_DEFENSE';
    regimeColor = '#f97316';
    regimeBadgeBg = 'rgba(249, 115, 22, 0.18)';
    circuitBreakerActive = true;
    maxAllowedSlots = 3; // Maximum 3 highly defensive slots
    maxCapitalPerTradePct = 7.5;
    guidance = '⚠️ Market in pullback correction. New aggressive breakouts paused. Limit exposure to max 3 slots.';
  } else if (marketScore <= 58) {
    regime = 'CHOPPY_CONSOLIDATION';
    regimeColor = '#eab308';
    regimeBadgeBg = 'rgba(234, 179, 8, 0.16)';
    circuitBreakerActive = false;
    maxAllowedSlots = 6;
    maxCapitalPerTradePct = 10;
    guidance = '⚖️ Selective sideways market. Trade only top RS leaders with volume confirmation (max 6 slots).';
  } else if (marketScore <= 75) {
    regime = 'HEALTHY_EXPANSION';
    regimeColor = '#10b981';
    regimeBadgeBg = 'rgba(16, 185, 129, 0.18)';
    circuitBreakerActive = false;
    maxAllowedSlots = 9;
    maxCapitalPerTradePct = 10;
    guidance = '🟢 Broad institutional accumulation. Favorable risk-reward for Quad-1 momentum leaders.';
  } else {
    regime = 'BULL_MOMENTUM';
    regimeColor = '#00e676';
    regimeBadgeBg = 'rgba(0, 230, 118, 0.22)';
    circuitBreakerActive = false;
    maxAllowedSlots = 10;
    maxCapitalPerTradePct = 10;
    guidance = '🚀 High momentum bull market. Full capital deployment (10 slots) with trailing stop-loss profit protection.';
  }

  return {
    regime,
    regimeColor,
    regimeBadgeBg,
    marketScore,
    vixLevel,
    vixRegime,
    fiiNet,
    diiNet,
    combinedNet,
    circuitBreakerActive,
    maxAllowedSlots,
    maxCapitalPerTradePct,
    guidance
  };
}

module.exports = {
  evaluateMacroRegime
};
