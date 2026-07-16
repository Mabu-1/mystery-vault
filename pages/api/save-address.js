import { asPost } from '../../lib/appsScript';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, order_id, full_name, address1, address2, city, state, zip, country } = req.body;
  if (!email || !full_name || !address1) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await asPost('saveAddress', { email, order_id, full_name, address1, address2, city, state, zip, country });
  return res.status(200).json(result);
}
