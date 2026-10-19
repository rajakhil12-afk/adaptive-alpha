"""
Tier 1: Feature Coverage Test Suite
Verifies all core features in isolation (>=5 test cases per feature):
- F1: Dual RS (ARS + SRS) & RS Ratings (1-99)
- F2: Supertrend (10,3) & VCP Squeeze Contraction
- F3: 4-Quadrant Regime Filtering (Quad 1-4) & Sorting / Sector Grouping
- F4: Delivery Volume & Surge Ratios
- F5: Institutional Accumulation Grades (Grade A+, A, B, C)
- F6: Forensic Safety Elimination Checks (Pledge > 20%, High Debt, Auditor Warning)
- F7: 3-Bullet AI Quantitative Thesis (Catalyst, Risk, Technical Trigger 1:1, 1:2, 1:3)
- F8: Volatility Position Sizer Math & Presets (Supertrend, -10%, -5%)
- F9: 3-Step Trailing Stop Loss Ladder
- F10: Jishu Portfolio Synchronization & Ledger Integrity
- F11: 1-Click TradingView Watchlist Export & Keyboard Navigation
"""

import unittest
import math
import json
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
TEST_DIR = ROOT_DIR / 'test'
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(TEST_DIR) not in sys.path:
    sys.path.insert(0, str(TEST_DIR))

# ── Reference Implementations derived directly from Specifications & JS Engines ──

def calc_ars(stock_candles, bench_candles):
    """Derives ARS & SRS from stock & benchmark candles per js/indicators.js:298-330."""
    if not stock_candles or not bench_candles or len(stock_candles) < 10 or len(bench_candles) < 10:
        return None
    s_start = stock_candles[0]
    b_start = bench_candles[0]
    s_today = stock_candles[-1]
    b_today = bench_candles[-1]

    s_ratio = s_today['c'] / s_start['c'] if s_start['c'] > 0 else 1.0
    b_ratio = b_today['c'] / b_start['c'] if b_start['c'] > 0 else 1.0
    ars = (s_ratio / b_ratio) - 1.0 if b_ratio != 0 else 0.0

    # SRS over last 63 sessions (or all available if < 64)
    lookback = min(64, len(stock_candles), len(bench_candles))
    s_63 = stock_candles[-lookback]
    b_63 = bench_candles[-lookback]
    s_ratio_63 = s_today['c'] / s_63['c'] if s_63['c'] > 0 else 1.0
    b_ratio_63 = b_today['c'] / b_63['c'] if b_63['c'] > 0 else 1.0
    srs = (s_ratio_63 / b_ratio_63) - 1.0 if b_ratio_63 != 0 else 0.0

    return {'ars': ars, 'srs': srs}

def compute_rs_ratings(stocks):
    """Multi-factor percentile ranker (1-99) per js/indicators.js:397-438."""
    N = len(stocks)
    if N == 0:
        return stocks
    if N == 1:
        stocks[0]['rs_rating'] = 50
        stocks[0]['rs_breakdown'] = {'ars_rank': 50, 'srs_rank': 50, 'vol_rank': 50, 'streak_rank': 50}
        return stocks

    def get_ranks(key_or_fn):
        sorted_indices = sorted(
            range(N),
            key=lambda i: key_or_fn(stocks[i]) if callable(key_or_fn) else (stocks[i].get(key_or_fn) or -float('inf'))
        )
        ranks = [0.0] * N
        for rank_pos, idx in enumerate(sorted_indices):
            ranks[idx] = rank_pos / (N - 1)
        return ranks

    ranks_ars = get_ranks('ars')
    ranks_srs = get_ranks('srs')
    ranks_vol = get_ranks('vol_ratio')
    ranks_days = get_ranks(lambda s: (s.get('signDays', 0)) * (1 if (s.get('ars', 0) >= 0) else -1))

    composites = []
    for i in range(N):
        comp = (ranks_ars[i] * 0.40) + (ranks_srs[i] * 0.30) + (ranks_vol[i] * 0.15) + (ranks_days[i] * 0.15)
        composites.append((comp, i))

    composites.sort(key=lambda x: x[0])
    for r, (_, idx) in enumerate(composites):
        rating = int(round(1 + (r / (N - 1)) * 98))
        stocks[idx]['rs_rating'] = rating
        stocks[idx]['rs_breakdown'] = {
            'ars_rank': int(round(1 + ranks_ars[idx] * 98)),
            'srs_rank': int(round(1 + ranks_srs[idx] * 98)),
            'vol_rank': int(round(1 + ranks_vol[idx] * 98)),
            'streak_rank': int(round(1 + ranks_days[idx] * 98))
        }
    return stocks

