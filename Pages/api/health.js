// Health check endpoint - Cek koneksi ke semua API
export default async function handler(req, res) {
  const status = {
    binance: { status: 'unknown', latency: null },
    polymarket: { status: 'unknown', latency: null },
    timestamp: Date.now()
  };
  
  // Cek Binance
  const binanceStart = Date.now();
  try {
    const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    if (binanceRes.ok) {
      status.binance.status = 'healthy';
      status.binance.latency = Date.now() - binanceStart;
    } else {
      status.binance.status = 'unhealthy';
    }
  } catch (error) {
    status.binance.status = 'error';
    status.binance.error = error.message;
  }
  
  // Cek Polymarket
  const polyStart = Date.now();
  try {
    const polyRes = await fetch('https://gamma-api.polymarket.com/markets?limit=1');
    if (polyRes.ok) {
      status.polymarket.status = 'healthy';
      status.polymarket.latency = Date.now() - polyStart;
    } else {
      status.polymarket.status = 'unhealthy';
    }
  } catch (error) {
    status.polymarket.status = 'error';
    status.polymarket.error = error.message;
  }
  
  res.status(200).json(status);
}
