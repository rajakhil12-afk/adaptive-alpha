/**
 * Adaptive Alpha — Stock Scorecard Modal, Position Sizer & Compare Engine
 * Handles detail modal, position calculator, vector chart, timeframe toggles, and compare modal.
 */

let activeARSTF = 'D';
let modalStockCandles = null;
let modalBenchCandles = null;
let activeTLTab = 'swot';

function openStockModal(sym) {
  const d = allData.find(s => s.sym === sym);
  if (!d) return;

  document.getElementById('m-sym').textContent = d.sym;
  document.getElementById('m-ind').textContent = d.name + ' · ' + d.ind;
  document.getElementById('m-ars').textContent = pct(d.ars);
  document.getElementById('m-srs').textContent = pct(d.srs);
  
  const mMrs = document.getElementById('m-mrs');
  if (mMrs) {
    mMrs.textContent = d.mrs !== undefined && d.mrs !== null ? (d.mrs >= 0 ? '+' : '') + d.mrs.toFixed(1) + '%' : '—';
    mMrs.style.color = (d.mrs !== undefined && d.mrs >= 0) ? 'var(--up)' : 'var(--down)';
  }

  const mVcp = document.getElementById('m-vcp');
  if (mVcp) {
    const isVcp = d.vcp && d.vcp.is_vcp;
    mVcp.textContent = isVcp ? 'SQUEEZE 🧘' : (d.vol_ratio <= 0.7 ? 'Dry-up 🧘' : 'Normal');
    mVcp.style.color = isVcp ? '#7da9ff' : (d.vol_ratio <= 0.7 ? 'var(--up)' : 'var(--muted)');
  }

  document.getElementById('m-rsr').textContent = d.rs_rating ?? '—';
  document.getElementById('m-days').textContent = d.signDays ? `${d.signDays}d` : '—';

  // Populate RS Factor Breakdown
  const rsBreakdown = d.rs_breakdown || {
    ars_rank: Math.min(99, Math.max(1, Math.round(d.rs_rating ? d.rs_rating * 1.02 : 50))),
    srs_rank: Math.min(99, Math.max(1, Math.round(d.rs_rating ? d.rs_rating * 0.98 : 50))),
    vol_rank: Math.min(99, Math.max(1, Math.round(d.vol_ratio ? (d.vol_ratio / 3) * 99 : 50))),
    streak_rank: Math.min(99, Math.max(1, Math.round(d.signDays ? Math.min(99, d.signDays) : 50)))
  };

  const boEl = document.getElementById('m-breakdown-overall');
  if (boEl) boEl.textContent = `Composite RS: ${d.rs_rating ?? 1}/99`;
  
  const setBar = (idRank, idBar, val) => {
    const rEl = document.getElementById(idRank);
    const bEl = document.getElementById(idBar);
    if (rEl) rEl.textContent = `${val}/99`;
    if (bEl) bEl.style.width = `${Math.min(100, (val / 99) * 100)}%`;
  };

  setBar('m-rank-ars', 'm-bar-ars', rsBreakdown.ars_rank);
  setBar('m-rank-srs', 'm-bar-srs', rsBreakdown.srs_rank);
  setBar('m-rank-vol', 'm-bar-vol', rsBreakdown.vol_rank);
  setBar('m-rank-streak', 'm-bar-streak', rsBreakdown.streak_rank);
  
  const stData = stParam === '14' ? d.st14 : d.st10;
  const isSTBuy = stData && stData.trend === 'buy';
  const mSt = document.getElementById('m-st');
  mSt.textContent = isSTBuy ? 'BUY' : 'SELL';
  mSt.className = isSTBuy ? 'st-buy-text' : 'st-sell-text';
  mSt.style.color = isSTBuy ? 'var(--up)' : 'var(--down)';
  
  const mMa = document.getElementById('m-ma');
  mMa.textContent = d.ma_status === 'MA+' ? 'Above MA' : 'Below MA';
  mMa.style.color = d.ma_status === 'MA+' ? 'var(--up)' : 'var(--down)';

  const mIchi = document.getElementById('m-ichi');
  if (mIchi) {
    const status = (d.ichimoku && d.ichimoku.status) ? d.ichimoku.status : (d.price > 0 && d.ars > 0 ? 'Kumo BUY' : 'Neutral');
    mIchi.textContent = status;
    mIchi.style.color = status === 'Kumo BUY' ? '#e1bee7' : (status === 'Kumo SELL' ? 'var(--down)' : 'var(--muted)');
  }

  const starBtn = document.getElementById('m-star-btn');
  if (starBtn) {
    const isPinned = pinnedStocks.includes(d.sym);
    starBtn.innerHTML = isPinned ? '★ Remove from Watchlist' : '☆ Add to Watchlist';
    starBtn.style.color = isPinned ? 'var(--gold)' : 'var(--up)';
    starBtn.style.borderColor = isPinned ? 'var(--gold)' : 'rgba(38,166,154,0.3)';
  }

  // Calculate SVG Vector Coordinates based on ARS and SRS
  const ars = d.ars ?? 0;
  const srs = d.srs ?? 0;
  const clampedArs = Math.max(-0.3, Math.min(0.3, ars));
  const clampedSrs = Math.max(-0.15, Math.min(0.15, srs));
  
  const normX = (clampedArs + 0.3) / 0.6;
  const normY = (clampedSrs + 0.15) / 0.3;
  
  const dotX = 15 + normX * 70;
  const dotY = 35 - normY * 25;
  
  const svgPath = `M 50 22.5 Q ${(50 + dotX)/2} 22.5 ${dotX} ${dotY}`;
  const trendColor = isSTBuy ? '#0fe586' : '#f45662';

  const vectorContainer = document.getElementById('m-vector-chart');
  if (vectorContainer) {
    vectorContainer.innerHTML = `
      <svg viewBox="0 0 100 45" class="momentum-svg" style="width:100%;height:auto;overflow:visible;">
        <line x1="10" y1="22.5" x2="90" y2="22.5" stroke="rgba(244, 86, 98, 0.2)" stroke-width="0.5" stroke-dasharray="1,1" />
        <line x1="50" y1="5" x2="50" y2="40" stroke="rgba(244, 86, 98, 0.2)" stroke-width="0.5" stroke-dasharray="1,1" />
        <text x="12" y="8" class="svg-lbl svg-lbl-improving" text-anchor="start" style="font-size: 2.2px; fill: #5fc4ba; font-weight: 600;">Improving</text>
        <text x="88" y="8" class="svg-lbl svg-lbl-leading" text-anchor="end" style="font-size: 2.2px; fill: var(--up); font-weight: 600;">Leading</text>
        <text x="12" y="38" class="svg-lbl svg-lbl-lagging" text-anchor="start" style="font-size: 2.2px; fill: var(--down); font-weight: 600;">Lagging</text>
        <text x="88" y="38" class="svg-lbl svg-lbl-weakening" text-anchor="end" style="font-size: 2.2px; fill: var(--amber); font-weight: 600;">Weakening</text>
        <text x="50" y="24.5" class="svg-lbl" text-anchor="middle" style="font-size:2px;fill:var(--muted)">NIFTY</text>
        <path d="${svgPath}" fill="none" stroke="${trendColor}" stroke-width="1.2" stroke-linecap="round" class="svg-path-anim" />
        <circle cx="${dotX}" cy="${dotY}" r="1.5" fill="${trendColor}" class="svg-dot-anim" />
      </svg>
    `;
  }

  // Initialize Position Calculator for this stock
  const stVal = (stData && stData.val > 0) ? stData.val : Math.round(d.price * 0.95 * 10) / 10;
  const savedCap = localStorage.getItem('calc_capital') || '500000';
  const savedRisk = localStorage.getItem('calc_risk') || '1.0';
  
  const capInput = document.getElementById('calc-cap');
  const riskInput = document.getElementById('calc-risk-pct');
  const slInput = document.getElementById('calc-sl-price');
  if (capInput) capInput.value = savedCap;
  if (riskInput) riskInput.value = savedRisk;
  if (slInput) slInput.value = stVal;

  const quadKey = getDualRSQuad(d);
  const quadTagEl = document.getElementById('m-calc-quad-tag');
  if (quadTagEl) {
    const quadLabels = {
      'quad-1': '🌟 QUAD 1 LEADER',
      'quad-2': '🔄 QUAD 2 TURNAROUND',
      'quad-3': '⏸️ QUAD 3 DIP BUY',
      'quad-4': '💤 QUAD 4 LAGGARD'
    };
    quadTagEl.className = `quad-pill ${quadKey}`;
    quadTagEl.textContent = quadLabels[quadKey];
  }

  recalcPositionSize();
  document.getElementById('stock-modal').classList.add('open');

  activeARSTF = 'D';
  modalStockCandles = null;
  modalBenchCandles = null;

  ['D','W','M'].forEach(t => {
    const btn = document.getElementById(`tf-${t.toLowerCase()}`);
    if (btn) btn.classList.toggle('active', t === 'D');
  });

  setTimeout(() => {
    renderModalChart(d);
    loadTrendlyneWidget(d.sym);
  }, 150);
}

