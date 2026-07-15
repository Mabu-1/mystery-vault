import crypto from 'crypto';
import { asPost } from '../../lib/appsScript';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET || '');
  const digest = hmac.update(rawBody).digest('base64');
  const signature = req.headers['x-shopify-hmac-sha256'];

  if (process.env.SHOPIFY_WEBHOOK_SECRET && digest !== signature) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const order = JSON.parse(rawBody);
  const email = order.email?.toLowerCase().trim();
  const order_id = order.id;
  const order_amount = order.total_price;

  if (!email || !order_id) return res.status(400).json({ error: 'Missing data' });

  const result = await asPost('addEligibleCustomer', { email, order_id, order_amount });
  return res.status(200).json(result);
}
