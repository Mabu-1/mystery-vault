import { asGet } from '../../lib/appsScript';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const result = await asGet('checkEligibility', { email });
  return res.status(200).json(result);
}
