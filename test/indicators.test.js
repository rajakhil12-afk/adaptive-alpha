const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calcSupertrend,
  calcMansfieldRS,
  calcVCP,
  calcPocketPivot,
  calcIchimoku,
  calcARS,
  computeRSRatings
} = require('../js/indicators');

// Helper to generate synthetic test candles
function generateCandles(count, basePrice = 100, trend = 0.5, baseVol = 1000) {
  const candles = [];
  let price = basePrice;
  const startTs = 1609459200; // 2021-01-01 in epoch seconds

  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i * 0.2) * 2) + trend;
    const open = price;
    price = Math.max(1, price + change);
    const high = Math.max(open, price) + 1.5;
    const low = Math.min(open, price) - 1.5;
    const close = price;
    const vol = Math.max(100, Math.round(baseVol + Math.cos(i) * 200));

    candles.push({
      t: startTs + (i * 86400),
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(close.toFixed(2)),
      v: vol
    });
  }
  return candles;
}

test('Supertrend calculation — uptrend detection and buy signal', () => {
  // Generate a steadily climbing price series
  const candles = generateCandles(30, 100, 2.0);
  const result = calcSupertrend(candles, 10, 3);

  assert.ok(result, 'Supertrend should return an object');
  assert.strictEqual(result.trend, 'buy', 'Steadily climbing candles should have a BUY trend');
  assert.ok(result.val > 0, 'Supertrend value should be positive');
  assert.ok(result.val < candles[candles.length - 1].c, 'Supertrend stop line should be below current price in uptrend');
});

test('Supertrend calculation — insufficient candles fallback', () => {
  const shortCandles = generateCandles(5);
  const result = calcSupertrend(shortCandles, 10, 3);

  assert.deepStrictEqual(result, { trend: 'sell', signal: null, val: 0 });
});

test('Pocket Pivot Detector — identifies institutional volume accumulation', () => {
  const candles = generateCandles(25, 100, 0);

  // Set past 10 days down volume to max 1500
  const len = candles.length;
  for (let i = len - 11; i < len - 1; i++) {
    if (i % 2 === 0) {
      candles[i].c = candles[i - 1].c - 1; // down day
      candles[i].v = 1500;
    }
  }

  // Today is an up-day with surge volume of 3500 (exceeds 1500 max down vol)
  candles[len - 1].c = candles[len - 2].c + 5; // strong up day
  candles[len - 1].v = 3500;

  const isPocket = calcPocketPivot(candles);
  assert.strictEqual(isPocket, true, 'Should detect pocket pivot when up-day volume exceeds 10-day max down-volume');

  // Negative test: down day today should NOT trigger pocket pivot
  candles[len - 1].c = candles[len - 2].c - 2; // down day
  assert.strictEqual(calcPocketPivot(candles), false, 'Down-day should never trigger pocket pivot');
});

test('VCP Squeeze Detector — validates volatility and volume compression', () => {
  const candles = generateCandles(60, 100, 0);
  const len = candles.length;

  // Make the last 6 days tightly compressed in range and low volume
  for (let i = len - 6; i < len; i++) {
    candles[i].o = 100.2;
    candles[i].h = 100.8;
    candles[i].l = 100.0;
    candles[i].c = 100.5;
    if (i >= len - 5) {
      candles[i].v = 200; // dried up volume compared to 1000 base
    }
  }

  const vcp = calcVCP(candles);
  assert.ok(vcp, 'VCP should return an analysis object');
  assert.ok(typeof vcp.is_vcp === 'boolean');
  assert.ok(vcp.atr_ratio <= 0.70, 'ATR ratio should be compressed');
  assert.ok(vcp.vol_dryup <= 0.75, 'Volume should be dried up');
  assert.strictEqual(vcp.is_vcp, true, 'Tight contraction should trigger is_vcp true');
});

test('Mansfield Relative Strength — computes benchmark outperformance', () => {
  const stock = generateCandles(70, 100, 1.5); // Stock climbing fast
  const bench = generateCandles(70, 100, 0.2); // Benchmark flat/slow

  const mrs = calcMansfieldRS(stock, bench, 50);
  assert.ok(mrs, 'MRS should return an object');
  assert.ok(mrs.mrs > 0, 'Outperforming stock should have positive MRS score');
  assert.strictEqual(typeof mrs.mrs_trend, 'boolean');
});

test('RS Rating Multi-Factor Ranker — ranks composite stocks between 1 and 99', () => {
  const mockStocks = [
    { sym: 'LEADER', ars: 1.50, srs: 0.30, vol_ratio: 2.5, signDays: 120 },
    { sym: 'MID',    ars: 0.20, srs: 0.05, vol_ratio: 1.1, signDays: 30 },
    { sym: 'LAGGER', ars: -0.40, srs: -0.20, vol_ratio: 0.6, signDays: 10 }
  ];

  const ranked = computeRSRatings(mockStocks);

  assert.strictEqual(ranked.length, 3);
  const leader = ranked.find(s => s.sym === 'LEADER');
  const lagger = ranked.find(s => s.sym === 'LAGGER');

  assert.ok(leader.rs_rating >= 90, 'Leader should receive high RS Rating (>= 90)');
  assert.ok(lagger.rs_rating <= 15, 'Lagger should receive low RS Rating (<= 15)');
  assert.ok(leader.rs_breakdown.ars_rank >= lagger.rs_breakdown.ars_rank);
});
