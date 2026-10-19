"""
Adaptive Alpha — Challenger 2 Workflow & End-to-End Verification Harness
Empirically verifies:
1. Unified e2e_runner execution (105 tests, exit code 0)
2. TradingView watchlist copy (format, multiple, single, empty results, toast)
3. Keyboard navigation shortcuts (J/Down, K/Up, Space, Enter, T, preventDefault, ignore form inputs)
4. Jishu desk integration (JSON/JS dual payload, desk viewer DOM contracts, modal sync banner)
"""

import os
import re
import sys
import json
import unittest
import subprocess

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class TestChallenger2WorkflowVerification(unittest.TestCase):
    """Adversarial & Empirical verification of end-to-end workflows."""

    @classmethod
    def setUpClass(cls):
        cls.screener_path = os.path.join(REPO_ROOT, 'data', 'screener.json')
        cls.portfolio_json_path = os.path.join(REPO_ROOT, 'data', 'jishu_portfolio.json')
        cls.portfolio_js_path = os.path.join(REPO_ROOT, 'data', 'jishu_portfolio.js')
        cls.jishu_desk_path = os.path.join(REPO_ROOT, 'jishu_desk.html')
        cls.index_html_path = os.path.join(REPO_ROOT, 'index.html')
        cls.ui_js_path = os.path.join(REPO_ROOT, 'js', 'ui.js')
        cls.share_card_js_path = os.path.join(REPO_ROOT, 'js', 'shareCard.js')
        cls.modal_js_path = os.path.join(REPO_ROOT, 'js', 'modal.js')
        cls.app_js_path = os.path.join(REPO_ROOT, 'js', 'app.js')

    # ══════════════════════════════════════════════════════════════════
    # 1. UNIFIED TEST RUNNER VERIFICATION
    # ══════════════════════════════════════════════════════════════════
    def test_01_unified_test_runner_clean_run(self):
        """1. Verify that 'python test/e2e_runner.py' executes cleanly with exit code 0 and 105 passed tests."""
        runner_path = os.path.join(REPO_ROOT, 'test', 'e2e_runner.py')
        res = subprocess.run([sys.executable, runner_path], cwd=REPO_ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
        self.assertEqual(res.returncode, 0, f"Unified runner exited with non-zero code {res.returncode}. Stderr: {res.stderr}")
        self.assertIn("Total Tests : 105", res.stdout)
        self.assertIn("Passed      : 105", res.stdout)
        self.assertIn("Failed      : 0", res.stdout)
        self.assertIn("ALL SUITES PASSED", res.stdout)

    # ══════════════════════════════════════════════════════════════════
    # 2. TRADINGVIEW WATCHLIST COPY FUNCTIONALITY
    # ══════════════════════════════════════════════════════════════════
    def test_02_tradingview_export_menu_and_dom_elements(self):
        """2.1 Verify Export button, popup menu, TradingView export button, and toast DOM elements in index.html."""
        with open(self.index_html_path, 'r', encoding='utf-8') as f:
            html = f.read()

        # Export popup menu button
        self.assertIn('id="tv-watchlist-btn"', html)
        self.assertIn('onclick="copyTradingViewWatchlist()"', html)
        self.assertIn('TradingView watchlist', html)

        # Stale Toast Notification element
        self.assertIn('id="stale-toast"', html)
        self.assertIn('id="stale-toast-msg"', html)
        self.assertIn('onclick="hideStaleToast()"', html)

    def test_03_tradingview_watchlist_formatting_node_execution(self):
        """2.2 Directly invoke copyTradingViewWatchlist() in Node.js with mock DOM to verify formatting, single, multiple, empty, and toast."""
        node_script = """
        const fs = require('fs');
        const path = require('path');

        // Mock browser DOM environment
        let lastToastMsg = null;
        let lastCopiedString = null;
        let alertCalledWith = null;

        global.window = global;
        global.showStaleToast = function(msg) {
            lastToastMsg = msg;
        };

        global.alert = function(msg) {
            alertCalledWith = msg;
        };

        const mockElements = {
            'search-box': { value: '' },
            'tv-watchlist-btn': { innerHTML: '', style: {} }
        };

        global.document = {
            getElementById: function(id) {
                return mockElements[id] || null;
            },
            createElement: function(tag) {
                return {
                    value: '',
                    setAttribute: function() {},
                    style: {},
                    select: function() {}
                };
            },
            body: {
                appendChild: function() {},
                removeChild: function() {}
            },
            execCommand: function(cmd) {
                return true;
            }
        };

        global.navigator = {
            clipboard: {
                writeText: function(str) {
                    lastCopiedString = str;
                    return Promise.resolve();
                }
            }
        };

        // Load shareCard.js implementation
        const shareCardCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'shareCard.js'), 'utf8');
        eval(shareCardCode);

        const results = [];

        // Case 1: Multiple tickers with mock allData
        global.allData = [
            { sym: 'RELIANCE', name: 'Reliance Ind', ind: 'Energy' },
            { sym: 'TCS', name: 'Tata Consultancy', ind: 'IT' },
            { sym: 'INFY', name: 'Infosys Ltd', ind: 'IT' }
        ];
        global.filters = { pass: false, watchlist: false };
        global.activeSector = null;
        mockElements['search-box'].value = '';

        copyTradingViewWatchlist();

        // Allow microtask to resolve clipboard promise
        setTimeout(() => {
            results.push({
                test: 'multiple_tickers',
                copied: lastCopiedString,
                toast: lastToastMsg
            });

            // Case 2: Single ticker
            lastToastMsg = null;
            lastCopiedString = null;
            global.allData = [{ sym: 'HDFCBANK', name: 'HDFC Bank', ind: 'Financials' }];
            copyTradingViewWatchlist();

            setTimeout(() => {
                results.push({
                    test: 'single_ticker',
                    copied: lastCopiedString,
                    toast: lastToastMsg
                });

                // Case 3: Empty filter results (search matches nothing)
                lastToastMsg = null;
                lastCopiedString = null;
                mockElements['search-box'].value = 'NONEXISTENT_XYZ_123';
                copyTradingViewWatchlist();

                results.push({
                    test: 'empty_filter_results',
                    copied: lastCopiedString,
                    toast: lastToastMsg
                });

                // Case 4: Real screener data sample (top 5 stocks)
                mockElements['search-box'].value = '';
                const screener = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'screener.json'), 'utf8'));
                global.allData = screener.stocks.slice(0, 5);
                copyTradingViewWatchlist();

                setTimeout(() => {
                    results.push({
                        test: 'real_screener_top5',
                        copied: lastCopiedString,
                        toast: lastToastMsg
                    });

                    console.log(JSON.stringify(results));
                }, 50);
            }, 50);
        }, 50);
        """
        res = subprocess.run(['node', '-e', node_script], cwd=os.path.join(REPO_ROOT, 'test'), capture_output=True, text=True, encoding='utf-8', errors='replace')
        self.assertEqual(res.returncode, 0, f"Node script failed: {res.stderr}")
        runs = json.loads(res.stdout)

        # 1. Multiple tickers
        multi = next(r for r in runs if r['test'] == 'multiple_tickers')
        self.assertEqual(multi['copied'], "NSE:RELIANCE,NSE:TCS,NSE:INFY")
        self.assertIn("✓ Copied 3 tickers in TradingView format (NSE:TICKER,...)", multi['toast'])

        # 2. Single ticker
        single = next(r for r in runs if r['test'] == 'single_ticker')
        self.assertEqual(single['copied'], "NSE:HDFCBANK")
        self.assertIn("✓ Copied 1 tickers in TradingView format (NSE:TICKER,...)", single['toast'])

        # 3. Empty filter results
        empty = next(r for r in runs if r['test'] == 'empty_filter_results')
        self.assertIsNone(empty['copied'], "Should not copy anything when filter results are empty")
        self.assertEqual(empty['toast'], "No stocks matching current filters to export.")

        # 4. Real screener data format compliance
        top5 = next(r for r in runs if r['test'] == 'real_screener_top5')
        self.assertTrue(re.match(r"^NSE:[A-Z0-9_&-]+(,NSE:[A-Z0-9_&-]+)*$", top5['copied']))
        self.assertIn("✓ Copied 5 tickers in TradingView format", top5['toast'])

    # ══════════════════════════════════════════════════════════════════
    # 3. KEYBOARD NAVIGATION SHORTCUTS VERIFICATION
    # ══════════════════════════════════════════════════════════════════
    def test_04_keyboard_navigation_code_guards_and_bindings(self):
        """3.1 Verify AST / code contract of keyboard navigation in js/ui.js."""
        with open(self.ui_js_path, 'r', encoding='utf-8') as f:
            code = f.read()

        # Form inputs must be completely ignored
        self.assertIn("tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (activeEl && activeEl.isContentEditable)", code)

        # Modal open handling: Escape closes modal, T/t opens TV for modal stock, cycling suppressed
        self.assertIn("var modal = $('#stock-modal');", code)
        self.assertIn("var isModalOpen = modal && modal.classList.contains('open');", code)
        self.assertIn("if (key === 'Escape' || key === 'Esc')", code)
        self.assertIn("if (typeof closeModal === 'function') closeModal();", code)
        self.assertIn("openTV(targetSym)", code)

        # Row cycling: J/ArrowDown and K/ArrowUp with preventDefault
        self.assertIn("if (key === 'j' || key === 'J' || key === 'ArrowDown')", code)
        self.assertIn("else if (key === 'k' || key === 'K' || key === 'ArrowUp')", code)
        self.assertIn("scrollIntoView({ block: 'nearest', behavior: 'smooth' })", code)

        # Space toggles watchlist with preventDefault
        self.assertIn("else if (key === ' ' || key === 'Spacebar')", code)
        self.assertIn("togglePin(symToToggle)", code)

        # Enter opens stock detail modal
        self.assertIn("else if (key === 'Enter')", code)
        self.assertIn("openStockModal(symToOpen)", code)

        # T/t opens TradingView chart
        self.assertIn("else if (key === 't' || key === 'T')", code)
        self.assertIn("openTV(symForTV)", code)

    def test_05_keyboard_navigation_node_simulation(self):
        """3.2 Simulate keyboard event dispatcher in Node.js to verify activeElement ignore, preventDefault, and row cycling."""
        node_script = """
        const fs = require('fs');
        const path = require('path');

        // Mock DOM & state
        let preventedEvents = [];
        let openedModals = [];
        let openedTVs = [];
        let toggledPins = [];
        let activeEl = { tagName: 'BODY', isContentEditable: false };

        global.selectedSym = null;
        global.pinnedStocks = [];
        global.closeModal = function() {};
        global.openStockModal = function(sym) { openedModals.push(sym); };
        global.openTV = function(sym) { openedTVs.push(sym); };
        global.togglePin = function(sym) {
            toggledPins.push(sym);
            if (global.pinnedStocks.includes(sym)) {
                global.pinnedStocks = global.pinnedStocks.filter(s => s !== sym);
            } else {
                global.pinnedStocks.push(sym);
            }
        };

        const rows = [
            { sym: 'RELIANCE', classes: ['tbl-row'], style: {}, scrollCalled: false },
            { sym: 'TCS', classes: ['tbl-row'], style: {}, scrollCalled: false },
            { sym: 'INFY', classes: ['tbl-row'], style: {}, scrollCalled: false }
        ];

        function createMockRow(r) {
            return {
                classList: {
                    contains: function(c) { return r.classes.includes(c); },
                    toggle: function(c, force) {
                        if (force) { if (!r.classes.includes(c)) r.classes.push(c); }
                        else { r.classes = r.classes.filter(x => x !== c); }
                    },
                    add: function(c) { if (!r.classes.includes(c)) r.classes.push(c); },
                    remove: function(c) { r.classes = r.classes.filter(x => x !== c); }
                },
                getAttribute: function(attr) { if (attr === 'data-sym') return r.sym; return null; },
                style: r.style,
                scrollIntoView: function(opts) { r.scrollCalled = true; },
                querySelector: function(sel) {
                    return {
                        textContent: '☆',
                        classList: { toggle: function() {} },
                        setAttribute: function() {}
                    };
                }
            };
        }

        const mockDomRows = rows.map(createMockRow);

        let keydownHandler = null;
        global.document = {
            activeElement: activeEl,
            addEventListener: function(event, fn) {
                if (event === 'keydown') keydownHandler = fn;
            },
            querySelector: function(sel) {
                if (sel === '#stock-modal') return { classList: { contains: () => false } };
                if (sel.startsWith('#tbl-body .tbl-row[data-sym=')) {
                    const match = sel.match(/data-sym="([^"]+)"/);
                    if (match) {
                        const r = mockDomRows.find(x => x.getAttribute('data-sym') === match[1]);
                        return r || null;
                    }
                }
                return null;
            },
            querySelectorAll: function(sel) {
                if (sel === '#tbl-body .tbl-row:not(.skel-row)') return mockDomRows;
                return [];
            }
        };

        global.window = {
            requestAnimationFrame: fn => fn(),
            localStorage: { getItem: () => null, setItem: () => {} }
        };

        // Load ui.js
        const uiCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');
        eval(uiCode);

        function dispatchKey(key, targetTag = 'BODY', isContentEditable = false) {
            let defaultPrevented = false;
            document.activeElement = { tagName: targetTag, isContentEditable };
            const ev = {
                key: key,
                preventDefault: function() { defaultPrevented = true; }
            };
            keydownHandler(ev);
            return defaultPrevented;
        }

        const simulationLog = [];

        // Step 1: keystrokes inside INPUT should be completely ignored
        let p = dispatchKey('j', 'INPUT');
        simulationLog.push({ step: 'input_ignored', prevented: p, selected: global.selectedSym });

        // Step 2: keystrokes inside TEXTAREA should be completely ignored
        p = dispatchKey('k', 'TEXTAREA');
        simulationLog.push({ step: 'textarea_ignored', prevented: p, selected: global.selectedSym });

        // Step 3: keystrokes inside SELECT should be completely ignored
        p = dispatchKey('Enter', 'SELECT');
        simulationLog.push({ step: 'select_ignored', prevented: p, openedModal: openedModals.length });

        // Step 4: Press 'j' from BODY -> select row 0 (RELIANCE)
        p = dispatchKey('j', 'BODY');
        simulationLog.push({ step: 'press_j_1', prevented: p, selected: global.selectedSym });

        // Step 5: Press 'ArrowDown' -> select row 1 (TCS)
        p = dispatchKey('ArrowDown', 'BODY');
        simulationLog.push({ step: 'press_down_2', prevented: p, selected: global.selectedSym });

        // Step 6: Press Space -> toggle pin for TCS
        p = dispatchKey(' ', 'BODY');
        simulationLog.push({ step: 'press_space', prevented: p, pinned: [...global.pinnedStocks] });

        // Step 7: Press Enter -> opens modal for TCS
        p = dispatchKey('Enter', 'BODY');
        simulationLog.push({ step: 'press_enter', openedModals: [...openedModals] });

        // Step 8: Press 't' -> opens TradingView for TCS
        p = dispatchKey('t', 'BODY');
        simulationLog.push({ step: 'press_t', openedTVs: [...openedTVs] });

        console.log(JSON.stringify(simulationLog));
        """
        res = subprocess.run(['node', '-e', node_script], cwd=os.path.join(REPO_ROOT, 'test'), capture_output=True, text=True, encoding='utf-8', errors='replace')
        self.assertEqual(res.returncode, 0, f"Node script failed: {res.stderr}")
        log = json.loads(res.stdout)

        # 1. INPUT ignored
        input_test = next(s for s in log if s['step'] == 'input_ignored')
        self.assertFalse(input_test['prevented'])
        self.assertIsNone(input_test['selected'])

        # 2. TEXTAREA ignored
        textarea_test = next(s for s in log if s['step'] == 'textarea_ignored')
        self.assertFalse(textarea_test['prevented'])
        self.assertIsNone(textarea_test['selected'])

        # 3. SELECT ignored
        select_test = next(s for s in log if s['step'] == 'select_ignored')
        self.assertFalse(select_test['prevented'])
        self.assertEqual(select_test['openedModal'], 0)

        # 4. Press 'j' -> row 0 selected, preventDefault called
        j1 = next(s for s in log if s['step'] == 'press_j_1')
        self.assertTrue(j1['prevented'])
        self.assertEqual(j1['selected'], 'RELIANCE')

        # 5. Press 'ArrowDown' -> row 1 selected, preventDefault called
        down2 = next(s for s in log if s['step'] == 'press_down_2')
        self.assertTrue(down2['prevented'])
        self.assertEqual(down2['selected'], 'TCS')

        # 6. Press Space -> pinned TCS, preventDefault called
        space = next(s for s in log if s['step'] == 'press_space')
        self.assertTrue(space['prevented'])
        self.assertIn('TCS', space['pinned'])

        # 7. Press Enter -> modal opened for TCS
        enter = next(s for s in log if s['step'] == 'press_enter')
        self.assertEqual(enter['openedModals'], ['TCS'])

        # 8. Press 't' -> TV opened for TCS
        t_key = next(s for s in log if s['step'] == 'press_t')
        self.assertEqual(t_key['openedTVs'], ['TCS'])

    # ══════════════════════════════════════════════════════════════════
    # 4. JISHU DESK INTEGRATION VERIFICATION
    # ══════════════════════════════════════════════════════════════════
    def test_06_jishu_portfolio_json_and_js_synchronization(self):
        """4.1 Verify data/jishu_portfolio.json and data/jishu_portfolio.js exist and are strictly identical in data content."""
        self.assertTrue(os.path.exists(self.portfolio_json_path), "jishu_portfolio.json missing")
        self.assertTrue(os.path.exists(self.portfolio_js_path), "jishu_portfolio.js missing")

        with open(self.portfolio_json_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)

        # Execute node to evaluate data/jishu_portfolio.js and return window.STATIC_JISHU_PORTFOLIO
        node_script = """
        global.window = {};
        require('./data/jishu_portfolio.js');
        console.log(JSON.stringify(window.STATIC_JISHU_PORTFOLIO));
        """
        res = subprocess.run(['node', '-e', node_script], cwd=REPO_ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
        self.assertEqual(res.returncode, 0, f"Failed to execute data/jishu_portfolio.js in node: {res.stderr}")
        js_data = json.loads(res.stdout)

        self.assertEqual(json_data, js_data, "data/jishu_portfolio.js payload does not match data/jishu_portfolio.json")

    def test_07_jishu_portfolio_schema_and_financial_invariants(self):
        """4.2 Verify Jishu portfolio schema, account equity balance, position sizing math, and trailing SL rules."""
        with open(self.portfolio_json_path, 'r', encoding='utf-8') as f:
            p = json.load(f)

        # Account section
        acc = p['account']
        initial_cap = acc['initial_capital']
        cash = acc['cash']
        invested = acc['invested_capital']
        equity = acc['total_equity']
        self.assertGreater(initial_cap, 0)
        self.assertAlmostEqual(cash + invested, equity, delta=1.0)

        # Settings section
        settings = p['settings']
        self.assertEqual(settings['risk_pct_per_trade'], 1)
        self.assertEqual(settings['max_capital_per_trade_pct'], 10)
        self.assertEqual(settings['target_1_rr'], 1)
        self.assertEqual(settings['target_2_rr'], 2)
        self.assertEqual(settings['target_3_rr'], 3)

        # Open positions section
        for pos in p['open_positions']:
            sym = pos['sym']
            entry = pos['entry_price']
            sl = pos['initial_sl']
            t1 = pos['target_1_price']
            t2 = pos['target_2_price']
            t3 = pos['target_3_price']

            # Math order: initial_sl < entry < t1 < t2 < t3
            self.assertLess(sl, entry, f"{sym}: initial_sl must be below entry")
            self.assertLess(entry, t1, f"{sym}: entry must be below t1")
            self.assertLess(t1, t2, f"{sym}: t1 must be below t2")
            self.assertLess(t2, t3, f"{sym}: t2 must be below t3")

            # Risk per share math
            expected_risk = round(entry - sl, 2)
            self.assertAlmostEqual(pos['risk_per_share'], expected_risk, delta=0.05)
            self.assertAlmostEqual(t1 - entry, expected_risk, delta=0.05)
            self.assertAlmostEqual(t2 - entry, 2 * expected_risk, delta=0.05)
            self.assertAlmostEqual(t3 - entry, 3 * expected_risk, delta=0.05)

    def test_08_jishu_desk_html_dom_elements_and_rendering_contracts(self):
        """4.3 Verify jishu_desk.html DOM IDs, table headers, script references, and offline fallback."""
        with open(self.jishu_desk_path, 'r', encoding='utf-8') as f:
            html = f.read()

        # Script tags
        self.assertIn('<script src="data/jishu_portfolio.js"></script>', html)
        self.assertIn('window.STATIC_JISHU_PORTFOLIO', html)
        self.assertIn('loadPortfolioData()', html)

        # Essential KPI element IDs
        expected_ids = [
            'totalEquity', 'totalReturnPct', 'realizedPnl', 'winRateSub',
            'profitFactorVal', 'payoffSub', 'mddVal', 'sharpeSub',
            'sleeveAPctBadge', 'sleeveAInvested', 'sleeveACapacity', 'sleeveAFill',
            'sleeveBPctBadge', 'sleeveBInvested', 'sleeveBCapacity', 'sleeveBFill',
            'sleeveCPctBadge', 'sleeveCCash', 'sleeveCStatus',
            'openCountBadge', 'macroRegimeBadge', 'lastUpdatedText',
            'openPositionsTable', 'quantRecsCard', 'quantRecsList',
            'eventFeed', 'closedCountBadge', 'closedTradesTable'
        ]
        for eid in expected_ids:
            self.assertIn(f'id="{eid}"', html, f"jishu_desk.html missing expected element ID '{eid}'")

    def test_09_jishu_modal_sync_banner_states(self):
        """4.4 Verify renderJishuModalBanner() in js/modal.js handles active, closed, and inactive stocks."""
        with open(self.modal_js_path, 'r', encoding='utf-8') as f:
            modal_code = f.read()

        # Check banner element and function exist
        self.assertIn('function renderJishuModalBanner(sym)', modal_code)
        self.assertIn("id = 'm-jishu-banner'", modal_code)
        self.assertIn("openStockModal", modal_code)
        self.assertIn("renderJishuModalBanner(d.sym)", modal_code)

        # Now test banner rendering logic in Node.js
        node_script = """
        const fs = require('fs');
        const path = require('path');

        const pData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'jishu_portfolio.json'), 'utf8'));
        global.window = global;
        global.STATIC_JISHU_PORTFOLIO = pData;

        let createdBanner = null;
        const mockModalBody = {
            firstChild: null,
            insertBefore: function(el) { createdBanner = el; }
        };

        global.document = {
            addEventListener: function() {},
            querySelector: function(sel) {
                if (sel === '#stock-modal .modal-body') return mockModalBody;
                return null;
            },
            getElementById: function(id) {
                if (id === 'm-jishu-banner') return createdBanner;
                return null;
            },
            createElement: function(tag) {
                return {
                    id: '',
                    className: '',
                    style: {},
                    innerHTML: ''
                };
            }
        };

        // Load modal.js
        const modalCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'modal.js'), 'utf8');
        eval(modalCode);

        const results = {};

        // 1. Open stock currently in Jishu portfolio (e.g. NAZARA)
        renderJishuModalBanner('NAZARA');
        results.open_active = {
            display: createdBanner.style.display,
            className: createdBanner.className,
            hasActiveBadge: createdBanner.innerHTML.includes('JISHU DESK ACTIVE'),
            hasEntry: createdBanner.innerHTML.includes('Entry:'),
            hasTrailingSL: createdBanner.innerHTML.includes('Current Trailing SL:')
        };

        // 2. Closed trade in Jishu portfolio (if any)
        if (pData.closed_trades && pData.closed_trades.length > 0) {
            const closedSym = pData.closed_trades[0].sym;
            renderJishuModalBanner(closedSym);
            results.closed_active = {
                display: createdBanner.style.display,
                className: createdBanner.className,
                hasClosedBadge: createdBanner.innerHTML.includes('JISHU DESK CLOSED'),
                hasRealizedPnl: createdBanner.innerHTML.includes('Realized P&L')
            };
        } else {
            results.closed_active = null;
        }

        // 3. Stock NOT in Jishu portfolio
        renderJishuModalBanner('UNTRACKED_STOCK');
        results.untracked = {
            display: createdBanner.style.display
        };

        console.log(JSON.stringify(results));
        """
        res = subprocess.run(['node', '-e', node_script], cwd=os.path.join(REPO_ROOT, 'test'), capture_output=True, text=True, encoding='utf-8', errors='replace')
        self.assertEqual(res.returncode, 0, f"Node script failed: {res.stderr}")
        banner_res = json.loads(res.stdout)

        # Open active stock (NAZARA)
        open_b = banner_res['open_active']
        self.assertEqual(open_b['display'], 'block')
        self.assertEqual(open_b['className'], 'jishu-modal-active-banner')
        self.assertTrue(open_b['hasActiveBadge'])
        self.assertTrue(open_b['hasEntry'])
        self.assertTrue(open_b['hasTrailingSL'])

        # Untracked stock
        untracked_b = banner_res['untracked']
        self.assertEqual(untracked_b['display'], 'none')

        # Closed trade (if present)
        if banner_res['closed_active']:
            closed_b = banner_res['closed_active']
            self.assertEqual(closed_b['display'], 'block')
            self.assertEqual(closed_b['className'], 'jishu-modal-closed-banner')
            self.assertTrue(closed_b['hasClosedBadge'])


if __name__ == '__main__':
    unittest.main()
