const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { 
  calcSupertrend, 
  calcMansfieldRS, 
  calcVCP, 
  calcPocketPivot, 
  calcIchimoku, 
  calcARS, 
  computeRSRatings,
  calcAccumulationDistribution,
  calcDeliverySpurt,
  calcVolumeZScore
} = require('../js/indicators');
const { getForensicsForStock } = require('../config/forensics');
const { computeSmartMoneyFootprint } = require('./smart_money_detective');

/**
 * Classifies a stock into the 4-tier Institutional Accumulation Grade:
 * - Grade A+ Heavy Accumulation
 * - Grade A Solid Buying
 * - Grade B Neutral
 * - Grade C Churn
 */
function classifyInstitutionalGrade(adData, delivRatio, delivPct, volRatio, close, high, low) {
  const mfr = adData ? (adData.money_flow_ratio || 0) : 0;
  const udr = adData ? (adData.up_down_vol_ratio || 1.0) : 1.0;
  const adGrade = adData ? adData.ad_grade : 'C';
  const isHighClose = (high != null && low != null && high > low)
    ? (close - low) / (high - low) >= 0.5
    : true;

  // Grade C Churn:
  // High volume expansion with low delivery (< 35%),
  // heavy volume failing to advance (negative money flow / lower close),
  // or Wyckoff distribution (D / E)
  const isChurn = (volRatio >= 1.4 && delivPct != null && delivPct < 35) ||
                  (volRatio >= 1.3 && mfr < -0.05 && !isHighClose) ||
                  (adGrade === 'D' || adGrade === 'E') ||
                  (mfr < -0.15);

  if (isChurn) {
    return {
      ad_grade: 'C',
      ad_grade_label: 'Grade C Churn',
      status: 'Grade C Churn'
    };
  }

  // Grade A+ Heavy Accumulation:
  // Delivery surge ratio >= 1.5x with positive money flow and firm close,
  // or Wyckoff A+ with solid delivery (>= 1.2x),
  // or MFR >= 0.25 with upper range close
  const isHeavyAcc = (delivRatio >= 1.5 && mfr >= 0.05 && isHighClose) ||
                     (adGrade === 'A+' && delivRatio >= 1.2) ||
                     (mfr >= 0.25 && isHighClose);

  if (isHeavyAcc) {
    return {
      ad_grade: 'A+',
      ad_grade_label: 'Grade A+ Heavy Accumulation',
      status: 'Grade A+ Heavy Accumulation'
    };
  }

  // Grade A Solid Buying:
  // Delivery surge ratio >= 1.2x or money flow ratio >= 0.10 with positive accumulation
  const isSolidBuying = (delivRatio >= 1.2 && mfr >= 0) ||
                        (mfr >= 0.10 && udr >= 1.1) ||
                        (adGrade === 'A');

  if (isSolidBuying) {
    return {
      ad_grade: 'A',
      ad_grade_label: 'Grade A Solid Buying',
      status: 'Grade A Solid Buying'
    };
  }

  // Grade B Neutral (default):
  return {
    ad_grade: 'B',
    ad_grade_label: 'Grade B Neutral',
    status: 'Grade B Neutral'
  };
}

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

function fetchNSEBulkDeals() {
  return new Promise((resolve) => {
    const url = 'https://archives.nseindia.com/content/equities/bulk.csv';
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      timeout: 10000
    };
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) return resolve({});
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const lines = raw.split('\n');
          const dealsMap = {};
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            const symIdx = headers.findIndex(h => /symbol/i.test(h));
            const clientIdx = headers.findIndex(h => /client/i.test(h));
            const typeIdx = headers.findIndex(h => /buy|sell|deal/i.test(h));
            const qtyIdx = headers.findIndex(h => /quantity|traded/i.test(h));
            const priceIdx = headers.findIndex(h => /price|rate/i.test(h));

            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
              const sym = symIdx !== -1 ? cols[symIdx] : cols[1];
              if (!sym) continue;
              const client = clientIdx !== -1 ? cols[clientIdx] : cols[2] || 'Institutional Investor';
              const action = typeIdx !== -1 ? (cols[typeIdx].toUpperCase().includes('BUY') ? 'BUY' : 'SELL') : (cols[3] || 'BUY');
              const qty = qtyIdx !== -1 ? parseInt(cols[qtyIdx], 10) : 0;
              const price = priceIdx !== -1 ? parseFloat(cols[priceIdx]) : 0;

              dealsMap[sym] = {
                client,
                action,
                quantity: qty,
                price
              };
            }
          }
          resolve(dealsMap);
        } catch (e) {
          resolve({});
        }
      });
    }).on('error', () => resolve({}));
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
const { N50, EXTRA, MIDCAP100, SMALLCAP100, N500_REST, UNIVERSE, FNO_SYMS, FNO_SET, toYF } = require('../config/universe');

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

