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

// Constituent stock lists
const N50 = [
  {sym:'ADANIENT',   name:'Adani Enterprises',  ind:'Metals & Mining'},
  {sym:'ADANIPORTS', name:'Adani Ports',         ind:'Services'},
  {sym:'APOLLOHOSP', name:'Apollo Hospitals',    ind:'Healthcare'},
  {sym:'ASIANPAINT', name:'Asian Paints',        ind:'Consumer Durables'},
  {sym:'AXISBANK',   name:'Axis Bank',           ind:'Financial Services'},
  {sym:'BAJAJ-AUTO', name:'Bajaj Auto',          ind:'Automobile'},
  {sym:'BAJFINANCE', name:'Bajaj Finance',       ind:'Financial Services'},
  {sym:'BAJAJFINSV', name:'Bajaj Finserv',       ind:'Financial Services'},
  {sym:'BEL',        name:'Bharat Electronics',  ind:'Capital Goods'},
  {sym:'BHARTIARTL', name:'Bharti Airtel',       ind:'Telecom'},
  {sym:'CIPLA',      name:'Cipla',               ind:'Healthcare'},
  {sym:'COALINDIA',  name:'Coal India',          ind:'Oil Gas'},
  {sym:'DRREDDY',    name:"Dr Reddy's",          ind:'Healthcare'},
  {sym:'EICHERMOT',  name:'Eicher Motors',       ind:'Automobile'},
  {sym:'ETERNAL',    name:'Eternal Ltd',         ind:'Consumer Services'},
  {sym:'GRASIM',     name:'Grasim Industries',   ind:'Construction Materials'},
  {sym:'HCLTECH',    name:'HCL Tech',            ind:'IT'},
  {sym:'HDFCBANK',   name:'HDFC Bank',           ind:'Financial Services'},
  {sym:'HDFCLIFE',   name:'HDFC Life',           ind:'Financial Services'},
  {sym:'HINDALCO',   name:'Hindalco',            ind:'Metals & Mining'},
  {sym:'HINDUNILVR', name:'HUL',                 ind:'FMCG'},
  {sym:'ICICIBANK',  name:'ICICI Bank',          ind:'Financial Services'},
  {sym:'ITC',        name:'ITC',                 ind:'FMCG'},
  {sym:'INFY',       name:'Infosys',             ind:'IT'},
  {sym:'INDIGO',     name:'IndiGo',              ind:'Services'},
  {sym:'JSWSTEEL',   name:'JSW Steel',           ind:'Metals & Mining'},
  {sym:'JIOFIN',     name:'Jio Financial',       ind:'Financial Services'},
  {sym:'KOTAKBANK',  name:'Kotak Bank',          ind:'Financial Services'},
  {sym:'LT',         name:'L&T',                 ind:'Construction'},
  {sym:'M_M',        name:'Mahindra & Mahindra', ind:'Automobile'},
  {sym:'MARUTI',     name:'Maruti Suzuki',       ind:'Automobile'},
  {sym:'MAXHEALTH',  name:'Max Healthcare',      ind:'Healthcare'},
  {sym:'NTPC',       name:'NTPC',                ind:'Power'},
  {sym:'NESTLEIND',  name:'Nestle India',        ind:'FMCG'},
  {sym:'ONGC',       name:'ONGC',                ind:'Oil Gas'},
  {sym:'POWERGRID',  name:'Power Grid',          ind:'Power'},
  {sym:'RELIANCE',   name:'Reliance',            ind:'Oil Gas'},
  {sym:'SBILIFE',    name:'SBI Life',            ind:'Financial Services'},
  {sym:'SHRIRAMFIN', name:'Shriram Finance',     ind:'Financial Services'},
  {sym:'SBIN',       name:'State Bank of India', ind:'Financial Services'},
  {sym:'SUNPHARMA',  name:'Sun Pharma',          ind:'Healthcare'},
  {sym:'TCS',        name:'TCS',                 ind:'IT'},
  {sym:'TATACONSUM', name:'Tata Consumer',       ind:'FMCG'},
  {sym:'TMPV',       name:'Tata Motors PV',      ind:'Automobile'},
  {sym:'TATASTEEL',  name:'Tata Steel',          ind:'Metals & Mining'},
  {sym:'TECHM',      name:'Tech Mahindra',       ind:'IT'},
  {sym:'TITAN',      name:'Titan',               ind:'Consumer Durables'},
  {sym:'TRENT',      name:'Trent',               ind:'Consumer Services'},
  {sym:'ULTRACEMCO', name:'UltraTech Cement',    ind:'Construction Materials'},
  {sym:'WIPRO',      name:'Wipro',               ind:'IT'}
];

