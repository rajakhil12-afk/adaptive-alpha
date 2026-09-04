/**
 * Adaptive Alpha — Stock Table Rendering & Sorting Engine
 * Handles table row formatting, sparklines, badges, sorting, and tag badges.
 */

function arsClass(v, breakout) {
  if (breakout) return 'c-breakout';
  if (v === null || v === undefined) return 'c-gray';
  if (v >  0.15) return 'c-strong-up';
  if (v >  0.05) return 'c-up';
  if (v >  0)    return 'c-mild-up';
  if (v > -0.05) return 'c-mild-down';
  return 'c-down';
}

function pct(v) { 
  return v === null || v === undefined ? '—' : (v * 100).toFixed(2) + '%'; 
}

function fmtDays(days) {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function fmtSinceDate(ts) {
  if (ts === null || ts === undefined) return 'unknown';
  const d = new Date(ts * 1000);
  return 'since ' + d.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'2-digit'});
}

function makeSparkline(d) {
  const points = [];
  const trend = d.trending ? 1 : -1;
  const srsFactor = (d.srs || 0) * 5;
  const finalVal = d.ars;
  const startVal = d.prev ?? (d.ars - trend * 0.02);
  
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const wave = Math.sin(t * Math.PI * 1.5) * 0.01;
    const val = startVal + (finalVal - startVal) * t + wave * srsFactor;
    points.push(val);
  }
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 0.01;
  
  const svgPoints = points.map((val, idx) => {
    const x = (idx / 6) * 44 + 3;
    const y = 12 - ((val - min) / range) * 9;
    return `${x},${y}`;
  }).join(' ');
  
  const strokeColor = d.ars > 0 ? 'var(--up)' : 'var(--down)';
  
  return `<svg class="sparkline-svg" width="50" height="15" viewBox="0 0 50 15">
    <polyline fill="none" stroke="${strokeColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" points="${svgPoints}" />
  </svg>`;
}

function getLogoHtml(d) {
  if (d.logoid) {
    const logoUrl = `https://s3-symbol-logo.tradingview.com/${d.logoid}.svg`;
    return `<div class="sym-logo-container">
      <img src="${logoUrl}" class="sym-logo" loading="eager" decoding="async"
        onload="this.classList.add('loaded');this.nextElementSibling.style.display='none';"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="sym-logo-fallback">${d.sym.substring(0,1)}</div>
    </div>`;
  } else {
    return `<div class="sym-logo-container">
      <div class="sym-logo-fallback">${d.sym.substring(0,1)}</div>
    </div>`;
  }
}

function fixLogos() {
  document.querySelectorAll('.sym-logo:not(.loaded)').forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
      if (img.nextElementSibling) img.nextElementSibling.style.display = 'none';
    }
  });
}

