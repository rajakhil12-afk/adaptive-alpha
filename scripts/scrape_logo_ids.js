const fs = require('fs');
const path = require('path');
const https = require('https');

const scratchDir = path.resolve(__dirname, '..');
const dataDir = path.join(scratchDir, 'data');
const logoFile = path.join(dataDir, 'logo_ids.json');

// Centralized universe definition
const { UNIVERSE } = require('../config/universe');

// Map local symbols to their exact TradingView search ticker query name
function getTvQuerySym(sym) {
  const map = {
    'M_M':        'M&M',
    'M&MFIN':     'M&MFIN',
    'BAJAJ-AUTO': 'BAJAJ_AUTO',
    'TMPV':       'TATAMTRDVR',
    'TMCV':       'TATAMOTORS',
    'LTM':        'LTIM',
    'GROWW':      'GROWW'
  };
  return map[sym] || sym;
}

function searchLogo(sym) {
  return new Promise((resolve) => {
    const tvSym = getTvQuerySym(sym);
    const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(tvSym)}&exchange=NSE`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (!Array.isArray(json) || json.length === 0) return resolve(null);
          const match = json.find(r => (r.symbol === tvSym || r.symbol === sym) && (r.exchange === 'NSE' || r.exchange === 'BSE')) 
                     || json.find(r => r.exchange === 'NSE') 
                     || json[0];
          resolve(match ? match.logoid : null);
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function run() {
  console.log(`Starting logo ID scrape for ${UNIVERSE.length} symbols...`);
  
  // Load existing cache if any to avoid re-fetching
  let cache = {};
  if (fs.existsSync(logoFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(logoFile, 'utf8'));
      console.log(`Loaded ${Object.keys(cache).length} cached logo IDs.`);
    } catch(e) {}
  }
  
  let successCount = 0;
  for (let i = 0; i < UNIVERSE.length; i++) {
    const sym = UNIVERSE[i].sym;
    
    // Check if cached
    if (cache[sym]) {
      continue;
    }
    
    console.log(`[${i+1}/${UNIVERSE.length}] Fetching logo for ${sym}...`);
    const logoid = await searchLogo(sym);
    
    if (logoid) {
      cache[sym] = logoid;
      successCount++;
      console.log(`  -> Found: ${logoid}`);
    } else {
      console.log(`  -> Warning: No logo ID found for ${sym}`);
    }
    
    // Throttle to avoid rate limits
    await sleep(200);
  }
  
  // Ensure directory exists and write
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(logoFile, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`Logo ID scraping completed. Total logo maps stored: ${Object.keys(cache).length} (Added ${successCount} new maps).`);
}

run();
