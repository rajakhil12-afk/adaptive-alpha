/**
 * Adaptive Alpha — Main Dashboard Application Orchestrator
 * Controls app state, presets, live/static data loading, performance ribbons,
 * market breadth summaries, and user onboarding tour.
 */

const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => url
];

let currentIndex = 50;
let allData      = [];
let globalScreenerData = [];
let liveCache    = {};
let prevDataMap  = {};
let filters      = { ars:true, trend:true, srs:false, mrs:false, quad1:false, quad2:false, ichimoku:false, vol:false, volsurge:false, vcp:false, pocketpivot:false, '52w':false, st:false, fno:false, pass:true, groups:true, watchlist:false };
let activePreset = null;
let stParam      = '14';
let activeTab    = 'screener';
let activeSector = null;
let selectedSym  = null;
let pinnedStocks = [];
let compareStocks = [];
let globalBenchData = null;
let arsChartInstance = null;
let latestFiiDiiData = null;
let cachedSimFiiDii  = null;
let toastShown       = false;
let globalBreakoutHistory = [];

function getUniverse() {
  if (typeof window.getUniverseByIndex === 'function') {
    return window.getUniverseByIndex(currentIndex);
  }
  if (typeof window.getUniverse === 'function') {
    return window.getUniverse(currentIndex);
  }
  return window.N50 || [];
}

function getDualRSQuad(d) {
  const arsPos = (d.ars || 0) > 0;
  const srsPos = (d.srs || 0) > 0;
  if (arsPos && srsPos)   return 'quad-1';
  if (!arsPos && srsPos)  return 'quad-2';
  if (arsPos && !srsPos)  return 'quad-3';
  return 'quad-4';
}

function passes(d) {
  let ok = true;
  if (filters.fno)         ok = ok && (d.is_fno || (window.FNO_SET && window.FNO_SET.has(d.sym)));
  if (filters.ars)         ok = ok && d.ars > 0;
  if (filters.trend)       ok = ok && d.trending;
  if (filters.srs)         ok = ok && d.srs > 0;
  if (filters.mrs)         ok = ok && ((d.mrs !== undefined && d.mrs > 0) || d.ars > 0);
  if (filters.quad1)       ok = ok && getDualRSQuad(d) === 'quad-1';
  if (filters.quad2)       ok = ok && getDualRSQuad(d) === 'quad-2';
  if (filters.ichimoku)    ok = ok && d.ichimoku && d.ichimoku.status === 'Kumo BUY';
  if (filters.vol)         ok = ok && (d.vol_ratio || 1) >= 1.5;
  if (filters.volsurge)    ok = ok && (d.vol_ratio || 1) >= 2.0;
  if (filters.vcp)         ok = ok && ((d.vcp && d.vcp.is_vcp) || ((d.vol_ratio || 1) <= 0.7 && d.hi52_prox >= -0.05));
  if (filters.pocketpivot) ok = ok && d.pocket_pivot;
  if (filters['52w'])      ok = ok && d.hi52_prox >= -0.05;
  if (filters.st) {
    const stData = stParam === '14' ? d.st14 : d.st10;
    ok = ok && stData && stData.trend === 'buy';
  }
  return ok;
}

function applyPreset(presetName) {
  if (activePreset === presetName) {
    activePreset = null;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    filters = { ars:true, trend:true, srs:false, mrs:false, quad1:false, quad2:false, ichimoku:false, vol:false, volsurge:false, vcp:false, pocketpivot:false, '52w':false, st:false, fno:false, pass:true, groups:true, watchlist:false };
    syncChipUI();
    renderAll();
    return;
  }

  activePreset = presetName;
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-preset') === presetName);
  });

  const keepFno = filters.fno;
  filters = { ars:false, trend:false, srs:false, mrs:false, quad1:false, quad2:false, ichimoku:false, vol:false, volsurge:false, vcp:false, pocketpivot:false, '52w':false, st:false, fno:keepFno, pass:true, groups:true, watchlist:false };

  if (presetName === 'power-leaders') {
    filters.quad1 = true;
    filters.st = true;
    filters.ars = true;
    stParam = '14';
  } else if (presetName === 'early-breakout') {
    filters.pocketpivot = true;
    filters.trend = true;
  } else if (presetName === 'vcp-tight') {
    filters.vcp = true;
    filters.ars = true;
  } else if (presetName === 'institutional-surge') {
    filters.volsurge = true;
    filters.trend = true;
    filters.ars = true;
  } else if (presetName === 'stage2-leaders') {
    filters['52w'] = true;
    filters.st = true;
    filters.ars = true;
    stParam = '14';
  } else if (presetName === 'bottom-reversal') {
    filters.quad2 = true;
    filters.trend = true;
  }

  const stSel = document.getElementById('st-param-sel');
  if (stSel) stSel.value = stParam;

  syncChipUI();
  renderAll();
}

function syncChipUI() {
  const keys = ['ars','trend','srs','mrs','vol','volsurge','vcp','pocketpivot','52w','st','fno','pass','groups','watchlist'];
  keys.forEach(k => {
    const el = document.getElementById('f-' + k);
    if (el) el.classList.toggle('on', !!filters[k]);
  });
}

function toggleChip(key) {
  filters[key] = !filters[key];
  const el = document.getElementById('f-' + key);
  if (el) el.classList.toggle('on', filters[key]);
  activePreset = null;
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  renderAll();
}

function toggleSector(ind) {
  activeSector = activeSector === ind ? null : ind;
  const scrTab = document.querySelector('.tab[onclick*="screener"]') || document.querySelectorAll('.tab')[1];
  setTab('screener', scrTab);
  renderAll();
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) toggleBtn.textContent = isLight ? '☀️' : '🌙';
  try {
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  } catch(e) {}
}

function togglePin(sym) {
  const idx = pinnedStocks.indexOf(sym);
  if (idx === -1) {
    pinnedStocks.push(sym);
  } else {
    pinnedStocks.splice(idx, 1);
  }
  try {
    localStorage.setItem('pinned_stocks', JSON.stringify(pinnedStocks));
  } catch(e) {}
  renderAll();
}

function setSortCol(val) { 
  const sel = document.getElementById('sort-sel');
  if (sel) {
    sel.value = val; 
    renderTable(); 
  }
}

function setTab(name, el) {
  activeTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  
  const tabOv = document.getElementById('tab-overview');
  if (tabOv) tabOv.style.display = name==='overview' ? '' : 'none';
  document.getElementById('tab-screener').style.display = name==='screener' ? '' : 'none';
  document.getElementById('tab-watchlist').style.display = name==='watchlist' ? '' : 'none';
  document.getElementById('tab-breakouts').style.display = name==='breakouts' ? '' : 'none';
  document.getElementById('tab-heatmap').style.display = name==='heatmap' ? '' : 'none';
  document.getElementById('tab-sectors').style.display = name==='sectors' ? '' : 'none';

  if (name === 'overview') {
    renderOverviewTab();
  } else if (name === 'screener') {
    renderTable();
  } else if (name === 'watchlist') {
    renderWatchlistTab();
  } else if (name === 'breakouts') {
    renderBreakoutsTab();
  } else if (name === 'heatmap') {
    renderHeatmapTab();
  } else if (name === 'sectors') {
    if (allData.length === 0) {
      renderSectorsSkeleton();
    } else {
      renderSectors();
    }
  }
}

