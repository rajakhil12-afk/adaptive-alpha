import os
import pandas as pd
import numpy as np
import yfinance as yf

def load_tickers(csv_path):
    """
    Loads tickers from the official NSE CSV file and formats them for Yahoo Finance.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Ticker file not found at {csv_path}")
    
    df = pd.read_csv(csv_path)
    if 'Symbol' not in df.columns:
        raise ValueError("CSV must contain a 'Symbol' column")
    
    # Format symbols for Yahoo Finance (NSE stocks use .NS suffix)
    tickers = [f"{sym}.NS" for sym in df['Symbol'].tolist()]
    return tickers

def calculate_relative_strength(tickers, benchmark="^NSEI", period="6mo", interval="1d"):
    """
    Calculates Relative Strength of tickers against a benchmark index.
    This can be adapted to specific 'ARS' logic once the exact details are provided.
    """
    print(f"Fetching historical data for {len(tickers)} tickers and benchmark '{benchmark}'...")
    
    # Fetch all tickers + benchmark in one batch
    all_tickers = tickers + [benchmark]
    data = yf.download(all_tickers, period=period, interval=interval, group_by='ticker', progress=False)
    
    results = []
    
    # Extract benchmark close price
    if benchmark in data.columns.levels[0]:
        bench_close = data[benchmark]['Close'].dropna()
        # Benchmark return over the period
        bench_return = (bench_close.iloc[-1] / bench_close.iloc[0] - 1) * 100
    else:
        print(f"Warning: Benchmark {benchmark} data not found. Using absolute metrics instead.")
        bench_close = None
        bench_return = 0

    print("Analyzing Relative Strength and momentum...")
    for ticker in tickers:
        try:
            if ticker not in data.columns.levels[0]:
                continue
            
            ticker_data = data[ticker].dropna()
            if len(ticker_data) < 20:
                continue
                
            close_prices = ticker_data['Close']
            
            # Simple calculations (to be updated with exact Claude share logic)
            curr_price = float(close_prices.iloc[-1])
            prev_price = float(close_prices.iloc[0])
            stock_return = ((curr_price / prev_price) - 1) * 100
            
            # Relative Strength = Stock Return - Benchmark Return
            rs_score = stock_return - bench_return
            
            # Additional standard metrics
            ma_50 = float(close_prices.rolling(50).mean().iloc[-1]) if len(close_prices) >= 50 else np.nan
            ma_200 = float(close_prices.rolling(200).mean().iloc[-1]) if len(close_prices) >= 200 else np.nan
            
            trend = "Bullish" if (np.isnan(ma_50) or curr_price > ma_50) and (np.isnan(ma_200) or curr_price > ma_200) else "Bearish/Neutral"
            
            results.append({
                'Ticker': ticker.replace('.NS', ''),
                'Current Price (INR)': round(curr_price, 2),
                'Return (%)': round(stock_return, 2),
                'Benchmark Return (%)': round(bench_return, 2),
                'Relative Strength Score': round(rs_score, 2),
                'Trend': trend
            })
        except Exception as e:
            # Silently skip errors for individual bad tickers
            continue
            
    df_results = pd.DataFrame(results)
    if not df_results.empty:
        # Sort by Relative Strength Score descending
        df_results = df_results.sort_values(by='Relative Strength Score', ascending=False)
        
    return df_results

if __name__ == "__main__":
    import sys
    
    # Default paths
    scratch_dir = r"C:\Users\compas laptop\Desktop" # Fallback or configured path
    # Use current directory or scratch
    nifty50_path = "ind_nifty50list.csv"
    nifty100_path = "ind_nifty100list.csv"
    
    # Check if files exist locally
    if not os.path.exists(nifty50_path):
        # Check absolute scratch directory
        nifty50_path = r"C:\Users\compas laptop\.gemini\antigravity\scratch\ind_nifty50list.csv"
        nifty100_path = r"C:\Users\compas laptop\.gemini\antigravity\scratch\ind_nifty100list.csv"

    print("=========================================")
    print("      NIFTY STOCK SCREENER STARTER       ")
    print("=========================================")
    
    choice = ''
    if '--nifty50' in sys.argv:
        choice = '1'
    elif '--nifty100' in sys.argv:
        choice = '2'
    else:
        choice = input("Select list to screen:\n1. Nifty 50\n2. Nifty 100\nEnter choice (1 or 2): ").strip()
    
    csv_file = nifty50_path if choice == '1' else nifty100_path
    list_name = "Nifty 50" if choice == '1' else "Nifty 100"
    
    try:
        tickers = load_tickers(csv_file)
        print(f"Loaded {len(tickers)} stocks from {list_name} list.")
        
        results_df = calculate_relative_strength(tickers)
        
        print("\nTop 15 Relative Strength Performers:")
        print(results_df.head(15).to_string(index=False))
        
        # Save to CSV
        output_file = f"screener_results_{list_name.lower().replace(' ', '_')}.csv"
        results_df.to_csv(output_file, index=False)
        print(f"\nFull results saved to {output_file}")
        
    except Exception as e:
        print(f"Error during execution: {e}")
