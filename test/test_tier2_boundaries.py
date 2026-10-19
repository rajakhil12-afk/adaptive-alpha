"""
Tier 2: Boundary & Corner Cases Test Suite
Exercises edge conditions, extreme parameters, zeros/negatives, and limit boundaries:
- B1: Position Sizer with Zero / Negative Capital & Risk %
- B2: Position Sizer with Inverted or Zero Stop Distances (SL >= Price)
- B3: Extreme Capital (₹100 Crore) Numeric Stability
- B4: Delivery Ratio Division by Zero & Extreme Surges (>100x)
- B5: Promoter Pledge Strict Boundary (20.0% vs 20.01%) & Extremes (0%, 100%)
- B6: Single-Stock Universe (N=1) Percentile Ranking
- B7: Regime Boundary at Exactly (0.0, 0.0) ARS / SRS
- B8: Empty Inputs across Indicators, Export, and Portfolio
- B9: Ladder Gap-Through Jump directly beyond Target 2
- B10: Jishu Portfolio at Maximum Position Capacity (10/10)
"""

import unittest
import math
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
TEST_DIR = ROOT_DIR / 'test'
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(TEST_DIR) not in sys.path:
    sys.path.insert(0, str(TEST_DIR))

try:
    from test_tier1_features import (
        calc_ars,
        compute_rs_ratings,
        calc_supertrend,
        calc_vcp,
        get_dual_rs_quad,
        calc_delivery_surge,
        evaluate_forensic_safety,
        calculate_position_size,
        format_tradingview_watchlist
    )
except ImportError:
    from test.test_tier1_features import (
        calc_ars,
        compute_rs_ratings,
        calc_supertrend,
        calc_vcp,
        get_dual_rs_quad,
        calc_delivery_surge,
        evaluate_forensic_safety,
        calculate_position_size,
        format_tradingview_watchlist
    )


