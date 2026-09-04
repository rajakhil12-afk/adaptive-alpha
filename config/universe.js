/**
 * Adaptive Alpha - Unified Stock Universe & Metadata Configuration
 * Single source of truth for Nifty 500 constituent lists, categorization, and Yahoo Finance mapping.
 */

// Nifty 50 constituents
const N50 = [
  {
    "sym": "ADANIENT",
    "name": "Adani Enterprises",
    "ind": "Metals & Mining"
  },
  {
    "sym": "ADANIPORTS",
    "name": "Adani Ports",
    "ind": "Services"
  },
  {
    "sym": "APOLLOHOSP",
    "name": "Apollo Hospitals",
    "ind": "Healthcare"
  },
  {
    "sym": "ASIANPAINT",
    "name": "Asian Paints",
    "ind": "Consumer Durables"
  },
  {
    "sym": "AXISBANK",
    "name": "Axis Bank",
    "ind": "Financial Services"
  },
  {
    "sym": "BAJAJ-AUTO",
    "name": "Bajaj Auto",
    "ind": "Automobile"
  },
  {
    "sym": "BAJFINANCE",
    "name": "Bajaj Finance",
    "ind": "Financial Services"
  },
  {
    "sym": "BAJAJFINSV",
    "name": "Bajaj Finserv",
    "ind": "Financial Services"
  },
  {
    "sym": "BEL",
    "name": "Bharat Electronics",
    "ind": "Capital Goods"
  },
  {
    "sym": "BHARTIARTL",
    "name": "Bharti Airtel",
    "ind": "Telecom"
  },
  {
    "sym": "CIPLA",
    "name": "Cipla",
    "ind": "Healthcare"
  },
  {
    "sym": "COALINDIA",
    "name": "Coal India",
    "ind": "Oil Gas"
  },
  {
    "sym": "DRREDDY",
    "name": "Dr Reddy's",
    "ind": "Healthcare"
  },
  {
    "sym": "EICHERMOT",
    "name": "Eicher Motors",
    "ind": "Automobile"
  },
  {
    "sym": "ZOMATO",
    "name": "Eternal (Zomato)",
    "ind": "Services"
  },
  {
    "sym": "GRASIM",
    "name": "Grasim Industries",
    "ind": "Construction Materials"
  },
  {
    "sym": "HCLTECH",
    "name": "HCL Tech",
    "ind": "IT"
  },
  {
    "sym": "HDFCBANK",
    "name": "HDFC Bank",
    "ind": "Financial Services"
  },
  {
    "sym": "HDFCLIFE",
    "name": "HDFC Life",
    "ind": "Financial Services"
  },
  {
    "sym": "HINDALCO",
    "name": "Hindalco",
    "ind": "Metals & Mining"
  },
  {
    "sym": "HINDUNILVR",
    "name": "HUL",
    "ind": "FMCG"
  },
  {
    "sym": "ICICIBANK",
    "name": "ICICI Bank",
    "ind": "Financial Services"
  },
  {
    "sym": "INDIGO",
    "name": "IndiGo",
    "ind": "Services"
  },
  {
    "sym": "INFY",
    "name": "Infosys",
    "ind": "IT"
  },
  {
    "sym": "ITC",
    "name": "ITC",
    "ind": "FMCG"
  },
  {
    "sym": "JIOFIN",
    "name": "Jio Financial",
    "ind": "Financial Services"
  },
  {
    "sym": "JSWSTEEL",
    "name": "JSW Steel",
    "ind": "Metals & Mining"
  },
  {
    "sym": "KOTAKBANK",
    "name": "Kotak Bank",
    "ind": "Financial Services"
  },
  {
    "sym": "LT",
    "name": "L&T",
    "ind": "Construction"
  },
  {
    "sym": "M_M",
    "name": "Mahindra & Mahindra",
    "ind": "Automobile"
  },
  {
    "sym": "MARUTI",
    "name": "Maruti Suzuki",
    "ind": "Automobile"
  },
  {
    "sym": "MAXHEALTH",
    "name": "Max Healthcare",
    "ind": "Healthcare"
  },
  {
    "sym": "NESTLEIND",
    "name": "Nestle India",
    "ind": "FMCG"
  },
  {
    "sym": "NTPC",
    "name": "NTPC",
    "ind": "Power"
  },
  {
    "sym": "ONGC",
    "name": "ONGC",
    "ind": "Oil Gas"
  },
  {
    "sym": "POWERGRID",
    "name": "Power Grid",
    "ind": "Power"
  },
  {
    "sym": "RELIANCE",
    "name": "Reliance",
    "ind": "Oil Gas"
  },
  {
    "sym": "SBILIFE",
    "name": "SBI Life",
    "ind": "Financial Services"
  },
  {
    "sym": "SBIN",
    "name": "State Bank of India",
    "ind": "Financial Services"
  },
  {
    "sym": "SHRIRAMFIN",
    "name": "Shriram Finance",
    "ind": "Financial Services"
  },
  {
    "sym": "SUNPHARMA",
    "name": "Sun Pharma",
    "ind": "Healthcare"
  },
  {
    "sym": "TATACONSUM",
    "name": "Tata Consumer",
    "ind": "FMCG"
  },
  {
    "sym": "TATAMOTORS",
    "name": "Tata Motors",
    "ind": "Automobile"
  },
  {
    "sym": "TATASTEEL",
    "name": "Tata Steel",
    "ind": "Metals & Mining"
  },
  {
    "sym": "TCS",
    "name": "TCS",
    "ind": "IT"
  },
  {
    "sym": "TECHM",
    "name": "Tech Mahindra",
    "ind": "IT"
  },
  {
    "sym": "TITAN",
    "name": "Titan",
    "ind": "Consumer Durables"
  },
  {
    "sym": "TRENT",
    "name": "Trent",
    "ind": "Consumer Services"
  },
  {
    "sym": "ULTRACEMCO",
    "name": "UltraTech Cement",
    "ind": "Construction Materials"
  },
  {
    "sym": "WIPRO",
    "name": "Wipro",
    "ind": "IT"
  }
];

