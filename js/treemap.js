/**
 * Adaptive Alpha — Sector Rotation & Heatmap Visualizations
 * Renders Sector Quadrants, RRG Radar Clock, and Market Heatmaps.
 */

let activeHeatmapMetric = '52w';
let activeHeatmapFilter = 'all';

function renderSectorsSkeleton() {
  const items = [];
  for (let i = 0; i < 12; i++) {
    items.push(`
      <div class="sector-card skeleton-card">
        <div class="skeleton sk-text" style="width: 70%; height: 13px;"></div>
        <div class="skeleton sk-text" style="width: 40%; height: 10px; margin-top: 4px;"></div>
        <div class="skeleton sk-text" style="width: 100%; height: 3px; margin-top: 8px; border-radius: 2px;"></div>
      </div>
    `);
  }
  const grid = document.getElementById('sector-grid');
  if (grid) grid.innerHTML = items.join('');
}

function fillColor(pass, total) {
  const r = pass / total;
  if (r >= 0.75) return 'var(--up)';
  if (r >= 0.5)  return '#4db8ac';
  if (r >= 0.25) return 'var(--amber)';
  return 'var(--down)';
}

function renderSectors() {
  if (!allData.length) return;
  const byInd = {};
  allData.forEach(d => { (byInd[d.ind] = byInd[d.ind]||[]).push(d); });
  
  let cardsHtml = '';
  const sectorDots = [];
  const sectorList = Object.keys(byInd).sort();
  
  sectorList.forEach((ind) => {
    const stocks = byInd[ind];
    const pass   = stocks.filter(d => passes(d)).length;
    const total  = stocks.length;
    const pctF   = (pass/total*100).toFixed(0);
    const clr    = fillColor(pass, total);
    const isAct  = activeSector === ind;
    const avgArs = stocks.reduce((s,d)=>s+(d.ars||0),0)/total;
    const avgSrs = stocks.reduce((s,d)=>s+(d.srs||0),0)/total;
    
    let phase = 'LAGGING', phColor = '#ef5350', phBadgeBg = 'rgba(239,83,80,0.15)';
    if (avgArs > 0 && avgSrs > 0) {
      phase = 'LEADING'; phColor = '#0fe586'; phBadgeBg = 'rgba(15,229,134,0.15)';
    } else if (avgArs <= 0 && avgSrs > 0) {
      phase = 'IMPROVING'; phColor = '#5fc4ba'; phBadgeBg = 'rgba(95,196,186,0.15)';
    } else if (avgArs > 0 && avgSrs <= 0) {
      phase = 'WEAKENING'; phColor = '#e3b341'; phBadgeBg = 'rgba(227,179,65,0.15)';
    }
    
    const topStock = [...stocks].sort((a,b) => (b.ars||0) - (a.ars||0))[0];
    const topStockStr = topStock ? `${topStock.sym} (${(topStock.ars*100).toFixed(1)}%)` : '—';

    cardsHtml += `
      <div class="sector-card ${isAct?'active':''}" onclick="toggleSector('${ind.replace(/'/g,"\\'")}')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:12.5px;color:var(--text);">${ind}</strong>
          <span style="color:${phColor};background:${phBadgeBg};padding:2px 8px;border-radius:12px;font-size:9.5px;font-weight:800;font-family:var(--font-num);border:1px solid ${phColor}44;">${phase}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--font-num);background:var(--bg3);padding:6px 8px;border-radius:6px;">
          <div>ARS: <strong style="color:${avgArs>=0?'var(--up)':'var(--down)'}">${(avgArs*100).toFixed(1)}%</strong></div>
          <div>SRS: <strong style="color:${avgSrs>=0?'var(--up)':'var(--down)'}">${(avgSrs*100).toFixed(1)}%</strong></div>
          <div style="color:var(--muted)">${pass}/${total} Pass</div>
        </div>
        <div>
          <div class="sc-bar" style="height:4px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden;"><div class="sc-fill" style="width:${pctF}%;height:100%;background:${clr}"></div></div>
        </div>
        <div style="font-size:9.5px;color:var(--muted-lt);display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
          <span>Top Leader:</span>
          <strong style="color:var(--text);font-family:var(--font-num);background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">${topStockStr}</strong>
        </div>
      </div>
    `;

    const normX = Math.max(-0.25, Math.min(0.25, avgArs));
    const normY = Math.max(-0.12, Math.min(0.12, avgSrs));
    const cx = 250 + (normX / 0.25) * 190;
    const cy = 190 - (normY / 0.12) * 140;

    const shortName = ind.length > 12 ? ind.substring(0, 10) + '..' : ind;
    const textY = cy < 60 ? cy + 14 : cy - 8;

    sectorDots.push(`
      <g class="rrg-group" onclick="toggleSector('${ind.replace(/'/g,"\\'")}')" style="cursor:pointer;"
         onmouseover="showRrgTooltip(event, '${ind.replace(/'/g,"\\'")}', ${avgArs.toFixed(3)}, ${avgSrs.toFixed(3)})"
         onmouseout="hideRrgTooltip()">
        <line x1="250" y1="190" x2="${cx}" y2="${cy}" stroke="${phColor}" stroke-width="1.2" opacity="0.3" stroke-dasharray="2,2" />
        <circle cx="${cx}" cy="${cy}" r="11" fill="${phColor}" opacity="0.18" />
        <circle class="rrg-dot" cx="${cx}" cy="${cy}" r="5.5" fill="${phColor}" stroke="#ffffff" stroke-width="1.5" />
        <rect x="${cx - (shortName.length * 3.2)}" y="${textY - 8}" width="${shortName.length * 6.4}" height="11" rx="3" fill="rgba(12,16,24,0.85)" stroke="${phColor}66" stroke-width="0.8" />
        <text class="rrg-label" x="${cx}" y="${textY}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#ffffff">${shortName}</text>
      </g>
    `);
  });
  
  const grid = document.getElementById('sector-grid');
  if (grid) grid.innerHTML = cardsHtml;
  
  const clockHtml = `
    <svg viewBox="0 0 500 380" class="rrg-clock" style="width:100%;height:auto;display:block;">
      <defs>
        <radialGradient id="quad_lead_glow" cx="80%" cy="20%" r="60%">
          <stop offset="0%" stop-color="#0fe586" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#0fe586" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="quad_imp_glow" cx="20%" cy="20%" r="60%">
          <stop offset="0%" stop-color="#5fc4ba" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#5fc4ba" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="quad_weak_glow" cx="80%" cy="80%" r="60%">
          <stop offset="0%" stop-color="#e3b341" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#e3b341" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="quad_lag_glow" cx="20%" cy="80%" r="60%">
          <stop offset="0%" stop-color="#ef5350" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#ef5350" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect x="250" y="0" width="250" height="190" fill="url(#quad_lead_glow)" />
      <rect x="0" y="0" width="250" height="190" fill="url(#quad_imp_glow)" />
      <rect x="250" y="190" width="250" height="190" fill="url(#quad_weak_glow)" />
      <rect x="0" y="190" width="250" height="190" fill="url(#quad_lag_glow)" />

      <line x1="20" y1="190" x2="480" y2="190" stroke="#2a3346" stroke-width="1.2" stroke-dasharray="3,3" />
      <line x1="250" y1="15" x2="250" y2="365" stroke="#2a3346" stroke-width="1.2" stroke-dasharray="3,3" />

      <circle cx="250" cy="190" r="100" fill="none" stroke="#2a3346" stroke-width="1" stroke-dasharray="2,4" opacity="0.4" />
      <circle cx="250" cy="190" r="170" fill="none" stroke="#2a3346" stroke-width="1" stroke-dasharray="2,4" opacity="0.25" />

      <text x="475" y="28" text-anchor="end" font-size="11" font-weight="900" fill="#0fe586" letter-spacing="1">LEADING ↗</text>
      <text x="25" y="28" text-anchor="start" font-size="11" font-weight="900" fill="#5fc4ba" letter-spacing="1">↖ IMPROVING</text>
      <text x="25" y="360" text-anchor="start" font-size="11" font-weight="900" fill="#ef5350" letter-spacing="1">↙ LAGGING</text>
      <text x="475" y="360" text-anchor="end" font-size="11" font-weight="900" fill="#e3b341" letter-spacing="1">WEAKENING ↘</text>

      <text x="480" y="185" text-anchor="end" font-size="9" font-family="var(--font-num)" fill="#8a93a6">ARS Ratio (Long-term) →</text>
      <text x="256" y="22" text-anchor="start" font-size="9" font-family="var(--font-num)" fill="#8a93a6">↑ SRS (63D)</text>
      <text x="250" y="194" text-anchor="middle" font-size="8" font-family="var(--font-sans)" font-weight="700" fill="#4a5568">NIFTY BENCHMARK</text>

      ${sectorDots.join('')}
    </svg>
  `;
  
  const clockContainer = document.getElementById('rrg-clock-container');
  if (clockContainer) clockContainer.innerHTML = clockHtml;
}