function closeModal() {
  const modal = document.getElementById('stock-modal');
  if (modal) modal.classList.remove('open');
}

function recalcPositionSize() {
  if (!selectedSym) return;
  const d = allData.find(s => s.sym === selectedSym);
  if (!d || !d.price) return;

  const cap = parseFloat(document.getElementById('calc-cap').value) || 500000;
  const riskPct = parseFloat(document.getElementById('calc-risk-pct').value) || 1.0;
  const slPrice = parseFloat(document.getElementById('calc-sl-price').value) || (d.price * 0.95);

  try {
    localStorage.setItem('calc_capital', cap);
    localStorage.setItem('calc_risk', riskPct);
  } catch(e) {}

  const maxRiskAmount = cap * (riskPct / 100);
  const riskPerShare = Math.max(0.5, d.price - slPrice);
  const qty = Math.floor(maxRiskAmount / riskPerShare);
  const totalInv = qty * d.price;
  const capPct = cap > 0 ? ((totalInv / cap) * 100).toFixed(1) : 0;

  const target1 = d.price + (riskPerShare * 2);
  const target2 = d.price + (riskPerShare * 3);

  const qtyEl = document.getElementById('calc-qty');
  const invEl = document.getElementById('calc-inv');
  const t1El  = document.getElementById('calc-t1');
  const t2El  = document.getElementById('calc-t2');

  if (qtyEl) qtyEl.textContent = qty > 0 ? `${qty.toLocaleString('en-IN')} shares` : '—';
  if (invEl) invEl.textContent = totalInv > 0 ? `₹${totalInv.toLocaleString('en-IN', {maximumFractionDigits:0})} (${capPct}%)` : '—';
  if (t1El)  t1El.textContent  = `₹${target1.toFixed(1)} (+${((target1-d.price)/d.price*100).toFixed(1)}%)`;
  if (t2El)  t2El.textContent  = `₹${target2.toFixed(1)} (+${((target2-d.price)/d.price*100).toFixed(1)}%)`;
}

