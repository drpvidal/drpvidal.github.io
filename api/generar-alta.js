const { Resend } = require('resend');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType
} = require('docx');

const AZUL_TITULO  = '365F91';
const AZUL_NOMBRE  = '1F497D';
const SZ   = 22;
const FONT = 'Calibri';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nombre, edad, fechaNacimiento, procedimiento, fecha, fechaCita, indicacionesExtra } = req.body;

    const INDICACIONES_BASE = [
      {
        seccion: 'MEDICAMENTOS',
        items: [
          { nombre: 'ULSEN (Omeprazol) cápsulas 40mg.',     instruccion: 'Tomar una cápsula vía oral cada 24 horas en ayuno por 15 días.' },
          { nombre: 'BIOMICS (Cefixima) cápsulas 400 mg.',  instruccion: 'Tomar una cápsula vía oral cada 24 horas después de la cena por 6 días.' },
          { nombre: 'TYLEX (Paracetamol) tabletas 750 mg.', instruccion: 'Tomar una tableta vía oral cada 8 horas por 5 días.' },
          { nombre: 'DOLAC (Ketorolaco) tableta 10 mg.',    instruccion: 'Tomar una tableta vía oral hasta cada 8 horas sólo en caso de dolor.' },
        ]
      },
      {
        seccion: 'MEDIDAS GENERALES',
        items: [
          { instruccion: 'Dieta blanda, sin grasas, lácteos, irritantes, ni condimentos por 10 días.' },
          { instruccion: 'No realizar esfuerzos físicos grandes, PROHIBIDO cargar, empujar y jalar objetos de más de 5 kg.' },
          { instruccion: 'No usar Isodine, merthiolate etc. en las heridas, solo lavado con agua y jabón durante el baño.' },
          { instruccion: 'No manejar automóvil por 7 días.' },
          { instruccion: 'No sumergirse en tinas, jacuzzi o albercas.' },
          { instruccion: 'Pueden existir moretones alrededor de las heridas, esto se considera normal.' },
          { instruccion: 'Hielo intermitente en heridas quirúrgicas y pared abdominal.' },
        ]
      },
      {
        seccion: 'AVISAR DE INMEDIATO EN CASO DE',
        items: [
          { instruccion: 'Fiebre.' },
          { instruccion: 'Dolor abdominal importante, distensión, náusea o vómito.' },
          { instruccion: 'Salida de secreción fétida, sangre o pus por las heridas.' },
          { instruccion: 'Alguna duda con algún síntoma o algún medicamento.' },
        ]
      }
    ];

    let seccionesFinales = INDICACIONES_BASE;

    if (indicacionesExtra && indicacionesExtra.trim()) {
      const baseTexto = INDICACIONES_BASE.map(s =>
        s.seccion + ':\n' + s.items.map((item, i) =>
          (i+1) + '.- ' + (item.nombre ? item.nombre + ' ' : '') + item.instruccion
        ).join('\n')
      ).join('\n\n');

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: 'Eres un asistente médico. Tienes estas indicaciones de alta:\n\n' + baseTexto + '\n\nEl médico quiere hacer estos cambios:\n' + indicacionesExtra + '\n\nDevuelve SOLO un JSON array con este formato exacto, sin texto adicional:\n[{"seccion":"MEDICAMENTOS","items":[{"nombre":"ULSEN (Omeprazol) capsulas 40mg.","instruccion":"Tomar..."}]},{"seccion":"MEDIDAS GENERALES","items":[{"instruccion":"Dieta..."}]},{"seccion":"AVISAR DE INMEDIATO EN CASO DE","items":[{"instruccion":"Fiebre."}]}]'
          }]
        })
      });
      const aiData = await aiRes.json();
      const aiText = aiData.content.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
      try { seccionesFinales = JSON.parse(aiText); } catch(e) { seccionesFinales = INDICACIONES_BASE; }
    }

    const t = (text, opts) => new TextRun({ text, font: FONT, size: SZ, ...opts });
    const children = [];

    children.push(new Paragraph({ children: [t('CDMX a  ' + (fecha || ''))], spacing: { after: 160 } }));

    children.push(new Paragraph({
      children: [
        t('Paciente:   ', { bold: true, color: AZUL_NOMBRE }),
        t(nombre || '', { bold: true, color: AZUL_NOMBRE }),
      ],
      spacing: { after: 80 }
    }));

    children.push(new Paragraph({
      children: [
        t('Edad:  ', { bold: true }),
        t((edad || '') + '  años'),
        t('                                                                    '),
        t('FN:  ', { bold: true }),
        t(fechaNacimiento || ''),
      ],
      spacing: { after: 200 }
    }));

    children.push(new Paragraph({
      children: [t('Indicaciones médicas para paciente post-operado de  ' + (procedimiento || '').toUpperCase())],
      spacing: { after: 240 }
    }));

    for (const seccion of seccionesFinales) {
      children.push(new Paragraph({
        children: [t(seccion.seccion + ':', { bold: true, color: AZUL_TITULO })],
        spacing: { before: 160, after: 100 }
      }));

      seccion.items.forEach((item, idx) => {
        const num = (idx + 1) + '.-  ';
        if (item.nombre) {
          children.push(new Paragraph({
            children: [
              t(num, { color: AZUL_TITULO }),
              t(item.nombre + '  ', { bold: true, color: AZUL_TITULO }),
              t(item.instruccion),
            ],
            spacing: { after: 80 }
          }));
        } else {
          children.push(new Paragraph({
            children: [t(num + item.instruccion)],
            spacing: { after: 80 }
          }));
        }
      });
    }

    children.push(new Paragraph({
      children: [
        t('Solicitar cita de revisión en consultorio para el  ', { bold: true }),
        t(fechaCita || '', { bold: true, underline: { type: UnderlineType.SINGLE } }),
        t('.', { bold: true }),
      ],
      spacing: { before: 240, after: 360 }
    }));

    children.push(new Paragraph({
      children: [t('DR. PABLO VIDAL GONZÁLEZ', { bold: true, color: AZUL_TITULO })],
      alignment: AlignmentType.CENTER
    }));

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const base64  = buffer.toString('base64');

    const resend = new Resend(process.env.RESEND_API_KEY);
    const nombreArchivo = 'Alta_' + (nombre || 'Paciente').replace(/\s+/g, '_') + '_' + (fecha || '').replace(/\s+/g, '_') + '.docx';

    await resend.emails.send({
      from: 'Registro Quirurgico <onboarding@resend.dev>',
      to: ['drpablovidal@gmail.com'],
      subject: 'Indicaciones de Alta: ' + (nombre || 'Paciente') + ' — ' + (fecha || ''),
      html: '<div style="font-family:Arial,sans-serif;max-width:600px"><h2 style="color:#365F91">Indicaciones de Alta — Dr. Pablo Vidal</h2><table cellpadding="7" border="1" style="border-collapse:collapse;width:100%;font-size:13px"><tr><td><b>Paciente</b></td><td>' + (nombre||'-') + '</td></tr><tr><td><b>Fecha</b></td><td>' + (fecha||'-') + '</td></tr><tr><td><b>Edad</b></td><td>' + (edad||'-') + '</td></tr><tr><td><b>F. Nacimiento</b></td><td>' + (fechaNacimiento||'-') + '</td></tr><tr><td><b>Procedimiento</b></td><td>' + (procedimiento||'-') + '</td></tr><tr><td><b>Cita revisión</b></td><td>' + (fechaCita||'-') + '</td></tr></table>' + (indicacionesExtra ? '<p><b>Cambios aplicados:</b> ' + indicacionesExtra + '</p>' : '') + '<p style="font-size:11px;color:#999">Enviado automáticamente — App Registro Quirúrgico Dr. Pablo Vidal</p></div>',
      attachments: [{ filename: nombreArchivo, content: base64 }]
    });

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error generar-alta:', error);
    res.status(500).json({ error: error.message });
  }
};
