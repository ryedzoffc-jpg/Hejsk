import { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Home() {
  // State data real-time
  const [binancePrice, setBinancePrice] = useState(null);
  const [polyPrice, setPolyPrice] = useState(null);
  const [edge, setEdge] = useState(0);
  const [opportunity, setOpportunity] = useState(false);

  // Trading state
  const [balance, setBalance] = useState(10000);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [trades, setTrades] = useState([]);
  const [winRate, setWinRate] = useState(0);

  // Chart data
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ label: 'Cumulative PnL (USDT)', data: [], borderColor: '#f0b90b', tension: 0.2 }]
  });

  // Load dari localStorage saat mount
  useEffect(() => {
    const savedBalance = localStorage.getItem('bot_balance');
    const savedTrades = localStorage.getItem('bot_trades');
    if (savedBalance) setBalance(parseFloat(savedBalance));
    if (savedTrades) {
      const parsed = JSON.parse(savedTrades);
      setTrades(parsed);
      updateWinRateAndChart(parsed);
    }
  }, []);

  // Update win rate & chart
  const updateWinRateAndChart = (tradeList) => {
    if (tradeList.length === 0) {
      setWinRate(0);
      setChartData(prev => ({ ...prev, labels: [], datasets: [{ ...prev.datasets[0], data: [] }] }));
      return;
    }
    const wins = tradeList.filter(t => t.profit > 0).length;
    const rate = (wins / tradeList.length) * 100;
    setWinRate(rate);

    const cumulative = [];
    let sum = 0;
    tradeList.forEach(t => {
      sum += t.profit;
      cumulative.push(sum);
    });
    setChartData({
      labels: tradeList.map((_, idx) => `#${idx+1}`),
      datasets: [{ label: 'Cumulative PnL (USDT)', data: cumulative, borderColor: '#f0b90b', fill: false }]
    });
  };

  // Simpan ke localStorage
  const persistData = (newBalance, newTrades) => {
    localStorage.setItem('bot_balance', newBalance.toString());
    localStorage.setItem('bot_trades', JSON.stringify(newTrades));
    setBalance(newBalance);
    setTrades(newTrades);
    updateWinRateAndChart(newTrades);
  };

  // Fetch harga dari API backend
  const fetchPrices = async () => {
    try {
      const [binanceRes, polyRes] = await Promise.all([
        fetch('/api/binance'),
        fetch('/api/polymarket')
      ]);
      const binanceData = await binanceRes.json();
      const polyData = await polyRes.json();
      const bPrice = binanceData.price;
      const pPrice = polyData.price;
      setBinancePrice(bPrice);
      setPolyPrice(pPrice);
      const edgeVal = (bPrice - pPrice) / pPrice;
      setEdge(edgeVal);
      setOpportunity(edgeVal > 0.02);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 2000);
    return () => clearInterval(interval);
  }, []);

  // Eksekusi trade (simulasi)
  const executeTrade = () => {
    if (!opportunity && edge <= 0.02) {
      alert('Tidak ada opportunity (>2%) untuk dieksekusi');
      return;
    }
    if (tradeAmount > balance) {
      alert('Balance tidak mencukupi');
      return;
    }
    const profit = tradeAmount * edge;
    const newBalance = balance + profit;
    const newTrade = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      binancePrice,
      polymarketPrice: polyPrice,
      edge: (edge * 100).toFixed(2) + '%',
      profit: profit,
      amount: tradeAmount
    };
    const updatedTrades = [newTrade, ...trades];
    persistData(newBalance, updatedTrades);
    // feedback
    alert(`Trade executed! Profit: ${profit.toFixed(2)} USDT`);
  };

  return (
    <div className="container">
      <h1>⚡ Latency Arbitrage Bot</h1>
      <p>Real-time data | Binance vs Polymarket (implied)</p>

      <div className="card">
        <div className="price-grid">
          <div className="price-card">
            <div className="price-label">Binance BTC/USDT</div>
            <div className="price-value">${binancePrice?.toLocaleString() ?? '--'}</div>
          </div>
          <div className="price-card">
            <div className="price-label">Polymarket (Implied BTC)</div>
            <div className="price-value">${polyPrice?.toLocaleString() ?? '--'}</div>
          </div>
          <div className="price-card">
            <div className="price-label">Arbitrage Edge</div>
            <div className="price-value" style={{ color: edge > 0 ? '#00c853' : '#ff4d4d' }}>
              {(edge * 100).toFixed(4)}%
            </div>
          </div>
        </div>

        <div className={opportunity ? "opportunity" : "no-trade"} style={{ padding: '1rem', borderRadius: 16 }}>
          {opportunity ? (
            <strong>✅ OPPORTUNITY DETECTED! Edge &gt; 2%</strong>
          ) : (
            <strong>❌ No Trade — Edge di bawah threshold</strong>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex-between">
          <div>
            <h3>💰 Balance: ${balance.toFixed(2)}</h3>
            <h3>📈 Win Rate: {winRate.toFixed(1)}%</h3>
          </div>
          <div>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
              step="10"
              min="1"
            />
            <button className="btn btn-primary" onClick={executeTrade} disabled={!binancePrice}>
              🚀 Execute Trade
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>📊 Profit Chart (Cumulative)</h3>
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      <div className="card">
        <h3>📜 Trade History</h3>
        {trades.length === 0 ? (
          <p>Belum ada eksekusi</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Waktu</th><th>Binance</th><th>Polymarket</th><th>Edge</th><th>Profit (USDT)</th></tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id}>
                    <td>{t.timestamp}</td>
                    <td>${t.binancePrice?.toFixed(2)}</td>
                    <td>${t.polymarketPrice?.toFixed(2)}</td>
                    <td>{t.edge}</td>
                    <td className={t.profit > 0 ? 'win' : 'loss'}>{t.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