function showRrgTooltip(evt, ind, ars, srs) {
  const tt = document.getElementById('rrg-tooltip');
  if (!tt) return;
  tt.innerHTML = `
    <div style="font-weight:800;color:#ffffff;margin-bottom:3px;font-size:12px;">${ind}</div>
    <div style="font-family:var(--font-num);font-size:10.5px;">ARS: <span style="color:${ars>=0?'var(--up)':'var(--down)'};font-weight:700;">${(ars*100).toFixed(1)}%</span></div>
    <div style="font-family:var(--font-num);font-size:10.5px;">SRS: <span style="color:${srs>=0?'var(--up)':'var(--down)'};font-weight:700;">${(srs*100).toFixed(1)}%</span></div>
    <div style="font-size:9px;color:var(--muted);margin-top:4px;">Click to filter table by this sector</div>
  `;
  tt.style.display = 'block';
  tt.style.left = (evt.pageX + 12) + 'px';
  tt.style.top = (evt.pageY - 28) + 'px';
}

function hideRrgTooltip() {
  const tt = document.getElementById('rrg-tooltip');
  if (tt) tt.style.display = 'none';
}

function setHeatmapMetric(metric) {
  activeHeatmapMetric = metric;
  document.querySelectorAll('.hm-filter-btn[id^="hm-metric-"]').forEach(btn => {
    btn.classList.toggle('active', btn.id === `hm-metric-${metric}`);
  });
  renderHeatmapTab();
}