// Nifty Next 50 (Large Cap extension)
const EXTRA = [
  {sym:'ABB', name:'ABB India', ind:'Capital Goods'},
  {sym:'ADANIENSOL', name:'Adani Energy Sol', ind:'Power'},
  {sym:'ADANIGREEN', name:'Adani Green', ind:'Power'},
  {sym:'ADANIPOWER', name:'Adani Power', ind:'Power'},
  {sym:'AMBUJACEM', name:'Ambuja Cements', ind:'Construction Materials'},
  {sym:'BAJAJHLDNG', name:'Bajaj Holdings', ind:'Financial Services'},
  {sym:'BANKBARODA', name:'Bank of Baroda', ind:'Financial Services'},
  {sym:'BERGEPAINT', name:'Berger Paints', ind:'Consumer Durables'},
  {sym:'BOSCHLTD', name:'Bosch India', ind:'Automobile'},
  {sym:'BRITANNIA', name:'Britannia', ind:'FMCG'},
  {sym:'CANBK', name:'Canara Bank', ind:'Financial Services'},
  {sym:'CGPOWER', name:'CG Power', ind:'Capital Goods'},
  {sym:'CHOLAFIN', name:'Chola Finance', ind:'Financial Services'},
  {sym:'COLPAL', name:'Colgate-Palmolive', ind:'FMCG'},
  {sym:'CUMMINSIND', name:'Cummins India', ind:'Capital Goods'},
  {sym:'DIVISLAB', name:'Divi\'s Labs', ind:'Healthcare'},
  {sym:'DLF', name:'DLF', ind:'Realty'},
  {sym:'DMART', name:'Avenue Supermarts', ind:'Consumer Services'},
  {sym:'GAIL', name:'GAIL', ind:'Oil Gas'},
  {sym:'GODREJCP', name:'Godrej Consumer', ind:'FMCG'},
  {sym:'HAL', name:'HAL', ind:'Capital Goods'},
  {sym:'HAVELLS', name:'Havells India', ind:'Consumer Durables'},
  {sym:'HDFCAMC', name:'HDFC AMC', ind:'Financial Services'},
  {sym:'HEROMOTOCO', name:'Hero MotoCorp', ind:'Automobile'},
  {sym:'HINDZINC', name:'Hindustan Zinc', ind:'Metals & Mining'},
  {sym:'HYUNDAI', name:'Hyundai India', ind:'Automobile'},
  {sym:'ICICIGI', name:'ICICI Lombard', ind:'Financial Services'},
  {sym:'ICICIPRULI', name:'ICICI Prudential Life', ind:'Financial Services'},
  {sym:'INDHOTEL', name:'Indian Hotels', ind:'Consumer Services'},
  {sym:'IOC', name:'Indian Oil', ind:'Oil Gas'},
  {sym:'IRFC', name:'IRFC', ind:'Financial Services'},
  {sym:'JINDALSTEL', name:'Jindal Steel', ind:'Metals & Mining'},
  {sym:'JSWENERGY', name:'JSW Energy', ind:'Power'},
  {sym:'LTIM', name:'LTIMindtree', ind:'IT'},
  {sym:'LODHA', name:'Lodha', ind:'Realty'},
  {sym:'MARICO', name:'Marico', ind:'FMCG'},
  {sym:'MAZDOCK', name:'Mazagon Dock', ind:'Capital Goods'},
  {sym:'MOTHERSON', name:'Samvardhana Motherson', ind:'Automobile'},
  {sym:'MUTHOOTFIN', name:'Muthoot Finance', ind:'Financial Services'},
  {sym:'PFC', name:'PFC', ind:'Financial Services'},
  {sym:'PIDILITIND', name:'Pidilite', ind:'Chemicals'},
  {sym:'PNB', name:'Punjab National Bank', ind:'Financial Services'},
  {sym:'RECLTD', name:'REC Ltd', ind:'Financial Services'},
  {sym:'SHREECEM', name:'Shree Cement', ind:'Construction Materials'},
  {sym:'SIEMENS', name:'Siemens India', ind:'Capital Goods'},
  {sym:'SOLARINDS', name:'Solar Industries', ind:'Chemicals'},
  {sym:'TATAPOWER', name:'Tata Power', ind:'Power'},
  {sym:'TORNTPHARM', name:'Torrent Pharma', ind:'Healthcare'},
  {sym:'TVSMOTOR', name:'TVS Motor', ind:'Automobile'},
  {sym:'UNIONBANK', name:'Union Bank', ind:'Financial Services'}
];