const EXTRA = [
  {sym:'ABB',        name:'ABB India',            ind:'Capital Goods'},
  {sym:'ADANIENSOL', name:'Adani Energy Sol',     ind:'Power'},
  {sym:'ADANIGREEN', name:'Adani Green',          ind:'Power'},
  {sym:'ADANIPOWER', name:'Adani Power',          ind:'Power'},
  {sym:'AMBUJACEM',  name:'Ambuja Cements',       ind:'Construction Materials'},
  {sym:'DMART',      name:'Avenue Supermarts',    ind:'Consumer Services'},
  {sym:'BAJAJHLDNG', name:'Bajaj Holdings',       ind:'Financial Services'},
  {sym:'BANKBARODA', name:'Bank of Baroda',       ind:'Financial Services'},
  {sym:'BPCL',       name:'BPCL',                 ind:'Oil Gas'},
  {sym:'BOSCHLTD',   name:'Bosch India',          ind:'Automobile'},
  {sym:'BRITANNIA',  name:'Britannia',            ind:'FMCG'},
  {sym:'CGPOWER',    name:'CG Power',             ind:'Capital Goods'},
  {sym:'CANBK',      name:'Canara Bank',          ind:'Financial Services'},
  {sym:'CHOLAFIN',   name:'Chola Finance',        ind:'Financial Services'},
  {sym:'CUMMINSIND', name:'Cummins India',        ind:'Capital Goods'},
  {sym:'DLF',        name:'DLF',                  ind:'Realty'},
  {sym:'DIVISLAB',   name:"Divi's Labs",          ind:'Healthcare'},
  {sym:'GAIL',       name:'GAIL',                 ind:'Oil Gas'},
  {sym:'GODREJCP',   name:'Godrej Consumer',      ind:'FMCG'},
  {sym:'HDFCAMC',    name:'HDFC AMC',             ind:'Financial Services'},
  {sym:'HAL',        name:'HAL',                  ind:'Capital Goods'},
  {sym:'HINDZINC',   name:'Hindustan Zinc',       ind:'Metals & Mining'},
  {sym:'HYUNDAI',    name:'Hyundai India',        ind:'Automobile'},
  {sym:'INDHOTEL',   name:'Indian Hotels',        ind:'Consumer Services'},
  {sym:'IOC',        name:'Indian Oil',           ind:'Oil Gas'},
  {sym:'IRFC',       name:'IRFC',                 ind:'Financial Services'},
  {sym:'JINDALSTEL', name:'Jindal Steel',         ind:'Metals & Mining'},
  {sym:'LTM',        name:'LTIMindtree',          ind:'IT'},
  {sym:'LODHA',      name:'Lodha',                ind:'Realty'},
  {sym:'MAZDOCK',    name:'Mazagoan Dock',        ind:'Capital Goods'},
  {sym:'MUTHOOTFIN', name:'Muthoot Finance',      ind:'Financial Services'},
  {sym:'PIDILITIND', name:'Pidilite',             ind:'Chemicals'},
  {sym:'PFC',        name:'PFC',                  ind:'Financial Services'},
  {sym:'PNB',        name:'Punjab National Bank', ind:'Financial Services'},
  {sym:'RECLTD',     name:'REC Ltd',              ind:'Financial Services'},
  {sym:'MOTHERSON',  name:'Samvardhana Motherson',ind:'Automobile'},
  {sym:'SHREECEM',   name:'Shree Cement',         ind:'Construction Materials'},
  {sym:'ENRIN',      name:'Siemens Energy',       ind:'Capital Goods'},
  {sym:'SIEMENS',    name:'Siemens India',        ind:'Capital Goods'},
  {sym:'SOLARINDS',  name:'Solar Industries',     ind:'Chemicals'},
  {sym:'TVSMOTOR',   name:'TVS Motor',            ind:'Automobile'},
  {sym:'TATACAP',    name:'Tata Capital',         ind:'Financial Services'},
  {sym:'TMCV',       name:'Tata Motors CV',       ind:'Capital Goods'},
  {sym:'TATAPOWER',  name:'Tata Power',           ind:'Power'},
  {sym:'TORNTPHARM', name:'Torrent Pharma',       ind:'Healthcare'},
  {sym:'UNIONBANK',  name:'Union Bank',           ind:'Financial Services'},
  {sym:'UNITDSPR',   name:'United Spirits',       ind:'FMCG'},
  {sym:'VBL',        name:'Varun Beverages',      ind:'FMCG'},
  {sym:'VEDL',       name:'Vedanta',              ind:'Metals & Mining'},
  {sym:'ZYDUSLIFE',  name:'Zydus Life',           ind:'Healthcare'}
];

