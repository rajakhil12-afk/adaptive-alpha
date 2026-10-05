/**
 * AGENT 5: VOLATILITY-ADJUSTED KELLY & ATR POSITION SIZER
 * 
 * Mathematically sizes positions so that every trade risks an exact percentage
 * of the total portfolio equity (e.g., 1.0% = ₹10,000 max risk per trade).
 * 
 * Formula:
 *   Risk Budget (₹) = Total Equity * RiskPerTradePct (1.0%)
 *   Stop Distance (₹) = Entry Price - Technical Stop Loss Price
 *   Base Position Size (Qty) = Math.floor(Risk Budget / Stop Distance)
 *   Confidence Multiplier: Whale Accumulation (1.15x), Smart Money Buy (1.0x), Base (0.85x)
 *   Final Capital Capped at Max Sleeve Exposure (Max 12% of Portfolio Equity)
 */

function calculatePositionSize({
  stock,
  totalEquity = 1000000,
  availableCash = 1000000,
  sleeveAvailableCapital = 500000,
  smartMoneyFootprint = null,
  riskPctPerTrade = 1.0,      // 1.0% portfolio equity risk
  fixedSlPct = 10.0,          // 10% maximum fallback stop loss
  maxCapitalPerTradePct = 12.0 // Max 12% of equity allocated to 1 stock
}) {
  const entryPrice = stock.price;
  if (!entryPrice || entryPrice <= 0) {
    return { valid: false, reason: 'INVALID_PRICE' };
  }

  // 1. Calculate Dollar Risk Budget
  const equityRiskBudget = (totalEquity * (riskPctPerTrade / 100)); // ₹10,000 for ₹10L portfolio

  // 2. Determine Technical Stop Loss Level
  let stopLossPrice = entryPrice * (1 - (fixedSlPct / 100));
  let stopDistance = entryPrice - stopLossPrice;

  // If Supertrend support is closer and valid (between 3% and 10% distance), use technical ST level
  if (stock.st10 && stock.st10.trend === 'buy' && stock.st10.val && stock.st10.val < entryPrice) {
    const stDistPct = ((entryPrice - stock.st10.val) / entryPrice) * 100;
    if (stDistPct >= 3.0 && stDistPct <= fixedSlPct) {
      stopLossPrice = stock.st10.val;
      stopDistance = entryPrice - stopLossPrice;
    }
  }

  if (stopDistance <= 0) {
    stopDistance = entryPrice * 0.10;
    stopLossPrice = entryPrice - stopDistance;
  }

  // 3. Smart Money / Institutional Confidence Multiplier
  let confidenceMultiplier = 1.0;
  const smScore = smartMoneyFootprint?.score || 50;
  if (smScore >= 85) {
    confidenceMultiplier = 1.15; // 15% size boost for institutional whale setups
  } else if (smScore >= 70) {
    confidenceMultiplier = 1.0;
  } else {
    confidenceMultiplier = 0.85;
  }

  const adjustedRiskBudget = equityRiskBudget * confidenceMultiplier;

  // 4. Calculate Quantity based on Volatility/Stop Distance
  let rawQty = Math.floor(adjustedRiskBudget / stopDistance);
  if (rawQty <= 0) rawQty = 1;

  // 5. Apply Hard Capital Upper Limits
  const maxAllowedCapital = (totalEquity * (maxCapitalPerTradePct / 100));
  const maxCapitalByCash = Math.min(availableCash, sleeveAvailableCapital);
  const effectiveCapitalCap = Math.min(maxAllowedCapital, maxCapitalByCash);

  let finalQty = rawQty;
  if (finalQty * entryPrice > effectiveCapitalCap) {
    finalQty = Math.floor(effectiveCapitalCap / entryPrice);
  }

  const totalInvested = finalQty * entryPrice;

  if (finalQty <= 0 || totalInvested < 10000) {
    return {
      valid: false,
      reason: 'INSUFFICIENT_CAPITAL_OR_SLOT_CAPACITY',
      details: { finalQty, totalInvested, effectiveCapitalCap }
    };
  }

  const actualDollarRisk = finalQty * stopDistance;
  const riskPctOfEquity = Number(((actualDollarRisk / totalEquity) * 100).toFixed(2));
  const stopLossPct = Number(((stopDistance / entryPrice) * 100).toFixed(2));

  // Risk-Reward Targets (1:1 and 1:2)
  const target1Price = Number((entryPrice + (1 * stopDistance)).toFixed(2));
  const target2Price = Number((entryPrice + (2 * stopDistance)).toFixed(2));

  return {
    valid: true,
    qty: finalQty,
    entryPrice: Number(entryPrice.toFixed(2)),
    investedValue: Number(totalInvested.toFixed(2)),
    stopLossPrice: Number(stopLossPrice.toFixed(2)),
    stopDistance: Number(stopDistance.toFixed(2)),
    stopLossPct,
    actualDollarRisk: Number(actualDollarRisk.toFixed(2)),
    riskPctOfEquity,
    confidenceMultiplier,
    target1Price,
    target2Price
  };
}

module.exports = {
  calculatePositionSize
};
