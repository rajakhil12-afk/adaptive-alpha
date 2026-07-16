const fs = require('fs');
const path = require('path');
const https = require('https');

const scratchDir = path.resolve(__dirname, '..');
const dataDir = path.join(scratchDir, 'data');
const logoFile = path.join(dataDir, 'logo_ids.json');

// Combined constituent lists copied from update_data.js
const N50 = [
  {sym:'ADANIENT'}, {sym:'ADANIPORTS'}, {sym:'APOLLOHOSP'}, {sym:'ASIANPAINT'}, {sym:'AXISBANK'},
  {sym:'BAJAJ-AUTO'}, {sym:'BAJFINANCE'}, {sym:'BAJAJFINSV'}, {sym:'BEL'}, {sym:'BHARTIARTL'},
  {sym:'CIPLA'}, {sym:'COALINDIA'}, {sym:'DRREDDY'}, {sym:'EICHERMOT'}, {sym:'ETERNAL'},
  {sym:'GRASIM'}, {sym:'HCLTECH'}, {sym:'HDFCBANK'}, {sym:'HDFCLIFE'}, {sym:'HINDALCO'},
  {sym:'HINDUNILVR'}, {sym:'ICICIBANK'}, {sym:'ITC'}, {sym:'INFY'}, {sym:'INDIGO'},
  {sym:'JSWSTEEL'}, {sym:'JIOFIN'}, {sym:'KOTAKBANK'}, {sym:'LT'}, {sym:'M_M'},
  {sym:'MARUTI'}, {sym:'MAXHEALTH'}, {sym:'NTPC'}, {sym:'NESTLEIND'}, {sym:'ONGC'},
  {sym:'POWERGRID'}, {sym:'RELIANCE'}, {sym:'SBILIFE'}, {sym:'SHRIRAMFIN'}, {sym:'SBIN'},
  {sym:'SUNPHARMA'}, {sym:'TCS'}, {sym:'TATACONSUM'}, {sym:'TMPV'}, {sym:'TATASTEEL'},
  {sym:'TECHM'}, {sym:'TITAN'}, {sym:'TRENT'}, {sym:'ULTRACEMCO'}, {sym:'WIPRO'}
];

const EXTRA = [
  {sym:'ABB'}, {sym:'ADANIENSOL'}, {sym:'ADANIGREEN'}, {sym:'ADANIPOWER'}, {sym:'AMBUJACEM'},
  {sym:'DMART'}, {sym:'BAJAJHLDNG'}, {sym:'BANKBARODA'}, {sym:'BPCL'}, {sym:'BOSCHLTD'},
  {sym:'BRITANNIA'}, {sym:'CGPOWER'}, {sym:'CANBK'}, {sym:'CHOLAFIN'}, {sym:'CUMMINSIND'},
  {sym:'DLF'}, {sym:'DIVISLAB'}, {sym:'GAIL'}, {sym:'GODREJCP'}, {sym:'HDFCAMC'},
  {sym:'HAL'}, {sym:'HINDZINC'}, {sym:'HYUNDAI'}, {sym:'INDHOTEL'}, {sym:'IOC'},
  {sym:'IRFC'}, {sym:'JINDALSTEL'}, {sym:'LTM'}, {sym:'LODHA'}, {sym:'MAZDOCK'},
  {sym:'MUTHOOTFIN'}, {sym:'PIDILITIND'}, {sym:'PFC'}, {sym:'PNB'}, {sym:'RECLTD'},
  {sym:'MOTHERSON'}, {sym:'SHREECEM'}, {sym:'ENRIN'}, {sym:'SIEMENS'}, {sym:'SOLARINDS'},
  {sym:'TVSMOTOR'}, {sym:'TATACAP'}, {sym:'TMCV'}, {sym:'TATAPOWER'}, {sym:'TORNTPHARM'},
  {sym:'UNIONBANK'}, {sym:'UNITDSPR'}, {sym:'VBL'}, {sym:'VEDL'}, {sym:'ZYDUSLIFE'}
];

