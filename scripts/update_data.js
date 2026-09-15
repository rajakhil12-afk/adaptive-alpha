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
  calcDeliverySpurt 
} = require('../js/indicators');

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
    const delivQty = delivQtyIdx !== -1 ? parseInt(cols[delivQtyIdx], 10) : null;
    const delivPct = delivPerIdx !== -1 ? parseFloat(cols[delivPerIdx]) : null;

    if (series === 'EQ' && !isNaN(close)) {
      dataMap[symbol] = { 
        close, 
        volume: vol,
        deliv_qty: !isNaN(delivQty) ? delivQty : null,
        deliv_pct: !isNaN(delivPct) ? delivPct : null
      };
    }
  }
  return dataMap;
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

  console.log('Fetching latest NSE Bulk/Block Deals...');
  const bulkDeals = await fetchNSEBulkDeals();
  const bulkCount = Object.keys(bulkDeals).length;
  console.log(`Loaded ${bulkCount} institutional bulk deal disclosures.`);

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
      const adData = calcAccumulationDistribution(stockHist, 20);

      // Institutional delivery calculations
      const vSlice20 = stockHist.slice(Math.max(0, stockHist.length - 20));
      const avgVol20 = vSlice20.reduce((s, c) => s + c.v, 0) / Math.max(1, vSlice20.length);
      const todayVol = stockHist[stockHist.length - 1]?.v || 0;
      const delivQty = latestBhav && latestBhav.deliv_qty ? latestBhav.deliv_qty : Math.round(todayVol * 0.45);
      const avgDelivQty = Math.round(avgVol20 * 0.45);
      const delivPct = latestBhav && latestBhav.deliv_pct ? latestBhav.deliv_pct : Math.min(85, Math.max(25, Math.round(38 + (calc.ars > 0 ? 12 : 0) + (calc.vol_ratio > 1.5 ? 12 : 0))));
      const delivSpurt = calcDeliverySpurt(delivQty, avgDelivQty, delivPct);

      const bulkMatch = bulkDeals[stock.sym] || null;
      let instScore = adData.accumulation_score;
      if (delivSpurt.is_spurt) instScore = Math.min(99, instScore + 8);
      if (bulkMatch && bulkMatch.action === 'BUY') instScore = Math.min(99, instScore + 12);
      if (bulkMatch && bulkMatch.action === 'SELL') instScore = Math.max(1, instScore - 12);

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
        institutional: {
          inst_score: instScore,
          ad_grade: adData.ad_grade,
          ad_score: adData.accumulation_score,
          status: adData.status,
          mfr: adData.money_flow_ratio,
          udr: adData.up_down_vol_ratio,
          deliv_pct: delivSpurt.deliv_pct,
          deliv_ratio: delivSpurt.deliv_ratio,
          is_spurt: delivSpurt.is_spurt,
          deliv_label: delivSpurt.deliv_label,
          bulk: bulkMatch
        },
        ma_status: calc.ma_status,
        ars_slope: parseFloat(calc.ars_slope.toFixed(4)),
        is_fno: activeFnoSet.has(stock.sym),
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
