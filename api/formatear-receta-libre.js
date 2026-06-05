module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const texto = String((req.body && req.body.texto) || '').trim();
  if (!texto) return res.status(400).json({ error: 'Texto vacío' });

  const prompt = `Eres asistente de formato para recetas médicas del Dr. Pablo Vidal.\n\nTAREA: Reescribe SOLAMENTE el texto proporcionado en formato de receta.\nNO inventes medicamentos. NO cambies dosis, frecuencia, duración, vía, cantidad, ni indicaciones. NO des recomendaciones médicas. Sólo ordena y corrige mayúsculas/minúsculas/puntuación.\n\nFormato esperado:\n1.- NOMBRE COMERCIAL (sustancia en minúsculas) presentación dosis.\nTomar/aplicar/usar ...\n\nSi hay varios medicamentos, enuméralos 1.-, 2.-, 3.- cada uno con su indicación abajo.\nDevuelve sólo el texto final, sin explicación.\n\nTexto original:\n${texto}`;

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(200).json({ texto });
    }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    const salida = Array.isArray(data.content) ? data.content.map(x => x.text || '').join('').trim() : '';
    res.status(200).json({ texto: salida || texto });
  } catch (e) {
    res.status(200).json({ texto });
  }
};
