const https = require('https');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const { texto } = req.body;
  const body = JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: 'Eres asistente de un medico. Devuelve SOLO JSON sin markdown: {"nombre":"NOMBRE MAYUSCULAS presentacion","indicaciones":"indicacion completa."} Solo nombre e indicaciones, sin campo cantidad ni surtir. Medicamento: ' + texto
    }]
  });
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  const result = await new Promise((resolve, reject) => {
    const r = https.request(options, resp => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(data));
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
  const parsed = JSON.parse(result);
  if (!parsed.content || !parsed.content[0]) {
    return res.status(500).json({ error: 'API error', detail: parsed });
  }
  const texto_resp = parsed.content[0].text.trim().replace(/```json|```/g,'').trim();
  res.json(JSON.parse(texto_resp));
};
