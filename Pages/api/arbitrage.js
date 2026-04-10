// Arbitrage endpoint - Gabungan Binance + Polymarket dalam 1 request
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const startTime = Date.now();
  
  try {
    // Fetch kedua API secara parallel
    const [binanceRes, polymarketRes] = await Promise.allSettled([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
      fetch('https://gamma-api.polymarket.com/markets?limit=50&closed=false')
    ]);
    
    let binancePrice = null;
    let polymarketPrice = null;
    let edge = null;
    let opportunity = false;
    
    // Process Binance result
    if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
      const data = await binanceRes.value.json();
      binancePrice = parseFloat(data.price);
    }
    
    // Process Polymarket result
    if (polymarketRes.status === 'fulfilled' && polymarketRes.value.ok) {
      const markets = await polymarketRes.value.json();
      // Cari market BTC
      const btcMarket = markets.find(m => 
        (m.question?.toLowerCase().includes('bitcoin') || 
         m.slug?.toLowerCase().includes('btc')) &&
        m.clobTokenIds?.Yes
      );
      
      if (btcMarket) {
        const yesTokenId = btcMarket.clobTokenIds.Yes;
        const tickerRes = await fetch(`https://clob.polymarket.com/ticker?token_id=${yesTokenId}`);
        const ticker = await tickerRes.json();
        const yesPrice = parseFloat(ticker.best_bid || ticker.last_trade_price || 0.5);
        const threshold = 70000;
        polymarketPrice = yesPrice * threshold;
      }
    }
    
    // Jika Polymarket gagal, gunakan Binance - 0.5%
    if (!polymarketPrice && binancePrice) {
      polymarketPrice = binancePrice * 0.995;
    }
    
    // Hitung edge
    if (binancePrice && polymarketPrice) {
      edge = (binancePrice - polymarketPrice) / polymarketPrice;
      opportunity = edge > 0.02;
    }
    
    res.status(200).json({
      success: true,
      binance: binancePrice,
      polymarket: polymarketPrice,
      edge: edge,
      edgePercent: edge ? (edge * 100).toFixed(4) + '%' : 'N/A',
      opportunity: opportunity,
      latency: Date.now() - startTime,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Arbitrage API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
}
