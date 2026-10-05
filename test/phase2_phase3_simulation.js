/**
 * COMPREHENSIVE MULTI-AGENT QUANT DESK SIMULATION TEST (PHASES 1, 2 & 3)
 * 
 * Verifies all 6 Autonomous Agents working simultaneously:
 * 1. Agent 1: Macro & Market Regime Sentinel
 * 2. Agent 2: Price Action & False Breakout Sentinel
 * 3. Agent 3: Smart Money & Orderflow Detective
 * 4. Agent 4: Multi-Sleeve Portfolio Engine
 * 5. Agent 5: Volatility-Adjusted Kelly/ATR Position Sizer
 * 6. Agent 6: Quant Analytics & Self-Correction Learner
 */

const { runJishuEngine, resetPortfolio } = require('../scripts/jishu_engine');
const { evaluateMacroRegime } = require('../scripts/macro_regime_sentinel');
const { validateBreakoutQuality } = require('../scripts/breakout_validator');
const { computeSmartMoneyFootprint } = require('../scripts/smart_money_detective');
const { calculateSleeveAllocations, classifyCandidateSleeve } = require('../scripts/multi_sleeve_portfolio');
const { calculatePositionSize } = require('../scripts/position_sizer');
const { calculateQuantMetrics } = require('../scripts/quant_analytics');