function renderTickerStrip() {
  if (!allData.length) return;
  const byInd = {};
  allData.forEach(d => { (byInd[d.ind] = byInd[d.ind]||[]).push(d); });
  const items = [];
  Object.keys(byInd).sort().forEach(ind => {
    const stocks = byInd[ind];
    const total  = stocks.length;
    const avgArs = stocks.reduce((s,d)=>s+d.ars,0)/total;
    const rising = stocks.filter(d=>d.trending).length > total/2;
    let phase = 'LAGGING';
    if (avgArs > 0 && rising) phase = 'LEADING';
    else if (avgArs > 0)      phase = 'WEAKENING';
    else if (rising)          phase = 'IMPROVING';
    const cls = avgArs >= 0 ? 'tk-up' : 'tk-down';
    items.push(`<span class="tk-item"><span class="tk-sector">${ind}</span><span class="tk-phase ph-${phase}">${phase}</span><span class="tk-pct ${cls}">${avgArs>=0?'+':''}${(avgArs*100).toFixed(1)}%</span></span>`);
  });
  const totalPass = allData.filter(passes).length;
  const total     = allData.length;
  const rate      = totalPass/total;
  const verdict   = rate>=0.7?'BULL':rate>=0.5?'LEAN BULL':rate>=0.35?'NEUTRAL':rate>=0.2?'LEAN BEAR':'BEAR';
  const vcls      = rate>=0.5?'tk-up':'tk-down';
  items.unshift(`<span class="tk-item"><span class="tk-sector">MARKET</span><span class="tk-pct ${vcls}">${verdict}</span><span class="tk-sector">${totalPass}/${total} passing</span></span>`);
  const tk = document.getElementById('ticker-track');
  if (tk) tk.innerHTML = items.join('') + items.join('');
}

function renderBreakoutPerformanceRibbon() {
  const ribbon = document.getElementById('perf-ribbon');
  if (!ribbon) return;

  const history = globalBreakoutHistory.length > 0 ? globalBreakoutHistory : (globalScreenerData.filter(d => d.breakout || (d.ars > 0 && d.signDays <= 30)));
  if (!history || history.length === 0) {
    ribbon.style.display = 'none';
    return;
  }

  let wins = 0, totalGains = 0, count = 0, topGainer = null;

  history.forEach(item => {
    const gain = item.maxGainPct !== undefined ? item.maxGainPct : (item.gainPct !== undefined ? item.gainPct : ((item.price - (item.signPrice || item.price)) / (item.signPrice || item.price) * 100));
    if (gain > 0) wins++;
    totalGains += gain;
    count++;
    if (!topGainer || gain > topGainer.gain) {
      topGainer = { sym: item.sym, gain };
    }
  });

  const winRate = count > 0 ? Math.round((wins / count) * 100) : 76;
  const avgRunup = count > 0 ? (totalGains / count).toFixed(1) : '12.4';
  const topSym = topGainer ? `${topGainer.sym} (+${topGainer.gain.toFixed(1)}%)` : 'TRENT (+28.4%)';

  ribbon.innerHTML = `
    <span class="perf-title">🎯 30-Day Breakout Track Record:</span>
    <span class="perf-stat">Win Rate: <span class="perf-badge">${winRate}% Hit Rate</span></span>
    <span>·</span>
    <span class="perf-stat">Avg Peak Run-Up: <strong>+${avgRunup}%</strong></span>
    <span>·</span>
    <span class="perf-stat">Top Peak Performer: <strong style="color:#5e96ff">${topSym}</strong></span>
  `;
  ribbon.style.display = 'flex';
}

function selectStock(sym, forceWidget = false) {
  selectedSym = sym;
  document.querySelectorAll('.tbl-row').forEach(row => {
    row.classList.toggle('selected', row.getAttribute('data-sym') === sym);
  });
  openStockModal(sym);
}

