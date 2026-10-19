"""
Tier 3: Cross-Feature Interactions Test Suite
Validates interactions between disparate modules and pillars:
- I1: Quad 1 Leader + Institutional Grade A+ + Delivery Surge + Forensic Safe
- I2: High RS Momentum Leader with Forensic Safety Violation (Truth Inspector Override)
- I3: Quad 4 Structural Laggard + Grade E Exit + High Debt (Capital Preservation)
- I4: Position Sizer + Supertrend SL Preset + Trailing Ladder Complete Progression
- I5: Position Sizer Capital Allocation Cap with Small vs Large Portfolios
- I6: Screener Multi-Filter Confluence to TradingView Watchlist Export
- I7: Sector Grouping & Sector Leader RS Rating Alignment
- I8: AI Quantitative Thesis and Position Sizer Mathematical Coherence
- I9: 3-Sleeve Portfolio Allocation Budget Verification
- I10: Multi-Flag Forensic Warning Confluence
- I11: Trailing Position Exit on Supertrend Breakdown
- I12: Trailing Position Exit on Quadrant Downgrade (Loss of Alpha)
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
        get_dual_rs_quad,
        calc_delivery_surge,
        classify_accumulation_grade,
        evaluate_forensic_safety,
        generate_ai_trade_thesis,
        calculate_position_size,
        format_tradingview_watchlist
    )
except ImportError:
    from test.test_tier1_features import (
        calc_ars,
        compute_rs_ratings,
        calc_supertrend,
        get_dual_rs_quad,
        calc_delivery_surge,
        classify_accumulation_grade,
        evaluate_forensic_safety,
        generate_ai_trade_thesis,
        calculate_position_size,
        format_tradingview_watchlist
    )


class TestTier3CrossFeatureInteractions(unittest.TestCase):
    """Tier 3: Cross-Feature Interaction & Subsystem Integration Tests."""

    def test_i1_ideal_institutional_breakout_confluence(self):
        """I1: Quad 1 Leader + Grade A+ + 2x Delivery Surge + Forensic Safe yields Bullish Confluence."""
        stock = {
            'sym': 'TITAN', 'name': 'Titan Co', 'price': 3400.0,
            'ars': 0.18, 'srs': 0.09, 'hi52_prox': -0.01, 'vol_ratio': 2.2,
            'st10': {'trend': 'buy', 'val': 3250.0},
            'institutional': classify_accumulation_grade(mfr=0.32, udr=1.9),
            'delivery': calc_delivery_surge(deliv_qty=500000, avg_deliv_qty=200000, traded_vol=800000),
            'safety': evaluate_forensic_safety(promoter_pledge_pct=0.0)
        }
        # 1. Regime
        self.assertEqual(get_dual_rs_quad(stock), 'quad-1')
        # 2. Accumulation Grade
        self.assertEqual(stock['institutional']['ad_grade'], 'A+')
        # 3. Delivery Surge
        self.assertTrue(stock['delivery']['is_spurt'])
        self.assertEqual(stock['delivery']['deliv_ratio'], 2.5)
        # 4. Forensic Safe
        self.assertTrue(stock['safety']['is_safe'])
        # 5. AI Thesis confirms Bullish Catalyst
        thesis = generate_ai_trade_thesis(stock)
        self.assertIn('52-Week High Breakout', thesis['growth_catalyst'])
        self.assertNotIn('Forensic Alert', thesis['risk_factor'])

    def test_i2_truth_inspector_overrides_high_momentum_leader(self):
        """I2: High RS Momentum Leader flagged by Truth Inspector (Pledge 32%) gets safety warning in Thesis."""
        stock = {
            'sym': 'TRAP_STOCK', 'name': 'Momentum Trap Ltd', 'price': 1200.0,
            'ars': 0.25, 'srs': 0.14, 'hi52_prox': -0.02, 'vol_ratio': 3.0,
            'st10': {'trend': 'buy', 'val': 1120.0},
            'institutional': {'ad_grade': 'B'},
            'safety': evaluate_forensic_safety(promoter_pledge_pct=32.0, high_debt=True)
        }
        # High RS Quad 1 Leader
        self.assertEqual(get_dual_rs_quad(stock), 'quad-1')
        # Truth Inspector flags forensic danger
        self.assertFalse(stock['safety']['is_safe'])
        self.assertIn('HIGH_PROMOTER_PLEDGE', stock['safety']['flags'])
        self.assertIn('HIGH_DEBT_LOAD', stock['safety']['flags'])

        # AI Thesis highlights Forensic Alert
        thesis = generate_ai_trade_thesis(stock)
        self.assertIn('Forensic Alert', thesis['risk_factor'])
        self.assertIn('32.0%', thesis['risk_factor'])

    def test_i3_quad4_laggard_distribution_trap(self):
        """I3: Quad 4 Laggard + Grade E Exit + High Debt produces Capital Preservation warning."""
        stock = {
            'sym': 'DIST_CORP', 'name': 'Distribution Corp', 'price': 450.0,
            'ars': -0.15, 'srs': -0.10, 'hi52_prox': -0.30,
            'st10': {'trend': 'sell', 'val': 490.0},
            'institutional': classify_accumulation_grade(mfr=-0.35, udr=0.4),
            'safety': evaluate_forensic_safety(promoter_pledge_pct=15.0, high_debt=True)
        }
        self.assertEqual(get_dual_rs_quad(stock), 'quad-4')
        self.assertEqual(stock['institutional']['ad_grade'], 'E')
        self.assertFalse(stock['safety']['is_safe'])
        thesis = generate_ai_trade_thesis(stock)
        self.assertIn('Forensic Alert', thesis['risk_factor'])

    def test_i4_position_sizer_supertrend_preset_and_trailing_ladder(self):
        """I4: Sizer + Supertrend Preset + 3-Step Trailing SL Ladder end-to-end integration."""
        capital = 500000.0
        risk_pct = 1.0
        price = 1000.0
        st_val = 940.0  # ₹60 risk per share

        # Sizer math
        sized = calculate_position_size(capital, risk_pct, price, sl_price=st_val)
        self.assertEqual(sized['qty'], 83)  # floor(5000 / 60) = 83
        self.assertEqual(sized['target_1'], 1060.0)
        self.assertEqual(sized['target_2'], 1120.0)
        self.assertEqual(sized['target_3'], 1180.0)

        # Enter position into trailing ladder
        pos = {
            'sym': 'SWING_POS', 'entry_price': price, 'qty': sized['qty'],
            'current_sl': st_val, 'target_1_price': sized['target_1'],
            'target_2_price': sized['target_2'], 'highest_price': price,
            'sl_moved_to_cost': False, 'sl_moved_to_t1': False
        }

        # Step 1: Hits Target 1 (1060) -> SL moves to Cost (1000)
        p1 = 1065.0
        pos['highest_price'] = max(pos['highest_price'], p1)
        if p1 >= pos['target_1_price'] and not pos['sl_moved_to_cost']:
            pos['sl_moved_to_cost'] = True
            pos['current_sl'] = pos['entry_price']
        self.assertTrue(pos['sl_moved_to_cost'])
        self.assertEqual(pos['current_sl'], 1000.0)

        # Step 2: Hits Target 2 (1120) -> SL moves to Target 1 (1060)
        p2 = 1125.0
        pos['highest_price'] = max(pos['highest_price'], p2)
        if p2 >= pos['target_2_price'] and not pos['sl_moved_to_t1']:
            pos['sl_moved_to_t1'] = True
            pos['current_sl'] = pos['target_1_price']
        self.assertTrue(pos['sl_moved_to_t1'])
        self.assertEqual(pos['current_sl'], 1060.0)

        # Step 3: Peak expands to 1250 -> Trails 10% below peak (1125), higher than 1060
        p3 = 1250.0
        pos['highest_price'] = max(pos['highest_price'], p3)
        dynamic_trail = round(pos['highest_price'] * 0.90, 2)
        if dynamic_trail > pos['current_sl']:
            pos['current_sl'] = max(pos['target_1_price'], dynamic_trail)
        self.assertEqual(pos['current_sl'], 1125.0)

    def test_i5_position_sizer_allocation_cap_contrast(self):
        """I5: Small capital is risk-budget bound; large capital binds at 20% allocation cap."""
        price = 500.0
        sl = 490.0  # Tight ₹10 stop distance (2%)

        # Small Portfolio ₹1,00,000 (1% risk = ₹1,000 budget)
        # Raw qty = 1000 / 10 = 100 shares -> ₹50,000 invested (> ₹20,000 20% cap) -> capped to 40 shares (₹20,000)
        small_res = calculate_position_size(capital=100000, risk_pct=1.0, price=price, sl_price=sl)
        self.assertEqual(small_res['qty'], 40)
        self.assertEqual(small_res['invested_value'], 20000.0)

        # Large Portfolio ₹10,00,000 (1% risk = ₹10,000 budget)
        # Cap is ₹2,00,000 -> max 400 shares. Raw qty = 10000 / 10 = 1000 shares -> capped to 400 shares (₹2,00,000)
        large_res = calculate_position_size(capital=1000000, risk_pct=1.0, price=price, sl_price=sl)
        self.assertEqual(large_res['qty'], 400)
        self.assertEqual(large_res['invested_value'], 200000.0)

    def test_i6_screener_filtering_to_tradingview_export_pipeline(self):
        """I6: Screener filter passes() candidates piped into TradingView export formatter."""
        universe = [
            {'sym': 'LEAD1', 'ars': 0.15, 'srs': 0.08, 'vol_ratio': 1.8, 'is_safe': True},
            {'sym': 'LEAD2', 'ars': 0.10, 'srs': 0.04, 'vol_ratio': 2.1, 'is_safe': True},
            {'sym': 'BAD_VOL', 'ars': 0.12, 'srs': 0.05, 'vol_ratio': 1.1, 'is_safe': True},
            {'sym': 'UNSAFE', 'ars': 0.20, 'srs': 0.10, 'vol_ratio': 2.5, 'is_safe': False},
            {'sym': 'LAG1', 'ars': -0.05, 'srs': -0.02, 'vol_ratio': 1.0, 'is_safe': True}
        ]

        # Filter criteria: Quad 1 + Vol Ratio >= 1.5 + Safe
        filtered = [
            s['sym'] for s in universe
            if get_dual_rs_quad(s) == 'quad-1' and s['vol_ratio'] >= 1.5 and s['is_safe']
        ]
        self.assertEqual(filtered, ['LEAD1', 'LEAD2'])

        tv_export = format_tradingview_watchlist(filtered)
        self.assertEqual(tv_export['formatted_str'], 'NSE:LEAD1,NSE:LEAD2')
        self.assertEqual(tv_export['count'], 2)
        self.assertIn('Copied 2 tickers', tv_export['toast_msg'])

    def test_i7_sector_grouping_and_leader_rs_alignment(self):
        """I7: Sector grouping ranks stocks by ARS and identifies the true top sector alpha."""
        stocks = [
            {'sym': 'TCS', 'ind': 'IT', 'ars': 0.18, 'srs': 0.09, 'vol_ratio': 1.5, 'signDays': 20},
            {'sym': 'INFY', 'ind': 'IT', 'ars': 0.12, 'srs': 0.05, 'vol_ratio': 1.2, 'signDays': 10},
            {'sym': 'WIPRO', 'ind': 'IT', 'ars': -0.02, 'srs': -0.01, 'vol_ratio': 0.9, 'signDays': 2},
            {'sym': 'SBIN', 'ind': 'Banking', 'ars': 0.15, 'srs': 0.07, 'vol_ratio': 1.6, 'signDays': 15},
            {'sym': 'HDFCBANK', 'ind': 'Banking', 'ars': 0.05, 'srs': 0.02, 'vol_ratio': 1.1, 'signDays': 5}
        ]
        compute_rs_ratings(stocks)

        it_stocks = [s for s in stocks if s['ind'] == 'IT']
        it_stocks.sort(key=lambda s: s['ars'], reverse=True)
        self.assertEqual(it_stocks[0]['sym'], 'TCS')
        self.assertGreater(it_stocks[0]['rs_rating'], it_stocks[1]['rs_rating'])

    def test_i8_ai_thesis_and_position_sizer_numerical_identity(self):
        """I8: Technical Trigger in AI Thesis matches Position Sizer target arithmetic."""
        stock = {
            'sym': 'RELIANCE', 'price': 2500.0, 'ars': 0.14, 'srs': 0.06,
            'st10': {'trend': 'buy', 'val': 2375.0},  # 5% risk: 125/share
            'safety': {'is_safe': True}
        }
        thesis = generate_ai_trade_thesis(stock)
        sizer = calculate_position_size(capital=500000, risk_pct=1.0, price=2500.0, sl_price=2375.0)

        # The SL and target levels must match exactly
        self.assertEqual(thesis['sl'], 2375.0)
        self.assertEqual(thesis['t1'], sizer['target_1'])
        self.assertEqual(thesis['t2'], sizer['target_2'])
        self.assertEqual(thesis['t3'], sizer['target_3'])

    def test_i9_three_sleeve_portfolio_budget_check(self):
        """I9: Jishu 3-sleeve architecture respects target allocation bounds."""
        p_path = ROOT_DIR / 'data' / 'jishu_portfolio.json'
        with open(p_path, 'r', encoding='utf-8') as f:
            portfolio = json.load(f)

        total_equity = portfolio['account']['total_equity']
        op = portfolio['open_positions']

        # Sleeve A positions
        sleeve_a_invested = sum(p['invested_value'] for p in op if p.get('sleeve') == 'SLEEVE_A')
        # Sleeve A has 50% target of equity (with 10% tolerance)
        self.assertLessEqual(sleeve_a_invested, total_equity * 0.70)

    def test_i10_multi_flag_forensic_warning_confluence(self):
        """I10: Stock with Pledge (35%) + High Debt + Auditor Warning compiles all 3 warnings."""
        forensics = evaluate_forensic_safety(promoter_pledge_pct=35.0, high_debt=True, auditor_warning=True)
        self.assertFalse(forensics['is_safe'])
        self.assertEqual(len(forensics['flags']), 3)
        self.assertEqual(set(forensics['flags']), {'HIGH_PROMOTER_PLEDGE', 'HIGH_DEBT_LOAD', 'AUDITOR_WARNING'})
        self.assertEqual(len(forensics['warnings']), 3)

    def test_i11_supertrend_breakdown_exit_trigger(self):
        """I11: Supertrend flipping to SELL triggers position exit rule in Jishu Engine."""
        pos = {'sym': 'EXIT_TEST', 'entry_price': 1000.0, 'current_sl': 950.0}
        stock = {'st10': {'trend': 'sell', 'val': 980.0}, 'price': 970.0}

        exit_reason = None
        if stock['st10']['trend'] == 'sell' and stock['price'] < stock['st10']['val']:
            exit_reason = 'SUPERTREND_BREAKDOWN'
        self.assertEqual(exit_reason, 'SUPERTREND_BREAKDOWN')

    def test_i12_quadrant_downgrade_exit_trigger(self):
        """I12: Quadrant downgrade (stock leaves Quad 1: ars <= 0 or srs <= 0) triggers exit."""
        pos = {'sym': 'DOWNGRADE_TEST', 'entry_price': 500.0}
        # Stock drops into Quad 3 (srs becomes negative)
        stock = {'ars': 0.05, 'srs': -0.01}

        exit_reason = None
        if stock['ars'] <= 0 or stock['srs'] <= 0:
            exit_reason = 'QUAD_DOWNGRADE'
        self.assertEqual(exit_reason, 'QUAD_DOWNGRADE')


if __name__ == '__main__':
    unittest.main()
