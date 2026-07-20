
import { useState, useEffect } from 'react';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [envelopes, setEnvelopes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shipping, setShipping] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('envelopes');
  const [rewardTab, setRewardTab] = useState('product');

  // Bulk product state
  const [products, setProducts] = useState([{ url: '', image: '', title: '', envelopes: '' }]);
  const [fetchingIdx, setFetchingIdx] = useState(null);
  const [savingBulk, setSavingBulk] = useState(false);

  // Bulk discount state
  const [discounts, setDiscounts] = useState([{ code: '', envelopes: '' }]);
  const [savingDiscounts, setSavingDiscounts] = useState(false);

  // Per-envelope message state
  const [messages, setMessages] = useState({});
  const [savingMessages, setSavingMessages] = useState(false);

  // Single envelope edit
  const [editEnv, setEditEnv] = useState(null);
  const [editForm, setEditForm] = useState({ type: 'empty', product_url: '', product_image: '', discount_code: '', reward_message: '' });
  const [saving, setSaving] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [productPreview, setProductPreview] = useState(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, envRes, custRes, shipRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/envelopes'),
        fetch('/api/customers'),
        fetch('/api/shipping'),
      ]);
      setStats(await statsRes.json());
      const envData = (await envRes.json()).envelopes || [];
      setEnvelopes(envData);
      setCustomers((await custRes.json()).customers || []);
      setShipping((await shipRes.json()).shipping || []);

      // init messages from existing data
      const msgMap = {};
      envData.forEach(e => {
        if (e.reward_message) msgMap[e.envelope_number] = e.reward_message;
      });
      setMessages(msgMap);
    } catch (err) {
      showMsg('Failed to load data', 'error');
    }
    setLoading(false);
  }

  function showMsg(text, type = 'success') {
    setMessage(text);
    setMsgType(type);
    setTimeout(() => setMessage(''), 4000);
  }

  async function handleReset() {
    if (!confirm('Reset ALL envelopes? This cannot be undone.')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      showMsg(data.message || 'Reset done');
      fetchData();
    } catch (err) {
      showMsg('Reset failed', 'error');
    }
    setResetting(false);
  }

  useEffect(() => { fetchData(); }, []);

  // ── Parse envelope ranges ──────────────────────────────────
  function parseEnvelopes(str) {
    const nums = new Set();
    str.split(',').forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(Number);
        for (let i = a; i <= b; i++) if (i >= 1 && i <= 100) nums.add(i);
      } else {
        const n = Number(part);
        if (n >= 1 && n <= 100) nums.add(n);
      }
    });
    return [...nums];
  }

  // ── Fetch product ─────────────────────────────────────────
  async function fetchProduct(idx) {
    const url = products[idx].url;
    if (!url) return;
    setFetchingIdx(idx);
    try {
      const res = await fetch('/api/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_url: url }),
      });
      const data = await res.json();
      if (data.image) {
        setProducts(prev => prev.map((p, i) => i === idx ? { ...p, image: data.image, title: data.title } : p));
      } else {
        showMsg('Could not fetch product. Check URL.', 'error');
      }
    } catch (err) {
      showMsg('Failed to fetch product', 'error');
    }
    setFetchingIdx(null);
  }

  // ── Save bulk products ─────────────────────────────────────
  async function saveBulkProducts() {
    setSavingBulk(true);
    try {
      const batch = [];
      for (const p of products) {
        if (!p.url || !p.image || !p.envelopes) continue;
        const nums = parseEnvelopes(p.envelopes);
        nums.forEach(n => batch.push({
          envelope_number: n,
          type: 'product',
          product_url: p.url,
          product_image: p.image,
          discount_code: '',
          reward_message: '',
        }));
      }
      if (batch.length === 0) { showMsg('Nothing to save', 'error'); setSavingBulk(false); return; }
      const res = await fetch('/api/bulk-update-envelopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelopes: batch }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        showMsg(`✅ Updated ${data.updated} envelopes with products!`);
        fetchData();
      } else {
        showMsg('Save failed', 'error');
      }
    } catch (err) {
      showMsg('Save failed', 'error');
    }
    setSavingBulk(false);
  }

  // ── Save bulk discounts ────────────────────────────────────
  async function saveBulkDiscounts() {
    setSavingDiscounts(true);
    try {
      const batch = [];
      for (const d of discounts) {
        if (!d.code || !d.envelopes) continue;
        const nums = parseEnvelopes(d.envelopes);
        nums.forEach(n => batch.push({
          envelope_number: n,
          type: 'discount',
          product_url: '',
          product_image: '',
          discount_code: d.code,
          reward_message: '',
        }));
      }
      if (batch.length === 0) { showMsg('Nothing to save', 'error'); setSavingDiscounts(false); return; }
      const res = await fetch('/api/bulk-update-envelopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelopes: batch }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        showMsg(`✅ Updated ${data.updated} envelopes with discount codes!`);
        fetchData();
      } else {
        showMsg('Save failed', 'error');
      }
    } catch (err) {
      showMsg('Save failed', 'error');
    }
    setSavingDiscounts(false);
  }

  // ── Save messages ─────────────────────────────────────────
  async function saveMessages() {
    setSavingMessages(true);
    try {
      const batch = Object.entries(messages)
        .filter(([, msg]) => msg && msg.trim())
        .map(([num, msg]) => ({
          envelope_number: Number(num),
          type: 'empty',
          product_url: '',
          product_image: '',
          discount_code: '',
          reward_message: msg.trim(),
        }));
      if (batch.length === 0) { showMsg('No messages to save', 'error'); setSavingMessages(false); return; }
      const res = await fetch('/api/bulk-update-envelopes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelopes: batch }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        showMsg(`✅ Saved messages for ${data.updated} envelopes!`);
        fetchData();
      } else {
        showMsg('Save failed', 'error');
      }
    } catch (err) {
      showMsg('Save failed', 'error');
    }
    setSavingMessages(false);
  }

  // ── Single envelope edit ───────────────────────────────────
  function openEdit(env) {
    setEditEnv(env);
    setEditForm({
      type: env.type || 'empty',
      product_url: env.product_url || '',
      product_image: env.product_image || '',
      discount_code: env.discount_code || '',
      reward_message: env.reward_message || '',
    });
    setProductPreview(env.product_image ? { image: env.product_image, title: env.product_url } : null);
  }

  async function handleFetchProductSingle() {
    if (!editForm.product_url) return;
    setFetchingProduct(true);
    setProductPreview(null);
    try {
      const res = await fetch('/api/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_url: editForm.product_url }),
      });
      const data = await res.json();
      if (data.image) {
        setProductPreview(data);
        setEditForm(f => ({ ...f, product_image: data.image }));
      } else {
        showMsg('Could not fetch product image', 'error');
      }
    } catch (err) {
      showMsg('Failed to fetch product', 'error');
    }
    setFetchingProduct(false);
  }

  async function handleSaveEnvelope() {
    if (!editEnv) return;
    setSaving(true);
    try {
      const res = await fetch('/api/update-envelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope_number: editEnv.envelope_number, ...editForm }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        showMsg(`✅ Envelope #${editEnv.envelope_number} updated!`);
        setEditEnv(null);
        fetchData();
      } else {
        showMsg(data.error || 'Save failed', 'error');
      }
    } catch (err) {
      showMsg('Save failed', 'error');
    }
    setSaving(false);
  }

  const filteredEnvelopes = envelopes.filter(env => {
    const matchFilter = filter === 'all' || env.status === filter || env.type === filter;
    const matchSearch = !search ||
      (env.customer_email || '').toLowerCase().includes(search.toLowerCase()) ||
      String(env.envelope_number).includes(search) ||
      (env.order_id || '').toString().includes(search);
    return matchFilter && matchSearch;
  });

  const filteredCustomers = customers.filter(c =>
    !search ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.order_id || '').toString().includes(search)
  );

  const notClaimedYet = customers.filter(c => {
    const claimed = c.has_claimed === true || c.has_claimed === 'TRUE';
    const matchSearch = !search ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.order_id || '').toString().includes(search);
    return !claimed && matchSearch;
  });

  const filteredShipping = shipping.filter(s =>
    !search ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.order_id || '').toString().includes(search)
  );

  const Th = ({ children }) => (
    <th style={{
      textAlign: 'left', padding: '12px 20px', fontSize: '12px',
      fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
      letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', background: '#f8fafc',
    }}>{children}</th>
  );

  const Td = ({ children }) => (
    <td style={{ padding: '12px 20px', fontSize: '14px', color: '#475569' }}>{children}</td>
  );

  const mainTabBtn = (t, label) => (
    <button onClick={() => { setTab(t); setSearch(''); setFilter('all'); }} style={{
      padding: '10px 16px',
      borderRadius: '8px 8px 0 0',
      border: '1px solid #e2e8f0',
      borderBottom: tab === t ? '1px solid #fff' : '1px solid #e2e8f0',
      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
      background: tab === t ? '#fff' : '#f8fafc',
      color: tab === t ? '#1e293b' : '#64748b',
      marginBottom: '-1px', whiteSpace: 'nowrap',
    }}>{label}</button>
  );

  const rewardTabBtn = (t, label, color) => (
    <button onClick={() => setRewardTab(t)} style={{
      padding: '10px 20px',
      borderRadius: '8px',
      border: '2px solid',
      borderColor: rewardTab === t ? color : '#e2e8f0',
      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
      background: rewardTab === t ? color : '#f8fafc',
      color: rewardTab === t ? '#fff' : '#64748b',
    }}>{label}</button>
  );

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    background: '#f8fafc', color: '#1e293b', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  };

  const typeColors = {
    product:  { bg: '#eff6ff', color: '#2563eb', label: '🛍 Product' },
    discount: { bg: '#fdf4ff', color: '#9333ea', label: '🏷 Discount' },
    empty:    { bg: '#f1f5f9', color: '#64748b', label: '📭 Message' },
  };

  return (
    <main style={{
      minHeight: '100vh', background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#1e293b',
    }}>

      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '64px',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🎁</span>
          <span style={{ fontWeight: 700, fontSize: '18px' }}>Mystery Vault</span>
          <span style={{
            background: '#f1f5f9', color: '#64748b', fontSize: '12px',
            fontWeight: 600, padding: '2px 10px', borderRadius: '20px',
          }}>Admin</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchData} style={{
            padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', color: '#475569',
          }}>↻ Refresh</button>
          <button onClick={handleReset} disabled={resetting} style={{
            padding: '8px 16px', background: resetting ? '#fca5a5' : '#ef4444',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: 700,
            cursor: resetting ? 'not-allowed' : 'pointer',
          }}>{resetting ? 'Resetting...' : '⚠ Reset All'}</button>
        </div>
      </div>

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 24px' }}>

        {message && (
          <div style={{
            background: msgType === 'error' ? '#fef2f2' : '#dcfce7',
            border: `1px solid ${msgType === 'error' ? '#fca5a5' : '#86efac'}`,
            color: msgType === 'error' ? '#dc2626' : '#166534',
            padding: '12px 20px', borderRadius: '10px', marginBottom: '24px',
            fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between',
          }}>
            {message}
            <span style={{ cursor: 'pointer' }} onClick={() => setMessage('')}>✕</span>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Total Envelopes', value: stats.total, icon: '📦', bg: '#f8fafc', border: '#e2e8f0', val: '#1e293b' },
              { label: 'Claimed', value: stats.claimed, icon: '✅', bg: '#f0fdf4', border: '#86efac', val: '#16a34a' },
              { label: 'Unclaimed', value: stats.unclaimed, icon: '🔓', bg: '#eff6ff', border: '#93c5fd', val: '#2563eb' },
              { label: 'Eligible Customers', value: stats.total_eligible, icon: '👥', bg: '#fdf4ff', border: '#d8b4fe', val: '#9333ea' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: '14px', padding: '24px',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: s.val }}>{s.value}</div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main Tabs */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0' }}>
          {mainTabBtn('envelopes', '📦 Envelopes')}
          {mainTabBtn('rewards', '🎁 Set Rewards')}
          {mainTabBtn('customers', `👥 Eligible Customers (${filteredCustomers.length})`)}
          {mainTabBtn('notclaimed', `⏳ Not Claimed (${notClaimedYet.length})`)}
          {mainTabBtn('shipping', `🚚 Shipping (${filteredShipping.length})`)}
        </div>

        {/* ── REWARDS TAB ── */}
        {tab === 'rewards' && (
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: '0 14px 14px 14px', padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h2 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>🎁 Set Envelope Rewards</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px' }}>
              Assign products, discount codes, or messages to envelopes. Use ranges like <strong>1-30</strong> or individual numbers like <strong>1,5,7</strong>.
            </p>

            {/* Reward sub tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {rewardTabBtn('product', '🛍 Products', '#2563eb')}
              {rewardTabBtn('discount', '🏷 Discount Codes', '#9333ea')}
              {rewardTabBtn('message', '📭 Messages', '#64748b')}
            </div>

            {/* PRODUCTS */}
            {rewardTab === 'product' && (
              <div>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                  Add multiple products — each can be assigned to different envelope ranges.
                </p>
                {products.map((p, idx) => (
                  <div key={idx} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '14px', padding: '20px', marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Product {idx + 1}</span>
                      {products.length > 1 && (
                        <button onClick={() => setProducts(prev => prev.filter((_, i) => i !== idx))} style={{
                          background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '12px',
                          fontWeight: 600, cursor: 'pointer',
                        }}>✕ Remove</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input
                        value={p.url}
                        onChange={e => setProducts(prev => prev.map((x, i) => i === idx ? { ...x, url: e.target.value } : x))}
                        placeholder="https://stdesignsllc.com/products/..."
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={() => fetchProduct(idx)} disabled={fetchingIdx === idx} style={{
                        padding: '10px 16px', background: '#3b82f6', color: '#fff',
                        border: 'none', borderRadius: '8px', fontSize: '13px',
                        fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                        opacity: fetchingIdx === idx ? 0.7 : 1,
                      }}>{fetchingIdx === idx ? '...' : '🔍 Fetch'}</button>
                    </div>
                    {p.image && (
                      <div style={{
                        display: 'flex', gap: '12px', alignItems: 'center',
                        background: '#f0fdf4', border: '1px solid #86efac',
                        borderRadius: '10px', padding: '12px', marginBottom: '12px',
                      }}>
                        <img src={p.image} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#166534' }}>{p.title}</div>
                          <div style={{ fontSize: '12px', color: '#4ade80' }}>✅ Image ready</div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                        Assign to envelopes (e.g. 1-30 or 1,5,10)
                      </label>
                      <input
                        value={p.envelopes}
                        onChange={e => setProducts(prev => prev.map((x, i) => i === idx ? { ...x, envelopes: e.target.value } : x))}
                        placeholder="e.g. 1-30 or 1,5,10,15"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button onClick={() => setProducts(prev => [...prev, { url: '', image: '', title: '', envelopes: '' }])} style={{
                    padding: '10px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', color: '#475569',
                  }}>+ Add Another Product</button>
                  <button onClick={saveBulkProducts} disabled={savingBulk} style={{
                    padding: '10px 28px', background: savingBulk ? '#94a3b8' : '#2563eb',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 800, cursor: savingBulk ? 'not-allowed' : 'pointer',
                  }}>{savingBulk ? 'Saving...' : '💾 Save All Products'}</button>
                </div>
              </div>
            )}

            {/* DISCOUNTS */}
            {rewardTab === 'discount' && (
              <div>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                  Add multiple discount codes — each assigned to different envelope ranges.
                </p>
                {discounts.map((d, idx) => (
                  <div key={idx} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '14px', padding: '20px', marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Discount Code {idx + 1}</span>
                      {discounts.length > 1 && (
                        <button onClick={() => setDiscounts(prev => prev.filter((_, i) => i !== idx))} style={{
                          background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
                          borderRadius: '6px', padding: '4px 10px', fontSize: '12px',
                          fontWeight: 600, cursor: 'pointer',
                        }}>✕ Remove</button>
                      )}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                        Discount Code
                      </label>
                      <input
                        value={d.code}
                        onChange={e => setDiscounts(prev => prev.map((x, i) => i === idx ? { ...x, code: e.target.value.toUpperCase() } : x))}
                        placeholder="e.g. MYSTERY20"
                        style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '2px', fontSize: '16px', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                        Assign to envelopes (e.g. 31-60 or 2,4,6)
                      </label>
                      <input
                        value={d.envelopes}
                        onChange={e => setDiscounts(prev => prev.map((x, i) => i === idx ? { ...x, envelopes: e.target.value } : x))}
                        placeholder="e.g. 31-60 or 2,4,6"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button onClick={() => setDiscounts(prev => [...prev, { code: '', envelopes: '' }])} style={{
                    padding: '10px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', color: '#475569',
                  }}>+ Add Another Code</button>
                  <button onClick={saveBulkDiscounts} disabled={savingDiscounts} style={{
                    padding: '10px 28px', background: savingDiscounts ? '#94a3b8' : '#9333ea',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 800, cursor: savingDiscounts ? 'not-allowed' : 'pointer',
                  }}>{savingDiscounts ? 'Saving...' : '💾 Save All Codes'}</button>
                </div>
              </div>
            )}

            {/* MESSAGES */}
            {rewardTab === 'message' && (
              <div>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                  Set a custom message for each envelope. Leave blank to keep existing.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '20px' }}>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(num => (
                    <div key={num} style={{
                      display: 'flex', gap: '8px', alignItems: 'center',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '8px', padding: '10px 12px',
                    }}>
                      <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '13px', minWidth: '32px' }}>#{num}</span>
                      <input
                        value={messages[num] || ''}
                        onChange={e => setMessages(prev => ({ ...prev, [num]: e.target.value }))}
                        placeholder="Message for this envelope..."
                        style={{
                          flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0',
                          borderRadius: '6px', fontSize: '13px', outline: 'none',
                          background: '#fff', fontFamily: 'inherit',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button onClick={saveMessages} disabled={savingMessages} style={{
                  padding: '12px 32px', background: savingMessages ? '#94a3b8' : '#1e293b',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '14px', fontWeight: 800, cursor: savingMessages ? 'not-allowed' : 'pointer',
                }}>{savingMessages ? 'Saving...' : '💾 Save All Messages'}</button>
              </div>
            )}
          </div>
        )}

        {/* ── OTHER TABS ── */}
        {tab !== 'rewards' && (
          <>
            <input
              type="text"
              placeholder="Search email, name, order ID, envelope #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px', outline: 'none',
                background: '#fff', color: '#1e293b',
                marginBottom: '0', marginTop: '20px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: '14px', overflow: 'hidden', marginTop: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {tab === 'envelopes' && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {['all', 'claimed', 'unclaimed', 'product', 'discount', 'empty'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                      padding: '5px 12px', borderRadius: '20px', border: '1px solid',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      background: filter === f ? '#1e293b' : '#f8fafc',
                      color: filter === f ? '#fff' : '#64748b',
                      borderColor: filter === f ? '#1e293b' : '#e2e8f0',
                      textTransform: 'capitalize',
                    }}>{f === 'all' ? 'All' : f === 'claimed' ? '✅ Claimed' : f === 'unclaimed' ? '🔓 Unclaimed' : f === 'product' ? '🛍 Product' : f === 'discount' ? '🏷 Discount' : '📭 Message'}</button>
                  ))}
                  <span style={{ color: '#94a3b8', fontSize: '13px', marginLeft: 'auto' }}>
                    {filteredEnvelopes.length} results
                  </span>
                </div>
              )}

              {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>

                    {tab === 'envelopes' && <>
                      <thead>
                        <tr>
                          <Th>#</Th><Th>Status</Th><Th>Type</Th><Th>Reward</Th>
                          <Th>Customer Email</Th><Th>Claimed At</Th><Th>Edit</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEnvelopes.map((env, i) => {
                          const tc = typeColors[env.type] || typeColors.empty;
                          return (
                            <tr key={env.envelope_number}
                              style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                            >
                              <td style={{ padding: '12px 20px', fontWeight: 700, color: '#3b82f6' }}>#{env.envelope_number}</td>
                              <Td>
                                <span style={{
                                  padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                  background: env.status === 'claimed' ? '#dcfce7' : '#f1f5f9',
                                  color: env.status === 'claimed' ? '#16a34a' : '#94a3b8',
                                }}>{env.status === 'claimed' ? '✅ Claimed' : 'Unclaimed'}</span>
                              </Td>
                              <Td>
                                <span style={{
                                  padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                  background: tc.bg, color: tc.color,
                                }}>{tc.label}</span>
                              </Td>
                              <Td>
                                {env.type === 'product' && env.product_image && (
                                  <img src={env.product_image} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                )}
                                {env.type === 'discount' && (
                                  <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 700 }}>
                                    {env.discount_code}
                                  </span>
                                )}
                                {(!env.type || env.type === 'empty') && (
                                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>{env.reward_message || '—'}</span>
                                )}
                              </Td>
                              <Td>{env.customer_email || '—'}</Td>
                              <Td>{env.claimed_at ? new Date(env.claimed_at).toLocaleString() : '—'}</Td>
                              <td style={{ padding: '12px 20px' }}>
                                <button onClick={() => openEdit(env)} style={{
                                  padding: '6px 14px', background: '#1e293b', color: '#fff',
                                  border: 'none', borderRadius: '6px', fontSize: '12px',
                                  fontWeight: 600, cursor: 'pointer',
                                }}>✏ Edit</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>}

                    {tab === 'customers' && <>
                      <thead><tr><Th>Email</Th><Th>Order ID</Th><Th>Order Amount</Th><Th>Registered At</Th><Th>Status</Th><Th>Claimed Envelope</Th></tr></thead>
                      <tbody>
                        {filteredCustomers.length === 0 ? (
                          <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No customers yet</td></tr>
                        ) : filteredCustomers.map((c, i) => {
                          const claimed = c.has_claimed === true || c.has_claimed === 'TRUE';
                          return (
                            <tr key={i}
                              style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                            >
                              <td style={{ padding: '12px 20px', fontWeight: 600, color: '#1e293b' }}>{c.email}</td>
                              <Td>{c.order_id || '—'}</Td>
                              <Td>{c.order_amount ? `$${c.order_amount}` : '—'}</Td>
                              <Td>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</Td>
                              <Td>
                                <span style={{
                                  padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                  background: claimed ? '#dcfce7' : '#fef9c3',
                                  color: claimed ? '#16a34a' : '#854d0e',
                                }}>{claimed ? '✅ Claimed' : '⏳ Pending'}</span>
                              </Td>
                              <Td>{c.claimed_envelope ? `#${c.claimed_envelope}` : '—'}</Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>}

                    {tab === 'notclaimed' && <>
                      <thead><tr><Th>Email</Th><Th>Order ID</Th><Th>Order Amount</Th><Th>Registered At</Th></tr></thead>
                      <tbody>
                        {notClaimedYet.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>🎉 Everyone has claimed!</td></tr>
                        ) : notClaimedYet.map((c, i) => (
                          <tr key={i}
                            style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                          >
                            <td style={{ padding: '12px 20px', fontWeight: 600, color: '#1e293b' }}>{c.email}</td>
                            <Td>{c.order_id || '—'}</Td>
                            <Td>{c.order_amount ? `$${c.order_amount}` : '—'}</Td>
                            <Td>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </>}

                    {tab === 'shipping' && <>
                      <thead><tr><Th>Email</Th><Th>Full Name</Th><Th>Address</Th><Th>City</Th><Th>State</Th><Th>ZIP</Th><Th>Country</Th><Th>Saved At</Th></tr></thead>
                      <tbody>
                        {filteredShipping.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No shipping addresses yet</td></tr>
                        ) : filteredShipping.map((s, i) => (
                          <tr key={i}
                            style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                          >
                            <td style={{ padding: '12px 20px', fontWeight: 600, color: '#1e293b' }}>{s.email}</td>
                            <Td>{s.full_name || '—'}</Td>
                            <Td>{s.address1}{s.address2 ? `, ${s.address2}` : ''}</Td>
                            <Td>{s.city || '—'}</Td>
                            <Td>{s.state || '—'}</Td>
                            <Td>{s.zip || '—'}</Td>
                            <Td>{s.country || '—'}</Td>
                            <Td>{s.saved_at ? new Date(s.saved_at).toLocaleString() : '—'}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </>}

                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* SINGLE EDIT MODAL */}
      {editEnv && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', boxSizing: 'border-box',
        }}>
          <div onClick={() => setEditEnv(null)} style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'relative', background: '#fff', borderRadius: '20px',
            padding: '36px', width: '100%', maxWidth: '480px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontWeight: 800, fontSize: '20px', color: '#1e293b' }}>
                ✏ Edit Envelope #{editEnv.envelope_number}
              </h3>
              <button onClick={() => setEditEnv(null)} style={{
                background: '#f1f5f9', border: 'none', borderRadius: '8px',
                padding: '6px 12px', cursor: 'pointer', fontSize: '14px', color: '#64748b',
              }}>✕</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                Reward Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { value: 'product', icon: '🛍', label: 'Product' },
                  { value: 'discount', icon: '🏷', label: 'Discount' },
                  { value: 'empty', icon: '📭', label: 'Message' },
                ].map(t => (
                  <button key={t.value} onClick={() => setEditForm(f => ({ ...f, type: t.value }))} style={{
                    padding: '12px 8px', borderRadius: '10px', border: '2px solid',
                    borderColor: editForm.type === t.value ? '#1e293b' : '#e2e8f0',
                    background: editForm.type === t.value ? '#1e293b' : '#f8fafc',
                    color: editForm.type === t.value ? '#fff' : '#64748b',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{t.icon}</div>
                    <div>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {editForm.type === 'product' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Product URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={editForm.product_url}
                    onChange={e => setEditForm(f => ({ ...f, product_url: e.target.value }))}
                    placeholder="https://stdesignsllc.com/products/..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={handleFetchProductSingle} disabled={fetchingProduct} style={{
                    padding: '10px 14px', background: '#3b82f6', color: '#fff',
                    border: 'none', borderRadius: '8px', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', opacity: fetchingProduct ? 0.7 : 1,
                  }}>{fetchingProduct ? '...' : '🔍'}</button>
                </div>
                {productPreview && (
                  <div style={{
                    marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center',
                    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px',
                  }}>
                    <img src={productPreview.image} alt="" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#166534' }}>{productPreview.title}</div>
                      <div style={{ fontSize: '12px', color: '#4ade80' }}>✅ Ready</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {editForm.type === 'discount' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Discount Code</label>
                <input
                  value={editForm.discount_code}
                  onChange={e => setEditForm(f => ({ ...f, discount_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. MYSTERY20"
                  style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '2px', fontSize: '16px', fontWeight: 700 }}
                />
              </div>
            )}

            {editForm.type === 'empty' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Message</label>
                <input
                  value={editForm.reward_message}
                  onChange={e => setEditForm(f => ({ ...f, reward_message: e.target.value }))}
                  placeholder="e.g. Better luck next time! 🎲"
                  style={inputStyle}
                />
              </div>
            )}

            <button onClick={handleSaveEnvelope} disabled={saving} style={{
              width: '100%', padding: '14px', background: saving ? '#94a3b8' : '#1e293b',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}>{saving ? 'Saving...' : '💾 Save Envelope'}</button>
          </div>
        </div>
      )}

    </main>
  );
}