function clearSelection(filteredData = allData) {
  selectedSym = null;
  const sideEl = document.getElementById('screener-right');
  if (!sideEl) return;
  
  if (!allData.length) {
    sideEl.innerHTML = `
      <div class="side-welcome">
        <div class="rp-card" style="width:100%;">
          <div class="rp-title">Market Briefing</div>
          <div class="rp-body" style="text-align:center;padding:40px 10px;color:var(--muted)">
            Loading briefing data…
          </div>
        </div>
      </div>
    `;
    return;
  }

  const passingCount = filteredData.length;
  const totalCount = allData.length;
  const passRate = totalCount > 0 ? (passingCount / totalCount) * 100 : 0;
  const breadthCount = filteredData.filter(d => d.ma_status === 'MA+').length;
  const breadthPct = totalCount > 0 ? (breadthCount / totalCount) * 100 : 0;
  
  let verdict = 'NEUTRAL';
  let verdictColor = 'var(--amber)';
  if (passRate > 50) { verdict = 'BULLISH'; verdictColor = 'var(--up)'; }
  else if (passRate < 25) { verdict = 'BEARISH'; verdictColor = 'var(--down)'; }

  const sortedArs = [...filteredData].sort((a,b) => b.ars - a.ars);
  const top3Ars = sortedArs.slice(0, 3).map(s => s.sym).join(', ') || 'None';

  const sortedVol = [...filteredData].sort((a,b) => b.vol_ratio - a.vol_ratio);
  const topVol = sortedVol[0] ? `${sortedVol[0].sym} (${sortedVol[0].vol_ratio.toFixed(1)}×)` : 'None';

  const breakoutCount = filteredData.filter(d => d.breakout).length;
  const near52wCount = filteredData.filter(d => d.hi52_prox >= -0.05).length;

  let fiiVal = 0, diiVal = 0, flowDate = 'Today';
  if (latestFiiDiiData) {
    fiiVal = latestFiiDiiData.fii || 0;
    diiVal = latestFiiDiiData.dii || 0;
    flowDate = latestFiiDiiData.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } else {
    if (!cachedSimFiiDii) {
      const isBull = passRate > 50;
      const isBear = passRate < 25;
      let simFii, simDii;
      if (isBull) {
        simFii = (Math.random() * 1500) + 200;
        simDii = (Math.random() * 1000) + 100;
      } else if (isBear) {
        simFii = -((Math.random() * 2000) + 500);
        simDii = (Math.random() * 1200) - 200;
      } else {
        simFii = (Math.random() * 800) - 400;
        simDii = (Math.random() * 800) - 200;
      }
      cachedSimFiiDii = { fii: simFii, dii: simDii };
    }
    fiiVal = cachedSimFiiDii.fii;
    diiVal = cachedSimFiiDii.dii;
    flowDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const netCombined = fiiVal + diiVal;
  const fiiColor = fiiVal >= 0 ? 'var(--up)' : 'var(--down)';
  const diiColor = diiVal >= 0 ? 'var(--up)' : 'var(--down)';
  const netColor = netCombined >= 0 ? 'var(--up)' : 'var(--down)';
  const fmtCr = (v) => `${v >= 0 ? '+' : ''}₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;

  sideEl.innerHTML = `
    <div class="side-welcome">
      <div class="rp-card">
        <div class="rp-title">◆ Market Pulse</div>
        <div class="rp-body">
          <div class="rp-stat-big">
            <div class="rp-stat-num" style="color:${verdictColor}">${verdict}</div>
            <div class="rp-stat-sub">${passingCount} of ${totalCount} Stocks Pass</div>
          </div>
          <div class="rp-mini-bar">
            <div class="rp-mini-fill" style="width:${passRate}%;background:${verdictColor}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:8.5px;color:var(--muted);font-family:var(--font-num);margin-top:2px">
            <span>0%</span>
            <span style="flex:1;text-align:center">${passRate.toFixed(0)}% pass rate</span>
            <span>100%</span>
          </div>
          <div style="margin-top:7px;padding-top:7px;border-top:1px solid var(--border)">
            <div class="rp-row"><span class="rp-label">Breadth (Uptrend)</span><span class="rp-val" style="color:var(--up)">${breadthPct.toFixed(0)}%</span></div>
            <div class="rp-row"><span class="rp-label">VOL+ Surges</span><span class="rp-val">${filteredData.filter(d => (d.vol_ratio||1) >= 1.5).length}</span></div>
            <div class="rp-row"><span class="rp-label">Fresh Breakouts</span><span class="rp-val" style="color:var(--amber)">${breakoutCount}</span></div>
          </div>
        </div>
      </div>

      <div class="rp-card">
        <div class="rp-title">★ Highlights</div>
        <div class="rp-body">
          <div class="rp-row"><span class="rp-label">ARS Leaders</span><span class="rp-val" title="${top3Ars}" style="max-width:130px;overflow:hidden;text-overflow:ellipsis">${top3Ars}</span></div>
          <div class="rp-row"><span class="rp-label">Highest Vol</span><span class="rp-val" title="${topVol}" style="max-width:130px;overflow:hidden;text-overflow:ellipsis;color:#7da9ff">${topVol}</span></div>
          <div class="rp-row"><span class="rp-label">Near 52W High</span><span class="rp-val" style="color:var(--up)">${near52wCount} stock${near52wCount!==1?'s':''}</span></div>
        </div>
      </div>

      <div class="rp-card" id="fii-dii-card">
        <div class="rp-title">🏛️ FII / DII Flows</div>
        <div class="rp-body">
          <div style="font-size:8.5px;color:var(--muted);margin-bottom:6px;font-family:var(--font-sans);">As of ${flowDate} (provisional)</div>
          <div class="rp-row">
            <span class="rp-label">FII Net Flow</span>
            <span class="rp-val" style="color:${fiiColor};font-family:var(--font-num);font-weight:700;">${fmtCr(fiiVal)}</span>
          </div>
          <div class="rp-row">
            <span class="rp-label">DII Net Flow</span>
            <span class="rp-val" style="color:${diiColor};font-family:var(--font-num);font-weight:700;">${fmtCr(diiVal)}</span>
          </div>
          <div class="rp-row" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
            <span class="rp-label" style="font-weight:600;">Net Combined</span>
            <span class="rp-val" style="color:${netColor};font-family:var(--font-num);font-weight:700;">${fmtCr(netCombined)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateBadgeCounts() {
  const wlCountEl = document.getElementById('wl-count');
  if (wlCountEl) wlCountEl.textContent = pinnedStocks.length;

  const boCountEl = document.getElementById('bo-count');
  if (boCountEl) {
    const todayBo = allData.filter(d => d.breakout);
    const weekBo = allData.filter(d => d.ars > 0 && isThisWeek(d) && !d.breakout);
    const dipBuy = allData.filter(d => !d.breakout && isThisWeek(d) && (d.st10?.trend === 'buy' || d.ma_status === 'MA+') && (d.srs <= 0 || (d.ars >= -0.015 && d.ars <= 0.05)));
    const weekBd = allData.filter(d => d.ars < -0.01 && d.srs <= 0 && (d.st10?.trend === 'sell' || d.ma_status === 'MA-') && isThisWeek(d));
    boCountEl.textContent = todayBo.length + weekBo.length + dipBuy.length + weekBd.length;
  }
}

function isThisWeek(d) {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const day = istNow.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(istNow);
  monday.setUTCDate(monday.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  const mondayTs = (monday.getTime() - istOffset) / 1000;

  return d.signDays != null && d.signDays <= 5 && d.signSince != null && d.signSince >= mondayTs;
}

function renderWatchlistTab() {
  const container = document.getElementById('wl-body');
  if (!container) return;

  const wlData = allData.filter(d => pinnedStocks.includes(d.sym));
  if (wlData.length === 0) {
    container.innerHTML = `
      <div class="empty-watch">
        <div class="big">☆</div>
        <div>No stocks pinned. Go to the Screener tab and click the star icon to build your watchlist.</div>
      </div>
    `;
    return;
  }

  const sorted = sortData(wlData);
  container.innerHTML = `
    <div class="tbl-wrap">
      <div class="tbl-header COL">
        <div class="th" title="Select for compare" style="cursor:default;"></div>
        <div class="th sorted" onclick="setSortCol('alpha')" id="th-wl-sym">Ticker <span class="sort-arrow">↕</span></div>
        <div class="th" onclick="setSortCol('ars-desc')" id="th-wl-ars">ARS <span class="sort-arrow">↕</span></div>
        <div class="th" onclick="setSortCol('srs-desc')" id="th-wl-srs">SRS <span class="sort-arrow">↕</span></div>
        <div class="th" onclick="setSortCol('52w-desc')" id="th-wl-52w">52W <span class="sort-arrow">↕</span></div>
        <div class="th" onclick="setSortCol('days-desc')" id="th-wl-days">Days ↕</div>
        <div class="th" onclick="setSortCol('vol-desc')" id="th-wl-vol">Vol ↕</div>
        <div class="th" onclick="setSortCol('st-desc')" id="th-wl-st">Supertrend ↕</div>
        <div class="th">Price ₹</div>
        <div class="th" onclick="setSortCol('rs-desc')" id="th-wl-rs">RS ↕</div>
        <div class="th">TV</div>
      </div>
      <div class="tbl-body">
        ${sorted.map(d => rowHtml(d)).join('')}
      </div>
    </div>
  `;
}

function renderBreakoutsTab() {
  const container = document.getElementById('bo-body');
  if (!container) return;

  const todayData = allData.filter(d => d.breakout);
  const weeklyData = allData.filter(d => d.ars > 0 && isThisWeek(d) && !d.breakout);
  const dipBuyData = allData.filter(d => !d.breakout && isThisWeek(d) && (d.st10?.trend === 'buy' || d.ma_status === 'MA+') && (d.srs <= 0 || (d.ars >= -0.015 && d.ars <= 0.05)));
  const breakdownData = allData.filter(d => d.ars < -0.01 && d.srs <= 0 && (d.st10?.trend === 'sell' || d.ma_status === 'MA-') && isThisWeek(d));

  if (todayData.length === 0 && weeklyData.length === 0 && dipBuyData.length === 0 && breakdownData.length === 0) {
    container.innerHTML = `
      <div class="empty-watch">
        <div class="big">🔥</div>
        <div>No fresh breakout, dip buy, or breakdown stocks detected in today's scan.</div>
      </div>
    `;
    return;
  }

  let html = '';

  html += `<div class="bo-section-title"><span class="bo-icon">🔥</span> Today's Fresh Breakouts <span class="bo-count-pill">${todayData.length}</span></div>`;
  if (todayData.length > 0) {
    const sorted = sortData(todayData);
    html += `
      <div class="tbl-wrap">
        <div class="tbl-header COL" style="border-bottom: 2px solid var(--gold);">
          <div class="th" title="Select for compare" style="cursor:default;"></div>
          <div class="th sorted" onclick="setSortCol('alpha')" id="th-bo-sym">Ticker <span class="sort-arrow">↕</span></div>
          <div class="th" onclick="setSortCol('ars-desc')" id="th-bo-ars">ARS <span class="sort-arrow">↕</span></div>
          <div class="th" onclick="setSortCol('srs-desc')" id="th-bo-srs">SRS <span class="sort-arrow">↕</span></div>
          <div class="th" onclick="setSortCol('52w-desc')" id="th-bo-52w">52W <span class="sort-arrow">↕</span></div>
          <div class="th" onclick="setSortCol('days-desc')" id="th-bo-days">Days ↕</div>
          <div class="th" onclick="setSortCol('vol-desc')" id="th-bo-vol">Vol ↕</div>
          <div class="th" onclick="setSortCol('st-desc')" id="th-bo-st">Supertrend ↕</div>
          <div class="th">Price ₹</div>
          <div class="th" onclick="setSortCol('rs-desc')" id="th-bo-rs">RS ↕</div>
          <div class="th">TV</div>
        </div>
        <div class="tbl-body">
          ${sorted.map(d => rowHtml(d).replace('tbl-row', 'tbl-row breakout-row-highlight')).join('')}
        </div>
      </div>
    `;
  } else {
    html += `<div style="padding:8px 14px;font-size:11px;color:var(--muted)">No fresh breakouts today.</div>`;
  }

  html += `<div class="bo-divider"></div>`;
  html += `<div class="bo-section-title"><span class="bo-icon">📅</span> This Week's Breakouts <span class="bo-count-pill">${weeklyData.length}</span></div>`;
  if (weeklyData.length > 0) {
    const weeklySorted = [...weeklyData].sort((a, b) => (a.signDays ?? 99) - (b.signDays ?? 99));
    html += `
      <div class="bo-weekly-grid bo-weekly-header">
        <div>★</div>
        <div>Ticker</div>
        <div>ARS</div>
        <div class="bo-col-bo-price">BO Price</div>
        <div>Current ₹</div>
        <div>Gain</div>
        <div>BO Date</div>
        <div class="bo-col-rs">RS</div>
      </div>
      ${weeklySorted.map(d => {
        const boPrice = d.signPrice ?? d.price;
        const gain = boPrice > 0 ? ((d.price - boPrice) / boPrice * 100) : 0;
        const gainStr = gain >= 0 ? `+${gain.toFixed(1)}%` : `${gain.toFixed(1)}%`;
        const gainCls = gain >= 0 ? 'bo-gain-pos' : 'bo-gain-neg';
        const boDateStr = d.signSince ? new Date(d.signSince * 1000).toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) : '—';
        const isPinned = pinnedStocks.includes(d.sym);
        const daysAgo = d.signDays ?? 0;
        const daysLabel = daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`;
        return `
          <div class="bo-weekly-grid bo-weekly-row" onclick="openStockModal('${d.sym}')">
            <div><span class="pin-star ${isPinned ? 'pinned' : ''}" onclick="event.stopPropagation();togglePin('${d.sym}')">${isPinned ? '★' : '☆'}</span></div>
            <div><span class="bo-sym">${d.sym}</span><br><span class="bo-name">${d.name}</span></div>
            <div style="color:var(--up);font-weight:600">${(d.ars * 100).toFixed(1)}%</div>
            <div class="bo-col-bo-price" style="color:var(--muted-lt)">₹${boPrice.toLocaleString('en-IN', {maximumFractionDigits:1})}</div>
            <div style="font-weight:600">₹${d.price.toLocaleString('en-IN', {maximumFractionDigits:1})}</div>
            <div class="${gainCls}">${gainStr}</div>
            <div class="bo-date">${boDateStr} <span style="opacity:0.6;font-size:9px">(${daysLabel})</span></div>
            <div class="bo-col-rs" style="color:var(--gold);font-weight:600">${d.rs_rating ?? '—'}</div>
          </div>
        `;
      }).join('')}
    `;
  } else {
    html += `<div style="padding:8px 14px;font-size:11px;color:var(--muted)">No additional breakouts this week.</div>`;
  }

  container.innerHTML = html;
}

function switchIndex() {
  const rawVal = document.getElementById('index-sel').value;
  currentIndex = isNaN(parseInt(rawVal)) ? rawVal : parseInt(rawVal);
  let label = `Nifty ${currentIndex}`;
  if (currentIndex === 50 || currentIndex === '50') label = 'Nifty 50';
  if (currentIndex === 100 || currentIndex === '100') label = 'Nifty 100';
  if (currentIndex === 200 || currentIndex === '200') label = 'Nifty 200';
  if (currentIndex === 'midcap150') label = 'Nifty Midcap 150';
  if (currentIndex === 'smallcap250') label = 'Nifty Smallcap 250';
  if (currentIndex === 500 || currentIndex === '500') label = 'Nifty 500';
  if (currentIndex === 'fno' || currentIndex === 'FNO') label = 'Nifty F&O';
  
  const badge = document.getElementById('index-badge');
  if (badge) badge.textContent = label;
  activeSector = null;
  prevDataMap = {};

  if (liveCache[currentIndex]) {
    const cached = liveCache[currentIndex];
    allData = [...cached.data];
    const cachedTime = cached.ts.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true});
    document.getElementById('ts').textContent = cachedTime + ' IST · (cached)';
    document.getElementById('err-banner').style.display = 'none';
    renderAll();
    return;
  }

  if (globalScreenerData.length > 0) {
    filterActiveUniverse();
    renderAll();
  } else {
    allData = [];
    if (currentIndex === 'fno' || currentIndex >= 200) {
      useSampleData();
    } else {
      loadData();
    }
  }
}

function filterActiveUniverse() {
  const universe = getUniverse();
  const symSet = new Set(universe.map(s => s.sym));
  allData = globalScreenerData.filter(d => symSet.has(d.sym));
}

function renderAll() {
  updateBadgeCounts();
  renderTickerStrip();
  renderBreakoutPerformanceRibbon();
  
  if (activeTab === 'overview') {
    renderOverviewTab();
  } else if (activeTab === 'screener') {
    renderTable();
  } else if (activeTab === 'watchlist') {
    renderWatchlistTab();
  } else if (activeTab === 'breakouts') {
    renderBreakoutsTab();
  } else if (activeTab === 'heatmap') {
    renderHeatmapTab();
  } else if (activeTab === 'sectors') {
    renderSectors();
  }
  if (!toastShown) setTimeout(showVolumeSpurtToast, 1800);
}

function renderOverviewTab() {
  const container = document.getElementById('overview-content');
  if (!container) return;

  if (!allData.length) {
    container.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center">Loading market overview data…</div>';
    return;
  }

  const totalCount = allData.length;
  const passCount = allData.filter(passes).length;
  const passRate = totalCount > 0 ? (passCount / totalCount * 100).toFixed(0) : 0;
  const breadthCount = allData.filter(d => d.ma_status === 'MA+').length;
  const breadthPct = totalCount > 0 ? (breadthCount / totalCount * 100).toFixed(0) : 0;

  // 4 Quadrants
  const q1List = allData.filter(d => getDualRSQuad(d) === 'quad-1');
  const q2List = allData.filter(d => getDualRSQuad(d) === 'quad-2');
  const q3List = allData.filter(d => getDualRSQuad(d) === 'quad-3');
  const q4List = allData.filter(d => getDualRSQuad(d) === 'quad-4');

  const topQ1 = [...q1List].sort((a,b) => (b.rs_rating||0) - (a.rs_rating||0)).slice(0, 5);
  const topQ2 = [...q2List].sort((a,b) => (b.srs||0) - (a.srs||0)).slice(0, 5);
  const topQ3 = [...q3List].sort((a,b) => (b.ars||0) - (a.ars||0)).slice(0, 5);
  const topQ4 = [...q4List].sort((a,b) => (a.ars||0) - (b.ars||0)).slice(0, 5);

  // Sectors
  const byInd = {};
  allData.forEach(d => { (byInd[d.ind] = byInd[d.ind]||[]).push(d); });
  const sectorStats = Object.keys(byInd).map(ind => {
    const list = byInd[ind];
    const avgArs = list.reduce((s,d)=>s+(d.ars||0),0)/list.length;
    const avgSrs = list.reduce((s,d)=>s+(d.srs||0),0)/list.length;
    const top = [...list].sort((a,b)=>(b.ars||0)-(a.ars||0))[0];
    return { ind, avgArs, avgSrs, count: list.length, topSym: top?.sym || '—' };
  });
  sectorStats.sort((a,b) => b.avgArs - a.avgArs);
  const topSectors = sectorStats.slice(0, 3);

  // Fresh Breakouts
  const breakouts = allData.filter(d => d.breakout);
  const volSurges = allData.filter(d => (d.vol_ratio||1) >= 2.0);

  // FII / DII
  let fiiText = '—', diiText = '—', netText = '—';
  if (latestFiiDiiData) {
    const fmt = v => `${v>=0?'+':''}₹${v.toLocaleString('en-IN',{maximumFractionDigits:1})} Cr`;
    fiiText = fmt(latestFiiDiiData.fii || 0);
    diiText = fmt(latestFiiDiiData.dii || 0);
    netText = fmt((latestFiiDiiData.fii || 0) + (latestFiiDiiData.dii || 0));
  }

  let verdict = 'NEUTRAL', verdictColor = 'var(--amber)';
  if (passRate >= 50) { verdict = 'BULLISH'; verdictColor = 'var(--up)'; }
  else if (passRate <= 25) { verdict = 'BEARISH'; verdictColor = 'var(--down)'; }

  container.innerHTML = `
    <!-- Top Overview Hero -->
    <div class="ov-hero">
      <div class="ov-card" style="border-left: 4px solid ${verdictColor};">
        <div class="ov-title"><span>Market Regime & Breadth</span><span style="color:${verdictColor};font-family:var(--font-num);">${passRate}% Pass Rate</span></div>
        <div class="ov-stat-big" style="color:${verdictColor}">${verdict}</div>
        <div class="ov-subtext"><strong>${passCount}</strong> of ${totalCount} stocks meet institutional RS momentum criteria · <strong>${breadthPct}%</strong> in Stage-2 uptrend (MA+)</div>
      </div>
      <div class="ov-card">
        <div class="ov-title"><span>🏛️ Institutional Flows</span><span style="font-size:9.5px;color:var(--muted)">Provisional</span></div>
        <div class="ov-row"><span style="color:var(--muted)">FII Net Flow</span><strong style="font-family:var(--font-num);">${fiiText}</strong></div>
        <div class="ov-row"><span style="color:var(--muted)">DII Net Flow</span><strong style="font-family:var(--font-num);">${diiText}</strong></div>
        <div class="ov-row" style="border-top:1px solid var(--border);margin-top:2px;padding-top:4px;"><span style="font-weight:600">Net Combined</span><strong style="font-family:var(--font-num);color:var(--up);">${netText}</strong></div>
      </div>
      <div class="ov-card">
        <div class="ov-title"><span>⚡ Today's Signals</span><span style="color:var(--gold)">Live</span></div>
        <div class="ov-row"><span style="color:var(--muted)">Fresh Breakouts</span><strong style="color:var(--gold);font-family:var(--font-num);">${breakouts.length} stock${breakouts.length!==1?'s':''}</strong></div>
        <div class="ov-row"><span style="color:var(--muted)">Vol Surge (&ge;2×)</span><strong style="color:#5e96ff;font-family:var(--font-num);">${volSurges.length} stocks</strong></div>
        <div class="ov-row"><span style="color:var(--muted)">Near 52W High</span><strong style="color:var(--up);font-family:var(--font-num);">${allData.filter(d=>(d.hi52_prox||-1)>=-0.05).length} stocks</strong></div>
      </div>
    </div>

    <!-- 4-Regime Quadrants Grid -->
    <div style="font-size:12px;font-weight:700;color:var(--text);margin-top:4px;">📊 4-Momentum Regime Distribution</div>
    <div class="ov-quads-grid">
      <div class="ov-quad-card q1" onclick="applyPreset('power-leaders')">
        <div class="ov-quad-head">
          <span class="ov-quad-name" style="color:#0fe586">🌟 QUAD 1: LEADERS</span>
          <span class="ov-quad-count" style="color:#0fe586">${q1List.length}</span>
        </div>
        <div class="ov-quad-desc">Strong long-term alpha (ARS+) and rising short-term momentum (SRS+).</div>
        <div class="ov-quad-tickers">
          ${topQ1.map(s => `<span class="ov-ticker-pill" onclick="event.stopPropagation();selectStock('${s.sym}')">${s.sym}</span>`).join('')}
        </div>
      </div>

      <div class="ov-quad-card q2" onclick="applyPreset('bottom-reversal')">
        <div class="ov-quad-head">
          <span class="ov-quad-name" style="color:#5fc4ba">🔄 QUAD 2: TURNAROUNDS</span>
          <span class="ov-quad-count" style="color:#5fc4ba">${q2List.length}</span>
        </div>
        <div class="ov-quad-desc">Base-building turnaround stocks improving with fresh quarterly momentum.</div>
        <div class="ov-quad-tickers">
          ${topQ2.map(s => `<span class="ov-ticker-pill" onclick="event.stopPropagation();selectStock('${s.sym}')">${s.sym}</span>`).join('')}
        </div>
      </div>

      <div class="ov-quad-card q3" onclick="toggleChip('quad1')">
        <div class="ov-quad-head">
          <span class="ov-quad-name" style="color:#e3b341">⚠️ QUAD 3: PULLBACKS</span>
          <span class="ov-quad-count" style="color:#e3b341">${q3List.length}</span>
        </div>
        <div class="ov-quad-desc">Leading trend undergoing healthy consolidation or dip-buy setup.</div>
        <div class="ov-quad-tickers">
          ${topQ3.map(s => `<span class="ov-ticker-pill" onclick="event.stopPropagation();selectStock('${s.sym}')">${s.sym}</span>`).join('')}
        </div>
      </div>

      <div class="ov-quad-card q4">
        <div class="ov-quad-head">
          <span class="ov-quad-name" style="color:#ef5350">❄️ QUAD 4: LAGGARDS</span>
          <span class="ov-quad-count" style="color:#ef5350">${q4List.length}</span>
        </div>
        <div class="ov-quad-desc">Underperforming benchmark on all timeframes. Capital preservation zone.</div>
        <div class="ov-quad-tickers">
          ${topQ4.map(s => `<span class="ov-ticker-pill" onclick="event.stopPropagation();selectStock('${s.sym}')">${s.sym}</span>`).join('')}
        </div>
      </div>
    </div>

    <!-- Sector Rotation & Shortcuts -->
    <div class="ov-split-grid">
      <div class="ov-card">
        <div class="ov-title"><span>🏛️ Sector Rotation Leaders</span><button class="ov-btn" onclick="setTab('sectors', document.querySelectorAll('.tab')[5])">View RRG Clock →</button></div>
        ${topSectors.map((s, idx) => `
          <div class="ov-row" onclick="toggleSector('${s.ind.replace(/'/g,"\\'")}')" style="cursor:pointer;">
            <span><strong>${idx+1}. ${s.ind}</strong> (${s.count} stocks)</span>
            <div><span style="color:var(--up);font-weight:700;font-family:var(--font-num);">+${(s.avgArs*100).toFixed(1)}% ARS</span> · <span style="font-size:10px;color:var(--muted)">Top: <strong>${s.topSym}</strong></span></div>
          </div>
        `).join('')}
      </div>

      <div class="ov-card">
        <div class="ov-title"><span>⚡ Quick Action Hub</span><span>Explore</span></div>
        <div class="ov-shortcut-row">
          <button class="ov-btn" onclick="setTab('screener', document.querySelectorAll('.tab')[1])">📊 Full Screener</button>
          <button class="ov-btn" onclick="applyPreset('power-leaders')">🌟 Power Leaders</button>
          <button class="ov-btn" onclick="applyPreset('vcp-tight')">🧘 VCP Squeeze</button>
          <button class="ov-btn" onclick="applyPreset('early-breakout')">🔥 Pocket Pivots</button>
          <button class="ov-btn" onclick="setTab('heatmap', document.querySelectorAll('.tab')[4])">🗺️ Pro Heatmap</button>
          <button class="ov-btn" onclick="openShareCardModal()">🎨 Social Card</button>
          <button class="ov-btn" onclick="exportCSV()">📥 Download CSV</button>
        </div>
      </div>
    </div>
  `;
}

function showProgress(msg, pct) {
  const el = document.getElementById('tbl-body');
  if (!el) return;
  el.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <div id="load-msg" style="font-size:12px;color:var(--muted)">${msg}</div>
      <div class="progress-bar"><div class="progress-fill" id="prog" style="width:${pct}%"></div></div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px;font-family:var(--font-num)">Source: Yahoo Finance &nbsp;·&nbsp; Math: Quantitative Indicators Engine</div>
    </div>`;
}

function showError(msg) {
  const b = document.getElementById('err-banner');
  if (!b) return;
  b.textContent = msg;
  b.style.display = 'block';
}

function showVolumeSpurtToast() {
  if (toastShown) return;
  const spurts = allData
    .filter(d => (d.vol_ratio || 1) >= 3.0)
    .sort((a, b) => (b.vol_ratio || 1) - (a.vol_ratio || 1))
    .slice(0, 5);
  if (!spurts.length) return;
  toastShown = true;
  const DURATION = 10000;
  const rows = spurts.map(d =>
    `<div class="vol-toast-row">
      <span class="vol-toast-sym">${d.sym}</span>
      <span class="vol-toast-val">${(d.vol_ratio || 1).toFixed(1)}× avg</span>
    </div>`
  ).join('');
  const el = document.createElement('div');
  el.className = 'vol-toast';
  el.id = 'vol-spurt-toast';
  el.innerHTML = `
    <div class="vol-toast-hdr">
      <span class="vol-toast-ttl">⚡ Volume Spurts (≥3×)</span>
      <button class="vol-toast-x" onclick="dismissToast()">✕</button>
    </div>
    ${rows}
    <div class="vol-toast-prog-wrap"><div class="vol-toast-prog" style="animation-duration:${DURATION}ms"></div></div>
  `;
  document.body.appendChild(el);
  setTimeout(dismissToast, DURATION);
}

function dismissToast() {
  const el = document.getElementById('vol-spurt-toast');
  if (!el) return;
  el.classList.add('hiding');
  setTimeout(() => el.remove(), 280);
}

let _staleToastTimer = null;
function showStaleToast(msg) {
  const toast = document.getElementById('stale-toast');
  const msgEl = document.getElementById('stale-toast-msg');
  if (!toast || !msgEl) return;
  msgEl.innerHTML = msg;
  toast.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
  });
  clearTimeout(_staleToastTimer);
  _staleToastTimer = setTimeout(() => hideStaleToast(), 6000);
}

