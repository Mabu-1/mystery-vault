import { useState, useEffect } from 'react';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, envRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/envelopes'),
      ]);
      const statsData = await statsRes.json();
      const envData = await envRes.json();
      setStats(statsData);
      setEnvelopes(envData.envelopes || []);
    } catch (err) {
      setMessage('Failed to load data');
    }
    setLoading(false);
  }

  async function handleReset() {
    if (!confirm('Reset ALL envelopes? This cannot be undone.')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || 'Reset done');
      fetchData();
    } catch (err) {
      setMessage('Reset failed');
    }
    setResetting(false);
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-yellow-400">🗄️ Mystery Vault Admin</h1>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold disabled:opacity-50 transition"
          >
            {resetting ? 'Resetting...' : '🔄 Reset All'}
          </button>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-yellow-400 text-gray-900 rounded-lg font-bold">
            {message}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-800' },
              { label: 'Claimed', value: stats.claimed, color: 'bg-green-900' },
              { label: 'Unclaimed', value: stats.unclaimed, color: 'bg-blue-900' },
              { label: 'Eligible', value: stats.total_eligible, color: 'bg-purple-900' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-6 text-center`}>
                <div className="text-3xl font-bold text-yellow-400">{s.value}</div>
                <div className="text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Order ID</th>
                  <th className="text-left py-3 px-4">Claimed At</th>
                </tr>
              </thead>
              <tbody>
                {envelopes.map(env => (
                  <tr key={env.envelope_number} className="border-b border-gray-900 hover:bg-gray-900">
                    <td className="py-3 px-4 font-bold text-yellow-400">#{env.envelope_number}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        env.status === 'claimed'
                          ? 'bg-green-900 text-green-400'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {env.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{env.customer_email || '—'}</td>
                    <td className="py-3 px-4 text-gray-300">{env.order_id || '—'}</td>
                    <td className="py-3 px-4 text-gray-400">{env.claimed_at || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
