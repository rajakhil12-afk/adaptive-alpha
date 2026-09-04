/**
 * Adaptive Alpha — Social Share Card & Data Export Engine
 * Generates high-res PNG visual cards with official logo, theme palettes,
 * CSV exports, and Telegram/WhatsApp text summaries.
 */

let currentCardTheme = 'gold'; // 'gold', 'emerald', 'sapphire', 'amethyst'

const CARD_THEMES = {
  gold: {
    name: 'Obsidian Gold',
    bgStart: '#090c12',
    bgEnd: '#161b24',
    accent: '#e3b341',
    border: 'rgba(227, 179, 65, 0.45)',
    titleColor: '#e3b341',
    subtitleColor: '#8b949e',
    listTitleColor: '#e3b341',
    rowBg: 'rgba(22, 28, 42, 0.95)',
    rowBorder: 'rgba(227, 179, 65, 0.25)',
    arsPos: '#00e676',
    arsNeg: '#ef5350',
    volColor: '#82b1ff',
    rsColor: '#e3b341',
    pillBg: 'rgba(227, 179, 65, 0.14)'
  },
  emerald: {
    name: 'Emerald Alpha',
    bgStart: '#03140c',
    bgEnd: '#0a291b',
    accent: '#0fe586',
    border: 'rgba(15, 229, 134, 0.45)',
    titleColor: '#0fe586',
    subtitleColor: '#7ba892',
    listTitleColor: '#0fe586',
    rowBg: 'rgba(8, 38, 25, 0.95)',
    rowBorder: 'rgba(15, 229, 134, 0.25)',
    arsPos: '#0fe586',
    arsNeg: '#ef5350',
    volColor: '#5eead4',
    rsColor: '#0fe586',
    pillBg: 'rgba(15, 229, 134, 0.14)'
  },
  sapphire: {
    name: 'Sapphire Pro',
    bgStart: '#051020',
    bgEnd: '#0d2242',
    accent: '#58a6ff',
    border: 'rgba(88, 166, 255, 0.45)',
    titleColor: '#58a6ff',
    subtitleColor: '#8da6c4',
    listTitleColor: '#58a6ff',
    rowBg: 'rgba(14, 32, 60, 0.95)',
    rowBorder: 'rgba(88, 166, 255, 0.25)',
    arsPos: '#26d07c',
    arsNeg: '#ff6b6b',
    volColor: '#a5d6ff',
    rsColor: '#79c0ff',
    pillBg: 'rgba(88, 166, 255, 0.14)'
  },
  amethyst: {
    name: 'Amethyst Matrix',
    bgStart: '#10071c',
    bgEnd: '#240f3b',
    accent: '#c084fc',
    border: 'rgba(192, 132, 252, 0.45)',
    titleColor: '#c084fc',
    subtitleColor: '#a496b8',
    listTitleColor: '#e879f9',
    rowBg: 'rgba(32, 16, 52, 0.95)',
    rowBorder: 'rgba(192, 132, 252, 0.25)',
    arsPos: '#34d399',
    arsNeg: '#f87171',
    volColor: '#e879f9',
    rsColor: '#c084fc',
    pillBg: 'rgba(192, 132, 252, 0.14)'
  }
};

function setCardTheme(themeKey) {
  if (CARD_THEMES[themeKey]) {
    currentCardTheme = themeKey;
    document.querySelectorAll('.card-theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === themeKey);
    });
    generateShareImageCard();
  }
}

function openShareCardModal() {
  const modal = document.getElementById('share-card-modal');
  if (modal) modal.classList.add('open');
  generateShareImageCard();
}

function closeShareCardModal() {
  const modal = document.getElementById('share-card-modal');
  if (modal) modal.classList.remove('open');
}

function drawCanvasRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function generateShareImageCard() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = 1200;
  canvas.height = 760;

  const theme = CARD_THEMES[currentCardTheme] || CARD_THEMES.gold;

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 1200, 760);
  grad.addColorStop(0, theme.bgStart);
  grad.addColorStop(1, theme.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 760);

  // Decorative Subtle Grid Glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let x = 40; x < 1200; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 760);
    ctx.stroke();
  }
  for (let y = 40; y < 760; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Outer Glowing Border
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 3.5;
  drawCanvasRoundRect(ctx, 20, 20, 1160, 720, 16, false, true);

  // Inner Accent Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  drawCanvasRoundRect(ctx, 27, 27, 1146, 706, 12, false, true);

  // Top Left Header: Logo & Title
  const logoElem = document.getElementById('app-brand-logo');
  const hasValidLogo = logoElem && logoElem.complete && logoElem.naturalWidth > 0;

  if (hasValidLogo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(84, 80, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(logoElem, 56, 52, 56, 56);
    ctx.restore();

    ctx.fillStyle = theme.titleColor;
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ADAPTIVE ALPHA', 128, 76);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px -apple-system, sans-serif';
    ctx.fillText('| DAILY MOMENTUM CARD', 418, 76);
  } else {
    // Elegant Vector Logo Mark Fallback
    ctx.save();
    ctx.beginPath();
    ctx.arc(84, 80, 28, 0, Math.PI * 2);
    ctx.fillStyle = theme.pillBg;
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = theme.accent;
    ctx.font = '900 28px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', 84, 89);
    ctx.textAlign = 'left';

    ctx.fillStyle = theme.titleColor;
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ADAPTIVE ALPHA', 128, 76);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px -apple-system, sans-serif';
    ctx.fillText('| DAILY MOMENTUM CARD', 418, 76);
  }

  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  ctx.fillStyle = theme.subtitleColor;
  ctx.font = '500 20px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`NSE Market Closing Summary · ${dateStr}`, 128, 110);

  // Top Right Pill (NSE Nifty 500)
  ctx.fillStyle = theme.pillBg;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  drawCanvasRoundRect(ctx, 940, 50, 200, 42, 21, true, true);
  ctx.fillStyle = theme.accent;
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ NSE NIFTY 500', 1040, 77);
  ctx.textAlign = 'left';

  // Header Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(50, 138);
  ctx.lineTo(1150, 138);
  ctx.stroke();

  const freshBo = allData.filter(d => d.breakout);
  const topRunners = [...allData].sort((a,b) => b.ars - a.ars).slice(0, 5);
  const displayList = freshBo.length > 0 ? freshBo.slice(0, 5) : topRunners;
  const listTitle = freshBo.length > 0 ? `🔥 FRESH ARS BREAKOUT LEADERS (${freshBo.length})` : `🌟 TOP RELATIVE STRENGTH LEADERS`;

  // Section Title
  ctx.fillStyle = theme.listTitleColor;
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(listTitle, 50, 178);

  let y = 232;
  displayList.forEach((s, idx) => {
    // Row Background Card
    ctx.fillStyle = theme.rowBg;
    ctx.strokeStyle = theme.rowBorder;
    ctx.lineWidth = 1.2;
    drawCanvasRoundRect(ctx, 50, y - 34, 1100, 68, 10, true, true);

    // Rank & Ticker Badge
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 22px -apple-system, monospace';
    ctx.fillText(`${idx + 1}.`, 70, y + 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px -apple-system, monospace';
    ctx.fillText(`${s.sym}`, 108, y + 8);

    // Sector Subtext
    ctx.fillStyle = theme.subtitleColor;
    ctx.font = '500 14px -apple-system, sans-serif';
    const cleanInd = (s.ind || 'NSE Equity').replace('Financial Services', 'Financials');
    ctx.fillText(`${cleanInd}`, 108, y + 26);

    // Current Price
    ctx.fillStyle = '#e6edf3';
    ctx.font = '600 20px -apple-system, sans-serif';
    ctx.fillText(`₹${(s.price || 0).toLocaleString('en-IN', {maximumFractionDigits: 1})}`, 360, y + 8);

    // ARS Alpha Badge Pill
    const arsPct = (s.ars * 100).toFixed(1);
    const isPos = s.ars >= 0;
    ctx.fillStyle = isPos ? 'rgba(0, 230, 118, 0.12)' : 'rgba(239, 83, 80, 0.12)';
    ctx.strokeStyle = isPos ? 'rgba(0, 230, 118, 0.3)' : 'rgba(239, 83, 80, 0.3)';
    drawCanvasRoundRect(ctx, 520, y - 18, 160, 36, 18, true, true);
    ctx.fillStyle = isPos ? theme.arsPos : theme.arsNeg;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`ARS: ${isPos ? '+' : ''}${arsPct}%`, 540, y + 6);

    // Volume Surge Badge Pill
    const vol = (s.vol_ratio || 1).toFixed(1);
    const isVolHigh = (s.vol_ratio || 1) >= 1.5;
    ctx.fillStyle = isVolHigh ? 'rgba(130, 177, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = isVolHigh ? 'rgba(130, 177, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)';
    drawCanvasRoundRect(ctx, 720, y - 18, 140, 36, 18, true, true);
    ctx.fillStyle = isVolHigh ? theme.volColor : '#8b949e';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Vol: ${vol}×`, 745, y + 6);

    // RS Rating Badge Pill
    const rsVal = s.rs_rating ?? 1;
    ctx.fillStyle = theme.pillBg;
    ctx.strokeStyle = theme.border;
    drawCanvasRoundRect(ctx, 900, y - 18, 130, 36, 18, true, true);
    ctx.fillStyle = theme.rsColor;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`RS: ${rsVal}`, 930, y + 6);

    // Supertrend / Trend status
    const stData = s.st14 || s.st10;
    const isBuy = stData ? stData.trend === 'buy' : true;
    ctx.fillStyle = isBuy ? 'rgba(0, 230, 118, 0.15)' : 'rgba(239, 83, 80, 0.15)';
    ctx.strokeStyle = isBuy ? '#00e676' : '#ef5350';
    drawCanvasRoundRect(ctx, 1050, y - 18, 80, 36, 6, true, true);
    ctx.fillStyle = isBuy ? '#00e676' : '#ef5350';
    ctx.font = '800 14px monospace';
    ctx.fillText(isBuy ? 'BUY' : 'SELL', 1072, y + 5);

    y += 82;
  });

  // Footer Signature
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 680);
  ctx.lineTo(1150, 680);
  ctx.stroke();

  ctx.fillStyle = '#8b949e';
  ctx.font = 'italic 16px -apple-system, sans-serif';
  ctx.fillText('⚡ Generated via Adaptive Alpha Quantitative Momentum Screener', 50, 712);

  ctx.fillStyle = theme.accent;
  ctx.font = '600 16px monospace';
  ctx.fillText('rajakhil12-afk.github.io/adaptive-alpha/', 780, 712);
}

function downloadShareCardImage() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `adaptive_alpha_${currentCardTheme}_${new Date().toISOString().split('T')[0]}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function copyShareCardImage() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas || !navigator.clipboard) return;
  canvas.toBlob(blob => {
    try {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        alert('Image card copied to clipboard!');
      }).catch(() => {
        downloadShareCardImage();
      });
    } catch(e) {
      downloadShareCardImage();
    }
  });
}

