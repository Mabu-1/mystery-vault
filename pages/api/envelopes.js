import { asGet } from '../../lib/appsScript';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const result = await asGet('getEnvelopes');
  return res.status(200).json(result);
}
