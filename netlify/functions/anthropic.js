exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body);
    if (body.type === 'sheets') {
      await fetch('https://script.google.com/macros/s/AKfycbzSwugcffdQzWDFb-BaDnjKMT2g5XPxaNeeDSS84UnizZyVhFLTS2tvUvGa27Bpqd3IQA/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.data)
      });
      return { statusCode: 200, headers, body: JSON.stringify({ status: 'ok' }) };
    } else {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
'x-api-key': process.env.ANTHROPIC_API_KEY,        },
        body: event.body
      });
      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
