/**
 * Adaptive Alpha — Quantitative Indicator Calculation Engine
 * Pure mathematical algorithms for ARS, SRS, Dual Supertrend, VCP Squeeze,
 * Pocket Pivot Accumulation, Mansfield RS, and Ichimoku Kinko Hyo.
 * Works seamlessly in both browser and Node.js environments.
 */

// Calculate Supertrend (period, multiplier) matching TradingView exactly
function calcSupertrend(candles, period = 10, multiplier = 3) {
  const len = candles ? candles.length : 0;
  if (len < period + 5) return { trend: "sell", signal: null, val: 0 };
  
  const tr = [];
  const hl2 = [];
  
  // Calculate True Range (TR) and HL2 Median Price
  for (let i = 0; i < len; i++) {
    const c = candles[i];
    hl2.push((c.h + c.l) / 2);
    if (i === 0) {
      tr.push(c.h - c.l);
    } else {
      const prevC = candles[i - 1];
      const val1 = c.h - c.l;
      const val2 = Math.abs(c.h - prevC.c);
      const val3 = Math.abs(c.l - prevC.c);
      tr.push(Math.max(val1, val2, val3));
    }
  }
  
  // Calculate ATR using Wilder's Smoothed Moving Average (RMA)
  const atr = new Array(len);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
    atr[i] = sum / (i + 1); // safe initial values
  }
  let currentAtr = sum / period;
  atr[period - 1] = currentAtr;
  
  for (let i = period; i < len; i++) {
    currentAtr = (atr[i - 1] * (period - 1) + tr[i]) / period;
    atr[i] = currentAtr;
  }
  
  // Trailing Bands & Direction calculations
  const up = [];
  const dn = [];
  const supertrend = [];
  const trend = []; // 1 for BUY, -1 for SELL
  
  for (let i = 0; i < len; i++) {
    const c = candles[i];
    const prevC = candles[i - 1] || c;
    const curAtr = atr[i] || tr[i] || 1;
    
    const basicUp = hl2[i] - multiplier * curAtr;
    const basicDn = hl2[i] + multiplier * curAtr;
    
    if (i === 0) {
      up.push(basicUp);
      dn.push(basicDn);
      supertrend.push(c.c >= hl2[i] ? basicUp : basicDn);
      trend.push(c.c >= hl2[i] ? 1 : -1);
      continue;
    }
    
    const prevUp = up[i - 1];
    const prevDn = dn[i - 1];
    
    const finalUp = (basicUp > prevUp || prevC.c < prevUp) ? basicUp : prevUp;
    const finalDn = (basicDn < prevDn || prevC.c > prevDn) ? basicDn : prevDn;
    
    up.push(finalUp);
    dn.push(finalDn);
    
    const prevST = supertrend[i - 1];
    const prevTrend = trend[i - 1];
    
    let currentST = 0;
    let currentTrend = -1;
    
    if (prevTrend === 1) {
      currentST = Math.max(prevST, finalUp);
      if (c.c < currentST) {
        currentTrend = -1;
        currentST = finalDn;
      } else {
        currentTrend = 1;
      }
    } else {
      currentST = Math.min(prevST, finalDn);
      if (c.c > currentST) {
        currentTrend = 1;
        currentST = finalUp;
      } else {
        currentTrend = -1;
      }
    }
    
    supertrend.push(currentST);
    trend.push(currentTrend);
  }
  
  const lastIdx = len - 1;
  const finalTrend = trend[lastIdx];
  const prevFinalTrend = trend[lastIdx - 1];
  
  let signal = null;
  if (prevFinalTrend === -1 && finalTrend === 1) signal = "buy_signal";
  else if (prevFinalTrend === 1 && finalTrend === -1) signal = "sell_signal";
  
  return {
    trend: finalTrend === 1 ? "buy" : "sell",
    signal: signal,
    val: parseFloat((supertrend[lastIdx] || 0).toFixed(2))
  };
}