function findHeader(headers, options) {
  for (const opt of options) {
    const idx = headers.indexOf(opt);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Parse UDiFF CSV or official NSE sec_bhavdata_full contents
function parseBhavcopy(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  if (lines.length < 2) return {};

  const headers = lines[0].split(',').map(h => h.trim());
  const symbolIdx = findHeader(headers, ['TckrSymb', 'SYMBOL', 'SYMBOL_NAME', 'FinInstrmId']);
  const closeIdx  = findHeader(headers, ['ClsPric', 'ClsgPric', 'CLOSE', 'CLOSE_PRICE']);
  const openIdx   = findHeader(headers, ['OpnPric', 'OPEN', 'OPEN_PRICE']);
  const highIdx   = findHeader(headers, ['HghPric', 'HIGH', 'HIGH_PRICE']);
  const lowIdx    = findHeader(headers, ['LwPric', 'LOW', 'LOW_PRICE']);
  const volIdx    = findHeader(headers, ['TtlTradgVol', 'TtlTrdedQty', 'TOTTRDQTY', 'VOLUME', 'TTL_TRD_QNTY', 'TOT_TRADED_QTY']);
  const seriesIdx = findHeader(headers, ['SctySrs', 'SERIES', 'SERIES_NAME']);
  const delivQtyIdx = findHeader(headers, ['DELIV_QTY', 'DelivQty', 'TtlDelivQty', 'DELIV_QTY_TRD']);
  const delivPerIdx = findHeader(headers, ['DELIV_PER', 'DelivPer', 'TtlDelivPer', 'DELIV_PER_TRD_QTY']);

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
    const rawDelivQty = delivQtyIdx !== -1 ? parseInt(cols[delivQtyIdx], 10) : null;
    const rawDelivPct = delivPerIdx !== -1 ? parseFloat(cols[delivPerIdx]) : null;
    const delivQty = Number.isFinite(rawDelivQty) ? rawDelivQty : null;
    const delivPct = Number.isFinite(rawDelivPct) ? rawDelivPct : null;

    if (series === 'EQ' && !isNaN(close)) {
      const num = idx => { if (idx === -1) return null; const v = parseFloat(cols[idx]); return Number.isFinite(v) ? v : null; };
      dataMap[symbol] = { 
        close, 
        open: num(openIdx),
        high: num(highIdx),
        low: num(lowIdx),
        volume: vol,
        deliv_qty: delivQty,
        deliv_pct: delivPct
      };
    }
  }
  return dataMap;
}

// Download Bhavcopy by scanning back in time — tries official NSE delivery data first
async function downloadLatestBhavcopy() {
  const cacheFile  = path.join(dataDir, 'sec_bhavdata_cache.json');
  const tempCsv    = path.join(scratchDir, 'sec_bhavdata.csv');
  const tempZip    = path.join(scratchDir, 'bhav.zip');
  const tempExtract = path.join(scratchDir, 'temp_bhav');
  const cookieFile = path.join(scratchDir, 'nse_cookies.txt');

  // Step 1: Acquire NSE session cookies (non-Windows only)
  if (process.platform !== 'win32') {
    console.log('Acquiring NSE session cookies via curl...');
    try {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
      execSync(`curl -L -s --max-time 15 -A '${ua}' -c '${cookieFile}' -o /dev/null 'https://www.nseindia.com'`, { stdio: 'pipe' });
      execSync(`curl -L -s --max-time 15 -A '${ua}' -c '${cookieFile}' -b '${cookieFile}' -H 'Referer: https://www.nseindia.com/' -o /dev/null 'https://www.nseindia.com/market-data/live-equity-market'`, { stdio: 'pipe' });
      console.log('Session cookies acquired.');
    } catch (e) {
      console.warn('Warning: Could not acquire NSE cookies:', e.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Step 2: Try downloading official security-wise delivery bhavdata or CM Bhavcopy for recent days
  let date = new Date();
  for (let lookback = 0; lookback < 4; lookback++) {
    const yyyy = date.getFullYear();
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const dd   = String(date.getDate()).padStart(2, '0');
    const yyyymmdd = `${yyyy}${mm}${dd}`;
    const ddmmyyyy = `${dd}${mm}${yyyy}`;
    const mmm = new Date(yyyy, date.getMonth()).toLocaleString('en-US', { month: 'short' }).toUpperCase();

    // 1. Primary: Official security-wise delivery bhavdata (direct CSV containing DELIV_QTY, DELIV_PER)
    const secBhavUrls = [
      `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${ddmmyyyy}.csv`,
      `https://archives.nseindia.com/products/content/sec_bhavdata_full_${ddmmyyyy}.csv`
    ];

    for (const url of secBhavUrls) {
      console.log(`Attempting official NSE delivery data for ${ddmmyyyy}: ${url.split('/').pop()}`);
      try {
        downloadNSEWithCurl(url, tempCsv, cookieFile);
        if (fs.existsSync(tempCsv)) {
          const parsed = parseBhavcopy(tempCsv);
          const symKeys = Object.keys(parsed);
          if (symKeys.length > 50) {
            console.log(`Ingested official NSE security delivery data (${symKeys.length} symbols).`);
            try { fs.unlinkSync(tempCsv); } catch (_) {}
            const result = {
              data: parsed,
              date: date.toISOString().split('T')[0],
              timestamp: Math.round(date.getTime() / 1000),
              has_official_delivery: true
            };
            try { fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2)); } catch (_) {}
            return result;
          }
          try { fs.unlinkSync(tempCsv); } catch (_) {}
        }
      } catch (err) {
        console.warn(`  sec_bhavdata note: ${err.message.slice(0, 100)}`);
      }
    }

    // 2. Secondary: UDiFF or legacy CM Bhavcopy zip
    const zipUrls = [
      `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${yyyymmdd}_F_0000.csv.zip`,
      `https://archives.nseindia.com/content/historical/EQUITIES/${yyyy}/${mmm}/cm${dd}${mmm}${yyyy}bhav.csv.zip`,
    ];

    for (const url of zipUrls) {
      console.log(`Attempting Bhavcopy zip for ${yyyymmdd}: ${url.split('/').pop()}`);
      try {
        downloadNSEWithCurl(url, tempZip, cookieFile);
        if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });
        fs.mkdirSync(tempExtract);

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
          try { fs.unlinkSync(tempZip); } catch (_) {}
          try { fs.rmSync(tempExtract, { recursive: true, force: true }); } catch (_) {}
          return { data: parsed, date: date.toISOString().split('T')[0], timestamp: Math.round(date.getTime() / 1000), has_official_delivery: false };
        }
      } catch (err) {
        console.warn(`  Bhavcopy zip note: ${err.message.slice(0, 100)}`);
      }
    }

    date.setDate(date.getDate() - 1);
  }

  // Step 3: Fallback to local cached delivery archive
  if (fs.existsSync(cacheFile)) {
    try {
      console.log('Using local cached official NSE delivery archive (data/sec_bhavdata_cache.json)...');
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached && cached.data && Object.keys(cached.data).length > 0) {
        return cached;
      }
    } catch (e) {
      console.warn('Warning: Could not read cached delivery archive:', e.message);
    }
  }

  console.warn('Could not download or load any Bhavcopy archives. Continuing with empty bhavcopy.');
  return { data: {}, date: new Date().toISOString().split('T')[0], timestamp: 0, has_official_delivery: false };
}