// Nifty Midcap 100
const MIDCAP100 = [
  {sym:'ABCAPITAL', name:'Aditya Birla Capital', ind:'Financial Services'},
  {sym:'ALKEM', name:'Alkem Labs', ind:'Healthcare'},
  {sym:'APLAPOLLO', name:'APL Apollo Tubes', ind:'Metals & Mining'},
  {sym:'APOLLOTYRE', name:'Apollo Tyres', ind:'Automobile'},
  {sym:'ASHOKLEY', name:'Ashok Leyland', ind:'Automobile'},
  {sym:'ASTRAL', name:'Astral Ltd', ind:'Capital Goods'},
  {sym:'AUBANK', name:'AU Small Finance Bank', ind:'Financial Services'},
  {sym:'AUROPHARMA', name:'Aurobindo Pharma', ind:'Healthcare'},
  {sym:'BALKRISIND', name:'Balkrishna Industries', ind:'Automobile'},
  {sym:'BANDHANBNK', name:'Bandhan Bank', ind:'Financial Services'},
  {sym:'BANKINDIA', name:'Bank of India', ind:'Financial Services'},
  {sym:'BHARATFORG', name:'Bharat Forge', ind:'Capital Goods'},
  {sym:'BHEL', name:'Bharat Heavy Electricals', ind:'Capital Goods'},
  {sym:'BIOCON', name:'Biocon', ind:'Healthcare'},
  {sym:'BLUESTARCO', name:'Blue Star', ind:'Consumer Durables'},
  {sym:'BSE', name:'BSE Ltd', ind:'Financial Services'},
  {sym:'COCHINSHIP', name:'Cochin Shipyard', ind:'Capital Goods'},
  {sym:'COFORGE', name:'Coforge', ind:'IT'},
  {sym:'CONCOR', name:'Container Corp', ind:'Services'},
  {sym:'COROMANDEL', name:'Coromandel Int', ind:'Chemicals'},
  {sym:'CRISIL', name:'CRISIL', ind:'Financial Services'},
  {sym:'DABUR', name:'Dabur India', ind:'FMCG'},
  {sym:'DEEPAKNTR', name:'Deepak Nitrite', ind:'Chemicals'},
  {sym:'DELHIVERY', name:'Delhivery', ind:'Services'},
  {sym:'DIXON', name:'Dixon Technologies', ind:'Consumer Durables'},
  {sym:'EMAMILTD', name:'Emami', ind:'FMCG'},
  {sym:'ESCORTS', name:'Escorts Kubota', ind:'Capital Goods'},
  {sym:'EXIDEIND', name:'Exide Industries', ind:'Automobile'},
  {sym:'FACT', name:'Fertilizers & Chem', ind:'Chemicals'},
  {sym:'FEDERALBNK', name:'Federal Bank', ind:'Financial Services'},
  {sym:'FORTIS', name:'Fortis Healthcare', ind:'Healthcare'},
  {sym:'GICRE', name:'GIC Re', ind:'Financial Services'},
  {sym:'GLENMARK', name:'Glenmark Pharma', ind:'Healthcare'},
  {sym:'GMRAIRPORT', name:'GMR Airports', ind:'Services'},
  {sym:'GODREJPROP', name:'Godrej Properties', ind:'Realty'},
  {sym:'GUJGASLTD', name:'Gujarat Gas', ind:'Oil Gas'},
  {sym:'HUDCO', name:'HUDCO', ind:'Financial Services'},
  {sym:'IDBI', name:'IDBI Bank', ind:'Financial Services'},
  {sym:'IDFCFIRSTB', name:'IDFC First Bank', ind:'Financial Services'},
  {sym:'IEX', name:'Indian Energy Exch', ind:'Financial Services'},
  {sym:'INDIANB', name:'Indian Bank', ind:'Financial Services'},
  {sym:'INDUSTOWER', name:'Indus Towers', ind:'Telecom'},
  {sym:'IOB', name:'Indian Overseas Bank', ind:'Financial Services'},
  {sym:'IRCTC', name:'IRCTC', ind:'Services'},
  {sym:'IREDA', name:'IREDA', ind:'Financial Services'},
  {sym:'JKCEMENT', name:'JK Cement', ind:'Construction Materials'},
  {sym:'JSL', name:'Jindal Stainless', ind:'Metals & Mining'},
  {sym:'JUBLFOOD', name:'Jubilant FoodWorks', ind:'Consumer Services'},
  {sym:'KALYANKJIL', name:'Kalyan Jewellers', ind:'Consumer Durables'},
  {sym:'KAYNES', name:'Kaynes Technology', ind:'Capital Goods'},
  {sym:'KEI', name:'KEI Industries', ind:'Capital Goods'},
  {sym:'KPITTECH', name:'KPIT Technologies', ind:'IT'},
  {sym:'LAURUSLABS', name:'Laurus Labs', ind:'Healthcare'},
  {sym:'LICHSGFIN', name:'LIC Housing Finance', ind:'Financial Services'},
  {sym:'LICI', name:'LIC India', ind:'Financial Services'},
  {sym:'LLOYDSME', name:'Lloyds Metals', ind:'Metals & Mining'},
  {sym:'LUPIN', name:'Lupin', ind:'Healthcare'},
  {sym:'M&MFIN', name:'M&M Financial', ind:'Financial Services'},
  {sym:'MAHABANK', name:'Bank of Maharashtra', ind:'Financial Services'},
  {sym:'MANKIND', name:'Mankind Pharma', ind:'Healthcare'},
  {sym:'MCX', name:'MCX India', ind:'Financial Services'},
  {sym:'MFSL', name:'Max Financial Services', ind:'Financial Services'},
  {sym:'MGL', name:'Mahanagar Gas', ind:'Oil Gas'},
  {sym:'MOTILALOFS', name:'Motilal Oswal Fin', ind:'Financial Services'},
  {sym:'MPHASIS', name:'Mphasis', ind:'IT'},
  {sym:'MRF', name:'MRF', ind:'Automobile'},
  {sym:'NAM-INDIA', name:'Nippon Life India AMC', ind:'Financial Services'},
  {sym:'NATIONALUM', name:'National Aluminium', ind:'Metals & Mining'},
  {sym:'NAUKRI', name:'Info Edge', ind:'IT'},
  {sym:'NHPC', name:'NHPC', ind:'Power'},
  {sym:'NIACL', name:'New India Assurance', ind:'Financial Services'},
  {sym:'NLCINDIA', name:'NLC India', ind:'Power'},
  {sym:'NMDC', name:'NMDC', ind:'Metals & Mining'},
  {sym:'OBEROIRLTY', name:'Oberoi Realty', ind:'Realty'},
  {sym:'OFSS', name:'Oracle Financial Serv', ind:'IT'},
  {sym:'OIL', name:'Oil India', ind:'Oil Gas'},
  {sym:'PAGEIND', name:'Page Industries', ind:'Textiles'},
  {sym:'PATANJALI', name:'Patanjali Foods', ind:'FMCG'},
  {sym:'PAYTM', name:'Paytm (One97)', ind:'Financial Services'},
  {sym:'PERSISTENT', name:'Persistent Systems', ind:'IT'},
  {sym:'PETRONET', name:'Petronet LNG', ind:'Oil Gas'},
  {sym:'PGHH', name:'P&G Hygiene', ind:'FMCG'},
  {sym:'PHOENIXLTD', name:'Phoenix Mills', ind:'Realty'},
  {sym:'PIIND', name:'PI Industries', ind:'Chemicals'},
  {sym:'POLICYBZR', name:'PB Fintech', ind:'Financial Services'},
  {sym:'POLYCAB', name:'Polycab India', ind:'Capital Goods'},
  {sym:'POONAWALLA', name:'Poonawalla Fincorp', ind:'Financial Services'},
  {sym:'POWERINDIA', name:'Hitachi Energy India', ind:'Capital Goods'},
  {sym:'PRESTIGE', name:'Prestige Estates', ind:'Realty'},
  {sym:'PVRINOX', name:'PVR Inox', ind:'Consumer Services'},
  {sym:'RVNL', name:'Rail Vikas Nigam', ind:'Construction'},
  {sym:'SAIL', name:'SAIL', ind:'Metals & Mining'},
  {sym:'SJVN', name:'SJVN', ind:'Power'},
  {sym:'SONACOMS', name:'Sona BLW Precision', ind:'Automobile'},
  {sym:'SRF', name:'SRF Limited', ind:'Chemicals'},
  {sym:'SUNDARMFIN', name:'Sundaram Finance', ind:'Financial Services'},
  {sym:'SUPREMEIND', name:'Supreme Industries', ind:'Chemicals'},
  {sym:'SUZLON', name:'Suzlon Energy', ind:'Power'},
  {sym:'TATACHEM', name:'Tata Chemicals', ind:'Chemicals'},
  {sym:'TATACOMM', name:'Tata Communications', ind:'Telecom'}
];