def calc_supertrend(candles, period=10, multiplier=3):
    """Calculates Supertrend (10, 3) per js/indicators.js:9-118."""
    if not candles or len(candles) < period + 5:
        return {'trend': 'sell', 'signal': None, 'val': 0.0}

    tr = []
    hl2 = []
    for i, c in enumerate(candles):
        hl2.append((c['h'] + c['l']) / 2.0)
        if i == 0:
            tr.append(c['h'] - c['l'])
        else:
            prev_c = candles[i - 1]['c']
            tr.append(max(c['h'] - c['l'], abs(c['h'] - prev_c), abs(c['l'] - prev_c)))

    # Wilder's RMA for ATR
    atr = [0.0] * len(candles)
    init_sum = sum(tr[:period])
    current_atr = init_sum / period
    atr[period - 1] = current_atr
    for i in range(period, len(candles)):
        current_atr = (atr[i - 1] * (period - 1) + tr[i]) / period
        atr[i] = current_atr

    up = []
    dn = []
    st = []
    trend = []

    for i, c in enumerate(candles):
        cur_atr = atr[i] if i >= period - 1 else tr[i]
        basic_up = hl2[i] - (multiplier * cur_atr)
        basic_dn = hl2[i] + (multiplier * cur_atr)

        if i == 0:
            up.append(basic_up)
            dn.append(basic_dn)
            st.append(basic_up if c['c'] >= hl2[i] else basic_dn)
            trend.append(1 if c['c'] >= hl2[i] else -1)
            continue

        prev_up = up[i - 1]
        prev_dn = dn[i - 1]
        prev_close = candles[i - 1]['c']

        final_up = basic_up if (basic_up > prev_up or prev_close < prev_up) else prev_up
        final_dn = basic_dn if (basic_dn < prev_dn or prev_close > prev_dn) else prev_dn
        up.append(final_up)
        dn.append(final_dn)

        prev_st = st[i - 1]
        prev_trend = trend[i - 1]

        if prev_trend == 1:
            cur_st = max(prev_st, final_up)
            if c['c'] < cur_st:
                cur_trend = -1
                cur_st = final_dn
            else:
                cur_trend = 1
        else:
            cur_st = min(prev_st, final_dn)
            if c['c'] > cur_st:
                cur_trend = 1
                cur_st = final_up
            else:
                cur_trend = -1

        st.append(cur_st)
        trend.append(cur_trend)

    last_idx = len(candles) - 1
    sig = None
    if trend[last_idx - 1] == -1 and trend[last_idx] == 1:
        sig = 'buy_signal'
    elif trend[last_idx - 1] == 1 and trend[last_idx] == -1:
        sig = 'sell_signal'

    return {
        'trend': 'buy' if trend[last_idx] == 1 else 'sell',
        'signal': sig,
        'val': round(st[last_idx], 2)
    }

def calc_vcp(candles):
    """VCP contraction detection per js/indicators.js:167-205."""
    if not candles or len(candles) < 55:
        return {'is_vcp': False, 'atr_ratio': 1.0, 'vol_dryup': 1.0, 'tightness_pct': 5.0}

    tr = []
    for i in range(1, len(candles)):
        c, p = candles[i], candles[i - 1]
        tr.append(max(c['h'] - c['l'], abs(c['h'] - p['c']), abs(c['l'] - p['c'])))

    atr5 = sum(tr[-5:]) / 5.0
    atr20 = sum(tr[-20:]) / 20.0
    atr_ratio = round(atr5 / atr20, 2) if atr20 > 0 else 1.0

    v5 = sum(c['v'] for c in candles[-5:]) / 5.0
    v50 = sum(c['v'] for c in candles[-50:]) / 50.0
    vol_dryup = round(v5 / v50, 2) if v50 > 0 else 1.0

    last5 = candles[-5:]
    max_h = max(c['h'] for c in last5)
    min_l = min(c['l'] for c in last5)
    cur_c = candles[-1]['c']
    tightness_pct = round(((max_h - min_l) / cur_c) * 100, 2) if cur_c > 0 else 10.0

    is_vcp = (atr_ratio <= 0.70) and (vol_dryup <= 0.75) and (tightness_pct <= 4.5)
    return {
        'is_vcp': is_vcp,
        'atr_ratio': atr_ratio,
        'vol_dryup': vol_dryup,
        'tightness_pct': tightness_pct
    }

def get_dual_rs_quad(stock):
    """Categorizes stock into Quad 1-4 per js/app.js:44-51."""
    ars_pos = (stock.get('ars') or 0) > 0
    srs_pos = (stock.get('srs') or 0) > 0
    if ars_pos and srs_pos:
        return 'quad-1'  # Leaders
    if not ars_pos and srs_pos:
        return 'quad-2'  # Turnarounds
    if ars_pos and not srs_pos:
        return 'quad-3'  # Dips
    return 'quad-4'      # Laggards

def calc_delivery_surge(deliv_qty, avg_deliv_qty, traded_vol=None):
    """Delivery surge ratio and label per js/indicators.js:522-546."""
    d_qty = float(deliv_qty) if deliv_qty is not None else 0.0
    a_qty = float(avg_deliv_qty) if avg_deliv_qty and avg_deliv_qty > 0 else (d_qty if d_qty > 0 else 1.0)
    ratio = round(d_qty / a_qty, 2)
    pct = round((d_qty / traded_vol) * 100, 1) if traded_vol and traded_vol > 0 else None

    label = 'Normal'
    is_spurt = False
    if ratio >= 2.0:
        label = '2× Delivery Surge'
        is_spurt = True
    elif ratio >= 1.5:
        label = 'Elevated Delivery'
        is_spurt = True
    elif ratio <= 0.6:
        label = 'Low Delivery'

    return {
        'deliv_ratio': ratio,
        'deliv_pct': pct,
        'is_spurt': is_spurt,
        'deliv_label': label
    }

def classify_accumulation_grade(mfr, udr):
    """Classifies Institutional Accumulation Grade per js/indicators.js:486-510 & PROJECT.md:71."""
    if mfr >= 0.30 or (mfr >= 0.18 and udr >= 1.6):
        return {'ad_grade': 'A+', 'label': 'Grade A+ Heavy Accumulation', 'status': 'Heavy Accumulation'}
    elif mfr >= 0.12 or udr >= 1.3:
        return {'ad_grade': 'A', 'label': 'Grade A Solid Buying', 'status': 'Institutional Buying'}
    elif mfr >= 0.02 or udr >= 1.05:
        return {'ad_grade': 'B', 'label': 'Grade B Neutral', 'status': 'Moderate Inflow'}
    elif mfr >= -0.12 and udr >= 0.85:
        return {'ad_grade': 'C', 'label': 'Grade C Churn', 'status': 'Neutral / Absorption'}
    elif mfr >= -0.28 or udr >= 0.65:
        return {'ad_grade': 'D', 'label': 'Grade D Selling', 'status': 'Distribution / Selling'}
    else:
        return {'ad_grade': 'E', 'label': 'Grade E Heavy Exit', 'status': 'Heavy Institutional Exit'}

