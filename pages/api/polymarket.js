export default async function handler(req, res) {
  try {
    // 1. Cari market berdasarkan slug
    const marketSlug = 'will-bitcoin-price-close-above-70k-on-july-26-2024';
    const gammaRes = await fetch(`https://gamma-api.polymarket.com/markets?slug=${marketSlug}`);
    const markets = await gammaRes.json();
    if (!markets || markets.length === 0) throw new Error('Market not found');
    const market = markets[0];

    // 2. Dapatkan token ID untuk "Yes"
    const yesTokenId = market.clobTokenIds?.Yes;
    if (!yesTokenId) throw new Error('Yes token ID missing');

    // 3. Ambil harga dari clob (best bid)
    const tickerRes = await fetch(`https://clob.polymarket.com/ticker?token_id=${yesTokenId}`);
    const ticker = await tickerRes.json();
    const yesPrice = parseFloat(ticker.best_bid || ticker.last_trade_price || 0.5);

    // 4. Threshold dari market (misal 70000)
    const threshold = 70000; // dari pertanyaan market
    const impliedPrice = yesPrice * threshold;

    res.status(200).json({ price: impliedPrice, rawYesPrice: yesPrice });
  } catch (error) {
    console.error(error);
    // Fallback: gunakan harga Binance - 0.5% (simulasi perbedaan real)
    const fallbackPrice = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
      .then(r => r.json())
      .then(d => parseFloat(d.price) * 0.995);
    res.status(200).json({ price: fallbackPrice, note: 'fallback' });
  }
}
