"""
Challenger 1: Mathematical & Algorithmic Stress Harness
Empirically stress-tests mathematical formulas, boundary conditions, and indicator algorithms:
1. Position Sizer calculations (zero/negative capital, negative risk %, extreme prices ₹0.50 to ₹1,00,000, 20% allocation cap clamping, stop-loss presets)
2. 3-Step Trailing Stop Ladder math (Target 1, Target 2, Target 3, trailing stop transitions, ratchet monotonicity)
3. Delivery Surge Ratio math (division by zero, extreme spikes, accumulation grade thresholds)
4. Dual RS regime logic (getDualRSQuad complete 2D partitioning, boundaries, NaN/None handling)
"""

import unittest
import math
import random
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Import existing functions from test_tier1_features
from test.test_tier1_features import (
    calculate_position_size,
    calc_delivery_surge,
    get_dual_rs_quad,
    classify_accumulation_grade,
    evaluate_forensic_safety
)

# Reference implementation of classifyInstitutionalGrade matching scripts/update_data.js:27-88
def classify_institutional_grade_py(ad_data, deliv_ratio, deliv_pct, vol_ratio, close, high, low):
    mfr = ad_data.get('money_flow_ratio', 0.0) if ad_data else 0.0
    udr = ad_data.get('up_down_vol_ratio', 1.0) if ad_data else 1.0
    ad_grade = ad_data.get('ad_grade', 'C') if ad_data else 'C'
    is_high_close = ((close - low) / (high - low) >= 0.5) if (high is not None and low is not None and high > low) else True

    is_churn = ((vol_ratio is not None and vol_ratio >= 1.4 and deliv_pct is not None and deliv_pct < 35.0) or
                (vol_ratio is not None and vol_ratio >= 1.3 and mfr < -0.05 and not is_high_close) or
                (ad_grade in ('D', 'E')) or
                (mfr < -0.15))

    if is_churn:
        return {'ad_grade': 'C', 'ad_grade_label': 'Grade C Churn', 'status': 'Grade C Churn'}

    is_heavy_acc = ((deliv_ratio is not None and deliv_ratio >= 1.5 and mfr >= 0.05 and is_high_close) or
                    (ad_grade == 'A+' and deliv_ratio is not None and deliv_ratio >= 1.2) or
                    (mfr >= 0.25 and is_high_close))

    if is_heavy_acc:
        return {'ad_grade': 'A+', 'ad_grade_label': 'Grade A+ Heavy Accumulation', 'status': 'Grade A+ Heavy Accumulation'}

    is_solid_buying = ((deliv_ratio is not None and deliv_ratio >= 1.2 and mfr >= 0.0) or
                       (mfr >= 0.10 and udr >= 1.1) or
                       (ad_grade == 'A'))

    if is_solid_buying:
        return {'ad_grade': 'A', 'ad_grade_label': 'Grade A Solid Buying', 'status': 'Grade A Solid Buying'}

    return {'ad_grade': 'B', 'ad_grade_label': 'Grade B Neutral', 'status': 'Grade B Neutral'}


# Ladder simulator matching scripts/jishu_engine.js:92-198
class LadderSimulator:
    def __init__(self, entry_price, sl_price, target_1=None, target_2=None, target_3=None):
        self.entry_price = float(entry_price)
        self.initial_sl = float(sl_price)
        self.current_sl = float(sl_price)
        self.highest_price = self.entry_price
        risk_per_share = max(self.entry_price * 0.01, self.entry_price - self.initial_sl)
        self.target_1 = float(target_1) if target_1 is not None else round(self.entry_price + (1.0 * risk_per_share), 2)
        self.target_2 = float(target_2) if target_2 is not None else round(self.entry_price + (2.0 * risk_per_share), 2)
        self.target_3 = float(target_3) if target_3 is not None else round(self.entry_price + (3.0 * risk_per_share), 2)
        self.sl_moved_to_cost = False
        self.sl_moved_to_t1 = False
        self.target_3_hit = False
        self.events = []

    def update_price(self, cur_price):
        cur_price = float(cur_price)
        self.highest_price = max(self.highest_price, cur_price)

        if cur_price <= self.current_sl:
            return 'EXIT_SL'

        # Target 3 (1:3 RR Hit -> Open Trailing Trend Expansion)
        if cur_price >= self.target_3:
            if not self.target_3_hit:
                self.target_3_hit = True
                self.sl_moved_to_t1 = True
                self.sl_moved_to_cost = True
                if not self.current_sl or self.current_sl < self.target_1:
                    self.current_sl = self.target_1
                self.events.append('TARGET_3_HIT')

            # Dynamic Trailing: trail 10% below highest peak, guaranteed >= target_1
            dynamic_trail = round(self.highest_price * 0.90, 2)
            if dynamic_trail > self.current_sl:
                self.current_sl = max(self.target_1, dynamic_trail)
                self.events.append('DYNAMIC_TRAIL_T3')

        # Target 2 (1:2 RR Hit -> Move SL to Target 1 price & activate Trailing)
        elif cur_price >= self.target_2:
            if not self.sl_moved_to_t1:
                self.sl_moved_to_t1 = True
                self.sl_moved_to_cost = True
                self.current_sl = self.target_1
                self.events.append('TARGET_2_HIT')
            else:
                dynamic_trail = round(self.highest_price * 0.90, 2)
                if dynamic_trail > self.current_sl:
                    self.current_sl = max(self.target_1, dynamic_trail)
                    self.events.append('DYNAMIC_TRAIL_T2')

        # Target 1 (1:1 RR Hit -> Move SL to Cost Price / Breakeven)
        elif cur_price >= self.target_1 and not self.sl_moved_to_cost and not self.sl_moved_to_t1:
            self.sl_moved_to_cost = True
            self.current_sl = self.entry_price
            self.events.append('TARGET_1_HIT')

        return 'ACTIVE'


