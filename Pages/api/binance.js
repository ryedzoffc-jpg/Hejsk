// Binance API - Mendapatkan harga BTC/USDT real-time
export default async function handler(req, res) {
  // Set CORS headers agar aman
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Fetch dari Binance public API (tidak perlu API key)
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.price) {
      throw new Error('Invalid response from Binance');
    }
    
    const price = parseFloat(data.price);
    
    // Return response dengan timestamp
    res.status(200).json({
      success: true,
      symbol: 'BTCUSDT',
      price: price,
      timestamp: Date.now(),
      source: 'binance'
    });
    
  } catch (error) {
    console.error('Binance API Error:', error.message);
    
    // Fallback ke harga hardcoded (hanya untuk emergency)
    const fallbackPrice = 65000;
    
    res.status(200).json({
      success: true,
      price: fallbackPrice,
      timestamp: Date.now(),
      source: 'binance-fallback',
      note: 'Using fallback price due to API error'
    });
  }
}