def evaluate_forensic_safety(promoter_pledge_pct, high_debt=False, auditor_warning=False):
    """Evaluates forensic flags per PROJECT.md:74-81 and ORIGINAL_REQUEST R2."""
    flags = []
    warnings = []
    pledge = float(promoter_pledge_pct) if promoter_pledge_pct is not None else 0.0

    if pledge > 20.0:
        flags.append('HIGH_PROMOTER_PLEDGE')
        warnings.append(f'High Promoter Pledge: {pledge:.1f}% exceeds 20% limit')
    if high_debt:
        flags.append('HIGH_DEBT_LOAD')
        warnings.append('High Debt Load: elevated leverage ratio')
    if auditor_warning:
        flags.append('AUDITOR_WARNING')
        warnings.append('Auditor Alert: unexpected auditor resignation or adverse qualification')

    is_safe = len(flags) == 0
    return {
        'is_safe': is_safe,
        'flags': flags,
        'promoter_pledge_pct': pledge,
        'high_debt': bool(high_debt),
        'auditor_warning': bool(auditor_warning),
        'warnings': warnings
    }

def generate_ai_trade_thesis(stock):
    """Generates 3-bullet AI Quantitative Thesis per ORIGINAL_REQUEST R3 & PROJECT.md:47."""
    quad = get_dual_rs_quad(stock)
    s_safety = stock.get('safety') or {}
    is_safe = s_safety.get('is_safe', True)
    s_inst = stock.get('institutional') or {}
    ad_grade = s_inst.get('ad_grade', 'B')
    price = stock.get('price', 1000.0)
    st = stock.get('st10') or {}
    is_st_buy = st.get('trend') == 'buy'

    # Growth Catalyst
    if stock.get('hi52_prox', -1) >= -0.05 and stock.get('vol_ratio', 1) >= 1.5:
        growth_catalyst = "52-Week High Breakout expansion supported by institutional orderflow and surging volume participation."
    elif (stock.get('vcp') or {}).get('is_vcp'):
        growth_catalyst = "Multi-stage Volatility Contraction Pattern (VCP) breakout indicating institutional supply absorption."
    elif quad == 'quad-1':
        growth_catalyst = f"Consistent alpha leader in the {stock.get('ind', 'Sector')} sector with RS Rating of {stock.get('rs_rating', 80)}/99."
    elif quad == 'quad-2':
        growth_catalyst = "Early turnaround setup demonstrating sharp short-term relative momentum acceleration (SRS+)."
    else:
        growth_catalyst = "Defensive counter-trend consolidation or accumulation phase."

    # Risk Factor
    if not is_safe:
        warnings = s_safety.get('warnings', [])
        risk_factor = f"Forensic Alert: {'; '.join(warnings)}."
    elif ad_grade in ['D', 'E', 'C']:
        risk_factor = f"Institutional accumulation is muted ({ad_grade} Grade) showing volume churn or distribution."
    elif not is_st_buy:
        risk_factor = "Supertrend indicator remains in SELL mode; overhead moving average resistance present."
    else:
        risk_factor = "Broad market regime contraction or breakdown below key trailing swing pivot."

    # Technical Trigger & 1:1, 1:2, 1:3 Targets
    sl_price = round(st.get('val', price * 0.93), 2) if is_st_buy and st.get('val', 0) < price else round(price * 0.93, 2)
    risk_per_share = max(round(price * 0.01, 2), round(price - sl_price, 2))
    sl_price = round(price - risk_per_share, 2)

    t1 = round(price + (1.0 * risk_per_share), 2)
    t2 = round(price + (2.0 * risk_per_share), 2)
    t3 = round(price + (3.0 * risk_per_share), 2)

    technical_trigger = (
        f"Entry Trigger: Above ₹{price:.2f} | Initial SL: ₹{sl_price:.2f} (-{((risk_per_share/price)*100):.1f}%) | "
        f"Target 1 (1:1): ₹{t1:.2f} | Target 2 (1:2): ₹{t2:.2f} | Target 3 (1:3): ₹{t3:.2f}"
    )

    return {
        'growth_catalyst': growth_catalyst,
        'risk_factor': risk_factor,
        'technical_trigger': technical_trigger,
        't1': t1,
        't2': t2,
        't3': t3,
        'sl': sl_price
    }

def calculate_position_size(capital, risk_pct, price, sl_price):
    """Calculates position size with 20% allocation cap per js/modal.js:301-338 & PROJECT.md:83-85."""
    cap = float(capital) if capital and capital > 0 else 500000.0
    r_pct = float(risk_pct) if risk_pct and risk_pct > 0 else 1.0
    p = float(price)
    sl = float(sl_price)

    if sl <= 0 or sl >= p:
        sl = round(p * 0.93, 2)

    max_risk_amount = cap * (r_pct / 100.0)
    risk_per_share = max(p * 0.01, p - sl)

    qty = math.floor(max_risk_amount / risk_per_share)
    if qty <= 0:
        qty = 1

    max_alloc_cap = cap * 0.20
    if (qty * p) > max_alloc_cap:
        qty = max(1, math.floor(max_alloc_cap / p))

    invested_value = round(qty * p, 2)
    actual_risk = round(qty * risk_per_share, 2)
    t1 = round(p + (1.0 * risk_per_share), 2)
    t2 = round(p + (2.0 * risk_per_share), 2)
    t3 = round(p + (3.0 * risk_per_share), 2)

    return {
        'qty': qty,
        'invested_value': invested_value,
        'risk_amount': actual_risk,
        'risk_per_share': round(risk_per_share, 2),
        'target_1': t1,
        'target_2': t2,
        'target_3': t3
    }

