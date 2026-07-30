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

// Filter breakout stocks
// 1. Primary: Fresh ARS Crossover (breakout === true)
// 2. High RS Rating & strong positive momentum (rs_rating >= 85 & hi52_prox >= 0.95 & vol_ratio >= 1.3)
const freshBreakouts = stocks.filter(s => s.breakout);
const nearHighBreakouts = stocks.filter(s => !s.breakout && s.rs_rating >= 85 && s.hi52_prox >= 0.95 && s.vol_ratio >= 1.3);

const allBreakouts = [...freshBreakouts, ...nearHighBreakouts];

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

async function run() {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  let msg = `⚡ <b>DAILY BREAKOUT REPORT</b> | ${dateStr}\n`;
  msg += `⏰ <i>Updated: ${escapeHtml(updatedTime)}</i>\n\n`;

  if (fiiDii) {
    const fiiFormatted = (fiiDii.fii >= 0 ? '+' : '') + fiiDii.fii.toLocaleString('en-IN');
    const diiFormatted = (fiiDii.dii >= 0 ? '+' : '') + fiiDii.dii.toLocaleString('en-IN');
    msg += `📊 <b>Institutional Flows:</b>\n`;
    msg += `• FII Net: <code>₹${fiiFormatted} Cr</code> | DII Net: <code>₹${diiFormatted} Cr</code>\n\n`;
  }

  if (allBreakouts.length === 0) {
    msg += `ℹ️ <b>No fresh breakouts detected in today's scan.</b>\n\n`;
    msg += `Total stocks scanned: ${stocks.length}\n`;
    await sendTelegramMessage(msg);
    return;
  }

  // Group breakouts by market cap category
  const categories = {
    '🚀 Large Cap': [],
    '🔥 Mid Cap': [],
    '⚡ Small Cap': []
  };

  const N50_SYMS = ['ADANIENT','ADANIPORTS','APOLLOHOSP','ASIANPAINT','AXISBANK','BAJAJ-AUTO','BAJFINANCE','BAJAJFINSV','BEL','BHARTIARTL','CIPLA','COALINDIA','DRREDDY','EICHERMOT','ETERNAL','GRASIM','HCLTECH','HDFCBANK','HDFCLIFE','HINDALCO','HINDUNILVR','ICICIBANK','ITC','INFY','INDIGO','JSWSTEEL','JIOFIN','KOTAKBANK','LT','M_M','MARUTI','MAXHEALTH','NTPC','NESTLEIND','ONGC','POWERGRID','RELIANCE','SBILIFE','SHRIRAMFIN','SBIN','SUNPHARMA','TCS','TATACONSUM','TMPV','TATASTEEL','TECHM','TITAN','TRENT','ULTRACEMCO','WIPRO'];
  const EXTRA_SYMS = ['ABB','ADANIENSOL','ADANIGREEN','ADANIPOWER','AMBUJACEM','DMART','BAJAJHLDNG','BANKBARODA','BPCL','BOSCHLTD','BRITANNIA','CGPOWER','CANBK','CHOLAFIN','CUMMINSIND','DLF','DIVISLAB','GAIL','GODREJCP','HDFCAMC','HAL','HINDZINC','HYUNDAI','INDHOTEL','IOC','IRFC','JINDALSTEL','LTM','LODHA','MAZDOCK','MUTHOOTFIN','PIDILITIND','PFC','PNB','RECLTD','MOTHERSON','SHREECEM','ENRIN','SIEMENS','SOLARINDS','TVSMOTOR','TATACAP','TMCV','TATAPOWER','TORNTPHARM','UNIONBANK','UNITDSPR','VBL','VEDL','ZYDUSLIFE'];

  allBreakouts.forEach(s => {
    if (N50_SYMS.includes(s.sym) || EXTRA_SYMS.includes(s.sym)) {
      categories['🚀 Large Cap'].push(s);
    } else if (s.rs_rating >= 60 || s.price > 1000) {
      categories['🔥 Mid Cap'].push(s);
    } else {
      categories['⚡ Small Cap'].push(s);
    }
  });

  // SMART AUTO-SWITCHING LOGIC
  const useDetailedView = allBreakouts.length <= 10;

  msg += `🎯 <b>Breakouts Found: ${allBreakouts.length}</b> (Scanned ${stocks.length} stocks)\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const [catName, list] of Object.entries(categories)) {
    if (list.length === 0) continue;

    msg += `<b>${catName} (${list.length})</b>\n`;

    list.forEach(s => {
      const typeTag = s.breakout ? '🌟 ARS Crossover' : '🔥 52W High Prox';
      const volTag = `${s.vol_ratio}x Vol`;
      const rsTag = `RS: ${s.rs_rating}`;

      if (useDetailedView) {
        // STYLE 1: Full Detailed Format (<= 10 breakouts)
        msg += `• <b>${escapeHtml(s.sym)}</b> — ₹${s.price.toLocaleString('en-IN')}\n`;
        msg += `  └ <code>${rsTag}</code> | <code>${volTag}</code> | ${typeTag}\n`;
      } else {
        // STYLE 2: Compact Format (> 10 breakouts)
        msg += `• <b>${escapeHtml(s.sym)}</b> (₹${s.price}) — <code>${volTag}</code>\n`;
      }
    });
    msg += `\n`;
  }

  // Add 30-Day Historical Performance Summary if available
  const history = rawData.breakout_history || [];
  if (history.length > 0) {
    const winners = history.filter(h => (h.gainPct || 0) > 0);
    const winRate = ((winners.length / history.length) * 100).toFixed(0);
    const avgGain = (history.reduce((acc, h) => acc + (h.gainPct || 0), 0) / history.length).toFixed(1);

    msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 <b>30-DAY PERFORMANCE TRACKER</b>\n`;
    msg += `• Tracked Picks: <code>${history.length}</code> | Win Rate: <code>${winRate}%</code>\n`;
    msg += `• Avg Return: <code>${avgGain >= 0 ? '+' : ''}${avgGain}%</code>\n\n`;

    // Highlight top outperformers from past breakouts
    const sortedPerformers = [...history].sort((a, b) => (b.gainPct || 0) - (a.gainPct || 0)).slice(0, 3);
    if (sortedPerformers.length > 0 && sortedPerformers[0].gainPct > 0) {
      msg += `🏆 <b>Top Active Runners:</b>\n`;
      sortedPerformers.forEach(p => {
        msg += `• <b>${escapeHtml(p.sym)}</b>: <b>+${p.gainPct}%</b> (Peak: +${p.maxGainPct}%)\n`;
      });
      msg += `\n`;
    }
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📈 <i>Check screener dashboard for interactive charts!</i>`;

  await sendTelegramMessage(msg);
}

run().catch(err => {
  console.error('Fatal error in Telegram notification script:', err);
  process.exit(1);
});
