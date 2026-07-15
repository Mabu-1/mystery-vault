import { asPost } from '../../lib/appsScript';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, envelope_number, order_id } = req.body;
  if (!email || !envelope_number) return res.status(400).json({ error: 'Missing fields' });

  const result = await asPost('claimEnvelope', { email, envelope_number, order_id });
  return res.status(200).json(result);
}
