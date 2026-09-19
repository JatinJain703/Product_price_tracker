import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

const STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
};

function getStatus(entry) {
  if (entry.hasError) return STATUS.FAILED;
  return STATUS.SUCCESS;
}

const StatusBadge = ({ entry }) => {
  const status = getStatus(entry);
  if (status === STATUS.SUCCESS) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle className="w-3.5 h-3.5" /> Success
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <XCircle className="w-3.5 h-3.5" /> Failed
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-4 border border-gray-100 text-sm">
        <p className="font-semibold text-gray-700 mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value !== null && p.value !== undefined ? p.value : 'N/A'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ProductHistory({ product, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`https://product-price-tracker-9hse.onrender.com/history/${product.productId}`);
        setHistory(res.data.results || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load history for this product.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [product.productId]);

  // Prepare chart data — reverse so oldest is first on the X axis
  const chartData = [...history].reverse().map((h) => ({
    time: new Date(h.scrapedAt).toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    Price: h.hasError ? null : (h.price ?? null),
    Stock: h.hasError ? null : (typeof h.stock === 'string'
      ? (h.stock.match(/(\d+)/) ? parseInt(h.stock.match(/(\d+)/)[1]) : null)
      : (h.stock ?? null)),
  }));

  const successCount = history.filter(h => !h.hasError).length;
  const failCount = history.filter(h => h.hasError).length;
  const latestPrice = history.find(h => !h.hasError)?.price;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Tracked
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-blue-900 leading-tight">{product.name}</h1>
            <p className="text-sm text-gray-500">Product ID: {product.productId} · {product.brand}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-blue-600 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="text-lg font-medium text-gray-600">Loading history...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-1">No history yet</h3>
            <p className="text-gray-500">Run the scraper to start recording price and stock data.</p>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">Total Scrapes</p>
                <p className="text-3xl font-bold text-gray-900">{history.length}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">Successful</p>
                <p className="text-3xl font-bold text-green-600">{successCount}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">Failed</p>
                <p className="text-3xl font-bold text-red-500">{failCount}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">Latest Price</p>
                <p className="text-3xl font-bold text-blue-600">
                  {latestPrice !== undefined && latestPrice !== null ? `₹${latestPrice}` : '—'}
                </p>
              </div>
            </div>

            {/* Chart */}
            {chartData.some(d => d.Price !== null) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Price & Stock Over Time</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="price"
                      orientation="left"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <YAxis
                      yAxisId="stock"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="Price"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                    <Line
                      yAxisId="stock"
                      type="monotone"
                      dataKey="Stock"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Scrape Log Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Scrape Log</h2>
                <p className="text-sm text-gray-500 mt-0.5">Every attempt recorded — successes and failures.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Price</th>
                      <th className="px-6 py-3">Stock</th>
                      <th className="px-6 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map((entry, i) => (
                      <tr
                        key={entry.id}
                        className={`transition-colors ${entry.hasError ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{history.length - i}</td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          {new Date(entry.scrapedAt).toLocaleString('en-IN', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge entry={entry} />
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {entry.price !== null && entry.price !== undefined ? `₹${entry.price}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {entry.stock ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-500 max-w-xs">
                          {entry.hasError && entry.errorText ? (
                            <span className="inline-flex items-start gap-1 text-red-600 text-xs">
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2" title={entry.errorText}>{entry.errorText}</span>
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
