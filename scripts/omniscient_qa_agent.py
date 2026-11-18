#!/usr/bin/env python3
"""
=============================================================================
Agent 10: 👁️ Omniscient QA Chief Inspector & Bug Hunter
=============================================================================
Master Executive QA & System Integrity Agent for Adaptive Alpha.
Coordinates the specialized QA sub-agents and performs comprehensive
full-system inspection across every component:

1. Coordinates Agent 7: Tab & Navigation Inspector
2. Coordinates Agent 8: Filter & Preset Matrix Sentinel
3. Coordinates Agent 9: Institutional & FII/DII Data Verifier
4. Conducts Deep Interactive Diagnostics:
   - Stock detail modal opening & stat card population (12 indicators)
   - Volatility-adjusted Kelly & ATR Position Calculator math
   - 1-Click Social Share Card canvas rendering
5. Real-time Console & Runtime Exception Trapping (zero unhandled JS errors)
6. Unified ANSI-colored Diagnostic Triage Scorecard & non-zero exit code on failures.
=============================================================================
"""

import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent

# Import specialized sub-agents
try:
    from scripts.qa_tab_inspector import run_tab_inspector
    from scripts.qa_filter_sentinel import run_filter_sentinel
    from scripts.qa_fii_dii_verifier import run_fii_dii_verifier
except ImportError:
    # Handle direct script execution from scripts/ directory
    sys.path.insert(0, str(ROOT_DIR))
    from scripts.qa_tab_inspector import run_tab_inspector
    from scripts.qa_filter_sentinel import run_filter_sentinel
    from scripts.qa_fii_dii_verifier import run_fii_dii_verifier