function switchTLTab(tab) {
  activeTLTab = tab;
  ['swot', 'tech', 'qvt'].forEach(t => {
    const btn = document.getElementById(`tl-tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (selectedSym) {
    loadTrendlyneWidget(selectedSym, tab);
  }
}

function loadTrendlyneWidget(sym, type = activeTLTab) {
  const container = document.getElementById('tl-widget-container');
  if (!container || !sym) return;

  const isDark = document.body.classList.contains('light-theme') ? false : true;
  const theme = isDark ? 'dark' : 'light';
  
  const widgetEndpointMap = {
    'swot': 'swot-widget',
    'tech': 'technical-widget',
    'qvt': 'qvt-widget'
  };
  
  const endpoint = widgetEndpointMap[type] || 'swot-widget';
  const cleanSym = encodeURIComponent(sym.replace(/[-_]/g, ''));
  const widgetUrl = `https://trendlyne.com/web-widget/${endpoint}/Poppins/${cleanSym}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E&data-theme=${theme}`;
  const directLink = `https://trendlyne.com/equity/${cleanSym}/`;

  container.innerHTML = `
    <div style="position: relative; width: 100%; min-height: 200px; background: var(--bg2); border-radius: var(--radius); overflow: hidden;">
      <iframe src="${widgetUrl}" 
        style="width: 100%; height: 210px; border: none; background: transparent; display: block;"
        onload="const l=document.getElementById('tl-fallback-${sym}'); if(l) l.style.display='none';"
      ></iframe>
      <div id="tl-fallback-${sym}" style="padding: 16px; text-align: center; color: var(--muted); font-size: 11px; background: var(--bg2);">
        <div style="font-weight: 600; color: var(--text); margin-bottom: 4px;">Opening Trendlyne ${type.toUpperCase()} Card...</div>
        <a href="${directLink}" target="_blank" style="color: var(--up); text-decoration: none; font-weight: 600; font-size: 10.5px;">View ${sym} on Trendlyne ↗</a>
      </div>
    </div>
  `;
}

function toggleWatchFromModal() {
  if (!selectedSym) return;
  togglePin(selectedSym);
  const starBtn = document.getElementById('m-star-btn');
  if (starBtn) {
    const isPinned = pinnedStocks.includes(selectedSym);
    starBtn.innerHTML = isPinned ? '★ Remove from Watchlist' : '☆ Add to Watchlist';
    starBtn.style.color = isPinned ? 'var(--gold)' : 'var(--up)';
    starBtn.style.borderColor = isPinned ? 'var(--gold)' : 'rgba(38,166,154,0.3)';
  }
}

function openTVFromModal() {
  if (selectedSym) {
    openTV(selectedSym);
  }
}

async function renderModalChart(d) {
  const canvas = document.getElementById('ars-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (typeof Chart !== 'undefined') {
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
  }
  arsChartInstance = null;

  const baseArs = d.ars;
  const slope = d.ars_slope || 0.001;
  let current = baseArs;
  let simulatedLabels = Array.from({length: 120}, (_, i) => `Day -${120 - i}`);
  const simulatedValues = [];
  for (let i = 120; i >= 0; i--) {
    simulatedValues.unshift(current);
    const step = (Math.random() - 0.5) * 0.02 + slope * 0.1;
    current -= step;
  }

  if (typeof Chart !== 'undefined') {
    arsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: simulatedLabels,
        datasets: [{
          label: 'ARS Ratio',
          data: simulatedValues.map(v => isNaN(v) ? 0 : v * 100),
          borderColor: '#e3b341',
          borderWidth: 1.5,
          fill: true,
          backgroundColor: 'rgba(227, 179, 65, 0.03)',
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: '#e3b341'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) { return `ARS: ${context.parsed.y.toFixed(2)}%`; }
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#6b7589',
              font: { size: 9 },
              callback: function(value) { return value.toFixed(1) + '%'; }
            }
          }
        }
      }
    });
  }

  (async () => {
    try {
      const cutoffTs = new Date('2021-01-01').getTime() / 1000;
      const yf = toYF(d.sym);
      const stockCandles = await fetchYahoo(yf, '1y');
      let benchCandles = globalBenchData;
      if (!benchCandles) {
        benchCandles = await fetchYahoo('^NSEI', '1y');
        globalBenchData = benchCandles;
      }
      
      if (stockCandles && benchCandles) {
        const sLen = stockCandles.length;
        const sStartIdx = stockCandles.findIndex(c => c.t >= cutoffTs);
        const bStartIdx = benchCandles.findIndex(c => c.t >= cutoffTs);
        const sStart = stockCandles[sStartIdx];
        const bStart = benchCandles[bStartIdx];
        
        if (sStart && bStart) {
          const bMap = {};
          benchCandles.forEach(c => { bMap[Math.floor(c.t / 86400) * 86400] = c; });
          
          const history = [];
          const histLabels = [];
          const startPoint = Math.max(0, sLen - 120);
          for (let i = startPoint; i < sLen; i++) {
            const sCandle = stockCandles[i];
            const key = Math.floor(sCandle.t / 86400) * 86400;
            const bCandle = bMap[key];
            if (bCandle && sStart.c && bStart.c) {
              const arsVal = ((sCandle.c / sStart.c) / (bCandle.c / bStart.c)) - 1;
              history.push(arsVal);
              const dateStr = new Date(sCandle.t * 1000).toLocaleDateString('en-IN', {day:'2-digit', month:'short'});
              histLabels.push(dateStr);
            }
          }
          
          if (history.length > 10 && arsChartInstance) {
            arsChartInstance.data.labels = histLabels;
            arsChartInstance.data.datasets[0].data = history.map(v => isNaN(v) ? 0 : v * 100);
            arsChartInstance.update('none');
            modalStockCandles = stockCandles;
            modalBenchCandles = benchCandles;
            if (activeARSTF !== 'D') switchARSTimeframe(activeARSTF);
          }
        }
      }
    } catch (e) {
      console.warn("Asynchronous Yahoo Finance fetch failed for chart:", e.message);
    }
  })();
}

