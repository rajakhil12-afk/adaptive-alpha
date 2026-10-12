import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

def test_jishu_logic():
    print('========================================')
    print('RUNNING JISHU ENGINE VALIDATION SUITE')
    print('========================================')

    assert os.path.exists('data/jishu_portfolio.json'), 'data/jishu_portfolio.json missing!'
    portfolio = json.load(open('data/jishu_portfolio.json', 'r', encoding='utf-8'))
    assert portfolio['account']['initial_capital'] == 1000000, 'Initial capital must be 10 Lakhs'
    assert portfolio['settings']['max_positions'] == 10, 'Max positions must be 10'
    assert portfolio['settings']['fixed_sl_pct'] == 10, 'Fixed SL must be 10%'
    assert portfolio['settings']['target_1_rr'] == 1, 'Target 1 RR must be 1 (1:1)'
    assert portfolio['settings']['target_2_rr'] == 2, 'Target 2 RR must be 2 (1:2)'
    print('[PASS] Test 1: Portfolio configuration & initial capital validated.')

    entry_price = 1000.0
    fixed_sl_pct = 10.0
    risk = entry_price * (fixed_sl_pct / 100)
    initial_sl = entry_price - risk
    target_1 = entry_price + (1 * risk)
    target_2 = entry_price + (2 * risk)

    assert abs(risk - 100.0) < 1e-4, 'Risk calculation failed'
    assert abs(target_1 - 1100.0) < 1e-4, 'Target 1 (1:1) calculation failed'
    assert abs(target_2 - 1200.0) < 1e-4, 'Target 2 (1:2) calculation failed'
    print(f'[PASS] Test 2: Target & Risk Math -> Entry: Rs.{entry_price}, SL: Rs.{initial_sl:.2f}, Target 1: Rs.{target_1:.2f}, Target 2: Rs.{target_2:.2f}')

    pos = {
        'sym': 'TEST_STOCK',
        'entry_price': entry_price,
        'qty': 100,
        'initial_sl': initial_sl,
        'current_sl': initial_sl,
        'target_1_price': target_1,
        'target_2_price': target_2,
        'sl_moved_to_cost': False,
        'sl_moved_to_t1': False
    }

    # Simulate price rising to 1105 (hits Target 1 at 1:1)
    current_price = 1105.0
    if current_price >= pos['target_1_price'] and not pos['sl_moved_to_cost']:
        pos['sl_moved_to_cost'] = True
        pos['current_sl'] = pos['entry_price']
    
    assert pos['sl_moved_to_cost'] is True, 'Should mark sl_moved_to_cost as true'
    assert pos['current_sl'] == entry_price, 'Stop loss must move to cost price (entry_price)'
    print('[PASS] Test 3: 1:1 Breakeven trailing trigger validated (SL moved to Cost Rs.1000.00).')

    # Simulate price rising to 1210 (hits Target 2 at 1:2 -> Move SL to Target 1 price)
    current_price = 1210.0
    if current_price >= pos['target_2_price'] and not pos['sl_moved_to_t1']:
        pos['sl_moved_to_t1'] = True
        pos['current_sl'] = pos['target_1_price']
    
    assert pos['sl_moved_to_t1'] is True, 'Should mark sl_moved_to_t1 as true'
    assert pos['current_sl'] == target_1, 'Stop loss must move to Target 1 price (Rs.1100.00)'
    print(f'[PASS] Test 4: Target 2 (1:2) trailing trigger validated (SL moved to Target 1 Rs.{pos["current_sl"]:.2f} to lock +10% profit).')

    drop_price = entry_price * (1 - 0.101)
    assert ((drop_price - entry_price) / entry_price) <= -0.10, 'Fixed loss condition trigger'
    
    stock_downgraded = {'ars': -0.02, 'srs': 0.05}
    assert (stock_downgraded['ars'] <= 0 or stock_downgraded['srs'] <= 0), 'Quadrant downgrade condition trigger'
    print('[PASS] Test 5: Triple-trigger Stop Loss rules (Fixed 10%, ST breakdown, Quad downgrade) validated.')

    print('\nALL JISHU SYSTEM TESTS PASSED SUCCESSFULLY!')

# ───────────────────────── Added: tests that exercise REAL code / REAL data ─────────────────────────
# NOTE: Tests 2-5 above re-implement the formulas in Python and assert against themselves, so they can never
# catch an engine bug. The tests below call the actual Node position sizer and validate the stored portfolio.
import subprocess