// Calculate Mansfield Relative Strength (50-period SMA of stock/bench ratio)
function calcMansfieldRS(stockCandles, benchCandles, period = 50) {
  if (!stockCandles || !benchCandles || stockCandles.length < period + 5 || benchCandles.length < period + 5) {
    return { mrs: 0, mrs_trend: false };
  }
  const sLen = stockCandles.length;
  
  const bMap = {};
  benchCandles.forEach(c => {
    bMap[Math.floor(c.t / 86400) * 86400] = c.c;
  });

  const ratios = [];
  for (let i = Math.max(0, sLen - (period + 20)); i < sLen; i++) {
    const sC = stockCandles[i];
    const dKey = Math.floor(sC.t / 86400) * 86400;
    const bClose = bMap[dKey] || bMap[dKey - 86400] || bMap[dKey + 86400] || bMap[dKey - 172800] || null;
    if (bClose && bClose > 0 && sC.c > 0) {
      ratios.push(sC.c / bClose);
    }
  }

  if (ratios.length < period) return { mrs: 0, mrs_trend: false };

  const rLen = ratios.length;
  const currentRatio = ratios[rLen - 1];
  const slice50 = ratios.slice(rLen - period);
  const sma50 = slice50.reduce((sum, v) => sum + v, 0) / period;
  
  const mrs = sma50 > 0 ? ((currentRatio / sma50) - 1) * 100 : 0;
  
  // Check if MRS is expanding/trending upward vs 5 days ago
  let mrsPrev5 = 0;
  if (rLen >= period + 5) {
    const prev5Ratio = ratios[rLen - 6];
    const prev5Slice = ratios.slice(rLen - period - 5, rLen - 5);
    const prev5Sma = prev5Slice.reduce((sum, v) => sum + v, 0) / period;
    mrsPrev5 = prev5Sma > 0 ? ((prev5Ratio / prev5Sma) - 1) * 100 : 0;
  }

  return {
    mrs: parseFloat(mrs.toFixed(2)),
    mrs_trend: mrs > mrsPrev5
  };
}

// Quantitative Volatility Contraction Pattern (VCP) Squeeze & Tightness
function calcVCP(candles) {
  const len = candles ? candles.length : 0;
  if (len < 55) {
    return { is_vcp: false, atr_ratio: 1.0, vol_dryup: 1.0, tightness_pct: 5.0 };
  }

  const tr = [];
  for (let i = 1; i < len; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    tr.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }

  const trLen = tr.length;
  const atr5 = tr.slice(trLen - 5).reduce((s, v) => s + v, 0) / 5;
  const atr20 = tr.slice(trLen - 20).reduce((s, v) => s + v, 0) / 20;
  const atr_ratio = atr20 > 0 ? atr5 / atr20 : 1.0;

  // Volume Dry-up: 5-day Avg Vol / 50-day Avg Vol
  const v5 = candles.slice(len - 5).reduce((s, c) => s + c.v, 0) / 5;
  const v50 = candles.slice(len - 50).reduce((s, c) => s + c.v, 0) / 50;
  const vol_dryup = v50 > 0 ? v5 / v50 : 1.0;

  // Tightness: 5-day high-low price range as % of price
  const last5 = candles.slice(len - 5);
  const maxH5 = Math.max(...last5.map(c => c.h));
  const minL5 = Math.min(...last5.map(c => c.l));
  const tightness_pct = candles[len - 1].c > 0 ? ((maxH5 - minL5) / candles[len - 1].c) * 100 : 10;

  // True VCP Squeeze condition: Volatility compression + Volume dryup + range tightness <= 4.5%
  const is_vcp = atr_ratio <= 0.70 && vol_dryup <= 0.75 && tightness_pct <= 4.5;

  return {
    is_vcp,
    atr_ratio: parseFloat(atr_ratio.toFixed(2)),
    vol_dryup: parseFloat(vol_dryup.toFixed(2)),
    tightness_pct: parseFloat(tightness_pct.toFixed(2))
  };
}

// Institutional Pocket Pivot Accumulation Detector (Gil Morales / Chris Kacher)
function calcPocketPivot(candles) {
  const len = candles ? candles.length : 0;
  if (len < 20) return false;

  const today = candles[len - 1];
  const yest = candles[len - 2];
  const isUpDay = today.c > yest.c;
  if (!isUpDay || today.v <= 0) return false;

  // Find maximum down-day volume in the last 10 sessions (prior to today)
  let maxDownVol = 0;
  for (let i = len - 11; i < len - 1; i++) {
    if (i > 0 && candles[i].c < candles[i - 1].c) {
      if (candles[i].v > maxDownVol) maxDownVol = candles[i].v;
    }
  }

  // Pocket pivot occurs when up-volume exceeds largest down-day volume over past 10 days
  const isPocketPivot = maxDownVol > 0 && today.v > maxDownVol;
  return isPocketPivot;
}