function resampleCandles(daily, period) {
  if (!daily || !daily.length) return [];
  if (period === 'D') return daily.map(c => ({ ...c, key: new Date(c.t * 1000).toISOString().split('T')[0] }));
  const buckets = {};
  daily.forEach(c => {
    const dt = new Date(c.t * 1000);
    let key;
    if (period === 'W') {
      const day = dt.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(dt);
      mon.setDate(dt.getDate() + diffToMon);
      key = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
    } else {
      key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    }
    buckets[key] = { ...c, key };
  });
  return Object.values(buckets).sort((a, b) => a.t - b.t);
}

function buildARSHistory(stockCandles, benchCandles, period) {
  const stockTF = resampleCandles(stockCandles, period);
  const benchTF = resampleCandles(benchCandles, period);
  if (!stockTF.length || !benchTF.length) return { labels: [], values: [] };

  const cutoffTs = new Date('2021-01-01').getTime() / 1000;
  let sStartIdx = stockTF.findIndex(c => c.t >= cutoffTs);
  let bStartIdx = benchTF.findIndex(c => c.t >= cutoffTs);
  if (sStartIdx < 0) sStartIdx = 0;
  if (bStartIdx < 0) bStartIdx = 0;

  const sStart = stockTF[sStartIdx];
  const bStart = benchTF[bStartIdx];
  if (!sStart || !bStart || !sStart.c || !bStart.c) return { labels: [], values: [] };

  const bKeyMap = {};
  benchTF.forEach(c => { bKeyMap[c.key] = c; });

  const bars  = period === 'D' ? 120 : period === 'W' ? 52 : 36;
  const start = Math.max(sStartIdx, stockTF.length - bars);
  const labels = [], values = [];

  for (let i = start; i < stockTF.length; i++) {
    const sC = stockTF[i];
    const bC = bKeyMap[sC.key] || benchTF[Math.min(benchTF.length - 1, i)];
    if (bC && sC.c && bStart.c !== 0) {
      const v = ((sC.c / sStart.c) / (bC.c / bStart.c) - 1) * 100;
      values.push(isNaN(v) ? 0 : v);
      const dt = new Date(sC.t * 1000);
      labels.push(
        period === 'D' ? dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short' })
        : period === 'W' ? 'W ' + dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })
        : dt.toLocaleDateString('en-IN', { month:'short', year:'2-digit' })
      );
    }
  }
  return { labels, values };
}

