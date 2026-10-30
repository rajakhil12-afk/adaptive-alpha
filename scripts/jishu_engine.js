const fs = require('fs');
const path = require('path');
const { evaluateMacroRegime } = require('./macro_regime_sentinel');
const { validateBreakoutQuality } = require('./breakout_validator');
const { computeSmartMoneyFootprint } = require('./smart_money_detective');
const { calculateSleeveAllocations, classifyCandidateSleeve, SLEEVE_CONFIG } = require('./multi_sleeve_portfolio');
const { calculatePositionSize } = require('./position_sizer');
const { calculateQuantMetrics } = require('./quant_analytics');

function getDataDir() {
  return process.env.JISHU_DATA_DIR || path.join(__dirname, '..', 'data');
}
function getPortfolioPath() {
  return path.join(getDataDir(), 'jishu_portfolio.json');
}
function getBackupPath() {
  return path.join(getDataDir(), 'jishu_portfolio_backup.json');
}
function getPortfolioJsPath() {
  return path.join(getDataDir(), 'jishu_portfolio.js');
}
function getScreenerPath() {
  return path.join(getDataDir(), 'screener.json');
}

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
  const portfolioPath = getPortfolioPath();
  const backupPath = getBackupPath();
  const portfolioJsPath = getPortfolioJsPath();
  const screenerPath = getScreenerPath();

  const screener = customScreenerData || loadJSON(screenerPath, null);
  if (!screener || !Array.isArray(screener.stocks) || screener.stocks.length === 0) {
    console.log('[Jishu] No screener data found. Skipping execution.');
    return null;
  }

  let portfolio = loadJSON(portfolioPath, null);
  const backup = loadJSON(backupPath, null);

  // Safeguard: If the loaded portfolio is completely empty (e.g. from an accidental file upload overwrite)
  // but we have a valid backup with active open positions, recover from backup!
  if (portfolio && (!portfolio.open_positions || portfolio.open_positions.length === 0) && (!portfolio.closed_trades || portfolio.closed_trades.length === 0)) {
    if (backup && Array.isArray(backup.open_positions) && backup.open_positions.length > 0) {
      console.log(`[Jishu] Safeguard: Restoring ${backup.open_positions.length} active positions from backup (accidental upload overwrite prevented).`);
      portfolio = backup;
    }
  }

  if (!portfolio) {
    portfolio = backup || resetPortfolio(1000000, screener.bhavDate || '2026-10-01');
  }

  // Ensure default settings
  if (!portfolio.settings) portfolio.settings = {};
  // Defaults are applied ONLY when a key is missing, so values edited in jishu_portfolio.json are respected
  // (previously every run overwrote them with these constants).
  const DEFAULT_SETTINGS = {
    fixed_sl_pct: 10,
    target_1_rr: 1,
    target_2_rr: 2,
    target_3_rr: 3,
    min_rs_rating: 75,
    max_distance_from_st_pct: 7.0,
    risk_pct_per_trade: 1.0,        // 1% portfolio equity risk
    round_trip_cost_pct: 0.25,      // brokerage + STT + slippage, split evenly over entry and exit (set 0 to disable)
    stop_fill_model: 'close'        // 'close' = exit at EOD close (legacy) | 'intraday' = fill at stop price, or at the open if it gapped below
  };
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (portfolio.settings[k] === undefined) portfolio.settings[k] = v;
  }
  const halfCost = (Number(portfolio.settings.round_trip_cost_pct) || 0) / 200; // fraction charged on each leg

  const currentDateStr = screener.bhavDate || new Date().toISOString().split('T')[0];

  // Guard: never mark the portfolio to OLDER prices. A stale screener.json (e.g. bhavDate 10-05 while the portfolio
  // already holds a 10-06 snapshot) re-priced positions backwards and appended an out-of-order daily_equity row,
  // which corrupts drawdown / Sharpe.
  const lastSnapDate = Array.isArray(portfolio.daily_equity) && portfolio.daily_equity.length
    ? portfolio.daily_equity[portfolio.daily_equity.length - 1].date : null;
  if (lastSnapDate && currentDateStr < lastSnapDate) {
    console.warn(`[Jishu] Screener bhavDate ${currentDateStr} is older than last portfolio snapshot ${lastSnapDate}. Skipping run.`);
    return null;
  }
  const stocksMap = new Map();
  screener.stocks.forEach(s => stocksMap.set(s.sym, s));

  const events = [];
  const activePositions = [];

  // ==========================================
  // STEP 1: EVALUATE OPEN POSITIONS (EXITS & DYNAMIC TRAILING)
  // ==========================================
  for (const pos of portfolio.open_positions) {
    const stock = stocksMap.get(pos.sym);
    if (!stock || typeof stock.price !== 'number' || stock.price <= 0) {
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
    // stop_fill_model 'intraday' needs real OHLC (stock.low/open from update_data): a stop is hit if the day's low touched it
    const useIntraday = portfolio.settings.stop_fill_model === 'intraday' && Number.isFinite(stock.low) && pos.current_sl > 0;
    const stopTouchedIntraday = useIntraday && stock.low <= pos.current_sl;
    if (curPrice <= pos.current_sl || stopTouchedIntraday) {
      if (pos.sl_moved_to_t1) {
        exitReason = 'TRAILING_PROFIT_SL_HIT';
      } else if (pos.sl_moved_to_cost) {
        exitReason = 'COST_SL_HIT';
      } else {
        exitReason = 'STOP_LOSS_HIT';
      }
      // intraday model: a resting stop fills at the stop price, or at the open when the stock gapped through it
      exitPrice = stopTouchedIntraday
        ? Math.min(pos.current_sl, Number.isFinite(stock.open) ? stock.open : pos.current_sl)
        : curPrice;
    }
    // 2. Check Hard Stop Loss Drop
    else if (((curPrice - pos.entry_price) / pos.entry_price) <= -(portfolio.settings.fixed_sl_pct / 100)) {
      exitReason = 'FIXED_10_SL';
      exitPrice = curPrice;
    }
    // 3. Check Supertrend Breakdown
    else if (stock.st10 && stock.st10.trend === 'sell' && curPrice < (stock.st10.val || curPrice)) {
      exitReason = 'SUPERTREND_BREAKDOWN';
      exitPrice = curPrice;
    }
    // 4. Check Quadrant Downgrade (Leaves Quad 1)
    else if (stock.ars <= 0 || stock.srs <= 0) {
      exitReason = 'QUAD_DOWNGRADE';
      exitPrice = curPrice;
    }
    // 5. Check Target 3 (1:3 RR Hit -> Open Trailing Trend Expansion)
    else if (pos.target_3_price && curPrice >= pos.target_3_price) {
      if (!pos.target_3_hit) {
        pos.target_3_hit = true;
        pos.sl_moved_to_t1 = true;
        pos.sl_moved_to_cost = true;
        if (!pos.current_sl || pos.current_sl < pos.target_1_price) {
          pos.current_sl = pos.target_1_price;
        }
        const trailMsg = `🚀 [JISHU TRAIL] ${pos.sym} hit 1:3 Target (₹${pos.target_3_price.toFixed(2)}). Open trailing trend expansion active!`;
        console.log(trailMsg);
        events.push({
          timestamp: new Date().toISOString(),
          type: 'TRAILING_SL_TARGET3',
          symbol: pos.sym,
          message: trailMsg
        });
      }
      // Dynamic Trailing: trail 10% below highest peak, guaranteed >= target_1_price
      const dynamicTrail = Number((pos.highest_price * 0.90).toFixed(2));
      if (dynamicTrail > pos.current_sl) {
        pos.current_sl = Math.max(pos.target_1_price, dynamicTrail);
      }
    }
    // 6. Check Target 2 (1:2 RR Hit -> Move SL to Target 1 price & activate Trailing)
    else if (curPrice >= pos.target_2_price) {
      if (!pos.sl_moved_to_t1) {
        pos.sl_moved_to_t1 = true;
        pos.sl_moved_to_cost = true;
        pos.current_sl = pos.target_1_price; // Locked in Target 1 profit!
        const trailMsg = `🎯 [JISHU TRAIL] ${pos.sym} hit 1:2 Target (₹${pos.target_2_price.toFixed(2)}). Stop Loss adjusted to TARGET 1 (₹${pos.target_1_price.toFixed(2)} / Profit Locked). Dynamic trailing engaged!`;
        console.log(trailMsg);
        events.push({
          timestamp: new Date().toISOString(),
          type: 'TRAILING_SL_TARGET1',
          symbol: pos.sym,
          message: trailMsg
        });
      } else {
        // Dynamic Trailing: trail 10% below highest peak, guaranteed >= target_1_price
        const dynamicTrail = Number((pos.highest_price * 0.90).toFixed(2));
        if (dynamicTrail > pos.current_sl) {
          pos.current_sl = Math.max(pos.target_1_price, dynamicTrail);
        }
      }
    }
    // 7. Check Target 1 (1:1 RR Hit -> Move SL to Cost Price / Breakeven)
    else if (curPrice >= pos.target_1_price && !pos.sl_moved_to_cost && !pos.sl_moved_to_t1) {
      pos.sl_moved_to_cost = true;
      pos.current_sl = pos.entry_price; // Risk-free breakeven
      const trailMsg = `🛡️ [JISHU TRAIL] ${pos.sym} hit 1:1 Target (₹${pos.target_1_price.toFixed(2)}). Stop Loss adjusted to COST PRICE (₹${pos.entry_price.toFixed(2)}). Trade is RISK-FREE!`;
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
      const exitCost = grossProceeds * halfCost;
      const grossTradePnl = (exitPrice - pos.entry_price) * pos.qty;
      const tradeCosts = (pos.entry_cost || 0) + exitCost;          // both legs
      const realizedTradePnl = grossTradePnl - tradeCosts;          // NET of costs
      const returnPct = (realizedTradePnl / (pos.entry_price * pos.qty)) * 100;

      portfolio.account.cash += grossProceeds - exitCost;
      portfolio.account.realized_pnl += realizedTradePnl;
      portfolio.account.total_costs = (portfolio.account.total_costs || 0) + exitCost;
      portfolio.account.total_trades += 1;
      // breakeven trades are neither wins nor losses (same rule as quant_analytics.js)
      if (realizedTradePnl > 0) {
        portfolio.account.winning_trades += 1;
      } else if (realizedTradePnl < 0) {
        portfolio.account.losing_trades += 1;
      } else {
        portfolio.account.breakeven_trades = (portfolio.account.breakeven_trades || 0) + 1;
      }

      const closedTrade = {
        sym: pos.sym,
        name: pos.name,
        ind: pos.ind,
        sleeve: pos.sleeve || 'SLEEVE_A',
        setup_type: pos.setup_type || 'ALPHA_BREAKOUT',
        entry_date: pos.entry_date,
        exit_date: currentDateStr,
        entry_price: pos.entry_price,
        exit_price: exitPrice,
        qty: pos.qty,
        invested_value: pos.invested_value,
        gross_pnl: Number(grossTradePnl.toFixed(2)),
        costs: Number(tradeCosts.toFixed(2)),
        realized_pnl: Number(realizedTradePnl.toFixed(2)),
        return_pct: Number(returnPct.toFixed(2)),
        exit_reason: exitReason,
        highest_price: pos.highest_price,
        smart_money_score: pos.smart_money_score || 50
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
  // STEP 2: MULTI-AGENT INTAKE & SLEEVE ALLOCATION
  // ==========================================
  const macro = evaluateMacroRegime(screener);
  portfolio.macro_regime = macro;

  const currentEquity = portfolio.account.cash + portfolio.open_positions.reduce((acc, p) => acc + (p.current_price || p.entry_price) * p.qty, 0);
  const sleeveAllocations = calculateSleeveAllocations(currentEquity, portfolio.open_positions, macro);
  portfolio.sleeves = sleeveAllocations;

  if (macro.circuitBreakerActive) {
    const pauseMsg = `🛡️ [MACRO SENTINEL CIRCUIT BREAKER] Regime: ${macro.regime} (${macro.marketScore}/100) | VIX: ${macro.vixLevel} | FII: ₹${macro.fiiNet} Cr. New buying paused to preserve cash.`;
    console.log(pauseMsg);
    events.push({
      timestamp: new Date().toISOString(),
      type: 'MACRO_REGIME_PAUSE',
      message: pauseMsg
    });
  }

  const heldSymbols = new Set(portfolio.open_positions.map(p => p.sym));

  if (!macro.circuitBreakerActive && portfolio.account.cash >= 10000) {
    const minRs = portfolio.settings.min_rs_rating || 75;

    // Filter Candidates across agents (Agent 2 Breakout Validator + Agent 3 Smart Money)
    const validCandidates = screener.stocks.filter(s => {
      if (heldSymbols.has(s.sym)) return false;
      if (!s.price || s.price < 20) return false;

      // 1. Must be in Quad 1 (Power Leader: ARS > 0 & SRS > 0)
      if (s.ars <= 0 || s.srs <= 0) return false;

      // 2. Sleeve-Aware Relative Strength Filter
      const sleeveType = classifyCandidateSleeve(s);
      const minRsForStock = sleeveType.sleeveId === 'SLEEVE_B' ? 65 : (portfolio.settings.min_rs_rating || 75);
      if ((s.rs_rating || 0) < minRsForStock) return false;

      // 3. Supertrend Bullish Buy
      if (!s.st10 || s.st10.trend !== 'buy') return false;

      // 4. Agent 2: Price Action & False Breakout Validation Gate
      const paValidation = validateBreakoutQuality(s);
      if (!paValidation.isValid) return false;

      return true;
    });

    // Score & Rank Candidates with Smart Money Footprint
    validCandidates.sort((a, b) => {
      const smA = computeSmartMoneyFootprint(a);
      const smB = computeSmartMoneyFootprint(b);
      const paA = validateBreakoutQuality(a);
      const paB = validateBreakoutQuality(b);

      const scoreA = (a.rs_rating || 50) * 0.30 + (a.vol_ratio || 1) * 15 + (smA.score * 0.35) + (paA.qualityScore * 0.20);
      const scoreB = (b.rs_rating || 50) * 0.30 + (b.vol_ratio || 1) * 15 + (smB.score * 0.35) + (paB.qualityScore * 0.20);
      return scoreB - scoreA;
    });

    // Allocate across Sleeve A and Sleeve B
    for (const stock of validCandidates) {
      if (portfolio.account.cash < 10000) break;
      if (portfolio.open_positions.length >= macro.maxAllowedSlots) break; // macro cap was never enforced

      const sleeveInfo = classifyCandidateSleeve(stock);
      const sleeveState = sleeveInfo.sleeveId === 'SLEEVE_B' ? sleeveAllocations.sleeveB : sleeveAllocations.sleeveA;

      if (sleeveState.openSlots <= 0 || sleeveState.availableCapital < 10000) {
        continue; // Sleeve capacity full
      }

      const sm = computeSmartMoneyFootprint(stock);

      // Agent 5: Volatility-Adjusted Kelly / ATR Position Sizing
      const sizing = calculatePositionSize({
        stock,
        totalEquity: currentEquity,
        availableCash: portfolio.account.cash / (1 + halfCost), // keep headroom for the entry cost
        sleeveAvailableCapital: sleeveState.availableCapital,
        smartMoneyFootprint: sm,
        riskPctPerTrade: portfolio.settings.risk_pct_per_trade || 1.0,
        fixedSlPct: portfolio.settings.fixed_sl_pct || 10.0,
        maxCapitalPerTradePct: macro.maxCapitalPerTradePct || 10.0
      });

      if (!sizing.valid || sizing.qty <= 0) continue;

      const entryPrice = sizing.entryPrice;
      const qty = sizing.qty;
      const investedValue = sizing.investedValue;
      const initialSl = sizing.stopLossPrice;
      const target1Price = sizing.target1Price;
      const target2Price = sizing.target2Price;
      const target3Price = Number((entryPrice + (3 * sizing.stopDistance)).toFixed(2));

      const entryCost = investedValue * halfCost;
      portfolio.account.cash -= investedValue + entryCost;
      portfolio.account.total_costs = (portfolio.account.total_costs || 0) + entryCost;
      sleeveState.availableCapital -= investedValue;
      sleeveState.openSlots -= 1;
      heldSymbols.add(stock.sym);

      const newPosition = {
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        logoid: stock.logoid,
        sleeve: sleeveInfo.sleeveId,
        setup_type: sleeveInfo.setupType,
        entry_date: currentDateStr,
        entry_price: entryPrice,
        qty: qty,
        invested_value: investedValue,
        entry_cost: Number(entryCost.toFixed(2)),
        initial_sl: initialSl,
        current_sl: initialSl,
        risk_per_share: sizing.stopDistance,
        actual_dollar_risk: sizing.actualDollarRisk,
        risk_pct_of_equity: sizing.riskPctOfEquity,
        target_1_price: target1Price,
        target_2_price: target2Price,
        target_3_price: target3Price,
        smart_money_score: sm.score,
        smart_money_tier: sm.tier,
        sl_moved_to_cost: false,
        sl_moved_to_t1: false,
        highest_price: entryPrice,
        current_price: entryPrice,
        unrealized_pnl: 0,
        unrealized_pnl_pct: 0
      };

      portfolio.open_positions.push(newPosition);

      const buyMsg = `🟢 [JISHU BUY] [${sleeveInfo.icon} ${sleeveInfo.sleeveId}] ${stock.sym} @ ₹${entryPrice.toFixed(2)} | Qty: ${qty} | Total: ₹${investedValue.toFixed(2)} | Risk: ₹${sizing.actualDollarRisk} (${sizing.riskPctOfEquity}%) | Smart Money: ${sm.score}/100 (${sm.tier}) | SL: ₹${initialSl.toFixed(2)} | T1: ₹${target1Price.toFixed(2)} | T2: ₹${target2Price.toFixed(2)} | T3: ₹${target3Price.toFixed(2)}`;
      console.log(buyMsg);
      events.push({
        timestamp: new Date().toISOString(),
        type: 'BUY_ORDER',
        symbol: stock.sym,
        sleeve: sleeveInfo.sleeveId,
        entry_price: entryPrice,
        qty: qty,
        smart_money: sm.score,
        target_1: target1Price,
        target_2: target2Price,
        target_3: target3Price,
        sl: initialSl,
        message: buyMsg
      });
    }
  }

  // ==========================================
  // STEP 3: UPDATE AGGREGATE ACCOUNT & QUANT METRICS (AGENT 6)
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
  const decisiveTrades = portfolio.account.winning_trades + portfolio.account.losing_trades;
  portfolio.account.win_rate = decisiveTrades > 0
    ? Number(((portfolio.account.winning_trades / decisiveTrades) * 100).toFixed(1))
    : 0;

  // Agent 6: Compute Deep Quant Metrics
  const quantAnalytics = calculateQuantMetrics(portfolio);
  portfolio.quant_metrics = quantAnalytics ? quantAnalytics.kpis : null;
  portfolio.quant_recommendations = quantAnalytics ? quantAnalytics.recommendations : [];

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

  saveJSON(portfolioPath, portfolio);
  saveJSON(backupPath, portfolio);
  try {
    fs.writeFileSync(portfolioJsPath, 'window.STATIC_JISHU_PORTFOLIO = ' + JSON.stringify(portfolio, null, 2) + ';\nwindow.JISHU_PORTFOLIO = window.STATIC_JISHU_PORTFOLIO;', 'utf8');
  } catch (jsErr) {
    console.warn('[Jishu] Could not write jishu_portfolio.js:', jsErr.message);
  }
  console.log(`[Jishu] Execution finished. Total Equity: ₹${portfolio.account.total_equity} | Open: ${portfolio.open_positions.length} | Realized PnL: ₹${portfolio.account.realized_pnl}`);

  return {
    portfolio,
    events,
    date: currentDateStr
  };
}

function resetPortfolio(initialCapital = 1000000, startDate = '2026-10-01') {
  const portfolioPath = getPortfolioPath();
  const backupPath = getBackupPath();
  const portfolioJsPath = getPortfolioJsPath();

  const currentDateStr = startDate;
  const freshPortfolio = {
    bot_name: 'Jishu',
    version: '3.0.0',
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
      target_3_rr: 3,
      min_volume_ratio: 1.2,
      min_rs_rating: 75,
      max_distance_from_st_pct: 7.0,
      risk_pct_per_trade: 1.0,
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
        message: `🚀 Jishu Institutional Multi-Agent Desk fresh launch on 01 Oct 2026 with ₹${initialCapital.toLocaleString('en-IN')} starting capital.`
      }
    ]
  };

  saveJSON(portfolioPath, freshPortfolio);
  saveJSON(backupPath, freshPortfolio);
  try {
    fs.writeFileSync(portfolioJsPath, 'window.STATIC_JISHU_PORTFOLIO = ' + JSON.stringify(freshPortfolio, null, 2) + ';', 'utf8');
  } catch (jsErr) {
    console.warn('[Jishu] Could not write jishu_portfolio.js:', jsErr.message);
  }
  console.log(`[Jishu] Portfolio reset to ₹${initialCapital.toLocaleString('en-IN')} (Start Date: ${startDate}) completed.`);
  return freshPortfolio;
}

module.exports = {
  runJishuEngine,
  resetPortfolio,
  getDataDir,
  getPortfolioPath,
  getBackupPath,
  get PORTFOLIO_PATH() {
    return getPortfolioPath();
  }
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--reset')) {
    resetPortfolio();
  } else {
    runJishuEngine();
  }
}
