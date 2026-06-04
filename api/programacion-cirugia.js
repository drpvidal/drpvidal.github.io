const { Resend } = require('resend');

function esc(v){return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function list(arr){return Array.isArray(arr) && arr.length ? '<ul>' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p>-</p>';}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' });

  try {
    const b = req.body || {};
    const resend = new Resend(process.env.RESEND_API_KEY);
    const ingreso = b.indicacionesIngresoHtml || '';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#0b1f3a">
        <h2 style="border-bottom:3px solid #1266ff;padding-bottom:8px;color:#1266ff">SyncMed One — Indicaciones de ingreso</h2>
        <table cellpadding="7" border="1" style="border-collapse:collapse;width:100%;font-size:13px;border-color:#dbeafe">
          <tr><td><b>Paciente</b></td><td>${esc(b.paciente || b.pac)}</td></tr>
          <tr><td><b>Edad</b></td><td>${esc(b.edad)}</td></tr>
          <tr><td><b>Fecha nacimiento</b></td><td>${esc(b.fechaNac || b.nac)}</td></tr>
          <tr><td><b>Teléfono</b></td><td>${esc(b.telefono || b.tel)}</td></tr>
          <tr><td><b>Correo</b></td><td>${esc(b.correo || b.cor)}</td></tr>
          <tr><td><b>Procedimiento</b></td><td>${esc(b.procedimiento || b.proc)}</td></tr>
          <tr><td><b>Hospital</b></td><td>${esc(b.hospital || b.hosp)}</td></tr>
          <tr><td><b>Ingreso</b></td><td>${esc(b.fechaIngreso || b.fing)} ${esc(b.horaIngreso || b.hing)}</td></tr>
          <tr><td><b>Cirugía</b></td><td>${esc(b.fechaCirugia)} ${esc(b.horaCirugia || b.hcx)}</td></tr>
          <tr><td><b>Anestesiólogo</b></td><td>${esc(b.anestesiologo || b.anest)}</td></tr>
        </table>
        <h3 style="margin-top:18px;color:#0b1f3a">Equipo</h3>${list(b.equipo || b.equip)}
        <h3 style="margin-top:18px;color:#0b1f3a">Materiales</h3>${list([...(b.insumos || b.ins || []), b.insumosExtra || b.insex].filter(Boolean))}
        <h3 style="margin-top:18px;color:#0b1f3a">Documento de indicaciones de ingreso</h3>
        <div style="border:1px solid #dbeafe;border-radius:10px;padding:14px;background:#f8fcff">${ingreso}</div>
      </div>`;

    await resend.emails.send({
      from: 'Programacion Quirurgica <onboarding@resend.dev>',
      to: ['drpablovidal@gmail.com'],
      subject: 'Indicaciones de ingreso: ' + (b.paciente || b.pac || 'Paciente'),
      html
    });

    res.status(200).json({ ok:true });
  } catch (error) {
    console.error('programacion-cirugia:', error);
    res.status(500).json({ ok:false, error:error.message });
  }
};