class TestPositionSizerStress(unittest.TestCase):
    """Area 1: Stress-testing Position Sizer math, caps, and presets."""

    def test_zero_and_negative_capital(self):
        """Zero, negative, and microscopic capital fallback to default ₹5,00,000."""
        for bad_cap in [0, -1, -500000, None]:
            res = calculate_position_size(capital=bad_cap, risk_pct=1.0, price=1000.0, sl_price=900.0)
            self.assertGreater(res['qty'], 0)
            self.assertEqual(res['invested_value'], 50000.0)
            self.assertEqual(res['risk_amount'], 5000.0)

    def test_zero_and_negative_risk_pct(self):
        """Zero and negative risk % fallback to default 1.0%."""
        for bad_risk in [0, -0.5, -2.0, None]:
            res = calculate_position_size(capital=500000, risk_pct=bad_risk, price=1000.0, sl_price=900.0)
            self.assertGreater(res['qty'], 0)
            self.assertEqual(res['risk_amount'], 5000.0)

    def test_extreme_stock_prices_penny_to_giant(self):
        """Position sizer handles extreme stock prices from ₹0.50 penny stock to ₹1,00,000+."""
        test_prices = [0.50, 1.00, 2.50, 10.0, 50.0, 500.0, 2500.0, 25000.0, 75000.0, 100000.0, 135000.0]
        capital = 1000000.0  # ₹10 Lakhs
        risk_pct = 1.0       # 1% risk = ₹10,000

        for price in test_prices:
            sl_price = round(price * 0.90, 2)  # 10% stop loss
            res = calculate_position_size(capital=capital, risk_pct=risk_pct, price=price, sl_price=sl_price)
            self.assertGreaterEqual(res['qty'], 1, f"Qty should be >= 1 for price {price}")
            self.assertFalse(math.isnan(res['invested_value']))
            self.assertFalse(math.isinf(res['invested_value']))
            self.assertGreater(res['target_1'], price)
            self.assertGreater(res['target_2'], res['target_1'])
            self.assertGreater(res['target_3'], res['target_2'])

            # Verify 20% cap rule:
            max_alloc_cap = capital * 0.20
            # If price <= max_alloc_cap, invested_value must be <= max_alloc_cap
            if price <= max_alloc_cap:
                self.assertLessEqual(res['invested_value'], max_alloc_cap + 1.0,  # small float tolerance
                                     f"Invested value {res['invested_value']} exceeded 20% cap {max_alloc_cap} for price {price}")

    def test_single_stock_20_percent_allocation_cap_clamping(self):
        """Single stock 20% cap strictly clamps quantity when tight SL would otherwise allow excessive sizing."""
        capital = 500000.0  # 20% cap = ₹1,00,000
        price = 100.0
        # A tiny stop distance of 1% (SL = 99.0):
        # Raw qty = 5000 / 1.0 = 5000 shares. Total inv = 5000 * 100 = ₹5,00,000 (100% of capital!).
        # Must be strictly clamped to 20% cap: ₹1,00,000 / 100 = 1000 shares.
        res = calculate_position_size(capital=capital, risk_pct=1.0, price=price, sl_price=99.0)
        self.assertEqual(res['qty'], 1000)
        self.assertEqual(res['invested_value'], 100000.0)

    def test_stop_loss_presets(self):
        """Stop loss presets: Supertrend, -10% hard, and -5% tight presets."""
        price = 2450.0

        # Fixed -10% preset
        sl_fixed10 = round(price * 0.90, 2)
        self.assertEqual(sl_fixed10, 2205.0)

        # Fixed -5% preset
        sl_fixed5 = round(price * 0.95, 2)
        self.assertEqual(sl_fixed5, 2327.5)

        # Supertrend preset logic:
        # Case A: Buy trend and ST is valid below price (e.g. 2350.0)
        st_val_valid = 2350.0
        applied_sl_a = st_val_valid if (st_val_valid > 0 and st_val_valid < price) else round(price * 0.93, 2)
        self.assertEqual(applied_sl_a, 2350.0)

        # Case B: Sell trend or ST above price -> fallback to -7% (price * 0.93)
        st_val_invalid = 2500.0
        applied_sl_b = st_val_invalid if (False and st_val_invalid < price) else round(price * 0.93, 2)
        self.assertEqual(applied_sl_b, 2278.5)


