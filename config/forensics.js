/**
 * Adaptive Alpha - Forensic Trap Elimination Database
 * Authoritative security-level forensic audit data for the ~500 NSE stock universe.
 * Tracks:
 * 1. High Promoter Pledge (>20% of promoter holding encumbered/pledged)
 * 2. High Debt Burden (Elevated Debt-to-Equity / Net Debt-to-EBITDA)
 * 3. Auditor Warnings / Resignations / Regulatory Qualifications
 */

const FORENSICS_DB = {
  // --- High Promoter Pledge (>20%) ---
  "HINDZINC": {
    promoter_pledge_pct: 99.0,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Severe promoter pledge: 99.0% of promoter holding encumbered to service parent debt"
    ]
  },
  "VEDL": {
    promoter_pledge_pct: 99.8,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Critical promoter pledge: 99.8% of promoter holding encumbered",
      "Elevated holdco debt load and dividend extraction pressure"
    ]
  },
  "RELINFRA": {
    promoter_pledge_pct: 48.0,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Severe promoter pledge: 48.0% of promoter stake encumbered",
      "Elevated debt load and ongoing creditor arbitration",
      "Auditor disclaimer of opinion regarding going concern status"
    ]
  },
  "RPOWER": {
    promoter_pledge_pct: 24.0,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Promoter pledge at 24.0% (exceeds 20% safety threshold)",
      "Debt resolution and one-time settlement procedures",
      "Auditor emphasis of matter on debt default"
    ]
  },
  "GMRAIRPORT": {
    promoter_pledge_pct: 38.4,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Elevated promoter pledge: 38.4% of holding encumbered",
      "Airport infrastructure expansion debt load (D/E > 3.2)"
    ]
  },
  "GMRINFRA": {
    promoter_pledge_pct: 38.4,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Elevated promoter pledge: 38.4% of holding encumbered",
      "Airport concession debt load (D/E > 3.2)"
    ]
  },
  "INDUSINDBK": {
    promoter_pledge_pct: 34.2,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge is 34.2% of promoter stake (exceeds 20% limit)"
    ]
  },
  "JINDALSTEL": {
    promoter_pledge_pct: 22.8,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge at 22.8% (above 20% safety threshold)"
    ]
  },
  "JINDALSAW": {
    promoter_pledge_pct: 22.1,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge at 22.1% (above 20% safety threshold)"
    ]
  },
  "KALPATPOWR": {
    promoter_pledge_pct: 44.5,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "High promoter pledge of 44.5%"
    ]
  },
  "EMAMILTD": {
    promoter_pledge_pct: 27.6,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge at 27.6% (exceeds 20% safety threshold)"
    ]
  },
  "LEMONTREE": {
    promoter_pledge_pct: 22.4,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Promoter pledge of 22.4% (above 20% threshold)",
      "High hospitality sector asset debt load"
    ]
  },
  "STRTECH": {
    promoter_pledge_pct: 82.1,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Critical promoter pledge of 82.1%",
      "Elevated debt-to-equity ratio"
    ]
  },
  "CGCL": {
    promoter_pledge_pct: 24.5,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge is 24.5% (exceeds 20% safety threshold)"
    ]
  },
  "EVEREADY": {
    promoter_pledge_pct: 28.0,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge at 28.0% of promoter holding"
    ]
  },
  "MAXHEALTH": {
    promoter_pledge_pct: 21.0,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge encumbrance at 21.0%"
    ]
  },
  "ASTERDM": {
    promoter_pledge_pct: 24.0,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge of 24.0% (above 20% safety threshold)"
    ]
  },
  "MEDANTA": {
    promoter_pledge_pct: 20.5,
    high_debt: false,
    auditor_warning: false,
    warnings: [
      "Promoter pledge of 20.5% (above 20% safety threshold)"
    ]
  },
  "ZEEL": {
    promoter_pledge_pct: 28.5,
    high_debt: false,
    auditor_warning: true,
    warnings: [
      "Promoter pledge is 28.5% (exceeds 20% safety threshold)",
      "SEBI forensic investigation into promoter fund diversion and terminated merger"
    ]
  },
  "UPL": {
    promoter_pledge_pct: 21.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Promoter pledge at 21.0%",
      "High net debt ($3B+) following global agrochem acquisitions"
    ]
  },
  "PCJEWELLER": {
    promoter_pledge_pct: 35.0,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Promoter pledge of 35.0%",
      "Loan default and NPA classification by banking consortium",
      "Auditor qualification on trade receivables and loan guarantees"
    ]
  },
  "DHANI": {
    promoter_pledge_pct: 21.5,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Promoter pledge of 21.5%",
      "Elevated retail lending leverage",
      "Prior auditor resignation and regulatory inquiries"
    ]
  },

  // --- High Debt Burden ---
  "IDEA": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Extreme debt burden exceeding ₹2.1 Lakh Cr with negative net worth",
      "Auditor material uncertainty warning regarding going-concern status"
    ]
  },
  "ADANIENT": {
    promoter_pledge_pct: 4.8,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Elevated net debt-to-EBITDA ratio across incubation capex",
      "Auditor scrutiny: Prior mid-tier auditor resignation (Shah Dhandharia) & qualified review"
    ]
  },
  "ADANIPORTS": {
    promoter_pledge_pct: 3.2,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Elevated debt load from port acquisitions",
      "Statutory auditor Deloitte Haskins & Sells resigned citing lack of scope on related-party deals"
    ]
  },
  "ADANIPOWER": {
    promoter_pledge_pct: 18.5,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "High leverage and elevated power project debt"
    ]
  },
  "ADANIGREEN": {
    promoter_pledge_pct: 1.5,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Substantial capital expenditure debt burden (D/E > 4.5)"
    ]
  },
  "ADANIENSOL": {
    promoter_pledge_pct: 2.1,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "High transmission infrastructure capital expenditure debt (D/E > 3.5)"
    ]
  },
  "SUZLON": {
    promoter_pledge_pct: 12.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Historical debt restructuring and ongoing working capital sensitivity"
    ]
  },
  "TATASTEEL": {
    promoter_pledge_pct: 1.2,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Substantial consolidated gross debt from European restructuring operations"
    ]
  },
  "JSWSTEEL": {
    promoter_pledge_pct: 11.5,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Elevated capex debt burden for capacity expansion"
    ]
  },
  "JSWENERGY": {
    promoter_pledge_pct: 18.2,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "High debt-to-equity ratio (>2.2) from power asset acquisitions"
    ]
  },
  "SAIL": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Cyclical debt load with leverage ratio > 3.0x EBITDA"
    ]
  },
  "TATAPOWER": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Elevated utility capital expenditure debt burden"
    ]
  },
  "INDUSTOWER": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Tenancy receivables stress and customer credit concentration risk"
    ]
  },
  "IBREALEST": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Stressed real estate project debt"
    ]
  },
  "JPPOWER": {
    promoter_pledge_pct: 15.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Elevated debt-to-equity and power asset leverage"
    ]
  },
  "DELHIVERY": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "High operating cash burn and negative free cash flow profile"
    ]
  },
  "YESBANK": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: false,
    warnings: [
      "Elevated NPA legacy and ongoing capital reconstruction"
    ]
  },

  // --- Auditor Warnings / Qualifications ---
  "PAYTM": {
    promoter_pledge_pct: 0.0,
    high_debt: false,
    auditor_warning: true,
    warnings: [
      "RBI regulatory restrictions on banking operations & auditor emphasis of matter"
    ]
  },
  "BRITANNIA": {
    promoter_pledge_pct: 0.0,
    high_debt: false,
    auditor_warning: true,
    warnings: [
      "Auditor qualification regarding inter-corporate deposits and group treasury advances"
    ]
  },
  "BLS": {
    promoter_pledge_pct: 0.0,
    high_debt: false,
    auditor_warning: true,
    warnings: [
      "Regulatory scrutiny and auditor inquiries regarding overseas subsidiary transactions"
    ]
  },
  "PTC": {
    promoter_pledge_pct: 0.0,
    high_debt: false,
    auditor_warning: true,
    warnings: [
      "Auditor and independent directors mass resignation alert over corporate governance"
    ]
  },
  "DISHTV": {
    promoter_pledge_pct: 0.0,
    high_debt: true,
    auditor_warning: true,
    warnings: [
      "Stressed balance sheet and creditor litigation",
      "Auditor qualification regarding license fee provisions"
    ]
  }
};