const MIDCAP100 = [
  {sym:'INDIANB',    name:'Indian Bank',           ind:'Financial Services'},
  {sym:'BSE',        name:'BSE Ltd',               ind:'Financial Services'},
  {sym:'POWERINDIA', name:'Hitachi Energy India',  ind:'Capital Goods'},
  {sym:'INDUSTOWER', name:'Indus Towers',          ind:'Telecom'},
  {sym:'LGEINDIA',   name:'LG Electronics India',  ind:'Consumer Durables'},
  {sym:'LUPIN',      name:'Lupin',                 ind:'Healthcare'},
  {sym:'POLYCAB',    name:'Polycab India',         ind:'Capital Goods'},
  {sym:'GROWW',      name:'Groww (BillionBrains)', ind:'Financial Services'},
  {sym:'HEROMOTOCO', name:'Hero MotoCorp',         ind:'Automobile'},
  {sym:'ABCAPITAL',  name:'Aditya Birla Capital',  ind:'Financial Services'},
  {sym:'ICICIGI',    name:'ICICI Lombard',         ind:'Financial Services'},
  {sym:'BHARATFORG', name:'Bharat Forge',          ind:'Capital Goods'},
  {sym:'ASHOKLEY',   name:'Ashok Leyland',         ind:'Automobile'},
  {sym:'OFSS',       name:'Oracle Financial Serv', ind:'IT'},
  {sym:'BHEL',       name:'Bharat Heavy Electric', ind:'Capital Goods'},
  {sym:'IDFCFIRSTB', name:'IDFC First Bank',       ind:'Financial Services'},
  {sym:'YESBANK',    name:'Yes Bank',              ind:'Financial Services'},
  {sym:'SUZLON',     name:'Suzlon Energy',         ind:'Power'},
  {sym:'NBCC',       name:'NBCC India',            ind:'Construction'},
  {sym:'IRCTC',      name:'IRCTC',                 ind:'Services'},
  {sym:'SAIL',       name:'SAIL',                  ind:'Metals & Mining'},
  {sym:'HUDCO',      name:'HUDCO',                 ind:'Financial Services'},
  {sym:'GMRAIRPORT', name:'GMR Airports',          ind:'Services'},
  {sym:'MARICO',     name:'Marico',                ind:'FMCG'},
  {sym:'JSWENERGY',  name:'JSW Energy',            ind:'Power'},
  {sym:'MANKIND',    name:'Mankind Pharma',        ind:'Healthcare'},
  {sym:'COFORGE',    name:'Coforge',               ind:'IT'},
  {sym:'PERSISTENT', name:'Persistent Systems',    ind:'IT'},
  {sym:'PAYTM',      name:'Paytm (One97)',         ind:'Financial Services'},
  {sym:'POLICYBZR',  name:'PB Fintech',            ind:'Financial Services'},
  {sym:'NAUKRI',     name:'Info Edge',             ind:'IT'},
  {sym:'AUROPHARMA', name:'Aurobindo Pharma',      ind:'Healthcare'},
  {sym:'ALKEM',      name:'Alkem Labs',            ind:'Healthcare'},
  {sym:'BIOCON',     name:'Biocon',                ind:'Healthcare'},
  {sym:'LAURUSLABS', name:'Laurus Labs',           ind:'Healthcare'},
  {sym:'GLAND',      name:'Gland Pharma',          ind:'Healthcare'},
  {sym:'COLPAL',     name:'Colgate-Palmolive',     ind:'FMCG'},
  {sym:'PGHH',       name:'P&G Hygiene',           ind:'FMCG'},
  {sym:'DABUR',      name:'Dabur India',           ind:'FMCG'},
  {sym:'EMAMILTD',   name:'Emami',                 ind:'FMCG'},
  {sym:'PATANJALI',  name:'Patanjali Foods',       ind:'FMCG'},
  {sym:'FEDERALBNK', name:'Federal Bank',          ind:'Financial Services'},
  {sym:'IDBI',       name:'IDBI Bank',             ind:'Financial Services'},
  {sym:'RBLBANK',    name:'RBL Bank',              ind:'Financial Services'},
  {sym:'AUBANK',     name:'AU Small Finance Bank', ind:'Financial Services'},
  {sym:'BANDHANBNK', name:'Bandhan Bank',          ind:'Financial Services'},
  {sym:'LICHSGFIN',  name:'LIC Housing Finance',   ind:'Financial Services'},
  {sym:'SUNDARMFIN', name:'Sundaram Finance',      ind:'Financial Services'},
  {sym:'M&MFIN',     name:'M&M Financial',         ind:'Financial Services'},
  {sym:'MFSL',       name:'Max Financial Services',ind:'Financial Services'},
  {sym:'GICRE',      name:'GIC Re',                ind:'Financial Services'},
  {sym:'NIACL',      name:'New India Assurance',   ind:'Financial Services'},
  {sym:'STARHEALTH', name:'Star Health Insurance', ind:'Financial Services'},
  {sym:'SONACOMS',   name:'Sona BLW Precision',    ind:'Automobile'},
  {sym:'BALKRISIND', name:'Balkrishna Industries', ind:'Automobile'},
  {sym:'EXIDEIND',   name:'Exide Industries',      ind:'Automobile'},
  {sym:'MRF',        name:'MRF',                   ind:'Automobile'},
  {sym:'APOLLOTYRE', name:'Apollo Tyres',          ind:'Automobile'},
  {sym:'ESCORTS',    name:'Escorts Kubota',        ind:'Capital Goods'},
  {sym:'VOLTAS',     name:'Voltas',                ind:'Consumer Durables'},
  {sym:'CROMPTON',   name:'Crompton Greaves',      ind:'Consumer Durables'},
  {sym:'HAVELLS',    name:'Havells India',         ind:'Consumer Durables'},
  {sym:'DIXON',      name:'Dixon Technologies',    ind:'Consumer Durables'},
  {sym:'KAJARIACER', name:'Kajaria Ceramics',      ind:'Construction Materials'},
  {sym:'JKCEMENT',   name:'JK Cement',             ind:'Construction Materials'},
  {sym:'RAMCOCEM',   name:'Ramco Cements',         ind:'Construction Materials'},
  {sym:'OBEROIRLTY', name:'Oberoi Realty',         ind:'Realty'},
  {sym:'GODREJPROP', name:'Godrej Properties',     ind:'Realty'},
  {sym:'PHOENIXLTD', name:'Phoenix Mills',         ind:'Realty'},
  {sym:'PRESTIGE',   name:'Prestige Estates',      ind:'Realty'},
  {sym:'PETRONET',   name:'Petronet LNG',          ind:'Oil Gas'},
  {sym:'MGL',        name:'Mahanagar Gas',         ind:'Oil Gas'},
  {sym:'IGL',        name:'Indraprastha Gas',      ind:'Oil Gas'},
  {sym:'OIL',        name:'Oil India',             ind:'Oil Gas'},
  {sym:'NHPC',       name:'NHPC',                  ind:'Power'},
  {sym:'SJVN',       name:'SJVN',                  ind:'Power'},
  {sym:'TORNTPOWER', name:'Torrent Power',         ind:'Power'},
  {sym:'NMDC',       name:'NMDC',                  ind:'Metals & Mining'},
  {sym:'NATIONALUM', name:'National Aluminium',    ind:'Metals & Mining'},
  {sym:'APLAPOLLO',  name:'APL Apollo Tubes',      ind:'Metals & Mining'},
  {sym:'LLOYDSME',   name:'Lloyds Metals',         ind:'Metals & Mining'},
  {sym:'UNOMINDA',   name:'UNO Minda',             ind:'Automobile'},
  {sym:'SUPREMEIND', name:'Supreme Industries',    ind:'Chemicals'},
  {sym:'SRF',        name:'SRF Limited',           ind:'Chemicals'},
  {sym:'UPL',        name:'UPL Limited',           ind:'Chemicals'},
  {sym:'DEEPAKNTR',  name:'Deepak Nitrite',        ind:'Chemicals'},
  {sym:'TATACHEM',   name:'Tata Chemicals',        ind:'Chemicals'},
  {sym:'AARTIIND',   name:'Aarti Industries',      ind:'Chemicals'},
  {sym:'NAVINFLUOR', name:'Navin Fluorine',        ind:'Chemicals'},
  {sym:'CONCOR',     name:'Container Corp',        ind:'Services'},
  {sym:'IEX',        name:'Indian Energy Exch',    ind:'Financial Services'},
  {sym:'MCX',        name:'MCX India',             ind:'Financial Services'},
  {sym:'CDSL',       name:'CDSL',                  ind:'Financial Services'},
  {sym:'ANGELONE',   name:'Angel One',             ind:'Financial Services'},
  {sym:'KPITTECH',   name:'KPIT Technologies',     ind:'IT'},
  {sym:'MPHASIS',    name:'Mphasis',               ind:'IT'},
  {sym:'TATAELXSI',  name:'Tata Elxsi',            ind:'IT'},
  {sym:'JUBLFOOD',   name:'Jubilant FoodWorks',    ind:'Consumer Services'},
  {sym:'PVRINOX',    name:'PVR Inox',              ind:'Consumer Services'},
  {sym:'DELHIVERY',  name:'Delhivery',             ind:'Services'},
  {sym:'ZFCVINDIA',  name:'ZF Commercial Vehicle', ind:'Automobile'},
  {sym:'BLUESTARCO', name:'Blue Star',             ind:'Consumer Durables'},
  {sym:'WHIRLPOOL',  name:'Whirlpool India',       ind:'Consumer Durables'}
];