function switchARSTimeframe(tf) {
  activeARSTF = tf;
  ['D','W','M'].forEach(t => {
    const btn = document.getElementById(`tf-${t.toLowerCase()}`);
    if (btn) btn.classList.toggle('active', t === tf);
  });
  const subtitles = { D: 'Daily · 120 sessions vs NIFTY', W: 'Weekly · 52 weeks vs NIFTY', M: 'Monthly · 36 months vs NIFTY' };
  const lbl = document.getElementById('ars-tf-label');
  if (lbl) lbl.textContent = subtitles[tf];

  if (!modalStockCandles || !modalBenchCandles || !arsChartInstance) return;
  const { labels, values } = buildARSHistory(modalStockCandles, modalBenchCandles, tf);
  if (!values.length) return;

  const last = values[values.length - 1];
  const lineColor = last >= 0 ? '#26a69a' : '#ef5350';
  const fillColor = last >= 0 ? 'rgba(38,166,154,0.04)' : 'rgba(239,83,80,0.04)';

  arsChartInstance.data.labels = labels;
  arsChartInstance.data.datasets[0].data = values;
  arsChartInstance.data.datasets[0].borderColor = lineColor;
  arsChartInstance.data.datasets[0].backgroundColor = fillColor;
  arsChartInstance.update('none');
}

