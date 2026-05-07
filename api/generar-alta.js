const { Resend } = require('resend');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType,
  PageBreak, Tab, TabStopPosition, TabStopType
} = require('docx');

const AZUL  = '365F91';
const NEGRO = '000000';
const SZ    = 22;  // 11pt
const FONT  = 'Calibri';

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
    let biomicsItem = { nombre: 'BIOMICS (Cefixima) cápsulas 400 mg.', instruccion: 'Tomar una cápsula vía oral cada 24 horas después de la cena por 6 días.' };

    if (indicacionesExtra && indicacionesExtra.trim()) {
      const baseTexto = INDICACIONES_BASE.map(s =>
        s.seccion + ':\n' + s.items.map((item, i) =>
          (i+1) + '.- ' + (item.nombre ? item.nombre + ' ' : '') + item.instruccion
        ).join('\n')
      ).join('\n\n');

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: 'Eres un asistente médico. Tienes estas indicaciones de alta:\n\n' + baseTexto + '\n\nEl médico quiere hacer estos cambios:\n' + indicacionesExtra + '\n\nDevuelve SOLO un JSON array con este formato exacto, sin texto adicional:\n[{"seccion":"MEDICAMENTOS","items":[{"nombre":"ULSEN (Omeprazol) capsulas 40mg.","instruccion":"Tomar..."}]},{"seccion":"MEDIDAS GENERALES","items":[{"instruccion":"Dieta..."}]},{"seccion":"AVISAR DE INMEDIATO EN CASO DE","items":[{"instruccion":"Fiebre."}]}]'
          }]
        })
      });
      const aiData = await aiRes.json();
      const aiText = aiData.content.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
      try {
        seccionesFinales = JSON.parse(aiText);
        // Actualizar biomics para la receta si cambió
        const medSec = seccionesFinales.find(s => s.seccion === 'MEDICAMENTOS');
        if (medSec) {
          const b = medSec.items.find(i => i.nombre && i.nombre.toLowerCase().includes('biomics') || i.nombre && i.nombre.toLowerCase().includes('cefixima'));
          if (b) biomicsItem = b;
          // Si no hay biomics buscar el antibiotico que haya
          else if (medSec.items[1]) biomicsItem = medSec.items[1];
        }
      } catch(e) { seccionesFinales = INDICACIONES_BASE; }
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    const t  = (text, opts) => new TextRun({ text: text || '', font: FONT, size: SZ, color: NEGRO, ...opts });
    const tb = (text, opts) => t(text, { bold: true, ...opts });
    const sp = (after, before) => ({ spacing: { after: after||0, before: before||0 } });

    // ── Hoja de indicaciones (se repite 2 veces) ──────────────────────────────
    function buildHojaAlta(isSecond) {
      const parrafos = [];

      // Fecha alineada a la derecha
      parrafos.push(new Paragraph({
        children: [t('CDMX a  ' + (fecha || ''))],
        alignment: AlignmentType.RIGHT,
        ...sp(120)
      }));

      // Paciente
      parrafos.push(new Paragraph({
        children: [
          tb('Paciente:  ', { color: AZUL }),
          tb(nombre || '', { color: AZUL }),
        ],
        ...sp(40)
      }));

      // Edad y FN en la misma línea con tab
      parrafos.push(new Paragraph({
        children: [
          tb('Edad: '),
          t((edad || '') + ' años'),
          new TextRun({ text: '\t', font: FONT, size: SZ }),
          tb('FN: '),
          t(fechaNacimiento || ''),
        ],
        tabStops: [{ type: TabStopType.LEFT, position: TabStopPosition.MAX / 2 }],
        ...sp(120)
      }));

      // Título procedimiento
      parrafos.push(new Paragraph({
        children: [t('Indicaciones médicas para paciente post-operado de '), tb((procedimiento || '').toUpperCase())],
        ...sp(160)
      }));

      // Secciones
      for (const seccion of seccionesFinales) {
        parrafos.push(new Paragraph({
          children: [tb(seccion.seccion + ':', { color: AZUL })],
          ...sp(80, 120)
        }));

        seccion.items.forEach((item, idx) => {
          const num = (idx + 1) + '.-  ';
          if (item.nombre) {
            // Línea 1: número + nombre del medicamento
            parrafos.push(new Paragraph({
              children: [
                t(num, { color: AZUL, bold: true }),
                tb(item.nombre, { color: AZUL, underline: { type: UnderlineType.SINGLE } }),
              ],
              ...sp(20)
            }));
            // Línea 2: instrucción con sangría
            parrafos.push(new Paragraph({
              children: [t(item.instruccion)],
              indent: { left: 360 },
              ...sp(100)
            }));
          } else {
            parrafos.push(new Paragraph({
              children: [t(num + item.instruccion)],
              ...sp(60)
            }));
          }
        });
      }

      // Cita de revisión
      parrafos.push(new Paragraph({
        children: [
          t('Solicitar cita de revisión en consultorio para el '),
          tb(fechaCita || '', { underline: { type: UnderlineType.SINGLE } }),
          t('.'),
        ],
        ...sp(200, 160)
      }));

      // Firma
      parrafos.push(new Paragraph({
        children: [tb('DR. PABLO VIDAL GONZÁLEZ', { color: AZUL })],
        alignment: AlignmentType.RIGHT,
        ...sp(0)
      }));

      // Salto de página al final de hoja 1 (no al final de hoja 2)
      if (!isSecond) {
        parrafos.push(new Paragraph({
          children: [new PageBreak()],
        }));
      }

      return parrafos;
    }

    // ── Indicaciones generales (hojas 3 y 4 — texto fijo) ────────────────────
    const INDICACIONES_GENERALES = [
      { titulo: 'INDICACIONES GENERALES POSTERIORES A PROCEDIMIENTO DE LAPAROSCOPIA', isHeader: true },
      { texto: 'Después de un procedimiento de laparoscopia, es normal que te sientas un poco incómodo y necesites tiempo para descansar.' },
      { subtitulo: 'Descanso:', texto: 'En los primeros días después de la cirugía, descansa y evita actividades físicas extenuantes. No levantes objetos pesados ni realices esfuerzos excesivos durante al menos 2 semanas.' },
      { subtitulo: 'Alimentación:', texto: 'Comienza con líquidos y alimentos suaves, y avanza gradualmente a tu dieta normal cuando te sientas cómodo. Mantén una dieta equilibrada y nutritiva para favorecer la recuperación.' },
      { subtitulo: 'Manejo del dolor:', texto: 'Es probable que tengas algún dolor o molestia después de la cirugía. Toma el medicamento para el dolor según las instrucciones de tu médico.' },
      { subtitulo: 'Cuidado de la herida:', texto: 'Mantén la zona de la incisión limpia y seca. Lávela durante el baño con agua y jabón sin frotar y sécala con suaves toquecitos.' },
      { subtitulo: 'Seguimiento:', texto: 'Programa y asiste a todas las citas de seguimiento, esto nos permite verificar la cicatrización y discutir cualquier preocupación.' },
      { subtitulo: 'Síntomas para tener en cuenta:', texto: 'Si experimentas fiebre, enrojecimiento o hinchazón alrededor de la incisión, dolor que no cede con el medicamento, o cualquier otro síntoma inusual, contacta a tu médico de inmediato.' },
      { subtitulo: 'Actividad física:', texto: 'Asegúrate de moverte regularmente después de la cirugía para ayudar a prevenir la formación de coágulos de sangre, pero evita los ejercicios intensos hasta que tu médico te lo indique.' },
      { subtitulo: 'Soporte emocional:', texto: 'Es normal tener una variedad de emociones después de la cirugía. Puedes sentir sueño, falta de energía o incluso depresión leve. No dudes en hablar con tu médico si te sientes abrumado.' },
    ];

    const DIETA = [
      { titulo: 'INDICACIONES DIETA SALUDABLE PARA PACIENTE POSTOPERADO DE CIRUGÍA ABDOMINAL', isHeader: true },
      { subtitulo: '1. Hidratación:' },
      { lista: 'Beber al menos 8-10 vasos de agua al día.' },
      { lista: 'Incluir caldos claros, té de hierbas y jugos diluidos.' },
      { subtitulo: '2. Alimentos Permitidos:' },
      { lista: 'Proteínas magras: Pollo y pavo sin piel, Pescado blanco, Huevos cocidos, Tofu.' },
      { lista: 'Carbohidratos complejos: Arroz integral, quinoa, avena, pan integral.' },
      { lista: 'Verduras cocidas: Zanahorias, calabacines, espinacas, brócoli y coliflor bien cocidos.' },
      { lista: 'Frutas: Manzanas y peras sin piel cocidas, bananas maduras, papayas.' },
      { lista: 'Lácteos bajos en grasa: Yogur natural, queso cottage, leche descremada.' },
      { subtitulo: '3. Alimentos a Evitar:' },
      { lista: 'Alimentos grasos y fritos: Frituras, embutidos, cortes grasos de carne.' },
      { lista: 'Alimentos procesados y azúcares refinados: Dulces, pasteles, snacks salados.' },
      { lista: 'Alimentos que producen gases: Repollo, cebolla, ajo, bebidas carbonatadas.' },
      { lista: 'Alimentos irritantes: Comida picante, café, alcohol, chocolate.' },
      { subtitulo: '4. Recomendaciones Generales:' },
      { lista: 'Comer 5-6 pequeñas comidas al día en lugar de 3 grandes.' },
      { lista: 'Masticar bien los alimentos y comer despacio.' },
      { lista: 'Preferir alimentos cocidos, al vapor, a la parrilla o al horno.' },
      { subtitulo: '5. Seguimiento:' },
      { lista: 'Monitorizar la tolerancia a los alimentos y ajustar la dieta según sea necesario.' },
    ];

    function buildIndicacionesGenerales() {
      const parrafos = [];

      for (const item of INDICACIONES_GENERALES) {
        if (item.isHeader) {
          parrafos.push(new Paragraph({ children: [tb(item.titulo, { color: AZUL })], ...sp(160, 0) }));
        } else if (item.subtitulo && item.texto) {
          parrafos.push(new Paragraph({ children: [tb(item.subtitulo), t('  ' + item.texto)], ...sp(80) }));
        } else if (item.texto) {
          parrafos.push(new Paragraph({ children: [t(item.texto)], ...sp(80) }));
        }
      }

      parrafos.push(new Paragraph({ children: [new PageBreak()] }));

      for (const item of DIETA) {
        if (item.isHeader) {
          parrafos.push(new Paragraph({ children: [tb(item.titulo, { color: AZUL })], ...sp(160, 0) }));
        } else if (item.subtitulo) {
          parrafos.push(new Paragraph({ children: [tb(item.subtitulo)], ...sp(60, 80) }));
        } else if (item.lista) {
          parrafos.push(new Paragraph({ children: [t('• ' + item.lista)], indent: { left: 280 }, ...sp(40) }));
        }
      }

      parrafos.push(new Paragraph({ children: [new PageBreak()] }));
      return parrafos;
    }

    // ── Receta (hoja 5) ───────────────────────────────────────────────────────
    function buildReceta() {
      const antibiotico = biomicsItem;
      return [
        new Paragraph({ children: [t('CDMX a  ' + (fecha || ''))], alignment: AlignmentType.RIGHT, ...sp(200) }),
        new Paragraph({ children: [tb('Paciente:  '), t(nombre || '')], ...sp(80) }),
        new Paragraph({
          children: [
            tb('Edad:  '), t((edad || '') + ' años'),
            new TextRun({ text: '\t', font: FONT, size: SZ }),
            tb('FN:  '), t(fechaNacimiento || ''),
          ],
          tabStops: [{ type: TabStopType.LEFT, position: TabStopPosition.MAX / 2 }],
          ...sp(240)
        }),
        new Paragraph({ children: [tb('1.-  ', { color: AZUL }), tb(antibiotico.nombre, { color: AZUL, underline: { type: UnderlineType.SINGLE } })], ...sp(20) }),
        new Paragraph({ children: [t(antibiotico.instruccion)], indent: { left: 360 }, ...sp(60) }),
        new Paragraph({ children: [t('Favor de surtir una caja con 6 cápsulas')], indent: { left: 360 }, ...sp(400) }),
        new Paragraph({ children: [tb('DR. PABLO VIDAL GONZÁLEZ', { color: AZUL })], alignment: AlignmentType.RIGHT }),
      ];
    }

    // ── Armar documento completo ──────────────────────────────────────────────
    const allChildren = [
      ...buildHojaAlta(false),   // Hoja 1
      ...buildHojaAlta(true),    // Hoja 2
      ...buildIndicacionesGenerales(), // Hojas 3 y 4
      ...buildReceta(),          // Hoja 5
    ];

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: allChildren
      }]
    });

    const buffer   = await Packer.toBuffer(doc);
    const base64   = buffer.toString('base64');
    const resend   = new Resend(process.env.RESEND_API_KEY);
    const archivo  = 'Alta_' + (nombre || 'Paciente').replace(/\s+/g, '_') + '_' + (fecha || '').replace(/\s+/g, '_') + '.docx';

    await resend.emails.send({
      from: 'Registro Quirurgico <onboarding@resend.dev>',
      to: ['drpablovidal@gmail.com'],
      subject: 'Indicaciones de Alta: ' + (nombre || 'Paciente') + ' — ' + (fecha || ''),
      html: '<div style="font-family:Arial,sans-serif;max-width:600px"><h2 style="color:#365F91">Indicaciones de Alta — Dr. Pablo Vidal</h2><table cellpadding="7" border="1" style="border-collapse:collapse;width:100%;font-size:13px"><tr><td><b>Paciente</b></td><td>' + (nombre||'-') + '</td></tr><tr><td><b>Fecha</b></td><td>' + (fecha||'-') + '</td></tr><tr><td><b>Edad</b></td><td>' + (edad||'-') + '</td></tr><tr><td><b>F. Nacimiento</b></td><td>' + (fechaNacimiento||'-') + '</td></tr><tr><td><b>Procedimiento</b></td><td>' + (procedimiento||'-') + '</td></tr><tr><td><b>Cita revisión</b></td><td>' + (fechaCita||'-') + '</td></tr></table>' + (indicacionesExtra ? '<p><b>Cambios:</b> ' + indicacionesExtra + '</p>' : '') + '<p style="font-size:11px;color:#999">App Registro Quirúrgico Dr. Pablo Vidal</p></div>',
      attachments: [{ filename: archivo, content: base64 }]
    });

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error generar-alta:', error);
    res.status(500).json({ error: error.message });
  }
};
