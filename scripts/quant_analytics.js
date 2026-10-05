/**
 * AGENT 6: QUANT POST-TRADE ANALYTICS & SELF-CORRECTION LEARNER
 * 
 * Computes deep mathematical statistics and institutional performance metrics:
 * 1. Profit Factor (Sum of Gains / Sum of Losses)
 * 2. Sharpe Ratio & Sortino Ratio
 * 3. Max Drawdown (MDD % Peak-to-Trough)
 * 4. Expectancy per Trade & Payoff Ratio (Avg Win / Avg Loss)
 * 5. Multi-Sleeve Performance Breakdown (Sleeve A vs Sleeve B)
 * 6. AI Self-Correction Feedback Loop with actionable strategy refinements
 */

function calculateQuantMetrics(portfolio) {
  if (!portfolio) return null;

  const closedTrades = portfolio.closed_trades || [];
  const dailyEquity = portfolio.daily_equity || [];
  const initialCap = portfolio.account?.initial_capital || 1000000;
  const currentEquity = portfolio.account?.total_equity || initialCap;

  let totalGains = 0;
  let totalLosses = 0;
  let winCount = 0;
  let lossCount = 0;
  let winHoldDays = 0;
  let lossHoldDays = 0;

  const sleeveStats = {
    SLEEVE_A: { name: 'Alpha Breakout', trades: 0, wins: 0, losses: 0, pnl: 0 },
    SLEEVE_B: { name: 'Leader Dip / Retest', trades: 0, wins: 0, losses: 0, pnl: 0 }
  };

  closedTrades.forEach(t => {
    const pnl = t.realized_pnl || 0;
    const sleeveKey = (t.sleeve === 'SLEEVE_B' || t.setup_type === 'LEADER_DIP') ? 'SLEEVE_B' : 'SLEEVE_A';
    
    sleeveStats[sleeveKey].trades += 1;
    sleeveStats[sleeveKey].pnl += pnl;

    if (pnl > 0) {
      totalGains += pnl;
      winCount += 1;
      sleeveStats[sleeveKey].wins += 1;
    } else if (pnl < 0) {
      totalLosses += Math.abs(pnl);
      lossCount += 1;
      sleeveStats[sleeveKey].losses += 1;
    }
  });

  const totalTrades = winCount + lossCount;
  const winRatePct = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
  const avgWin = winCount > 0 ? Number((totalGains / winCount).toFixed(2)) : 0;
  const avgLoss = lossCount > 0 ? Number((totalLosses / lossCount).toFixed(2)) : 0;
  const payoffRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : (avgWin > 0 ? 99.9 : 0);

  // Profit Factor
  const profitFactor = totalLosses > 0 
    ? Number((totalGains / totalLosses).toFixed(2)) 
    : (totalGains > 0 ? 99.9 : 0);

  // Mathematical Expectancy: (Win% * AvgWin) - (Loss% * AvgLoss)
  const winProb = winRatePct / 100;
  const lossProb = (100 - winRatePct) / 100;
  const expectancy = Number(((winProb * avgWin) - (lossProb * avgLoss)).toFixed(2));

  // Max Drawdown Calculation from daily_equity series
  let peakEquity = initialCap;
  let maxDrawdownPct = 0;
  let maxDrawdownValue = 0;

  dailyEquity.forEach(snap => {
    const eq = snap.total_equity || snap.cash || initialCap;
    if (eq > peakEquity) {
      peakEquity = eq;
    }
    const ddVal = peakEquity - eq;
    const ddPct = peakEquity > 0 ? (ddVal / peakEquity) * 100 : 0;
    if (ddPct > maxDrawdownPct) {
      maxDrawdownPct = ddPct;
      maxDrawdownValue = ddVal;
    }
  });

  // Calculate Daily Returns for Sharpe & Sortino
  let sharpeRatio = 0;
  let sortinoRatio = 0;

  if (dailyEquity.length >= 3) {
    const returns = [];
    for (let i = 1; i < dailyEquity.length; i++) {
      const prev = dailyEquity[i - 1].total_equity || initialCap;
      const curr = dailyEquity[i].total_equity || initialCap;
      returns.push((curr - prev) / prev);
    }

    if (returns.length > 0) {
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const riskFreeDaily = 0.065 / 252; // 6.5% annual risk-free rate for India

      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        sharpeRatio = Number((((avgReturn - riskFreeDaily) / stdDev) * Math.sqrt(252)).toFixed(2));
      }

      // Downside Deviation for Sortino
      const downsideVariance = returns.reduce((sum, r) => {
        const diff = Math.min(0, r - riskFreeDaily);
        return sum + Math.pow(diff, 2);
      }, 0) / returns.length;
      const downsideStdDev = Math.sqrt(downsideVariance);

      if (downsideStdDev > 0) {
        sortinoRatio = Number((((avgReturn - riskFreeDaily) / downsideStdDev) * Math.sqrt(252)).toFixed(2));
      }
    }
  }

  // Self-Correction Recommendations
  const recommendations = [];

  if (profitFactor >= 2.0) {
    recommendations.push({
      type: 'OPTIMAL_PERFORMANCE',
      badge: '🌟 HIGH_EDGE',
      text: `Outstanding Profit Factor (${profitFactor}x). The 1:1 Breakeven and 1:2 Trailing floor are capturing asymmetric upside.`
    });
  } else if (profitFactor < 1.0 && totalTrades >= 5) {
    recommendations.push({
      type: 'RISK_ADJUSTMENT',
      badge: '⚠️ CAUTION',
      text: `Profit factor (${profitFactor}x) is below parity. Recommend tightening RS filter from 75 to 80 and pruning low volume setups.`
    });
  }

  if (maxDrawdownPct > 5.0) {
    recommendations.push({
      type: 'DRAWDOWN_ALERT',
      badge: '🛡️ CAPITAL_GUARD',
      text: `Portfolio drawdown reached ${maxDrawdownPct.toFixed(1)}%. Macro Sentinel circuit breaker active to enforce capital conservation.`
    });
  } else {
    recommendations.push({
      type: 'CAPITAL_HEALTH',
      badge: '✅ STABLE',
      text: `Capital curve is well-protected. Max Drawdown contained at ${maxDrawdownPct.toFixed(1)}% (Institutional standard < 8%).`
    });
  }

  // Sleeve comparison insight
  const sleeveAWinRate = sleeveStats.SLEEVE_A.trades > 0 
    ? ((sleeveStats.SLEEVE_A.wins / sleeveStats.SLEEVE_A.trades) * 100).toFixed(0) 
    : '0';
  const sleeveBWinRate = sleeveStats.SLEEVE_B.trades > 0 
    ? ((sleeveStats.SLEEVE_B.wins / sleeveStats.SLEEVE_B.trades) * 100).toFixed(0) 
    : '0';

  return {
    kpis: {
      profitFactor,
      sharpeRatio,
      sortinoRatio,
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      maxDrawdownValue: Number(maxDrawdownValue.toFixed(2)),
      payoffRatio,
      expectancy,
      totalGains: Number(totalGains.toFixed(2)),
      totalLosses: Number(totalLosses.toFixed(2)),
      totalClosedTrades: totalTrades,
      winRatePct
    },
    sleeves: {
      sleeveA: {
        ...sleeveStats.SLEEVE_A,
        winRate: Number(sleeveAWinRate)
      },
      sleeveB: {
        ...sleeveStats.SLEEVE_B,
        winRate: Number(sleeveBWinRate)
      }
    },
    recommendations
  };
}

module.exports = {
  calculateQuantMetrics
};
