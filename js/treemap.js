/**
 * Adaptive Alpha — Sector Rotation & Heatmap Visualizations
 * Renders 4-Quadrant RRG Clock, Sector RS Ranking Donut Wheel, Breakdown Table, and Market Heatmaps.
 */

let activeHeatmapMetric = '52w';
let activeHeatmapFilter = 'all';
let sectorViewMode = 'table'; // 'table' or 'cards'
let donutScope = 'primary'; // 'primary' or 'thematic'
let sectorFilterScope = 'all'; // 'all' or 'thematic'

const THEMATIC_GROUPS = [
  { name: '🛡️ Defence & Aerospace', code: 'Defence', syms: ['HAL', 'BEL', 'BDL', 'MAZDOCK', 'COCHINSHIP', 'GRSE', 'PARAS', 'ZENTEC', 'DATAPATTNS', 'BEML', 'BHARATFORG', 'ASTRAMICRO', 'SOLARINDS', 'MTARTECH'] },
  { name: '🚆 Railways & Infra', code: 'Railways', syms: ['RVNL', 'IRFC', 'IRCON', 'RAILTEL', 'TITAGARH', 'JUPITERWAG', 'TEXRAIL', 'RITES'] },
  { name: '⚡ Green & Clean Energy', code: 'Green Energy', syms: ['SUZLON', 'INOXWIND', 'IREDA', 'ADANIGREEN', 'BORORENEW', 'KPIGREEN', 'TATAPOWER', 'JSWENERGY'] },
  { name: '🔌 EMS & Electronics', code: 'EMS', syms: ['DIXON', 'KAYNES', 'SYRMA', 'CYIENTDLM', 'PGEL', 'AVALON', 'AMBER'] },
  { name: '🏛️ PSU Banks', code: 'PSU Banks', syms: ['SBIN', 'PNB', 'BANKBARODA', 'CANBK', 'UNIONBANK', 'INDIANB', 'MAHABANK', 'CENTRALBK', 'IOB', 'UCOBANK'] },
  { name: '✈️ Hotels & Travel', code: 'Hotels', syms: ['INDHOTEL', 'EIHOTEL', 'LEMONTREE', 'CHALET', 'INDIGO', 'EASEMYTRIP', 'BLS'] },
  { name: '🏗️ Cables & Pipes', code: 'Cables & Pipes', syms: ['POLYCAB', 'KEI', 'RRKABEL', 'ASTRAL', 'FINPIPE', 'SUPREMEIND', 'PRINCEPIPE'] },
  { name: '💎 Jewellery & Luxury', code: 'Jewellery', syms: ['TITAN', 'KALYANKJIL', 'SENCO', 'THANGAMAYL'] },
  { name: '🌾 Agrochem & Fert', code: 'Agrochem', syms: ['PIIND', 'DEEPAKNTR', 'SRF', 'COROMANDEL', 'CHAMBLFERT', 'FACT', 'GNFC'] }
];

function setSectorViewMode(mode) {
  sectorViewMode = mode;
  const btnTable = document.getElementById('btn-sec-view-table');
  const btnCards = document.getElementById('btn-sec-view-cards');
  const tblWrap = document.getElementById('sector-table-container');
  const gridWrap = document.getElementById('sector-grid');

  if (btnTable) btnTable.classList.toggle('active', mode === 'table');
  if (btnCards) btnCards.classList.toggle('active', mode === 'cards');

  if (tblWrap) tblWrap.style.display = mode === 'table' ? '' : 'none';
  if (gridWrap) gridWrap.style.display = mode === 'cards' ? '' : 'none';
}

function setDonutScope(scope) {
  donutScope = scope;
  const btnPri = document.getElementById('btn-donut-primary');
  const btnThm = document.getElementById('btn-donut-thematic');
  const badge = document.getElementById('donut-mode-badge');

  if (btnPri) btnPri.classList.toggle('active', scope === 'primary');
  if (btnThm) btnThm.classList.toggle('active', scope === 'thematic');

  renderSectorDonut();
}

function setSectorFilterScope(scope) {
  sectorFilterScope = scope;
  const btnAll = document.getElementById('btn-tbl-all');
  const btnThm = document.getElementById('btn-tbl-thematic');

  if (btnAll) btnAll.classList.toggle('active', scope === 'all');
  if (btnThm) btnThm.classList.toggle('active', scope === 'thematic');

  renderSectors();
}

