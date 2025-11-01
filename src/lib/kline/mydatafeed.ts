import type {
  Datafeed,
  SymbolInfo,
  BarArr,
  DatafeedWatchCallback,
  KData,
  GetKlineArgs,
} from "./types";
import { getApi } from "../netio";
import { transformApiDataToKLineData } from "../utils";

export default class MyDatafeed implements Datafeed {
  private _prevSymbol?: SymbolInfo;
  private _ws?: WebSocket;
  private listens: Record<string, unknown> = {};
  private polygonApiKey = "k2hPDhLy8gIpP4lMCU0gwo92xNRxE2XI";
  private dataCache: Map<string, KData> = new Map(); // Cache for consistent data
  private currentPriceCache: Map<string, number> = new Map(); // Cache for current prices
  private loadedDataRanges: Map<string, { earliest: number; latest: number }> =
    new Map(); // Track loaded data ranges
  private isLoadingMore: Map<string, boolean> = new Map(); // Prevent duplicate loading

  async getHistoryKLineData({
    symbol,
    period,
    from,
    to,
    strategy,
  }: GetKlineArgs): Promise<KData> {
    // Create cache key for consistent data
    const cacheKey = `${symbol.ticker}_${period?.timeframe || "1m"}`;

    // Skip cache for daily and weekly timeframes to ensure fresh data after fix
    const timeframe = period?.timeframe || "1m";
    const skipCache = timeframe.endsWith("d") || timeframe.endsWith("w");

    // // Check cache first for consistent data (except for daily/weekly)
    // if (!skipCache && this.dataCache.has(cacheKey)) {
    //   const cachedData = this.dataCache.get(cacheKey)!;
    //   // Update current price cache
    //   if (cachedData.data.length > 0) {
    //     const latestPrice = cachedData.data[cachedData.data.length - 1].close;
    //     this.currentPriceCache.set(symbol.ticker, latestPrice);
    //   }
    //   return cachedData;
    // }

    // Try to fetch data from stocknow.com.bd API
    try {
      const data = await this.getStockNowData(
        symbol.ticker,
        period?.timeframe || "1m",
        from,
        to
      );
      if (data.data.length > 0) {
        this.dataCache.set(cacheKey, data);
        const latestPrice = data.data[data.data.length - 1].close;
        this.currentPriceCache.set(symbol.ticker, latestPrice);

        // Track loaded data range
        const earliest = data.data[0].timestamp;
        const latest = data.data[data.data.length - 1].timestamp;
        this.loadedDataRanges.set(cacheKey, { earliest, latest });

        console.log(
          `Successfully fetched ${data.data.length} data points for ${symbol.ticker} (${period?.timeframe})`
        );
        return data;
      } else {
        console.warn(
          `No data returned from API for ${symbol.ticker} with timeframe ${period?.timeframe}`
        );
      }
    } catch (error) {
      console.error("Failed to fetch from stocknow.com.bd API:", error);
    }

    // Return empty data if API fails
    return { data: [], lays: [] };
  }

