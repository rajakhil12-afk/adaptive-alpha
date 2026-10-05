/**
 * AGENT 4: MULTI-SLEEVE PORTFOLIO & RISK ARCHITECT
 * 
 * Divides Jishu Desk into 3 quantitative trading sleeves:
 * 1. SLEEVE A (Alpha Momentum & Fresh Breakouts) - 50% max allocation
 *    - Targets Quad 1 high-momentum breakouts, ATH/52W prox, RS >= 80, fast runners.
 * 2. SLEEVE B (Leader Retest & Dip Buys) - 30% max allocation
 *    - Targets RS leaders testing 50/200 EMA support, VCP contractions, pocket pivots.
 * 3. SLEEVE C (Cash Buffer & Dynamic Liquidity Reserve) - 20% baseline reserve
 *    - Dynamic cash reserve dial that expands during hostile macro regimes.
 */

const SLEEVE_CONFIG = {
  SLEEVE_A: {
    id: 'SLEEVE_A',
    name: 'Alpha Breakouts & Super Momentum',
    icon: '🚀',
    targetAllocPct: 50,
    maxPositions: 5,
    minRsRating: 80,
    maxHoldingDays: 15
  },
  SLEEVE_B: {
    id: 'SLEEVE_B',
    name: 'Leader Retest & Dip Buys',
    icon: '🎯',
    targetAllocPct: 30,
    maxPositions: 3,
    minRsRating: 65,
    maxHoldingDays: 30
  },
  SLEEVE_C: {
    id: 'SLEEVE_C',
    name: 'Dynamic Liquidity & Cash Buffer',
    icon: '🛡️',
    targetAllocPct: 20,
    maxPositions: 0
  }
};

/**
 * Calculates current sleeve allocations and capacities given the macro regime
 */
function calculateSleeveAllocations(totalEquity, openPositions = [], macroRegime = null) {
  const equity = Math.max(totalEquity || 1000000, 100000);
  
  // Dynamic sleeve adjustment based on Macro Sentinel
  let sleeveATargetPct = SLEEVE_CONFIG.SLEEVE_A.targetAllocPct;
  let sleeveBTargetPct = SLEEVE_CONFIG.SLEEVE_B.targetAllocPct;
  let sleeveCTargetPct = SLEEVE_CONFIG.SLEEVE_C.targetAllocPct;

  if (macroRegime) {
    if (macroRegime.regime === 'BULL_MOMENTUM') {
      sleeveATargetPct = 60;
      sleeveBTargetPct = 30;
      sleeveCTargetPct = 10;
    } else if (macroRegime.regime === 'CHOPPY_CONSOLIDATION') {
      sleeveATargetPct = 35;
      sleeveBTargetPct = 35;
      sleeveCTargetPct = 30;
    } else if (macroRegime.regime === 'CORRECTION_DEFENSE') {
      sleeveATargetPct = 20;
      sleeveBTargetPct = 30;
      sleeveCTargetPct = 50;
    } else if (macroRegime.regime === 'PANIC_LOCKDOWN') {
      sleeveATargetPct = 0;
      sleeveBTargetPct = 0;
      sleeveCTargetPct = 100;
    }
  }

  const sleeveACapital = (equity * sleeveATargetPct) / 100;
  const sleeveBCapital = (equity * sleeveBTargetPct) / 100;
  const sleeveCCapital = (equity * sleeveCTargetPct) / 100;

  // Track invested capital per sleeve
  let investedA = 0;
  let investedB = 0;
  let countA = 0;
  let countB = 0;

  (openPositions || []).forEach(pos => {
    const invested = pos.invested_value || (pos.qty * pos.entry_price);
    if (pos.sleeve === 'SLEEVE_B' || pos.setup_type === 'LEADER_DIP') {
      investedB += invested;
      countB += 1;
    } else {
      investedA += invested;
      countA += 1;
    }
  });

  const availableA = Math.max(0, sleeveACapital - investedA);
  const availableB = Math.max(0, sleeveBCapital - investedB);

  return {
    sleeveA: {
      ...SLEEVE_CONFIG.SLEEVE_A,
      targetPct: sleeveATargetPct,
      targetCapital: Number(sleeveACapital.toFixed(2)),
      investedCapital: Number(investedA.toFixed(2)),
      availableCapital: Number(availableA.toFixed(2)),
      openPositions: countA,
      openSlots: Math.max(0, (macroRegime?.regime === 'PANIC_LOCKDOWN' ? 0 : 5) - countA),
      utilizationPct: sleeveACapital > 0 ? Number(((investedA / sleeveACapital) * 100).toFixed(1)) : 0
    },
    sleeveB: {
      ...SLEEVE_CONFIG.SLEEVE_B,
      targetPct: sleeveBTargetPct,
      targetCapital: Number(sleeveBCapital.toFixed(2)),
      investedCapital: Number(investedB.toFixed(2)),
      availableCapital: Number(availableB.toFixed(2)),
      openPositions: countB,
      openSlots: Math.max(0, (macroRegime?.regime === 'PANIC_LOCKDOWN' ? 0 : 3) - countB),
      utilizationPct: sleeveBCapital > 0 ? Number(((investedB / sleeveBCapital) * 100).toFixed(1)) : 0
    },
    sleeveC: {
      ...SLEEVE_CONFIG.SLEEVE_C,
      targetPct: sleeveCTargetPct,
      targetCapital: Number(sleeveCCapital.toFixed(2)),
      status: macroRegime?.regime === 'PANIC_LOCKDOWN' ? '100% CAPITAL SHIELD' : 'ACTIVE BUFFER'
    }
  };
}

/**
 * Classifies a stock candidate into Sleeve A or Sleeve B
 */
function classifyCandidateSleeve(stock) {
  // If stock is flagged as Dip / Retest / Near 200 EMA / Support
  const isRetest = (stock.dist_50d && Math.abs(stock.dist_50d) < 3.0) || 
                   (stock.setup_tags && stock.setup_tags.includes('LEADER_RETEST')) ||
                   (stock.vcp_score && stock.vcp_score >= 70);

  if (isRetest && (stock.rs_rating || 0) >= 65) {
    return {
      sleeveId: 'SLEEVE_B',
      sleeveName: 'Leader Retest & Dip Buy',
      setupType: 'LEADER_DIP',
      icon: '🎯'
    };
  }

  // Default to Sleeve A (Alpha Momentum Breakout)
  return {
    sleeveId: 'SLEEVE_A',
    sleeveName: 'Alpha Breakout & Momentum',
    setupType: 'ALPHA_BREAKOUT',
    icon: '🚀'
  };
}

module.exports = {
  SLEEVE_CONFIG,
  calculateSleeveAllocations,
  classifyCandidateSleeve
};