// Calculate Ichimoku Kinko Hyo (9, 26, 52) Daily Breakouts & Cloud status
function calcIchimoku(candles) {
  const len = candles ? candles.length : 0;
  if (len < 52 + 5) {
    return { status: "Neutral", breakout: false, tenkan: 0, kijun: 0, kumoTop: 0, kumoBottom: 0, kumo_buy: false };
  }

  const getHL2 = (slice) => {
    let maxH = -Infinity;
    let minL = Infinity;
    for (let i = 0; i < slice.length; i++) {
      if (slice[i].h > maxH) maxH = slice[i].h;
      if (slice[i].l < minL) minL = slice[i].l;
    }
    return (maxH + minL) / 2;
  };

  const cToday = candles[len - 1];
  const slice9 = candles.slice(len - 9);
  const slice26 = candles.slice(len - 26);
  const slice52 = candles.slice(len - 52);

  const tenkan = getHL2(slice9);
  const kijun = getHL2(slice26);
  const spanB = getHL2(slice52);
  const spanA = (tenkan + kijun) / 2;

  const kumoTop = Math.max(spanA, spanB);
  const kumoBottom = Math.min(spanA, spanB);

  const isBullishCloud = cToday.c > kumoTop;
  const isBearishCloud = cToday.c < kumoBottom;
  const tkCross = tenkan >= kijun;
  const isKumoBuy = isBullishCloud && tkCross;

  let status = "Neutral";
  if (isKumoBuy) status = "Kumo BUY";
  else if (isBullishCloud) status = "Bullish";
  else if (isBearishCloud && tenkan < kijun) status = "Kumo SELL";
  else if (isBearishCloud) status = "Bearish";

  const prevC = candles[len - 2];
  const breakout = prevC.c <= kumoTop && cToday.c > kumoTop;

  return {
    status,
    kumo_buy: isKumoBuy,
    breakout,
    tenkan: parseFloat(tenkan.toFixed(2)),
    kijun: parseFloat(kijun.toFixed(2)),
    kumoTop: parseFloat(kumoTop.toFixed(2)),
    kumoBottom: parseFloat(kumoBottom.toFixed(2))
  };
}

// Calculate Adaptive Relative Strength (ARS) & Shorter-Term Relative Strength (SRS)
function calcARS(stockCandles, benchCandles, cutoffTs) {
  if (!stockCandles || !benchCandles) return null;
  const sLen = stockCandles.length;
  const bLen = benchCandles.length;
  if (sLen < 100 || bLen < 100) return null;

  let sStart = stockCandles.find(c => c.t >= cutoffTs);
  let bStart = benchCandles.find(c => c.t >= cutoffTs);

  if (!sStart || !bStart) {
    sStart = stockCandles[0];
    bStart = benchCandles[0];
  }

  const sToday = stockCandles[sLen - 1];
  const bToday = benchCandles[bLen - 1];
  const sPrev  = stockCandles[sLen - 2];
  const bPrev  = benchCandles[bLen - 2];

  const sRatio = sStart.c > 0 ? sToday.c / sStart.c : 1;
  const bRatio = bStart.c > 0 ? bToday.c / bStart.c : 1;
  const ars = bRatio !== 0 ? (sRatio / bRatio) - 1 : 0;

  const sRatioPrev = sStart.c > 0 ? sPrev.c / sStart.c : 1;
  const bRatioPrev = bStart.c > 0 ? bPrev.c / bStart.c : 1;
  const arsPrev = bRatioPrev !== 0 ? (sRatioPrev / bRatioPrev) - 1 : 0;

  // SRS: rolling 63 trading days (approx 3 months)
  const s63 = stockCandles[Math.max(0, sLen - 64)];
  const b63 = benchCandles[Math.max(0, bLen - 64)];
  const srs = (s63.c > 0 && b63.c > 0) ? ((sToday.c / s63.c) / (bToday.c / b63.c)) - 1 : 0;

  // Volume ratio vs 20-day SMA
  const vSlice = stockCandles.slice(Math.max(0, sLen - 21), sLen - 1);
  const avgVol = vSlice.length > 0 ? vSlice.reduce((s, c) => s + c.v, 0) / vSlice.length : 1;
  const vol_ratio = avgVol > 0 ? sToday.v / avgVol : 1;

  // 52-week High Proximity
  const ySlice = stockCandles.slice(Math.max(0, sLen - 252));
  const max52 = Math.max(...ySlice.map(c => c.h));
  const hi52_prox = max52 > 0 ? (sToday.c - max52) / max52 : 0;

  // Streak tracking (Days since ARS sign flip)
  let signSince = sToday.t;
  let signDays = 0;
  let signPrice = sToday.c;
  const isPos = ars >= 0;

  for (let i = sLen - 1; i >= 0; i--) {
    const sC = stockCandles[i];
    const bC = benchCandles[Math.min(i, bLen - 1)];
    const sR = sStart.c > 0 ? sC.c / sStart.c : 1;
    const bR = bStart.c > 0 ? bC.c / bStart.c : 1;
    const a = bR !== 0 ? (sR / bR) - 1 : 0;

    if ((a >= 0) === isPos) {
      signSince = sC.t;
      signDays++;
      signPrice = sC.c;
    } else {
      break;
    }
  }

  // 50 & 200 Moving Averages
  const slice50 = stockCandles.slice(Math.max(0, sLen - 50));
  const sma50 = slice50.reduce((s, c) => s + c.c, 0) / Math.max(1, slice50.length);
  const slice200 = stockCandles.slice(Math.max(0, sLen - 200));
  const sma200 = slice200.reduce((s, c) => s + c.c, 0) / Math.max(1, slice200.length);
  
  const maAbove50 = sToday.c > sma50;
  const maAbove200 = sToday.c > sma200;
  const ma_status = (maAbove50 && maAbove200) ? 'MA+' : 'MA-';
  
  // 5-day ARS momentum slope
  const sPrev5 = stockCandles[Math.max(0, sLen - 6)];
  const bPrev5 = benchCandles[Math.max(0, bLen - 6)];
  const ars5 = (sStart.c > 0 && bStart.c > 0) ? ((sPrev5.c / sStart.c) / (bPrev5.c / bStart.c)) - 1 : 0;
  const ars_slope = ars - ars5;

  return { 
    ars, 
    srs, 
    vol_ratio, 
    hi52_prox, 
    price: sToday.c, 
    prev: arsPrev, 
    signSince, 
    signDays, 
    signPrice,
    breakout: ars > 0 && arsPrev <= 0, 
    trending: ars > arsPrev,
    ma_status,
    ars_slope
  };
}