const SMALLCAP100 = [
  {sym:'AARTIIND', name:'Aarti Industries', ind:'Chemicals'},
  {sym:'ABREL', name:'Aditya Birla Real Estate', ind:'Realty'},
  {sym:'AEGISLOG', name:'Aegis Logistics', ind:'Oil Gas'},
  {sym:'AFCONS', name:'Afcons Infrastructure', ind:'Construction'},
  {sym:'AFFLE', name:'Affle 3i', ind:'IT'},
  {sym:'ARE&M', name:'Amara Raja Energy & Mobility', ind:'Automobile'},
  {sym:'AMBER', name:'Amber Enterprises India', ind:'Consumer Durables'},
  {sym:'ANANDRATHI', name:'Anand Rathi Wealth', ind:'Financial Services'},
  {sym:'ANANTRAJ', name:'Anant Raj', ind:'Realty'},
  {sym:'ANGELONE', name:'Angel One', ind:'Financial Services'},
  {sym:'APTUS', name:'Aptus Value Housing Finance India', ind:'Financial Services'},
  {sym:'ASTERDM', name:'Aster DM Healthcare', ind:'Healthcare'},
  {sym:'ATHERENERG', name:'Ather Energy', ind:'Automobile'},
  {sym:'BEML', name:'BEML', ind:'Capital Goods'},
  {sym:'BLS', name:'BLS International Services', ind:'Consumer Services'},
  {sym:'BANDHANBNK', name:'Bandhan Bank', ind:'Financial Services'},
  {sym:'FIRSTCRY', name:'Brainbees Solutions', ind:'Consumer Services'},
  {sym:'BRIGADE', name:'Brigade Enterprises', ind:'Realty'},
  {sym:'CESC', name:'CESC', ind:'Power'},
  {sym:'CGCL', name:'Capri Global Capital', ind:'Financial Services'},
  {sym:'CASTROLIND', name:'Castrol India', ind:'Oil Gas'},
  {sym:'CDSL', name:'Central Depository Services (India)', ind:'Financial Services'},
  {sym:'CHAMBLFERT', name:'Chambal Fertilizers & Chemicals', ind:'Chemicals'},
  {sym:'CHOLAHLDNG', name:'Cholamandalam Financial Holdings', ind:'Financial Services'},
  {sym:'CUB', name:'City Union Bank', ind:'Financial Services'},
  {sym:'COHANCE', name:'Cohance Lifesciences', ind:'Healthcare'},
  {sym:'CAMS', name:'Computer Age Management Services', ind:'Financial Services'},
  {sym:'CREDITACC', name:'CreditAccess Grameen', ind:'Financial Services'},
  {sym:'CROMPTON', name:'Crompton Greaves Consumer Electricals', ind:'Consumer Durables'},
  {sym:'DATAPATTNS', name:'Data Patterns (India)', ind:'Capital Goods'},
  {sym:'DEEPAKFERT', name:'Deepak Fertilisers & Petrochemicals Corp.', ind:'Chemicals'},
  {sym:'DELHIVERY', name:'Delhivery', ind:'Services'},
  {sym:'DEVYANI', name:'Devyani International', ind:'Consumer Services'},
  {sym:'LALPATHLAB', name:'Dr. Lal Path Labs', ind:'Healthcare'},
  {sym:'FSL', name:'Firstsource Solutions', ind:'Services'},
  {sym:'FIVESTAR', name:'Five-Star Business Finance', ind:'Financial Services'},
  {sym:'FORCEMOT', name:'Force Motors', ind:'Automobile'},
  {sym:'GRSE', name:'Garden Reach Shipbuilders & Engineers', ind:'Capital Goods'},
  {sym:'GLAND', name:'Gland Pharma', ind:'Healthcare'},
  {sym:'GPIL', name:'Godawari Power & Ispat', ind:'Capital Goods'},
  {sym:'GESHIP', name:'Great Eastern Shipping Co.', ind:'Services'},
  {sym:'GMDCLTD', name:'Gujarat Mineral Development Corporation', ind:'Metals & Mining'},
  {sym:'HBLENGINE', name:'HBL Engineering', ind:'Capital Goods'},
  {sym:'HSCL', name:'Himadri Speciality Chemical', ind:'Chemicals'},
  {sym:'HINDCOPPER', name:'Hindustan Copper', ind:'Metals & Mining'},
  {sym:'IDBI', name:'IDBI Bank', ind:'Financial Services'},
  {sym:'IFCI', name:'IFCI', ind:'Financial Services'},
  {sym:'IIFL', name:'IIFL Finance', ind:'Financial Services'},
  {sym:'IRCON', name:'IRCON International', ind:'Construction'},
  {sym:'ITI', name:'ITI', ind:'Telecom'},
  {sym:'IGL', name:'Indraprastha Gas', ind:'Oil Gas'},
  {sym:'INOXWIND', name:'Inox Wind', ind:'Capital Goods'},
  {sym:'IKS', name:'Inventurus Knowledge Solutions', ind:'IT'},
  {sym:'JBMA', name:'JBM Auto', ind:'Automobile'},
  {sym:'JMFINANCIL', name:'JM Financial', ind:'Financial Services'},
  {sym:'JSWCEMENT', name:'JSW Cement', ind:'Construction Materials'},
  {sym:'JYOTICNC', name:'Jyoti CNC Automation', ind:'Capital Goods'},
  {sym:'KARURVYSYA', name:'Karur Vysya Bank', ind:'Financial Services'},
  {sym:'KAYNES', name:'Kaynes Technology India', ind:'Capital Goods'},
  {sym:'KEC', name:'Kec International', ind:'Construction'},
  {sym:'KFINTECH', name:'Kfin Technologies', ind:'Financial Services'},
  {sym:'MANAPPURAM', name:'Manappuram Finance', ind:'Financial Services'},
  {sym:'MRPL', name:'Mangalore Refinery & Petrochemicals', ind:'Oil Gas'},
  {sym:'MEESHO', name:'Meesho', ind:'Consumer Services'},
  {sym:'NATCOPHARM', name:'NATCO Pharma', ind:'Healthcare'},
  {sym:'NBCC', name:'NBCC (India)', ind:'Construction'},
  {sym:'NH', name:'Narayana Hrudayalaya', ind:'Healthcare'},
  {sym:'NAVINFLUOR', name:'Navin Fluorine International', ind:'Chemicals'},
  {sym:'NETWEB', name:'Netweb Technologies India', ind:'IT'},
  {sym:'NEULANDLAB', name:'Neuland Laboratories', ind:'Healthcare'},
  {sym:'NUVAMA', name:'Nuvama Wealth Management', ind:'Financial Services'},
  {sym:'OLAELEC', name:'Ola Electric Mobility', ind:'Automobile'},
  {sym:'PGEL', name:'PG Electroplast', ind:'Consumer Durables'},
  {sym:'PNBHOUSING', name:'PNB Housing Finance', ind:'Financial Services'},
  {sym:'PWL', name:'Physicswallah', ind:'Consumer Services'},
  {sym:'PINELABS', name:'Pine Labs', ind:'Financial Services'},
  {sym:'PIRAMALFIN', name:'Piramal Finance', ind:'Financial Services'},
  {sym:'PPLPHARMA', name:'Piramal Pharma', ind:'Healthcare'},
  {sym:'POONAWALLA', name:'Poonawalla Fincorp', ind:'Financial Services'},
  {sym:'RBLBANK', name:'RBL Bank', ind:'Financial Services'},
  {sym:'REDINGTON', name:'Redington', ind:'Services'},
  {sym:'RPOWER', name:'Reliance Power', ind:'Power'},
  {sym:'SAGILITY', name:'Sagility', ind:'IT'},
  {sym:'SAILIFE', name:'Sai Life Sciences', ind:'Healthcare'},
  {sym:'SARDAEN', name:'Sarda Energy and Minerals', ind:'Metals & Mining'},
  {sym:'SIGNATURE', name:'Signatureglobal (India)', ind:'Realty'},
  {sym:'SONACOMS', name:'Sona BLW Precision Forgings', ind:'Automobile'},
  {sym:'STARHEALTH', name:'Star Health and Allied Insurance Company', ind:'Financial Services'},
  {sym:'SWANCORP', name:'Swan Corp', ind:'Chemicals'},
  {sym:'SYNGENE', name:'Syngene International', ind:'Healthcare'},
  {sym:'TATACHEM', name:'Tata Chemicals', ind:'Chemicals'},
  {sym:'TATATECH', name:'Tata Technologies', ind:'IT'},
  {sym:'TENNIND', name:'Tenneco Clean Air India', ind:'Automobile'},
  {sym:'RAMCOCEM', name:'The Ramco Cements', ind:'Construction Materials'},
  {sym:'TRITURBINE', name:'Triveni Turbine', ind:'Capital Goods'},
  {sym:'URBANCO', name:'Urban Company', ind:'Consumer Services'},
  {sym:'WELCORP', name:'Welspun Corp', ind:'Capital Goods'},
  {sym:'WHIRLPOOL', name:'Whirlpool of India', ind:'Consumer Durables'},
  {sym:'WOCKPHARMA', name:'Wockhardt', ind:'Healthcare'},
  {sym:'ZENSARTECH', name:'Zensar Technolgies', ind:'IT'},
];