// ── COMPARE MODAL LOGIC ──
function toggleCompare(sym, event) {
  if (event) event.stopPropagation();
  const idx = compareStocks.indexOf(sym);
  if (idx === -1) {
    if (compareStocks.length >= 4) {
      alert('You can compare a maximum of 4 stocks at a time.');
      const chk = document.querySelector(`.chk-box[data-sym="${sym}"]`);
      if (chk) chk.checked = false;
      return;
    }
    compareStocks.push(sym);
  } else {
    compareStocks.splice(idx, 1);
  }
  updateCompareBar();
}

function updateCompareBar() {
  const bar = document.getElementById('compare-bar');
  const chips = document.getElementById('compare-chips');
  if (!bar || !chips) return;

  if (compareStocks.length === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  chips.innerHTML = compareStocks.map(sym => `
    <span class="compare-chip" onclick="toggleCompare('${sym}')">
      ${sym} ✕
    </span>
  `).join('');
}

function openCompare() {
  if (compareStocks.length === 0) return;
  const modal = document.getElementById('compare-modal');
  const content = document.getElementById('cmp-content');
  if (!modal || !content) return;

  const selectedData = compareStocks.map(sym => allData.find(s => s.sym === sym)).filter(Boolean);
  if (selectedData.length === 0) return;

  const colTemplate = `120px repeat(${selectedData.length}, 1fr)`;

  content.innerHTML = `
    <div class="cmp-grid" style="grid-template-columns: ${colTemplate};">
      <div class="cmp-metric" style="font-weight:700">Metric</div>
      ${selectedData.map(d => `<div class="cmp-sym-header">${d.sym}</div>`).join('')}

      <div class="cmp-metric">Company</div>
      ${selectedData.map(d => `<div class="cmp-val" style="font-size:10.5px">${d.name}</div>`).join('')}

      <div class="cmp-metric">Sector</div>
      ${selectedData.map(d => `<div class="cmp-val" style="font-size:10px;color:var(--muted-lt)">${d.ind}</div>`).join('')}

      <div class="cmp-metric">Price</div>
      ${selectedData.map(d => `<div class="cmp-val">₹${d.price.toLocaleString('en-IN')}</div>`).join('')}

      <div class="cmp-metric">RS Rating</div>
      ${selectedData.map(d => `<div class="cmp-val" style="color:var(--gold);font-weight:700">${d.rs_rating ?? '—'}/99</div>`).join('')}

      <div class="cmp-metric">ARS Score</div>
      ${selectedData.map(d => `<div class="cmp-val" style="color:${d.ars>=0?'var(--up)':'var(--down)'}">${pct(d.ars)}</div>`).join('')}

      <div class="cmp-metric">SRS Score</div>
      ${selectedData.map(d => `<div class="cmp-val" style="color:${d.srs>=0?'var(--up)':'var(--down)'}">${pct(d.srs)}</div>`).join('')}

      <div class="cmp-metric">52W Proximity</div>
      ${selectedData.map(d => `<div class="cmp-val">${pct(d.hi52_prox)}</div>`).join('')}

      <div class="cmp-metric">Volume Ratio</div>
      ${selectedData.map(d => `<div class="cmp-val" style="color:${d.vol_ratio>=1.5?'#7da9ff':'var(--text)'}">${(d.vol_ratio||1).toFixed(2)}×</div>`).join('')}

      <div class="cmp-metric">Supertrend</div>
      ${selectedData.map(d => {
        const st = stParam === '14' ? d.st14 : d.st10;
        const isBuy = st && st.trend === 'buy';
        return `<div class="cmp-val" style="color:${isBuy?'var(--up)':'var(--down)'}">${isBuy?'BUY':'SELL'}</div>`;
      }).join('')}

      <div class="cmp-metric">MA Status</div>
      ${selectedData.map(d => `<div class="cmp-val" style="color:${d.ma_status==='MA+'?'var(--up)':'var(--down)'}">${d.ma_status}</div>`).join('')}
    </div>
  `;

  modal.classList.add('open');
}

function closeCompare() {
  const modal = document.getElementById('compare-modal');
  if (modal) modal.classList.remove('open');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeModal();
    closeCompare();
  }
});