// Nifty Smallcap 100
const SMALLCAP100 = [
  {sym:'AARTIIND', name:'Aarti Industries', ind:'Chemicals'},
  {sym:'ABREL', name:'Aditya Birla Real Estate', ind:'Realty'},
  {sym:'AEGISLOG', name:'Aegis Logistics', ind:'Oil Gas'},
  {sym:'AFCONS', name:'Afcons Infrastructure', ind:'Construction'},
  {sym:'AFFLE', name:'Affle 3i', ind:'IT'},
  {sym:'AMBER', name:'Amber Enterprises', ind:'Consumer Durables'},
  {sym:'ANANDRATHI', name:'Anand Rathi Wealth', ind:'Financial Services'},
  {sym:'ANANTRAJ', name:'Anant Raj', ind:'Realty'},
  {sym:'ANGELONE', name:'Angel One', ind:'Financial Services'},
  {sym:'APTUS', name:'Aptus Value Housing', ind:'Financial Services'},
  {sym:'ARE&M', name:'Amara Raja Energy', ind:'Automobile'},
  {sym:'ASTERDM', name:'Aster DM Healthcare', ind:'Healthcare'},
  {sym:'BEML', name:'BEML', ind:'Capital Goods'},
  {sym:'BLS', name:'BLS International', ind:'Consumer Services'},
  {sym:'BRAINBEES', name:'FirstCry (Brainbees)', ind:'Consumer Services'},
  {sym:'BRIGADE', name:'Brigade Enterprises', ind:'Realty'},
  {sym:'CAMS', name:'CAMS', ind:'Financial Services'},
  {sym:'CASTROLIND', name:'Castrol India', ind:'Oil Gas'},
  {sym:'CDSL', name:'CDSL', ind:'Financial Services'},
  {sym:'CESC', name:'CESC', ind:'Power'},
  {sym:'CGCL', name:'Capri Global Capital', ind:'Financial Services'},
  {sym:'CHALET', name:'Chalet Hotels', ind:'Consumer Services'},
  {sym:'CHAMBLFERT', name:'Chambal Fertilizers', ind:'Chemicals'},
  {sym:'CHOLAHLDNG', name:'Chola Financial Hldgs', ind:'Financial Services'},
  {sym:'CIGNITITEC', name:'Cigniti Technologies', ind:'IT'},
  {sym:'COHANCE', name:'Cohance Lifesciences', ind:'Healthcare'},
  {sym:'CREDITACC', name:'CreditAccess Grameen', ind:'Financial Services'},
  {sym:'CROMPTON', name:'Crompton Greaves Consumer', ind:'Consumer Durables'},
  {sym:'CUB', name:'City Union Bank', ind:'Financial Services'},
  {sym:'DATAPATTNS', name:'Data Patterns', ind:'Capital Goods'},
  {sym:'DEEPAKFERT', name:'Deepak Fertilisers', ind:'Chemicals'},
  {sym:'DEVYANI', name:'Devyani International', ind:'Consumer Services'},
  {sym:'FIVESTAR', name:'Five-Star Business Fin', ind:'Financial Services'},
  {sym:'FORCEMOT', name:'Force Motors', ind:'Automobile'},
  {sym:'FSL', name:'Firstsource Solutions', ind:'Services'},
  {sym:'GESHIP', name:'Great Eastern Shipping', ind:'Services'},
  {sym:'GLAND', name:'Gland Pharma', ind:'Healthcare'},
  {sym:'GMDCLTD', name:'Gujarat Mineral Dev', ind:'Metals & Mining'},
  {sym:'GPIL', name:'Godawari Power', ind:'Capital Goods'},
  {sym:'GREENPANEL', name:'Greenpanel Industries', ind:'Consumer Durables'},
  {sym:'GRSE', name:'Garden Reach Shipbuilder', ind:'Capital Goods'},
  {sym:'HBLPOWER', name:'HBL Power Systems', ind:'Capital Goods'},
  {sym:'HINDCOPPER', name:'Hindustan Copper', ind:'Metals & Mining'},
  {sym:'HONASA', name:'Honasa Consumer', ind:'FMCG'},
  {sym:'HSCL', name:'Himadri Speciality Chem', ind:'Chemicals'},
  {sym:'IBREALEST', name:'Indiabulls Real Estate', ind:'Realty'},
  {sym:'IFCI', name:'IFCI', ind:'Financial Services'},
  {sym:'IGL', name:'Indraprastha Gas', ind:'Oil Gas'},
  {sym:'IIFL', name:'IIFL Finance', ind:'Financial Services'},
  {sym:'IIFLSEC', name:'IIFL Securities', ind:'Financial Services'},
  {sym:'IKS', name:'Inventurus Knowledge', ind:'IT'},
  {sym:'INOXWIND', name:'Inox Wind', ind:'Capital Goods'},
  {sym:'IONEXCHANG', name:'Ion Exchange', ind:'Capital Goods'},
  {sym:'IRCON', name:'IRCON International', ind:'Construction'},
  {sym:'ITI', name:'ITI', ind:'Telecom'},
  {sym:'JBMA', name:'JBM Auto', ind:'Automobile'},
  {sym:'JMFINANCIL', name:'JM Financial', ind:'Financial Services'},
  {sym:'JYOTHYLAB', name:'Jyothy Labs', ind:'FMCG'},
  {sym:'JYOTICNC', name:'Jyoti CNC Automation', ind:'Capital Goods'},
  {sym:'KARURVYSYA', name:'Karur Vysya Bank', ind:'Financial Services'},
  {sym:'KEC', name:'KEC International', ind:'Construction'},
  {sym:'KFINTECH', name:'KFin Technologies', ind:'Financial Services'},
  {sym:'KIRLOSENG', name:'Kirloskar Oil Engines', ind:'Capital Goods'},
  {sym:'LALPATHLAB', name:'Dr Lal PathLabs', ind:'Healthcare'},
  {sym:'MANAPPURAM', name:'Manappuram Finance', ind:'Financial Services'},
  {sym:'MARKSANS', name:'Marksans Pharma', ind:'Healthcare'},
  {sym:'MEDANTA', name:'Global Health (Medanta)', ind:'Healthcare'},
  {sym:'MRPL', name:'MRPL', ind:'Oil Gas'},
  {sym:'MSTCLTD', name:'MSTC Ltd', ind:'Services'},
  {sym:'NATCOPHARM', name:'NATCO Pharma', ind:'Healthcare'},
  {sym:'NAVINFLUOR', name:'Navin Fluorine', ind:'Chemicals'},
  {sym:'NBCC', name:'NBCC India', ind:'Construction'},
  {sym:'NETWEB', name:'Netweb Technologies', ind:'IT'},
  {sym:'NEULANDLAB', name:'Neuland Labs', ind:'Healthcare'},
  {sym:'NH', name:'Narayana Hrudayalaya', ind:'Healthcare'},
  {sym:'NUVAMA', name:'Nuvama Wealth', ind:'Financial Services'},
  {sym:'OLAELEC', name:'Ola Electric', ind:'Automobile'},
  {sym:'PARAS', name:'Paras Defence', ind:'Capital Goods'},
  {sym:'PGEL', name:'PG Electroplast', ind:'Consumer Durables'},
  {sym:'PIRAMALFIN', name:'Piramal Finance', ind:'Financial Services'},
  {sym:'PNBHOUSING', name:'PNB Housing Finance', ind:'Financial Services'},
  {sym:'PPLPHARMA', name:'Piramal Pharma', ind:'Healthcare'},
  {sym:'RAMCOCEM', name:'Ramco Cements', ind:'Construction Materials'},
  {sym:'RBLBANK', name:'RBL Bank', ind:'Financial Services'},
  {sym:'REDINGTON', name:'Redington', ind:'Services'},
  {sym:'RELINFRA', name:'Reliance Infrastructure', ind:'Power'},
  {sym:'RKFORGE', name:'Ramkrishna Forgings', ind:'Capital Goods'},
  {sym:'RPOWER', name:'Reliance Power', ind:'Power'},
  {sym:'SAGILITY', name:'Sagility', ind:'IT'},
  {sym:'SAILIFE', name:'Sai Life Sciences', ind:'Healthcare'},
  {sym:'SARDAEN', name:'Sarda Energy', ind:'Metals & Mining'},
  {sym:'SIGNATURE', name:'Signatureglobal', ind:'Realty'},
  {sym:'STARHEALTH', name:'Star Health Insurance', ind:'Financial Services'},
  {sym:'SUVENPHAR', name:'Suven Pharmaceuticals', ind:'Healthcare'},
  {sym:'SWANENERGY', name:'Swan Energy', ind:'Diversified'},
  {sym:'SYNGENE', name:'Syngene International', ind:'Healthcare'},
  {sym:'SYRMA', name:'Syrma SGS Technology', ind:'Capital Goods'},
  {sym:'TANLA', name:'Tanla Platforms', ind:'IT'},
  {sym:'TATAINVEST', name:'Tata Investment Corp', ind:'Financial Services'},
  {sym:'TITAGARH', name:'Titagarh Rail Systems', ind:'Capital Goods'}
];