async function fetchDynamicFnoSymbols() {
  console.log('Fetching official dynamic NSE F&O list from NSE archives...');
  const foCsvUrl = 'https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv';
  const tempCsv = path.join(dataDir, 'temp_fo_mktlots.csv');
  const cookieFile = path.join(dataDir, 'nse_cookies.txt');
  const indexExclusions = new Set(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'NIFTYNXT50', 'SYMBOL', 'UNDERLYING']);

  try {
    downloadNSEWithCurl(foCsvUrl, tempCsv, cookieFile);
    if (fs.existsSync(tempCsv)) {
      const content = fs.readFileSync(tempCsv, 'utf8');
      try { fs.unlinkSync(tempCsv); } catch(e) {}
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      const dynamicSyms = new Set();
      
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          let sym = parts[1] || parts[0];
          sym = sym.replace(/[^A-Za-z0-9_&-]/g, '').toUpperCase();
          if (sym === 'M&M') sym = 'M_M';
          if (sym && !indexExclusions.has(sym) && isNaN(Number(sym))) {
            dynamicSyms.add(sym);
          }
        }
      }
      
      if (dynamicSyms.size >= 100) {
        console.log(`Successfully fetched ${dynamicSyms.size} dynamic F&O stocks from NSE.`);
        return dynamicSyms;
      }
    }
  } catch (err) {
    console.warn(`Dynamic F&O fetch note: ${err.message.slice(0, 100)}. Using built-in F&O universe fallback.`);
  }
  console.log(`Using built-in F&O universe (${FNO_SET.size} stocks).`);
  return FNO_SET;
}