const UNIVERSE = [...N50, ...EXTRA, ...MIDCAP100, ...SMALLCAP100];

function toYF(sym) {
  const map = {
    'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
    'M_M':        'M%26M.NS',
    'TMPV':       'TATAMTRDVR.NS',
    'TMCV':       'TATAMOTORS.NS',
    'ENRIN':      'SIEMENSENE.NS',
    'LTM':        'LTIM.NS',
    'ETERNAL':    'ZOMATO.NS',
    'ARE&M':      'ARE%26M.NS',
  };
  return map[sym] || (sym + '.NS');
}

// Download helper with headers to avoid NSE 403 Forbidden
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
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
            reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
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

// Fetch historical charts from Yahoo Finance
function fetchYahoo(ticker, range = '6y') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=1d`;
  return new Promise((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000 // 8s timeout to prevent hanging on network issues
    };
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json?.chart?.result?.[0];
          if (!result) return resolve(null);
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
        } catch(_) {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });
  });
}

// Calculate Supertrend (period, multiplier) matching TradingView exactly
function calcSupertrend(candles, period = 10, multiplier = 3) {
  const len = candles.length;
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
  const atr = [];
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
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
    if (i < period - 1) {
      up.push(hl2[i] - multiplier * (tr[i] || 0));
      dn.push(hl2[i] + multiplier * (tr[i] || 0));
      supertrend.push(0);
      trend.push(-1);
      continue;
    }
    
    const c = candles[i];
    const prevC = candles[i - 1] || c;
    const currentAtr = atr[i];
    
    const basicUp = hl2[i] - multiplier * currentAtr;
    const basicDn = hl2[i] + multiplier * currentAtr;
    
    const prevUp = up[i - 1] || basicUp;
    const prevDn = dn[i - 1] || basicDn;
    
    const finalUp = (basicUp > prevUp || prevC.c < prevUp) ? basicUp : prevUp;
    const finalDn = (basicDn < prevDn || prevC.c > prevDn) ? basicDn : prevDn;
    
    up.push(finalUp);
    dn.push(finalDn);
    
    const prevST = supertrend[i - 1] || 0;
    const prevTrend = trend[i - 1] || -1;
    
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
  const currentTrend = trend[lastIdx];
  const prevTrend = trend[lastIdx - 1];
  
  let signal = null;
  if (prevTrend === -1 && currentTrend === 1) signal = "buy_signal";
  else if (prevTrend === 1 && currentTrend === -1) signal = "sell_signal";
  
  return {
    trend: currentTrend === 1 ? "buy" : "sell",
    signal: signal,
    val: parseFloat(supertrend[lastIdx].toFixed(2))
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
  
  let sStartIdx = 0, bStartIdx = 0;
  for (let i = 0; i < sLen; i++) { if (stockCandles[i].t >= cutoffTs) { sStartIdx = i; break; } }
  for (let i = 0; i < bLen; i++) { if (benchCandles[i].t >= cutoffTs) { bStartIdx = i; break; } }
  
  const sStart = stockCandles[sStartIdx];
  const bStart = benchCandles[bStartIdx];
  if (!sStart || !bStart) return null;

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
  
  const hiSlice = stockCandles.slice(Math.max(0, sLen - 252));
  const hi52Max = Math.max(...hiSlice.map(c => c.c));
  const hi52_prox = hi52Max > 0 ? (sToday.c - hi52Max) / hi52Max : -0.1;

  let signSince = null, signDays = null;
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
    breakout: ars > 0 && arsPrev <= 0, 
    trending: ars > arsPrev,
    ma_status,
    ars_slope
  };
}

// Download Bhavcopy by scanning back in time
async function downloadLatestBhavcopy() {
  const tempZip = path.join(scratchDir, 'bhav.zip');
  const tempExtract = path.join(scratchDir, 'temp_bhav');

  let date = new Date();
  for (let lookback = 0; lookback < 10; lookback++) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyymmdd = `${yyyy}${mm}${dd}`;
    const url = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${yyyymmdd}_F_0000.csv.zip`;
    
    console.log(`Attempting to download Bhavcopy for ${yyyymmdd}…`);
    try {
      await downloadFile(url, tempZip);
      console.log(`Download successful!`);
      
      // Clean previous extraction folder if it exists
      if (fs.existsSync(tempExtract)) {
        fs.rmSync(tempExtract, { recursive: true, force: true });
      }
      fs.mkdirSync(tempExtract);

      // Unzip using Windows powershell or standard unzip utility on Linux/macOS
      if (process.platform === 'win32') {
        execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`);
      } else {
        execSync(`unzip -o "${tempZip}" -d "${tempExtract}"`);
      }
      
      const files = fs.readdirSync(tempExtract);
      const csvFile = files.find(f => f.endsWith('.csv'));
      if (csvFile) {
        const fullCsvPath = path.join(tempExtract, csvFile);
        const parsed = parseBhavcopy(fullCsvPath);
        
        // Clean up zip and temporary folders
        fs.unlinkSync(tempZip);
        fs.rmSync(tempExtract, { recursive: true, force: true });
        
        return { data: parsed, date: date.toISOString().split('T')[0], timestamp: Math.round(date.getTime() / 1000) };
      }
    } catch (err) {
      console.warn(`Failed for date ${yyyymmdd}: ${err.message}`);
    }
    date.setDate(date.getDate() - 1); // step back one day
  }
  throw new Error('Could not download any recent Bhavcopy files from NSE.');
}

async function run() {
  console.log('--- STARTING ADAPTIVE ALPHA PIPELINE ---');
  let bhav;
  try {
    bhav = await downloadLatestBhavcopy();
    console.log(`Using Bhavcopy Date: ${bhav.date}`);
  } catch (err) {
    console.error('Fatal Error:', err.message);
    process.exit(1);
  }

  const cutoffTs = new Date('2021-01-01').getTime() / 1000;
  console.log('Fetching Nifty Index (^NSEI) historical series…');
  const benchData = await fetchYahoo('^NSEI', '6y');
  if (!benchData || benchData.length < 100) {
    console.error('Could not load NIFTY benchmark historical data.');
    process.exit(1);
  }

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

  console.log(`Processing ${UNIVERSE.length} stocks…`);
  const results = [];
  
  for (let i = 0; i < UNIVERSE.length; i++) {
    const stock = UNIVERSE[i];
    const yf = toYF(stock.sym);
    const stockHist = await fetchYahoo(yf, '6y');
    if (!stockHist || stockHist.length < 100) {
      console.warn(`[${i+1}/${UNIVERSE.length}] Skipped ${stock.sym} (No history)`);
      continue;
    }

    // Merge latest Bhavcopy closing price and volume
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
    if (calc) {
      const st14 = calcSupertrend(stockHist, 14, 3);
      const st10 = calcSupertrend(stockHist, 10, 3);

      results.push({
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        logoid: logoIds[stock.sym] || null,
        ars: parseFloat(calc.ars.toFixed(4)),
        srs: parseFloat(calc.srs.toFixed(4)),
        vol_ratio: parseFloat(calc.vol_ratio.toFixed(2)),
        hi52_prox: parseFloat(calc.hi52_prox.toFixed(4)),
        price: parseFloat(calc.price.toFixed(2)),
        breakout: calc.breakout,
        trending: calc.trending,
        signDays: calc.signDays,
        signSince: calc.signSince,
        st14: { trend: st14.trend, signal: st14.signal, val: st14.val },
        st10: { trend: st10.trend, signal: st10.signal, val: st10.val },
        ma_status: calc.ma_status,
        ars_slope: parseFloat(calc.ars_slope.toFixed(4))
      });
    }
    
    // Throttle queries to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  // Calculate RS Rating (1-99) for each stock based on composite rank
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
    });
  }

  console.log('Fetching latest FII/DII flows...');
  const fiiDii = await fetchFiiDiiData();

  const payload = {
    updated: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) + ' IST · ' + new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short'}),
    bhavDate: bhav.date,
    fii_dii: fiiDii,
    stocks: results
  };

  fs.writeFileSync(outputJson, JSON.stringify(payload, null, 2));
  console.log(`Successfully generated data file. Saved to: ${outputJson}`);
  console.log('--- PIPELINE COMPLETED ---');
}

run();