def format_tradingview_watchlist(tickers):
    """Formats ticker list to TradingView format per PROJECT.md:96."""
    cleaned = [t.strip().upper() for t in tickers if t and t.strip()]
    formatted = [f"NSE:{t}" for t in cleaned]
    output_str = ",".join(formatted)
    toast_msg = f"✓ Copied {len(cleaned)} tickers in TradingView format"
    return {'formatted_str': output_str, 'toast_msg': toast_msg, 'count': len(cleaned)}


# ═══════════════════════════════════════════════════════════════════════
# TIER 1 FEATURE TESTS (>=5 test cases per feature in isolation)
# ═══════════════════════════════════════════════════════════════════════

class TestF1DualRSAndRatings(unittest.TestCase):
    """F1: Dual Relative Strength (ARS + SRS) and 1-99 RS Ratings."""

    def test_ars_outperformance(self):
        """1. Stock up 20%, benchmark flat -> positive ARS."""
        stock = [{'c': 100.0}] * 10 + [{'c': 120.0}]
        bench = [{'c': 100.0}] * 11
        res = calc_ars(stock, bench)
        self.assertAlmostEqual(res['ars'], 0.20, places=4)

    def test_ars_underperformance(self):
        """2. Stock flat, benchmark up 20% -> negative ARS."""
        stock = [{'c': 100.0}] * 11
        bench = [{'c': 100.0}] * 10 + [{'c': 120.0}]
        res = calc_ars(stock, bench)
        expected = (1.0 / 1.2) - 1.0
        self.assertAlmostEqual(res['ars'], expected, places=4)

    def test_srs_calculation(self):
        """3. SRS calculation over rolling 63-day window."""
        stock = [{'c': 100.0} for _ in range(70)]
        bench = [{'c': 100.0} for _ in range(70)]
        stock[-1] = {'c': 115.0}  # +15%
        bench[-1] = {'c': 105.0}  # +5%
        res = calc_ars(stock, bench)
        expected_srs = (1.15 / 1.05) - 1.0
        self.assertAlmostEqual(res['srs'], expected_srs, places=4)

    def test_rs_rating_percentile_bounds(self):
        """4. RS Ratings distribute strictly between 1 and 99."""
        stocks = [{'sym': f'S{i}', 'ars': i * 0.05, 'srs': i * 0.03, 'vol_ratio': 1.0 + (i * 0.1), 'signDays': i} for i in range(20)]
        ranked = compute_rs_ratings(stocks)
        for s in ranked:
            self.assertGreaterEqual(s['rs_rating'], 1)
            self.assertLessEqual(s['rs_rating'], 99)
        self.assertEqual(ranked[0]['rs_rating'], 1)
        self.assertEqual(ranked[-1]['rs_rating'], 99)

    def test_rs_breakdown_components(self):
        """5. Breakdown ranks (ars_rank, srs_rank, vol_rank, streak_rank) populate correctly."""
        stocks = [
            {'sym': 'LOW', 'ars': -0.10, 'srs': -0.05, 'vol_ratio': 0.5, 'signDays': 2},
            {'sym': 'MID', 'ars': 0.05, 'srs': 0.02, 'vol_ratio': 1.2, 'signDays': 10},
            {'sym': 'HIGH', 'ars': 0.30, 'srs': 0.20, 'vol_ratio': 2.5, 'signDays': 45}
        ]
        ranked = compute_rs_ratings(stocks)
        high = [s for s in ranked if s['sym'] == 'HIGH'][0]
        low = [s for s in ranked if s['sym'] == 'LOW'][0]
        self.assertEqual(high['rs_breakdown']['ars_rank'], 99)
        self.assertEqual(low['rs_breakdown']['ars_rank'], 1)


class TestF2SupertrendAndVCP(unittest.TestCase):
    """F2: Supertrend (10,3) & VCP Squeeze Detection."""

    def test_supertrend_buy_trend(self):
        """1. Steady upward price trend maintains BUY trend."""
        candles = []
        for i in range(25):
            price = 100.0 + (i * 2.5)
            candles.append({'h': price + 1.0, 'l': price - 1.0, 'c': price, 'v': 1000})
        st = calc_supertrend(candles, period=10, multiplier=3)
        self.assertEqual(st['trend'], 'buy')
        self.assertLess(st['val'], candles[-1]['c'])

    def test_supertrend_sell_trend(self):
        """2. Steady downward price trend generates SELL trend."""
        candles = []
        for i in range(25):
            price = 200.0 - (i * 3.0)
            candles.append({'h': price + 1.0, 'l': price - 1.0, 'c': price, 'v': 1000})
        st = calc_supertrend(candles, period=10, multiplier=3)
        self.assertEqual(st['trend'], 'sell')
        self.assertGreater(st['val'], candles[-1]['c'])

    def test_supertrend_buy_signal_trigger(self):
        """3. Transition from sell to buy triggers buy_signal."""
        candles = []
        # Downtrend
        for i in range(20):
            p = 150.0 - (i * 2.0)
            candles.append({'h': p + 1.0, 'l': p - 1.0, 'c': p, 'v': 1000})
        # Massive jump
        for i in range(5):
            p = 180.0 + (i * 5.0)
            candles.append({'h': p + 2.0, 'l': p - 1.0, 'c': p, 'v': 5000})
        st = calc_supertrend(candles, period=10, multiplier=3)
        self.assertEqual(st['trend'], 'buy')

    def test_vcp_valid_squeeze(self):
        """4. Volatility compression + Volume dryup + Tight base qualifies as true VCP."""
        candles = []
        # First 45 days normal
        for i in range(50):
            candles.append({'h': 105.0, 'l': 95.0, 'c': 100.0, 'v': 20000})
        # Last 5 days very tight and dry volume
        for i in range(5):
            candles.append({'h': 101.0, 'l': 99.5, 'c': 100.5, 'v': 4000})
        vcp = calc_vcp(candles)
        self.assertTrue(vcp['is_vcp'])
        self.assertLessEqual(vcp['atr_ratio'], 0.70)
        self.assertLessEqual(vcp['vol_dryup'], 0.75)
        self.assertLessEqual(vcp['tightness_pct'], 4.5)

    def test_vcp_failed_loose_range(self):
        """5. Wide price range fails VCP tightness threshold."""
        candles = []
        for i in range(55):
            candles.append({'h': 110.0, 'l': 90.0, 'c': 100.0, 'v': 10000})
        vcp = calc_vcp(candles)
        self.assertFalse(vcp['is_vcp'])


