const fs = require('fs');
const path = require('path');
const https = require('https');
const { categorizeStock } = require('../config/universe');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const isRequired = process.env.TELEGRAM_REQUIRED === 'true' || process.env.TELEGRAM_REQUIRED === '1';

if (!botToken || !chatId) {
  const msg = 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing. Skipping Telegram notification.';
  if (isRequired) {
    console.error(`Error: ${msg}`);
    process.exit(1);
  } else {
    console.log(msg);
    process.exit(0);
  }
}

const dataFile = path.join(__dirname, '..', 'data', 'screener.json');

if (!fs.existsSync(dataFile)) {
  console.error(`Error: Screener data file not found at ${dataFile}`);
  process.exit(1);
}

let rawData;
try {
  rawData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
} catch (err) {
  console.error(`Error: Failed to parse screener JSON at ${dataFile}:`, err.message);
  process.exit(1);
}

const stocks = Array.isArray(rawData.stocks) ? rawData.stocks : [];
const updatedTime = rawData.updated || 'Today';
const fiiDii = rawData.fii_dii;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to send HTML message to Telegram with retry & backoff
function sendTelegramMessageOnce(text) {
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
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, body });
        } else {
          let retryAfter = 0;
          try {
            const parsed = JSON.parse(body);
            if (parsed?.parameters?.retry_after) {
              retryAfter = parsed.parameters.retry_after * 1000;
            }
          } catch (e) {}
          reject({ statusCode: res.statusCode, body, retryAfter });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Telegram API request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

async function sendTelegramMessage(text, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendTelegramMessageOnce(text);
      console.log('Telegram message sent successfully!');
      return result;
    } catch (err) {
      console.warn(`Telegram send attempt ${attempt}/${maxRetries} failed:`, err.message || err.body || err);
      if (attempt < maxRetries) {
        const delayMs = err.retryAfter || (1000 * Math.pow(2, attempt - 1));
        console.log(`Waiting ${delayMs}ms before retrying...`);
        await sleep(delayMs);
      } else {
        throw new Error(`Failed to send Telegram message after ${maxRetries} attempts: ${err.body || err.message || err}`);
      }
    }
  }
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Helper: Get Monday 00:00 IST of the current week (in UTC epoch seconds)
function getMondayOfCurrentWeek() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
  const istNow = new Date(now.getTime() + istOffset);
  const day = istNow.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(istNow);
  monday.setUTCDate(monday.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return Math.floor((monday.getTime() - istOffset) / 1000);
}

// Send array of logical message sections safely with max size management & pacing
async function dispatchSections(sections, maxChars = 3800) {
  const messages = [];
  let currentMsg = '';

  for (const sec of sections) {
    if (!sec || !sec.trim()) continue;
    if ((currentMsg + sec).length > maxChars && currentMsg.trim().length > 0) {
      messages.push(currentMsg.trim());
      currentMsg = sec;
    } else {
      currentMsg += sec;
    }
  }

  if (currentMsg.trim().length > 0) {
    messages.push(currentMsg.trim());
  }

  for (let i = 0; i < messages.length; i++) {
    await sendTelegramMessage(messages[i]);
    if (i < messages.length - 1) {
      await sleep(500); // 500ms pacing between sequential parts
    }
  }
}

