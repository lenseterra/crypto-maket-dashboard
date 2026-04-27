// ═══════════════════════════════════════════════════════
//  Lenseterra — CoinGlass Proxy (API v4)
//  Route: /api/coinglass
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.COINGLASS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'COINGLASS_API_KEY not configured in Vercel Environment Variables.'
    });
  }

  const { endpoint } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint param' });

  // Whitelist — v4 endpoints available on free/starter plan
  const allowed = [
    'bitcoin/rainbow-price-chart',
    'bitcoin/puell-multiple',
    'bitcoin/ahr999',
    'bitcoin/pi-cycle-top',
    'index/fear-greed-history',
    'futures/coins-markets',
    'futures/openInterest/ohlc-history',
    'bitcoin/stats',
  ];

  if (!allowed.some(e => endpoint.startsWith(e))) {
    return res.status(403).json({ error: 'Endpoint not in allowlist: ' + endpoint });
  }

  try {
    // Build URL with any extra query params forwarded
    const params = new URLSearchParams(req.query);
    params.delete('endpoint');
    const qs = params.toString();
    const url = `https://open-api-v4.coinglass.com/api/${endpoint}${qs ? '?' + qs : ''}`;

    const response = await fetch(url, {
      headers: {
        'CG-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Proxy error: ' + err.message });
  }
}
