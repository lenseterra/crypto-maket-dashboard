// ═══════════════════════════════════════════════════════
//  Lenseterra — Vercel Serverless Proxy
//  Ruta: /api/chat
//  La API key de Anthropic vive SOLO en Vercel como
//  variable de entorno — nunca en el código fuente.
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {

  // Solo acepta POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Headers CORS — permite llamadas desde tu dominio en Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Leer API key desde variable de entorno de Vercel
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key no configurada. Ve a Vercel → Settings → Environment Variables y agrega ANTHROPIC_API_KEY.'
    });
  }

  try {
    const { messages, system } = req.body;

    // Validación básica
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Formato de mensajes inválido.' });
    }

    // Límite de seguridad: máximo 30 mensajes en el historial
    const trimmedMessages = messages.slice(-30);

    // Llamada a la API de Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:     system || '',
        messages:   trimmedMessages,
      }),
    });

    // Error de la API de Anthropic
    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      console.error('Anthropic API error:', anthropicRes.status, errData);
      return res.status(anthropicRes.status).json({
        error: errData?.error?.message || 'Error en la API de Anthropic.'
      });
    }

    const data = await anthropicRes.json();

    // Devolver solo el texto de respuesta al frontend
    const text = data?.content?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
  }
}