function rowHtml(d) {
  const cls   = arsClass(d.ars, d.breakout);
  const arrow = d.trending ? '<span class="ars-arrow arrow-up">▲</span>' : '<span class="ars-arrow arrow-dn">▼</span>';
  const volPct = Math.min(100, ((d.vol_ratio || 1) / 3) * 100).toFixed(0);
  const tvUrl  = `https://www.tradingview.com/chart/?symbol=NSE:${d.sym}&interval=D`;
  
  const quadKey = getDualRSQuad(d);
  const quadLabels = {
    'quad-1': '🌟 Quad 1 Leader',
    'quad-2': '🔄 Quad 2 Turnaround',
    'quad-3': '⏸️ Quad 3 Dip',
    'quad-4': '💤 Quad 4 Laggard'
  };
  const quadPillHtml = `<span class="quad-pill ${quadKey}">${quadLabels[quadKey]}</span>`;

  const tags = [];
  if (d.ichimoku && (d.ichimoku.status === 'Kumo BUY' || d.ichimoku.kumo_buy || /Bull/i.test(d.ichimoku.status))) tags.push('<span class="tag tag-kumo">☁️ KUMO BUY</span>');
  if (d.pocket_pivot || d.is_pocket_pivot) tags.push('<span class="tag tag-pp" style="background:rgba(227,179,65,0.15);color:var(--gold);border:1px solid rgba(227,179,65,0.3)">⚡ POCKET PIVOT</span>');
  if ((d.vcp && d.vcp.is_vcp) || d.is_vcp) tags.push('<span class="tag tag-vcp" style="background:rgba(94,150,255,0.15);color:#7da9ff;border:1px solid rgba(94,150,255,0.3)">🧘 VCP SQUEEZE</span>');
  else if (d.vol_ratio >= 2.0) tags.push(`<span class="tag tag-vol-surge">⚡ ${d.vol_ratio.toFixed(1)}x Vol</span>`);
  else if (d.vol_ratio >= 1.5) tags.push('<span class="tag tag-vol">VOL+</span>');
  else if (d.vol_ratio <= 0.7) tags.push('<span class="tag tag-vcp">🧘 Dry-up</span>');
  
  if (d.mrs != null && d.mrs > 0) tags.push('<span class="tag" style="background:rgba(38,166,154,0.12);color:var(--up);">MRS+</span>');
  if (d.is_fno || (typeof window !== 'undefined' && window.FNO_SET && window.FNO_SET.has(d.sym))) tags.push('<span class="tag tag-fno" style="background:rgba(227,179,65,0.12);color:var(--gold);border:1px solid rgba(227,179,65,0.25)">F&O</span>');
  if (d.breakout)          tags.push('<span class="tag tag-new">*NEW*</span>');
  if (d.hi52_prox >= -0.05) tags.push('<span class="tag tag-52w">52W↑</span>');
  if (d.ma_status === 'MA+') tags.push('<span class="tag tag-ma-up">MA+</span>');
  else tags.push('<span class="tag tag-ma-dn">MA-</span>');
  const tagHtml = tags.length ? `<div class="tick-tags">${tags.join('')}</div>` : '';
  
  const stData = stParam === '14' ? d.st14 : d.st10;
  const stTrend = stData ? stData.trend : 'sell';
  const stSignal = stData ? stData.signal : null;
  const stVal = stData ? stData.val : 0;
  const isSTBuy = stTrend === 'buy';
  const stBadgeCls = isSTBuy ? 'st-buy' : 'st-sell';
  const glowCls = stSignal === 'buy_signal' ? 'st-signal-glow' : '';
  const stText = isSTBuy ? 'BUY' : 'SELL';
  const signalIcon = stSignal ? ' ⚡' : '';
  
  const isPinned = pinnedStocks.includes(d.sym);
  const pinIcon = isPinned ? '★' : '☆';
  const pinCls = isPinned ? 'pinned' : '';
  const pinHtml = `<span class="pin-star ${pinCls}" onclick="togglePin('${d.sym}');event.stopPropagation();" title="${isPinned ? 'Remove from Watchlist' : 'Add to Watchlist'}">${pinIcon}</span>`;
  const sparkSvg = makeSparkline(d);
  const isCmpChecked = compareStocks.includes(d.sym) ? 'checked' : '';

  return `<div class="tbl-row COL" data-sym="${d.sym}" onclick="selectStock('${d.sym}')">
    <div class="td td-chk">
      <input type="checkbox" class="chk-box" data-sym="${d.sym}" ${isCmpChecked} onclick="toggleCompare('${d.sym}', event)">
    </div>
    <div class="td td-ticker" title="Open NSE:${d.sym} on TradingView (1D)">
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center;">
          ${pinHtml}
          ${getLogoHtml(d)}
          <div class="tick-name" style="margin-left:2px">${d.sym}</div>
          <span class="tick-link-icon" title="Open TradingView Chart">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </span>
        </div>
        ${sparkSvg}
      </div>

      ${tagHtml}
      <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
        ${quadPillHtml}
        <span class="streak-badge ${d.signDays >= 50 ? 'streak-long' : ((d.signDays || 0) >= 15 ? 'streak-med' : 'streak-short')}">D:${d.signDays ?? 0}</span>
      </div>
    </div>
    
    <div class="td ${cls}" data-label="ARS">
      <div class="ars-val" style="color: ${d.ars >= 0 ? 'var(--up)' : 'var(--down)'}">${pct(d.ars)} ${arrow}</div>
      <div class="ars-slope" style="color: ${(d.ars_slope == null || isNaN(d.ars_slope)) ? 'var(--muted)' : d.ars_slope > 0 ? 'var(--up)' : d.ars_slope < 0 ? 'var(--down)' : 'var(--muted)'}">Δ ${(d.ars_slope == null || isNaN(d.ars_slope)) ? '—' : (d.ars_slope >= 0 ? '+' : '') + pct(d.ars_slope)} (5d)</div>
      <div class="cell-sub" style="font-size:8px;margin-top:2px">vs NIFTY 2021</div>
    </div>
    
    <div class="td" style="background:${d.srs>0?'rgba(38,166,154,0.06)':'rgba(239,83,80,0.04)'}" data-label="SRS">
      <div class="ars-val" style="color:${d.srs>0?'var(--up)':'var(--down)'}">${pct(d.srs)}</div>
      <div class="cell-sub">63-day RS</div>
    </div>
    
    <div class="td" style="background:${d.hi52_prox>=-0.05?'rgba(38,166,154,0.06)':'transparent'}" data-label="52W">
      <div class="ars-val" style="color:${d.hi52_prox>=-0.05?'var(--up)':'var(--muted)'}">${pct(d.hi52_prox)}</div>
      <div class="cell-sub">from 52W high</div>
    </div>
    
    <div class="td" data-label="Days">
      <div class="ars-val" style="color:${d.ars>=0?'var(--up)':'var(--down)'}">${fmtDays(d.signDays)}</div>
      <div class="cell-sub">${fmtSinceDate(d.signSince)}</div>
    </div>
    
    <div class="td" data-label="Vol">
      <div class="ars-val" style="color:${d.vol_ratio>=1.5?'#7da9ff':'var(--text)'}">${(d.vol_ratio || 1).toFixed(2)}×</div>
      <div class="vol-bar"><div class="vol-fill" style="width:${volPct}%;background:${d.vol_ratio>=1.5?'#7da9ff':'var(--up)'}"></div></div>
    </div>
    
    <div class="td" data-label="Supertrend">
      <div><span class="st-badge ${stBadgeCls} ${glowCls}">${stText}${signalIcon}</span></div>
      <div class="cell-sub" style="margin-top:3px">ST: ₹${stVal.toLocaleString('en-IN')}</div>
    </div>
    
    <div class="td" data-label="Price">
      <div class="ars-val" style="${d.price === 0 ? 'color:var(--muted)' : ''};font-weight:700">${d.price === 0 ? 'N/A' : '₹' + d.price.toLocaleString('en-IN')}</div>
    </div>
    
    <div class="td" style="align-items:center;" data-label="RS">
      <span class="rs-badge ${d.rs_rating>=90?'rs-high':(d.rs_rating>=70?'rs-med':'rs-low')}" style="background:${d.rs_rating>=90?'var(--up-dim)':(d.rs_rating>=70?'rgba(94,150,255,0.12)':'rgba(239,83,80,0.08)')};color:${d.rs_rating>=90?'var(--up)':(d.rs_rating>=70?'#7da9ff':'#a85a58')}">${d.rs_rating ?? 1}</span>
      <div class="cell-sub" style="font-size:8px;margin-top:2px">RS Rating</div>
    </div>
    
    <div class="td" onclick="event.stopPropagation()" style="align-items:center;justify-content:center;" data-label="TV">
      <a class="tv-btn" href="${tvUrl}" target="_blank" title="Open in TradingView">↗</a>
    </div>
  </div>`;
}