// Remainder of Nifty 500 universe
const N500_REST = [
  {sym:'AAVAS', name:'Aavas Financiers', ind:'Financial Services'},
  {sym:'ABBOTINDIA', name:'Abbott India', ind:'Healthcare'},
  {sym:'ABFRL', name:'Aditya Birla Fashion', ind:'Consumer Services'},
  {sym:'ACE', name:'Action Construction', ind:'Capital Goods'},
  {sym:'AJANTPHARM', name:'Ajanta Pharma', ind:'Healthcare'},
  {sym:'AKZOINDIA', name:'Akzo Nobel India', ind:'Chemicals'},
  {sym:'ALKYLAMINE', name:'Alkyl Amines', ind:'Chemicals'},
  {sym:'ALLCARGO', name:'Allcargo Logistics', ind:'Services'},
  {sym:'ALOKINDS', name:'Alok Industries', ind:'Textiles'},
  {sym:'AMRUTANJAN', name:'Amrutanjan Health Care', ind:'Healthcare'},
  {sym:'ANURAS', name:'Anupam Rasayan', ind:'Chemicals'},
  {sym:'ASTEC', name:'Astec LifeSciences', ind:'Chemicals'},
  {sym:'ASTRAZEN', name:'AstraZeneca India', ind:'Healthcare'},
  {sym:'ATGL', name:'Adani Total Gas', ind:'Oil Gas'},
  {sym:'ATUL', name:'Atul Ltd', ind:'Chemicals'},
  {sym:'AVANTIFEED', name:'Avanti Feeds', ind:'FMCG'},
  {sym:'BALAMINES', name:'Balaji Amines', ind:'Chemicals'},
  {sym:'BALRAMCHIN', name:'Balrampur Chini', ind:'FMCG'},
  {sym:'BATAINDIA', name:'Bata India', ind:'Consumer Durables'},
  {sym:'BAYERCROP', name:'Bayer CropScience', ind:'Chemicals'},
  {sym:'BECTORFOOD', name:'Mrs Bectors Food', ind:'FMCG'},
  {sym:'BIRLACORPN', name:'Birla Corporation', ind:'Construction Materials'},
  {sym:'BORORENEW', name:'Borosil Renewables', ind:'Capital Goods'},
  {sym:'BSOFT', name:'Birlasoft', ind:'IT'},
  {sym:'CAMPUS', name:'Campus Activewear', ind:'Consumer Durables'},
  {sym:'CANFINHOME', name:'Can Fin Homes', ind:'Financial Services'},
  {sym:'CAPLIPOINT', name:'Caplin Point Lab', ind:'Healthcare'},
  {sym:'CARBORUNIV', name:'Carborundum Universal', ind:'Capital Goods'},
  {sym:'CARERATING', name:'CARE Ratings', ind:'Financial Services'},
  {sym:'CCL', name:'CCL Products', ind:'FMCG'},
  {sym:'CEATLTD', name:'CEAT Ltd', ind:'Automobile'},
  {sym:'CEINFO', name:'MapmyIndia (CE Info)', ind:'IT'},
  {sym:'CENTRALBK', name:'Central Bank of India', ind:'Financial Services'},
  {sym:'CENTUM', name:'Centum Electronics', ind:'Capital Goods'},
  {sym:'CENTURYPLY', name:'Century Plyboards', ind:'Consumer Durables'},
  {sym:'CENTURYTEX', name:'Century Textiles', ind:'Realty'},
  {sym:'CERA', name:'Cera Sanitaryware', ind:'Consumer Durables'},
  {sym:'CHENNPETRO', name:'Chennai Petroleum', ind:'Oil Gas'},
  {sym:'CIEINDIA', name:'CIE Automotive India', ind:'Automobile'},
  {sym:'CLEDUCATE', name:'CL Educate', ind:'Consumer Services'},
  {sym:'CRAFTSMAN', name:'Craftsman Automation', ind:'Automobile'},
  {sym:'CSBBANK', name:'CSB Bank', ind:'Financial Services'},
  {sym:'CYIENT', name:'Cyient', ind:'IT'},
  {sym:'DATAMATICS', name:'Datamatics Global', ind:'IT'},
  {sym:'DCMSHRIRAM', name:'DCM Shriram', ind:'Chemicals'},
  {sym:'DHANUKA', name:'Dhanuka Agritech', ind:'Chemicals'},
  {sym:'DISHTV', name:'Dish TV India', ind:'Consumer Services'},
  {sym:'DODLA', name:'Dodla Dairy', ind:'FMCG'},
  {sym:'EASEMYTRIP', name:'Easy Trip Planners', ind:'Services'},
  {sym:'EIDPARRY', name:'EID Parry', ind:'FMCG'},
  {sym:'EIHOTEL', name:'EIH Ltd (Oberoi)', ind:'Consumer Services'},
  {sym:'ELECON', name:'Elecon Engineering', ind:'Capital Goods'},
  {sym:'ELGIEQUIP', name:'Elgi Equipments', ind:'Capital Goods'},
  {sym:'ENDURANCE', name:'Endurance Tech', ind:'Automobile'},
  {sym:'ENGINERSIN', name:'Engineers India', ind:'Construction'},
  {sym:'EPL', name:'EPL Ltd', ind:'Consumer Durables'},
  {sym:'EQUITASBNK', name:'Equitas Small Fin Bank', ind:'Financial Services'},
  {sym:'ERIS', name:'Eris Lifesciences', ind:'Healthcare'},
  {sym:'EVEREADY', name:'Eveready Industries', ind:'FMCG'},
  {sym:'FDC', name:'FDC Ltd', ind:'Healthcare'},
  {sym:'FINCABLES', name:'Finolex Cables', ind:'Capital Goods'},
  {sym:'FINEORG', name:'Fine Organic Ind', ind:'Chemicals'},
  {sym:'FINPIPE', name:'Finolex Industries', ind:'Capital Goods'},
  {sym:'GALAXYSURF', name:'Galaxy Surfactants', ind:'Chemicals'},
  {sym:'GILLETTE', name:'Gillette India', ind:'FMCG'},
  {sym:'GLAXO', name:'GlaxoSmithKline Pharma', ind:'Healthcare'},
  {sym:'GNFC', name:'GNFC', ind:'Chemicals'},
  {sym:'GODFRYPHLP', name:'Godfrey Phillips', ind:'FMCG'},
  {sym:'GODREJIND', name:'Godrej Industries', ind:'Diversified'},
  {sym:'GPPL', name:'Gujarat Pipavav Port', ind:'Services'},
  {sym:'GRANULES', name:'Granules India', ind:'Healthcare'},
  {sym:'GRAPHITE', name:'Graphite India', ind:'Capital Goods'},
  {sym:'GREENPLY', name:'Greenply Industries', ind:'Consumer Durables'},
  {sym:'GRINDWELL', name:'Grindwell Norton', ind:'Capital Goods'},
  {sym:'GSFC', name:'Gujarat State Fert', ind:'Chemicals'},
  {sym:'GSPL', name:'GSPL', ind:'Oil Gas'},
  {sym:'HAPPSTMNDS', name:'Happiest Minds Tech', ind:'IT'},
  {sym:'HATHWAY', name:'Hathway Cable', ind:'Telecom'},
  {sym:'HEG', name:'HEG Ltd', ind:'Capital Goods'},
  {sym:'HEIDELBERG', name:'HeidelbergCement', ind:'Construction Materials'},
  {sym:'HFCL', name:'HFCL Ltd', ind:'Telecom'},
  {sym:'HIKAL', name:'Hikal', ind:'Healthcare'},
  {sym:'HIMATSEIDE', name:'Himatsingka Seide', ind:'Textiles'},
  {sym:'HINDPETRO', name:'HPCL', ind:'Oil Gas'},
  {sym:'HINDWAREAP', name:'Hindware Home Innov', ind:'Consumer Durables'},
  {sym:'HLEGLAS', name:'HLE Glascoat', ind:'Capital Goods'},
  {sym:'HOMEFIRST', name:'Home First Finance', ind:'Financial Services'},
  {sym:'HONAUT', name:'Honeywell Automation', ind:'Capital Goods'},
  {sym:'IDEA', name:'Vodafone Idea', ind:'Telecom'},
  {sym:'IGARASHI', name:'Igarashi Motors', ind:'Automobile'},
  {sym:'INDCO', name:'Indoco Remedies', ind:'Healthcare'},
  {sym:'INDIAMART', name:'IndiaMART InterMESH', ind:'IT'},
  {sym:'ISGEC', name:'ISGEC Heavy Eng', ind:'Capital Goods'},
  {sym:'JAGRAN', name:'Jagran Prakashan', ind:'Consumer Services'},
  {sym:'JAICORPLTD', name:'Jai Corp', ind:'Diversified'},
  {sym:'JAMNAAUTO', name:'Jamna Auto Ind', ind:'Automobile'},
  {sym:'JBCHEPHARM', name:'JB Chemicals', ind:'Healthcare'},
  {sym:'JINDALSAW', name:'Jindal Saw', ind:'Metals & Mining'},
  {sym:'JINDWORLD', name:'Jindal Worldwide', ind:'Textiles'},
  {sym:'JKLAKSHMI', name:'JK Lakshmi Cement', ind:'Construction Materials'},
  {sym:'JKPAPER', name:'JK Paper', ind:'Paper'},
  {sym:'JSWHL', name:'JSW Holdings', ind:'Financial Services'},
  {sym:'JUBLINGREA', name:'Jubilant Ingrevia', ind:'Chemicals'},
  {sym:'JUBLPHARMA', name:'Jubilant Pharmova', ind:'Healthcare'},
  {sym:'JUSTDIAL', name:'Just Dial', ind:'IT'},
  {sym:'KANSAINER', name:'Kansai Nerolac Paints', ind:'Consumer Durables'},
  {sym:'KIMS', name:'Krishna Inst of Med', ind:'Healthcare'},
  {sym:'KIRLOSIND', name:'Kirloskar Industries', ind:'Capital Goods'},
  {sym:'KNRCON', name:'KNR Constructions', ind:'Construction'},
  {sym:'KRBL', name:'KRBL Ltd', ind:'FMCG'},
  {sym:'KSB', name:'KSB Ltd', ind:'Capital Goods'},
  {sym:'LEMONTREE', name:'Lemon Tree Hotels', ind:'Consumer Services'},
  {sym:'LTF', name:'L&T Finance', ind:'Financial Services'},
  {sym:'LTTS', name:'L&T Technology Serv', ind:'IT'},
  {sym:'LXCHEM', name:'Laxmi Organic Ind', ind:'Chemicals'},
  {sym:'MAHLOG', name:'Mahindra Logistics', ind:'Services'},
  {sym:'MASTEK', name:'Mastek Ltd', ind:'IT'},
  {sym:'MEDPLUS', name:'MedPlus Health', ind:'Healthcare'},
  {sym:'METROPOLIS', name:'Metropolis Healthcare', ind:'Healthcare'},
  {sym:'MINDACORP', name:'Minda Corporation', ind:'Automobile'},
  {sym:'MMTC', name:'MMTC Ltd', ind:'Services'},
  {sym:'MOIL', name:'MOIL Ltd', ind:'Metals & Mining'},
  {sym:'NAZARA', name:'Nazara Technologies', ind:'IT'},
  {sym:'NCC', name:'NCC Ltd', ind:'Construction'},
  {sym:'NESCO', name:'Nesco Ltd', ind:'Services'},
  {sym:'NETWORK18', name:'Network18 Media', ind:'Consumer Services'},
  {sym:'NEWGEN', name:'Newgen Software', ind:'IT'},
  {sym:'NOCIL', name:'NOCIL Ltd', ind:'Chemicals'},
  {sym:'OBCL', name:'Orissa Minerals', ind:'Metals & Mining'},
  {sym:'ORIENTELEC', name:'Orient Electric', ind:'Consumer Durables'},
  {sym:'PCBL', name:'PCBL Ltd', ind:'Chemicals'},
  {sym:'PFIZER', name:'Pfizer India', ind:'Healthcare'},
  {sym:'PFS', name:'PTC India Financial', ind:'Financial Services'},
  {sym:'PGHL', name:'P&G Health', ind:'Healthcare'},
  {sym:'PNCINFRA', name:'PNC Infratech', ind:'Construction'},
  {sym:'POLYMED', name:'Poly Medicure', ind:'Healthcare'},
  {sym:'POLYPLEX', name:'Polyplex Corp', ind:'Capital Goods'},
  {sym:'PRAJIND', name:'Praj Industries', ind:'Capital Goods'},
  {sym:'PRINCEPIPE', name:'Prince Pipes', ind:'Capital Goods'},
  {sym:'PRSMJOHNSN', name:'Prism Johnson', ind:'Construction Materials'},
  {sym:'PTC', name:'PTC India', ind:'Power'},
  {sym:'RADICO', name:'Radico Khaitan', ind:'FMCG'},
  {sym:'RAILTEL', name:'RailTel Corp', ind:'Telecom'},
  {sym:'RAIN', name:'Rain Industries', ind:'Chemicals'},
  {sym:'RAJESHEXPO', name:'Rajesh Exports', ind:'Consumer Durables'},
  {sym:'RALLIS', name:'Rallis India', ind:'Chemicals'},
  {sym:'RANEHOLDIN', name:'Rane Holdings', ind:'Automobile'},
  {sym:'RATNAMANI', name:'Ratnamani Metals', ind:'Metals & Mining'},
  {sym:'RAYMOND', name:'Raymond Ltd', ind:'Textiles'},
  {sym:'RELAXO', name:'Relaxo Footwears', ind:'Consumer Durables'},
  {sym:'RHIM', name:'RHI Magnesita', ind:'Capital Goods'},
  {sym:'RITES', name:'RITES Ltd', ind:'Construction'},
  {sym:'ROSSARI', name:'Rossari Biotech', ind:'Chemicals'},
  {sym:'ROUTE', name:'Route Mobile', ind:'IT'},
  {sym:'SAFARI', name:'Safari Industries', ind:'Consumer Durables'},
  {sym:'SAMHI', name:'Samhi Hotels', ind:'Consumer Services'},
  {sym:'SANOFI', name:'Sanofi India', ind:'Healthcare'},
  {sym:'SBFC', name:'SBFC Finance', ind:'Financial Services'},
  {sym:'SBICARD', name:'SBI Cards', ind:'Financial Services'},
  {sym:'SCHAEFFLER', name:'Schaeffler India', ind:'Capital Goods'},
  {sym:'SCHNEIDER', name:'Schneider Electric', ind:'Power'},
  {sym:'SCI', name:'Shipping Corp of India', ind:'Services'},
  {sym:'SHARDACROP', name:'Sharda Cropchem', ind:'Chemicals'},
  {sym:'SHYAMMETL', name:'Shyam Metalics', ind:'Metals & Mining'},
  {sym:'SJS', name:'SJS Enterprises', ind:'Automobile'},
  {sym:'SKFINDIA', name:'SKF India', ind:'Capital Goods'},
  {sym:'SOBHA', name:'Sobha Ltd', ind:'Realty'},
  {sym:'SONATSOFTW', name:'Sonata Software', ind:'IT'},
  {sym:'SPARC', name:'SPARC', ind:'Healthcare'},
  {sym:'STAR', name:'Strides Pharma', ind:'Healthcare'},
  {sym:'STLTECH', name:'Sterlite Tech', ind:'Telecom'},
  {sym:'SUMICHEM', name:'Sumitomo Chemical', ind:'Chemicals'},
  {sym:'SUNDARAM', name:'Sundaram Brake Linings', ind:'Automobile'},
  {sym:'SUNDRMFAST', name:'Sundram Fasteners', ind:'Automobile'},
  {sym:'SUNTV', name:'Sun TV Network', ind:'Consumer Services'},
  {sym:'TARSONS', name:'Tarsons Products', ind:'Healthcare'},
  {sym:'TASTYBITE', name:'Tasty Bite Eatables', ind:'FMCG'},
  {sym:'TEGA', name:'Tega Industries', ind:'Capital Goods'},
  {sym:'TEJASNET', name:'Tejas Networks', ind:'Telecom'},
  {sym:'THERMAX', name:'Thermax Ltd', ind:'Capital Goods'},
  {sym:'THYROCARE', name:'Thyrocare Tech', ind:'Healthcare'},
  {sym:'TIMKEN', name:'Timken India', ind:'Capital Goods'},
  {sym:'TRIDENT', name:'Trident Ltd', ind:'Textiles'},
  {sym:'TRIVENI', name:'Triveni Engineering', ind:'FMCG'},
  {sym:'TTKPRESTIG', name:'TTK Prestige', ind:'Consumer Durables'},
  {sym:'TV18BRDCST', name:'TV18 Broadcast', ind:'Consumer Services'},
  {sym:'UBL', name:'United Breweries', ind:'FMCG'},
  {sym:'UGROCAP', name:'UGRO Capital', ind:'Financial Services'},
  {sym:'UTIAMC', name:'UTI AMC', ind:'Financial Services'},
  {sym:'VAIBHAVGBL', name:'Vaibhav Global', ind:'Consumer Durables'},
  {sym:'VARROC', name:'Varroc Engineering', ind:'Automobile'},
  {sym:'VENKEYS', name:'Venky\'s India', ind:'FMCG'},
  {sym:'VGUARD', name:'V-Guard Industries', ind:'Consumer Durables'},
  {sym:'VIJAYA', name:'Vijaya Diagnostic', ind:'Healthcare'},
  {sym:'VINATIORGA', name:'Vinati Organics', ind:'Chemicals'},
  {sym:'VIPIND', name:'VIP Industries', ind:'Consumer Durables'},
  {sym:'VOLTAMP', name:'Voltamp Transformers', ind:'Capital Goods'},
  {sym:'VSTIND', name:'VST Industries', ind:'FMCG'},
  {sym:'VTL', name:'Vardhman Textiles', ind:'Textiles'},
  {sym:'WELSPUNLIV', name:'Welspun Living', ind:'Textiles'}
];

