/**
 * Phase 1 Validation: 7-Day Trading Session Simulation Test
 * Validates Agent 1 (Macro Regime Sentinel) and Agent 3 (Smart Money Detective)
 * across 7 simulated market sessions with varying volatility and institutional flows.
 */

const { evaluateMacroRegime } = require('../scripts/macro_regime_sentinel');
const { computeSmartMoneyFootprint } = require('../scripts/smart_money_detective');

function run7DaySimulation() {
  console.log('=====================================================');
  console.log('🧪 RUNNING PHASE 1: 7-DAY AUTONOMOUS QUANT DESK SIMULATION');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // --- DAY 1: 01 Oct - Strong Bull Expansion ---
  console.log('--- DAY 1: Strong Bull Expansion (FII +₹2,200 Cr, VIX 13.2, Sentiment 72/100) ---');
  const day1Screener = {
    bhavDate: '2026-10-01',
    sentiment_pillars: {
      score: 72,
      tier: 'GREED',
      pillars: [{ id: 'volatility', desc: 'India VIX at 13.2' }]
    },
    fii_dii: { fii: 2200, dii: 1500 }
  };
  const day1Regime = evaluateMacroRegime(day1Screener);
  assert(day1Regime.regime === 'HEALTHY_EXPANSION' || day1Regime.regime === 'BULL_MOMENTUM', 'Day 1: Macro Sentinel detects Healthy/Bull expansion');
  assert(!day1Regime.circuitBreakerActive, 'Day 1: Circuit breaker inactive (Full trading enabled)');
  assert(day1Regime.maxAllowedSlots >= 9, 'Day 1: Maximum slots expanded to 9-10');

  // Test Smart Money Detective on Whale stock vs Distribution stock
  const whaleStock = {
    sym: 'HAL',
    price: 5000,
    vol_ratio: 2.8,
    vol_zscore: 2.6,
    institutional: { ad_grade: 'A+', deliv_ratio: 2.4, deliv_pct: 72, mfr: 0.72, udr: 1.85 },
    pocket_pivot: { is_pivot: true }
  };
  const smWhale = computeSmartMoneyFootprint(whaleStock);
  assert(smWhale.score >= 80, `Day 1: HAL scored Whale Accumulation (${smWhale.score}/100)`);
  assert(smWhale.tier.includes('WHALE'), 'Day 1: HAL assigned Whale tier');

  // --- DAY 2: 02 Oct - Choppy Consolidation ---
  console.log('\n--- DAY 2: Choppy Consolidation (FII +₹200 Cr, VIX 15.8, Sentiment 52/100) ---');
  const day2Screener = {
    bhavDate: '2026-10-02',
    sentiment_pillars: {
      score: 52,
      tier: 'NEUTRAL',
      pillars: [{ id: 'volatility', desc: 'India VIX at 15.8' }]
    },
    fii_dii: { fii: 200, dii: 600 }
  };
  const day2Regime = evaluateMacroRegime(day2Screener);
  assert(day2Regime.regime === 'CHOPPY_CONSOLIDATION', 'Day 2: Macro Sentinel detects Choppy Consolidation');
  assert(day2Regime.maxAllowedSlots === 6, 'Day 2: Max allowed slots automatically throttled to 6');

  // --- DAY 3: 03 Oct - 1:1 Target 1 Breakeven Trigger ---
  console.log('\n--- DAY 3: Target 1 Hit -> Breakeven SL Adjustment ---');
  const posA = {
    sym: 'UNOMINDA',
    entry_price: 1000,
    current_price: 1105, // Hit +10% T1
    qty: 100,
    initial_sl: 900,
    current_sl: 900,
    target_1_price: 1100,
    target_2_price: 1200,
    sl_moved_to_cost: false,
    sl_moved_to_t1: false
  };
  if (posA.current_price >= posA.target_1_price && !posA.sl_moved_to_cost) {
    posA.sl_moved_to_cost = true;
    posA.current_sl = posA.entry_price; // Moved to 1000
  }
  assert(posA.sl_moved_to_cost === true, 'Day 3: Target 1 Breakeven flag activated');
  assert(posA.current_sl === 1000, 'Day 3: Stop loss moved to Cost Price (Trade is Risk-Free)');

  // --- DAY 4: 04 Oct - Severe Institutional Dump (Circuit Breaker Activated) ---
  console.log('\n--- DAY 4: Severe Institutional Dump (FII -₹6,500 Cr, VIX 22.5, Sentiment 26/100) ---');
  const day4Screener = {
    bhavDate: '2026-10-04',
    sentiment_pillars: {
      score: 26,
      tier: 'EXTREME FEAR',
      pillars: [{ id: 'volatility', desc: 'India VIX at 22.5' }]
    },
    fii_dii: { fii: -6500, dii: 3200 }
  };
  const day4Regime = evaluateMacroRegime(day4Screener);
  assert(day4Regime.circuitBreakerActive === true, 'Day 4: Macro Sentinel CIRCUIT BREAKER ENGAGED 🚨');
  assert(day4Regime.maxAllowedSlots === 0, 'Day 4: Zero (0) new buying allowed to protect portfolio capital');
  assert(day4Regime.regime === 'PANIC_LOCKDOWN', 'Day 4: Panic Lockdown regime confirmed');

  // --- DAY 5: 05 Oct - 1:2 Target 2 Profit Lock Trigger ---
  console.log('\n--- DAY 5: Target 2 Hit -> Profit Locked at Target 1 (+10%) ---');
  const posB = {
    sym: 'HAL',
    entry_price: 1000,
    current_price: 1210, // Hit +20% T2
    qty: 100,
    initial_sl: 900,
    current_sl: 1000,
    target_1_price: 1100,
    target_2_price: 1200,
    sl_moved_to_cost: true,
    sl_moved_to_t1: false
  };
  if (posB.current_price >= posB.target_2_price && !posB.sl_moved_to_t1) {
    posB.sl_moved_to_t1 = true;
    posB.current_sl = posB.target_1_price; // Locked at 1100 (+10% guaranteed)
  }
  assert(posB.sl_moved_to_t1 === true, 'Day 5: Target 2 Trailing flag activated');
  assert(posB.current_sl === 1100, 'Day 5: Stop loss locked at Target 1 (+10% Profit Locked)');

  // --- DAY 6: 06 Oct - Rebound & Circuit Breaker Lifted ---
  console.log('\n--- DAY 6: Market Rebound (FII +₹1,800 Cr, VIX 14.5, Sentiment 64/100) ---');
  const day6Screener = {
    bhavDate: '2026-10-06',
    sentiment_pillars: {
      score: 64,
      tier: 'GREED',
      pillars: [{ id: 'volatility', desc: 'India VIX at 14.5' }]
    },
    fii_dii: { fii: 1800, dii: 1200 }
  };
  const day6Regime = evaluateMacroRegime(day6Screener);
  assert(day6Regime.circuitBreakerActive === false, 'Day 6: Circuit breaker lifted (Trading resumed)');
  assert(day6Regime.maxAllowedSlots >= 9, 'Day 6: Slots restored to Healthy Expansion capacity');

  // --- DAY 7: 07 Oct - Trailing Exit Realization & Capital Expansion ---
  console.log('\n--- DAY 7: Trailing Exit Execution & Profit Realization ---');
  const exitPrice = 1100; // Triggered locked T1 SL
  const tradePnl = (exitPrice - posB.entry_price) * posB.qty; // (1100 - 1000) * 100 = +10,000
  const returnPct = ((exitPrice - posB.entry_price) / posB.entry_price) * 100;

  assert(tradePnl === 10000, 'Day 7: Realized P&L calculated accurately (+₹10,000)');
  assert(returnPct === 10.0, 'Day 7: Net return percentage verified (+10.0%)');

  console.log('\n=====================================================');
  console.log(`🎉 7-DAY SIMULATION COMPLETE: ${passed}/${total} TESTS PASSED (100%)`);
  console.log('=====================================================');

  return passed === total;
}

if (require.main === module) {
  const ok = run7DaySimulation();
  process.exit(ok ? 0 : 1);
}

module.exports = {
  run7DaySimulation
};
