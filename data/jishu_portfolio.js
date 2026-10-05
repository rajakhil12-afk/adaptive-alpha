window.STATIC_JISHU_PORTFOLIO = {
  "bot_name": "Jishu",
  "version": "3.0.0",
  "created_at": "2026-10-01T09:15:00.000Z",
  "last_updated": "2026-10-05T04:51:30.828Z",
  "account": {
    "initial_capital": 1000000,
    "cash": 1000000,
    "invested_capital": 0,
    "total_equity": 1000000,
    "realized_pnl": 0,
    "unrealized_pnl": 0,
    "win_rate": 0,
    "total_trades": 0,
    "winning_trades": 0,
    "losing_trades": 0
  },
  "settings": {
    "max_positions": 10,
    "max_capital_per_trade_pct": 10,
    "fixed_sl_pct": 10,
    "target_1_rr": 1,
    "target_2_rr": 2,
    "min_volume_ratio": 1.2,
    "min_rs_rating": 75,
    "max_distance_from_st_pct": 7,
    "risk_pct_per_trade": 1,
    "min_market_sentiment_score": 35
  },
  "open_positions": [],
  "closed_trades": [],
  "daily_equity": [
    {
      "date": "2026-10-01",
      "cash": 1000000,
      "invested": 0,
      "total_equity": 1000000,
      "realized_pnl": 0,
      "unrealized_pnl": 0,
      "open_positions_count": 0
    }
  ],
  "recent_events": [
    {
      "timestamp": "2026-10-05T04:51:30.827Z",
      "type": "MACRO_REGIME_PAUSE",
      "message": "🛡️ [MACRO SENTINEL CIRCUIT BREAKER] Regime: CORRECTION_DEFENSE (40/100) | VIX: 14.5 | FII: ₹0 Cr. New buying paused to preserve cash."
    },
    {
      "timestamp": "2026-10-01T09:15:00.000Z",
      "type": "PORTFOLIO_RESET",
      "message": "🚀 Jishu Institutional Multi-Agent Desk fresh launch on 01 Oct 2026 with ₹10,00,000 starting capital."
    }
  ],
  "macro_regime": {
    "regime": "CORRECTION_DEFENSE",
    "regimeColor": "#f97316",
    "regimeBadgeBg": "rgba(249, 115, 22, 0.18)",
    "marketScore": 40,
    "vixLevel": 14.5,
    "vixRegime": "ELEVATED_CHOPPY",
    "fiiNet": 0,
    "diiNet": 0,
    "combinedNet": 0,
    "circuitBreakerActive": true,
    "maxAllowedSlots": 3,
    "maxCapitalPerTradePct": 7.5,
    "guidance": "⚠️ Market in pullback correction. New aggressive breakouts paused. Limit exposure to max 3 slots."
  },
  "sleeves": {
    "sleeveA": {
      "id": "SLEEVE_A",
      "name": "Alpha Breakouts & Super Momentum",
      "icon": "🚀",
      "targetAllocPct": 50,
      "maxPositions": 5,
      "minRsRating": 80,
      "maxHoldingDays": 15,
      "targetPct": 20,
      "targetCapital": 200000,
      "investedCapital": 0,
      "availableCapital": 200000,
      "openPositions": 0,
      "openSlots": 5,
      "utilizationPct": 0
    },
    "sleeveB": {
      "id": "SLEEVE_B",
      "name": "Leader Retest & Dip Buys",
      "icon": "🎯",
      "targetAllocPct": 30,
      "maxPositions": 3,
      "minRsRating": 65,
      "maxHoldingDays": 30,
      "targetPct": 30,
      "targetCapital": 300000,
      "investedCapital": 0,
      "availableCapital": 300000,
      "openPositions": 0,
      "openSlots": 3,
      "utilizationPct": 0
    },
    "sleeveC": {
      "id": "SLEEVE_C",
      "name": "Dynamic Liquidity & Cash Buffer",
      "icon": "🛡️",
      "targetAllocPct": 20,
      "maxPositions": 0,
      "targetPct": 50,
      "targetCapital": 500000,
      "status": "ACTIVE BUFFER"
    }
  },
  "quant_metrics": {
    "profitFactor": 0,
    "sharpeRatio": 0,
    "sortinoRatio": 0,
    "maxDrawdownPct": 0,
    "maxDrawdownValue": 0,
    "payoffRatio": 0,
    "expectancy": 0,
    "totalGains": 0,
    "totalLosses": 0,
    "totalClosedTrades": 0,
    "winRatePct": 0
  },
  "quant_recommendations": [
    {
      "type": "CAPITAL_HEALTH",
      "badge": "✅ STABLE",
      "text": "Capital curve is well-protected. Max Drawdown contained at 0.0% (Institutional standard < 8%)."
    }
  ]
};