const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('Datos recibidos:', JSON.stringify(data));

    const result = await new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const options = {
        hostname: 'hook.us2.make.com',
        path: '/fjs916el71s3rw2s6gazo3dnr14m8jqy',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log('Make respondió:', res.statusCode, body);
          resolve({ statusCode: res.statusCode, body });
        });
      });
      req.on('error', (err) => {
        console.log('Error Make:', err.message);
        reject(err);
      });
      req.write(payload);
      req.end();
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'ok', make: result })
    };
  } catch (err) {
    console.log('Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