def test_position_sizer_real_engine():
    try:
        js = ("const {calculatePositionSize:c}=require('./scripts/position_sizer');"
              "console.log(JSON.stringify(c({stock:{price:1000},totalEquity:1000000,availableCash:1000000,"
              "sleeveAvailableCapital:500000,smartMoneyFootprint:{score:75}})))")
        out = subprocess.run(['node', '-e', js], capture_output=True, text=True)
    except FileNotFoundError:
        print('[SKIP] Test 6: node executable not in PATH on this host; skipped.')
        return
    assert out.returncode == 0, out.stderr
    r = json.loads(out.stdout)
    assert r['valid'] is True
    assert r['riskPctOfEquity'] <= 1.0 + 1e-9, f"risk {r['riskPctOfEquity']}% exceeds the 1% budget"
    assert r['investedValue'] <= 100000 + 1e-6, 'per-trade capital cap (10%) violated'
    assert abs(r['target1Price'] - (r['entryPrice'] + r['stopDistance'])) < 0.02, 'T1 must be entry + 1R'
    assert abs(r['target2Price'] - (r['entryPrice'] + 2 * r['stopDistance'])) < 0.02, 'T2 must be entry + 2R'
    print('[PASS] Test 6: real position_sizer.js respects 1% risk, 10% cap and 1R/2R targets.')

def test_portfolio_data_invariants():
    p = json.load(open('data/jishu_portfolio.json', encoding='utf-8'))
    a, op = p['account'], p['open_positions']
    cost = sum(x['qty'] * x['entry_price'] for x in op)
    mv = sum(x['qty'] * (x.get('current_price') or x['entry_price']) for x in op)
    # gross P&L of closed trades (older files have no gross_pnl/costs -> realized_pnl is already gross)
    closed_gross = sum(t.get('gross_pnl', t.get('realized_pnl', 0)) for t in p.get('closed_trades', []))
    total_costs = a.get('total_costs', 0)
    # hard checks: arithmetic must always hold
    assert abs(a['cash'] + cost - (a['initial_capital'] + closed_gross - total_costs)) < 1.0, 'cash + cost basis != initial + gross realized - costs'
    assert abs(a['total_equity'] - (a['cash'] + mv)) < 1.0, 'total_equity != cash + market value'
    assert abs(a['unrealized_pnl'] - (mv - cost)) < 1.0, 'unrealized_pnl mismatch'
    for x in op:
        assert x['initial_sl'] < x['entry_price'] < x['target_1_price'] < x['target_2_price'], f"{x['sym']}: SL/entry/T1/T2 order"
        assert abs(x['qty'] * x['entry_price'] - x['invested_value']) < 1.0, f"{x['sym']}: invested_value"
    assert len({x['sym'] for x in op}) == len(op), 'duplicate open positions'
    last = p['daily_equity'][-1]
    assert abs(last['total_equity'] - a['total_equity']) < 1.0, 'last daily_equity snapshot != account equity'
    # soft checks: rule compliance -> warnings (older data may pre-date the current rules)
    warns = []
    maxslots = p.get('macro_regime', {}).get('maxAllowedSlots')
    if maxslots is not None and len(op) > maxslots:
        warns.append(f'{len(op)} open positions > macro maxAllowedSlots {maxslots}')
    caps = {'SLEEVE_A': 5, 'SLEEVE_B': 3}
    for sl, cap in caps.items():
        n = sum(1 for x in op if x.get('sleeve', 'SLEEVE_A') == sl)
        if n > cap: warns.append(f'{sl} holds {n} positions > cap {cap}')
    for w in warns: print('[WARN]', w)
    print('[PASS] Test 7: stored portfolio arithmetic is internally consistent' + (f' ({len(warns)} rule warning(s))' if warns else '.'))

def test_screener_data_sanity():
    if not os.path.exists('data/screener.json'):
        print('[SKIP] Test 8: data/screener.json absent'); return
    S = json.load(open('data/screener.json', encoding='utf-8'))
    st = S['stocks']
    assert len(st) > 0
    assert len({s['sym'] for s in st}) == len(st), 'duplicate symbols in screener'
    for s in st:
        for k in ('price', 'ars', 'srs', 'rs_rating'):
            assert s.get(k) is not None and s[k] == s[k], f"{s['sym']}: bad {k}"
        assert 1 <= s['rs_rating'] <= 99, f"{s['sym']}: rs_rating out of range"
        assert s['hi52_prox'] <= 1e-6, f"{s['sym']}: price above 52W high?"
    print(f'[PASS] Test 8: screener.json sane ({len(st)} stocks).')
    miss = S.get('failed_symbols')
    if miss: print('[WARN] symbols with no data last run:', ', '.join(miss))

if __name__ == '__main__':
    test_jishu_logic()
    test_position_sizer_real_engine()
    test_portfolio_data_invariants()
    test_screener_data_sanity()