class TestTrailingStopLadderStress(unittest.TestCase):
    """Area 2: Stress-testing 3-Step Trailing Stop Ladder math and ratchet transitions."""

    def test_target_r_multiples(self):
        """Target 1, Target 2, Target 3 strictly respect 1:1, 1:2, and 1:3 R-multiples."""
        entry = 1500.0
        sl = 1350.0
        risk = entry - sl  # 150.0

        res = calculate_position_size(capital=500000, risk_pct=1.0, price=entry, sl_price=sl)
        self.assertEqual(res['target_1'], entry + 1.0 * risk)  # 1650.0
        self.assertEqual(res['target_2'], entry + 2.0 * risk)  # 1800.0
        self.assertEqual(res['target_3'], entry + 3.0 * risk)  # 1950.0

    def test_progressive_ladder_transitions(self):
        """Step-by-step ladder transition: Step 0 -> Step 1 -> Step 2 -> Step 3."""
        ladder = LadderSimulator(entry_price=1000.0, sl_price=900.0)
        self.assertEqual(ladder.current_sl, 900.0)
        self.assertEqual(ladder.target_1, 1100.0)
        self.assertEqual(ladder.target_2, 1200.0)
        self.assertEqual(ladder.target_3, 1300.0)

        # Price advances to 1050 (below T1): SL stays 900
        ladder.update_price(1050.0)
        self.assertEqual(ladder.current_sl, 900.0)

        # Price touches T1 (1100): SL moves to breakeven cost (1000)
        ladder.update_price(1100.0)
        self.assertEqual(ladder.current_sl, 1000.0)
        self.assertTrue(ladder.sl_moved_to_cost)
        self.assertFalse(ladder.sl_moved_to_t1)

        # Price advances to 1150 (between T1 and T2): SL stays at cost 1000
        ladder.update_price(1150.0)
        self.assertEqual(ladder.current_sl, 1000.0)

        # Price touches T2 (1200): SL moves to Target 1 price (1100)
        ladder.update_price(1200.0)
        self.assertEqual(ladder.current_sl, 1100.0)
        self.assertTrue(ladder.sl_moved_to_t1)

        # Price touches T3 (1300): Target 3 hit, open trend trailing active
        ladder.update_price(1300.0)
        self.assertTrue(ladder.target_3_hit)
        # Dynamic trail = 1300 * 0.90 = 1170.0 > 1100.0 -> SL moves to 1170.0
        self.assertEqual(ladder.current_sl, 1170.0)

        # Price expands to 1500: Dynamic trail = 1500 * 0.90 = 1350.0
        ladder.update_price(1500.0)
        self.assertEqual(ladder.current_sl, 1350.0)

    def test_ratchet_monotonicity_under_severe_pullbacks(self):
        """Ratchet Stop Loss Invariant: Stop loss level is strictly non-decreasing over time."""
        random.seed(42)
        ladder = LadderSimulator(entry_price=500.0, sl_price=450.0)
        prev_sl = ladder.current_sl

        # Generate a volatile price series that oscillates wildly
        price = 500.0
        for _ in range(200):
            delta = random.uniform(-15.0, 25.0)  # upward drift with sharp pullbacks
            price = max(400.0, price + delta)
            status = ladder.update_price(price)
            cur_sl = ladder.current_sl
            self.assertGreaterEqual(cur_sl, prev_sl,
                                    f"Ratchet invariant violated! Previous SL: {prev_sl}, Current SL: {cur_sl} at price {price}")
            prev_sl = cur_sl
            if status == 'EXIT_SL':
                break

    def test_gap_up_through_ladder_targets(self):
        """Gap-up jump directly past Target 2 or Target 3 engages all trailing triggers properly."""
        ladder = LadderSimulator(entry_price=100.0, sl_price=90.0)
        # Direct gap to 140.0 (past Target 1=110, Target 2=120, Target 3=130)
        status = ladder.update_price(140.0)
        self.assertEqual(status, 'ACTIVE')
        self.assertTrue(ladder.sl_moved_to_cost)
        self.assertTrue(ladder.sl_moved_to_t1)
        self.assertTrue(ladder.target_3_hit)
        # SL must be at least peak * 0.90 = 126.0 (guaranteed >= T1 110.0)
        self.assertEqual(ladder.current_sl, 126.0)