function renderTable() {
  if (!allData.length) return;
  const searchEl = document.getElementById('search-box');
  const search   = searchEl ? searchEl.value.toLowerCase() : '';
  const sort     = document.getElementById('sort-sel') ? document.getElementById('sort-sel').value : 'rs-desc';
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
    if (sort==='st-desc') {
      const aST = stParam === '14' ? a.st14 : a.st10;
      const bST = stParam === '14' ? b.st14 : b.st10;
      const aTrendVal = aST && aST.trend === 'buy' ? 1 : 0;
      const bTrendVal = bST && bST.trend === 'buy' ? 1 : 0;
      return bTrendVal - aTrendVal;
    }
    if (sort==='vol-desc') return b.vol_ratio - a.vol_ratio;
    if (sort==='52w-desc') return b.hi52_prox - a.hi52_prox;
    if (sort==='days-desc') return (b.signDays ?? -1) - (a.signDays ?? -1);
    return a.sym.localeCompare(b.sym);
  });
  
  const grouped = filters.groups && !search;
  const body = document.getElementById('tbl-body');
  if (!data.length) {
    if (filters.watchlist && !pinnedStocks.length) {
      body.innerHTML = '<div class="empty">Your watchlist is empty. Click the star icon (☆) next to a stock name to add it here.</div>';
    } else {
      body.innerHTML = '<div class="empty">No stocks match current filters.</div>';
    }
    clearSelection(data);
    return;
  }
  let html = '';
  if (grouped) {
    const byInd = {};
    data.forEach(d => { (byInd[d.ind] = byInd[d.ind]||[]).push(d); });
    Object.keys(byInd).sort().forEach(ind => {
      const rows = byInd[ind];
      html += `<div class="group-header"><span>${ind} &nbsp;<span style="color:var(--muted);font-weight:400;font-size:10px;text-transform:none;">(${rows.length} stock${rows.length>1?'s':''})</span></span></div>`;
      rows.forEach(d => { html += rowHtml(d); });
    });
  } else { 
    data.forEach(d => { html += rowHtml(d); }); 
  }
  body.innerHTML = html;

  const visibleSyms = data.map(d => d.sym);
  if (selectedSym && visibleSyms.includes(selectedSym)) {
    selectStock(selectedSym, false);
  } else {
    clearSelection(data);
  }

  data.forEach(d => {
    const prev = prevDataMap[d.sym];
    if (prev !== undefined && prev !== d.ars) {
      const el = document.querySelector(`[data-sym="${d.sym}"] .ars-val`);
      if (el) el.parentElement.classList.add(d.ars > prev ? 'flash-up' : 'flash-down');
    }
    prevDataMap[d.sym] = d.ars;
  });
  
  setTimeout(fixLogos, 0);
}

