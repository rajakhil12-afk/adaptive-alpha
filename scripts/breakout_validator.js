/**
 * AGENT 2: PRICE ACTION & FALSE BREAKOUT SENTINEL
 * 
 * Screens intraday and daily price action quality to eliminate fake breakouts,
 * bull traps, and top-chasing:
 * 1. Upper Shadow Rejection Filter: Discards candles with >40% upper wick (sellers rejecting highs)
 * 2. Pivot Extension Penalty: Rejects setups extending >8% past pivot base / ST10 support
 * 3. Volume Surge Quality: Requires clean volume accumulation (>1.2x 20MA)
 * 4. Close-to-High Strength (Closing in top 30% of daily range)
 */

function validateBreakoutQuality(stock) {
  const price = stock.price;
  const high = stock.high || price;
  const low = stock.low || price;
  const open = stock.open || price;
  const range = high - low;

  let qualityScore = 100;
  const flags = [];
  const rejections = [];

  // 1. Check Range Validity
  if (range > 0) {
    const bodyTop = Math.max(open, price);
    const upperWick = high - bodyTop;
    const upperWickPct = (upperWick / range) * 100;

    // Severe Upper Wick Rejection (> 40% of range is upper shadow)
    if (upperWickPct > 40.0) {
      rejections.push(`SEVERE_UPPER_WICK_REJECTION (${upperWickPct.toFixed(1)}% upper wick)`);
      qualityScore -= 40;
    }

    // Close-in-Upper-Range Strength (Closing in top 35% of daily range is bullish)
    const closeProximityToHighPct = ((high - price) / range) * 100;
    if (closeProximityToHighPct <= 30.0) {
      flags.push('BULLISH_CLOSE_NEAR_HIGH');
      qualityScore += 10;
    }
  }

  // 2. Pivot Extension Gate (Prevent chasing setups that moved too far from support)
  if (stock.st10 && stock.st10.val && stock.st10.val > 0) {
    const distFromSt = ((price - stock.st10.val) / price) * 100;
    if (distFromSt > 7.5) {
      rejections.push(`OVER_EXTENDED_PIVOT (${distFromSt.toFixed(1)}% above ST10)`);
      qualityScore -= 30;
    }
  }

  // 3. Volume Quality Verification
  const volRatio = stock.vol_ratio || 1.0;
  if (volRatio < 1.2) {
    rejections.push(`INSUFFICIENT_VOLUME (${volRatio.toFixed(2)}x < 1.2x)`);
    qualityScore -= 25;
  } else if (volRatio >= 2.0) {
    flags.push('MASSIVE_VOLUME_SURGE');
    qualityScore += 15;
  }

  // 4. Trend & Moving Average Health
  if (stock.ma_status !== 'MA+') {
    rejections.push('BELOW_KEY_MOVING_AVERAGES');
    qualityScore -= 30;
  }

  const isValid = rejections.length === 0 && qualityScore >= 60;

  return {
    isValid,
    qualityScore: Math.min(100, Math.max(0, qualityScore)),
    flags,
    rejections,
    metrics: {
      volRatio,
      rangeSpread: range > 0 ? Number(((range / price) * 100).toFixed(2)) : 0
    }
  };
}

module.exports = {
  validateBreakoutQuality
};