const UNIVERSE = [...N50, ...EXTRA, ...MIDCAP100, ...SMALLCAP100, ...N500_REST];

const N50_SYMS = N50.map(s => s.sym);
const EXTRA_SYMS = EXTRA.map(s => s.sym);
const MIDCAP_SYMS = MIDCAP100.map(s => s.sym);
const SMALLCAP_SYMS = SMALLCAP100.map(s => s.sym);

const N50_SET = new Set(N50_SYMS);
const EXTRA_SET = new Set(EXTRA_SYMS);
const MIDCAP_SET = new Set(MIDCAP_SYMS);
const SMALLCAP_SET = new Set(SMALLCAP_SYMS);
const FNO_SYMS = [
  'AARTIIND', 'ABB', 'ABBOTINDIA', 'ABCAPITAL', 'ABFRL', 'ACC', 'ADANIENT',
  'ADANIPORTS', 'ALKEM', 'AMBER', 'AMBUJACEM', 'ANGELONE', 'APOLLOHOSP', 'APOLLOTYRE',
  'ASHOKLEY', 'ASIANPAINT', 'ASTRAL', 'ATUL', 'AUBANK', 'AUROPHARMA', 'AXISBANK',
  'BAJAJ-AUTO', 'BAJAJFINSV', 'BAJFINANCE', 'BALKRISIND', 'BALRAMCHIN', 'BANDHANBNK',
  'BANKBARODA', 'BATAINDIA', 'BEL', 'BDL', 'BHEL', 'BIOCON', 'BOSCHLTD', 'BPCL',
  'BRITANNIA', 'BSOFT', 'CANBK', 'CANFINHOME', 'CDSL', 'CESC', 'CGPOWER', 'CHAMBLFERT',
  'CHOLAFIN', 'CIPLA', 'COALINDIA', 'COFORGE', 'COLPAL', 'CONCOR', 'COROMANDEL',
  'CROMPTON', 'CUB', 'CUMMINSIND', 'CYIENT', 'DABUR', 'DALBHARAT', 'DEEPAKNTR',
  'DELHIVERY', 'DIVISLAB', 'DIXON', 'DLF', 'DRREDDY', 'EICHERMOT', 'ESCORTS',
  'EXIDEIND', 'FEDERALBNK', 'GAIL', 'GLENMARK', 'GMRAIRPORT', 'GNFC', 'GODREJCP',
  'GODREJPROP', 'GRANULES', 'GRASIM', 'GUJGASLTD', 'HAL', 'HAVELLS', 'HCLTECH',
  'HDFCAMC', 'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO', 'HFCL', 'HINDALCO', 'HINDCOPPER',
  'HINDPETRO', 'HINDUNILVR', 'HUDCO', 'ICICIBANK', 'ICICIGI', 'ICICIPRULI', 'IDEA',
  'IDFCFIRSTB', 'IEX', 'IGL', 'INDHOTEL', 'INDIANB', 'INDIGO', 'INDUSINDBK',
  'INDUSTOWER', 'INFY', 'IOC', 'IPCALAB', 'IRCTC', 'IREDA', 'IRFC', 'ITC',
  'JINDALSTEL', 'JIOFIN', 'JKCEMENT', 'JSL', 'JSWENERGY', 'JSWSTEEL', 'JUBLFOOD',
  'KALYANKJIL', 'KEI', 'KPITTECH', 'KOTAKBANK', 'LALPATHLAB', 'LAURUSLABS', 'LICHSGFIN',
  'LICI', 'LODHA', 'LT', 'LTF', 'LTIM', 'LTTS', 'LUPIN', 'M_M', 'M&MFIN',
  'MANAPPURAM', 'MARICO', 'MARUTI', 'MAXHEALTH', 'METROPOLIS', 'MFSL', 'MGL',
  'MOTHERSON', 'MPHASIS', 'MRF', 'MUTHOOTFIN', 'NATIONALUM', 'NAUKRI', 'NAVINFLUOR',
  'NBCC', 'NCC', 'NESTLEIND', 'NMDC', 'NTPC', 'NYKAA', 'OBEROIRLTY', 'OFSS',
  'OIL', 'ONGC', 'PAGEIND', 'PATANJALI', 'PEL', 'PERSISTENT', 'PETRONET', 'PFC',
  'PHOENIXLTD', 'PIDILITIND', 'PIIND', 'PNB', 'POLICYBZR', 'POLYCAB', 'POONAWALLA',
  'POWERGRID', 'PRESTIGE', 'PVRINOX', 'RAMCOCEM', 'RBLBANK', 'RECLTD', 'RELIANCE',
  'SAIL', 'SBICARD', 'SBILIFE', 'SBIN', 'SHREECEM', 'SHRIRAMFIN', 'SIEMENS',
  'SJVN', 'SONACOMS', 'SRF', 'SUNPHARMA', 'SUNTV', 'SUPREMEIND', 'SYNGENE',
  'TATACHEM', 'TATACOMM', 'TATACONSUM', 'TATAELXSI', 'TATAMOTORS', 'TATAPOWER',
  'TATASTEEL', 'TATATECH', 'TCS', 'TECHM', 'TIINDIA', 'TITAN', 'TORNTPHARM',
  'TORNTPOWER', 'TRENT', 'TVSMOTOR', 'UBL', 'ULTRACEMCO', 'UNIONBANK', 'UNITDSPR',
  'UPL', 'VBL', 'VEDL', 'VOLTAS', 'WIPRO', 'YESBANK', 'ZEEL', 'ZYDUSLIFE'
];