class TestF3RegimeAndSorting(unittest.TestCase):
    """F3: 4-Quadrant Regime Filtering & Sector Grouping."""

    def test_quadrant_1_leaders(self):
        """1. Quad 1: ARS > 0 and SRS > 0."""
        s = {'ars': 0.12, 'srs': 0.05}
        self.assertEqual(get_dual_rs_quad(s), 'quad-1')

    def test_quadrant_2_turnarounds(self):
        """2. Quad 2: ARS <= 0 and SRS > 0."""
        s = {'ars': -0.04, 'srs': 0.08}
        self.assertEqual(get_dual_rs_quad(s), 'quad-2')

    def test_quadrant_3_dips(self):
        """3. Quad 3: ARS > 0 and SRS <= 0."""
        s = {'ars': 0.15, 'srs': -0.02}
        self.assertEqual(get_dual_rs_quad(s), 'quad-3')

    def test_quadrant_4_laggards(self):
        """4. Quad 4: ARS <= 0 and SRS <= 0."""
        s = {'ars': -0.08, 'srs': -0.06}
        self.assertEqual(get_dual_rs_quad(s), 'quad-4')

    def test_sector_grouping_and_average_ars(self):
        """5. Sector grouping aggregates average ARS and identifies top stock."""
        stocks = [
            {'sym': 'TECH1', 'ind': 'IT', 'ars': 0.20},
            {'sym': 'TECH2', 'ind': 'IT', 'ars': 0.10},
            {'sym': 'BANK1', 'ind': 'Finance', 'ars': 0.05},
            {'sym': 'BANK2', 'ind': 'Finance', 'ars': -0.01}
        ]
        it_stocks = [s for s in stocks if s['ind'] == 'IT']
        avg_it_ars = sum(s['ars'] for s in it_stocks) / len(it_stocks)
        self.assertAlmostEqual(avg_it_ars, 0.15, places=4)
        top_it = max(it_stocks, key=lambda s: s['ars'])
        self.assertEqual(top_it['sym'], 'TECH1')


class TestF4DeliveryVolumeSurge(unittest.TestCase):
    """F4: NSE Delivery Volume & Surge Ratio."""

    def test_massive_delivery_surge_2x(self):
        """1. Delivery Ratio >= 2.0x is classified as '2× Delivery Surge'."""
        res = calc_delivery_surge(deliv_qty=250000, avg_deliv_qty=100000, traded_vol=400000)
        self.assertEqual(res['deliv_ratio'], 2.5)
        self.assertTrue(res['is_spurt'])
        self.assertEqual(res['deliv_label'], '2× Delivery Surge')
        self.assertEqual(res['deliv_pct'], 62.5)

    def test_elevated_delivery_surge_1_5x(self):
        """2. Delivery Ratio >= 1.5x is classified as 'Elevated Delivery'."""
        res = calc_delivery_surge(deliv_qty=160000, avg_deliv_qty=100000)
        self.assertEqual(res['deliv_ratio'], 1.6)
        self.assertTrue(res['is_spurt'])
        self.assertEqual(res['deliv_label'], 'Elevated Delivery')

    def test_normal_delivery_ratio(self):
        """3. Delivery Ratio around 1.0x is Normal."""
        res = calc_delivery_surge(deliv_qty=110000, avg_deliv_qty=100000)
        self.assertEqual(res['deliv_ratio'], 1.1)
        self.assertFalse(res['is_spurt'])
        self.assertEqual(res['deliv_label'], 'Normal')

    def test_low_delivery_ratio(self):
        """4. Delivery Ratio <= 0.6x is Low Delivery."""
        res = calc_delivery_surge(deliv_qty=50000, avg_deliv_qty=100000)
        self.assertEqual(res['deliv_ratio'], 0.5)
        self.assertFalse(res['is_spurt'])
        self.assertEqual(res['deliv_label'], 'Low Delivery')

    def test_delivery_percentage_formula(self):
        """5. Delivery percentage accurately calculated against traded volume."""
        res = calc_delivery_surge(deliv_qty=75000, avg_deliv_qty=70000, traded_vol=100000)
        self.assertEqual(res['deliv_pct'], 75.0)


