const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const SECRET = process.env.APPS_SCRIPT_SECRET;

export async function asGet(action, params = {}) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('secret', SECRET);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  return res.json();
}

export async function asPost(action, payload = {}) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, secret: SECRET, ...payload }),
  });
  return res.json();
}