console.log('=====================================================');
console.log('🧪 RUNNING COMPLETE MULTI-AGENT (PHASES 1, 2 & 3) TEST HARNESS');
console.log('=====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assertTest(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

// Reset clean baseline
resetPortfolio(1000000, '2026-10-01');

// --- DAY 1: Multi-Agent Intake & Sizing ---
console.log('\n--- DAY 1: Multi-Agent Intake & Sizing (Bull Expansion) ---');
const day1Screener = {
  bhavDate: '2026-10-01',
  sentiment_pillars: {
    score: 75,
    pillars: [{ id: 'volatility', desc: 'VIX at 13.5 (Bull Mode)' }]
  },
  fii_dii: { fii: 2500, dii: 1800 },
  stocks: [
    {
      sym: 'HAL',
      name: 'Hindustan Aeronautics',
      price: 4500,
      open: 4400,
      high: 4520,
      low: 4380,
      ars: 1.8,
      srs: 1.5,
      rs_rating: 92,
      vol_ratio: 2.5,
      institutional: { ad_grade: 'A+', deliv_ratio: 2.2, deliv_pct: 70 },
      pocket_pivot: true,
      ma_status: 'MA+',
      st10: { trend: 'buy', val: 4200 }
    },
    {
      sym: 'CASTROLIND',
      name: 'Castrol India',
      price: 200,
      open: 196,
      high: 202,
      low: 195,
      ars: 0.8,
      srs: 0.6,
      rs_rating: 70,
      vol_ratio: 1.4,
      institutional: { ad_grade: 'A', deliv_ratio: 1.6, deliv_pct: 62 },
      dist_50d: 1.2,
      vcp_score: 80,
      ma_status: 'MA+',
      st10: { trend: 'buy', val: 185 }
    }
  ]
};

const res1 = runJishuEngine(day1Screener);
const p1 = res1.portfolio;
assertTest(p1.macro_regime.regime === 'BULL_MOMENTUM' || p1.macro_regime.regime === 'HEALTHY_EXPANSION', 'Day 1: Macro Sentinel detects Bull/Healthy Expansion');
assertTest(p1.open_positions.length === 2, 'Day 1: Both candidates qualified across agents');

const halPos = p1.open_positions.find(p => p.sym === 'HAL');
const castrolPos = p1.open_positions.find(p => p.sym === 'CASTROLIND');

assertTest(halPos && halPos.sleeve === 'SLEEVE_A', 'Day 1: HAL classified into Sleeve A (Alpha Momentum)');
assertTest(castrolPos && castrolPos.sleeve === 'SLEEVE_B', 'Day 1: CASTROLIND classified into Sleeve B (Leader Retest)');
assertTest(halPos && halPos.smart_money_score >= 85, 'Day 1: HAL scored Whale Accumulation');
assertTest(halPos && halPos.actual_dollar_risk > 0, 'Day 1: Volatility-adjusted dollar risk calculated');

// --- DAY 2: False Breakout Rejection Filter (Agent 2) ---
console.log('\n--- DAY 2: False Breakout Upper Shadow Rejection Gate ---');
const badCandleStock = {
  sym: 'TRAP_STOCK',
  price: 100,
  open: 100,
  high: 120, // Huge spike
  low: 98,
  ars: 1.2,
  srs: 1.1,
  rs_rating: 88,
  vol_ratio: 2.0,
  ma_status: 'MA+',
  st10: { trend: 'buy', val: 95 }
};

const paResult = validateBreakoutQuality(badCandleStock);
assertTest(paResult.isValid === false, 'Day 2: Agent 2 rejected fake breakout with massive upper wick');
assertTest(paResult.rejections.some(r => r.includes('UPPER_WICK')), 'Day 2: Specific upper shadow rejection reason captured');

// --- DAY 3: Target 1 Breakeven Stop Adjustment ---
console.log('\n--- DAY 3: Target 1 Breakeven SL Adjustment ---');
const day3Screener = {
  bhavDate: '2026-10-03',
  sentiment_pillars: { score: 68, pillars: [{ id: 'volatility', desc: 'VIX at 14.0' }] },
  fii_dii: { fii: 1200, dii: 800 },
  stocks: [
    { sym: 'HAL', price: halPos.target_1_price + 10, ars: 1.8, srs: 1.5, st10: { trend: 'buy', val: 4300 } },
    { sym: 'CASTROLIND', price: 202, ars: 0.8, srs: 0.6, st10: { trend: 'buy', val: 188 } }
  ]
};

const res3 = runJishuEngine(day3Screener);
const halD3 = res3.portfolio.open_positions.find(p => p.sym === 'HAL');
assertTest(halD3 && halD3.sl_moved_to_cost === true, 'Day 3: Target 1 hit -> SL moved to Cost (Breakeven)');
assertTest(halD3 && halD3.current_sl === halD3.entry_price, 'Day 3: Trade is completely risk-free');

// --- DAY 4: Target 2 Profit Lock ---
console.log('\n--- DAY 4: Target 2 Hit -> Target 1 Profit Locked (+10%) ---');
const day4Screener = {
  bhavDate: '2026-10-04',
  sentiment_pillars: { score: 70, pillars: [{ id: 'volatility', desc: 'VIX at 13.8' }] },
  fii_dii: { fii: 1500, dii: 600 },
  stocks: [
    { sym: 'HAL', price: halPos.target_2_price + 20, ars: 1.9, srs: 1.6, st10: { trend: 'buy', val: 4400 } },
    { sym: 'CASTROLIND', price: 204, ars: 0.8, srs: 0.6, st10: { trend: 'buy', val: 190 } }
  ]
};

const res4 = runJishuEngine(day4Screener);
const halD4 = res4.portfolio.open_positions.find(p => p.sym === 'HAL');
assertTest(halD4 && halD4.sl_moved_to_t1 === true, 'Day 4: Target 2 hit -> SL locked at Target 1 price');
assertTest(halD4 && halD4.current_sl >= halPos.target_1_price, 'Day 4: Guaranteed profit locked in');

// --- DAY 5: Severe Institutional Dump & Circuit Breaker ---
console.log('\n--- DAY 5: Macro Sentinel Circuit Breaker (Panic Dump) ---');
const day5Screener = {
  bhavDate: '2026-10-05',
  sentiment_pillars: {
    score: 24,
    pillars: [{ id: 'volatility', desc: 'VIX at 22.8 (Extreme Fear)' }]
  },
  fii_dii: { fii: -6800, dii: 2100 },
  stocks: [
    { sym: 'HAL', price: halD4.current_sl - 5, ars: 1.2, srs: 0.9, st10: { trend: 'buy', val: 4300 } }, // Hits trailing stop
    { sym: 'CASTROLIND', price: 201, ars: 0.7, srs: 0.5, st10: { trend: 'buy', val: 190 } }
  ]
};

const res5 = runJishuEngine(day5Screener);
assertTest(res5.portfolio.macro_regime.circuitBreakerActive === true, 'Day 5: Circuit breaker activated on panic flows');
assertTest(res5.portfolio.macro_regime.maxAllowedSlots === 0, 'Day 5: Zero new buying slots allowed');

const closedHal = res5.portfolio.closed_trades.find(t => t.sym === 'HAL');
assertTest(closedHal != null && closedHal.realized_pnl > 0, 'Day 5: HAL exited in solid profit via Trailing SL');

// --- DAY 6: Quant Analytics & Self-Correction Engine (Agent 6) ---
console.log('\n--- DAY 6: Agent 6 Quant Analytics & Performance KPIs ---');
const quant = res5.portfolio.quant_metrics;
assertTest(quant != null, 'Day 6: Quant metrics calculated');
assertTest(quant.profitFactor >= 2.0 || quant.profitFactor === 99.9, 'Day 6: High positive Profit Factor verified');
assertTest(quant.expectancy > 0, 'Day 6: Positive trade expectancy confirmed');
assertTest(quant.maxDrawdownPct <= 5.0, 'Day 6: Max Drawdown tightly contained');
assertTest(res5.portfolio.quant_recommendations.length > 0, 'Day 6: Self-Correction feedback insights generated');

console.log('\n=====================================================');
console.log(`🎉 MULTI-AGENT QUANT DESK SIMULATION: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(0)}%)`);
console.log('=====================================================\n');

// Clean reset back to ₹10,00,000 for production baseline
resetPortfolio(1000000, '2026-10-01');

if (passedTests !== totalTests) {
  process.exit(1);
}
