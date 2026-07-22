import { asPost } from '../../lib/appsScript';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { envelope_number, type, product_url, product_image, discount_code, reward_message } = req.body;
  if (!envelope_number) return res.status(400).json({ error: 'Missing envelope_number' });

  const result = await asPost('updateEnvelope', {
    envelope_number,
    type,
    product_url,
    product_image,
    discount_code,
    reward_message
  });
  return res.status(200).json(result);
}
