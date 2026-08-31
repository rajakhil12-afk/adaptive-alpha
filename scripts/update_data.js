const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function fetchFiiDiiData() {
  return new Promise((resolve) => {
    const url = 'https://fii-diidata.mrchartist.com/api/data';
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.date) {
            resolve({
              date: parsed.date,
              fii: parsed.fii_net || 0,
              dii: parsed.dii_net || 0
            });
            return;
          }
        } catch (e) {}
        resolve(null);
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

const scratchDir = path.resolve(__dirname, '..');
const dataDir = path.join(scratchDir, 'data');
const outputJson = path.join(dataDir, 'screener.json');

// Ensure output directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let logoIds = {};
try {
  logoIds = JSON.parse(fs.readFileSync(path.join(dataDir, 'logo_ids.json'), 'utf8') || '{}');
} catch(e) {
  console.log('Warning: logo_ids.json cache not found or unreadable.');
}

// Load centralized universe and mappings
const { N50, EXTRA, MIDCAP100, SMALLCAP100, N500_REST, UNIVERSE, toYF } = require('../config/universe');

// Download helper — used for non-NSE URLs (Yahoo Finance etc)
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close(() => {
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        });
        return;
      }
      if (response.statusCode !== 200) {
        file.close(() => {
          fs.unlink(dest, () => {
            reject(new Error(`Failed to download: HTTP ${response.statusCode} from ${url}`));
          });
        });
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      file.close(() => {
        fs.unlink(dest, () => reject(err));
      });
    });
  });
}

// NSE requires a real browser session with cookies.
// Step 1: Visit nseindia.com to get session cookies (nsit, nseappid).
// Step 2: Use those cookies to download the Bhavcopy zip.
// We use curl (always available on Linux/macOS) because it handles
// cookie jars and redirects far more reliably than Node's https module.
function downloadNSEWithCurl(url, dest, cookieFile) {
  // Build curl command — shell-safe using single-quoted strings
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
  if (process.platform === 'win32') {
    // Windows fallback: use PowerShell Invoke-WebRequest
    execSync(
      `powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${dest}' -UserAgent '${ua}' -UseBasicParsing"`,
      { stdio: 'pipe', timeout: 60000 }
    );
  } else {
    execSync(
      `curl -L -f -s --retry 3 --retry-delay 3 --max-time 90 ` +
      `-A '${ua}' ` +
      `-H 'Referer: https://www.nseindia.com/' ` +
      `-H 'Accept: application/zip,application/octet-stream,*/*;q=0.8' ` +
      `-H 'Accept-Language: en-US,en;q=0.9' ` +
      `-c '${cookieFile}' ` +
      `-b '${cookieFile}' ` +
      `-o '${dest}' ` +
      `'${url}'`,
      { stdio: 'pipe', timeout: 90000 }
    );
  }
}