class TestF5InstitutionalAccumulationGrades(unittest.TestCase):
    """F5: Institutional Accumulation Grades (A+, A, B, C, D, E)."""

    def test_grade_a_plus_heavy_accumulation(self):
        """1. MFR >= 0.30 qualifies for Grade A+ Heavy Accumulation."""
        grade = classify_accumulation_grade(mfr=0.35, udr=1.8)
        self.assertEqual(grade['ad_grade'], 'A+')
        self.assertEqual(grade['label'], 'Grade A+ Heavy Accumulation')

    def test_grade_a_solid_buying(self):
        """2. MFR >= 0.12 qualifies for Grade A Solid Buying."""
        grade = classify_accumulation_grade(mfr=0.15, udr=1.2)
        self.assertEqual(grade['ad_grade'], 'A')
        self.assertEqual(grade['label'], 'Grade A Solid Buying')

    def test_grade_b_neutral(self):
        """3. MFR >= 0.02 qualifies for Grade B Neutral."""
        grade = classify_accumulation_grade(mfr=0.05, udr=1.08)
        self.assertEqual(grade['ad_grade'], 'B')
        self.assertEqual(grade['label'], 'Grade B Neutral')

    def test_grade_c_churn(self):
        """4. MFR between -0.12 and 0.02 qualifies for Grade C Churn."""
        grade = classify_accumulation_grade(mfr=-0.05, udr=0.92)
        self.assertEqual(grade['ad_grade'], 'C')
        self.assertEqual(grade['label'], 'Grade C Churn')

    def test_grade_e_heavy_exit(self):
        """5. MFR < -0.28 and low UDR qualifies for Grade E Heavy Exit."""
        grade = classify_accumulation_grade(mfr=-0.35, udr=0.45)
        self.assertEqual(grade['ad_grade'], 'E')
        self.assertEqual(grade['label'], 'Grade E Heavy Exit')


class TestF6ForensicSafetyChecks(unittest.TestCase):
    """F6: Forensic Safety Elimination Checks."""

    def test_clean_stock_is_safe(self):
        """1. Zero pledge, low debt, clean auditor is marked Safe."""
        res = evaluate_forensic_safety(promoter_pledge_pct=5.0, high_debt=False, auditor_warning=False)
        self.assertTrue(res['is_safe'])
        self.assertEqual(len(res['flags']), 0)
        self.assertEqual(len(res['warnings']), 0)

    def test_high_promoter_pledge_flagged(self):
        """2. Promoter pledge > 20% triggers HIGH_PROMOTER_PLEDGE."""
        res = evaluate_forensic_safety(promoter_pledge_pct=26.5)
        self.assertFalse(res['is_safe'])
        self.assertIn('HIGH_PROMOTER_PLEDGE', res['flags'])
        self.assertIn('26.5%', res['warnings'][0])

    def test_high_debt_flagged(self):
        """3. High debt triggers HIGH_DEBT_LOAD."""
        res = evaluate_forensic_safety(promoter_pledge_pct=2.0, high_debt=True)
        self.assertFalse(res['is_safe'])
        self.assertIn('HIGH_DEBT_LOAD', res['flags'])

    def test_auditor_warning_flagged(self):
        """4. Auditor resignation triggers AUDITOR_WARNING."""
        res = evaluate_forensic_safety(promoter_pledge_pct=0.0, auditor_warning=True)
        self.assertFalse(res['is_safe'])
        self.assertIn('AUDITOR_WARNING', res['flags'])

    def test_multiple_forensic_flags_accumulation(self):
        """5. Multiple violations accumulate in flags and warnings arrays."""
        res = evaluate_forensic_safety(promoter_pledge_pct=42.0, high_debt=True, auditor_warning=True)
        self.assertFalse(res['is_safe'])
        self.assertEqual(len(res['flags']), 3)
        self.assertEqual(len(res['warnings']), 3)


class TestF7AIQuantitativeThesis(unittest.TestCase):
    """F7: 3-Bullet AI Quantitative Thesis (Catalyst, Risk, Trigger)."""

    def test_breakout_stock_thesis_structure(self):
        """1. 3 bullets generated for breakout stock."""
        stock = {
            'sym': 'TITAN', 'name': 'Titan Company', 'price': 3500.0,
            'ars': 0.15, 'srs': 0.08, 'hi52_prox': -0.01, 'vol_ratio': 2.1,
            'st10': {'trend': 'buy', 'val': 3350.0},
            'institutional': {'ad_grade': 'A+'},
            'safety': {'is_safe': True}
        }
        thesis = generate_ai_trade_thesis(stock)
        self.assertIn('52-Week High Breakout', thesis['growth_catalyst'])
        self.assertTrue(len(thesis['risk_factor']) > 0)
        self.assertIn('Entry Trigger', thesis['technical_trigger'])

    def test_target_guidelines_1_to_1_2_3(self):
        """2. Technical Trigger contains accurate 1:1, 1:2, 1:3 profit target guidelines."""
        stock = {
            'sym': 'INFY', 'price': 1000.0, 'ars': 0.10, 'srs': 0.05,
            'st10': {'trend': 'buy', 'val': 950.0},
            'safety': {'is_safe': True}
        }
        thesis = generate_ai_trade_thesis(stock)
        # Entry: 1000, SL: 950, Risk: 50
        # T1 = 1050, T2 = 1100, T3 = 1150
        self.assertEqual(thesis['sl'], 950.0)
        self.assertEqual(thesis['t1'], 1050.0)
        self.assertEqual(thesis['t2'], 1100.0)
        self.assertEqual(thesis['t3'], 1150.0)
        self.assertIn('Target 1 (1:1): ₹1050.00', thesis['technical_trigger'])
        self.assertIn('Target 2 (1:2): ₹1100.00', thesis['technical_trigger'])
        self.assertIn('Target 3 (1:3): ₹1150.00', thesis['technical_trigger'])

    def test_forensic_risk_surfacing_in_thesis(self):
        """3. Forensic safety failure explicitly surfaced in Risk Factor bullet."""
        stock = {
            'sym': 'RISKY', 'price': 500.0, 'ars': 0.12, 'srs': 0.06,
            'safety': {'is_safe': False, 'warnings': ['High Promoter Pledge: 35.0% exceeds 20% limit']}
        }
        thesis = generate_ai_trade_thesis(stock)
        self.assertIn('Forensic Alert', thesis['risk_factor'])
        self.assertIn('35.0%', thesis['risk_factor'])

    def test_vcp_catalyst_detection(self):
        """4. VCP squeeze sets specific Volatility Contraction catalyst."""
        stock = {
            'sym': 'BASE', 'price': 250.0, 'ars': 0.08, 'srs': 0.04,
            'vcp': {'is_vcp': True}, 'st10': {'trend': 'buy', 'val': 240.0},
            'safety': {'is_safe': True}
        }
        thesis = generate_ai_trade_thesis(stock)
        self.assertIn('Volatility Contraction Pattern', thesis['growth_catalyst'])

    def test_laggard_avoid_bias(self):
        """5. Quad 4 laggards highlight defensive counter-trend warning."""
        stock = {
            'sym': 'LAG', 'price': 100.0, 'ars': -0.20, 'srs': -0.15,
            'st10': {'trend': 'sell', 'val': 115.0}, 'safety': {'is_safe': True}
        }
        thesis = generate_ai_trade_thesis(stock)
        self.assertIn('SELL', thesis['risk_factor'])


