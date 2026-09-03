const fs = require('fs');
const path = require('path');

const PORTFOLIO_PATH = path.join(__dirname, '..', 'data', 'jishu_portfolio.json');
const SCREENER_PATH = path.join(__dirname, '..', 'data', 'screener.json');

function loadJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error([Jishu] Error reading :, err.message);
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
        fixed_sl_pct: 3.618,
        target_1_rr: 2,
        target_2_rr: 3,
        min_volume_ratio: 1.2,
        min_rs_rating: 70
      },
      open_positions: [],
      closed_trades: [],
      daily_equity: [],
      recent_events: []
    };
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

    // 1. Check Target 2 (1:3 Target Hit -> Full Profit Booking)
    if (curPrice >= pos.target_2_price) {
      exitReason = 'TARGET_1_3_HIT';
      exitPrice = curPrice;
    }
    // 2. Check Stop Loss Hits
    else if (curPrice <= pos.current_sl) {
      exitReason = pos.sl_moved_to_cost ? 'COST_SL_HIT' : 'STOP_LOSS_HIT';
      exitPrice = curPrice;
    }
    // 3. Check Fixed -3.618% Drop
    else if (((curPrice - pos.entry_price) / pos.entry_price) <= -(portfolio.settings.fixed_sl_pct / 100)) {
      exitReason = 'FIXED_3.618_SL';
      exitPrice = curPrice;
    }
    // 4. Check Supertrend Breakdown (if ST10 turns Sell and price is below ST10)
    else if (stock.st10 && stock.st10.trend === 'sell' && curPrice < (stock.st10.val || curPrice)) {
      exitReason = 'SUPERTREND_BREAKDOWN';
      exitPrice = curPrice;
    }
    // 5. Check Quadrant Downgrade (Leaves Quad 1: ARS <= 0 or SRS <= 0)
    else if (stock.ars <= 0 || stock.srs <= 0) {
      exitReason = 'QUAD_DOWNGRADE';
      exitPrice = curPrice;
    }
    // 6. Check Target 1 (1:2 RR Hit -> Move SL to Cost Price / Breakeven)
    else if (curPrice >= pos.target_1_price && !pos.sl_moved_to_cost) {
      pos.sl_moved_to_cost = true;
      pos.current_sl = pos.entry_price; // Risk free trade now!
      const trailMsg = 🛡️ [JISHU TRAIL]  reached 1:2 Target (₹). Stop Loss adjusted to COST PRICE (₹). Trade is now RISK-FREE!;
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
      const exitMsg = ${exitBadge} Closed  at ₹ | Reason:  | PnL: ₹ (%);
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
  // STEP 2: EVALUATE NEW ENTRIES (QUAD 1 + SUPERTREND)
  // ==========================================
  const maxPositions = portfolio.settings.max_positions || 10;
  const heldSymbols = new Set(portfolio.open_positions.map(p => p.sym));
  const openSlots = maxPositions - portfolio.open_positions.length;

  if (openSlots > 0 && portfolio.account.cash >= 10000) {
    const candidates = screener.stocks.filter(s => {
      if (heldSymbols.has(s.sym)) return false;
      if (!s.price || s.price < 20) return false;
      // 1. Must be in Quad 1 (Power Leader: ARS > 0 & SRS > 0)
      if (s.ars <= 0 || s.srs <= 0) return false;
      // 2. Supertrend 10/3 must be Bullish Buy
      if (!s.st10 || s.st10.trend !== 'buy') return false;
      // 3. Volume confirmation (>= 1.2x 20MA volume)
      if (!s.vol_ratio || s.vol_ratio < portfolio.settings.min_volume_ratio) return false;
      // 4. Trend filter: MA+ (Price above 50 & 200 EMA)
      if (s.ma_status !== 'MA+') return false;
      return true;
    });

    // Score & rank candidates by institutional momentum
    candidates.sort((a, b) => {
      const scoreA = (a.rs_rating || 50) * 0.4 + (a.vol_ratio || 1) * 20 + (a.ars_slope || 0) * 10;
      const scoreB = (b.rs_rating || 50) * 0.4 + (b.vol_ratio || 1) * 20 + (b.ars_slope || 0) * 10;
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

      // Risk calculation: fixed 3.618% risk or distance to Supertrend
      const fixedRiskPct = portfolio.settings.fixed_sl_pct / 100; // 0.03618
      const riskPerShare = entryPrice * fixedRiskPct;
      const initialSl = entryPrice - riskPerShare;
      const target1Price = entryPrice + (portfolio.settings.target_1_rr * riskPerShare); // 1:2 RR
      const target2Price = entryPrice + (portfolio.settings.target_2_rr * riskPerShare); // 1:3 RR

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
        highest_price: entryPrice,
        current_price: entryPrice,
        unrealized_pnl: 0,
        unrealized_pnl_pct: 0
      };

      portfolio.open_positions.push(newPosition);

      const buyMsg = 🟢 [JISHU BUY ORDER]  () @ ₹ | Qty:  | Total: ₹ | SL: ₹ (-%) | Target 1 (1:2): ₹ | Target 2 (1:3): ₹;
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
  console.log([Jishu] Execution finished. Total Equity: ₹ | Open Positions:  | Realized PnL: ₹);

  return {
    portfolio,
    events,
    date: currentDateStr
  };
}

module.exports = {
  runJishuEngine,
  PORTFOLIO_PATH
};

if (require.main === module) {
  runJishuEngine();
}