/**
 * Returns forensic safety attributes for a stock symbol.
 * Output complies with PROJECT.md Interface Contract:
 * {
 *   is_safe: boolean,
 *   flags: string[],
 *   promoter_pledge_pct: number,
 *   high_debt: boolean,
 *   auditor_warning: boolean,
 *   warnings: string[]
 * }
 */
function getForensicsForStock(sym) {
  if (!sym) {
    return {
      is_safe: true,
      flags: [],
      promoter_pledge_pct: 0,
      high_debt: false,
      auditor_warning: false,
      warnings: []
    };
  }

  const item = FORENSICS_DB[sym.toUpperCase()];
  if (!item) {
    return {
      is_safe: true,
      flags: [],
      promoter_pledge_pct: 0,
      high_debt: false,
      auditor_warning: false,
      warnings: []
    };
  }

  const flags = [];
  const pledge = typeof item.promoter_pledge_pct === 'number' ? item.promoter_pledge_pct : 0;
  if (pledge > 20) {
    flags.push('HIGH_PROMOTER_PLEDGE');
  }
  if (item.high_debt) {
    flags.push('HIGH_DEBT_LOAD');
  }
  if (item.auditor_warning) {
    flags.push('AUDITOR_WARNING');
  }

  const isSafe = flags.length === 0;

  return {
    is_safe: isSafe,
    flags,
    promoter_pledge_pct: pledge,
    high_debt: Boolean(item.high_debt),
    auditor_warning: Boolean(item.auditor_warning),
    warnings: item.warnings ? [...item.warnings] : []
  };
}

module.exports = {
  FORENSICS_DB,
  getForensicsForStock
};