function sortData(arr) {
  const sortCol = document.getElementById('sort-sel').value;
  const copy = [...arr];
  
  if (sortCol === 'alpha') {
    copy.sort((a,b) => a.sym.localeCompare(b.sym));
  } else if (sortCol === 'ars-desc') {
    copy.sort((a,b) => b.ars - a.ars);
  } else if (sortCol === 'ars-asc') {
    copy.sort((a,b) => a.ars - b.ars);
  } else if (sortCol === 'srs-desc') {
    copy.sort((a,b) => b.srs - a.srs);
  } else if (sortCol === 'vol-desc') {
    copy.sort((a,b) => b.vol_ratio - a.vol_ratio);
  } else if (sortCol === '52w-desc') {
    copy.sort((a,b) => b.hi52_prox - a.hi52_prox);
  } else if (sortCol === 'days-desc') {
    copy.sort((a,b) => (b.signDays ?? 0) - (a.signDays ?? 0));
  } else if (sortCol === 'rs-desc') {
    copy.sort((a,b) => (b.rs_rating ?? 0) - (a.rs_rating ?? 0));
  } else if (sortCol === 'st-desc') {
    copy.sort((a,b) => {
      const stA = stParam === '14' ? a.st14 : a.st10;
      const stB = stParam === '14' ? b.st14 : b.st10;
      const trA = stA ? stA.trend : 'sell';
      const trB = stB ? stB.trend : 'sell';
      if (trA === 'buy' && trB !== 'buy') return -1;
      if (trA !== 'buy' && trB === 'buy') return 1;
      return b.ars - a.ars;
    });
  }
  return copy;
}