function computeMultiPillarSentiment(results, benchData, fiiDii, vixData, goldData) {
  // 1. Market Momentum: Nifty 50 vs 125-DMA
  let s1 = 50, s1Desc = 'Nifty 50 close near 125-DMA baseline';
  if (benchData && benchData.length >= 125) {
    const slice125 = benchData.slice(benchData.length - 125);
    const sma125 = slice125.reduce((s, c) => s + c.c, 0) / 125;
    const currNifty = benchData[benchData.length - 1].c;
    const diffPct = ((currNifty - sma125) / sma125) * 100;
    s1 = Math.min(100, Math.max(0, Math.round(50 + (diffPct / 8) * 50)));
    s1Desc = `Nifty (₹${currNifty.toFixed(0)}) is ${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}% vs 125-DMA (₹${sma125.toFixed(0)})`;
  }

  // 2. Market Volatility: India VIX vs 50-DMA
  let s2 = 55, s2Desc = 'India VIX in moderate stability regime';
  if (vixData && vixData.length >= 20) {
    const currVix = vixData[vixData.length - 1].c;
    const vixSlice = vixData.slice(Math.max(0, vixData.length - 50));
    const sma50Vix = vixSlice.reduce((s, c) => s + c.c, 0) / vixSlice.length;
    // Lower VIX = Higher Greed. VIX 11 -> 90, VIX 15 -> 60, VIX 22 -> 20
    let base = 100 - ((currVix - 10) / (25 - 10) * 100);
    if (currVix < sma50Vix) base += 8;
    else base -= 8;
    s2 = Math.min(100, Math.max(5, Math.round(base)));
    s2Desc = `India VIX at ${currVix.toFixed(1)} (${currVix < sma50Vix ? 'Below' : 'Above'} 50-DMA ${sma50Vix.toFixed(1)})`;
  } else {
    const avgArs = results.length > 0 ? (results.reduce((s, d) => s + (d.ars || 0), 0) / results.length) : 0;
    s2 = Math.min(90, Math.max(20, Math.round(50 + (avgArs * 150))));
    s2Desc = `Market volatility estimated from cross-sectional momentum distribution`;
  }

  // 3. Stock Price Breadth: Advancing vs Declining Volume
  let s3 = 50, s3Desc = 'Balanced Advance / Decline Volume';
  if (results.length > 0) {
    const adv = results.filter(d => (d.ars || 0) > 0 || d.trending);
    const dec = results.filter(d => (d.ars || 0) <= 0 && !d.trending);
    const advVol = adv.reduce((s, d) => s + (d.vol_ratio || 1), 0);
    const decVol = dec.reduce((s, d) => s + (d.vol_ratio || 1), 0);
    const totVol = advVol + decVol || 1;
    const bRatio = (advVol / totVol) * 100;
    s3 = Math.min(100, Math.max(0, Math.round(bRatio)));
    s3Desc = `${bRatio.toFixed(0)}% Advancing Volume share (${adv.length} adv vs ${dec.length} dec)`;
  }

  // 4. Stock Price Strength: 52-Week Highs vs Lows Ratio
  let s4 = 50, s4Desc = 'Neutral 52-Week Highs vs Lows distribution';
  if (results.length > 0) {
    const highs = results.filter(d => (d.hi52_prox ?? -1) >= -0.05).length;
    const lows = results.filter(d => (d.hi52_prox || 0) <= -0.25).length;
    const hRatio = (highs / (highs + lows + 1)) * 100;
    s4 = Math.min(100, Math.max(0, Math.round(hRatio)));
    s4Desc = `${highs} stocks near 52W High vs ${lows} near 52W Low`;
  }

  // 5. Safe Haven Demand: Nifty 50 vs Gold 20-Day Performance Spread
  let s5 = 50, s5Desc = 'Equities and Safe Haven Gold moving in tandem';
  if (benchData && benchData.length >= 25 && goldData && goldData.length >= 25) {
    const nClose = benchData[benchData.length - 1].c;
    const nPrev20 = benchData[benchData.length - 21].c;
    const nRet20 = ((nClose - nPrev20) / nPrev20) * 100;

    const gClose = goldData[goldData.length - 1].c;
    const gPrev20 = goldData[goldData.length - 21].c;
    const gRet20 = ((gClose - gPrev20) / gPrev20) * 100;

    const spread = nRet20 - gRet20;
    s5 = Math.min(100, Math.max(0, Math.round(50 + (spread / 8) * 50)));
    s5Desc = `20D Outperformance: Nifty (${nRet20 >= 0 ? '+' : ''}${nRet20.toFixed(1)}%) vs Gold (${gRet20 >= 0 ? '+' : ''}${gRet20.toFixed(1)}%)`;
  } else {
    const q1 = results.filter(d => (d.ars || 0) > 0 && (d.srs || 0) > 0).length;
    s5 = Math.min(95, Math.max(15, Math.round((q1 / Math.max(1, results.length)) * 250)));
    s5Desc = `Equities risk-on allocation preference`;
  }

  // 6. Institutional Cash Flows: FII + DII Net Momentum
  let s6 = 50, s6Desc = 'Neutral Institutional Flows';
  if (fiiDii) {
    const net = (fiiDii.fii || 0) + (fiiDii.dii || 0);
    s6 = Math.min(100, Math.max(0, Math.round(50 + (net / 3000) * 45)));
    s6Desc = `Combined FII + DII Flow: ${net >= 0 ? '+' : ''}₹${net.toLocaleString('en-IN', {maximumFractionDigits:1})} Cr`;
  }

  // 7. Options & Volatility Bias: Stage-2 Breadth & Put/Call Sentiment
  let s7 = 50, s7Desc = 'Options & Market Regime in equilibrium';
  if (results.length > 0) {
    const maPlus = results.filter(d => d.ma_status === 'MA+').length;
    const maPct = (maPlus / results.length) * 100;
    const q1 = results.filter(d => (d.ars || 0) > 0 && (d.srs || 0) > 0).length;
    const q1Pct = (q1 / results.length) * 100;
    s7 = Math.min(100, Math.max(0, Math.round((0.5 * maPct) + (1.2 * q1Pct))));
    s7Desc = `${maPct.toFixed(0)}% stocks in Stage-2 MA+ · ${q1Pct.toFixed(0)}% in Quad-1 Momentum`;
  }

  // Calculate Weighted Master Score
  const score = Math.min(98, Math.max(5, Math.round(
    (0.18 * s1) + (0.18 * s2) + (0.16 * s3) + (0.14 * s4) + (0.12 * s5) + (0.12 * s6) + (0.10 * s7)
  )));

  let tier = 'NEUTRAL';
  let tierColor = '#f59e0b';
  let tierBadgeBg = 'rgba(245, 158, 11, 0.15)';
  let tierDesc = 'Stock-specific alpha market · Selective setups';

  if (score >= 75) {
    tier = 'EXTREME GREED';
    tierColor = '#00e676';
    tierBadgeBg = 'rgba(0, 230, 118, 0.18)';
    tierDesc = 'Aggressive institutional buying · Tighten trailing stops';
  } else if (score >= 56) {
    tier = 'GREED (ACTIVE MOMENTUM)';
    tierColor = '#10b981';
    tierBadgeBg = 'rgba(16, 185, 129, 0.16)';
    tierDesc = 'High breakout follow-through · Broad market participation';
  } else if (score <= 24) {
    tier = 'EXTREME FEAR';
    tierColor = '#ef4444';
    tierBadgeBg = 'rgba(239, 68, 68, 0.18)';
    tierDesc = 'High market risk · Prioritize capital preservation & cash';
  } else if (score <= 44) {
    tier = 'FEAR / DEFENSIVE';
    tierColor = '#f97316';
    tierBadgeBg = 'rgba(249, 115, 22, 0.16)';
    tierDesc = 'Weak market breadth · Focus strictly on quality pullbacks';
  }

  return {
    score,
    tier,
    tierColor,
    tierBadgeBg,
    tierDesc,
    updatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
    pillars: [
      { id: 'momentum', name: 'Market Momentum', icon: '📈', weight: '18%', score: s1, desc: s1Desc, status: s1 >= 60 ? 'Greed' : s1 <= 40 ? 'Fear' : 'Neutral' },
      { id: 'volatility', name: 'Market Volatility (India VIX)', icon: '⚡', weight: '18%', score: s2, desc: s2Desc, status: s2 >= 60 ? 'Greed' : s2 <= 40 ? 'Fear' : 'Neutral' },
      { id: 'breadth', name: 'Stock Price Breadth (A/D Volume)', icon: '🌊', weight: '16%', score: s3, desc: s3Desc, status: s3 >= 60 ? 'Greed' : s3 <= 40 ? 'Fear' : 'Neutral' },
      { id: 'strength', name: '52-Week Highs vs Lows', icon: '🎯', weight: '14%', score: s4, desc: s4Desc, status: s4 >= 60 ? 'Greed' : s4 <= 40 ? 'Fear' : 'Neutral' },
      { id: 'safe_haven', name: 'Safe Haven Spread (Nifty vs Gold)', icon: '🛡️', weight: '12%', score: s5, desc: s5Desc, status: s5 >= 60 ? 'Greed' : s5 <= 40 ? 'Fear' : 'Neutral' },
      { id: 'fii_dii', name: 'Institutional Flows (FII + DII)', icon: '🏛️', weight: '12%', score: s6, desc: s6Desc, status: s6 >= 60 ? 'Greed' : s6 <= 40 ? 'Fear' : 'Neutral' },
      { id: 'options', name: 'Options & Volatility Bias', icon: '📊', weight: '10%', score: s7, desc: s7Desc, status: s7 >= 60 ? 'Greed' : s7 <= 40 ? 'Fear' : 'Neutral' }
    ]
  };
}

