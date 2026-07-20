export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { product_url } = req.body;
  if (!product_url) return res.status(400).json({ error: 'Missing product_url' });

  try {
    // Extract store domain and product handle from URL
    const url = new URL(product_url);
    const domain = url.hostname;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const productIndex = pathParts.indexOf('products');
    if (productIndex === -1) return res.status(400).json({ error: 'Invalid Shopify product URL' });

    const handle = pathParts[productIndex + 1];
    const apiUrl = `https://${domain}/products/${handle}.json`;

    const response = await fetch(apiUrl);
    if (!response.ok) return res.status(400).json({ error: 'Product not found' });

    const data = await response.json();
    const product = data.product;

    return res.status(200).json({
      title : product.title,
      image : product.images?.[0]?.src || null,
      handle: product.handle,
      url   : product_url
    });

  } catch (err) {
    return res.status(400).json({ error: 'Failed to fetch product: ' + err.message });
  }
}
