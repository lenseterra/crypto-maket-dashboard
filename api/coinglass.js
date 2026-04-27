// ═══════════════════════════════════════════════════════
//  Lenseterra — CoinGlass Proxy
//  Route: /api/coinglass
//  Forwards requests to CoinGlass API using the key
//  stored as COINGLASS_API_KEY env variable in Vercel.
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.COINGLASS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'CoinGlass API key not configured. Add COINGLASS_API_KEY to Vercel Environment Variables.'
    });
  }

  // Which endpoint to call — passed as ?endpoint=xxx
  const { endpoint } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint param' });
  }

  // Whitelist of allowed CoinGlass endpoints
  const allowed = [
    'indicator/bitcoin-profitable-days',
    'index/fear-greed-history',
    'indicator/mvrv',
    'bitcoin/indicators/mvrv',
    'indicator/nupl',
    'indicator/puell-multiple',
  ];

  if (!allowed.some(e => endpoint.startsWith(e))) {
    return res.status(403).json({ error: 'Endpoint not allowed: ' + endpoint });
  }

  try {
    const url = `https://open-api-v3.coinglass.com/api/${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'CG-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: `CoinGlass API error ${response.status}`,
        detail: text.slice(0, 200)
      });
    }

    const data = await response.json();
    // Cache for 15 minutes (MVRV doesn't change by the second)
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}
