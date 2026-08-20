const fs = require('fs');
const path = require('path');
const https = require('https');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!botToken || !chatId) {
  console.log('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing. Skipping Telegram notification.');
  process.exit(0);
}

const dataFile = path.join(__dirname, '..', 'data', 'screener.json');

if (!fs.existsSync(dataFile)) {
  console.error(`Error: Screener data file not found at ${dataFile}`);
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const stocks = rawData.stocks || [];
const updatedTime = rawData.updated || 'Today';
const fiiDii = rawData.fii_dii;

// Breakout filtering is done inside run() to include weekly data

// Helper function to send HTML message to Telegram
function sendTelegramMessage(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Telegram message sent successfully!');
          resolve(body);
        } else {
          console.error(`Telegram API Error (Status ${res.statusCode}):`, body);
          reject(new Error(body));
        }
      });
    });

    req.on('error', (err) => {
      console.error('Network Error sending Telegram message:', err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Helper: Get Monday 00:00 IST of the current week (in UTC epoch seconds)
function getMondayOfCurrentWeek() {
  // Create date in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  const istNow = new Date(now.getTime() + istOffset);
  const day = istNow.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(istNow);
  monday.setUTCDate(monday.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  // Convert back to UTC epoch seconds
  return (monday.getTime() - istOffset) / 1000;
}

// Constituent lists for accurate market-cap classification
const N50_SYMS = ['ADANIENT','ADANIPORTS','APOLLOHOSP','ASIANPAINT','AXISBANK','BAJAJ-AUTO','BAJFINANCE','BAJAJFINSV','BEL','BHARTIARTL','CIPLA','COALINDIA','DRREDDY','EICHERMOT','ETERNAL','GRASIM','HCLTECH','HDFCBANK','HDFCLIFE','HINDALCO','HINDUNILVR','ICICIBANK','ITC','INFY','INDIGO','JSWSTEEL','JIOFIN','KOTAKBANK','LT','M_M','MARUTI','MAXHEALTH','NTPC','NESTLEIND','ONGC','POWERGRID','RELIANCE','SBILIFE','SHRIRAMFIN','SBIN','SUNPHARMA','TCS','TATACONSUM','TMPV','TATASTEEL','TECHM','TITAN','TRENT','ULTRACEMCO','WIPRO'];
const EXTRA_SYMS = ['ABB','ADANIENSOL','ADANIGREEN','ADANIPOWER','AMBUJACEM','DMART','BAJAJHLDNG','BANKBARODA','BPCL','BOSCHLTD','BRITANNIA','CGPOWER','CANBK','CHOLAFIN','CUMMINSIND','DLF','DIVISLAB','GAIL','GODREJCP','HDFCAMC','HAL','HINDZINC','HYUNDAI','INDHOTEL','IOC','IRFC','JINDALSTEL','LTM','LODHA','MAZDOCK','MUTHOOTFIN','PIDILITIND','PFC','PNB','RECLTD','MOTHERSON','SHREECEM','ENRIN','SIEMENS','SOLARINDS','TVSMOTOR','TATACAP','TMCV','TATAPOWER','TORNTPHARM','UNIONBANK','UNITDSPR','VBL','VEDL','ZYDUSLIFE'];
const MIDCAP_SYMS = ['INDIANB','BSE','POWERINDIA','INDUSTOWER','LGEINDIA','LUPIN','POLYCAB','GROWW','HEROMOTOCO','ABCAPITAL','ICICIGI','BHARATFORG','ASHOKLEY','OFSS','BHEL','IDFCFIRSTB','YESBANK','SUZLON','NBCC','IRCTC','SAIL','HUDCO','GMRAIRPORT','MARICO','JSWENERGY','MANKIND','COFORGE','PERSISTENT','PAYTM','POLICYBZR','NAUKRI','AUROPHARMA','ALKEM','BIOCON','LAURUSLABS','GLAND','COLPAL','PGHH','DABUR','EMAMILTD','PATANJALI','FEDERALBNK','IDBI','RBLBANK','AUBANK','BANDHANBNK','LICHSGFIN','SUNDARMFIN','M&MFIN','MFSL','GICRE','NIACL','STARHEALTH','SONACOMS','BALKRISIND','EXIDEIND','MRF','APOLLOTYRE','ESCORTS','VOLTAS','CROMPTON','HAVELLS','DIXON','KAJARIACER','JKCEMENT','RAMCOCEM','OBEROIRLTY','GODREJPROP','PHOENIXLTD','PRESTIGE','PETRONET','MGL','IGL','OIL','NHPC','SJVN','TORNTPOWER','NMDC','NATIONALUM','APLAPOLLO','LLOYDSME','UNOMINDA','SUPREMEIND','SRF','UPL','DEEPAKNTR','TATACHEM','AARTIIND','NAVINFLUOR','CONCOR','IEX','MCX','CDSL','ANGELONE','KPITTECH','MPHASIS','TATAELXSI','JUBLFOOD','PVRINOX','DELHIVERY','ZFCVINDIA','BLUESTARCO','WHIRLPOOL'];

// Helper: Categorize a stock into Large/Mid/Small Cap accurately
function categorizeStock(s) {
  if (N50_SYMS.includes(s.sym) || EXTRA_SYMS.includes(s.sym)) return '🚀 Large Cap';
  if (MIDCAP_SYMS.includes(s.sym)) return '🔥 Mid Cap';
  return '⚡ Small Cap';
}

async function run() {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  let msg = `⚡ <b>DAILY BREAKOUT & MOMENTUM REPORT</b> | ${dateStr}\n`;
  msg += `⏰ <i>Updated: ${escapeHtml(updatedTime)}</i>\n\n`;

  if (fiiDii) {
    const fiiFormatted = (fiiDii.fii >= 0 ? '+' : '') + fiiDii.fii.toLocaleString('en-IN');
    const diiFormatted = (fiiDii.dii >= 0 ? '+' : '') + fiiDii.dii.toLocaleString('en-IN');
    msg += `📊 <b>Institutional Flows:</b>\n`;
    msg += `• FII Net: <code>₹${fiiFormatted} Cr</code> | DII Net: <code>₹${diiFormatted} Cr</code>\n\n`;
  }

  // --- Section 1: Today's Fresh ARS Crossover Breakouts ---
  const freshBreakouts = stocks.filter(s => s.breakout);
  // Near-52W-high stocks as secondary breakouts (fixed hi52_prox >= -0.05)
  const nearHighBreakouts = stocks.filter(s => !s.breakout && s.rs_rating >= 85 && s.hi52_prox >= -0.05 && s.vol_ratio >= 1.3);
  const allTodayBreakouts = [...freshBreakouts, ...nearHighBreakouts];

  if (allTodayBreakouts.length === 0) {
    msg += `🔥 <b>Today's Fresh Breakouts: 0</b>\n`;
    msg += `<i>No fresh ARS crossovers detected today.</i>\n\n`;
  } else {
    const useDetailedView = allTodayBreakouts.length <= 10;
    msg += `🔥 <b>Today's Fresh Breakouts: ${allTodayBreakouts.length}</b> (Scanned ${stocks.length} stocks)\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Group by market cap
    const categories = { '🚀 Large Cap': [], '🔥 Mid Cap': [], '⚡ Small Cap': [] };
    allTodayBreakouts.forEach(s => categories[categorizeStock(s)].push(s));

    for (const [catName, list] of Object.entries(categories)) {
      if (list.length === 0) continue;
      msg += `<b>${catName} (${list.length})</b>\n`;
      list.forEach(s => {
        const typeTag = s.breakout ? '🌟 ARS Breakout' : '🔥 52W High Prox';
        const volTag = `${s.vol_ratio}x Vol`;
        const rsTag = `RS: ${s.rs_rating}`;
        if (useDetailedView) {
          msg += `• <b>${escapeHtml(s.sym)}</b> — ₹${s.price.toLocaleString('en-IN')}\n`;
          msg += `  └ <code>${rsTag}</code> | <code>${volTag}</code> | ${typeTag}\n`;
        } else {
          msg += `• <b>${escapeHtml(s.sym)}</b> (₹${s.price}) — <code>${volTag}</code>\n`;
        }
      });
      msg += `\n`;
    }
  }

  // --- Section 2: VCP Squeeze & Pocket Pivots ---
  const vcpStocks = stocks.filter(s => s.vcp && s.vcp.is_vcp && s.ars > 0);
  const pocketPivots = stocks.filter(s => s.pocket_pivot && s.ars > 0);

  if (vcpStocks.length > 0 || pocketPivots.length > 0) {
    msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎯 <b>QUANTITATIVE SETUP RADAR</b>\n`;
    if (vcpStocks.length > 0) {
      msg += `🧘 <b>VCP Squeezes (${vcpStocks.length}):</b> ${vcpStocks.slice(0, 8).map(s => `<code>${escapeHtml(s.sym)}</code>`).join(', ')}\n`;
    }
    if (pocketPivots.length > 0) {
      msg += `⚡ <b>Pocket Pivots (${pocketPivots.length}):</b> ${pocketPivots.slice(0, 8).map(s => `<code>${escapeHtml(s.sym)}</code>`).join(', ')}\n`;
    }
    msg += `\n`;
  }

  // --- Section 3: This Week's Breakouts ---
  const mondayTs = getMondayOfCurrentWeek();
  const weeklyBreakouts = stocks.filter(s =>
    !s.breakout && s.ars > 0 && s.signDays != null && s.signDays <= 5 &&
    s.signSince != null && s.signSince >= mondayTs
  );

  if (weeklyBreakouts.length > 0) {
    msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🟢 <b>This Week's Breakouts (${weeklyBreakouts.length})</b>\n`;
    weeklyBreakouts.sort((a, b) => (a.signDays ?? 99) - (b.signDays ?? 99));
    weeklyBreakouts.slice(0, 15).forEach(s => {
      const boPrice = s.signPrice ?? s.price;
      const gain = boPrice > 0 ? ((s.price - boPrice) / boPrice * 100) : 0;
      const gainStr = gain >= 0 ? `+${gain.toFixed(1)}%` : `${gain.toFixed(1)}%`;
      const daysLabel = s.signDays === 1 ? '1d ago' : `${s.signDays}d ago`;
      msg += `• <b>${escapeHtml(s.sym)}</b> — ₹${s.price.toLocaleString('en-IN')} | <code>${gainStr}</code> | ${daysLabel}\n`;
    });
    msg += `\n`;
  }

  // --- Section 4: 30-Day Historical Performance Summary ---
  const history = rawData.breakout_history || [];
  if (history.length > 0) {
    const winners = history.filter(h => (h.gainPct || 0) > 0);
    const winRate = ((winners.length / history.length) * 100).toFixed(0);
    const avgGain = (history.reduce((acc, h) => acc + (h.gainPct || 0), 0) / history.length).toFixed(1);
    const avgMaxGain = (history.reduce((acc, h) => acc + (h.maxGainPct || h.gainPct || 0), 0) / history.length).toFixed(1);

    msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 <b>30-DAY BREAKOUT PERFORMANCE TRACKER</b>\n`;
    msg += `• Tracked Breakouts: <code>${history.length} picks</code>\n`;
    msg += `• Win Rate: <code>${winRate}%</code> 🎯 | Avg Gain: <code>${avgGain >= 0 ? '+' : ''}${avgGain}%</code>\n`;
    msg += `• Peak Run-up Avg: <code>+${avgMaxGain}%</code>\n\n`;

    // Highlight top outperformers from past breakouts
    const sortedPerformers = [...history].sort((a, b) => (b.gainPct || 0) - (a.gainPct || 0)).slice(0, 4);
    if (sortedPerformers.length > 0 && sortedPerformers[0].gainPct > 0) {
      msg += `🏆 <b>Top Active Breakout Runners:</b>\n`;
      sortedPerformers.forEach(p => {
        const peakStr = (p.maxGainPct && p.maxGainPct > p.gainPct) ? ` (Peak: +${p.maxGainPct}%)` : '';
        msg += `• <b>${escapeHtml(p.sym)}</b>: <b>+${p.gainPct}%</b>${peakStr}\n`;
      });
      msg += `\n`;
    }
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📈 <i>Check screener dashboard for interactive charts!</i>`;

  // Safely split if message exceeds Telegram 4000 char threshold
  if (msg.length > 3900) {
    const half = Math.floor(msg.length / 2);
    const splitIdx = msg.lastIndexOf('\n\n', half) || half;
    await sendTelegramMessage(msg.substring(0, splitIdx));
    await sendTelegramMessage(msg.substring(splitIdx));
  } else {
    await sendTelegramMessage(msg);
  }
}

run().catch(err => {
  console.error('Fatal error in Telegram notification script:', err);
  process.exit(1);
});

