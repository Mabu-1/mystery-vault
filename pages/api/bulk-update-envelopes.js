import { asPost } from '../../lib/appsScript';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { envelopes } = req.body;
  if (!envelopes || !Array.isArray(envelopes)) {
    return res.status(400).json({ error: 'Missing envelopes array' });
  }

  const results = [];
  for (const env of envelopes) {
    const result = await asPost('updateEnvelope', env);
    results.push(result);
  }

  return res.status(200).json({ status: 'ok', updated: results.length });
}