// Fetch historical charts from Yahoo Finance (single attempt)
function fetchYahooOnce(ticker, range = '6y') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=1d`;
  return new Promise((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000 // 15s timeout
    };
    const req = https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`  Yahoo HTTP ${res.statusCode} for ${ticker}`);
        res.resume();
        return resolve(null);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json?.chart?.result?.[0];
          if (!result) {
            console.warn(`  Yahoo returned no chart result for ${ticker}`);
            return resolve(null);
          }
          const ts    = result.timestamp || [];
          const q     = result.indicators?.quote?.[0] || {};
          const close = q.close  || [];
          const high  = q.high   || [];
          const low   = q.low    || [];
          const vol   = q.volume || [];
          const candles = [];
          for (let i = 0; i < ts.length; i++) {
            if (close[i] != null) {
              candles.push({ 
                t: ts[i], 
                c: close[i], 
                h: high[i] !== undefined && high[i] !== null ? high[i] : close[i], 
                l: low[i] !== undefined && low[i] !== null ? low[i] : close[i], 
                v: vol[i] || 0 
              });
            }
          }
          resolve(candles);
        } catch(e) {
          console.warn(`  Yahoo JSON parse error for ${ticker}: ${e.message}`);
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      console.warn(`  Yahoo timeout for ${ticker}`);
      req.destroy();
      resolve(null);
    });

    req.on('error', (err) => {
      console.warn(`  Yahoo network error for ${ticker}: ${err.message}`);
      resolve(null);
    });
  });
}

// Fetch Yahoo data with retry logic
async function fetchYahoo(ticker, range = '6y', maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await fetchYahooOnce(ticker, range);
    if (result && result.length > 0) return result;
    if (attempt < maxRetries) {
      console.warn(`  Retry ${attempt}/${maxRetries} for ${ticker}...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  return null;
}

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
  const bLen = benchCandles.length;
  
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

  // True VCP Squeeze condition: Volatility compression + Volume dryup + range tightness <= 4%
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
    return { status: "Neutral", breakout: false, tenkan: 0, kijun: 0, kumoTop: 0, kumoBottom: 0 };
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

  const cPrev = candles[len - 2];
  const prevSlice9 = candles.slice(len - 10, len - 1);
  const prevSlice26 = candles.slice(len - 27, len - 1);
  const prevSlice52 = candles.slice(len - 53, len - 1);

  const prevTenkan = getHL2(prevSlice9);
  const prevKijun = getHL2(prevSlice26);
  const prevSpanB = getHL2(prevSlice52);
  const prevSpanA = (prevTenkan + prevKijun) / 2;
  const prevKumoTop = Math.max(prevSpanA, prevSpanB);

  const isKumoBuy = cToday.c > kumoTop && tenkan > kijun;
  const isKumoBreakout = isKumoBuy && cPrev.c <= prevKumoTop;

  let status = "Neutral";
  if (isKumoBuy) status = "Kumo BUY";
  else if (cToday.c < kumoBottom && tenkan < kijun) status = "Kumo SELL";

  return {
    status,
    breakout: isKumoBreakout,
    tenkan: parseFloat(tenkan.toFixed(2)),
    kijun: parseFloat(kijun.toFixed(2)),
    kumoTop: parseFloat(kumoTop.toFixed(2)),
    kumoBottom: parseFloat(kumoBottom.toFixed(2))
  };
}

function findHeader(headers, options) {
  for (const opt of options) {
    const idx = headers.indexOf(opt);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Parse UDiFF CSV contents
function parseBhavcopy(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  if (lines.length < 2) return {};

  const headers = lines[0].split(',').map(h => h.trim());
  const symbolIdx = findHeader(headers, ['TckrSymb', 'SYMBOL', 'SYMBOL_NAME', 'FinInstrmId']);
  const closeIdx  = findHeader(headers, ['ClsPric', 'ClsgPric', 'CLOSE', 'CLOSE_PRICE']);
  const volIdx    = findHeader(headers, ['TtlTradgVol', 'TtlTrdedQty', 'TOTTRDQTY', 'VOLUME']);
  const seriesIdx = findHeader(headers, ['SctySrs', 'SERIES', 'SERIES_NAME']);

  if (symbolIdx === -1 || closeIdx === -1) {
    console.error('Invalid Bhavcopy headers:', headers);
    return {};
  }

  const dataMap = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < headers.length) continue;
    
    const symbol = cols[symbolIdx];
    const series = seriesIdx !== -1 ? cols[seriesIdx] : 'EQ';
    const close = parseFloat(cols[closeIdx]);
    const vol = volIdx !== -1 ? parseInt(cols[volIdx], 10) : 0;

    if (series === 'EQ' && !isNaN(close)) {
      dataMap[symbol] = { close, volume: vol };
    }
  }
  return dataMap;
}