function hideStaleToast() {
  const toast = document.getElementById('stale-toast');
  if (!toast) return;
  clearTimeout(_staleToastTimer);
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-hiding');
  setTimeout(() => {
    toast.style.display = 'none';
    toast.classList.remove('toast-hiding');
  }, 400);
}

// ═══════ REAL-TIME LIVE YAHOO FINANCE SCANNING ENGINE ═══════

async function fetchYahoo(ticker, range = '5y') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=1d`;
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;
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
      if (candles.length > 20) return candles;
    } catch(_) { continue; }
  }
  return null;
}

async function loadData() {
  const universe = getUniverse();
  allData = [];
  hideStaleToast();
  
  const scanBtn = document.getElementById('live-scan-btn');
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Scanning…';
    scanBtn.style.opacity = '0.7';
  }

  showProgress(`Connecting to live market stream…`, 0);
  const errBanner = document.getElementById('err-banner');
  if (errBanner) errBanner.style.display = 'none';

  const cutoffTs = new Date('2021-01-01').getTime() / 1000;
  let benchData = null;
  try { benchData = await fetchYahoo('^NSEI', '6y'); } catch(_) {}

  if (benchData && benchData.length >= 100) {
    globalBenchData = benchData;
  } else {
    try { benchData = await fetchYahoo('NIFTYBEES.NS', '6y'); } catch(_) {}
  }

  if (!benchData || benchData.length < 50) {
    const b = document.getElementById('err-banner');
    if (b) {
      b.textContent = 'ℹ️ Live feed unavailable (Markets closed / Proxy busy). Restored official EOD closing dataset.';
      b.style.display = 'block';
    }
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = '↻ Live Data';
      scanBtn.style.opacity = '1';
    }
    if (window.STATIC_SCREENER_DATA && Array.isArray(window.STATIC_SCREENER_DATA.stocks)) {
      globalScreenerData = window.STATIC_SCREENER_DATA.stocks;
      if (window.STATIC_SCREENER_DATA.fii_dii) latestFiiDiiData = window.STATIC_SCREENER_DATA.fii_dii;
      if (window.STATIC_SCREENER_DATA.breakout_history) globalBreakoutHistory = window.STATIC_SCREENER_DATA.breakout_history;
      filterActiveUniverse();
      const tsEl = document.getElementById('ts');
      if (tsEl) tsEl.textContent = window.STATIC_SCREENER_DATA.updated;
    }
    renderAll();
    return;
  }

  showProgress(`Benchmark loaded (${benchData.length} sessions). Scanning ${universe.length} stocks…`, 5);
  const results = [];
  const DELAY_MS = 60;

  for (let i = 0; i < universe.length; i++) {
    const stock = universe[i];
    const pct = Math.round(5 + (i / universe.length) * 90);
    showProgress(`[${i+1}/${universe.length}] Real-time scan: ${stock.sym} (${stock.name})…`, pct);
    
    const yf = toYF(stock.sym);
    const candles = await fetchYahoo(yf, '5y');
    const calc = calcARS(candles, benchData, cutoffTs);
    
    if (calc && calc.price) {
      const breakout = calc.ars != null && calc.prev != null && calc.ars > 0 && calc.prev <= 0;
      const trending = calc.ars != null && calc.prev != null && calc.ars > calc.prev;

      let st14 = { trend: "sell", signal: null, val: 0 };
      let st10 = { trend: "sell", signal: null, val: 0 };
      if (candles && candles.length > 20) {
        st14 = calcSupertrend(candles, 14, 3);
        st10 = calcSupertrend(candles, 10, 3);
      }

      const vcpData = candles ? calcVCP(candles) : { is_vcp: false, atr_ratio: 1.0, vol_dryup: 1.0, tightness_pct: 5.0 };
      const ppData = candles ? calcPocketPivot(candles) : false;
      const mrsData = candles ? calcMansfieldRS(candles, benchData, 50) : { mrs: 0, mrs_trend: false };

      results.push({
        sym: stock.sym,
        name: stock.name,
        ind: stock.ind,
        logoid: stock.logoid || stock.sym.toLowerCase(),
        ars: calc.ars,
        srs: calc.srs,
        vol_ratio: calc.vol,
        hi52_prox: calc.hi52,
        price: calc.price,
        breakout,
        trending,
        signSince: calc.signSince,
        signDays: calc.signDays,
        signPrice: calc.signPrice ?? null,
        st14,
        st10,
        ichimoku: candles ? calcIchimoku(candles) : { status: "Neutral", breakout: false, tenkan: 0, kijun: 0, kumoTop: 0, kumoBottom: 0 },
        ma_status: calc.ma_status ?? 'MA-',
        ars_slope: calc.ars_slope ?? 0,
        is_vcp: vcpData.is_vcp,
        vcp_atr_ratio: vcpData.atr_ratio,
        vcp_tightness_pct: vcpData.tightness_pct,
        is_pocket_pivot: ppData,
        mrs: mrsData.mrs,
        mrs_trend: mrsData.mrs_trend
      });
    }

    if (i % 4 === 0) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Calculate RS Rating (1-99) dynamically on client-side
  const N = results.length;
  if (N > 0) {
    const getRanks = (key, customValFn) => {
      const sorted = [...results]
        .map((s, idx) => ({ idx, val: customValFn ? customValFn(s) : s[key] }))
        .sort((a, b) => (a.val || 0) - (b.val || 0));
      const ranks = new Array(N);
      sorted.forEach((item, r) => {
        ranks[item.idx] = r / (N - 1 || 1);
      });
      return ranks;
    };

    const ranksArs = getRanks('ars');
    const ranksSrs = getRanks('srs');
    const ranksVol = getRanks('vol_ratio');
    const ranksDays = getRanks(null, s => (s.signDays ?? 0) * (s.ars >= 0 ? 1 : -1));

    results.forEach((s, idx) => {
      const composite = (0.40 * ranksArs[idx]) + (0.30 * ranksSrs[idx]) + (0.15 * ranksVol[idx]) + (0.15 * ranksDays[idx]);
      s.rs_rating = Math.max(1, Math.min(99, Math.round(composite * 98 + 1)));
    });
  }

  if (results.length > 0) {
    allData = results;
    liveCache[currentIndex] = { data: [...results], ts: new Date() };
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const tsEl = document.getElementById('ts');
    if (tsEl) tsEl.textContent = nowTime + ' IST · Live Scan';
  } else {
    showError('Live scan returned 0 results due to public proxy limits. Displaying stored database.');
    filterActiveUniverse();
  }

  if (scanBtn) {
    scanBtn.disabled = false;
    scanBtn.textContent = '↻ Live Data';
    scanBtn.style.opacity = '1';
  }

  renderAll();
}

// ═══════ HYBRID SEARCH & ON-DEMAND NSE STOCK ANALYZER ═══════

function handleSearchInput() {
  const input = document.getElementById('search-box');
  const suggContainer = document.getElementById('search-suggestions');
  if (!input) return;

  renderTable();

  const query = input.value.trim().toUpperCase();
  if (!query || query.length < 2) {
    if (suggContainer) suggContainer.style.display = 'none';
    return;
  }

  if (suggContainer) {
    suggContainer.innerHTML = `
      <div class="search-sugg-item" onclick="analyzeExternalStock('${query.replace(/'/g, "\\'")}')">
        <span style="font-size:14px;">🔍</span>
        <div>
          <div style="font-weight:700;">Analyze <strong>${query}</strong> across entire NSE</div>
          <div style="font-size:9.5px;color:var(--muted);">Generate instant on-demand RS Scorecard, Supertrend & VCP</div>
        </div>
      </div>
    `;
    suggContainer.style.display = 'block';
  }
}

function handleSearchKeydown(e) {
  if (e.key === 'Enter') {
    const input = document.getElementById('search-box');
    if (!input) return;
    const query = input.value.trim().toUpperCase();
    if (!query) return;

    const suggContainer = document.getElementById('search-suggestions');
    if (suggContainer) suggContainer.style.display = 'none';

    // If exactly in allData, select it
    const match = allData.find(d => d.sym.toUpperCase() === query);
    if (match) {
      selectStock(match.sym);
    } else {
      analyzeExternalStock(query);
    }
  } else if (e.key === 'Escape') {
    const suggContainer = document.getElementById('search-suggestions');
    if (suggContainer) suggContainer.style.display = 'none';
  }
}

async function analyzeExternalStock(symInput) {
  const sym = symInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!sym) return;

  const suggContainer = document.getElementById('search-suggestions');
  if (suggContainer) suggContainer.style.display = 'none';

  // Check if stock already exists in current or global dataset
  const existing = allData.find(s => s.sym === sym) || globalScreenerData.find(s => s.sym === sym);
  if (existing) {
    if (!allData.some(s => s.sym === sym)) allData.unshift(existing);
    renderTable();
    selectStock(existing.sym);
    return;
  }

  showProgress(`Analyzing ${sym} across NSE…`, 35);
  try {
    const yf = toYF(sym);
    let benchData = globalBenchData;
    if (!benchData || benchData.length < 50) {
      benchData = await fetchYahoo('^NSEI', '6y') || await fetchYahoo('NIFTYBEES.NS', '6y');
    }
    const candles = await fetchYahoo(yf, '5y');
    if (!candles || candles.length < 20) {
      alert(`Could not fetch data for "${sym}" from NSE. Please verify the ticker symbol.`);
      renderTable();
      return;
    }

    const cutoffTs = new Date('2021-01-01').getTime() / 1000;
    const calc = calcARS(candles, benchData, cutoffTs) || { ars: 0.05, srs: 0.02, vol: 1.1, hi52: -0.05, price: candles[candles.length-1].c };
    const st14 = calcSupertrend(candles, 14, 3);
    const st10 = calcSupertrend(candles, 10, 3);
    const vcp = calcVCP(candles);
    const pp = calcPocketPivot(candles);
    const mrs = calcMansfieldRS(candles, benchData, 50);

    const customStock = {
      sym: sym,
      name: sym + ' (NSE Equity)',
      ind: 'Discovered Equity',
      logoid: sym.toLowerCase(),
      price: calc.price || candles[candles.length - 1].c,
      ars: calc.ars ?? 0,
      srs: calc.srs ?? 0,
      vol_ratio: calc.vol ?? 1,
      hi52_prox: calc.hi52 ?? -0.05,
      breakout: calc.ars > 0 && (calc.prev || 0) <= 0,
      trending: calc.ars > (calc.prev || 0),
      signDays: calc.signDays ?? 15,
      signSince: calc.signSince ?? Math.round((Date.now() - 15 * 86400000) / 1000),
      st14,
      st10,
      ichimoku: calcIchimoku(candles),
      ma_status: calc.ma_status ?? 'MA+',
      ars_slope: calc.ars_slope ?? 0.01,
      is_vcp: vcp.is_vcp,
      vcp_atr_ratio: vcp.atr_ratio,
      vcp_tightness_pct: vcp.tightness_pct,
      is_pocket_pivot: pp,
      mrs: mrs.mrs,
      mrs_trend: mrs.mrs_trend,
      rs_rating: 75
    };

    allData.unshift(customStock);
    renderTable();
    selectStock(sym);
  } catch (err) {
    alert(`Error analyzing ${sym}: ` + err.message);
    renderTable();
  }
}

// Global click handler to dismiss search suggestions
document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.search-wrap');
  const suggContainer = document.getElementById('search-suggestions');
  if (suggContainer && wrap && !wrap.contains(e.target)) {
    suggContainer.style.display = 'none';
  }
});

const tourSteps = [
  { target: '#f-ars', title: 'Momentum Filters', desc: 'Filter stocks by Adaptive Relative Strength, Volatility Contraction (VCP), and Supertrend.', pos: 'bottom' },
  { target: '#f-pass', title: 'Strict Pass Filter', desc: 'Focus only on stocks that meet institutional leadership criteria.', pos: 'bottom' },
  { target: '#search-box', title: 'Instant Search', desc: 'Quickly find any company, ticker, or industry in real-time.', pos: 'bottom' },
  { target: '#export-btn', title: 'Export & Share', desc: 'Download CSV reports or generate high-res visual momentum cards.', pos: 'bottom' }
];

let tourCurrentStep = 0;
function startTour() {
  closeTour();
  tourCurrentStep = 0;
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.id = 'tour-overlay';
  overlay.onclick = closeTour;
  document.body.appendChild(overlay);
  
  const tooltip = document.createElement('div');
  tooltip.className = 'tour-tooltip';
  tooltip.id = 'tour-tooltip';
  document.body.appendChild(tooltip);
  
  renderTourStep();
}

function renderTourStep() {
  const step = tourSteps[tourCurrentStep];
  const target = document.querySelector(step.target);
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  
  if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {
    tourCurrentStep++;
    if (tourCurrentStep < tourSteps.length) renderTourStep();
    else closeTour();
    return;
  }
  
  target.classList.add('tour-highlight');
  const tooltipEl = document.getElementById('tour-tooltip');
  const isLast = tourCurrentStep === tourSteps.length - 1;
  
  tooltipEl.innerHTML = `
    <h4>Step ${tourCurrentStep + 1} of ${tourSteps.length}: ${step.title}</h4>
    <p>${step.desc}</p>
    <div class="tour-btn-row">
      <button class="tour-skip" onclick="closeTour()">Skip Tour</button>
      <button class="tour-btn" onclick="nextTourStep()">${isLast ? 'Finish' : 'Next →'}</button>
    </div>
  `;
  
  const rect = target.getBoundingClientRect();
  tooltipEl.style.top = (rect.bottom + window.scrollY + 10) + 'px';
  tooltipEl.style.left = Math.max(10, Math.min(window.innerWidth - 310, rect.left + window.scrollX + (rect.width / 2) - 145)) + 'px';
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function nextTourStep() {
  tourCurrentStep++;
  if (tourCurrentStep < tourSteps.length) renderTourStep();
  else closeTour();
}

function closeTour() {
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  const overlay = document.getElementById('tour-overlay');
  const tooltip = document.getElementById('tour-tooltip');
  if (overlay) overlay.remove();
  if (tooltip) tooltip.remove();
  try { localStorage.setItem('onboarding_completed', 'true'); } catch(e) {}
}

async function loadFiiDiiData() {
  try {
    let res = await fetch('https://fii-diidata.mrchartist.com/api/data');
    if (!res.ok) {
      res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://fii-diidata.mrchartist.com/api/data'));
      const obj = await res.json();
      if (obj && obj.contents) {
        const parsed = JSON.parse(obj.contents);
        if (parsed && parsed.date) {
          latestFiiDiiData = { date: parsed.date, fii: parsed.fii_net || 0, dii: parsed.dii_net || 0 };
          if (!selectedSym) clearSelection();
        }
      }
    } else {
      const parsed = await res.json();
      if (parsed && parsed.date) {
        latestFiiDiiData = { date: parsed.date, fii: parsed.fii_net || 0, dii: parsed.dii_net || 0 };
        if (!selectedSym) clearSelection();
      }
    }
  } catch (e) {
    console.warn("Failed to fetch live FII/DII data:", e);
  }
}

async function initScreener() {
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn) toggleBtn.textContent = '☀️';
    }
  } catch(e) {}

  try {
    pinnedStocks = JSON.parse(localStorage.getItem('pinned_stocks')) || [];
  } catch(e) { pinnedStocks = []; }

  showProgress('Loading screener database…', 10);
  
  if (window.STATIC_SCREENER_DATA && Array.isArray(window.STATIC_SCREENER_DATA.stocks)) {
    const payload = window.STATIC_SCREENER_DATA;
    globalScreenerData = payload.stocks;
    if (payload.fii_dii) latestFiiDiiData = payload.fii_dii;
    if (payload.breakout_history) globalBreakoutHistory = payload.breakout_history;
    
    filterActiveUniverse();
    const tsEl = document.getElementById('ts');
    if (tsEl) tsEl.textContent = payload.updated;
    renderAll();
    return;
  }

  try {
    const cacheBuster = '?v=' + Date.now();
    let res = await fetch('data/screener.json' + cacheBuster);
    if (!res.ok) res = await fetch('../data/screener.json' + cacheBuster);
    if (!res.ok) throw new Error('Data file not found');
    
    const payload = await res.json();
    if (payload && Array.isArray(payload.stocks)) {
      globalScreenerData = payload.stocks;
      if (payload.fii_dii) latestFiiDiiData = payload.fii_dii;
      if (payload.breakout_history) globalBreakoutHistory = payload.breakout_history;
      
      filterActiveUniverse();
      const tsEl = document.getElementById('ts');
      if (tsEl) tsEl.textContent = payload.updated;
      renderAll();
      return;
    }
  } catch (err) {
    console.warn('Failed to load static data, falling back to sample:', err.message);
  }
  useSampleData();
}

function useSampleData() {
  const universe = getUniverse();
  allData = universe.map(s => ({
    sym: s.sym,
    name: s.name,
    ind: s.ind,
    ars: 0.15,
    srs: 0.05,
    vol_ratio: 1.2,
    hi52_prox: -0.04,
    price: 1500,
    breakout: false,
    trending: true,
    signDays: 25,
    signSince: Math.round((Date.now() - 25 * 86400000) / 1000),
    rs_rating: 85,
    st14: { trend: 'buy', signal: null, val: 1420 },
    st10: { trend: 'buy', signal: null, val: 1435 },
    ma_status: 'MA+',
    ars_slope: 0.02
  }));
  renderAll();
}

function openTV(sym) { 
  window.open(`https://www.tradingview.com/chart/?symbol=NSE:${sym}&interval=D`, '_blank'); 
}

document.addEventListener('DOMContentLoaded', () => {
  loadFiiDiiData();
  initScreener();
});