/**
 * Gracefully enriches existing cached screener dataset when external APIs are unreachable.
 * Updates delivery metrics, 4-tier accumulation grades, forensic safety flags, and smart money scores.
 */
function runOfflineEnrichment(bhav, activeFnoSet) {
  console.log('Executing offline / cached screener enrichment pipeline...');
  if (!fs.existsSync(outputJson)) {
    console.error('Fatal: data/screener.json not found to enrich.');
    process.exit(1);
  }

  const existingPayload = JSON.parse(fs.readFileSync(outputJson, 'utf8'));
  const stocks = existingPayload.stocks || [];
  console.log(`Enriching ${stocks.length} stocks from existing screener dataset...`);

  // Ensure delivery cache is loaded if bhav has no delivery data
  let bhavData = (bhav && bhav.data) || {};
  const cacheFile = path.join(dataDir, 'sec_bhavdata_cache.json');
  if (Object.keys(bhavData).length === 0 && fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached && cached.data) {
        bhavData = cached.data;
        if ((!bhav || !bhav.date) && cached.date) {
          if (!bhav) bhav = {};
          bhav.date = cached.date;
        }
      }
    } catch (_) {}
  }

  const enrichedStocks = stocks.map(stock => {
    const latestBhav = bhavData[stock.sym] || null;
    const hasOfficialDeliv = latestBhav && typeof latestBhav.deliv_qty === 'number' && latestBhav.deliv_qty > 0;

    const todayVol = latestBhav?.volume || Math.round((stock.price > 1000 ? 500000 : 2000000) * (stock.vol_ratio || 1.0));
    const inst = stock.institutional || {};
    const delivPct = hasOfficialDeliv && typeof latestBhav.deliv_pct === 'number'
      ? latestBhav.deliv_pct
      : (typeof inst.deliv_pct === 'number' && inst.deliv_pct > 0 ? inst.deliv_pct : 45.0);

    const delivQty = hasOfficialDeliv
      ? latestBhav.deliv_qty
      : (typeof inst.deliv_qty === 'number' && inst.deliv_qty > 0 ? inst.deliv_qty : Math.round(todayVol * (delivPct / 100)));

    const volRatio = typeof stock.vol_ratio === 'number' && stock.vol_ratio > 0 ? stock.vol_ratio : 1.0;
    const avgVol20 = todayVol / volRatio;
    const avgDelivQty = Math.max(1, Math.round(avgVol20 * (delivPct ? (delivPct / 100) : 0.42)));

    // Delivery Surge Ratio = Delivery Volume / 20D Avg Delivery
    const delivRatio = parseFloat((delivQty / avgDelivQty).toFixed(2));
    const delivSpurt = calcDeliverySpurt(delivQty, avgDelivQty, delivPct);
    const delivEstimated = !hasOfficialDeliv;

    const adData = {
      ad_grade: inst.ad_grade || (stock.ars > 0.1 ? 'A' : (stock.ars > 0 ? 'B' : 'C')),
      money_flow_ratio: typeof inst.mfr === 'number' ? inst.mfr : (stock.ars > 0 ? 0.15 : -0.05),
      up_down_vol_ratio: typeof inst.udr === 'number' ? inst.udr : (stock.ars > 0 ? 1.25 : 0.9),
      accumulation_score: inst.ad_score || 50
    };

    const adGradeInfo = classifyInstitutionalGrade(
      adData,
      delivRatio,
      delivPct,
      stock.vol_ratio,
      stock.price,
      stock.high,
      stock.low
    );

    const safetyData = getForensicsForStock(stock.sym);

    stock.institutional = {
      ...inst,
      ad_grade: adGradeInfo.ad_grade,
      ad_grade_label: adGradeInfo.ad_grade_label,
      status: adGradeInfo.status,
      deliv_qty: delivQty,
      deliv_pct: delivPct,
      deliv_ratio: delivRatio,
      is_spurt: delivSpurt.is_spurt && !delivEstimated,
      deliv_estimated: delivEstimated,
      deliv_label: delivSpurt.deliv_label
    };

    stock.safety = safetyData;
    stock.forensics = safetyData;

    if (activeFnoSet && activeFnoSet.size > 0) {
      stock.is_fno = activeFnoSet.has(stock.sym);
    }

    const smartMoney = computeSmartMoneyFootprint(stock);
    stock.institutional.inst_score = smartMoney.score;
    stock.institutional.smart_money = smartMoney;

    return stock;
  });

  const payload = {
    ...existingPayload,
    updated: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}) + ' IST · ' + new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',timeZone:'Asia/Kolkata'}),
    bhavDate: (bhav && bhav.date) || existingPayload.bhavDate,
    stocks: enrichedStocks
  };

  fs.writeFileSync(outputJson, JSON.stringify(payload, null, 2));
  const outputJs = path.join(dataDir, 'screener.js');
  fs.writeFileSync(outputJs, 'window.STATIC_SCREENER_DATA = ' + JSON.stringify(payload) + ';');
  console.log(`[offline-enrichment] Updated ${outputJson} and ${outputJs}`);

  // Run Jishu Engine
  try {
    const { runJishuEngine } = require('./jishu_engine');
    console.log('\n--- EXECUTING JISHU PAPER TRADING DESK ---');
    runJishuEngine(payload);
  } catch (jishuErr) {
    console.error('Warning: Failed running Jishu Engine:', jishuErr.message);
  }

  console.log('--- OFFLINE PIPELINE COMPLETED SUCCESSFULLY ---');
  return payload;
}