async function run() {
  const sections = [];
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  
  // Section 0: Header & Institutional Flows
  let headerSec = `⚡ <b>DAILY BREAKOUT & MOMENTUM REPORT</b> | ${dateStr}\n`;
  headerSec += `⏰ <i>Updated: ${escapeHtml(updatedTime)}</i>\n\n`;

  if (fiiDii) {
    const fiiVal = Number(fiiDii.fii || 0);
    const diiVal = Number(fiiDii.dii || 0);
    const fiiFormatted = (fiiVal >= 0 ? '+' : '') + fiiVal.toLocaleString('en-IN');
    const diiFormatted = (diiVal >= 0 ? '+' : '') + diiVal.toLocaleString('en-IN');
    headerSec += `📊 <b>Institutional Flows:</b>\n`;
    headerSec += `• FII Net: <code>₹${fiiFormatted} Cr</code> | DII Net: <code>₹${diiFormatted} Cr</code>\n\n`;
  }
  sections.push(headerSec);

  // Section 1: Today's Fresh ARS Crossover Breakouts
  const freshBreakouts = stocks.filter(s => s.breakout);
  const nearHighBreakouts = stocks.filter(s => !s.breakout && (s.rs_rating ?? 0) >= 85 && (s.hi52_prox ?? -1) >= -0.05 && (s.vol_ratio ?? 0) >= 1.3);
  const allTodayBreakouts = [...freshBreakouts, ...nearHighBreakouts];

  let breakoutSec = '';
  if (allTodayBreakouts.length === 0) {
    breakoutSec += `🔥 <b>Today's Fresh Breakouts: 0</b>\n`;
    breakoutSec += `<i>No fresh ARS crossovers detected today.</i>\n\n`;
  } else {
    const useDetailedView = allTodayBreakouts.length <= 10;
    breakoutSec += `🔥 <b>Today's Fresh Breakouts: ${allTodayBreakouts.length}</b> (Scanned ${stocks.length} stocks)\n`;
    breakoutSec += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const categories = { '🚀 Large Cap': [], '🔥 Mid Cap': [], '⚡ Small Cap': [] };
    allTodayBreakouts.forEach(s => {
      const cat = categorizeStock(s);
      if (categories[cat]) categories[cat].push(s);
      else categories['⚡ Small Cap'].push(s);
    });

    for (const [catName, list] of Object.entries(categories)) {
      if (list.length === 0) continue;
      breakoutSec += `<b>${catName} (${list.length})</b>\n`;
      list.forEach(s => {
        const typeTag = s.breakout ? '🌟 ARS Breakout' : '🔥 52W High Prox';
        const volRatio = Number(s.vol_ratio || 0).toFixed(1);
        const volTag = `${volRatio}x Vol`;
        const rsTag = `RS: ${s.rs_rating ?? 'N/A'}`;
        const priceStr = Number(s.price || 0).toLocaleString('en-IN');
        if (useDetailedView) {
          breakoutSec += `• <b>${escapeHtml(s.sym)}</b> — ₹${priceStr}\n`;
          breakoutSec += `  └ <code>${rsTag}</code> | <code>${volTag}</code> | ${typeTag}\n`;
        } else {
          breakoutSec += `• <b>${escapeHtml(s.sym)}</b> (₹${priceStr}) — <code>${volTag}</code>\n`;
        }
      });
      breakoutSec += `\n`;
    }
  }
  sections.push(breakoutSec);

  // Section 2: VCP Squeeze & Pocket Pivots
  const vcpStocks = stocks.filter(s => s.vcp && s.vcp.is_vcp && (s.ars ?? 0) > 0);
  const pocketPivots = stocks.filter(s => s.pocket_pivot && (s.ars ?? 0) > 0);

  if (vcpStocks.length > 0 || pocketPivots.length > 0) {
    let radarSec = `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    radarSec += `🎯 <b>QUANTITATIVE SETUP RADAR</b>\n`;
    if (vcpStocks.length > 0) {
      radarSec += `🧘 <b>VCP Squeezes (${vcpStocks.length}):</b> ${vcpStocks.slice(0, 8).map(s => `<code>${escapeHtml(s.sym)}</code>`).join(', ')}\n`;
    }
    if (pocketPivots.length > 0) {
      radarSec += `⚡ <b>Pocket Pivots (${pocketPivots.length}):</b> ${pocketPivots.slice(0, 8).map(s => `<code>${escapeHtml(s.sym)}</code>`).join(', ')}\n`;
    }
    radarSec += `\n`;
    sections.push(radarSec);
  }

  // Section 3: This Week's Breakouts
  const mondayTs = getMondayOfCurrentWeek();
  const weeklyBreakouts = stocks.filter(s =>
    !s.breakout && (s.ars ?? 0) > 0 && s.signDays != null && s.signDays <= 5 &&
    s.signSince != null && s.signSince >= mondayTs
  );

  if (weeklyBreakouts.length > 0) {
    let weeklySec = `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    weeklySec += `🟢 <b>This Week's Breakouts (${weeklyBreakouts.length})</b>\n`;
    weeklyBreakouts.sort((a, b) => (a.signDays ?? 99) - (b.signDays ?? 99));
    weeklyBreakouts.slice(0, 15).forEach(s => {
      const boPrice = Number(s.signPrice ?? s.price ?? 0);
      const currPrice = Number(s.price || 0);
      const gain = boPrice > 0 ? ((currPrice - boPrice) / boPrice * 100) : 0;
      const gainStr = gain >= 0 ? `+${gain.toFixed(1)}%` : `${gain.toFixed(1)}%`;
      const daysLabel = s.signDays === 1 ? '1d ago' : `${s.signDays}d ago`;
      weeklySec += `• <b>${escapeHtml(s.sym)}</b> — ₹${currPrice.toLocaleString('en-IN')} | <code>${gainStr}</code> | ${daysLabel}\n`;
    });
    weeklySec += `\n`;
    sections.push(weeklySec);
  }

  // Section 3b: Leader Retest / Dip Buys (Near Support)
  const dipBuyStocks = stocks.filter(s =>
    !s.breakout && (s.st10?.trend === 'buy' || s.ma_status === 'MA+') &&
    ((s.srs ?? 0) <= 0 || ((s.ars ?? 0) >= -0.015 && (s.ars ?? 0) <= 0.05)) &&
    s.signDays != null && s.signDays <= 5 && s.signSince != null && s.signSince >= mondayTs
  );

  if (dipBuyStocks.length > 0) {
    let dipSec = `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    dipSec += `🎯 <b>Leader Retest / Dip Buys (${dipBuyStocks.length})</b>\n`;
    dipBuyStocks.sort((a, b) => (b.rs_rating ?? 0) - (a.rs_rating ?? 0));
    dipBuyStocks.slice(0, 8).forEach(s => {
      const rsTag = `RS: ${s.rs_rating ?? 'N/A'}`;
      const priceStr = Number(s.price || 0).toLocaleString('en-IN');
      dipSec += `• <b>${escapeHtml(s.sym)}</b> — ₹${priceStr} | <code>${rsTag}</code> | Near Support\n`;
    });
    dipSec += `\n`;
    sections.push(dipSec);
  }

  // Section 4: 30-Day Historical Performance Summary
  const history = Array.isArray(rawData.breakout_history) ? rawData.breakout_history : [];
  if (history.length > 0) {
    const winners = history.filter(h => (h.gainPct || 0) > 0);
    const winRate = ((winners.length / history.length) * 100).toFixed(0);
    const avgGain = (history.reduce((acc, h) => acc + (h.gainPct || 0), 0) / history.length).toFixed(1);
    const avgMaxGain = (history.reduce((acc, h) => acc + (h.maxGainPct || h.gainPct || 0), 0) / history.length).toFixed(1);

    let perfSec = `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    perfSec += `📊 <b>30-DAY BREAKOUT PERFORMANCE TRACKER</b>\n`;
    perfSec += `• Tracked Breakouts: <code>${history.length} picks</code>\n`;
    perfSec += `• Win Rate: <code>${winRate}%</code> 🎯 | Avg Gain: <code>${avgGain >= 0 ? '+' : ''}${avgGain}%</code>\n`;
    perfSec += `• Peak Run-up Avg: <code>+${avgMaxGain}%</code>\n\n`;

    const sortedPerformers = [...history].sort((a, b) => (b.gainPct || 0) - (a.gainPct || 0)).slice(0, 4);
    if (sortedPerformers.length > 0 && (sortedPerformers[0].gainPct || 0) > 0) {
      perfSec += `🏆 <b>Top Active Breakout Runners:</b>\n`;
      sortedPerformers.forEach(p => {
        const peakStr = (p.maxGainPct && p.maxGainPct > (p.gainPct || 0)) ? ` (Peak: +${p.maxGainPct}%)` : '';
        perfSec += `• <b>${escapeHtml(p.sym)}</b>: <b>+${p.gainPct}%</b>${peakStr}\n`;
      });
      perfSec += `\n`;
    }
    sections.push(perfSec);
  }

  // Section 5: 🤖 JISHU PAPER TRADING DESK
  const jishuFile = path.join(__dirname, '..', 'data', 'jishu_portfolio.json');
  if (fs.existsSync(jishuFile)) {
    try {
      const jishu = JSON.parse(fs.readFileSync(jishuFile, 'utf8'));
      const acc = jishu.account || {};
      const positions = Array.isArray(jishu.open_positions) ? jishu.open_positions : [];
      const events = Array.isArray(jishu.recent_events) ? jishu.recent_events : [];
      
      let jishuSec = `━━━━━━━━━━━━━━━━━━━━━━━\n`;
      jishuSec += `🤖 <b>JISHU PAPER TRADING DESK (₹10L Portfolio)</b>\n`;
      jishuSec += `• <b>Total Equity:</b> ₹${(acc.total_equity || 1000000).toLocaleString('en-IN')}\n`;
      jishuSec += `• <b>Cash Available:</b> ₹${(acc.cash || 0).toLocaleString('en-IN')} | <b>Invested:</b> ₹${(acc.invested_capital || 0).toLocaleString('en-IN')}\n`;
      jishuSec += `• <b>Realized P&L:</b> ${acc.realized_pnl >= 0 ? '+' : ''}₹${(acc.realized_pnl || 0).toLocaleString('en-IN')} | <b>Win Rate:</b> <code>${acc.win_rate || 0}%</code> (${acc.winning_trades || 0}W / ${acc.losing_trades || 0}L)\n\n`;

      // Recent Actions / Executions today
      const todayEvents = events.filter(e => {
        if (!e.timestamp) return false;
        const eDate = e.timestamp.split('T')[0];
        const tDate = new Date().toISOString().split('T')[0];
        return eDate === tDate;
      }).slice(0, 5);

      if (todayEvents.length > 0) {
        jishuSec += `⚡ <b>Today's Engine Actions:</b>\n`;
        todayEvents.forEach(ev => {
          jishuSec += `• ${escapeHtml(ev.message || ev.type)}\n`;
        });
        jishuSec += `\n`;
      }

      // Active Holdings
      if (positions.length > 0) {
        jishuSec += `💼 <b>Active Open Positions (${positions.length}/10):</b>\n`;
        positions.forEach(p => {
          const curP = p.current_price || p.entry_price;
          const pnlPct = ((curP - p.entry_price) / p.entry_price) * 100;
          const pnlStr = pnlPct >= 0 ? `+${pnlPct.toFixed(1)}%` : `${pnlPct.toFixed(1)}%`;
          const trailBadge = p.sl_moved_to_cost ? '🛡️ Risk-Free' : `SL: ₹${p.current_sl}`;
          jishuSec += `• <b>${escapeHtml(p.sym)}</b>: ₹${curP} (<code>${pnlStr}</code>) | ${trailBadge} | T2: ₹${p.target_2_price}\n`;
        });
        jishuSec += `\n`;
      }

      sections.push(jishuSec);
    } catch (jErr) {
      console.warn('Could not parse Jishu portfolio for Telegram:', jErr.message);
    }
  }

  // Footer section
  let footerSec = `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  footerSec += `📈 <i>Check screener dashboard & jishu_desk.html for full analytics!</i>`;
  sections.push(footerSec);

  // Safely dispatch all sections
  await dispatchSections(sections);
}

run().catch(err => {
  console.error('Fatal error in Telegram notification script:', err);
  process.exit(1);
});