const MIDCAP100 = [
  {sym:'INDIANB'}, {sym:'BSE'}, {sym:'POWERINDIA'}, {sym:'INDUSTOWER'}, {sym:'LGEINDIA'},
  {sym:'LUPIN'}, {sym:'POLYCAB'}, {sym:'GROWW'}, {sym:'HEROMOTOCO'}, {sym:'ABCAPITAL'},
  {sym:'ICICIGI'}, {sym:'BHARATFORG'}, {sym:'ASHOKLEY'}, {sym:'OFSS'}, {sym:'BHEL'},
  {sym:'IDFCFIRSTB'}, {sym:'YESBANK'}, {sym:'SUZLON'}, {sym:'NBCC'}, {sym:'IRCTC'},
  {sym:'SAIL'}, {sym:'HUDCO'}, {sym:'GMRAIRPORT'}, {sym:'MARICO'}, {sym:'JSWENERGY'},
  {sym:'MANKIND'}, {sym:'COFORGE'}, {sym:'PERSISTENT'}, {sym:'PAYTM'}, {sym:'POLICYBZR'},
  {sym:'NAUKRI'}, {sym:'AUROPHARMA'}, {sym:'ALKEM'}, {sym:'BIOCON'}, {sym:'LAURUSLABS'},
  {sym:'GLAND'}, {sym:'COLPAL'}, {sym:'PGHH'}, {sym:'DABUR'}, {sym:'EMAMILTD'},
  {sym:'PATANJALI'}, {sym:'FEDERALBNK'}, {sym:'IDBI'}, {sym:'RBLBANK'}, {sym:'AUBANK'},
  {sym:'BANDHANBNK'}, {sym:'LICHSGFIN'}, {sym:'SUNDARMFIN'}, {sym:'M&MFIN'}, {sym:'MFSL'},
  {sym:'GICRE'}, {sym:'NIACL'}, {sym:'STARHEALTH'}, {sym:'SONACOMS'}, {sym:'BALKRISIND'},
  {sym:'EXIDEIND'}, {sym:'MRF'}, {sym:'APOLLOTYRE'}, {sym:'ESCORTS'}, {sym:'VOLTAS'},
  {sym:'CROMPTON'}, {sym:'HAVELLS'}, {sym:'DIXON'}, {sym:'KAJARIACER'}, {sym:'JKCEMENT'},
  {sym:'RAMCOCEM'}, {sym:'OBEROIRLTY'}, {sym:'GODREJPROP'}, {sym:'PHOENIXLTD'}, {sym:'PRESTIGE'},
  {sym:'PETRONET'}, {sym:'MGL'}, {sym:'IGL'}, {sym:'OIL'}, {sym:'NHPC'},
  {sym:'SJVN'}, {sym:'TORNTPOWER'}, {sym:'NMDC'}, {sym:'NATIONALUM'}, {sym:'APLAPOLLO'},
  {sym:'LLOYDSME'}, {sym:'UNOMINDA'}, {sym:'SUPREMEIND'}, {sym:'SRF'}, {sym:'UPL'},
  {sym:'DEEPAKNTR'}, {sym:'TATACHEM'}, {sym:'AARTIIND'}, {sym:'NAVINFLUOR'}, {sym:'CONCOR'},
  {sym:'IEX'}, {sym:'MCX'}, {sym:'CDSL'}, {sym:'ANGELONE'}, {sym:'KPITTECH'},
  {sym:'MPHASIS'}, {sym:'TATAELXSI'}, {sym:'JUBLFOOD'}, {sym:'PVRINOX'}, {sym:'DELHIVERY'},
  {sym:'ZFCVINDIA'}, {sym:'BLUESTARCO'}, {sym:'WHIRLPOOL'}
];

const SMALLCAP100 = [
  {sym:'AARTIIND'}, {sym:'ABREL'}, {sym:'AEGISLOG'}, {sym:'AFCONS'}, {sym:'AFFLE'},
  {sym:'ARE&M'}, {sym:'AMBER'}, {sym:'ANANDRATHI'}, {sym:'ANANTRAJ'}, {sym:'ANGELONE'},
  {sym:'APTUS'}, {sym:'ASTERDM'}, {sym:'ATHERENERG'}, {sym:'BEML'}, {sym:'BLS'},
  {sym:'BANDHANBNK'}, {sym:'FIRSTCRY'}, {sym:'BRIGADE'}, {sym:'CESC'}, {sym:'CGCL'},
  {sym:'CASTROLIND'}, {sym:'CDSL'}, {sym:'CHAMBLFERT'}, {sym:'CHOLAHLDNG'}, {sym:'CUB'},
  {sym:'COHANCE'}, {sym:'CAMS'}, {sym:'CREDITACC'}, {sym:'CROMPTON'}, {sym:'DATAPATTNS'},
  {sym:'DEEPAKFERT'}, {sym:'DELHIVERY'}, {sym:'DEVYANI'}, {sym:'LALPATHLAB'}, {sym:'FSL'},
  {sym:'FIVESTAR'}, {sym:'FORCEMOT'}, {sym:'GRSE'}, {sym:'GLAND'}, {sym:'GPIL'},
  {sym:'GESHIP'}, {sym:'GMDCLTD'}, {sym:'HBLENGINE'}, {sym:'HSCL'}, {sym:'HINDCOPPER'},
  {sym:'IDBI'}, {sym:'IFCI'}, {sym:'IIFL'}, {sym:'IRCON'}, {sym:'ITI'},
  {sym:'IGL'}, {sym:'INOXWIND'}, {sym:'IKS'}, {sym:'JBMA'}, {sym:'JMFINANCIL'},
  {sym:'JSWCEMENT'}, {sym:'JYOTICNC'}, {sym:'KARURVYSYA'}, {sym:'KAYNES'}, {sym:'KEC'},
  {sym:'KFINTECH'}, {sym:'MANAPPURAM'}, {sym:'MRPL'}, {sym:'MEESHO'}, {sym:'NATCOPHARM'},
  {sym:'NBCC'}, {sym:'NH'}, {sym:'NAVINFLUOR'}, {sym:'NETWEB'}, {sym:'NEULANDLAB'},
  {sym:'NUVAMA'}, {sym:'OLAELEC'}, {sym:'PGEL'}, {sym:'PNBHOUSING'}, {sym:'PWL'},
  {sym:'PINELABS'}, {sym:'PIRAMALFIN'}, {sym:'PPLPHARMA'}, {sym:'POONAWALLA'}, {sym:'RBLBANK'},
  {sym:'REDINGTON'}, {sym:'RPOWER'}, {sym:'SAGILITY'}, {sym:'SAILIFE'}, {sym:'SARDAEN'},
  {sym:'SIGNATURE'}, {sym:'SONACOMS'}, {sym:'STARHEALTH'}, {sym:'SWANCORP'}, {sym:'SYNGENE'},
  {sym:'TATACHEM'}, {sym:'TATATECH'}, {sym:'TENNIND'}, {sym:'RAMCOCEM'}, {sym:'TRITURBINE'},
  {sym:'URBANCO'}, {sym:'WELCORP'}, {sym:'WHIRLPOOL'}, {sym:'WOCKPHARMA'}, {sym:'ZENSARTECH'}
];

const UNIVERSE = [...N50, ...EXTRA, ...MIDCAP100, ...SMALLCAP100];

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
          const match = json.find(r => r.symbol === tvSym && r.exchange === 'NSE') || json[0];
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