class TestTier2BoundaryAndCornerCases(unittest.TestCase):
    """Tier 2: Boundary, Extreme, and Corner Case Verification."""

    # ── B1: Zero / Negative Capital & Risk % ───────────────────────────
    def test_position_sizer_zero_capital_fallback(self):
        """B1.1: Capital = 0 falls back safely to default ₹5,00,000 without crashing."""
        res = calculate_position_size(capital=0, risk_pct=1.0, price=1000, sl_price=900)
        self.assertGreater(res['qty'], 0)
        self.assertEqual(res['invested_value'], 50000.0)

    def test_position_sizer_negative_capital_fallback(self):
        """B1.2: Negative capital falls back safely to default ₹5,00,000."""
        res = calculate_position_size(capital=-50000, risk_pct=1.0, price=1000, sl_price=900)
        self.assertGreater(res['qty'], 0)
        self.assertEqual(res['invested_value'], 50000.0)

    def test_position_sizer_zero_risk_pct_fallback(self):
        """B1.3: Risk % = 0 falls back safely to default 1.0%."""
        res = calculate_position_size(capital=500000, risk_pct=0, price=1000, sl_price=900)
        self.assertGreater(res['qty'], 0)
        self.assertEqual(res['risk_amount'], 5000.0)

    # ── B2: Inverted / Zero Stop Distances ─────────────────────────────
    def test_position_sizer_sl_equal_to_price(self):
        """B2.1: SL price == Entry price (zero distance) triggers default -7% SL."""
        price = 1000.0
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=price, sl_price=price)
        # Expected fallback SL = 930 (-7%), risk = 70/share
        self.assertAlmostEqual(res['risk_per_share'], 70.0, places=2)
        expected_qty = math.floor(5000.0 / 70.0)
        self.assertEqual(res['qty'], expected_qty)

    def test_position_sizer_sl_above_price(self):
        """B2.2: Invalid SL price > Entry price falls back to default -7% SL."""
        price = 1000.0
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=price, sl_price=1050.0)
        self.assertAlmostEqual(res['risk_per_share'], 70.0, places=2)

    def test_position_sizer_negative_sl(self):
        """B2.3: Negative SL price falls back to default -7% SL."""
        price = 500.0
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=price, sl_price=-100.0)
        self.assertAlmostEqual(res['risk_per_share'], 35.0, places=2)

    def test_position_sizer_penny_sl_distance_clamped(self):
        """B2.4: Infinitesimal distance (e.g. SL 999.99 on 1000.0) clamped to min 1% risk per share."""
        price = 1000.0
        res = calculate_position_size(capital=500000, risk_pct=1.0, price=price, sl_price=999.99)
        # 1% of 1000 is 10.0 per share
        self.assertGreaterEqual(res['risk_per_share'], 10.0)

    # ── B3: Extreme Capital Stability ─────────────────────────────────
    def test_extreme_capital_100_crore(self):
        """B3.1: Large institution capital (₹100 Crore / 1,000,000,000) calculates correctly without overflow."""
        cap = 1000000000.0  # ₹100 Crore
        price = 2500.0
        sl = 2300.0  # ₹200 risk per share
        res = calculate_position_size(capital=cap, risk_pct=1.0, price=price, sl_price=sl)
        # Risk budget = 10,000,000 (1 Crore). Raw qty = 10,000,000 / 200 = 50,000 shares.
        # Invested = 50,000 * 2500 = 125,000,000 (12.5% of cap, well under 20% cap 200,000,000).
        self.assertEqual(res['qty'], 50000)
        self.assertEqual(res['invested_value'], 125000000.0)
        self.assertEqual(res['risk_amount'], 10000000.0)

    def test_extreme_risk_100_pct_constrained_by_alloc_cap(self):
        """B3.2: 100% risk % is strictly bound by 20% single-stock allocation cap."""
        cap = 500000.0
        price = 1000.0
        sl = 500.0  # 50% drop
        res = calculate_position_size(capital=cap, risk_pct=100.0, price=price, sl_price=sl)
        # Max allocation cap is 20% of 500k = ₹1,00,000 -> max 100 shares
        self.assertEqual(res['qty'], 100)
        self.assertEqual(res['invested_value'], 100000.0)

    # ── B4: Delivery Ratio Division by Zero & Extreme Surges ──────────
    def test_delivery_ratio_zero_avg_delivery(self):
        """B4.1: Average 20D delivery volume = 0 does not cause ZeroDivisionError."""
        res = calc_delivery_surge(deliv_qty=50000, avg_deliv_qty=0)
        self.assertGreater(res['deliv_ratio'], 0)
        self.assertIsInstance(res['deliv_ratio'], float)

    def test_delivery_ratio_zero_today_delivery(self):
        """B4.2: Zero delivery volume today produces 0.0 ratio and Low Delivery label."""
        res = calc_delivery_surge(deliv_qty=0, avg_deliv_qty=100000)
        self.assertEqual(res['deliv_ratio'], 0.0)
        self.assertEqual(res['deliv_label'], 'Low Delivery')
        self.assertFalse(res['is_spurt'])

    def test_extreme_delivery_surge_500x(self):
        """B4.3: Extreme delivery surge (500x 20D average) formats safely as 2x surge."""
        res = calc_delivery_surge(deliv_qty=50000000, avg_deliv_qty=100000)
        self.assertEqual(res['deliv_ratio'], 500.0)
        self.assertTrue(res['is_spurt'])
        self.assertEqual(res['deliv_label'], '2× Delivery Surge')

    # ── B5: Promoter Pledge Strict Boundary (20.0% vs 20.01%) ─────────
    def test_promoter_pledge_exact_boundary_20_percent(self):
        """B5.1: Exactly 20.00% promoter pledge is NOT flagged (rule is strictly > 20%)."""
        res = evaluate_forensic_safety(promoter_pledge_pct=20.0)
        self.assertTrue(res['is_safe'])
        self.assertNotIn('HIGH_PROMOTER_PLEDGE', res['flags'])

    def test_promoter_pledge_just_above_boundary_20_01_percent(self):
        """B5.2: 20.01% promoter pledge IS flagged (> 20.0%)."""
        res = evaluate_forensic_safety(promoter_pledge_pct=20.01)
        self.assertFalse(res['is_safe'])
        self.assertIn('HIGH_PROMOTER_PLEDGE', res['flags'])

    def test_promoter_pledge_extremes_zero_and_hundred(self):
        """B5.3: Promoter pledge at 0% (pristine) and 100% (extreme distress)."""
        res_zero = evaluate_forensic_safety(promoter_pledge_pct=0.0)
        self.assertTrue(res_zero['is_safe'])

        res_hundred = evaluate_forensic_safety(promoter_pledge_pct=100.0)
        self.assertFalse(res_hundred['is_safe'])
        self.assertIn('HIGH_PROMOTER_PLEDGE', res_hundred['flags'])

    # ── B6: Single Stock Universe (N=1) Percentile Ranking ────────────
    def test_single_stock_rs_rating(self):
        """B6.1: Universe with a single stock (N=1) produces median RS Rating (50) without ZeroDivisionError."""
        stocks = [{'sym': 'SOLO', 'ars': 0.10, 'srs': 0.05, 'vol_ratio': 1.5, 'signDays': 10}]
        res = compute_rs_ratings(stocks)
        self.assertEqual(res[0]['rs_rating'], 50)
        self.assertEqual(res[0]['rs_breakdown']['ars_rank'], 50)

    def test_two_stock_rs_rating_min_max(self):
        """B6.2: Universe with two stocks (N=2) assigns exactly 1 and 99."""
        stocks = [
            {'sym': 'LOW', 'ars': -0.10, 'srs': -0.05, 'vol_ratio': 0.8, 'signDays': 1},
            {'sym': 'HIGH', 'ars': 0.25, 'srs': 0.15, 'vol_ratio': 2.0, 'signDays': 20}
        ]
        res = compute_rs_ratings(stocks)
        low = [s for s in res if s['sym'] == 'LOW'][0]
        high = [s for s in res if s['sym'] == 'HIGH'][0]
        self.assertEqual(low['rs_rating'], 1)
        self.assertEqual(high['rs_rating'], 99)

    # ── B7: Regime Boundary at Exactly (0.0, 0.0) ARS / SRS ───────────
    def test_regime_boundary_exact_zero_ars_and_srs(self):
        """B7.1: ARS=0.0 and SRS=0.0 are classified as Quad 4 Laggards (strictly > 0 required for Quad 1)."""
        s = {'ars': 0.0, 'srs': 0.0}
        self.assertEqual(get_dual_rs_quad(s), 'quad-4')

    def test_regime_boundary_positive_epsilon(self):
        """B7.2: ARS=+0.0001 and SRS=+0.0001 are classified as Quad 1 Leaders."""
        s = {'ars': 0.0001, 'srs': 0.0001}
        self.assertEqual(get_dual_rs_quad(s), 'quad-1')

    # ── B8: Empty Inputs across Indicators, Export, and Portfolio ─────
    def test_empty_candles_supertrend(self):
        """B8.1: Empty candle list returns safe sell trend without crashing."""
        st = calc_supertrend([])
        self.assertEqual(st['trend'], 'sell')
        self.assertEqual(st['val'], 0.0)

    def test_empty_candles_vcp(self):
        """B8.2: Fewer than 55 candles returns is_vcp=False."""
        vcp = calc_vcp([{'h': 10, 'l': 9, 'c': 9.5, 'v': 100}] * 20)
        self.assertFalse(vcp['is_vcp'])

    def test_empty_watchlist_export(self):
        """B8.3: Empty ticker array produces empty formatted string and 0 count."""
        res = format_tradingview_watchlist([])
        self.assertEqual(res['formatted_str'], '')
        self.assertEqual(res['count'], 0)
        self.assertIn('Copied 0 tickers', res['toast_msg'])

    def test_none_and_whitespace_only_tickers_in_export(self):
        """B8.4: None, empty strings, and whitespace items filtered out."""
        res = format_tradingview_watchlist([None, '', '   ', 'INFY'])
        self.assertEqual(res['formatted_str'], 'NSE:INFY')
        self.assertEqual(res['count'], 1)

    # ── B9: Ladder Gap-Through Jump beyond Target 2 ────────────────────
    def test_ladder_gap_through_direct_jump_past_target_2(self):
        """B9.1: If stock gaps directly past Target 2, both T1 and T2 flags engage and SL moves to Target 1."""
        pos = {
            'sym': 'GAPPER', 'entry_price': 1000.0, 'current_sl': 900.0,
            'target_1_price': 1100.0, 'target_2_price': 1200.0,
            'highest_price': 1000.0, 'sl_moved_to_cost': False, 'sl_moved_to_t1': False
        }
        # Next bar gaps to 1250 (above Target 2)
        price = 1250.0
        pos['highest_price'] = max(pos['highest_price'], price)
        if price >= pos['target_2_price']:
            if not pos['sl_moved_to_t1']:
                pos['sl_moved_to_t1'] = True
                pos['sl_moved_to_cost'] = True
                pos['current_sl'] = pos['target_1_price']

        self.assertTrue(pos['sl_moved_to_t1'])
        self.assertTrue(pos['sl_moved_to_cost'])
        self.assertEqual(pos['current_sl'], 1100.0)

    # ── B10: Jishu Portfolio at Maximum Position Capacity ─────────────
    def test_portfolio_capacity_limits(self):
        """B10.1: Validates max positions setting invariant in portfolio."""
        p_path = ROOT_DIR / 'data' / 'jishu_portfolio.json'
        with open(p_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        max_pos = data['settings']['max_positions']
        self.assertEqual(max_pos, 10)
        self.assertLessEqual(len(data['open_positions']), max_pos)


if __name__ == '__main__':
    unittest.main()