function exportCSV() {
  const searchEl = document.getElementById('search-box');
  const search = searchEl ? searchEl.value.toLowerCase() : '';
  const sort = document.getElementById('sort-sel') ? document.getElementById('sort-sel').value : 'rs-desc';
  let data = allData.map(d => ({...d, pass: passes(d)}));
  if (search) data = data.filter(d => d.sym.toLowerCase().includes(search) || d.name.toLowerCase().includes(search) || d.ind.toLowerCase().includes(search));
  if (activeSector) data = data.filter(d => d.ind === activeSector);
  if (filters.pass) data = data.filter(d => d.pass);
  if (filters.watchlist) data = data.filter(d => pinnedStocks.includes(d.sym));
  
  data.sort((a,b) => {
    if (sort==='rs-desc')  return (b.rs_rating ?? 0) - (a.rs_rating ?? 0);
    if (sort==='ars-desc') return b.ars - a.ars;
    if (sort==='ars-asc')  return a.ars - b.ars;
    if (sort==='srs-desc') return b.srs - a.srs;
    if (sort==='vol-desc') return b.vol_ratio - a.vol_ratio;
    if (sort==='52w-desc') return b.hi52_prox - a.hi52_prox;
    if (sort==='days-desc') return (b.signDays ?? -1) - (a.signDays ?? -1);
    return a.sym.localeCompare(b.sym);
  });

  const headers = ['Ticker', 'Name', 'Sector', 'Price', 'ARS %', '5D Slope %', 'SRS %', '52W Prox %', 'Supertrend', 'RS Rating', 'MA Status'];
  const rows = data.map(d => {
    const stData = stParam === '14' ? d.st14 : d.st10;
    const stText = stData ? `${stData.trend.toUpperCase()} (${stData.signal ? 'Breakout' : 'Hold'})` : 'N/A';
    return [
      d.sym,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.ind.replace(/"/g, '""')}"`,
      d.price ?? 0,
      d.ars !== null && d.ars !== undefined ? (d.ars * 100).toFixed(2) : '—',
      (d.ars_slope != null && !isNaN(d.ars_slope)) ? (d.ars_slope * 100).toFixed(2) : '0.00',
      d.srs !== null && d.srs !== undefined ? (d.srs * 100).toFixed(2) : '—',
      d.hi52_prox !== null && d.hi52_prox !== undefined ? (d.hi52_prox * 100).toFixed(2) : '—',
      stText,
      d.rs_rating ?? 1,
      d.ma_status ?? 'MA-'
    ];
  });
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `adaptive_alpha_screener_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function copySummary() {
  const searchEl = document.getElementById('search-box');
  const search = searchEl ? searchEl.value.toLowerCase() : '';
  let data = allData.map(d => ({...d, pass: passes(d)}));
  if (search) data = data.filter(d => d.sym.toLowerCase().includes(search) || d.name.toLowerCase().includes(search) || d.ind.toLowerCase().includes(search));
  if (activeSector) data = data.filter(d => d.ind === activeSector);
  if (filters.pass) data = data.filter(d => d.pass);
  if (filters.watchlist) data = data.filter(d => pinnedStocks.includes(d.sym));
  
  const totalCount = allData.length;
  const passingCount = data.length;
  const passRate = totalCount > 0 ? (passingCount / totalCount) * 100 : 0;
  
  let verdict = 'NEUTRAL';
  if (passRate > 50) verdict = 'BULLISH';
  else if (passRate < 25) verdict = 'BEARISH';
  
  const isPreviewMode = !globalScreenerData.length || !allData.some(d => d.rs_rating > 1);
  const dataLabel = isPreviewMode ? ' \u26a0\ufe0f Preview Mode' : '';

  const top5 = [...data].sort((a, b) => (b.rs_rating ?? 0) - (a.rs_rating ?? 0)).slice(0, 5);
  let topStocksText = '';
  top5.forEach((s, idx) => {
    const maLabel = s.ma_status ?? 'MA?';
    const rsLabel = isPreviewMode ? 'est.' : (s.rs_rating ?? 1);
    topStocksText += `${idx+1}. ${s.sym} (RS: ${rsLabel}, ARS: ${(s.ars*100).toFixed(1)}%, ${maLabel})\n`;
  });
  if (!topStocksText) topStocksText = 'None matching filters\n';
  
  const breakouts = data.filter(d => d.breakout).map(d => d.sym).slice(0, 10).join(', ');
  const breakoutText = breakouts || 'None today';
  
  const sectors = {};
  allData.forEach(d => {
    if (!sectors[d.ind]) sectors[d.ind] = { sumArs: 0, count: 0 };
    sectors[d.ind].sumArs += d.ars;
    sectors[d.ind].count++;
  });
  const sectorStats = Object.keys(sectors).map(name => ({ name, avgArs: sectors[name].sumArs / sectors[name].count }));
  sectorStats.sort((a,b) => b.avgArs - a.avgArs);
  const topSectors = sectorStats.slice(0, 3).map(s => s.name).join(', ');

  const dateStr = new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'});
  const text = `📊 *ADAPTIVE ALPHA DAILY UPDATE${dataLabel}* - ${dateStr}\n\n`
    + `🔥 *Market Pulse (Verdict: ${verdict})*\n`
    + `• Pass Rate: ${passRate.toFixed(1)}% (${passingCount} of ${totalCount} stocks passing filters)\n`
    + `• Sector Leaders: ${topSectors}\n\n`
    + `⭐ *Top 5 Momentum Leaders:*\n${topStocksText}\n`
    + `⚡ *Fresh Breakout Stocks:* ${breakoutText}\n\n`
    + `🔍 View full momentum charts at your dashboard link.`;
    
  const copyToClipboard = (str) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(str);
    }
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return Promise.resolve();
  };

  copyToClipboard(text).then(() => {
    const btn = document.getElementById('share-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '📋 Copied!';
    btn.style.borderColor = 'var(--up)';
    btn.style.color = 'var(--up)';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 1500);
  }).catch(() => {
    alert('Failed to copy summary to clipboard.');
  });
}
