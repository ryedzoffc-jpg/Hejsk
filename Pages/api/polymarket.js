// Polymarket API - Mendapatkan implied price BTC dari market prediction
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Strategy 1: Cari market BTC aktif dari Gamma API
    const gammaUrl = 'https://gamma-api.polymarket.com/markets?limit=100&closed=false&order=volume24hr&ascending=false';
    const marketsRes = await fetch(gammaUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!marketsRes.ok) {
      throw new Error(`Gamma API error: ${marketsRes.status}`);
    }
    
    const allMarkets = await marketsRes.json();
    
    // Cari market yang berhubungan dengan Bitcoin price
    const btcKeywords = ['bitcoin', 'btc', 'will bitcoin', 'btc price'];
    let btcMarket = null;
    
    for (const market of allMarkets) {
      const question = (market.question || '').toLowerCase();
      const slug = (market.slug || '').toLowerCase();
      
      if (btcKeywords.some(keyword => question.includes(keyword) || slug.includes(keyword))) {
        // Cek apakah market binary (Yes/No)
        if (market.outcomes && (market.outcomes.includes('Yes') || market.outcomes.includes('No'))) {
          btcMarket = market;
          break;
        }
      }
    }
    
    // Jika tidak nemu market BTC, fallback ke Binance
    if (!btcMarket) {
      console.log('No BTC market found, using fallback');
      const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const binanceData = await binanceRes.json();
      const fallbackPrice = parseFloat(binanceData.price) * 0.997; // -0.3% simulasi
      
      return res.status(200).json({
        success: true,
        price: fallbackPrice,
        timestamp: Date.now(),
        source: 'polymarket-fallback',
        note: 'No active BTC market, using Binance -0.3%'
      });
    }
    
    // Dapatkan token ID untuk "Yes"
    const yesTokenId = btcMarket.clobTokenIds?.Yes || btcMarket.tokens?.find(t => t.outcome === 'Yes')?.token_id;
    
    if (!yesTokenId) {
      throw new Error('Yes token ID not found');
    }
    
    // Ambil harga dari CLOB (Central Limit Order Book)
    const clobUrl = `https://clob.polymarket.com/ticker?token_id=${yesTokenId}`;
    const tickerRes = await fetch(clobUrl);
    
    if (!tickerRes.ok) {
      throw new Error(`CLOB API error: ${tickerRes.status}`);
    }
    
    const ticker = await tickerRes.json();
    
    // Ambil best bid atau last trade price
    let yesPrice = 0.5; // default
    if (ticker.best_bid) {
      yesPrice = parseFloat(ticker.best_bid);
    } else if (ticker.last_trade_price) {
      yesPrice = parseFloat(ticker.last_trade_price);
    } else if (ticker.mark) {
      yesPrice = parseFloat(ticker.mark);
    }
    
    // Extract threshold dari question (contoh: "above $70,000")
    let threshold = 70000; // default
    const question = btcMarket.question || '';
    const thresholdMatch = question.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
    if (thresholdMatch) {
      threshold = parseFloat(thresholdMatch[1].replace(/,/g, ''));
    }
    
    // Hitung implied price = probability * threshold
    const impliedPrice = yesPrice * threshold;
    
    res.status(200).json({
      success: true,
      price: impliedPrice,
      rawYesPrice: yesPrice,
      threshold: threshold,
      marketQuestion: btcMarket.question,
      volume24h: btcMarket.volume24hr,
      timestamp: Date.now(),
      source: 'polymarket'
    });
    
  } catch (error) {
    console.error('Polymarket API Error:', error.message);
    
    // Emergency fallback: Gunakan Binance price - 0.5%
    try {
      const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const binanceData = await binanceRes.json();
      const emergencyPrice = parseFloat(binanceData.price) * 0.995;
      
      res.status(200).json({
        success: true,
        price: emergencyPrice,
        timestamp: Date.now(),
        source: 'emergency-fallback',
        note: 'Polymarket API error, using Binance -0.5%'
      });
    } catch (fallbackError) {
      // Last resort fallback
      res.status(200).json({
        success: true,
        price: 64750,
        timestamp: Date.now(),
        source: 'hardcoded-fallback',
        note: 'Both APIs failed, using hardcoded price'
      });
    }
  }
}