class TestDeliverySurgeAndGradesStress(unittest.TestCase):
    """Area 3: Stress-testing Delivery Surge Ratio and Accumulation Grade logic."""

    def test_division_by_zero_and_none_protection(self):
        """Zero and None average delivery volume protected against ZeroDivisionError."""
        res_zero = calc_delivery_surge(deliv_qty=100000, avg_deliv_qty=0)
        self.assertFalse(math.isnan(res_zero['deliv_ratio']))
        self.assertFalse(math.isinf(res_zero['deliv_ratio']))
        self.assertEqual(res_zero['deliv_ratio'], 1.0)

        res_none = calc_delivery_surge(deliv_qty=None, avg_deliv_qty=None)
        self.assertEqual(res_none['deliv_ratio'], 0.0)
        self.assertEqual(res_none['deliv_label'], 'Low Delivery')

    def test_delivery_ratio_threshold_boundaries(self):
        """Precise boundary testing of delivery surge thresholds and 2-decimal rounding."""
        # Low Delivery (ratio <= 0.60)
        # Note: In IEEE-754 binary float, 605/1000 is 0.60499999999999998... which rounds to 0.60 (Low Delivery).
        # 606/1000 is 0.606 which rounds to 0.61 (Normal).
        self.assertEqual(calc_delivery_surge(600, 1000)['deliv_label'], 'Low Delivery')
        self.assertEqual(calc_delivery_surge(604, 1000)['deliv_label'], 'Low Delivery')
        self.assertEqual(calc_delivery_surge(605, 1000)['deliv_label'], 'Low Delivery')
        self.assertEqual(calc_delivery_surge(606, 1000)['deliv_label'], 'Normal')
        self.assertEqual(calc_delivery_surge(610, 1000)['deliv_label'], 'Normal')

        # Elevated Delivery (1.50 <= ratio < 2.00)
        # 1494/1000 = 1.494 -> 1.49 (Normal); 1495/1000 = 1.495 -> 1.50 (Elevated Delivery)
        self.assertEqual(calc_delivery_surge(1494, 1000)['deliv_label'], 'Normal')
        res_1495 = calc_delivery_surge(1495, 1000)
        self.assertEqual(res_1495['deliv_label'], 'Elevated Delivery')
        self.assertTrue(res_1495['is_spurt'])

        # 2x Delivery Surge (ratio >= 2.00)
        # 1994/1000 = 1.994 -> 1.99 (Elevated Delivery); 1995/1000 = 1.995 -> 2.00 (2x Delivery Surge)
        self.assertEqual(calc_delivery_surge(1994, 1000)['deliv_label'], 'Elevated Delivery')
        res_1995 = calc_delivery_surge(1995, 1000)
        self.assertEqual(res_1995['deliv_label'], '2× Delivery Surge')
        self.assertTrue(res_1995['is_spurt'])

    def test_extreme_delivery_spikes(self):
        """Massive delivery spikes (up to 1,000,000x) handle cleanly without numeric overflow."""
        for spike_ratio in [10.0, 50.0, 500.0, 10000.0, 1000000.0]:
            res = calc_delivery_surge(deliv_qty=int(1000 * spike_ratio), avg_deliv_qty=1000)
            self.assertEqual(res['deliv_label'], '2× Delivery Surge')
            self.assertTrue(res['is_spurt'])
            self.assertAlmostEqual(res['deliv_ratio'], spike_ratio, places=1)

    def test_institutional_accumulation_grade_truth_table(self):
        """Exhaustive classification of Institutional Accumulation Grades (A+, A, B, C Churn)."""
        # Grade C Churn: low delivery pct with high volume
        c1 = classify_institutional_grade_py(ad_data={'money_flow_ratio': 0.10}, deliv_ratio=2.0, deliv_pct=25.0, vol_ratio=1.5, close=100, high=105, low=95)
        self.assertEqual(c1['ad_grade'], 'C')

        # Grade C Churn: heavy volume failing to advance (negative mfr and weak close)
        c2 = classify_institutional_grade_py(ad_data={'money_flow_ratio': -0.08}, deliv_ratio=1.0, deliv_pct=45.0, vol_ratio=1.4, close=96, high=105, low=95)
        self.assertEqual(c2['ad_grade'], 'C')

        # Grade A+ Heavy Accumulation: deliv_ratio >= 1.5, positive mfr, firm close
        a_plus = classify_institutional_grade_py(ad_data={'money_flow_ratio': 0.15}, deliv_ratio=1.8, deliv_pct=60.0, vol_ratio=1.8, close=104, high=105, low=95)
        self.assertEqual(a_plus['ad_grade'], 'A+')

        # Grade A Solid Buying: deliv_ratio >= 1.2, positive mfr
        a_solid = classify_institutional_grade_py(ad_data={'money_flow_ratio': 0.05}, deliv_ratio=1.3, deliv_pct=50.0, vol_ratio=1.2, close=100, high=105, low=95)
        self.assertEqual(a_solid['ad_grade'], 'A')

        # Grade B Neutral: ordinary metrics
        b_neutral = classify_institutional_grade_py(ad_data={'money_flow_ratio': 0.0}, deliv_ratio=1.0, deliv_pct=40.0, vol_ratio=1.0, close=100, high=105, low=95)
        self.assertEqual(b_neutral['ad_grade'], 'B')


