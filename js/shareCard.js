/**
 * Adaptive Alpha — Social Share Card & Data Export Engine
 * Generates high-res PNG visual cards, CSV exports, and Telegram/WhatsApp text summaries.
 */

function openShareCardModal() {
  const modal = document.getElementById('share-card-modal');
  if (modal) modal.classList.add('open');
  generateShareImageCard();
}

function closeShareCardModal() {
  const modal = document.getElementById('share-card-modal');
  if (modal) modal.classList.remove('open');
}

function generateShareImageCard() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = 1200;
  canvas.height = 750;

  const grad = ctx.createLinearGradient(0, 0, 1200, 750);
  grad.addColorStop(0, '#0d1117');
  grad.addColorStop(1, '#161b22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 750);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 1160, 710);

  ctx.fillStyle = '#e3b341';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('⚡ ADAPTIVE ALPHA | DAILY MOMENTUM CARD', 50, 75);

  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  ctx.fillStyle = '#8b949e';
  ctx.font = '500 22px -apple-system, sans-serif';
  ctx.fillText(`NSE Market Closing Summary · ${dateStr}`, 50, 115);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 135);
  ctx.lineTo(1150, 135);
  ctx.stroke();

  const freshBo = allData.filter(d => d.breakout);
  const topRunners = [...allData].sort((a,b) => b.ars - a.ars).slice(0, 5);
  const displayList = freshBo.length > 0 ? freshBo.slice(0, 5) : topRunners;
  const listTitle = freshBo.length > 0 ? `🔥 FRESH ARS BREAKOUTS (${freshBo.length})` : `🌟 TOP RELATIVE STRENGTH LEADERS`;

  ctx.fillStyle = '#58a6ff';
  ctx.font = 'bold 24px -apple-system, sans-serif';
  ctx.fillText(listTitle, 50, 180);

  let y = 230;
  displayList.forEach((s, idx) => {
    ctx.fillStyle = 'rgba(22, 27, 34, 0.8)';
    ctx.fillRect(50, y - 30, 1100, 60);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(50, y - 30, 1100, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${idx + 1}. ${s.sym}`, 70, y + 8);

    ctx.fillStyle = '#8b949e';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(`₹${(s.price || 0).toLocaleString('en-IN')}`, 320, y + 8);

    const arsPct = (s.ars * 100).toFixed(1);
    ctx.fillStyle = s.ars >= 0 ? '#00e676' : '#ef5350';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`ARS: ${arsPct > 0 ? '+' : ''}${arsPct}%`, 520, y + 8);

    ctx.fillStyle = (s.vol_ratio || 1) >= 1.5 ? '#82b1ff' : '#c9d1d9';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`Vol: ${(s.vol_ratio || 1).toFixed(1)}x`, 760, y + 8);

    ctx.fillStyle = '#e3b341';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`RS: ${s.rs_rating ?? 1}`, 980, y + 8);

    y += 75;
  });

  ctx.fillStyle = '#8b949e';
  ctx.font = 'italic 18px sans-serif';
  ctx.fillText('📈 Generated via Adaptive Alpha Quantitative Screener', 50, 700);
  ctx.fillText('rajakhil12-afk.github.io/adaptive-alpha/', 780, 700);
}

function downloadShareCardImage() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `adaptive_alpha_market_card_${new Date().toISOString().split('T')[0]}.png`;
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
  const search = document.getElementById('search-box').value.toLowerCase();
  const sort = document.getElementById('sort-sel').value;
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
  const search = document.getElementById('search-box').value.toLowerCase();
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