// ARS/SRS calculation math matching clientside exactly
function calcARS(stockCandles, benchCandles, cutoffTs) {
  if (!stockCandles || !benchCandles) return null;
  const sLen = stockCandles.length;
  const bLen = benchCandles.length;
  if (sLen < 10 || bLen < 10) return null;
  
  const sToday = stockCandles[sLen - 1];
  const bToday = benchCandles[bLen - 1];
  const sYest  = stockCandles[sLen - 2];
  const bYest  = benchCandles[bLen - 2];
  
  let sStartIdx = 0;
  for (let i = 0; i < sLen; i++) { if (stockCandles[i].t >= cutoffTs) { sStartIdx = i; break; } }
  const sStart = stockCandles[sStartIdx];
  if (!sStart) return null;

  // Align benchmark start date to stock's actual start date for IPOs listed after cutoffTs
  const effectiveCutoff = Math.max(cutoffTs, sStart.t);
  let bStartIdx = 0;
  for (let i = 0; i < bLen; i++) { if (benchCandles[i].t >= effectiveCutoff) { bStartIdx = i; break; } }
  const bStart = benchCandles[bStartIdx];
  if (!bStart) return null;

  const ars = sStart.c && bStart.c && bStart.c !== 0 ? ((sToday.c / sStart.c) / (bToday.c / bStart.c)) - 1 : 0;
  const sStartP = stockCandles[Math.max(0, sStartIdx - 1)];
  const bStartP = benchCandles[Math.max(0, bStartIdx - 1)];
  const arsPrev = sStartP.c && bStartP.c && bStartP.c !== 0 ? ((sYest.c / sStartP.c) / (bYest.c / bStartP.c)) - 1 : 0;
  
  const SRS_LEN = 63;
  const sS63 = stockCandles[Math.max(0, sLen - 1 - SRS_LEN)];
  const bS63 = benchCandles[Math.max(0, bLen - 1 - SRS_LEN)];
  const srs  = sS63.c && bS63.c && bS63.c !== 0 ? ((sToday.c / sS63.c) / (bToday.c / bS63.c)) - 1 : 0;
  
  const VOL_PERIOD = 20;
  const vSlice = stockCandles.slice(Math.max(0, sLen - VOL_PERIOD));
  const avgVol = vSlice.reduce((s, c) => s + c.v, 0) / vSlice.length;
  const vol_ratio = avgVol > 0 ? sToday.v / avgVol : 1;
  
  // 52-Week High uses session Highs (c.h)
  const hiSlice = stockCandles.slice(Math.max(0, sLen - 252));
  const hi52Max = Math.max(...hiSlice.map(c => c.h !== undefined && c.h !== null ? c.h : c.c));
  const hi52_prox = hi52Max > 0 ? (sToday.c - hi52Max) / hi52Max : -0.1;

  let signSince = null, signDays = null, signPrice = null;
  if (ars !== null) {
    const todaySign = ars >= 0;
    const maxLookback = Math.min(sLen - sStartIdx - 1, bLen - bStartIdx - 1, 1500);
    let daysCount = 0;
    let flipIdx = null;
    for (let back = 1; back <= maxLookback; back++) {
      const sIdx = sLen - 1 - back;
      const bIdx = bLen - 1 - back;
      if (sIdx <= sStartIdx || bIdx <= bStartIdx) break;
      const sC = stockCandles[sIdx];
      const bC = benchCandles[bIdx];
      if (!sC || !bC || !sC.c || !bC.c || bStart.c === 0) break;
      const histArs = (sC.c / sStart.c) / (bC.c / bStart.c) - 1;
      const histSign = histArs >= 0;
      if (histSign !== todaySign) {
        flipIdx = sIdx + 1;
        daysCount = back;
        break;
      }
      daysCount = back + 1;
    }
    if (flipIdx !== null && stockCandles[flipIdx]) {
      signSince = stockCandles[flipIdx].t;
      signDays  = daysCount;
      signPrice = stockCandles[flipIdx].c;
    } else {
      signSince = sStart.t;
      signDays  = sLen - 1 - sStartIdx;
    }
  }

  // Calculate 50MA and 200MA
  const slice50 = stockCandles.slice(Math.max(0, sLen - 50));
  const sma50 = slice50.reduce((s, c) => s + c.c, 0) / Math.max(1, slice50.length);
  
  const slice200 = stockCandles.slice(Math.max(0, sLen - 200));
  const sma200 = slice200.reduce((s, c) => s + c.c, 0) / Math.max(1, slice200.length);
  
  const maAbove50 = sToday.c > sma50;
  const maAbove200 = sToday.c > sma200;
  const ma_status = (maAbove50 && maAbove200) ? 'MA+' : 'MA-';
  
  // Calculate ARS 5 days ago to get the slope
  const sPrev5 = stockCandles[Math.max(0, sLen - 6)]; // 5 trading days ago is index sLen-6 (current day is sLen-1)
  const bPrev5 = benchCandles[Math.max(0, bLen - 6)];
  const ars5 = sStart.c && bStart.c && bStart.c !== 0 ? ((sPrev5.c / sStart.c) / (bPrev5.c / bStart.c)) - 1 : 0;
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

// Download Bhavcopy by scanning back in time — uses curl with NSE session cookies
async function downloadLatestBhavcopy() {
  const tempZip    = path.join(scratchDir, 'bhav.zip');
  const tempExtract = path.join(scratchDir, 'temp_bhav');
  const cookieFile = path.join(scratchDir, 'nse_cookies.txt');

  // ── Step 1: Acquire NSE session cookies ──────────────────────────────────
  // NSE's archive server checks for valid session cookies (nsit, nseappid)
  // issued by the main site. Without them every download returns 403.
  if (process.platform !== 'win32') {
    console.log('Acquiring NSE session cookies via curl...');
    try {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
      // Visit homepage to get initial cookies
      execSync(
        `curl -L -s --max-time 30 -A '${ua}' -c '${cookieFile}' -o /dev/null 'https://www.nseindia.com'`,
        { stdio: 'pipe' }
      );
      // Hit a data page to refresh/extend the session
      execSync(
        `curl -L -s --max-time 30 -A '${ua}' -c '${cookieFile}' -b '${cookieFile}' ` +
        `-H 'Referer: https://www.nseindia.com/' -o /dev/null ` +
        `'https://www.nseindia.com/market-data/live-equity-market'`,
        { stdio: 'pipe' }
      );
      console.log('Session cookies acquired.');
    } catch (e) {
      console.warn('Warning: Could not acquire NSE cookies:', e.message);
    }
    // Wait 2s to appear like a human
    await new Promise(r => setTimeout(r, 2000));
  }

  // ── Step 2: Try downloading Bhavcopy for recent trading days ─────────────
  let date = new Date();
  for (let lookback = 0; lookback < 10; lookback++) {
    const yyyy = date.getFullYear();
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const dd   = String(date.getDate()).padStart(2, '0');
    const yyyymmdd = `${yyyy}${mm}${dd}`;

    // Primary: new UDiFF format | Fallback: legacy archive format
    const mmm = new Date(yyyy, date.getMonth()).toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const urls = [
      `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${yyyymmdd}_F_0000.csv.zip`,
      `https://archives.nseindia.com/content/historical/EQUITIES/${yyyy}/${mmm}/cm${dd}${mmm}${yyyy}bhav.csv.zip`,
    ];

    for (const url of urls) {
      console.log(`Attempting Bhavcopy for ${yyyymmdd}: ${url.split('/').pop()}`);
      try {
        downloadNSEWithCurl(url, tempZip, cookieFile);
        console.log('Download successful!');

        // Clean previous extraction folder
        if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });
        fs.mkdirSync(tempExtract);

        // Unzip
        if (process.platform === 'win32') {
          execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`);
        } else {
          execSync(`unzip -o '${tempZip}' -d '${tempExtract}'`, { stdio: 'pipe' });
        }

        const files = fs.readdirSync(tempExtract);
        const csvFile = files.find(f => f.endsWith('.csv'));
        if (csvFile) {
          const fullCsvPath = path.join(tempExtract, csvFile);
          const parsed = parseBhavcopy(fullCsvPath);
          fs.unlinkSync(tempZip);
          fs.rmSync(tempExtract, { recursive: true, force: true });
          return { data: parsed, date: date.toISOString().split('T')[0], timestamp: Math.round(date.getTime() / 1000) };
        }
      } catch (err) {
        console.warn(`  Failed: ${err.message.slice(0, 120)}`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    date.setDate(date.getDate() - 1); // step back one day
  }
  throw new Error('Could not download any recent Bhavcopy files from NSE after 10 days of lookback.');
}

async function run() {
  console.log('--- STARTING ADAPTIVE ALPHA PIPELINE ---');
  console.log(`Platform: ${process.platform}, Node: ${process.version}, Time: ${new Date().toISOString()}`);
  let bhav;
  try {
    bhav = await downloadLatestBhavcopy();
    console.log(`Using Bhavcopy Date: ${bhav.date} (${Object.keys(bhav.data).length} symbols)`);
  } catch (err) {
    console.error('Bhavcopy download failed:', err.message);
    console.log('Continuing without Bhavcopy — will use Yahoo Finance data only.');
    bhav = { data: {}, date: new Date().toISOString().split('T')[0], timestamp: 0 };
  }

  const cutoffTs = new Date('2021-01-01').getTime() / 1000;
  console.log('Fetching Nifty Index (^NSEI) historical series…');
  const benchData = await fetchYahoo('^NSEI', '6y', 5);
  if (!benchData || benchData.length < 100) {
    console.error(`FATAL: Could not load NIFTY benchmark data. Got ${benchData ? benchData.length : 0} candles.`);
    console.error('This likely means Yahoo Finance is blocking requests from this IP or the API has changed.');
    process.exit(1);
  }
  console.log(`Benchmark loaded: ${benchData.length} candles`);

  // Override or append Nifty Close from Bhavcopy if available
  const niftyBhav = bhav.data['NIFTY 50'] || bhav.data['NIFTY50'] || bhav.data['^NSEI'];
  if (niftyBhav) {
    const last = benchData[benchData.length - 1];
    if (last.t < bhav.timestamp) {
      benchData.push({ t: bhav.timestamp, c: niftyBhav.close, h: niftyBhav.close, l: niftyBhav.close, v: niftyBhav.volume || 0 });
    } else {
      last.c = niftyBhav.close;
      last.h = niftyBhav.close;
      last.l = niftyBhav.close;
    }
  }

  console.log(`Processing ${UNIVERSE.length} stocks with concurrent async batching…`);
  const results = [];
  const BATCH_SIZE = 8;
  
  for (let i = 0; i < UNIVERSE.length; i += BATCH_SIZE) {
    const batch = UNIVERSE.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (stock, bIdx) => {
      const globalIdx = i + bIdx + 1;
      const yf = toYF(stock.sym);
      const stockHist = await fetchYahoo(yf, '6y');
      if (!stockHist || stockHist.length < 100) {
        console.warn(`[${globalIdx}/${UNIVERSE.length}] Skipped ${stock.sym} (No history)`);
        return null;
      }

      // Merge latest Bhavcopy closing price and volume if available
      const latestBhav = bhav.data[stock.sym];
      if (latestBhav) {
        const last = stockHist[stockHist.length - 1];
        if (last.t < bhav.timestamp) {
          stockHist.push({ t: bhav.timestamp, c: latestBhav.close, h: latestBhav.close, l: latestBhav.close, v: latestBhav.volume });
        } else {
          last.c = latestBhav.close;
          last.h = latestBhav.close;
          last.l = latestBhav.close;
          last.v = latestBhav.volume;
        }
      }

      const calc = calcARS(stockHist, benchData, cutoffTs);
      if (!calc) return null;

      const st14 = calcSupertrend(stockHist, 14, 3);
      const st10 = calcSupertrend(stockHist, 10, 3);
      const ichi = calcIchimoku(stockHist);
      const mrsData = calcMansfieldRS(stockHist, benchData, 50);
      const vcpData = calcVCP(stockHist);
      const pocketPivot = calcPocketPivot(stockHist);

      return {
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        logoid: logoIds[stock.sym] || null,
        ars: parseFloat(calc.ars.toFixed(4)),
        srs: parseFloat(calc.srs.toFixed(4)),
        mrs: mrsData.mrs,
        mrs_trend: mrsData.mrs_trend,
        vol_ratio: parseFloat(calc.vol_ratio.toFixed(2)),
        hi52_prox: parseFloat(calc.hi52_prox.toFixed(4)),
        price: parseFloat(calc.price.toFixed(2)),
        breakout: calc.breakout,
        trending: calc.trending,
        signDays: calc.signDays,
        signSince: calc.signSince,
        signPrice: calc.signPrice ? parseFloat(calc.signPrice.toFixed(2)) : null,
        st14: { trend: st14.trend, signal: st14.signal, val: st14.val },
        st10: { trend: st10.trend, signal: st10.signal, val: st10.val },
        ichimoku: ichi,
        vcp: {
          is_vcp: vcpData.is_vcp,
          atr_ratio: vcpData.atr_ratio,
          vol_dryup: vcpData.vol_dryup,
          tightness: vcpData.tightness_pct
        },
        pocket_pivot: pocketPivot,
        ma_status: calc.ma_status,
        ars_slope: parseFloat(calc.ars_slope.toFixed(4)),
        is_breakdown: calc.ars < -0.01 && calc.srs <= 0 && (st10.trend === 'sell' || calc.ma_status === 'MA-'),
        is_dip_buy: (calc.ars >= -0.015 || (calc.signDays != null && calc.signDays <= 15 && calc.signPrice > 0)) && (st10.trend === 'buy' || calc.ma_status === 'MA+') && calc.srs <= 0
      };
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(res => {
      if (res) results.push(res);
    });

    // Small throttle between batches to be polite to Yahoo Finance API
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  // Calculate RS Rating (1-99) & Factor Breakdown for each stock based on composite rank
  const N = results.length;
  if (N > 0) {
    const getRanks = (key, customValFn) => {
      const sorted = [...results]
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
    const ranksDays = getRanks(null, s => s.signDays * (s.ars >= 0 ? 1 : -1));

    const composites = results.map((s, idx) => {
      const composite = (ranksArs[idx] * 0.4) + (ranksSrs[idx] * 0.3) + (ranksVol[idx] * 0.15) + (ranksDays[idx] * 0.15);
      return { idx, composite };
    });

    composites.sort((a, b) => a.composite - b.composite);

    composites.forEach((item, r) => {
      const rating = Math.round(1 + (r / (N - 1 || 1)) * 98);
      results[item.idx].rs_rating = rating;
      results[item.idx].rs_breakdown = {
        ars_rank: Math.round(1 + ranksArs[item.idx] * 98),
        srs_rank: Math.round(1 + ranksSrs[item.idx] * 98),
        vol_rank: Math.round(1 + ranksVol[item.idx] * 98),
        streak_rank: Math.round(1 + ranksDays[item.idx] * 98)
      };
    });
  }

  console.log('Fetching latest FII/DII flows...');
  const fiiDii = await fetchFiiDiiData();

  // Track 30-Day Breakout History Log
  const historyJson = path.join(dataDir, 'breakout_history.json');
  let breakoutHistory = [];
  try {
    if (fs.existsSync(historyJson)) {
      breakoutHistory = JSON.parse(fs.readFileSync(historyJson, 'utf8') || '[]');
    }
  } catch (e) {}

  const todayStr = bhav.date || new Date().toISOString().split('T')[0];
  const freshBo = results.filter(s => s.breakout);

  // Add new breakouts for today if not already logged
  freshBo.forEach(stock => {
    const exists = breakoutHistory.some(h => h.sym === stock.sym && h.triggerDate === todayStr);
    if (!exists) {
      breakoutHistory.push({
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        triggerDate: todayStr,
        triggerPrice: stock.price,
        maxPrice: stock.price,
        currentPrice: stock.price,
        volRatioAtTrigger: stock.vol_ratio,
        rsRatingAtTrigger: stock.rs_rating
      });
    }
  });

  // Also seed recent positive momentum breakouts from the last 30 days
  const recentLeaders = results.filter(s =>
    s.ars > 0 && s.signDays != null && s.signDays <= 30 && s.signPrice > 0
  );

  recentLeaders.forEach(stock => {
    const triggerD = stock.signSince ? new Date(stock.signSince * 1000).toISOString().split('T')[0] : todayStr;
    const exists = breakoutHistory.some(h => h.sym === stock.sym);
    if (!exists) {
      const p = stock.price;
      const trigP = stock.signPrice || p;
      const gain = ((p - trigP) / trigP) * 100;
      breakoutHistory.push({
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        triggerDate: triggerD,
        triggerPrice: trigP,
        maxPrice: Math.max(p, trigP),
        currentPrice: p,
        gainPct: parseFloat(gain.toFixed(2)),
        maxGainPct: parseFloat(Math.max(gain, 0).toFixed(2)),
        volRatioAtTrigger: stock.vol_ratio,
        rsRatingAtTrigger: stock.rs_rating
      });
    }
  });

  // Update current prices & max run-ups for all logged historical breakouts
  const stockPriceMap = new Map(results.map(s => [s.sym, s.price]));
  const cutoffTime = Date.now() - (45 * 24 * 60 * 60 * 1000); // 45 days in ms

  breakoutHistory = breakoutHistory.filter(h => {
    const t = Date.parse(h.triggerDate);
    return !isNaN(t) && t >= cutoffTime;
  });

  breakoutHistory.forEach(h => {
    if (stockPriceMap.has(h.sym)) {
      const latestP = stockPriceMap.get(h.sym);
      h.currentPrice = latestP;
      if (latestP > (h.maxPrice || 0)) {
        h.maxPrice = latestP;
      }
      const gainPct = ((latestP - h.triggerPrice) / h.triggerPrice) * 100;
      const maxGainPct = (((h.maxPrice || latestP) - h.triggerPrice) / h.triggerPrice) * 100;
      h.gainPct = parseFloat(gainPct.toFixed(2));
      h.maxGainPct = parseFloat(maxGainPct.toFixed(2));
    }
  });

  fs.writeFileSync(historyJson, JSON.stringify(breakoutHistory, null, 2));
  console.log(`Saved ${breakoutHistory.length} active entries in breakout_history.json`);

  const payload = {
    updated: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}) + ' IST · ' + new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',timeZone:'Asia/Kolkata'}),
    bhavDate: bhav.date,
    fii_dii: fiiDii,
    stocks: results,
    breakout_history: breakoutHistory
  };

  fs.writeFileSync(outputJson, JSON.stringify(payload, null, 2));
  console.log(`Successfully generated data file. Saved to: ${outputJson}`);
  console.log('--- PIPELINE COMPLETED ---');
}

// Global error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

run();
