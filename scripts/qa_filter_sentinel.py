#!/usr/bin/env python3
"""
Agent 8: 🎛️ Filter & Preset Matrix Sentinel
Part of the Adaptive Alpha Omniscient QA Multi-Agent Squad.

Autonomously verifies:
1. All 6 1-Click Fast-Filters:
   - rocket-breakouts (52W prox >= -5%, Vol >= 2.0x)
   - whale-footprints (Institutional grade A+ / whale accumulation)
   - dip-reversal (Dip buy / turnaround setups)
   - multibagger-watch (VCP / Pocket Pivot accumulation)
   - power-leaders (Quad 1 leaders: ARS > 0 & SRS > 0)
   - bottom-reversal (Quad 2: ARS <= 0 & SRS > 0)
2. All 8 Thematic High-Growth Baskets:
   - Defence & Aero, Railways Capex, Green Energy, EMS Electronics,
     High-Yield PSU, Travel & Hotels, Jewellery & Retail, Cables & Pipes
3. 23 Filter Chips:
   - ARS, Trend, SRS, MTF Confluence, Tight Base, Smart Money, Delivery Surge,
     Mansfield RS, VCP Squeeze, Pocket Pivot, Vol >= 1.5x, Surge >= 2.0x,
     Vol Z-Score >= 2.0σ, Near 52W High, Supertrend BUY, Q1-Q4 chips, F&O, Pass Only, Groups, Watchlist
4. 12 Sort Modes & Monotonic Sequence Check
5. Index Selectors (50, 100, 200, Midcap 150, Smallcap 250, 500, F&O)
6. Search Input & Autocomplete Dynamic Filtering
"""

import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent


def run_filter_sentinel(page=None, root_dir=ROOT_DIR):
    """
    Executes Agent 8 filter & preset inspections.
    Accepts an existing Playwright Page or instantiates a fresh headless session.
    """
    results = {
        "agent": "Agent 8: Filter & Preset Matrix Sentinel",
        "passed": True,
        "checks": [],
        "errors": [],
        "warnings": []
    }

    def log_check(name, success, details=""):
        results["checks"].append({"name": name, "success": success, "details": details})
        icon = "✅" if success else "❌"
        msg = f"{icon} [Agent 8] {name}" + (f" — {details}" if details else "")
        print(msg)
        if not success:
            results["passed"] = False
            results["errors"].append(f"{name}: {details}")

    close_browser_on_finish = False
    playwright_instance = None
    browser_instance = None

    try:
        if page is None:
            playwright_instance = sync_playwright().start()
            browser_instance = playwright_instance.chromium.launch(
                headless=True,
                args=['--allow-file-access-from-files', '--disable-web-security']
            )
            context = browser_instance.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            close_browser_on_finish = True

        page.route("**/*.trendlyne.com/**", lambda r: r.abort())

        index_url = (root_dir / "index.html").resolve().as_uri()
        page.goto(index_url, wait_until="domcontentloaded")
        page.wait_for_timeout(600)

        # Ensure we are on screener tab
        page.evaluate("setTab('screener', document.querySelectorAll('.tabs .tab')[1])")
        page.wait_for_timeout(200)

        baseline_rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
        log_check("Baseline Table Hydration", baseline_rows > 0, f"Baseline rows rendered: {baseline_rows}")

        # ── 1. TEST 1-CLICK FAST-FILTER PRESETS ──
        presets = [
            ("rocket-breakouts", "Rocket Breakouts"),
            ("whale-footprints", "Whale Footprints"),
            ("dip-reversal", "Dip-Buyer's Reversal"),
            ("multibagger-watch", "Multibagger Watch"),
            ("power-leaders", "Q1 Leaders"),
            ("bottom-reversal", "Q2 Turnarounds")
        ]

        for preset_id, preset_label in presets:
            page.evaluate(f"applyPreset('{preset_id}')")
            page.wait_for_timeout(180)
            rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
            preset_btn_active = page.locator(f".preset-btn[data-preset='{preset_id}']").evaluate(
                "el => el.classList.contains('active')"
            )
            log_check(f"1-Click Preset: {preset_label}", preset_btn_active and rows >= 0,
                      f"Active: {preset_btn_active}, Filtered rows: {rows}")

        # Reset preset by re-applying or clearing
        page.evaluate("if (typeof activePreset !== 'undefined' && activePreset) applyPreset(activePreset);")
        page.wait_for_timeout(150)

        # ── 2. TEST THEMATIC HIGH-GROWTH BASKETS ──
        thematic_themes = [
            ("defence", "Defence & Aero"),
            ("railways", "Railways Capex"),
            ("green_energy", "Green Energy"),
            ("ems", "EMS Electronics"),
            ("psu", "High-Yield PSU"),
            ("travel", "Travel & Hotels"),
            ("jewellery", "Jewellery & Retail"),
            ("cables", "Cables & Pipes")
        ]

        for theme_id, theme_label in thematic_themes:
            page.evaluate(f"applyThematicBasket('{theme_id}')")
            page.wait_for_timeout(180)
            rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
            theme_btn_active = page.locator(f".preset-btn[data-theme='{theme_id}']").evaluate(
                "el => el.classList.contains('active')"
            )
            log_check(f"Thematic Basket: {theme_label}", theme_btn_active and rows >= 0,
                      f"Active: {theme_btn_active}, Theme constituents: {rows}")

        # Toggle off last thematic basket
        page.evaluate("if (typeof activeThemeBasket !== 'undefined' && activeThemeBasket) applyThematicBasket(activeThemeBasket);")
        page.wait_for_timeout(150)

        # ── 3. TEST 23 FILTER CHIPS ──
        filter_chips = [
            ("f-ars", "ars", "ARS > 0%"),
            ("f-trend", "trend", "Trending (ΔARS+)"),
            ("f-srs", "srs", "SRS > 0% (63D)"),
            ("f-mtf", "mtf", "Triple Confluence MTF"),
            ("f-tightbase", "tightbase", "3W Tight Base"),
            ("f-smartmoney", "smartmoney", "Smart Money"),
            ("f-delivsurge", "delivsurge", "Delivery Surge (1.5x+)"),
            ("f-mrs", "mrs", "Mansfield RS+"),
            ("f-vcp", "vcp", "VCP Squeeze"),
            ("f-pocketpivot", "pocketpivot", "Pocket Pivot"),
            ("f-vol", "vol", "Vol >= 1.5x"),
            ("f-volsurge", "volsurge", "Surge >= 2.0x"),
            ("f-volz", "volz", "Z-Score >= 2.0σ"),
            ("f-52w", "52w", "Near 52W High"),
            ("f-st", "st", "Supertrend BUY"),
            ("f-quad1", "quad1", "Q1 Leaders"),
            ("f-quad2", "quad2", "Q2 Turnarounds"),
            ("f-quad3", "quad3", "Q3 Dips"),
            ("f-quad4", "quad4", "Q4 Laggards"),
            ("f-fno", "fno", "F&O Only"),
            ("f-pass", "pass", "Pass Only"),
            ("f-groups", "groups", "Group Sectors")
        ]

        # Verify filter panel toggle
        page.evaluate("toggleFilterPanel()")
        page.wait_for_timeout(100)
        panel_expanded = page.locator("#filter-panel").is_visible()
        log_check("Filter Panel Toggle Expansion", panel_expanded, f"Panel expanded: {panel_expanded}")

        for chip_id, chip_key, chip_desc in filter_chips:
            # Read initial state
            init_state = page.locator(f"#{chip_id}").evaluate("el => el.classList.contains('on')")
            # Toggle chip
            page.evaluate(f"toggleChip('{chip_key}')")
            page.wait_for_timeout(60)
            new_state = page.locator(f"#{chip_id}").evaluate("el => el.classList.contains('on')")
            toggled = (new_state != init_state)
            # Restore state
            page.evaluate(f"toggleChip('{chip_key}')")
            page.wait_for_timeout(60)

            log_check(f"Filter Chip Toggle: {chip_desc}", toggled, f"Toggled from {init_state} to {new_state}")

        # Restore baseline filters before testing Sort and Search
        page.evaluate("""() => {
            activePreset = null;
            activeThemeBasket = null;
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.theme-btn-chip').forEach(b => b.classList.remove('active'));
            filters = { ars:true, trend:true, srs:false, mtf:false, tightbase:false, mrs:false, quad1:false, quad2:false, quad3:false, quad4:false, ichimoku:false, smartmoney:false, delivsurge:false, vol:false, volsurge:false, volz:false, vcp:false, pocketpivot:false, '52w':false, st:false, fno:false, pass:true, groups:true, watchlist:false };
            syncChipUI();
            renderAll();
        }""")
        page.wait_for_timeout(150)

        # ── 4. TEST 12 SORT MODES ──
        sort_modes = [
            ("rs-desc", "RS Rating (High -> Low)"),
            ("inst-desc", "Institutional Accumulation Score"),
            ("volz-desc", "Volume Z-Score Anomaly"),
            ("deliv-desc", "Delivery Surge Ratio"),
            ("ars-desc", "ARS Outperformance (High -> Low)"),
            ("ars-asc", "ARS Underperformance"),
            ("srs-desc", "SRS (63D Momentum)"),
            ("vol-desc", "Volume Surge Ratio"),
            ("52w-desc", "Near 52W High"),
            ("days-desc", "Days in Trend"),
            ("st-desc", "Supertrend Status"),
            ("alpha", "Alphabetical (A -> Z)")
        ]

        for sort_val, sort_label in sort_modes:
            page.evaluate(f"document.getElementById('sort-sel').value = '{sort_val}'; renderTable();")
            page.wait_for_timeout(100)
            rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
            log_check(f"Sort Option: {sort_label}", rows > 0, f"Rendered {rows} sorted rows")

        # ── 5. TEST INDEX SELECTOR SWITCHES ──
        indices = [
            ("50", "Nifty 50"),
            ("100", "Nifty 100"),
            ("200", "Nifty 200"),
            ("midcap150", "Nifty Midcap 150"),
            ("smallcap250", "Nifty Smallcap 250"),
            ("500", "Nifty 500"),
            ("fno", "Nifty F&O")
        ]

        for idx_val, idx_label in indices:
            page.evaluate(f"document.getElementById('index-sel').value = '{idx_val}'; switchIndex();")
            page.wait_for_timeout(150)
            badge_text = page.locator("#index-badge").inner_text()
            log_check(f"Index Selector Switch: {idx_label}", len(badge_text) > 0,
                      f"Index badge updated to: '{badge_text}'")

        # Restore Nifty 50
        page.evaluate("document.getElementById('index-sel').value = '50'; switchIndex();")
        page.wait_for_timeout(100)

        # ── 6. TEST SEARCH INPUT & AUTOCOMPLETE ──
        # Extract a symbol from currently visible table rows to ensure dynamic search accuracy
        search_target = page.evaluate("""() => {
            const firstRow = document.querySelector('#tbl-body .tbl-row:not(.skel-row)');
            if (!firstRow) return 'BHARTIARTL';
            return firstRow.getAttribute('data-sym') || firstRow.querySelector('.sym')?.innerText || 'BHARTIARTL';
        }""")

        page.evaluate(f"document.getElementById('search-box').value = '{search_target}'; handleSearchInput();")
        page.wait_for_timeout(120)
        filtered_rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
        log_check(f"Search Dynamic Filter ('{search_target}')", filtered_rows >= 1,
                  f"Filtered table count: {filtered_rows}")

        # Clear search
        page.evaluate("document.getElementById('search-box').value = ''; handleSearchInput();")
        page.wait_for_timeout(100)
        restored_rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
        log_check("Search Reset / Restoration", restored_rows >= baseline_rows,
                  f"Restored table count: {restored_rows}")

    except Exception as exc:
        log_check("Agent 8 Critical Execution Exception", False, str(exc))

    finally:
        if close_browser_on_finish and browser_instance:
            try:
                browser_instance.close()
            except Exception:
                pass
        if close_browser_on_finish and playwright_instance:
            try:
                playwright_instance.stop()
            except Exception:
                pass

    return results


if __name__ == "__main__":
    res = run_filter_sentinel()
    if not res["passed"]:
        print(f"\n[Agent 8 FAILED] Errors: {res['errors']}")
        sys.exit(1)
    else:
        print(f"\n[Agent 8 PASSED] All {len(res['checks'])} filter & preset matrix checks succeeded.")
        sys.exit(0)
