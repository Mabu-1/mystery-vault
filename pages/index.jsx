import { useState } from 'react';
import VaultGrid from '../components/VaultGrid';

export default function Home() {
  const [email, setEmail] = useState('');
  const [eligible, setEligible] = useState(false);
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(null);
  const [orderId, setOrderId] = useState(null);

  async function handleCheck() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/check-eligibility?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!data.eligible) {
        setError(data.reason || 'Not eligible');
        setEligible(false);
      } else {
        setOrderId(data.order_id);
        const envRes = await fetch(`/api/envelopes`);
        const envData = await envRes.json();
        setEnvelopes(envData.envelopes || []);
        setEligible(true);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  async function handleClaim(envelope_number) {
    if (claiming) return;
    setClaiming(true);
    setError('');
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, envelope_number, order_id: orderId }),
      });
      const data = await res.json();

      if (data.status === 'ok') {
        setClaimed(envelope_number);
        setEnvelopes(prev =>
          prev.map(e =>
            e.envelope_number === envelope_number
              ? { ...e, status: 'claimed' }
              : e
          )
        );
      } else {
        setError(data.error || 'Could not claim envelope');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setClaiming(false);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-12 px-4">
      <h1 className="text-4xl font-bold mb-2 text-yellow-400">🎁 Mystery Vault</h1>
      <p className="text-gray-400 mb-8 text-center">
        Purchase a product to unlock your mystery envelope!
      </p>

      {!eligible ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <input
            type="email"
            placeholder="Enter your order email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:border-yellow-400"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !email}
            className="w-full py-3 bg-yellow-400 text-gray-900 font-bold rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition"
          >
            {loading ? 'Checking...' : 'Unlock My Vault 🔓'}
          </button>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      ) : claimed ? (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold text-yellow-400">You got a Mystery T-Shirt!</h2>
          <p className="text-gray-400">Envelope #{claimed} claimed successfully.</p>
          <p className="text-gray-500 text-sm">Check your email for details.</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          <p className="text-center text-gray-400 mb-6">
            Pick one envelope to reveal your mystery item 👇
          </p>
          {claiming && (
            <p className="text-center text-yellow-400 mb-4 animate-pulse">Opening envelope...</p>
          )}
          {error && <p className="text-center text-red-400 mb-4">{error}</p>}
          <VaultGrid envelopes={envelopes} onClaim={handleClaim} />
        </div>
      )}
    </main>
  );
}
