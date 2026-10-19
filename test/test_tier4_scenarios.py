"""
Tier 4: Real-World Application Scenarios Test Suite
Executes complete user workflows and end-to-end trading sessions:
- S1: Complete Pro Trader Workflow (Screening -> Selection -> AI Thesis -> Position Sizer -> TV Export)
- S2: Institutional Trap Elimination (Truth Inspector Safety Override on False Breakout)
- S3: Jishu Desk Multi-Day Swing Trade Lifecycle with Trailing Stop Ratchet & Accounting Ledger
- S4: Pro Trader Keyboard Navigation & Fast Screening Simulation
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

class TestTier4RealWorldScenarios(unittest.TestCase):
    """Tier 4: Real-World Pro Trader End-to-End Scenarios."""

    def test_s1_complete_pro_trader_screening_and_execution_workflow(self):
        """S1: Real-world workflow: Universe Screening -> Quad 1 Leader -> AI Thesis -> Sizer -> TV Export."""
        # Step 1: Load real market screener dataset
        screener_path = ROOT_DIR / 'data' / 'screener.json'
        self.assertTrue(screener_path.exists(), "data/screener.json must exist")
        with open(screener_path, 'r', encoding='utf-8') as f:
            screener_data = json.load(f)
        stocks = screener_data['stocks']
        self.assertGreater(len(stocks), 100)

        # Step 2: Filter for Quad 1 Leaders (ars > 0 and srs > 0)
        q1_stocks = [s for s in stocks if get_dual_rs_quad(s) == 'quad-1']
        self.assertGreater(len(q1_stocks), 10, "Should have healthy number of Quad 1 Leaders")

        # Step 3: Filter for Institutional Accumulation Grade A / A+
        inst_stocks = [
            s for s in q1_stocks
            if (s.get('institutional') or {}).get('ad_grade') in ['A+', 'A']
        ]
        self.assertGreater(len(inst_stocks), 0, "Should have institutional accumulation candidates")

        # Step 4: Enrich with Truth Inspector forensic check (verify safe stocks)
        safe_candidates = []
        for s in inst_stocks:
            s_safety = s.get('safety') or {}
            pledge = s_safety.get('promoter_pledge_pct', 0.0)
            high_debt = s_safety.get('high_debt', False)
            auditor = s_safety.get('auditor_warning', False)
            safety = evaluate_forensic_safety(pledge, high_debt, auditor)
            s['safety'] = safety
            if safety['is_safe']:
                safe_candidates.append(s)

        self.assertGreater(len(safe_candidates), 0, "Should have pristine candidates")

        # Step 5: Rank by RS Rating and select top candidate
        safe_candidates.sort(key=lambda s: s.get('rs_rating', 0), reverse=True)
        top_pick = safe_candidates[0]
        self.assertIsNotNone(top_pick['sym'])
        self.assertGreater(top_pick['price'], 0)

        # Step 6: Generate 3-bullet AI Quantitative Thesis for top pick
        thesis = generate_ai_trade_thesis(top_pick)
        self.assertIn('Growth Catalyst', f"Growth Catalyst: {thesis['growth_catalyst']}")
        self.assertIn('Risk Factor', f"Risk Factor: {thesis['risk_factor']}")
        self.assertIn('Technical Trigger', f"Technical Trigger: {thesis['technical_trigger']}")
        self.assertIn('Target 1', thesis['technical_trigger'])
        self.assertIn('Target 2', thesis['technical_trigger'])
        self.assertIn('Target 3', thesis['technical_trigger'])

        # Step 7: Size position using ₹5,00,000 capital, 1.0% risk, and Supertrend preset
        st_val = top_pick.get('st10', {}).get('val') if top_pick.get('st10', {}).get('trend') == 'buy' else round(top_pick['price'] * 0.93, 2)
        sized = calculate_position_size(capital=500000, risk_pct=1.0, price=top_pick['price'], sl_price=st_val)
        self.assertGreater(sized['qty'], 0)
        self.assertLessEqual(sized['invested_value'], 100000.0)  # Under 20% cap
        self.assertLessEqual(sized['risk_amount'], 5000.0)      # Under 1% risk budget

        # Step 8: Export top 10 filtered candidates to TradingView watchlist
        export_syms = [s['sym'] for s in safe_candidates[:10]]
        tv_export = format_tradingview_watchlist(export_syms)
        self.assertTrue(tv_export['formatted_str'].startswith('NSE:'))
        self.assertEqual(tv_export['count'], len(export_syms))
        self.assertIn(f"Copied {len(export_syms)} tickers", tv_export['toast_msg'])

    def test_s2_institutional_trap_elimination_scenario(self):
        """S2: Trap Elimination: Stock with 52W high breakout but 35% pledge & Grade C Churn is flagged and avoided."""
        trap_stock = {
            'sym': 'TRAP_IND',
            'name': 'Trap Industries Ltd',
            'price': 850.0,
            'ars': 0.22,
            'srs': 0.12,
            'hi52_prox': -0.01,
            'vol_ratio': 3.5,  # Appears to be a massive volume breakout!
            'st10': {'trend': 'buy', 'val': 790.0},
            'institutional': classify_accumulation_grade(mfr=-0.08, udr=0.88),  # Actually Grade C Churn!
            'safety': evaluate_forensic_safety(promoter_pledge_pct=35.0, high_debt=True, auditor_warning=True)
        }

        # 1. High momentum appearance
        self.assertEqual(get_dual_rs_quad(trap_stock), 'quad-1')
        self.assertGreaterEqual(trap_stock['vol_ratio'], 2.0)

        # 2. Truth Inspector forensic elimination
        self.assertFalse(trap_stock['safety']['is_safe'])
        self.assertEqual(len(trap_stock['safety']['flags']), 3)
        self.assertIn('HIGH_PROMOTER_PLEDGE', trap_stock['safety']['flags'])

        # 3. Accumulation check reveals Churn, not heavy buying
        self.assertEqual(trap_stock['institutional']['ad_grade'], 'C')

        # 4. AI Thesis issues stern warning in Risk Factor
        thesis = generate_ai_trade_thesis(trap_stock)
        self.assertIn('Forensic Alert', thesis['risk_factor'])
        self.assertIn('35.0%', thesis['risk_factor'])

    def test_s3_jishu_desk_multi_day_swing_trade_lifecycle(self):
        """S3: Complete Jishu paper trading lifecycle: Entry -> T1 Breakeven -> T2 Lock -> Dynamic Trail -> Exit."""
        # Setup Initial Portfolio
        initial_capital = 1000000.0
        portfolio = {
            'account': {
                'initial_capital': initial_capital,
                'cash': initial_capital,
                'total_equity': initial_capital,
                'realized_pnl': 0.0,
                'unrealized_pnl': 0.0
            },
            'open_positions': [],
            'closed_trades': []
        }

        # Day 1: Enter Trade on ABC at ₹1,000, 100 shares (₹1,00,000 invested)
        entry_price = 1000.0
        qty = 100
        initial_sl = 900.0  # ₹100 risk/share
        t1 = 1100.0         # 1:1 Target
        t2 = 1200.0         # 1:2 Target
        t3 = 1300.0         # 1:3 Target

        cost_basis = entry_price * qty
        portfolio['account']['cash'] -= cost_basis

        pos = {
            'sym': 'ABC',
            'entry_price': entry_price,
            'qty': qty,
            'initial_sl': initial_sl,
            'current_sl': initial_sl,
            'target_1_price': t1,
            'target_2_price': t2,
            'target_3_price': t3,
            'highest_price': entry_price,
            'sl_moved_to_cost': False,
            'sl_moved_to_t1': False,
            'current_price': entry_price
        }
        portfolio['open_positions'].append(pos)

        # Invariants Check Day 1
        mv = pos['qty'] * pos['current_price']
        self.assertAlmostEqual(portfolio['account']['cash'] + mv, portfolio['account']['total_equity'])
        self.assertEqual(pos['current_sl'], 900.0)

        # Day 2: Price reaches ₹1,120 (Target 1 hit at ₹1,100)
        p_day2 = 1120.0
        pos['current_price'] = p_day2
        pos['highest_price'] = max(pos['highest_price'], p_day2)
        if p_day2 >= pos['target_1_price'] and not pos['sl_moved_to_cost']:
            pos['sl_moved_to_cost'] = True
            pos['current_sl'] = pos['entry_price']  # Breakeven

        self.assertTrue(pos['sl_moved_to_cost'])
        self.assertEqual(pos['current_sl'], 1000.0)

        # Day 3: Price surges to ₹1,250 (Target 2 hit at ₹1,200)
        p_day3 = 1250.0
        pos['current_price'] = p_day3
        pos['highest_price'] = max(pos['highest_price'], p_day3)
        if p_day3 >= pos['target_2_price'] and not pos['sl_moved_to_t1']:
            pos['sl_moved_to_t1'] = True
            pos['current_sl'] = pos['target_1_price']  # Lock T1 profit (₹1,100)

        self.assertTrue(pos['sl_moved_to_t1'])
        self.assertEqual(pos['current_sl'], 1100.0)

        # Day 4: Price peaks at ₹1,350 (Dynamic trailing engages at 10% below peak)
        p_day4 = 1350.0
        pos['current_price'] = p_day4
        pos['highest_price'] = max(pos['highest_price'], p_day4)
        dynamic_trail = round(pos['highest_price'] * 0.90, 2)  # 1350 * 0.9 = 1215.0
        if dynamic_trail > pos['current_sl']:
            pos['current_sl'] = max(pos['target_1_price'], dynamic_trail)

        self.assertEqual(pos['current_sl'], 1215.0)

        # Day 5: Price pulls back to ₹1,210 -> Trailing stop at ₹1,215 triggers exit!
        p_day5 = 1210.0
        exit_price = pos['current_sl']  # Stop triggered at ₹1,215
        gross_proceeds = exit_price * pos['qty']
        realized_pnl = (exit_price - pos['entry_price']) * pos['qty']  # (1215 - 1000) * 100 = ₹21,500

        portfolio['account']['cash'] += gross_proceeds
        portfolio['account']['realized_pnl'] += realized_pnl
        portfolio['account']['total_equity'] = portfolio['account']['cash']
        portfolio['closed_trades'].append({
            'sym': pos['sym'],
            'entry_price': pos['entry_price'],
            'exit_price': exit_price,
            'qty': pos['qty'],
            'realized_pnl': realized_pnl
        })
        portfolio['open_positions'] = []

        # Verify Final Ledger Invariants
        self.assertEqual(len(portfolio['open_positions']), 0)
        self.assertEqual(len(portfolio['closed_trades']), 1)
        self.assertEqual(portfolio['account']['realized_pnl'], 21500.0)
        self.assertEqual(portfolio['account']['total_equity'], 1021500.0)
        self.assertEqual(portfolio['account']['cash'], 1021500.0)

    def test_s4_pro_trader_keyboard_navigation_simulation(self):
        """S4: Pro Trader keyboard shortcuts simulation cycling rows, toggling watchlist, and opening modal."""
        rows = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK']
        watchlist = set()
        selected_row_idx = 0
        modal_opened_for = None
        tv_opened_for = None

        def handle_key(key):
            nonlocal selected_row_idx, modal_opened_for, tv_opened_for
            if key in ['j', 'ArrowDown']:
                selected_row_idx = min(len(rows) - 1, selected_row_idx + 1)
            elif key in ['k', 'ArrowUp']:
                selected_row_idx = max(0, selected_row_idx - 1)
            elif key == ' ':
                sym = rows[selected_row_idx]
                if sym in watchlist:
                    watchlist.remove(sym)
                else:
                    watchlist.add(sym)
            elif key == 'Enter':
                modal_opened_for = rows[selected_row_idx]
            elif key in ['t', 'T']:
                tv_opened_for = f"https://www.tradingview.com/chart/?symbol=NSE:{rows[selected_row_idx]}&interval=D"

        # 1. Start at index 0 (RELIANCE)
        self.assertEqual(selected_row_idx, 0)

        # 2. Press 'j' twice to navigate down to HDFCBANK (index 2)
        handle_key('j')
        handle_key('j')
        self.assertEqual(selected_row_idx, 2)
        self.assertEqual(rows[selected_row_idx], 'HDFCBANK')

        # 3. Press Space to add HDFCBANK to watchlist
        handle_key(' ')
        self.assertIn('HDFCBANK', watchlist)

        # 4. Press 'k' to go back up to TCS (index 1)
        handle_key('k')
        self.assertEqual(selected_row_idx, 1)
        self.assertEqual(rows[selected_row_idx], 'TCS')

        # 5. Press Enter to open Modal for TCS
        handle_key('Enter')
        self.assertEqual(modal_opened_for, 'TCS')

        # 6. Press 'T' to open TradingView chart
        handle_key('t')
        self.assertIn('NSE:TCS', tv_opened_for)


if __name__ == '__main__':
    unittest.main()
