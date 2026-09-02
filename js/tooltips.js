/**
 * Adaptive Alpha — Contextual Micro-Tooltips Engine
 * Provides instant floating explanations for technical momentum metrics.
 */

const TOOLTIP_DEFINITIONS = {
  ars: {
    title: 'Adaptive Relative Strength (ARS)',
    body: 'Measures cumulative percentage outperformance vs NIFTY 50 anchored from Jan 1, 2021. ARS > 0% indicates a structural institutional market leader.'
  },
  srs: {
    title: 'Shorter-Term Relative Strength (SRS)',
    body: 'Rolling 63-trading-day (1 business quarter) relative performance vs NIFTY 50. Identifies immediate quarterly acceleration.'
  },
  vcp: {
    title: 'Quantitative VCP Squeeze',
    body: 'Volatility Contraction Pattern — 5D ATR contracted to ≤70% of 20D ATR with volume dry-up (≤75% of 50D avg) and range tightness ≤4.5%, signaling an imminent explosive breakout.'
  },
  pocketpivot: {
    title: 'Pocket Pivot Accumulation',
    body: 'Institutional footprint (Morales / Kacher) — Today\'s up-volume exceeds the largest down-day volume over the prior 10 trading sessions.'
  },
  rsr: {
    title: 'RS Rating (1–99 Percentile Score)',
    body: 'IBD-style composite percentile rank across ARS (40%), SRS (30%), Volume (15%), and Days in Trend (15%). Score of 90+ represents top 10% market leadership.'
  },
  slope: {
    title: '5-Day Momentum Slope (ΔARS)',
    body: 'The change in ARS over the last 5 trading days. Positive (+) indicates accelerating momentum; negative (−) indicates deceleration or profit booking.'
  },
  ma: {
    title: 'Moving Average Status (MA+ / MA-)',
    body: 'MA+ indicates price is trading above both 50-day and 200-day moving averages (clean structural uptrend). MA- indicates overhead resistance.'
  },
  st: {
    title: 'Dual Supertrend (14/3 & 10/3)',
    body: 'ATR-based trailing trend filter. BUY indicates price closed above trailing support. ⚡ indicates a fresh trend flip signal.'
  },
  quad: {
    title: 'Dual RS 4-Quadrant Regimes',
    body: 'Q1 (Power Leaders: ARS+ & SRS+) · Q2 (Turnarounds: ARS− & SRS+) · Q3 (Dip Buys: ARS+ & SRS−) · Q4 (Laggards: ARS− & SRS−).'
  },
  hi52: {
    title: '52-Week High Proximity',
    body: 'Percentage distance of current price from its 52-week high. Proximity near 0.00% indicates trading at or near fresh yearly highs.'
  },
  mrs: {
    title: 'Mansfield Relative Strength',
    body: 'Stan Weinstein-style 50-period SMA ratio of stock vs benchmark. Positive value indicates outperformance over the base trendline.'
  },
  ichimoku: {
    title: 'Ichimoku Cloud Status',
    body: 'Identifies whether price is trading above the Kumo Cloud (Span A & B) with Tenkan-Kijun bullish alignment.'
  }
};

let tooltipEl = null;

function initTooltips() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'floating-tooltip';
    document.body.appendChild(tooltipEl);
  }

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) {
      if (tooltipEl) tooltipEl.classList.remove('visible');
      return;
    }

    const key = target.getAttribute('data-tooltip')?.toLowerCase();
    const def = TOOLTIP_DEFINITIONS[key];
    if (!def) return;

    tooltipEl.innerHTML = `<div class="tip-title">${def.title}</div><div>${def.body}</div>`;
    tooltipEl.classList.add('visible');

    const rect = target.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - 130;
    let top = rect.bottom + 8;

    // Boundary checks
    if (left < 10) left = 10;
    if (left + 270 > window.innerWidth) left = window.innerWidth - 275;
    if (top + tooltipEl.offsetHeight > window.innerHeight) top = rect.top - tooltipEl.offsetHeight - 8;

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (target && tooltipEl) {
      tooltipEl.classList.remove('visible');
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTooltips);
  } else {
    initTooltips();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TOOLTIP_DEFINITIONS, initTooltips };
}