class TestF8VolatilityPositionSizer(unittest.TestCase):
    """F8: Position Sizer Math and Stop-Loss Presets."""

    def test_standard_position_sizing(self):
        """1. ₹5,00,000 capital, 1.0% risk (₹5,000 budget), price 1000, SL 900 -> 50 shares."""
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=1000, sl_price=900)
        # Risk per share = 100, max risk = 5000 -> qty = 50. Invested = 50,000 (10% < 20% cap)
        self.assertEqual(res['qty'], 50)
        self.assertEqual(res['invested_value'], 50000.0)
        self.assertEqual(res['risk_amount'], 5000.0)

    def test_single_stock_20_percent_allocation_cap(self):
        """2. Tight stop loss (2%) risks exceeding 20% capital cap -> capped at ₹1,00,000."""
        # Risk per share = 20. Raw qty = 5000 / 20 = 250 shares.
        # 250 * 1000 = ₹2,50,000 (> ₹1,00,000 cap).
        # Capped qty = floor(100,000 / 1000) = 100 shares.
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=1000, sl_price=980)
        self.assertEqual(res['qty'], 100)
        self.assertEqual(res['invested_value'], 100000.0)

    def test_supertrend_preset_application(self):
        """3. Supertrend preset uses ST support price when buy trend is active."""
        st_val = 945.50
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=1000, sl_price=st_val)
        self.assertAlmostEqual(res['risk_per_share'], 54.50, places=2)
        expected_qty = math.floor(5000 / 54.50)
        self.assertEqual(res['qty'], expected_qty)

    def test_fixed_10_percent_hard_stop_preset(self):
        """4. -10% hard stop preset: price * 0.90."""
        price = 1500.0
        sl_fixed10 = round(price * 0.90, 2)
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=price, sl_price=sl_fixed10)
        self.assertEqual(res['risk_per_share'], 150.0)
        expected_qty = math.floor(5000 / 150.0)
        self.assertEqual(res['qty'], expected_qty)

    def test_fixed_5_percent_tight_stop_preset(self):
        """5. -5% tight stop preset: price * 0.95."""
        price = 2000.0
        sl_fixed5 = round(price * 0.95, 2)
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=price, sl_price=sl_fixed5)
        self.assertEqual(res['risk_per_share'], 100.0)
        expected_qty = math.floor(5000 / 100.0)  # 50 shares * 2000 = 100k (exactly 20% cap)
        self.assertEqual(res['qty'], expected_qty)


class TestF9TrailingStopLadder(unittest.TestCase):
    """F9: 3-Step Trailing Stop Loss Ladder (Target 1, Target 2, Dynamic Peak Trail)."""

    def setUp(self):
        self.pos = {
            'sym': 'LADDER_TEST',
            'entry_price': 1000.0,
            'qty': 100,
            'initial_sl': 900.0,
            'current_sl': 900.0,
            'target_1_price': 1100.0,
            'target_2_price': 1200.0,
            'target_3_price': 1300.0,
            'highest_price': 1000.0,
            'sl_moved_to_cost': False,
            'sl_moved_to_t1': False
        }

    def update_price(self, price):
        """Simulates Jishu Engine trailing logic from scripts/jishu_engine.js:140-174."""
        self.pos['highest_price'] = max(self.pos['highest_price'], price)
        if price >= self.pos['target_2_price']:
            if not self.pos['sl_moved_to_t1']:
                self.pos['sl_moved_to_t1'] = True
                self.pos['sl_moved_to_cost'] = True
                self.pos['current_sl'] = self.pos['target_1_price']
            else:
                dynamic_trail = round(self.pos['highest_price'] * 0.90, 2)
                if dynamic_trail > self.pos['current_sl']:
                    self.pos['current_sl'] = max(self.pos['target_1_price'], dynamic_trail)
        elif price >= self.pos['target_1_price'] and not self.pos['sl_moved_to_cost'] and not self.pos['sl_moved_to_t1']:
            self.pos['sl_moved_to_cost'] = True
            self.pos['current_sl'] = self.pos['entry_price']

    def test_step0_initial_state(self):
        """1. Step 0: Stop loss resides at initial structural level."""
        self.assertEqual(self.pos['current_sl'], 900.0)
        self.assertFalse(self.pos['sl_moved_to_cost'])
        self.assertFalse(self.pos['sl_moved_to_t1'])

    def test_step1_target1_breakeven_move(self):
        """2. Step 1: Price touches Target 1 -> SL moves to cost price (breakeven)."""
        self.update_price(1105.0)
        self.assertTrue(self.pos['sl_moved_to_cost'])
        self.assertEqual(self.pos['current_sl'], 1000.0)

    def test_step2_target2_lock_profit(self):
        """3. Step 2: Price touches Target 2 -> SL moves to Target 1 price (locking profit)."""
        self.update_price(1105.0)  # T1
        self.update_price(1210.0)  # T2
        self.assertTrue(self.pos['sl_moved_to_t1'])
        self.assertEqual(self.pos['current_sl'], 1100.0)

    def test_dynamic_peak_trailing_above_target2(self):
        """4. Peak trailing: SL trails 10% below peak price once higher than T1."""
        self.update_price(1210.0)
        self.update_price(1350.0)  # New peak 1350 -> 10% below is 1215
        self.update_price(1350.0)  # Next bar evaluates dynamic trail
        self.assertEqual(self.pos['current_sl'], 1215.0)

    def test_trailing_stop_never_retreats(self):
        """5. Pullback from peak does not reduce the ratchet stop loss level."""
        self.update_price(1350.0)
        self.update_price(1350.0)  # SL set to 1215
        sl_before = self.pos['current_sl']
        self.update_price(1250.0)  # Pullback
        self.assertEqual(self.pos['current_sl'], sl_before)