  // New method to load more historical data when scrolling left
  async loadMoreHistoricalData(
    symbol: SymbolInfo,
    period: { timeframe: string },
    earliestTimestamp: number,
    retryCount: number = 2
  ): Promise<KData> {
    const cacheKey = `${symbol.ticker}_${period.timeframe}`;

    // Prevent duplicate loading
    if (this.isLoadingMore.get(cacheKey)) {
      console.log(
        `Already loading more data for ${symbol.ticker}, skipping...`
      );
      return { data: [], lays: [] };
    }

    this.isLoadingMore.set(cacheKey, true);

    try {
      console.log(
        `🔄 Loading more historical data for ${symbol.ticker} (timeframe: ${period.timeframe})`
      );

      const stockNowResolution = this.convertResolutionForStockNow(
        period.timeframe
      );
      const existingData = this.dataCache.get(cacheKey);

      // Calculate skip based on existing data length with optimized logic for faster loading
      let skip = 0;
      if (existingData && existingData.data.length > 0) {
        // Use the current data length as skip to get older data
        skip = existingData.data.length;
        console.log(
          `📊 Current data length: ${existingData.data.length}, using skip: ${skip}`
        );
      } else {
        // If no existing data, start with a larger batch for faster initial loading
        skip = 200;
        console.log(`📊 No existing data, using optimized skip: ${skip}`);
      }

      // Build URL with skip parameter and increased limit for faster loading
      const limit = 200; // Fetch more data per request for better performance
      let url = `https://stocknow.com.bd/api/v1/instruments/${symbol.ticker}/history?data2=true&resolution=${stockNowResolution}&skip=${skip}&limit=${limit}`;

      console.log(`🌐 Fetching historical data from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        // Handle 500 errors gracefully with retry mechanism
        if (response.status === 500 && retryCount > 0) {
          console.warn(`⚠️ API returned 500 error for ${symbol.ticker}, retrying (${retryCount} attempts left)...`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.loadMoreHistoricalData(symbol, period, earliestTimestamp, retryCount - 1);
        }
        // Handle 500 errors gracefully - don't throw, just return empty data
        if (response.status === 500) {
          console.warn(`⚠️ API returned 500 error for ${symbol.ticker}, returning empty data`);
          return { data: [], lays: [] };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === "") {
        console.warn(
          `⚠️ Empty response from API for ${symbol.ticker} historical data`
        );
        return { data: [], lays: [] };
      }

      let apiData;
      try {
        apiData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error(
          `❌ Invalid JSON response from API for ${symbol.ticker}:`,
          responseText.substring(0, 200) + "..."
        );
        return { data: [], lays: [] };
      }

      if (!apiData || typeof apiData !== "object") {
        console.warn(
          `⚠️ Invalid API data structure for ${symbol.ticker}:`,
          apiData
        );
        return { data: [], lays: [] };
      }

      // Log API data before transformation
      console.log(`API data for ${symbol}:`, apiData);
      console.log(`API data type:`, typeof apiData);
      console.log(`API data length:`, Array.isArray(apiData) ? apiData.length : 'Not an array');
      
      // Transform the API data using the utility function
      const klineData = transformApiDataToKLineData(apiData);

      if (klineData.length === 0) {
        console.log(`📭 No new historical data available for ${symbol.ticker}`);
        return { data: [], lays: [] };
      }

      // Filter out data that we already have to avoid duplicates
      let filteredNewData = klineData;
      if (existingData && existingData.data.length > 0) {
        const existingTimestamps = new Set(
          existingData.data.map((d) => d.timestamp)
        );
        filteredNewData = klineData.filter(
          (d) => !existingTimestamps.has(d.timestamp)
        );

        console.log(
          `🔍 Filtered ${klineData.length - filteredNewData.length} duplicate entries`
        );
      }

      if (filteredNewData.length > 0) {
        // Sort the new data by timestamp (oldest first)
        filteredNewData.sort((a, b) => a.timestamp - b.timestamp);

        // Update cache with merged data
        if (existingData && existingData.data.length > 0) {
          const mergedData = {
            data: [...filteredNewData, ...existingData.data].sort(
              (a, b) => a.timestamp - b.timestamp
            ),
            lays: [...(existingData.lays || [])],
          };

          this.dataCache.set(cacheKey, mergedData);

          // Update loaded range
          const range = this.loadedDataRanges.get(cacheKey);
          if (range && filteredNewData.length > 0) {
            range.earliest = Math.min(
              range.earliest,
              filteredNewData[0].timestamp
            );
            this.loadedDataRanges.set(cacheKey, range);
          }
        } else {
          // First time loading data
          this.dataCache.set(cacheKey, { data: filteredNewData, lays: [] });
          this.loadedDataRanges.set(cacheKey, {
            earliest: filteredNewData[0].timestamp,
            latest: filteredNewData[filteredNewData.length - 1].timestamp,
          });
        }

        console.log(
          `✅ Successfully loaded ${filteredNewData.length} more historical bars for ${symbol.ticker}`
        );

        // Return only the new data for chart integration
        return { data: filteredNewData, lays: [] };
      } else {
        console.log(`📭 No new unique data found for ${symbol.ticker}`);
        return { data: [], lays: [] };
      }
    } catch (error) {
      console.error(
        `❌ Error loading more historical data for ${symbol.ticker}:`,
        error
      );
      return { data: [], lays: [] };
    } finally {
      this.isLoadingMore.set(cacheKey, false);
    }
  }

  // Helper method to remove duplicate data points based on timestamp
  private removeDuplicateData(data: BarArr[]): BarArr[] {
    const seen = new Set();
    return data.filter((item) => {
      if (seen.has(item[0])) {
        return false;
      }
      seen.add(item[0]);
      return true;
    });
  }

  // Helper method to convert timeframe to milliseconds
  private getTimeframeInMs(timeframe: string): number {
    if (timeframe.endsWith("m")) {
      return parseInt(timeframe.slice(0, -1)) * 60 * 1000;
    } else if (timeframe.endsWith("h")) {
      return parseInt(timeframe.slice(0, -1)) * 60 * 60 * 1000;
    } else if (timeframe.endsWith("d")) {
      return parseInt(timeframe.slice(0, -1)) * 24 * 60 * 60 * 1000;
    } else if (timeframe.endsWith("w")) {
      return parseInt(timeframe.slice(0, -1)) * 7 * 24 * 60 * 60 * 1000;
    }
    // Default to 1 minute if format is not recognized
    return 60 * 1000;
  }

  // Method to check if more data can be loaded
  canLoadMoreData(symbol: SymbolInfo, period: { timeframe: string }): boolean {
    const cacheKey = `${symbol.ticker}_${period.timeframe}`;
    return (
      !this.isLoadingMore.get(cacheKey) && this.loadedDataRanges.has(cacheKey)
    );
  }

  // Convert timeframe format from '1m', '5m', '1h' etc. to just numbers for stocknow API
  private convertResolutionForStockNow(resolution: string): string {
    // Remove 'm' and 'h' suffixes and return just the number
    if (resolution === "1d") {
      return "1D";
    }
    if (resolution === "1w") {
      return "1W";
    }
    if (resolution.endsWith("m")) {
      return resolution.slice(0, -1); // Remove 'm'
    } else if (resolution.endsWith("h")) {
      // Convert hours to minutes
      const hours = parseInt(resolution.slice(0, -1));
      return (hours * 60).toString();
    } else if (resolution.endsWith("d")) {
      // Convert days to minutes
      const days = parseInt(resolution.slice(0, -1));
      return (days * 24 * 60).toString();
    } else if (resolution.endsWith("w")) {
      // Convert weeks to minutes
      const weeks = parseInt(resolution.slice(0, -1));
      return (weeks * 7 * 24 * 60).toString();
    }
    // If it's already a number, return as is
    return resolution;
  }

  async getStockNowData(
    symbol: string,
    resolution: string,
    from?: number,
    to?: number,
    retryCount: number = 2
  ): Promise<KData> {
    try {
      // Convert resolution format for stocknow API
      const stockNowResolution = this.convertResolutionForStockNow(resolution);

      // Build URL - don't use skip parameter for now as it's causing issues
      // Instead, we'll fetch the latest data and handle historical loading differently
      let url = `https://stocknow.com.bd/api/v1/instruments/${symbol}/history?data2=true&resolution=${stockNowResolution}`;

      console.log(`Fetching data from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        // Handle 500 errors gracefully with retry mechanism
        if (response.status === 500 && retryCount > 0) {
          console.warn(`⚠️ API returned 500 error for ${symbol}, retrying (${retryCount} attempts left)...`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.getStockNowData(symbol, resolution, from, to, retryCount - 1);
        }
        // Handle 500 errors gracefully - don't throw, just return empty data
        if (response.status === 500) {
          console.warn(`⚠️ API returned 500 error for ${symbol}, returning empty data`);
          return { data: [], lays: [] };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response has content
      const responseText = await response.text();
      if (!responseText || responseText.trim() === "") {
        console.warn(
          `Empty response from API for ${symbol} with resolution ${resolution}`
        );
        return { data: [], lays: [] };
      }

      // Try to parse JSON
      let apiData;
      try {
        apiData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error(
          `Invalid JSON response from API for ${symbol}:`,
          responseText
        );
        console.error("JSON parse error:", jsonError);
        return { data: [], lays: [] };
      }

      // Check if apiData is valid
      if (!apiData || typeof apiData !== "object") {
        console.warn(`Invalid API data structure for ${symbol}:`, apiData);
        return { data: [], lays: [] };
      }

      // Transform the API data using the utility function
      const klineData = transformApiDataToKLineData(apiData);

      return { data: klineData, lays: [] };
    } catch (error) {
      console.error("Error fetching from stocknow.com.bd API:", error);
      // Return empty data instead of throwing to prevent app crashes
      return { data: [], lays: [] };
    }
  }

  async getSymbols(): Promise<SymbolInfo[]> {
    console.log("🚀 getSymbols() method called");
    const symbols = [
      {
        ticker: "GP",
        name: "Grameen Phone Limited",
        shortName: "GP",
        market: "stock",
        exchange: "DSEBD",
        priceCurrency: "BDT",
        type: "stock",
        logo: "",
      },
      {
        ticker: "ROBI",
        name: "Robi Axiata Limited",
        shortName: "ROBI",
        market: "stock",
        exchange: "DSEBD",
        priceCurrency: "BDT",
        type: "stock",
        logo: "",
      },
      {
        ticker: "KPCL",
        name: "Karnaphuli Power Company Limited",
        shortName: "KPCL",
        market: "stock",
        exchange: "DSEBD",
        priceCurrency: "BDT",
        type: "stock",
        logo: "",
      },
      {
        ticker: "DSEX",
        name: "Dhaka Stock Exchange",
        shortName: "DSEX",
        market: "stock",
        exchange: "DSEBD",
        priceCurrency: "BDT",
        type: "stock",
        logo: "",
      },
      {
        ticker: "HAMI",
        name: "Heidelberg Materials Bangladesh Limited",
        shortName: "HAMI",
        market: "stock",
        exchange: "DSEBD",
        priceCurrency: "BDT",
        type: "stock",
        logo: "",
      },
    ];
    console.log("📋 Returning symbols:", symbols);
    return symbols;
  }

  watch(key: string, callback: DatafeedWatchCallback) {
    if (!this._ws) return;
    this._ws?.send(
      JSON.stringify({
        action: "watch",
        key: key,
      })
    );
    this.listens[key] = callback;
  }

  subscribe(symbol: SymbolInfo, callback: DatafeedWatchCallback): void {
    if (this._prevSymbol?.ticker === symbol.ticker) return;
    this._prevSymbol = symbol;
    this.unsubscribe();
    
    // For demo purposes, we'll simulate real-time data updates
    // since we don't have a proper WebSocket endpoint for stock data
    console.log(`Subscribing to real-time updates for ${symbol.ticker}`);
    
    // Simulate real-time updates with interval
    const intervalId = setInterval(() => {
      // Get current price from cache or use a random value
      const currentPrice = this.currentPriceCache.get(symbol.ticker) || 
                          Math.random() * 100 + 10; // Random price between 10-110
      
      const priceChange = (Math.random() - 0.5) * 2; // Random price change ±1
      const newPrice = currentPrice + priceChange;
      
      // Update current price cache
      this.currentPriceCache.set(symbol.ticker, newPrice);
      
      // Create the expected format with bars array and secs
      const timestamp = Date.now();
      const bar = [
        timestamp,
        currentPrice,
        Math.max(currentPrice, newPrice) + Math.random() * 0.5,
        Math.min(currentPrice, newPrice) - Math.random() * 0.5,
        newPrice,
        Math.random() * 1000 // Random volume
      ];
      
      // Call the callback with the expected format
      callback({
        bars: [bar],
        secs: 1 // 1 second interval
      });
    }, 2000); // Update every 2 seconds
    
    // Store the interval ID for cleanup
    this.listens[symbol.ticker] = intervalId;
  }

  unsubscribe(): void {
    if (this._ws) {
      this._ws.close();
      this._ws = undefined;
    }
    
    // Clear all intervals for real-time updates
    Object.values(this.listens).forEach((intervalId) => {
      if (typeof intervalId === 'number') {
        clearInterval(intervalId);
      }
    });
    
    this.listens = {};
  }

  // Get consistent current price for a symbol
  getCurrentPrice(ticker: string): number | null {
    return this.currentPriceCache.get(ticker) || null;
  }

  // Clear cache (useful for testing or reset)
  clearCache(): void {
    this.dataCache.clear();
    this.currentPriceCache.clear();
    this.loadedDataRanges.clear();
    this.isLoadingMore.clear();
  }
}
