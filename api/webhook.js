const { Resend } = require('resend');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = req.body;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#1a1a1a">
        <h2 style="border-bottom:2px solid #1a1a1a;padding-bottom:8px">Registro Quirurgico - Dr. Pablo Vidal</h2>
        <table cellpadding="7" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px;border-color:#e0e0e0">
          <tr style="background:#f5f5f0"><td style="width:160px"><b>Paciente</b></td><td>${b.paciente || '-'}</td></tr>
          <tr><td><b>Fecha de cirugia</b></td><td>${b.fechaCirugia || '-'}</td></tr>
          <tr style="background:#f5f5f0"><td><b>Edad</b></td><td>${b.edad || '-'}</td></tr>
          <tr><td><b>Diagnostico</b></td><td>${b.diagnostico || '-'}</td></tr>
          <tr style="background:#f5f5f0"><td><b>Procedimiento</b></td><td>${b.procedimiento || '-'}</td></tr>
          <tr><td><b>Institucion</b></td><td>${b.institucion || '-'}</td></tr>
          <tr style="background:#f5f5f0"><td><b>Cirujano</b></td><td>Dr. Pablo Vidal</td></tr>
          <tr><td><b>Primer ayudante</b></td><td>${b.primerAyudante || '-'}</td></tr>
          <tr style="background:#f5f5f0"><td><b>Segundo ayudante</b></td><td>${b.segundoAyudante || '-'}</td></tr>
          <tr><td><b>Anestesiologo</b></td><td>${b.anestesiologo || '-'}</td></tr>
        </table>
        ${b.notaOperatoria && b.notaOperatoria !== 'No generada aun' ? `
        <h3 style="margin-top:24px">Nota Operatoria</h3>
        <div style="background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:16px;font-size:13px;line-height:1.8;white-space:pre-wrap">${b.notaOperatoria}</div>
        ` : '<p style="font-size:12px;color:#999;margin-top:16px">Nota operatoria no generada.</p>'}
        <p style="font-size:11px;color:#bbb;margin-top:24px;border-top:1px solid #eee;padding-top:8px">
          Enviado automaticamente desde App Registro Quirurgico
        </p>
      </div>
    `;
    await resend.emails.send({
      from: 'Registro Quirurgico <onboarding@resend.dev>',
      to: ['drpablovidal@gmail.com'],
      subject: 'Cirugia: ' + (b.paciente || 'Paciente') + ' - ' + (b.fechaCirugia || ''),
      html,
    });
    await fetch('https://script.google.com/macros/s/AKfycbz8Af_l-JTBX4FDyVLGC4aogSCza-cP2e1OqK5aFQc6vhPi4x2MCdOS4x2h_1TagGsXqA/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente: b.paciente,
        fechaCirugia: b.fechaCirugia,
        edad: b.edad,
        diagnostico: b.diagnostico,
        procedimiento: b.procedimiento,
        institucion: b.institucion,
        primerAyudante: b.primerAyudante,
        segundoAyudante: b.segundoAyudante,
        anestesiologo: b.anestesiologo
      })
    });
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};