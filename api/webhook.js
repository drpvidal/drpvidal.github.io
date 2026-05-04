const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const data = JSON.stringify(req.body);
  const options = {
    hostname: 'hook.us2.make.com',
    path: '/fjs916el71s3rw2s6gazo3dnr14m8jqy',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  await new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      response.on('data', () => {});
      response.on('end', resolve);
    });
    request.on('error', reject);
    request.write(data);
    request.end();
  });

  res.status(200).json({ status: 'ok' });
};
