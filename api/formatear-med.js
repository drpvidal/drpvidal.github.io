module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const { texto } = req.body;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: 'Eres asistente de un medico. Devuelve SOLO JSON sin markdown: {"nombre":"NOMBRE MAYUSCULAS presentacion","indicaciones":"indicacion completa."} Solo nombre e indicaciones, sin campo cantidad ni surtir. Medicamento: ' + texto
      }]
    })
  });
  const data = await response.json();
  const texto_resp = data.content[0].text.trim().replace(/```json|```/g,'').trim();
  res.json(JSON.parse(texto_resp));
};