async function run() {
  console.log('--- STARTING ADAPTIVE ALPHA PIPELINE ---');
  console.log(`Platform: ${process.platform}, Node: ${process.version}, Time: ${new Date().toISOString()}`);

  const activeFnoSet = await fetchDynamicFnoSymbols();
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
  let benchData = null;
  try {
    benchData = await fetchYahoo('^NSEI', '6y', 2);
  } catch (err) {
    console.warn('Benchmark fetch error:', err.message);
  }
  if (!benchData || benchData.length < 100) {
    console.warn(`[offline-fallback] Could not load NIFTY benchmark data from Yahoo (${benchData ? benchData.length : 0} candles).`);
    console.log('Activating offline cached pipeline enrichment using data/screener.json...');
    return runOfflineEnrichment(bhav, activeFnoSet);
  }
  console.log(`Benchmark loaded: ${benchData.length} candles`);

  console.log('Fetching India VIX (^INDIAVIX) & Gold (GOLDBEES.NS) for 7-Pillar Sentiment Model…');
  let vixData = null;
  try { vixData = await fetchYahoo('^INDIAVIX', '1y', 2); } catch (_) {}
  let goldData = null;
  try { goldData = await fetchYahoo('GOLDBEES.NS', '1y', 2); } catch (_) {}
  console.log(`Sentiment feeds: VIX (${vixData ? vixData.length : 0} candles), Gold (${goldData ? goldData.length : 0} candles)`);

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

  console.log('Fetching latest NSE Bulk/Block Deals...');
  const bulkDeals = await fetchNSEBulkDeals();
  const bulkCount = Object.keys(bulkDeals).length;
  console.log(`Loaded ${bulkCount} institutional bulk deal disclosures.`);

  console.log(`Processing ${UNIVERSE.length} stocks with concurrent async batching…`);
  const results = [];
  const failed = [];   // symbols that produced no data (renamed / delisted tickers) – previously dropped silently
  const BATCH_SIZE = 8;
  
  for (let i = 0; i < UNIVERSE.length; i += BATCH_SIZE) {
    const batch = UNIVERSE.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (stock, bIdx) => {
      const globalIdx = i + bIdx + 1;
      const yf = toYF(stock.sym);
      const stockHist = await fetchYahoo(yf, '6y');
      if (!stockHist || stockHist.length < 100) {
        console.warn(`[${globalIdx}/${UNIVERSE.length}] Skipped ${stock.sym} (No history)`);
        failed.push(stock.sym);
        return null;
      }

      // Merge latest Bhavcopy closing price and volume if available
      const latestBhav = bhav.data[stock.sym];
      if (latestBhav) {
        const last = stockHist[stockHist.length - 1];
        if (last.t < bhav.timestamp) {
          stockHist.push({ t: bhav.timestamp, o: latestBhav.open ?? latestBhav.close, c: latestBhav.close, h: latestBhav.high ?? latestBhav.close, l: latestBhav.low ?? latestBhav.close, v: latestBhav.volume });
        } else {
          // was: h = l = close -> today's range collapsed to 0 (understated ATR/Supertrend, killed wick filters)
          last.c = latestBhav.close;
          last.h = latestBhav.high ?? Math.max(last.h ?? latestBhav.close, latestBhav.close);
          last.l = latestBhav.low ?? Math.min(last.l ?? latestBhav.close, latestBhav.close);
          if (latestBhav.open != null) last.o = latestBhav.open;
          last.v = latestBhav.volume;
        }
      }

      const calc = calcARS(stockHist, benchData, cutoffTs);
      if (!calc) { failed.push(stock.sym); return null; }

      const st14 = calcSupertrend(stockHist, 14, 3);
      const st10 = calcSupertrend(stockHist, 10, 3);
      const ichi = calcIchimoku(stockHist);
      const mrsData = calcMansfieldRS(stockHist, benchData, 50);
      const vcpData = calcVCP(stockHist);
      const pocketPivot = calcPocketPivot(stockHist);
      const adData = calcAccumulationDistribution(stockHist, 20);
      const volZData = calcVolumeZScore(stockHist, 50);

      // -------------------------------------------------------------
      // Institutional delivery & Delivery Surge Ratio calculations
      // -------------------------------------------------------------
      const vSlice20 = stockHist.slice(Math.max(0, stockHist.length - 20));
      const avgVol20 = vSlice20.reduce((s, c) => s + c.v, 0) / Math.max(1, vSlice20.length);
      const todayVol = stockHist[stockHist.length - 1]?.v || 0;

      const hasOfficialDeliv = latestBhav && typeof latestBhav.deliv_qty === 'number' && latestBhav.deliv_qty > 0;
      const delivQty = hasOfficialDeliv ? latestBhav.deliv_qty : Math.round(todayVol * 0.45);
      const delivPct = hasOfficialDeliv && typeof latestBhav.deliv_pct === 'number'
        ? latestBhav.deliv_pct
        : Math.min(85, Math.max(25, Math.round(38 + (calc.ars > 0 ? 12 : 0) + (calc.vol_ratio > 1.5 ? 12 : 0))));

      // 20-Day Average Delivery Volume:
      const avgDelivQty = Math.max(1, Math.round(avgVol20 * (delivPct ? (delivPct / 100) : 0.42)));

      // Delivery Surge Ratio = Delivery Volume / 20D Avg Delivery
      const delivRatio = parseFloat((delivQty / avgDelivQty).toFixed(2));
      const delivSpurt = calcDeliverySpurt(delivQty, avgDelivQty, delivPct);
      const delivEstimated = !hasOfficialDeliv;

      // 4-tier Institutional Accumulation Grade:
      // Grade A+ Heavy Accumulation, Grade A Solid Buying, Grade B Neutral, Grade C Churn
      const adGradeInfo = classifyInstitutionalGrade(
        adData,
        delivRatio,
        delivPct,
        calc.vol_ratio,
        calc.price,
        stockHist[stockHist.length - 1]?.h ?? null,
        stockHist[stockHist.length - 1]?.l ?? null
      );

      const bulkMatch = bulkDeals[stock.sym] || null;
      const safetyData = getForensicsForStock(stock.sym);

      const stockObj = {
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        logoid: logoIds[stock.sym] || null,
        ars: parseFloat(calc.ars.toFixed(4)),
        srs: parseFloat(calc.srs.toFixed(4)),
        mrs: mrsData.mrs,
        mrs_trend: mrsData.mrs_trend,
        vol_ratio: parseFloat(calc.vol_ratio.toFixed(2)),
        vol_z: volZData.z_score,
        vol_z_label: volZData.label,
        vol_percentile: volZData.percentile,
        vol_anomaly: volZData.is_anomaly,
        hi52_prox: parseFloat(calc.hi52_prox.toFixed(4)),
        price: parseFloat(calc.price.toFixed(2)),
        open: stockHist[stockHist.length - 1]?.o ?? null,  // needed by breakout_validator wick/close-strength checks
        high: stockHist[stockHist.length - 1]?.h ?? null,
        low: stockHist[stockHist.length - 1]?.l ?? null,
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
        institutional: {
          inst_score: adData.accumulation_score,
          ad_grade: adGradeInfo.ad_grade,
          ad_grade_label: adGradeInfo.ad_grade_label,
          status: adGradeInfo.status,
          ad_score: adData.accumulation_score,
          mfr: adData.money_flow_ratio,
          udr: adData.up_down_vol_ratio,
          deliv_qty: delivQty,
          deliv_pct: delivPct,
          deliv_ratio: delivRatio,
          is_spurt: delivSpurt.is_spurt && !delivEstimated,
          deliv_estimated: delivEstimated,
          deliv_label: delivSpurt.deliv_label,
          bulk: bulkMatch
        },
        safety: safetyData,
        forensics: safetyData,
        ma_status: calc.ma_status,
        ars_slope: parseFloat(calc.ars_slope.toFixed(4)),
        is_fno: activeFnoSet.has(stock.sym),
        is_breakdown: calc.ars < -0.01 && calc.srs <= 0 && (st10.trend === 'sell' || calc.ma_status === 'MA-'),
        is_dip_buy: (calc.ars >= -0.015 || (calc.signDays != null && calc.signDays <= 15 && calc.signPrice > 0)) && (st10.trend === 'buy' || calc.ma_status === 'MA+') && calc.srs <= 0
      };

      const smartMoney = computeSmartMoneyFootprint(stockObj);
      stockObj.institutional.inst_score = smartMoney.score;
      stockObj.institutional.smart_money = smartMoney;

      return stockObj;
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(res => {
      if (res) results.push(res);
    });

    // Small throttle between batches to be polite to Yahoo Finance API
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  if (failed.length) console.warn(`[warn] ${failed.length}/${UNIVERSE.length} symbols returned no data: ${failed.join(', ')}`);
  if (failed.length > UNIVERSE.length * 0.2) {
    console.warn(`[offline-fallback] High Yahoo failure rate (${failed.length}/${UNIVERSE.length}). Falling back to cached screener data...`);
    return runOfflineEnrichment(bhav, activeFnoSet);
  }

  // Calculate RS Rating (1-99) & Factor Breakdown for each stock based on composite rank
  const N = results.length;
  if (N > 0) {
    const getRanks = (key, customValFn) => {
      const sorted = [...results]
        .map((s, idx) => ({ idx, val: customValFn ? customValFn(s) : s[key] }))
        .map(o => ({ idx: o.idx, val: Number.isFinite(o.val) ? o.val : -Infinity }))
        .sort((a, b) => (a.val > b.val) - (a.val < b.val));
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
  if (!fiiDii) console.warn('[warn] FII/DII feed unavailable – FII circuit-breaker input is 0 for this run');

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
  const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days in ms (matches the "30-Day Breakout Track Record" label; was 45)

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

  console.log('Calculating Standard & Poor\'s / CNN 7-Pillar Market Sentiment Index…');
  const sentimentPillars = computeMultiPillarSentiment(results, benchData, fiiDii, vixData, goldData);
  console.log(`Sentiment Index: ${sentimentPillars.score}/100 (${sentimentPillars.tier})`);

  const payload = {
    updated: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}) + ' IST · ' + new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',timeZone:'Asia/Kolkata'}),
    bhavDate: bhav.date,
    fii_dii: fiiDii,
    failed_symbols: failed,
    sentiment_pillars: sentimentPillars,
    stocks: results,
    breakout_history: breakoutHistory
  };

  fs.writeFileSync(outputJson, JSON.stringify(payload, null, 2));
  const outputJs = path.join(dataDir, 'screener.js');
  fs.writeFileSync(outputJs, 'window.STATIC_SCREENER_DATA = ' + JSON.stringify(payload) + ';');
  console.log(`Successfully generated data files. Saved to: ${outputJson} and ${outputJs}`);

  // Execute Jishu Institutional Paper Trading Engine
  try {
    const { runJishuEngine } = require('./jishu_engine');
    console.log('\n--- EXECUTING JISHU PAPER TRADING DESK ---');
    runJishuEngine(payload);
  } catch (jishuErr) {
    console.error('Warning: Failed running Jishu Engine:', jishuErr.message);
  }

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