function setHeatmapFilter(filterKey) {
  activeHeatmapFilter = filterKey;
  document.querySelectorAll('.hm-filter-btn[id^="hm-filter-"]').forEach(btn => {
    btn.classList.toggle('active', btn.id === `hm-filter-${filterKey}`);
  });
  renderHeatmapTab();
}

function renderHeatmapTab() {
  const container = document.getElementById('heatmap-grid');
  const legendContainer = document.getElementById('heatmap-legend');
  if (!container) return;

  if (allData.length === 0) {
    container.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center">Loading heatmap data…</div>';
    return;
  }

  let data = [...allData];

  if (activeHeatmapFilter === 'near52w') {
    data = data.filter(d => (d.hi52_prox ?? -1) >= -0.05);
  } else if (activeHeatmapFilter === 'quad1') {
    data = data.filter(d => getDualRSQuad(d) === 'quad-1');
  } else if (activeHeatmapFilter === 'pos') {
    data = data.filter(d => (d.ars ?? -1) > 0);
  }

  if (activeHeatmapMetric === '52w') {
    data.sort((a, b) => (b.hi52_prox ?? -1) - (a.hi52_prox ?? -1));
  } else if (activeHeatmapMetric === 'ars') {
    data.sort((a, b) => (b.ars ?? -1) - (a.ars ?? -1));
  } else if (activeHeatmapMetric === 'vol') {
    data.sort((a, b) => (b.vol_ratio ?? 0) - (a.vol_ratio ?? 0));
  }

  container.innerHTML = data.map(d => {
    let bgGradient = 'linear-gradient(135deg, #1f2937, #111827)';
    let valText = '';
    let pillBg = 'rgba(0,0,0,0.35)';
    let pillBorder = 'rgba(255,255,255,0.15)';

    if (activeHeatmapMetric === '52w') {
      const val = d.hi52_prox ?? -0.5;
      valText = (val >= 0 ? '+' : '') + (val * 100).toFixed(1) + '%';
      if (val >= -0.02) {
        bgGradient = 'linear-gradient(135deg, #0d3822, #062013)';
        pillBg = 'rgba(15,229,134,0.2)';
        pillBorder = 'rgba(15,229,134,0.4)';
      } else if (val >= -0.05) {
        bgGradient = 'linear-gradient(135deg, #0f402c, #09281b)';
        pillBg = 'rgba(38,166,154,0.2)';
        pillBorder = 'rgba(38,166,154,0.4)';
      } else if (val >= -0.10) {
        bgGradient = 'linear-gradient(135deg, #12384a, #0b2430)';
        pillBg = 'rgba(94,150,255,0.2)';
        pillBorder = 'rgba(94,150,255,0.4)';
      } else if (val >= -0.20) {
        bgGradient = 'linear-gradient(135deg, #422d0c, #2b1d07)';
        pillBg = 'rgba(227,179,65,0.2)';
        pillBorder = 'rgba(227,179,65,0.4)';
      } else {
        bgGradient = 'linear-gradient(135deg, #451619, #290d0f)';
        pillBg = 'rgba(239,83,80,0.2)';
        pillBorder = 'rgba(239,83,80,0.4)';
      }
    } else if (activeHeatmapMetric === 'ars') {
      const val = d.ars ?? 0;
      valText = (val >= 0 ? '+' : '') + (val * 100).toFixed(1) + '% ARS';
      if (val >= 0.20) {
        bgGradient = 'linear-gradient(135deg, #0d3822, #062013)';
        pillBg = 'rgba(15,229,134,0.2)';
      } else if (val >= 0.05) {
        bgGradient = 'linear-gradient(135deg, #0f402c, #09281b)';
        pillBg = 'rgba(38,166,154,0.2)';
      } else if (val >= 0) {
        bgGradient = 'linear-gradient(135deg, #12384a, #0b2430)';
        pillBg = 'rgba(94,150,255,0.2)';
      } else {
        bgGradient = 'linear-gradient(135deg, #451619, #290d0f)';
        pillBg = 'rgba(239,83,80,0.2)';
      }
    } else if (activeHeatmapMetric === 'vol') {
      const val = d.vol_ratio ?? 1;
      valText = val.toFixed(2) + '× Vol';
      if (val >= 3.0) {
        bgGradient = 'linear-gradient(135deg, #422d0c, #261703)';
        pillBg = 'rgba(227,179,65,0.25)';
        pillBorder = 'rgba(227,179,65,0.5)';
      } else if (val >= 2.0) {
        bgGradient = 'linear-gradient(135deg, #142850, #0c1a36)';
        pillBg = 'rgba(94,150,255,0.25)';
      } else if (val >= 1.2) {
        bgGradient = 'linear-gradient(135deg, #0f402c, #09281b)';
        pillBg = 'rgba(38,166,154,0.2)';
      } else {
        bgGradient = 'linear-gradient(135deg, #1f2937, #111827)';
      }
    }

    const priceFormatted = (d.price && d.price > 0) ? `₹${d.price.toLocaleString('en-IN', {maximumFractionDigits:1})}` : '—';
    const cleanInd = (d.ind || 'Equities').replace('Financial Services', 'Financials').replace('Consumer Services', 'Retail');

    return `
      <div class="hm-cell" style="background:${bgGradient}" onclick="selectStock('${d.sym}')" title="${d.name} (${d.ind}): Click to open detailed chart & scorecard">
        <div class="hm-top">
          <span class="hm-sym">${d.sym}</span>
          <span class="hm-price">${priceFormatted}</span>
        </div>
        <div class="hm-ind">${cleanInd}</div>
        <div class="hm-val-pill" style="background:${pillBg};border-color:${pillBorder}">${valText}</div>
      </div>
    `;
  }).join('');

  if (legendContainer) {
    if (activeHeatmapMetric === '52w') {
      legendContainer.innerHTML = `
        <div class="hm-leg"><div class="hm-dot" style="background:#0fe586"></div>&gt; -2% (Near High)</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#26a69a"></div>-5%</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#5e96ff"></div>-10%</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#e3b341"></div>-20%</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#ef5350"></div>&lt; -20% (Drawdown)</div>
        <span style="margin-left:auto;color:var(--muted);font-size:10px">Showing ${data.length} stocks · Click any tile to inspect</span>
      `;
    } else if (activeHeatmapMetric === 'ars') {
      legendContainer.innerHTML = `
        <div class="hm-leg"><div class="hm-dot" style="background:#0fe586"></div>&gt; +20% Alpha</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#26a69a"></div>+5% to +20%</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#5e96ff"></div>0% to +5%</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#ef5350"></div>&lt; 0% (Lagging)</div>
        <span style="margin-left:auto;color:var(--muted);font-size:10px">Showing ${data.length} stocks · Click any tile to inspect</span>
      `;
    } else {
      legendContainer.innerHTML = `
        <div class="hm-leg"><div class="hm-dot" style="background:#e3b341"></div>&ge; 3.0× Volume Spurt 🔥</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#5e96ff"></div>&ge; 2.0× Institutional Surge</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#26a69a"></div>&ge; 1.2× Above Average</div>
        <div class="hm-leg"><div class="hm-dot" style="background:#4b5563"></div>&lt; 1.2× Normal</div>
        <span style="margin-left:auto;color:var(--muted);font-size:10px">Showing ${data.length} stocks · Click any tile to inspect</span>
      `;
    }
  }
}
