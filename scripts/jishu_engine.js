const fs = require('fs');
const path = require('path');

const PORTFOLIO_PATH = path.join(__dirname, '..', 'data', 'jishu_portfolio.json');
const PORTFOLIO_JS_PATH = path.join(__dirname, '..', 'data', 'jishu_portfolio.js');
const SCREENER_PATH = path.join(__dirname, '..', 'data', 'screener.json');

function loadJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`[Jishu] Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function runJishuEngine(customScreenerData = null) {
  const screener = customScreenerData || loadJSON(SCREENER_PATH, null);
  if (!screener || !Array.isArray(screener.stocks) || screener.stocks.length === 0) {
    console.log('[Jishu] No screener data found. Skipping execution.');
    return null;
  }

  let portfolio = loadJSON(PORTFOLIO_PATH, null);
  if (!portfolio) {
    portfolio = {
      bot_name: 'Jishu',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      account: {
        initial_capital: 1000000,
        cash: 1000000,
        invested_capital: 0,
        total_equity: 1000000,
        realized_pnl: 0,
        unrealized_pnl: 0,
        win_rate: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0
      },
      settings: {
        max_positions: 10,
        max_capital_per_trade_pct: 10,
        fixed_sl_pct: 10,
        target_1_rr: 1,
        target_2_rr: 2,
        min_volume_ratio: 1.2,
        min_rs_rating: 75,
        max_distance_from_st_pct: 7.0,
        min_market_sentiment_score: 35
      },
      open_positions: [],
      closed_trades: [],
      daily_equity: [],
      recent_events: []
    };
  } else {
    // Ensure settings are synced with latest rules
    if (!portfolio.settings) portfolio.settings = {};
    portfolio.settings.fixed_sl_pct = 10;
    portfolio.settings.target_1_rr = 1;
    portfolio.settings.target_2_rr = 2;
    portfolio.settings.min_rs_rating = 75;
    portfolio.settings.max_distance_from_st_pct = 7.0;
    portfolio.settings.min_market_sentiment_score = 35;
    
    // Update existing open positions to 10% risk, 1:1 T1 and 1:2 T2
    if (Array.isArray(portfolio.open_positions)) {
      portfolio.open_positions.forEach(pos => {
        const riskPerShare = pos.entry_price * 0.10;
        pos.risk_per_share = Number(riskPerShare.toFixed(2));
        pos.initial_sl = Number((pos.entry_price - riskPerShare).toFixed(2));
        pos.target_1_price = Number((pos.entry_price + (1 * riskPerShare)).toFixed(2));
        pos.target_2_price = Number((pos.entry_price + (2 * riskPerShare)).toFixed(2));
        if (!pos.sl_moved_to_cost && !pos.sl_moved_to_t1) {
          pos.current_sl = pos.initial_sl;
        } else if (pos.sl_moved_to_t1) {
          pos.current_sl = Math.max(pos.current_sl || 0, pos.target_1_price);
        } else if (pos.sl_moved_to_cost) {
          pos.current_sl = Math.max(pos.current_sl || 0, pos.entry_price);
        }
      });
    }
  }

  const currentDateStr = screener.bhavDate || new Date().toISOString().split('T')[0];
  const stocksMap = new Map();
  screener.stocks.forEach(s => stocksMap.set(s.sym, s));

  const events = [];
  const activePositions = [];

  // ==========================================
  // STEP 1: EVALUATE OPEN POSITIONS (EXITS & TRAILING)
  // ==========================================
  for (const pos of portfolio.open_positions) {
    const stock = stocksMap.get(pos.sym);
    if (!stock || typeof stock.price !== 'number' || stock.price <= 0) {
      // Retain position if stock data is missing for today
      activePositions.push(pos);
      continue;
    }

    const curPrice = stock.price;
    pos.highest_price = Math.max(pos.highest_price || pos.entry_price, curPrice);
    pos.current_price = curPrice;
    pos.unrealized_pnl = (curPrice - pos.entry_price) * pos.qty;
    pos.unrealized_pnl_pct = ((curPrice - pos.entry_price) / pos.entry_price) * 100;

    let exitReason = null;
    let exitPrice = curPrice;

    // 1. Check Stop Loss Hits (Initial SL, Cost SL, or Trailing Target 1 SL)
    if (curPrice <= pos.current_sl) {
      if (pos.sl_moved_to_t1) {
        exitReason = 'TRAILING_PROFIT_SL_HIT';
      } else if (pos.sl_moved_to_cost) {
        exitReason = 'COST_SL_HIT';
      } else {
        exitReason = 'STOP_LOSS_HIT';
      }
      exitPrice = curPrice;
    }
    // 2. Check Fixed -10% Drop
    else if (((curPrice - pos.entry_price) / pos.entry_price) <= -(portfolio.settings.fixed_sl_pct / 100)) {
      exitReason = 'FIXED_10_SL';
      exitPrice = curPrice;
    }
    // 3. Check Supertrend Breakdown (if ST10 turns Sell and price is below ST10)
    else if (stock.st10 && stock.st10.trend === 'sell' && curPrice < (stock.st10.val || curPrice)) {
      exitReason = 'SUPERTREND_BREAKDOWN';
      exitPrice = curPrice;
    }
    // 4. Check Quadrant Downgrade (Leaves Quad 1: ARS <= 0 or SRS <= 0)
    else if (stock.ars <= 0 || stock.srs <= 0) {
      exitReason = 'QUAD_DOWNGRADE';
      exitPrice = curPrice;
    }
    // 5. Check Target 2 (1:2 RR Hit -> Move SL to Target 1 price & activate Trailing)
    else if (curPrice >= pos.target_2_price) {
      if (!pos.sl_moved_to_t1) {
        pos.sl_moved_to_t1 = true;
        pos.sl_moved_to_cost = true;
        pos.current_sl = pos.target_1_price; // Locked in Target 1 profit!
        const trailMsg = `🎯 [JISHU TRAIL] ${pos.sym} reached 1:2 Target (₹${pos.target_2_price.toFixed(2)}). Stop Loss adjusted to TARGET 1 (₹${pos.target_1_price.toFixed(2)} / +10% Profit Locked). Running dynamic trailing stop!`;
        console.log(trailMsg);
        events.push({
          timestamp: new Date().toISOString(),
          type: 'TRAILING_SL_TARGET1',
          symbol: pos.sym,
          message: trailMsg
        });
      } else {
        // Dynamic Trailing: trail 10% below peak/current price, guaranteed >= target_1_price
        const dynamicTrail = Number((curPrice * 0.90).toFixed(2));
        if (dynamicTrail > pos.current_sl) {
          pos.current_sl = Math.max(pos.target_1_price, dynamicTrail);
        }
      }
    }
    // 6. Check Target 1 (1:1 RR Hit -> Move SL to Cost Price / Breakeven)
    else if (curPrice >= pos.target_1_price && !pos.sl_moved_to_cost && !pos.sl_moved_to_t1) {
      pos.sl_moved_to_cost = true;
      pos.current_sl = pos.entry_price; // Risk free trade now!
      const trailMsg = `🛡️ [JISHU TRAIL] ${pos.sym} reached 1:1 Target (₹${pos.target_1_price.toFixed(2)}). Stop Loss adjusted to COST PRICE (₹${pos.entry_price.toFixed(2)}). Trade is now RISK-FREE!`;
      console.log(trailMsg);
      events.push({
        timestamp: new Date().toISOString(),
        type: 'TRAILING_SL_COST',
        symbol: pos.sym,
        message: trailMsg
      });
    }

    if (exitReason) {
      const grossProceeds = exitPrice * pos.qty;
      const realizedTradePnl = (exitPrice - pos.entry_price) * pos.qty;
      const returnPct = ((exitPrice - pos.entry_price) / pos.entry_price) * 100;

      portfolio.account.cash += grossProceeds;
      portfolio.account.realized_pnl += realizedTradePnl;
      portfolio.account.total_trades += 1;
      if (realizedTradePnl > 0) {
        portfolio.account.winning_trades += 1;
      } else {
        portfolio.account.losing_trades += 1;
      }

      const closedTrade = {
        sym: pos.sym,
        name: pos.name,
        ind: pos.ind,
        entry_date: pos.entry_date,
        exit_date: currentDateStr,
        entry_price: pos.entry_price,
        exit_price: exitPrice,
        qty: pos.qty,
        invested_value: pos.invested_value,
        realized_pnl: realizedTradePnl,
        return_pct: returnPct,
        exit_reason: exitReason,
        highest_price: pos.highest_price
      };
      portfolio.closed_trades.unshift(closedTrade);

      const isProfit = realizedTradePnl >= 0;
      const exitBadge = isProfit ? '🎯 [JISHU TARGET HIT]' : '🛑 [JISHU STOP LOSS]';
      const exitMsg = `${exitBadge} Closed ${pos.sym} at ₹${exitPrice.toFixed(2)} | Reason: ${exitReason} | PnL: ₹${realizedTradePnl.toFixed(2)} (${returnPct.toFixed(2)}%)`;
      console.log(exitMsg);
      events.push({
        timestamp: new Date().toISOString(),
        type: 'TRADE_EXIT',
        symbol: pos.sym,
        reason: exitReason,
        pnl: realizedTradePnl,
        return_pct: returnPct,
        message: exitMsg
      });
    } else {
      activePositions.push(pos);
    }
  }

  portfolio.open_positions = activePositions;

  // ==========================================
  // STEP 2: EVALUATE NEW ENTRIES WITH REGIME & PROXIMITY GATES
  // ==========================================
  const maxPositions = portfolio.settings.max_positions || 10;
  const heldSymbols = new Set(portfolio.open_positions.map(p => p.sym));
  const openSlots = maxPositions - portfolio.open_positions.length;

  // Macro Gate: Check Market Sentiment and Severe Institutional Outflow
  const marketSentimentScore = screener.sentiment_pillars?.score ?? 50;
  const fiiNet = screener.fii_dii?.fii ?? 0;
  const minSentiment = portfolio.settings.min_market_sentiment_score || 35;
  const isMarketHostile = marketSentimentScore < minSentiment || fiiNet < -6000;

  if (isMarketHostile && openSlots > 0) {
    const pauseMsg = `🛡️ [JISHU MACRO GATE] New entries paused to protect capital (Market Sentiment: ${marketSentimentScore}/100 | FII: ₹${fiiNet} Cr). Preserving cash.`;
    console.log(pauseMsg);
    events.push({
      timestamp: new Date().toISOString(),
      type: 'MACRO_REGIME_PAUSE',
      message: pauseMsg
    });
  }

  if (openSlots > 0 && portfolio.account.cash >= 10000 && !isMarketHostile) {
    const minRs = portfolio.settings.min_rs_rating || 75;
    const maxDistSt = portfolio.settings.max_distance_from_st_pct || 7.0;
    const minVolRatio = portfolio.settings.min_volume_ratio || 1.2;

    const candidates = screener.stocks.filter(s => {
      if (heldSymbols.has(s.sym)) return false;
      if (!s.price || s.price < 20) return false;
      
      // 1. Must be in Quad 1 (Power Leader: ARS > 0 & SRS > 0)
      if (s.ars <= 0 || s.srs <= 0) return false;
      
      // 2. High Relative Strength Rating (Top Tier: RS Rating >= 75)
      if ((s.rs_rating || 0) < minRs) return false;
      
      // 3. Supertrend 10/3 must be Bullish Buy
      if (!s.st10 || s.st10.trend !== 'buy') return false;
      
      // 4. No-Chase Pivot Proximity Gate: Must be within <= 7% of Supertrend support
      if (s.st10.val && s.st10.val > 0) {
        const distFromSt = ((s.price - s.st10.val) / s.price) * 100;
        if (distFromSt > maxDistSt) return false;
      }
      
      // 5. Volume confirmation (>= 1.2x 20MA volume)
      if (!s.vol_ratio || s.vol_ratio < minVolRatio) return false;
      
      // 6. Trend filter: MA+ (Price above 50 & 200 EMA)
      if (s.ma_status !== 'MA+') return false;
      
      return true;
    });

    // Score & rank candidates with Institutional Accumulation & Pattern bonuses
    candidates.sort((a, b) => {
      const isInstA = a.institutional?.ad_grade === 'A+' || a.institutional?.ad_grade === 'A' ? 15 : 0;
      const isInstB = b.institutional?.ad_grade === 'A+' || b.institutional?.ad_grade === 'A' ? 15 : 0;
      const patternA = (a.vcp?.is_vcp ? 10 : 0) + (a.pocket_pivot?.is_pivot ? 10 : 0);
      const patternB = (b.vcp?.is_vcp ? 10 : 0) + (b.pocket_pivot?.is_pivot ? 10 : 0);
      
      const scoreA = (a.rs_rating || 50) * 0.4 + (a.vol_ratio || 1) * 20 + (a.ars_slope || 0) * 10 + isInstA + patternA;
      const scoreB = (b.rs_rating || 50) * 0.4 + (b.vol_ratio || 1) * 20 + (b.ars_slope || 0) * 10 + isInstB + patternB;
      return scoreB - scoreA;
    });

    const selectedEntries = candidates.slice(0, openSlots);

    for (const stock of selectedEntries) {
      const maxAllocPerTrade = (portfolio.account.initial_capital * portfolio.settings.max_capital_per_trade_pct) / 100; // ₹1,00,000
      const availablePerSlot = portfolio.account.cash / (maxPositions - portfolio.open_positions.length);
      const allocatedCapital = Math.min(maxAllocPerTrade, availablePerSlot, portfolio.account.cash);

      if (allocatedCapital < 10000 || allocatedCapital < stock.price) continue;

      const qty = Math.floor(allocatedCapital / stock.price);
      if (qty <= 0) continue;

      const entryPrice = stock.price;
      const investedValue = qty * entryPrice;

      // Risk calculation: fixed 10% risk or distance to Supertrend
      const fixedRiskPct = portfolio.settings.fixed_sl_pct / 100; // 0.10
      const riskPerShare = entryPrice * fixedRiskPct;
      const initialSl = entryPrice - riskPerShare;
      const target1Price = entryPrice + (portfolio.settings.target_1_rr * riskPerShare); // 1:1 RR
      const target2Price = entryPrice + (portfolio.settings.target_2_rr * riskPerShare); // 1:2 RR

      portfolio.account.cash -= investedValue;

      const newPosition = {
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        logoid: stock.logoid,
        entry_date: currentDateStr,
        entry_price: entryPrice,
        qty: qty,
        invested_value: investedValue,
        initial_sl: Number(initialSl.toFixed(2)),
        current_sl: Number(initialSl.toFixed(2)),
        risk_per_share: Number(riskPerShare.toFixed(2)),
        target_1_price: Number(target1Price.toFixed(2)),
        target_2_price: Number(target2Price.toFixed(2)),
        sl_moved_to_cost: false,
        sl_moved_to_t1: false,
        highest_price: entryPrice,
        current_price: entryPrice,
        unrealized_pnl: 0,
        unrealized_pnl_pct: 0
      };

      portfolio.open_positions.push(newPosition);

      const buyMsg = `🟢 [JISHU BUY ORDER] ${stock.sym} (${stock.name || stock.sym}) @ ₹${entryPrice.toFixed(2)} | Qty: ${qty} | Total: ₹${investedValue.toFixed(2)} | SL: ₹${initialSl.toFixed(2)} (-${portfolio.settings.fixed_sl_pct}%) | Target 1 (1:1): ₹${target1Price.toFixed(2)} | Target 2 (1:2): ₹${target2Price.toFixed(2)}`;
      console.log(buyMsg);
      events.push({
        timestamp: new Date().toISOString(),
        type: 'BUY_ORDER',
        symbol: stock.sym,
        entry_price: entryPrice,
        qty: qty,
        target_1: target1Price,
        target_2: target2Price,
        sl: initialSl,
        message: buyMsg
      });
    }
  }

  // ==========================================
  // STEP 3: UPDATE AGGREGATE ACCOUNT METRICS
  // ==========================================
  let totalInvested = 0;
  let totalUnrealizedPnl = 0;

  for (const pos of portfolio.open_positions) {
    const curP = pos.current_price || pos.entry_price;
    totalInvested += curP * pos.qty;
    totalUnrealizedPnl += (curP - pos.entry_price) * pos.qty;
  }

  portfolio.account.invested_capital = Number(totalInvested.toFixed(2));
  portfolio.account.unrealized_pnl = Number(totalUnrealizedPnl.toFixed(2));
  portfolio.account.total_equity = Number((portfolio.account.cash + totalInvested).toFixed(2));
  portfolio.account.win_rate = portfolio.account.total_trades > 0 
    ? Number(((portfolio.account.winning_trades / portfolio.account.total_trades) * 100).toFixed(1)) 
    : 0;

  portfolio.last_updated = new Date().toISOString();

  // Snapshot daily equity
  const lastSnapshot = portfolio.daily_equity[portfolio.daily_equity.length - 1];
  if (!lastSnapshot || lastSnapshot.date !== currentDateStr) {
    portfolio.daily_equity.push({
      date: currentDateStr,
      cash: Number(portfolio.account.cash.toFixed(2)),
      invested: Number(totalInvested.toFixed(2)),
      total_equity: Number(portfolio.account.total_equity.toFixed(2)),
      realized_pnl: Number(portfolio.account.realized_pnl.toFixed(2)),
      unrealized_pnl: Number(totalUnrealizedPnl.toFixed(2)),
      open_positions_count: portfolio.open_positions.length
    });
  } else {
    lastSnapshot.cash = Number(portfolio.account.cash.toFixed(2));
    lastSnapshot.invested = Number(totalInvested.toFixed(2));
    lastSnapshot.total_equity = Number(portfolio.account.total_equity.toFixed(2));
    lastSnapshot.realized_pnl = Number(portfolio.account.realized_pnl.toFixed(2));
    lastSnapshot.unrealized_pnl = Number(totalUnrealizedPnl.toFixed(2));
    lastSnapshot.open_positions_count = portfolio.open_positions.length;
  }

  if (events.length > 0) {
    portfolio.recent_events = [...events, ...(portfolio.recent_events || [])].slice(0, 50);
  }

  saveJSON(PORTFOLIO_PATH, portfolio);
  try {
    fs.writeFileSync(PORTFOLIO_JS_PATH, 'window.STATIC_JISHU_PORTFOLIO = ' + JSON.stringify(portfolio, null, 2) + ';', 'utf8');
  } catch (jsErr) {
    console.warn('[Jishu] Could not write jishu_portfolio.js:', jsErr.message);
  }
  console.log(`[Jishu] Execution finished. Total Equity: ₹${portfolio.account.total_equity} | Open Positions: ${portfolio.open_positions.length} | Realized PnL: ₹${portfolio.account.realized_pnl}`);

  return {
    portfolio,
    events,
    date: currentDateStr
  };
}

function resetPortfolio(initialCapital = 1000000, startDate = '2026-10-01') {
  const currentDateStr = startDate;
  const freshPortfolio = {
    bot_name: 'Jishu',
    version: '2.0.0',
    created_at: `${startDate}T09:15:00.000Z`,
    last_updated: `${startDate}T14:00:00.000Z`,
    account: {
      initial_capital: initialCapital,
      cash: initialCapital,
      invested_capital: 0,
      total_equity: initialCapital,
      realized_pnl: 0,
      unrealized_pnl: 0,
      win_rate: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0
    },
    settings: {
      max_positions: 10,
      max_capital_per_trade_pct: 10,
      fixed_sl_pct: 10,
      target_1_rr: 1,
      target_2_rr: 2,
      min_volume_ratio: 1.2,
      min_rs_rating: 75,
      max_distance_from_st_pct: 7.0,
      min_market_sentiment_score: 35
    },
    open_positions: [],
    closed_trades: [],
    daily_equity: [
      {
        date: currentDateStr,
        cash: initialCapital,
        invested: 0,
        total_equity: initialCapital,
        realized_pnl: 0,
        unrealized_pnl: 0,
        open_positions_count: 0
      }
    ],
    recent_events: [
      {
        timestamp: `${startDate}T09:15:00.000Z`,
        type: 'PORTFOLIO_RESET',
        message: `🚀 Jishu Institutional Desk fresh launch on 01 Oct 2026 with ₹${initialCapital.toLocaleString('en-IN')} starting capital.`
      }
    ]
  };

  saveJSON(PORTFOLIO_PATH, freshPortfolio);
  try {
    fs.writeFileSync(PORTFOLIO_JS_PATH, 'window.STATIC_JISHU_PORTFOLIO = ' + JSON.stringify(freshPortfolio, null, 2) + ';', 'utf8');
  } catch (jsErr) {
    console.warn('[Jishu] Could not write jishu_portfolio.js:', jsErr.message);
  }
  console.log(`[Jishu] Portfolio reset to ₹${initialCapital.toLocaleString('en-IN')} (Start Date: ${startDate}) completed.`);
  return freshPortfolio;
}

module.exports = {
  runJishuEngine,
  resetPortfolio,
  PORTFOLIO_PATH
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--reset')) {
    resetPortfolio();
  } else {
    runJishuEngine();
  }
}