const FNO_SET = new Set(FNO_SYMS);

/**
 * Maps NSE symbols to Yahoo Finance ticker format
 */
function toYF(sym) {
  const map = {
    'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
    'M_M':        'M%26M.NS',
    'M&MFIN':     'M%26MFIN.NS',
    'ARE&M':      'ARE%26M.NS',
    'NAM-INDIA':  'NAM-INDIA.NS',
  };
  return map[sym] || (sym + '.NS');
}

/**
 * Categorize a stock or symbol into Large / Mid / Small Cap
 */
function categorizeStock(s) {
  const sym = (typeof s === 'string') ? s : s?.sym;
  if (!sym) return '⚡ Small Cap';
  if (N50_SET.has(sym) || EXTRA_SET.has(sym)) return '🚀 Large Cap';
  if (MIDCAP_SET.has(sym)) return '🔥 Mid Cap';
  return '⚡ Small Cap';
}

function getUniverseByIndex(currentIndex) {
  const str = String(currentIndex).toLowerCase();
  if (str === 'fno') return UNIVERSE.filter(s => FNO_SET.has(s.sym));
  if (str === '50')  return N50;
  if (str === '100') return [...N50, ...EXTRA];
  if (str === '200') return [...N50, ...EXTRA, ...MIDCAP100];
  if (str === 'midcap150' || str === '150') return [...MIDCAP100, ...N500_REST.slice(0, 50)];
  if (str === 'smallcap250' || str === '250') return [...SMALLCAP100, ...N500_REST.slice(50, 200)];
  if (str === '400' || str === 'smallcap100') return SMALLCAP100;
  if (str === '500') return UNIVERSE;
  return N50;
}

module.exports = {
  N50,
  EXTRA,
  MIDCAP100,
  SMALLCAP100,
  N500_REST,
  UNIVERSE,
  N50_SYMS,
  EXTRA_SYMS,
  MIDCAP_SYMS,
  SMALLCAP_SYMS,
  FNO_SYMS,
  FNO_SET,
  toYF,
  categorizeStock,
  getUniverseByIndex
};
