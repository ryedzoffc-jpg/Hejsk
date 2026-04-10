export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const data = await response.json();
    res.status(200).json({ price: parseFloat(data.price) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch Binance price' });
  }
}