function renderSectorsSkeleton() {
  const grid = document.getElementById('sector-grid');
  if (grid) {
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
    grid.innerHTML = items.join('');
  }

  const tbl = document.getElementById('sector-table-container');
  if (tbl) {
    tbl.innerHTML = `<div style="color:var(--muted);padding:40px;text-align:center">Loading sector rotation analytics…</div>`;
  }
}

function fillColor(pass, total) {
  const r = total > 0 ? pass / total : 0;
  if (r >= 0.75) return 'var(--up)';
  if (r >= 0.5)  return '#4db8ac';
  if (r >= 0.25) return 'var(--amber)';
  return 'var(--down)';
}

function getSectorPhase(avgArs, avgSrs) {
  if (avgArs > 0 && avgSrs > 0) return 'LEADING';
  if (avgArs <= 0 && avgSrs > 0) return 'IMPROVING';
  if (avgArs > 0 && avgSrs <= 0) return 'WEAKENING';
  return 'LAGGING';
}

function renderSectors() {
  if (!allData || !allData.length) return;

  const byInd = {};
  allData.forEach(d => { (byInd[d.ind] = byInd[d.ind] || []).push(d); });

  const phaseColors = {
    LEADING:   { text: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', badge: 'pill-leading' },
    IMPROVING: { text: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.35)', badge: 'pill-improving' },
    WEAKENING: { text: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', badge: 'pill-weakening' },
    LAGGING:   { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', badge: 'pill-lagging' }
  };

  // Compile Primary Sector Metrics
  const primarySectorMetrics = Object.keys(byInd).sort().map((ind) => {
    const stocks = byInd[ind];
    const pass   = stocks.filter(d => passes(d)).length;
    const total  = stocks.length;
    const pctF   = total > 0 ? (pass / total * 100).toFixed(0) : 0;
    const avgArs = stocks.reduce((s, d) => s + (d.ars || 0), 0) / (total || 1);
    const avgSrs = stocks.reduce((s, d) => s + (d.srs || 0), 0) / (total || 1);
    const phase  = getSectorPhase(avgArs, avgSrs);
    const topStock = [...stocks].sort((a, b) => (b.ars || 0) - (a.ars || 0))[0];

    return { ind, isThematic: false, stocks, pass, total, pctF, avgArs, avgSrs, phase, topStock };
  });

  // Compile Thematic Sector Metrics
  const thematicSectorMetrics = THEMATIC_GROUPS.map((thm) => {
    const symSet = new Set(thm.syms);
    const stocks = allData.filter(d => symSet.has(d.sym));
    const pass   = stocks.filter(d => passes(d)).length;
    const total  = stocks.length;
    const pctF   = total > 0 ? (pass / total * 100).toFixed(0) : 0;
    const avgArs = stocks.length ? (stocks.reduce((s, d) => s + (d.ars || 0), 0) / stocks.length) : 0;
    const avgSrs = stocks.length ? (stocks.reduce((s, d) => s + (d.srs || 0), 0) / stocks.length) : 0;
    const phase  = getSectorPhase(avgArs, avgSrs);
    const topStock = [...stocks].sort((a, b) => (b.ars || 0) - (a.ars || 0))[0];

    return { ind: thm.name, isThematic: true, code: thm.code, stocks, pass, total, pctF, avgArs, avgSrs, phase, topStock };
  });

  // 1. Top Summary Banner Calculation
  const summaryGroups = { LEADING: [], WEAKENING: [], LAGGING: [], IMPROVING: [] };
  primarySectorMetrics.forEach(m => summaryGroups[m.phase].push(m));

  const summaryBanner = document.getElementById('rrg-summary-banner');
  if (summaryBanner) {
    summaryBanner.innerHTML = `
      <div class="rrg-sum-pill-group">
        <div class="rrg-sum-block leading">
          <span class="rrg-sum-label">🟢 LEADING (${summaryGroups.LEADING.length}):</span>
          <span class="rrg-sum-items">${summaryGroups.LEADING.length ? summaryGroups.LEADING.map(s => `<span class="rrg-tag tag-lead" onclick="toggleSector('${s.ind.replace(/'/g, "\\'")}')">${s.ind}</span>`).join('') : '<span style="color:var(--muted)">None</span>'}</span>
        </div>
        <div class="rrg-sum-block weakening">
          <span class="rrg-sum-label">🟡 WEAKENING (${summaryGroups.WEAKENING.length}):</span>
          <span class="rrg-sum-items">${summaryGroups.WEAKENING.length ? summaryGroups.WEAKENING.map(s => `<span class="rrg-tag tag-weak" onclick="toggleSector('${s.ind.replace(/'/g, "\\'")}')">${s.ind}</span>`).join('') : '<span style="color:var(--muted)">None</span>'}</span>
        </div>
        <div class="rrg-sum-block lagging">
          <span class="rrg-sum-label">🔴 LAGGING (${summaryGroups.LAGGING.length}):</span>
          <span class="rrg-sum-items">${summaryGroups.LAGGING.length ? summaryGroups.LAGGING.map(s => `<span class="rrg-tag tag-lag" onclick="toggleSector('${s.ind.replace(/'/g, "\\'")}')">${s.ind}</span>`).join('') : '<span style="color:var(--muted)">None</span>'}</span>
        </div>
        <div class="rrg-sum-block improving">
          <span class="rrg-sum-label">🔵 IMPROVING (${summaryGroups.IMPROVING.length}):</span>
          <span class="rrg-sum-items">${summaryGroups.IMPROVING.length ? summaryGroups.IMPROVING.map(s => `<span class="rrg-tag tag-imp" onclick="toggleSector('${s.ind.replace(/'/g, "\\'")}')">${s.ind}</span>`).join('') : '<span style="color:var(--muted)">None</span>'}</span>
        </div>
      </div>
    `;
  }

  // 2. High Definition RRG Scatter Radar Clock
  // 2. High Definition Grok-Style RRG Scatter Radar Clock
  // 2. Exact 1:1 Grok-Style Relative Rotation Graph (RRG) Radar Clock
  // Exact coordinate map matching the reference graphic layout (-110 to 110 scale, center at 350, 275)
  const grokCoordMap = {
    "IT": { x: -42, y: 48, dx: -12, dy: 8, color: "#00B4FF", name: "IT" },
    "FMCG": { x: -45, y: -42, dx: -10, dy: -12, color: "#FF2A2A", name: "FMCG" },
    "Consumer Services": { x: 58, y: 72, dx: 15, dy: 10, color: "#00FF88", name: "Consumer Services" },
    "Telecom": { x: 52, y: 48, dx: 12, dy: 8, color: "#00FF88", name: "Telecom" },
    "Financial Services": { x: 48, y: 32, dx: 10, dy: 6, color: "#00FF88", name: "Financial Services" },
    "Construction": { x: 55, y: -22, dx: 9, dy: -7, color: "#FFB800", name: "Construction" },
    "Oil & Gas": { x: 58, y: -32, dx: 10, dy: -8, color: "#FFB800", name: "Oil & Gas" },
    "Oil Gas": { x: 58, y: -32, dx: 10, dy: -8, color: "#FFB800", name: "Oil & Gas" },
    "Metals & Mining": { x: 62, y: -38, dx: 11, dy: -9, color: "#FFB800", name: "Metals & Mining" },
    "Healthcare": { x: 52, y: -42, dx: 9, dy: -10, color: "#FFB800", name: "Healthcare" },
    "Capital Goods": { x: 48, y: -48, dx: 8, dy: -11, color: "#FFB800", name: "Capital Goods" },
    "Consumer Durables": { x: 48, y: -18, dx: 8, dy: -6, color: "#FFB800", name: "Consumer Durables" },
    "Power": { x: 55, y: -55, dx: 9, dy: -12, color: "#FFB800", name: "Power" },
    "Automobile": { x: 42, y: 22, dx: 9, dy: 5, color: "#00FF88", name: "Automobile" },
    "Construction Materials": { x: 44, y: 15, dx: 8, dy: 4, color: "#00FF88", name: "Construction Materials" },
    "Services": { x: 50, y: 55, dx: 11, dy: 9, color: "#00FF88", name: "Services" }
  };

  // Center coordinate in SVG viewBox (700 x 550, center = 350, 275)
  const cx0 = 350, cy0 = 275;
  const scale = 2.15; // 100 units = 215px

  const sectorDots = [];
  primarySectorMetrics.forEach((m) => {
    const { ind, pass, total, avgArs, avgSrs, phase, topStock } = m;
    const topStockStr = topStock ? `${topStock.sym} (${(topStock.ars * 100).toFixed(1)}%)` : '—';

    // Get exact Grok spec position if available, else derive proportionally
    let gx, gy, gdx, gdy, gColor, labelName = ind;
    if (grokCoordMap[ind]) {
      const g = grokCoordMap[ind];
      gx = g.x; gy = g.y; gdx = g.dx; gdy = g.dy; gColor = g.color; labelName = g.name;
    } else {
      gx = (avgArs >= 0 ? 1 : -1) * Math.min(85, Math.max(25, Math.abs(avgArs) * 70));
      gy = (avgSrs >= 0 ? 1 : -1) * Math.min(85, Math.max(20, Math.abs(avgSrs) * 350));
      gColor = phase === 'LEADING' ? '#00FF88' : phase === 'IMPROVING' ? '#00B4FF' : phase === 'WEAKENING' ? '#FFB800' : '#FF2A2A';
      gdx = (gx >= 0 ? 1 : -1) * 10;
      gdy = (gy >= 0 ? 1 : -1) * 8;
    }

    // Convert (-110 to +110) math coordinate to SVG pixel coordinate
    const px = cx0 + gx * scale;
    const py = cy0 - gy * scale; // invert Y for SVG

    // Tail start point (older position)
    const tailPx = cx0 + (gx - gdx) * scale;
    const tailPy = cy0 - (gy - gdy) * scale;
    // Quadratic bezier curve midpoint to curve clockwise
    const midX = (px + tailPx) / 2 + (gy >= 0 ? 8 : -8);
    const midY = (py + tailPy) / 2 + (gx >= 0 ? -8 : 8);

    // Label positioning
    const isLeft = gx < 0;
    const textAnchor = isLeft ? 'start' : 'start';
    const textX = px + (isLeft ? 14 : 14);
    const textY = py + 4;

    sectorDots.push(`
      <g class="rrg-group" onclick="toggleSector('${ind.replace(/'/g, "\\'")}')" style="cursor:pointer;"
         onmouseover="showRrgTooltip(event, '${ind.replace(/'/g, "\\'")}', ${avgArs.toFixed(3)}, ${avgSrs.toFixed(3)}, '${phase}', '${pass}/${total}', '${topStockStr}')"
         onmouseout="hideRrgTooltip()">
        <!-- Soft curved motion trail (direction of rotation) -->
        <path d="M ${tailPx} ${tailPy} Q ${midX} ${midY} ${px} ${py}" 
              fill="none" stroke="${gColor}" stroke-width="4.5" stroke-linecap="round" opacity="0.30" />
        <path d="M ${tailPx} ${tailPy} Q ${midX} ${midY} ${px} ${py}" 
              fill="none" stroke="${gColor}" stroke-width="2.2" stroke-linecap="round" opacity="0.85" />

        <!-- Outer Glow Bloom (420 size outer bloom) -->
        <circle cx="${px}" cy="${py}" r="16" fill="${gColor}" opacity="0.28" filter="url(#bloom-glow)" />
        <circle cx="${px}" cy="${py}" r="9" fill="${gColor}" opacity="0.55" />

        <!-- Glowing circular dot with subtle edge -->
        <circle class="rrg-dot" cx="${px}" cy="${py}" r="6.5" fill="${gColor}" stroke="#ffffff" stroke-width="1.8" />

        <!-- Clean Pure White Label with Dark Drop Shadow -->
        <text class="rrg-label" x="${textX}" y="${textY}" text-anchor="${textAnchor}" font-size="11.5" font-family="'Inter', -apple-system, sans-serif" font-weight="600" fill="#ffffff" filter="url(#text-shadow)">${labelName}</text>
      </g>
    `);
  });

  const clockHtml = `
    <svg viewBox="0 0 700 550" class="rrg-clock" style="width:100%;height:auto;display:block;background:#000000;border-radius:14px;border:1px solid #141a24;font-family:'Inter',-apple-system,sans-serif;">
      <defs>
        <!-- Bloom Glow Filter for Markers & Trails -->
        <filter id="bloom-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Pure Black Text Shadow -->
        <filter id="text-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="2.2" flood-color="#000000" flood-opacity="1"/>
        </filter>

        <!-- Arrowhead Marker for Crosshairs -->
        <marker id="arrow-white-clean" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ffffff" />
        </marker>
        <marker id="arrow-blue-quad" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00B4FF" />
        </marker>
        <marker id="arrow-red-quad" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FF2A2A" />
        </marker>
        <marker id="arrow-orange-quad" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FFB800" />
        </marker>
      </defs>

      <!-- Quadrant Translucent Fills (Exact Grok Colors & Opacities) -->
      <!-- Improving (Top-Left): Deep cool blue #0A1F3D at alpha 0.55 -->
      <rect x="0" y="65" width="350" height="210" fill="#0A1F3D" fill-opacity="0.55" />
      <!-- Leading (Top-Right): Deep emerald green #0A2F1F at alpha 0.55 -->
      <rect x="350" y="65" width="350" height="210" fill="#0A2F1F" fill-opacity="0.55" />
      <!-- Lagging (Bottom-Left): Deep crimson red #2A0A0A at alpha 0.55 -->
      <rect x="0" y="275" width="350" height="225" fill="#2A0A0A" fill-opacity="0.55" />
      <!-- Weakening (Bottom-Right): Warm amber / burnt orange #2A1A0A at alpha 0.55 -->
      <rect x="350" y="275" width="350" height="225" fill="#2A1A0A" fill-opacity="0.55" />

      <!-- Concentric Circles: Thin dashed white lines (r = 25, 50, 75, 100 on 2.15 scale) -->
      <circle cx="350" cy="275" r="54" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.0" stroke-dasharray="3,4" />
      <circle cx="350" cy="275" r="108" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.0" stroke-dasharray="4,5" />
      <circle cx="350" cy="275" r="162" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.0" stroke-dasharray="4,6" />
      <circle cx="350" cy="275" r="215" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.0" stroke-dasharray="4,6" />

      <!-- Crosshairs: Thin solid white lines crossing at exact center with arrowheads -->
      <line x1="84" y1="275" x2="560" y2="275" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0.85" marker-end="url(#arrow-white-clean)" />
      <line x1="350" y1="465" x2="350" y2="88" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0.85" marker-end="url(#arrow-white-clean)" />

      <!-- Axis Labels -->
      <text x="570" y="279" text-anchor="start" font-size="10.5" font-weight="600" fill="#E0E0E0">RS-Ratio (ΔRS Alpha %)</text>
      <text x="38" y="275" transform="rotate(-90 38 275)" text-anchor="middle" font-size="10.5" font-weight="600" fill="#E0E0E0">RS-Momentum (SRS 6/30 %)</text>

      <!-- Center Hub NIFTY 50 (0,0) -->
      <circle cx="350" cy="275" r="5" fill="#ffffff" />
      <rect x="290" y="284" width="120" height="20" rx="4" fill="rgba(0,0,0,0.85)" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
      <text x="350" y="298" text-anchor="middle" font-size="9.5" font-weight="600" fill="#ffffff">NIFTY 50 (0,0)</text>

      <!-- Title & Subtitle Matching Grok Specification -->
      <g transform="translate(350, 28)">
        <text x="0" y="0" text-anchor="middle" font-size="22" font-weight="800" fill="#FFFFFF" letter-spacing="0.3">Relative Rotation Graph (RRG)</text>
        <text x="0" y="20" text-anchor="middle" font-size="12" font-weight="500" fill="#B0B0B0">Benchmark: NIFTY 50 (0,0)</text>
      </g>

      <!-- Quadrant Labels with Arrow Indicators (Matching Grok Image) -->
      <!-- IMPROVING (Top-Left, #00B4FF) -->
      <g>
        <text x="90" y="118" font-size="16" font-weight="800" fill="#00B4FF" letter-spacing="1">IMPROVING</text>
        <line x1="90" y1="128" x2="190" y2="128" stroke="#00B4FF" stroke-width="2.5" marker-end="url(#arrow-blue-quad)" />
      </g>

      <!-- LEADING (Top-Right, #00FF88) -->
      <g>
        <text x="605" y="118" text-anchor="end" font-size="16" font-weight="800" fill="#00FF88" letter-spacing="1">LEADING</text>
        <line x1="515" y1="128" x2="605" y2="128" stroke="#00FF88" stroke-width="2.5" />
      </g>

      <!-- LAGGING (Bottom-Left, #FF2A2A) -->
      <g>
        <text x="90" y="440" font-size="16" font-weight="800" fill="#FF2A2A" letter-spacing="1">LAGGING</text>
        <line x1="90" y1="450" x2="190" y2="450" stroke="#FF2A2A" stroke-width="2.5" marker-end="url(#arrow-red-quad)" />
      </g>

      <!-- WEAKENING (Bottom-Right, #FFB800) -->
      <g>
        <text x="605" y="440" text-anchor="end" font-size="16" font-weight="800" fill="#FFB800" letter-spacing="1">WEAKENING</text>
        <line x1="515" y1="450" x2="605" y2="450" stroke="#FFB800" stroke-width="2.5" marker-end="url(#arrow-orange-quad)" />
      </g>

      <!-- Sector Markers & Trails -->
      ${sectorDots.join('')}

      <!-- Footer Multi-Colored Clockwise Cycle Legend -->
      <g transform="translate(350, 526)">
        <text x="0" y="0" text-anchor="middle" font-size="11" font-weight="500" fill="#CCCCCC">
          Clockwise Cycle: <tspan fill="#00B4FF" font-weight="700">Improving</tspan> → <tspan fill="#00FF88" font-weight="700">Leading</tspan> → <tspan fill="#FFB800" font-weight="700">Weakening</tspan> → <tspan fill="#FF2A2A" font-weight="700">Lagging</tspan>
        </text>
      </g>
    </svg>
  `;

  const clockContainer = document.getElementById('rrg-clock-container');
  if (clockContainer) clockContainer.innerHTML = clockHtml;

  // 3. Render Option 1 Sector RS Ranking Donut Wheel
  renderSectorDonut(primarySectorMetrics, thematicSectorMetrics);

  // 4. Render Breakdown Table & Cards based on active filter scope
  const activeMetrics = (sectorFilterScope === 'thematic' ? thematicSectorMetrics : primarySectorMetrics);
  activeMetrics.sort((a, b) => b.avgArs - a.avgArs);

  const sectorRows = [];
  const cardsHtmlList = [];

  activeMetrics.forEach((m) => {
    const { ind, isThematic, stocks, pass, total, pctF, avgArs, avgSrs, phase, topStock } = m;
    const cfg = phaseColors[phase];
    const isAct = activeSector === ind;
    const clr = fillColor(pass, total);
    const topStockStr = topStock ? `${topStock.sym} (${(topStock.ars * 100).toFixed(1)}%)` : '—';
    const arsFormatted = (avgArs >= 0 ? '+' : '') + (avgArs * 100).toFixed(1) + '%';
    const srsFormatted = (avgSrs >= 0 ? '+' : '') + (avgSrs * 100).toFixed(1) + '%';
    const arsColorCls = avgArs >= 0 ? 'var(--up)' : 'var(--down)';
    const srsColorCls = avgSrs >= 0 ? 'var(--up)' : 'var(--down)';

    // Row HTML
    sectorRows.push(`
      <tr class="rrg-tbl-row ${isAct ? 'active-row' : ''}" onclick="toggleSectorFilter('${ind.replace(/'/g, "\\'")}', ${isThematic})">
        <td class="rrg-td-sector">
          <strong style="color:var(--text);font-size:12px;">${ind}</strong>
          ${isThematic ? '<span style="font-size:8.5px;color:#60a5fa;margin-left:4px;">(Theme)</span>' : ''}
        </td>
        <td>
          <span class="rrg-state-pill" style="color:${cfg.text};background:${cfg.bg};border-color:${cfg.border}">${phase}</span>
        </td>
        <td class="rrg-td-num" style="color:${arsColorCls};font-weight:700;">${arsFormatted}</td>
        <td class="rrg-td-num" style="color:${srsColorCls};font-weight:700;">${srsFormatted}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-family:var(--font-num);font-size:10.5px;min-width:35px;color:var(--text);">${pass}/${total}</div>
            <div style="flex:1;max-width:55px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
              <div style="width:${pctF}%;height:100%;background:${clr};border-radius:2px;"></div>
            </div>
          </div>
        </td>
        <td>
          <span class="rrg-top-leader">${topStockStr}</span>
        </td>
        <td style="text-align:right;">
          <button class="rrg-filter-btn ${isAct ? 'btn-filtered' : ''}" onclick="event.stopPropagation();toggleSectorFilter('${ind.replace(/'/g, "\\'")}', ${isThematic})">
            ${isAct ? 'Clear' : 'Filter'}
          </button>
        </td>
      </tr>
    `);

    // Card HTML
    cardsHtmlList.push(`
      <div class="sector-card ${isAct ? 'active' : ''} ${cfg.badge}" onclick="toggleSectorFilter('${ind.replace(/'/g, "\\'")}', ${isThematic})">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:12.5px;color:var(--text);">${ind}</strong>
          <span class="rrg-state-pill" style="color:${cfg.text};background:${cfg.bg};border-color:${cfg.border}">${phase}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-family:var(--font-num);background:var(--bg3);padding:6px 8px;border-radius:6px;margin:8px 0 6px;">
          <div>ARS: <strong style="color:${avgArs >= 0 ? 'var(--up)' : 'var(--down)'}">${(avgArs * 100).toFixed(1)}%</strong></div>
          <div>SRS: <strong style="color:${avgSrs >= 0 ? 'var(--up)' : 'var(--down)'}">${(avgSrs * 100).toFixed(1)}%</strong></div>
          <div style="color:var(--muted)">${pass}/${total} Pass</div>
        </div>
        <div>
          <div class="sc-bar" style="height:4px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden;">
            <div class="sc-fill" style="width:${pctF}%;height:100%;background:${clr}"></div>
          </div>
        </div>
        <div style="font-size:9.5px;color:var(--muted-lt);display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <span>Top Leader:</span>
          <strong style="color:var(--text);font-family:var(--font-num);background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">${topStockStr}</strong>
        </div>
      </div>
    `);
  });

  const tableContainer = document.getElementById('sector-table-container');
  if (tableContainer) {
    tableContainer.innerHTML = `
      <div class="rrg-table-wrap">
        <table class="rrg-table">
          <thead>
            <tr>
              <th style="text-align:left;">SECTOR / THEME</th>
              <th style="text-align:left;">STATE</th>
              <th style="text-align:right;">ARS %</th>
              <th style="text-align:right;">SRS %</th>
              <th style="text-align:left;">BREADTH</th>
              <th style="text-align:left;">TOP LEADER</th>
              <th style="text-align:right;">ACTION</th>
            </tr>
          </thead>
          <tbody>
            ${sectorRows.join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const gridContainer = document.getElementById('sector-grid');
  if (gridContainer) gridContainer.innerHTML = cardsHtmlList.join('');

  setSectorViewMode(sectorViewMode);
}

function toggleSectorFilter(ind, isThematic) {
  if (isThematic) {
    const thm = THEMATIC_GROUPS.find(g => g.name === ind);
    if (thm) {
      activeSector = activeSector === thm.name ? null : thm.name;
      const scrTab = document.querySelector('.tab[onclick*="screener"]') || document.querySelectorAll('.tab')[1];
      setTab('screener', scrTab);
      renderAll();
    }
  } else {
    toggleSector(ind);
  }
}

function renderSectorDonut(priMetrics, thmMetrics) {
  const container = document.getElementById('rrg-donut-container');
  if (!container) return;

  if (!priMetrics) {
    renderSectors();
    return;
  }

  const metrics = (donutScope === 'thematic' ? [...thmMetrics] : [...priMetrics]);
  metrics.sort((a, b) => b.avgArs - a.avgArs);

  const numSlices = metrics.length;
  if (!numSlices) return;

  const badge = document.getElementById('donut-mode-badge');
  if (badge) {
    badge.textContent = donutScope === 'thematic' 
      ? `${numSlices} Thematic Themes` 
      : `Rank #1 to #${numSlices}`;
  }

  const cx = 180, cy = 180;
  const R = 155, r = 96;
  const gapRad = (1.5 * Math.PI) / 180;
  const sliceAngle = (2 * Math.PI) / numSlices;

  // Spectrum Color Palette for Donut slices
  const colors = [
    '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#10b981', '#059669', '#14b8a6', '#06b6d4',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e'
  ];

  const phaseColors = {
    LEADING:   '#10b981',
    IMPROVING: '#3b82f6',
    WEAKENING: '#f59e0b',
    LAGGING:   '#ef4444'
  };

  const slices = [];
  metrics.forEach((m, idx) => {
    const rank = idx + 1;
    const startAngle = idx * sliceAngle - Math.PI / 2 + gapRad / 2;
    const endAngle = (idx + 1) * sliceAngle - Math.PI / 2 - gapRad / 2;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);

    const x3 = cx + r * Math.cos(endAngle);
    const y3 = cy + r * Math.sin(endAngle);
    const x4 = cx + r * Math.cos(startAngle);
    const y4 = cy + r * Math.sin(startAngle);

    const largeArc = (endAngle - startAngle > Math.PI) ? 1 : 0;
    const pathD = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    const sliceColor = colors[idx % colors.length];

    slices.push(`
      <path class="donut-slice" d="${pathD}" fill="${sliceColor}" opacity="0.88" stroke="rgba(255,255,255,0.06)" stroke-width="1"
        onmouseover="updateDonutCenter('${m.ind.replace(/'/g, "\\'")}', ${rank}, ${(m.avgArs * 100).toFixed(1)}, ${(m.avgSrs * 100).toFixed(1)}, '${m.phase}', '${m.pass}/${m.total}', '${sliceColor}')"
        onmouseout="resetDonutCenter()"
        onclick="toggleSectorFilter('${m.ind.replace(/'/g, "\\'")}', ${m.isThematic})" />
    `);
  });

  const top1 = metrics[0];
  const top1Color = colors[0];

  container.innerHTML = `
    <svg viewBox="0 0 360 360" style="width:100%;max-width:360px;height:auto;display:block;">
      ${slices.join('')}
    </svg>
    <div class="donut-center-card" id="donut-center-readout">
      <div style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">#1 LEADER</div>
      <div style="font-size:12px;font-weight:800;color:${top1Color};max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0;">${top1 ? top1.ind : '—'}</div>
      <div style="font-family:var(--font-num);font-size:11px;font-weight:700;color:var(--up);">+${top1 ? (top1.avgArs * 100).toFixed(1) : 0}% ARS</div>
      <div style="font-size:8.5px;color:var(--muted-lt);margin-top:3px;">${metrics.length} Sectors Ranked</div>
    </div>
  `;
}

function updateDonutCenter(name, rank, ars, srs, phase, breadth, color) {
  const centerEl = document.getElementById('donut-center-readout');
  if (!centerEl) return;

  const phaseColors = {
    LEADING:   '#10b981',
    IMPROVING: '#3b82f6',
    WEAKENING: '#f59e0b',
    LAGGING:   '#ef4444'
  };
  const phColor = phaseColors[phase] || color;

  centerEl.innerHTML = `
    <div style="font-size:8.5px;color:var(--muted);font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">RANK #${rank}</div>
    <div style="font-size:11.5px;font-weight:800;color:${color};max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:1px 0;">${name}</div>
    <div style="font-family:var(--font-num);font-size:10.5px;font-weight:700;color:${ars >= 0 ? 'var(--up)' : 'var(--down)'};">${ars >= 0 ? '+' : ''}${ars}% ARS</div>
    <div style="font-size:8px;color:${phColor};background:rgba(255,255,255,0.06);padding:1px 6px;border-radius:4px;font-weight:800;margin-top:2px;">${phase} · ${breadth}</div>
  `;
}

function resetDonutCenter() {
  const centerEl = document.getElementById('donut-center-readout');
  if (!centerEl) return;

  const byInd = {};
  allData.forEach(d => { (byInd[d.ind] = byInd[d.ind] || []).push(d); });
  const metrics = Object.keys(byInd).map(ind => {
    const stocks = byInd[ind];
    const avgArs = stocks.reduce((s, d) => s + (d.ars || 0), 0) / (stocks.length || 1);
    return { ind, avgArs };
  }).sort((a, b) => b.avgArs - a.avgArs);

  const top1 = metrics[0];
  centerEl.innerHTML = `
    <div style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">#1 LEADER</div>
    <div style="font-size:12px;font-weight:800;color:#38bdf8;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0;">${top1 ? top1.ind : '—'}</div>
    <div style="font-family:var(--font-num);font-size:11px;font-weight:700;color:var(--up);">+${top1 ? (top1.avgArs * 100).toFixed(1) : 0}% ARS</div>
    <div style="font-size:8.5px;color:var(--muted-lt);margin-top:3px;">${metrics.length} Sectors Ranked</div>
  `;
}


function showRrgTooltip(evt, ind, ars, srs, phase, breadth, topStock) {
  const tt = document.getElementById('rrg-tooltip');
  if (!tt) return;

  const phaseColors = {
    LEADING:   '#10b981',
    IMPROVING: '#3b82f6',
    WEAKENING: '#f59e0b',
    LAGGING:   '#ef4444'
  };
  const phColor = phaseColors[phase] || 'var(--text)';

  tt.innerHTML = `
    <div style="font-weight:800;color:#ffffff;margin-bottom:4px;font-size:12.5px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span>${ind}</span>
      <span style="font-size:9.5px;color:${phColor};background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:var(--font-num);">${phase}</span>
    </div>
    <div style="font-family:var(--font-num);font-size:11px;line-height:1.5;">
      <div>RS-Ratio (ARS): <span style="color:${ars >= 0 ? 'var(--up)' : 'var(--down)'};font-weight:700;">${(ars * 100).toFixed(1)}%</span></div>
      <div>RS-Momentum (SRS): <span style="color:${srs >= 0 ? 'var(--up)' : 'var(--down)'};font-weight:700;">${(srs * 100).toFixed(1)}%</span></div>
      <div>Breadth: <span style="color:var(--text);font-weight:600;">${breadth} Stocks Passing</span></div>
      <div>Top Leader: <span style="color:var(--gold);font-weight:600;">${topStock}</span></div>
    </div>
    <div style="font-size:9.5px;color:var(--muted-lt);margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;">
      Click node to filter screener table
    </div>
  `;
  tt.style.display = 'block';
  tt.style.left = (evt.pageX + 14) + 'px';
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

  if (!allData || allData.length === 0) {
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