// Multi-factor RS Rating Percentile Ranker (1-99)
function computeRSRatings(stocks) {
  const N = stocks ? stocks.length : 0;
  if (N === 0) return stocks;

  const getRanks = (key, customValFn) => {
    const sorted = [...stocks]
      .map((s, idx) => ({ idx, val: customValFn ? customValFn(s) : s[key] }))
      .sort((a, b) => a.val - b.val);
    const ranks = new Array(N);
    sorted.forEach((item, r) => {
      ranks[item.idx] = r / (N - 1 || 1);
    });
    return ranks;
  };

  const ranksArs = getRanks('ars');
  const ranksSrs = getRanks('srs');
  const ranksVol = getRanks('vol_ratio');
  const ranksDays = getRanks(null, s => (s.signDays || 0) * (s.ars >= 0 ? 1 : -1));

  const composites = stocks.map((s, idx) => {
    const composite = (ranksArs[idx] * 0.4) + (ranksSrs[idx] * 0.3) + (ranksVol[idx] * 0.15) + (ranksDays[idx] * 0.15);
    return { idx, composite };
  });

  composites.sort((a, b) => a.composite - b.composite);

  composites.forEach((item, r) => {
    const rating = Math.round(1 + (r / (N - 1 || 1)) * 98);
    stocks[item.idx].rs_rating = rating;
    stocks[item.idx].rs_breakdown = {
      ars_rank: Math.round(1 + ranksArs[item.idx] * 98),
      srs_rank: Math.round(1 + ranksSrs[item.idx] * 98),
      vol_rank: Math.round(1 + ranksVol[item.idx] * 98),
      streak_rank: Math.round(1 + ranksDays[item.idx] * 98)
    };
  });

  return stocks;
}

// Module export for Node.js / Universal export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calcSupertrend,
    calcMansfieldRS,
    calcVCP,
    calcPocketPivot,
    calcIchimoku,
    calcARS,
    computeRSRatings
  };
} else if (typeof window !== 'undefined') {
  window.Indicators = {
    calcSupertrend,
    calcMansfieldRS,
    calcVCP,
    calcPocketPivot,
    calcIchimoku,
    calcARS,
    computeRSRatings
  };
}