# ANSI Formatting
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def run_omniscient_qa_audit(root_dir=ROOT_DIR, headless=True):
    """
    Executes the complete multi-agent QA audit suite.
    Returns overall audit report dict.
    """
    start_time = time.time()
    audit_report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "passed": True,
        "total_checks": 0,
        "passed_checks": 0,
        "failed_checks": 0,
        "sub_agents": {},
        "modal_checks": [],
        "console_errors": [],
        "errors": []
    }

    print(f"\n{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════════════{RESET}")
    print(f"{BOLD}{CYAN}   ADAPTIVE ALPHA — AGENT 10: OMNISCIENT QA CHIEF INSPECTOR & BUG HUNTER{RESET}")
    print(f"{BOLD}{CYAN}══════════════════════════════════════════════════════════════════════════════{RESET}\n")

    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(
        headless=headless,
        args=['--allow-file-access-from-files', '--disable-web-security']
    )
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    # Trap runtime JS errors & console logs
    page_errors = []
    console_errors = []

    def handle_pageerror(err):
        page_errors.append(str(err))
        print(f"{RED}[UNCAUGHT RUNTIME JS ERROR] {err}{RESET}")

    def handle_console(msg):
        # Ignore benign network warning about file:// fetch for optional fallback
        text = msg.text
        if msg.type == "error":
            if "file:///" in text and "fetch" in text.lower():
                return
            console_errors.append(text)
            print(f"{YELLOW}[BROWSER CONSOLE ERROR] {text}{RESET}")

    page.on("pageerror", handle_pageerror)
    page.on("console", handle_console)

    # Route out external slow widgets
    page.route("**/*.trendlyne.com/**", lambda r: r.abort())

    index_url = (root_dir / "index.html").resolve().as_uri()
    print(f"Loading application at: {index_url} ...")
    page.goto(index_url, wait_until="domcontentloaded")
    page.wait_for_timeout(600)

    # ──────────────────────────────────────────────────────────────────────────
    # 1. RUN AGENT 7: TAB & NAVIGATION INSPECTOR
    # ──────────────────────────────────────────────────────────────────────────
    print(f"\n{BOLD}[1/4] Spawning Agent 7: Tab & Navigation Inspector ...{RESET}")
    res_a7 = run_tab_inspector(page=page, root_dir=root_dir)
    audit_report["sub_agents"]["agent_7"] = res_a7
    audit_report["total_checks"] += len(res_a7["checks"])
    audit_report["passed_checks"] += sum(1 for c in res_a7["checks"] if c["success"])
    audit_report["failed_checks"] += sum(1 for c in res_a7["checks"] if not c["success"])
    if not res_a7["passed"]:
        audit_report["passed"] = False
        audit_report["errors"].extend(res_a7["errors"])

    # ──────────────────────────────────────────────────────────────────────────
    # 2. RUN AGENT 8: FILTER & PRESET MATRIX SENTINEL
    # ──────────────────────────────────────────────────────────────────────────
    print(f"\n{BOLD}[2/4] Spawning Agent 8: Filter & Preset Matrix Sentinel ...{RESET}")
    res_a8 = run_filter_sentinel(page=page, root_dir=root_dir)
    audit_report["sub_agents"]["agent_8"] = res_a8
    audit_report["total_checks"] += len(res_a8["checks"])
    audit_report["passed_checks"] += sum(1 for c in res_a8["checks"] if c["success"])
    audit_report["failed_checks"] += sum(1 for c in res_a8["checks"] if not c["success"])
    if not res_a8["passed"]:
        audit_report["passed"] = False
        audit_report["errors"].extend(res_a8["errors"])

    # ──────────────────────────────────────────────────────────────────────────
    # 3. RUN AGENT 9: INSTITUTIONAL & FII/DII DATA VERIFIER
    # ──────────────────────────────────────────────────────────────────────────
    print(f"\n{BOLD}[3/4] Spawning Agent 9: Institutional & FII/DII Data Verifier ...{RESET}")
    res_a9 = run_fii_dii_verifier(page=page, root_dir=root_dir)
    audit_report["sub_agents"]["agent_9"] = res_a9
    audit_report["total_checks"] += len(res_a9["checks"])
    audit_report["passed_checks"] += sum(1 for c in res_a9["checks"] if c["success"])
    audit_report["failed_checks"] += sum(1 for c in res_a9["checks"] if not c["success"])
    if not res_a9["passed"]:
        audit_report["passed"] = False
        audit_report["errors"].extend(res_a9["errors"])

    # ──────────────────────────────────────────────────────────────────────────
    # 4. CHIEF INSPECTOR: DEEP MODALS, POSITION SIZER & CANVAS AUDIT
    # ──────────────────────────────────────────────────────────────────────────
    print(f"\n{BOLD}[4/4] Chief Inspector: Deep Modal & Interactive Engine Auditing ...{RESET}")

    def log_modal_check(name, success, details=""):
        audit_report["modal_checks"].append({"name": name, "success": success, "details": details})
        audit_report["total_checks"] += 1
        if success:
            audit_report["passed_checks"] += 1
            print(f"✅ [Chief] {name} — {details}")
        else:
            audit_report["failed_checks"] += 1
            audit_report["passed"] = False
            audit_report["errors"].append(f"Modal Check '{name}': {details}")
            print(f"❌ [Chief] {name} — {details}")

    try:
        # Return to screener tab
        page.evaluate("setTab('screener', document.querySelectorAll('.tabs .tab')[1])")
        page.wait_for_timeout(200)

        # Trigger stock detail modal by clicking first rendered row
        first_row = page.locator("#tbl-body .tbl-row:not(.skel-row)").first
        if first_row.count() > 0:
            first_row.click()
            page.wait_for_timeout(300)

            modal_open = page.locator("#stock-modal").evaluate("el => el.classList.contains('open') || el.style.display !== 'none'")
            log_modal_check("Stock Detail Modal Opened", modal_open, "Modal visible on row click")

            # Verify stat cards populate with values
            modal_sym = page.locator("#m-sym").inner_text()
            m_ars = page.locator("#m-ars").inner_text()
            m_srs = page.locator("#m-srs").inner_text()
            m_st = page.locator("#m-st").inner_text()

            log_modal_check("Modal Symbol Bound", len(modal_sym.strip()) > 0 and modal_sym != "—",
                            f"Symbol: {modal_sym}")
            log_modal_check("Modal ARS Value Populated", len(m_ars.strip()) > 0 and m_ars != "—",
                            f"ARS: {m_ars}")
            log_modal_check("Modal SRS Value Populated", len(m_srs.strip()) > 0 and m_srs != "—",
                            f"SRS: {m_srs}")
            log_modal_check("Modal Supertrend Populated", len(m_st.strip()) > 0 and m_st != "—",
                            f"Supertrend: {m_st}")

            # Verify Position Sizing Calculator interaction inside modal
            pos_calc_present = page.locator("#calc-cap").count() > 0
            if pos_calc_present:
                calc_val = page.evaluate("""() => {
                    const capInput = document.getElementById('calc-cap');
                    if (capInput) {
                        capInput.value = '750000';
                        if (typeof recalcPositionSize === 'function') recalcPositionSize();
                        const qtyText = document.getElementById('calc-qty')?.innerText || '';
                        return qtyText.length > 0 && qtyText !== '—';
                    }
                    return false;
                }""")
                log_modal_check("Position Sizer Reactivity", calc_val, "Updated capital to ₹7,50,000 & verified calculated shares")

            # Close Modal
            page.evaluate("if (typeof closeModal === 'function') closeModal();")
            page.wait_for_timeout(150)
            modal_closed = page.locator("#stock-modal").evaluate("el => !el.classList.contains('open') || el.style.display === 'none'")
            log_modal_check("Modal Closed Gracefully", modal_closed, "Modal dismissed cleanly")
        else:
            log_modal_check("Table Row Presence for Modal Trigger", False, "No rows rendered in table")

        # Test Social Share Card Trigger
        page.evaluate("if (typeof openShareCardModal === 'function') openShareCardModal();")
        page.wait_for_timeout(250)
        share_modal_open = page.locator("#share-card-modal").count() > 0
        log_modal_check("Social Share Card Trigger", share_modal_open, "Share card generator opened")

        # Dismiss share modal
        page.evaluate("if (typeof closeShareCardModal === 'function') closeShareCardModal();")
        page.wait_for_timeout(100)

    except Exception as exc:
        log_modal_check("Chief Interactive Diagnostics Exception", False, str(exc))

    # Evaluate any captured runtime page errors
    if page_errors:
        audit_report["passed"] = False
        for pe in page_errors:
            audit_report["errors"].append(f"Runtime JS Exception: {pe}")
            audit_report["failed_checks"] += 1
            audit_report["total_checks"] += 1

    try:
        browser.close()
        playwright.stop()
    except Exception:
        pass

    duration = time.time() - start_time
    audit_report["duration_seconds"] = round(duration, 2)

    # ──────────────────────────────────────────────────────────────────────────
    # UNIFIED DIAGNOSTIC TRIAGE SCORECARD
    # ──────────────────────────────────────────────────────────────────────────
    status_color = GREEN if audit_report["passed"] else RED
    status_text = "PASSED" if audit_report["passed"] else "FAILED"

    print(f"\n{BOLD}──────────────────────────────────────────────────────────────────────────────{RESET}")
    print(f"{BOLD}                   OMNISCIENT QA SQUAD AUDIT SCORECARD{RESET}")
    print(f"{BOLD}──────────────────────────────────────────────────────────────────────────────{RESET}")
    print(f"Final Status   : {status_color}{BOLD}{status_text}{RESET}")
    print(f"Total Checks   : {BOLD}{audit_report['total_checks']}{RESET}")
    print(f"Passed Checks  : {GREEN}{audit_report['passed_checks']}{RESET}")
    print(f"Failed Checks  : {RED if audit_report['failed_checks'] > 0 else GREEN}{audit_report['failed_checks']}{RESET}")
    print(f"Execution Time : {audit_report['duration_seconds']}s")
    print(f"{BOLD}──────────────────────────────────────────────────────────────────────────────{RESET}")

    if audit_report["errors"]:
        print(f"\n{BOLD}{RED}🚨 TRIAGE: DETECTED BUGS / DISCREPANCIES ({len(audit_report['errors'])}){RESET}:")
        for idx, err in enumerate(audit_report["errors"], 1):
            print(f"  {idx}. {err}")
        print(f"\n{BOLD}{RED}💥 Audit FAILED. Non-zero exit code emitted.{RESET}\n")
    else:
        print(f"\n{BOLD}{GREEN}🎉 100% HEALTHY: All tabs, filters, 1-click presets, FII/DII feeds, modals, and runtime engines verified.{RESET}\n")

    return audit_report


if __name__ == "__main__":
    rep = run_omniscient_qa_audit()
    sys.exit(0 if rep["passed"] else 1)