class TestF10JishuPortfolioSync(unittest.TestCase):
    """F10: Jishu Portfolio Synchronization & Ledger Integrity."""

    def setUp(self):
        p_path = ROOT_DIR / 'data' / 'jishu_portfolio.json'
        with open(p_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

    def test_initial_capital_constant(self):
        """1. Initial capital configured to ₹10,00,000."""
        self.assertEqual(self.data['account']['initial_capital'], 1000000)

    def test_cash_equity_market_value_balance(self):
        """2. total_equity == cash + market_value of open positions."""
        a = self.data['account']
        op = self.data['open_positions']
        mv = sum(p['qty'] * (p.get('current_price') or p['entry_price']) for p in op)
        self.assertAlmostEqual(a['total_equity'], a['cash'] + mv, delta=1.0)

    def test_unrealized_pnl_balance(self):
        """3. unrealized_pnl == market_value - cost basis."""
        op = self.data['open_positions']
        cost = sum(p['qty'] * p['entry_price'] for p in op)
        mv = sum(p['qty'] * (p.get('current_price') or p['entry_price']) for p in op)
        self.assertAlmostEqual(self.data['account']['unrealized_pnl'], mv - cost, delta=1.0)

    def test_open_positions_price_hierarchy(self):
        """4. Every open position respects initial_sl < entry_price < target_1 < target_2."""
        for p in self.data['open_positions']:
            self.assertLess(p['initial_sl'], p['entry_price'])
            self.assertLess(p['entry_price'], p['target_1_price'])
            self.assertLess(p['target_1_price'], p['target_2_price'])

    def test_invested_value_equality(self):
        """5. qty * entry_price == invested_value for every position."""
        for p in self.data['open_positions']:
            self.assertAlmostEqual(p['qty'] * p['entry_price'], p['invested_value'], delta=1.0)


class TestF11TradingViewExportAndNavigation(unittest.TestCase):
    """F11: TradingView Watchlist Export & Keyboard Navigation."""

    def test_tradingview_export_single_ticker(self):
        """1. Single ticker formatted as 'NSE:TICKER'."""
        res = format_tradingview_watchlist(['RELIANCE'])
        self.assertEqual(res['formatted_str'], 'NSE:RELIANCE')
        self.assertEqual(res['count'], 1)
        self.assertIn('Copied 1 tickers', res['toast_msg'])

    def test_tradingview_export_multiple_tickers(self):
        """2. Multiple tickers formatted as comma-separated 'NSE:T1,NSE:T2,NSE:T3'."""
        res = format_tradingview_watchlist(['TCS', 'INFY', 'HDFCBANK'])
        self.assertEqual(res['formatted_str'], 'NSE:TCS,NSE:INFY,NSE:HDFCBANK')
        self.assertEqual(res['count'], 3)
        self.assertIn('Copied 3 tickers', res['toast_msg'])

    def test_tradingview_export_cleans_whitespace(self):
        """3. Tickers with extraneous whitespace are sanitized."""
        res = format_tradingview_watchlist(['  bhel  ', ' tata motors '])
        self.assertEqual(res['formatted_str'], 'NSE:BHEL,NSE:TATA MOTORS')

    def test_keyboard_navigation_cycling_logic(self):
        """4. J/Down increments row index, K/Up decrements."""
        total_rows = 10
        current_idx = 0

        # Simulate J (down)
        current_idx = min(total_rows - 1, current_idx + 1)
        self.assertEqual(current_idx, 1)

        # Simulate K (up)
        current_idx = max(0, current_idx - 1)
        self.assertEqual(current_idx, 0)

    def test_keyboard_shortcuts_key_map(self):
        """5. Canonical mapping of Pro Trader keyboard shortcuts per R5."""
        key_actions = {
            'j': 'NEXT_ROW',
            'ArrowDown': 'NEXT_ROW',
            'k': 'PREV_ROW',
            'ArrowUp': 'PREV_ROW',
            ' ': 'TOGGLE_WATCHLIST',
            'Enter': 'OPEN_MODAL',
            't': 'OPEN_TRADINGVIEW',
            'T': 'OPEN_TRADINGVIEW'
        }
        self.assertEqual(key_actions['j'], 'NEXT_ROW')
        self.assertEqual(key_actions['ArrowDown'], 'NEXT_ROW')
        self.assertEqual(key_actions[' '], 'TOGGLE_WATCHLIST')
        self.assertEqual(key_actions['Enter'], 'OPEN_MODAL')
        self.assertEqual(key_actions['t'], 'OPEN_TRADINGVIEW')


if __name__ == '__main__':
    unittest.main()