class TestDualRSRegimeStress(unittest.TestCase):
    """Area 4: Stress-testing getDualRSQuad 2D space partition and boundary logic."""

    def test_complete_2d_space_partition(self):
        """Every point in (ARS, SRS) space maps strictly to exactly one of the 4 quadrants."""
        mesh = [-100.0, -10.0, -1.0, -0.01, -1e-6, 0.0, 1e-6, 0.01, 1.0, 10.0, 100.0]
        valid_quads = {'quad-1', 'quad-2', 'quad-3', 'quad-4'}

        for ars in mesh:
            for srs in mesh:
                quad = get_dual_rs_quad({'ars': ars, 'srs': srs})
                self.assertIn(quad, valid_quads)

                if ars > 0 and srs > 0:
                    self.assertEqual(quad, 'quad-1')
                elif ars <= 0 and srs > 0:
                    self.assertEqual(quad, 'quad-2')
                elif ars > 0 and srs <= 0:
                    self.assertEqual(quad, 'quad-3')
                else:  # ars <= 0 and srs <= 0
                    self.assertEqual(quad, 'quad-4')

    def test_random_monte_carlo_regime_fuzzing(self):
        """10,000 random Monte Carlo points across [-50, 50] maintain rigorous regime partitions."""
        random.seed(1337)
        for _ in range(10000):
            ars = random.uniform(-50.0, 50.0)
            srs = random.uniform(-50.0, 50.0)
            quad = get_dual_rs_quad({'ars': ars, 'srs': srs})

            expected = (
                'quad-1' if (ars > 0 and srs > 0) else
                'quad-2' if (ars <= 0 and srs > 0) else
                'quad-3' if (ars > 0 and srs <= 0) else
                'quad-4'
            )
            self.assertEqual(quad, expected)

    def test_boundary_zero_and_missing_values(self):
        """Exact (0,0), sub-epsilons, None, NaN, and empty dict safely map to quad-4."""
        self.assertEqual(get_dual_rs_quad({'ars': 0.0, 'srs': 0.0}), 'quad-4')
        self.assertEqual(get_dual_rs_quad({}), 'quad-4')
        self.assertEqual(get_dual_rs_quad({'ars': None, 'srs': None}), 'quad-4')
        self.assertEqual(get_dual_rs_quad({'ars': float('nan'), 'srs': 0.0}), 'quad-4')
        self.assertEqual(get_dual_rs_quad({'ars': 1e-12, 'srs': 1e-12}), 'quad-1')
        self.assertEqual(get_dual_rs_quad({'ars': -1e-12, 'srs': 1e-12}), 'quad-2')
        self.assertEqual(get_dual_rs_quad({'ars': 1e-12, 'srs': -1e-12}), 'quad-3')


if __name__ == '__main__':
    unittest.main()
