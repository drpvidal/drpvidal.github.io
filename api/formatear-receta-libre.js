module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const texto = String((req.body && req.body.texto) || '').trim();
  if (!texto) return res.status(400).json({ error: 'Texto vacío' });
  try {
    if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ texto });
    const prompt = `Ordena este texto como receta médica sin inventar ni cambiar dosis. Devuelve sólo texto final. Formato: 1.- NOMBRE (sustancia) presentación dosis.\nTomar/aplicar/usar ...\nTexto: ${texto}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'}, body:JSON.stringify({model:'claude-sonnet-4-5',max_tokens:600,temperature:0,messages:[{role:'user',content:prompt}]}) });
    const data = await r.json();
    const salida = Array.isArray(data.content) ? data.content.map(x=>x.text||'').join('').trim() : '';
    res.status(200).json({ texto: salida || texto });
  } catch(e) { res.status(200).json({ texto }); }
};