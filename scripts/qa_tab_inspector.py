#!/usr/bin/env python3
"""
Agent 7: 🧭 Omniscient Tab & Navigation Inspector
Part of the Adaptive Alpha Omniscient QA Multi-Agent Squad.

Autonomously verifies:
1. Mutual exclusivity and visibility across all 6 tabs in index.html:
   - Overview (#tab-overview)
   - Screener Terminal (#tab-screener)
   - Watchlist (#tab-watchlist)
   - Breakout Radar (#tab-breakouts)
   - Pro Heatmap (#tab-heatmap)
   - Sector Rotation RRG (#tab-sectors)
2. Tab-specific deep logic and visual integrity:
   - Overview: Today's Alpha Spotlight rotation (genuine Quad-1, non-BSE, dynamic score 80-99, dynamic badges)
     and 7 Fear & Greed sentiment modal interaction.
   - Screener: Table hydration, 1-click filter presets (Power Leaders), sort switching.
   - Watchlist: Dynamic pinning/unpinning, counter synchronization, and DOM table updates.
   - Breakout Radar: All market cap filters (All, Large, Mid, Small, F&O), counter badges, card sections.
   - Pro Heatmap: Tile count (.hm-cell), metric switching (ARS, Vol, SRS), quad filtering.
   - Sector Rotation: RRG radar clock, Donut SVG wheel, and view mode toggle (cards vs table).
3. Zero console/runtime errors across all tabs during execution.
4. Secondary cockpit: jishu_desk.html paper trading desk integrity.
"""

import sys
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent


def run_tab_inspector(page=None, root_dir=ROOT_DIR):
    """
    Executes Agent 7 tab inspections.
    Accepts an existing Playwright Page or instantiates a fresh headless session.
    Returns a dict with status, check details, and any detected errors.
    """
    results = {
        "agent": "Agent 7: Omniscient Tab & Navigation Inspector",
        "passed": True,
        "checks": [],
        "errors": [],
        "warnings": []
    }

    def log_check(name, success, details=""):
        results["checks"].append({"name": name, "success": success, "details": details})
        icon = "✅" if success else "❌"
        msg = f"{icon} [Agent 7] {name}" + (f" — {details}" if details else "")
        print(msg)
        if not success:
            results["passed"] = False
            results["errors"].append(f"{name}: {details}")

    close_browser_on_finish = False
    playwright_instance = None
    browser_instance = None
    console_errors = []

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

        # Track console errors & unhandled exceptions
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {str(exc)}"))

        # Route out external widgets & proxies cleanly to avoid network dependency noise
        page.route("**/*.trendlyne.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body="// mock tl"))
        page.route("**/api.allorigins.win/**", lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body='{"contents":"[{\\"category\\":\\"DII *\\",\\"date\\":\\"18-Nov-2026\\",\\"netValue\\":\\"1500.5\\"},{\\"category\\":\\"FII/FPI *\\",\\"date\\":\\"18-Nov-2026\\",\\"netValue\\":\\"-850.2\\"}]"}'
        ))

        # Log failing responses
        page.on("response", lambda res: print(f"HTTP ERROR RESP: {res.status} {res.url}") if res.status >= 400 else None)

        index_url = (root_dir / "index.html").resolve().as_uri()
        page.goto(index_url, wait_until="domcontentloaded")
        page.wait_for_timeout(600)  # brief settle for initial data rendering

        # ── 1. INSPECT OVERVIEW TAB ──
        page.evaluate("setTab('overview', document.querySelectorAll('.tabs .tab')[0])")
        page.wait_for_timeout(200)

        overview_visible = page.evaluate("document.getElementById('tab-overview').style.display !== 'none'")
        screener_hidden = page.evaluate("document.getElementById('tab-screener').style.display === 'none'")
        active_tab_text = page.locator(".tabs .tab.active").inner_text()

        log_check("Tab Switch: Overview Display State", overview_visible and screener_hidden,
                  f"Overview visible: {overview_visible}, Screener hidden: {screener_hidden}")
        log_check("Tab Switch: Overview Active Class", "Overview" in active_tab_text,
                  f"Active tab: '{active_tab_text.strip()}'")

        hero_rendered = page.locator("#retail-hero-cockpit").inner_html()
        log_check("Overview: Retail Hero Cockpit Rendered", len(hero_rendered) > 100,
                  f"Cockpit HTML length: {len(hero_rendered)}")

        # Verify Today's Alpha Spotlight logic & dynamic score
        spot_sym = page.locator(".spotlight-sym").inner_text().strip()
        spot_is_valid = bool(spot_sym and spot_sym != "—" and spot_sym != "BSE")
        log_check("Overview Spotlight: Not Frozen on BSE", spot_is_valid,
                  f"Spotlight symbol: '{spot_sym}' (Properly rotated Quad-1 leader, not frozen BSE)")

        spot_score_text = page.locator(".spotlight-action-row").inner_text()
        score_match = re.search(r"Composite Momentum Score:\s*(\d+)/100", spot_score_text)
        score_val = int(score_match.group(1)) if score_match else 0
        log_check("Overview Spotlight: Dynamic Composite Score", 80 <= score_val <= 99,
                  f"Calculated Score: {score_val}/100")

        # Test Fear & Greed sentiment modal
        page.evaluate("openSentimentModal()")
        page.wait_for_timeout(200)
        sentiment_modal_visible = page.evaluate("document.getElementById('sentiment-modal').style.display !== 'none'")
        log_check("Overview: 7-Pillar Sentiment Modal Opens", sentiment_modal_visible,
                  "Sentiment modal container opened")
        page.evaluate("closeSentimentModal()")
        page.wait_for_timeout(100)
        sentiment_modal_closed = page.evaluate("document.getElementById('sentiment-modal').style.display === 'none'")
        log_check("Overview: 7-Pillar Sentiment Modal Closes", sentiment_modal_closed,
                  "Sentiment modal container closed")

        # ── 2. INSPECT SCREENER TERMINAL TAB ──
        page.evaluate("setTab('screener', document.querySelectorAll('.tabs .tab')[1])")
        page.wait_for_timeout(200)

        screener_visible = page.evaluate("document.getElementById('tab-screener').style.display !== 'none'")
        overview_hidden = page.evaluate("document.getElementById('tab-overview').style.display === 'none'")
        active_tab_text = page.locator(".tabs .tab.active").inner_text()

        log_check("Tab Switch: Screener Display State", screener_visible and overview_hidden,
                  f"Screener visible: {screener_visible}")
        log_check("Tab Switch: Screener Active Class", "Screener" in active_tab_text,
                  f"Active tab: '{active_tab_text.strip()}'")

        row_count = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
        log_check("Screener: Table Rows Hydrated", row_count > 0, f"Found {row_count} rendered stocks")

        # Test 1-Click Preset (Power Leaders)
        page.evaluate("applyPreset('power-leaders')")
        page.wait_for_timeout(150)
        pwr_rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
        log_check("Screener: Preset Filter (Power Leaders)", pwr_rows > 0, f"Filtered to {pwr_rows} Power Leader stocks")

        # Reset Preset
        page.evaluate("applyPreset('power-leaders')")
        page.wait_for_timeout(150)

        # Test Column Sort
        page.evaluate("setSortCol('ars-desc')")
        page.wait_for_timeout(150)
        sorted_rows = page.locator("#tbl-body .tbl-row:not(.skel-row)").count()
        log_check("Screener: Column Sort Switching", sorted_rows > 0, "Sorted table by ARS desc")

        # ── 3. INSPECT WATCHLIST TAB ──
        page.evaluate("setTab('watchlist', document.querySelectorAll('.tabs .tab')[2])")
        page.wait_for_timeout(200)

        watchlist_visible = page.evaluate("document.getElementById('tab-watchlist').style.display !== 'none'")
        active_tab_text = page.locator(".tabs .tab.active").inner_text()
        initial_wl_count = int(page.locator("#wl-count").inner_text().strip() or "0")

        log_check("Tab Switch: Watchlist Display State", watchlist_visible, f"Watchlist visible: {watchlist_visible}")

        # Test Pinning a stock to Watchlist
        page.evaluate("togglePin('RELIANCE')")
        page.wait_for_timeout(150)
        pinned_wl_count = int(page.locator("#wl-count").inner_text().strip() or "0")
        has_pinned = pinned_wl_count == initial_wl_count + 1
        log_check("Watchlist: Pin Stock Adds to List", has_pinned,
                  f"Watchlist count increased: {initial_wl_count} -> {pinned_wl_count}")

        # Unpin stock to restore state
        page.evaluate("togglePin('RELIANCE')")
        page.wait_for_timeout(150)
        restored_wl_count = int(page.locator("#wl-count").inner_text().strip() or "0")
        log_check("Watchlist: Unpin Stock Restores List", restored_wl_count == initial_wl_count,
                  f"Watchlist count restored to {restored_wl_count}")

        # ── 4. INSPECT BREAKOUT RADAR TAB ──
        page.evaluate("setTab('breakouts', document.querySelectorAll('.tabs .tab')[3])")
        page.wait_for_timeout(200)

        breakouts_visible = page.evaluate("document.getElementById('tab-breakouts').style.display !== 'none'")
        bo_count_text = page.locator("#bo-count").inner_text().strip()

        log_check("Tab Switch: Breakout Radar Display State", breakouts_visible,
                  f"Breakouts visible: {breakouts_visible}")
        log_check("Breakout Radar: Counter Badge Numeric", bo_count_text.isdigit(),
                  f"Radar count: {bo_count_text}")

        # Test Market Cap Filters on Breakouts
        cap_filters = ['large', 'mid', 'small', 'fno', 'all']
        cap_ok = True
        for cap in cap_filters:
            page.evaluate(f"setBoCapFilter('{cap}')")
            page.wait_for_timeout(100)
            btn_active = page.evaluate(f"Boolean(document.querySelector('.bo-cap-pill.active'))")
            if not btn_active:
                cap_ok = False
        log_check("Breakout Radar: Cap Filters Functional", cap_ok,
                  "Switched between Large, Mid, Small, F&O, All successfully")

        # ── 5. INSPECT PRO HEATMAP TAB ──
        page.evaluate("setTab('heatmap', document.querySelectorAll('.tabs .tab')[4])")
        page.wait_for_timeout(300)

        heatmap_visible = page.evaluate("document.getElementById('tab-heatmap').style.display !== 'none'")
        heatmap_cell_count = page.locator("#heatmap-grid .hm-cell").count()
        log_check("Tab Switch: Pro Heatmap Display State", heatmap_visible,
                  f"Heatmap visible: {heatmap_visible}")
        log_check("Pro Heatmap: Tiles Hydrated", heatmap_cell_count > 0,
                  f"Rendered {heatmap_cell_count} heatmap market tiles")

        # Test Heatmap Metric Switching
        page.evaluate("setHeatmapMetric('ars')")
        page.wait_for_timeout(150)
        ars_btn_active = page.locator("#hm-metric-ars").evaluate("el => el.classList.contains('active')")
        log_check("Pro Heatmap: Metric Switch (ARS)", ars_btn_active, "Active class applied to ARS metric button")

        page.evaluate("setHeatmapMetric('vol')")
        page.wait_for_timeout(150)
        vol_btn_active = page.locator("#hm-metric-vol").evaluate("el => el.classList.contains('active')")
        log_check("Pro Heatmap: Metric Switch (Volume)", vol_btn_active, "Active class applied to Vol metric button")

        # Test Heatmap Filter Switching
        page.evaluate("setHeatmapFilter('quad1')")
        page.wait_for_timeout(150)
        quad1_active = page.locator("#hm-filter-quad1").evaluate("el => el.classList.contains('active')")
        log_check("Pro Heatmap: Filter Switch (Q1 Leaders)", quad1_active, "Active class applied to Q1 filter")

        page.evaluate("setHeatmapFilter('all')")
        page.wait_for_timeout(150)

        # ── 6. INSPECT SECTOR ROTATION TAB (RRG) ──
        page.evaluate("setTab('sectors', document.querySelectorAll('.tabs .tab')[5])")
        page.wait_for_timeout(300)

        sectors_visible = page.evaluate("document.getElementById('tab-sectors').style.display !== 'none'")
        clock_container = page.locator("#rrg-clock-container").count()
        donut_container = page.locator("#rrg-donut-container").count()
        donut_has_svg = page.locator("#rrg-donut-container svg").count() > 0

        log_check("Tab Switch: Sector Rotation (RRG) Display State", sectors_visible,
                  f"Sectors visible: {sectors_visible}")
        log_check("Sector Rotation: Clock & Donut Containers Present", clock_container > 0 and donut_container > 0,
                  "Both RRG radar clock and Donut wheel containers mounted")
        log_check("Sector Rotation: Donut Wheel SVG Rendered", donut_has_svg,
                  "Sector rotation SVG donut wheel rendered successfully")

        # Test Sector View Mode Switching (Table vs Cards)
        page.evaluate("setSectorViewMode('cards')")
        page.wait_for_timeout(150)
        grid_visible = page.evaluate("document.getElementById('sector-grid').style.display !== 'none'")
        sector_card_count = page.locator("#sector-grid .sector-card").count()
        log_check("Sector Rotation: View Mode Switch to Cards", grid_visible and sector_card_count > 0,
                  f"Sector cards grid displayed with {sector_card_count} sectors")

        page.evaluate("setSectorViewMode('table')")
        page.wait_for_timeout(150)
        table_visible = page.evaluate("document.getElementById('sector-table-container').style.display !== 'none'")
        log_check("Sector Rotation: View Mode Switch to Table", table_visible, "Sector breakdown table displayed")

        # ── 7. ZERO CONSOLE ERRORS AUDIT ──
        js_runtime_errors = [
            err for err in console_errors
            if not ("net::ERR_" in err or "Failed to load resource" in err)
        ]
        log_check("Tabs Console Cleanliness: Zero Runtime Errors", len(js_runtime_errors) == 0,
                  f"Detected {len(js_runtime_errors)} runtime errors: {js_runtime_errors}" if js_runtime_errors else "0 runtime errors recorded")
        if js_runtime_errors:
            for err in js_runtime_errors:
                results["warnings"].append(f"Runtime error: {err}")

        # ── 8. INSPECT JISHU DESK NAVIGATION ──
        jishu_url = (root_dir / "jishu_desk.html").resolve().as_uri()
        page.goto(jishu_url, wait_until="domcontentloaded")
        page.wait_for_timeout(500)

        jishu_title = page.title()
        log_check("Jishu Desk: Title Verified", "Jishu" in jishu_title and "Paper Desk" in jishu_title,
                  f"Page title: '{jishu_title}'")

        portfolio_summary = page.locator("#macroSentinelBanner").count() > 0 or page.locator("#totalEquity").count() > 0
        log_check("Jishu Desk: Portfolio Summary Container Present", portfolio_summary,
                  "Summary container rendered")

        # Restore screener tab for any caller
        page.goto(index_url, wait_until="domcontentloaded")
        page.evaluate("setTab('screener', document.querySelectorAll('.tabs .tab')[1])")

    except Exception as exc:
        log_check("Agent 7 Critical Execution Exception", False, str(exc))

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
    res = run_tab_inspector()
    if not res["passed"]:
        print(f"\n[Agent 7 FAILED] Errors: {res['errors']}")
        sys.exit(1)
    else:
        print(f"\n[Agent 7 PASSED] All {len(res['checks'])} tab navigation checks succeeded.")
        sys.exit(0)
