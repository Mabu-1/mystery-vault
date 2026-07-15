import { asPost } from '../../lib/appsScript';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const result = await asPost('resetEnvelopes', {
    admin_secret: process.env.RESET_SECRET,
  });
  return res.status(200).json(result);
}
