const https = require('https');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const { prompt } = req.body;
  const body = JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system: 'Eres un asistente medico. REGLAS ABSOLUTAS que NUNCA puedes romper: 1) NUNCA escribas el titulo del documento. 2) NUNCA escribas Atentamente. 3) NUNCA escribas el nombre del medico al final. 4) NUNCA escribas cedula profesional. 5) NUNCA escribas la ciudad ni la fecha al final. 6) NUNCA uses asteriscos ni markdown. 7) Solo devuelve el cuerpo del texto, nada mas.',
    messages: [{ role: 'user', content: prompt }]
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

  // Limpiar texto de lo que la IA no deberia incluir
  var texto = parsed.content[0].text.trim();
  var lineas = texto.split('\n');
  var resultado = [];
  var cortarDesdeAqui = false;
  lineas.forEach(function(l) {
    var t = l.trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,''); // quitar acentos para comparar
    if (
      t === 'ATENTAMENTE' ||
      t.startsWith('DR. PABLO') ||
      t.startsWith('DR PABLO') ||
      t.startsWith('CIRUJANO GENERAL') ||
      t.startsWith('CEDULA') ||
      t.startsWith('CIUDAD DE MEXICO') ||
      t.startsWith('CDMX,') ||
      t.startsWith('FECHA DE EXPEDICION') ||
      t === 'CONSTANCIA DE INCAPACIDAD LABORAL' ||
      t === 'JUSTIFICANTE MEDICO ESCOLAR' ||
      t === 'CARTA DE SALUD' ||
      t === 'CARTA DE REFERENCIA MEDICA' ||
      t === 'CARTA MEDICA PARA VIAJE' ||
      t === 'CARTA MEDICA'
    ) {
      cortarDesdeAqui = true;
    }
    if (!cortarDesdeAqui) resultado.push(l);
  });

  res.json({ texto: resultado.join('\n').trim() });
};
