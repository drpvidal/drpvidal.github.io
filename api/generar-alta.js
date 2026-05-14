const { Resend } = require('resend');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType, PageBreak
} = require('docx');

const AZUL  = '365F91';
const NEGRO = '000000';
const SZ    = 22;
const FONT  = 'Calibri';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nombre, edad, fechaNacimiento, procedimiento, fecha, fechaCita, indicacionesExtra, indicacionesEspeciales } = req.body;

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
    let biomicsItem = INDICACIONES_BASE[0].items[1];

    // ── Llamada a IA para modificar medicamentos ──────────────────────────────
    if (indicacionesExtra && indicacionesExtra.trim()) {
      const baseTexto = INDICACIONES_BASE.map(s =>
        s.seccion + ':\n' + s.items.map((item, i) =>
          (i+1) + '.- ' + (item.nombre ? item.nombre + ' ' : '') + item.instruccion
        ).join('\n')
      ).join('\n\n');

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: 'Eres un asistente médico. Tienes estas indicaciones de alta:\n\n' + baseTexto + '\n\nEl médico quiere hacer estos cambios:\n' + indicacionesExtra + '\n\nDevuelve SOLO un JSON array con este formato exacto, sin texto adicional:\n[{"seccion":"MEDICAMENTOS","items":[{"nombre":"ULSEN (Omeprazol) capsulas 40mg.","instruccion":"Tomar..."}]},{"seccion":"MEDIDAS GENERALES","items":[{"instruccion":"Dieta..."}]},{"seccion":"AVISAR DE INMEDIATO EN CASO DE","items":[{"instruccion":"Fiebre."}]}]' }]
        })
      });
      const aiData = await aiRes.json();
      const aiText = aiData.content.map(i => i.text || '').join('').replace(/```json|```/g, '').trim();
      try {
        seccionesFinales = JSON.parse(aiText);
        const medSec = seccionesFinales.find(s => s.seccion === 'MEDICAMENTOS');
        if (medSec && medSec.items[1]) biomicsItem = medSec.items[1];
      } catch(e) { seccionesFinales = INDICACIONES_BASE; }
    }

    // ── Llamada a IA para indicaciones especiales ─────────────────────────────
    let hojaEspecial = null;
    if (indicacionesEspeciales && indicacionesEspeciales.trim()) {
      const aiRes2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1200,
          messages: [{ role: 'user', content: 'Eres un asistente médico cirujano. El médico quiere agregar una hoja de indicaciones específicas para este paciente postoperado de: ' + (procedimiento || '') + '.\n\nEl médico indicó los temas a incluir:\n' + indicacionesEspeciales + '\n\nGenera una página de indicaciones postoperatorias específicas. REGLAS DE FORMATO OBLIGATORIAS:\n- El título va en MAYÚSCULAS en la primera línea\n- Los subtítulos de sección terminan con dos puntos, ejemplo: Cuidados de la herida:\n- Cada punto empieza con guión: - texto\n- NO uses #, ##, **, *, ni ningún formato Markdown\n- Responde SOLO con las indicaciones, sin explicaciones adicionales' }]
        })
      });
      const aiData2 = await aiRes2.json();
      hojaEspecial = aiData2.content.map(i => i.text || '').join('').trim();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const t  = (text, opts) => new TextRun({ text: text || '', font: FONT, size: SZ, color: NEGRO, ...opts });
    const tb = (text, opts) => t(text, { bold: true, ...opts });
    const sp = (after, before) => ({ spacing: { after: after||0, before: before||0 } });

    // ── Hoja de indicaciones de alta ──────────────────────────────────────────
    function buildHojaAlta(addPageBreak) {
      const pp = [];
      pp.push(new Paragraph({ children: [t('CDMX a  ' + (fecha||''))], alignment: AlignmentType.RIGHT, ...sp(160) }));
      pp.push(new Paragraph({ children: [tb('Paciente:  '), tb(nombre||'')], ...sp(40) }));
      pp.push(new Paragraph({
        children: [
          tb('Edad: '), t((edad||'').replace(/\s*años\s*$/i,'') + ' años'),
          new TextRun({ text: '                                                                    ', font: FONT, size: SZ }),
          tb('FN: '), t(fechaNacimiento||''),
        ],
        ...sp(160)
      }));
      pp.push(new Paragraph({ children: [t('Indicaciones médicas para paciente post-operado de '), tb((procedimiento||'').toUpperCase())], ...sp(160) }));

      for (const seccion of seccionesFinales) {
        pp.push(new Paragraph({ children: [tb(seccion.seccion + ':', { color: AZUL })], ...sp(80, 120) }));
        seccion.items.forEach((item, idx) => {
          const num = (idx+1) + '.-  ';
          if (item.nombre) {
            pp.push(new Paragraph({ children: [tb(num, { color: AZUL }), tb(item.nombre, { color: AZUL, underline: { type: UnderlineType.SINGLE } })], ...sp(20) }));
            pp.push(new Paragraph({ children: [t(item.instruccion)], indent: { left: 360 }, ...sp(100) }));
          } else {
            pp.push(new Paragraph({ children: [t(num + item.instruccion)], ...sp(60) }));
          }
        });
      }

      pp.push(new Paragraph({ children: [t('Solicitar cita de revisión en consultorio para el '), tb(fechaCita||'', { underline: { type: UnderlineType.SINGLE } }), t('.')], ...sp(200, 160) }));
      pp.push(new Paragraph({ children: [tb('DR. PABLO VIDAL GONZÁLEZ', { color: AZUL })], alignment: AlignmentType.RIGHT }));
      if (addPageBreak) pp.push(new Paragraph({ children: [new PageBreak()] }));
      return pp;
    }

    // ── Hojas 3 y 4 fijas ─────────────────────────────────────────────────────
    function buildIndicacionesGenerales() {
      const pp = [];

      pp.push(new Paragraph({ children: [tb('INDICACIONES GENERALES POSTERIORES A PROCEDIMIENTO DE LAPAROSCOPIA', { color: AZUL })], alignment: AlignmentType.CENTER, ...sp(200) }));
      pp.push(new Paragraph({ children: [t('Después de un procedimiento de laparoscopia, es normal que te sientas un poco incómodo y necesites tiempo para descansar y recuperarse. Aquí te dejo algunas indicaciones generales para el cuidado postoperatorio.')], ...sp(160) }));

      const items3 = [
        { sub: 'Descanso:', texto: 'En los primeros días después de la cirugía, descansa y evita actividades físicas extenuantes. No levantes objetos pesados.' },
        { sub: 'Alimentación:', texto: 'Comienza con líquidos y alimentos suaves, y avanza gradualmente a tu dieta normal cuando te sientas cómodo. Asegúrate de mantenerte hidratado.' },
        { sub: 'Manejo del dolor:', texto: 'Es probable que tengas algún dolor o molestia después de la cirugía. Toma el medicamento para el dolor según las instrucciones.' },
        { sub: 'Cuidado de la herida:', texto: 'Mantén la zona de la incisión limpia y seca. Lávela durante el baño con agua y jabón sin frotar y sécala posteriormente.' },
        { sub: 'Seguimiento:', texto: 'Programa y asiste a todas las citas de seguimiento, esto nos permite verificar la cicatrización y discutir cualquier resultado o paso siguiente en el tratamiento.' },
        { sub: 'Síntomas para tener en cuenta:', texto: 'Si experimentas fiebre, enrojecimiento o hinchazón alrededor de la incisión, dolor que no se alivia con medicamentos, vómitos persistentes, dificultad para orinar, falta de aire o cualquier otro síntoma inusual debes contactarnos de inmediato.' },
        { sub: 'Actividad física:', texto: 'Asegúrate de moverte regularmente después de la cirugía para ayudar a prevenir la formación de coágulos. Sin embargo, evita cualquier actividad física extenuante hasta que cumplas el tiempo que te sugerimos para evitar así complicaciones.' },
        { sub: 'Soporte emocional:', texto: 'Es normal tener una variedad de emociones después de la cirugía. Puedes sentir sueño, falta de energía, necesidad de tomar una siesta y en ocasiones puede haber algo de aplanamiento emocional en los siguientes días, esto es normal y poco a poco mejorará. Si esto no sucede no dudes en comentarlo para buscar una solución.' },
      ];

      for (const item of items3) {
        pp.push(new Paragraph({ children: [tb(item.sub, { color: AZUL, underline: { type: UnderlineType.SINGLE } }), t(' ' + item.texto)], ...sp(120) }));
      }

      pp.push(new Paragraph({ children: [new PageBreak()] }));

      pp.push(new Paragraph({ children: [tb('INDICACIONES DIETA SALUDABLE PARA PACIENTE POSTOPERADO DE CIRUGÍA ABDOMINAL', { color: AZUL })], alignment: AlignmentType.CENTER, ...sp(200) }));

      const dieta = [
        { sub: '1. Hidratación:', items: ['Beber al menos 8-10 vasos de agua al día.', 'Incluir caldos claros, té de hierbas y jugos diluidos.'] },
        { sub: '2. Alimentos Permitidos:', items: ['Proteínas magras: Pollo y pavo sin piel, Pescado blanco, Huevos (preferiblemente cocidos o en tortilla sin grasa), Tofu y legumbres bien cocidas.', 'Carbohidratos complejos: Arroz integral y quinoa, Avena y cereales integrales sin azúcar, Pan integral y tortillas integrales.', 'Verduras cocidas y fáciles de digerir: Zanahorias, calabacines, espinacas, calabaza, brócoli y coliflor bien cocidos.', 'Frutas: Manzanas y peras sin piel, preferiblemente cocidas, Bananas maduras y papayas, Jugos de frutas naturales sin pulpa.', 'Lácteos bajos en grasa: Yogur natural o bajo en grasa, Queso cottage, Leche descremada o de almendras.'] },
        { sub: '3. Alimentos a Evitar:', items: ['Alimentos grasos y fritos: Evitar frituras, embutidos y cortes grasos de carne, Productos lácteos enteros.', 'Alimentos procesados y azúcares refinados: Dulces, pasteles y bollería industrial, Snacks salados y alimentos enlatados con alto contenido de sodio.', 'Alimentos que producen gases: Coles de Bruselas, repollo, cebolla y ajo, Bebidas carbonatadas y chicles.', 'Alimentos irritantes: Comida picante, café y alcohol, Bebidas con cafeína y chocolate.'] },
        { sub: '4. Recomendaciones Generales:', items: ['Frecuencia de comidas: Comer 5-6 pequeñas comidas al día en lugar de 3 grandes, Masticar bien los alimentos y comer despacio.', 'Técnicas de cocción: Preferir alimentos cocidos, al vapor, a la parrilla o al horno, Evitar los alimentos crudos o poco cocidos.', 'Suplementos: Considerar suplementos de fibra si la ingesta dietética no es suficiente, Consultar con el médico sobre el uso de suplementos vitamínicos y minerales.'] },
        { sub: '5. Seguimiento:', items: ['Monitorizar la tolerancia a los alimentos y ajustar la dieta según sea necesario.'] },
      ];

      for (const grupo of dieta) {
        pp.push(new Paragraph({ children: [tb(grupo.sub, { color: AZUL, underline: { type: UnderlineType.SINGLE } })], ...sp(60, 100) }));
        for (const item of grupo.items) {
          pp.push(new Paragraph({ children: [t('• ' + item)], indent: { left: 360 }, ...sp(40) }));
        }
      }

      pp.push(new Paragraph({ children: [new PageBreak()] }));
      return pp;
    }

    // ── Hoja especial generada por IA ─────────────────────────────────────────
    function buildHojaEspecial(texto) {
      const pp = [];
      // Limpiar markdown que la IA pueda haber generado
      const limpio = texto
        .replace(/^#{1,3}\s*/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .trim();
      const lineas = limpio.split('\n');
      let primero = true;
      for (const linea of lineas) {
        const trimmed = linea.trim();
        if (!trimmed) { pp.push(new Paragraph({ children: [t('')], ...sp(60) })); continue; }
        // Título principal: primera línea o toda en mayúsculas
        if (primero || /^[A-ZÁÉÍÓÚÑ\s\-]{10,}$/.test(trimmed)) {
          pp.push(new Paragraph({ children: [tb(trimmed, { color: AZUL })], alignment: AlignmentType.CENTER, ...sp(200, primero?0:160) }));
          primero = false;
        // Subtítulo de sección: termina en :
        } else if (/^[A-Za-záéíóúñÁÉÍÓÚÑ].{2,}:$/.test(trimmed)) {
          pp.push(new Paragraph({ children: [tb(trimmed, { color: AZUL, underline: { type: UnderlineType.SINGLE } })], ...sp(80, 140) }));
        // Punto de lista
        } else if (/^[-•]/.test(trimmed)) {
          pp.push(new Paragraph({ children: [t('• ' + trimmed.replace(/^[-•]\s*/, ''))], indent: { left: 360 }, ...sp(60) }));
        // Texto normal
        } else {
          pp.push(new Paragraph({ children: [t(trimmed)], ...sp(80) }));
        }
      }
      pp.push(new Paragraph({ children: [new PageBreak()] }));
      return pp;
    }

    // ── Receta (documento separado) ───────────────────────────────────────────
    function buildReceta() {
      return [
        new Paragraph({ children: [t('CDMX a  ' + (fecha||''))], alignment: AlignmentType.RIGHT, ...sp(200) }),
        new Paragraph({ children: [tb('Paciente:  '), t(nombre||'')], ...sp(80) }),
        new Paragraph({
          children: [tb('Edad: '), t((edad||'').replace(/\s*años\s*$/i,'') + ' años'), new TextRun({ text: '                                                                    ', font: FONT, size: SZ }), tb('FN: '), t(fechaNacimiento||'')],
          ...sp(280)
        }),
        new Paragraph({ children: [tb('1.-  ', { color: AZUL }), tb(biomicsItem.nombre, { color: AZUL, underline: { type: UnderlineType.SINGLE } })], ...sp(20) }),
        new Paragraph({ children: [t(biomicsItem.instruccion)], indent: { left: 360 }, ...sp(60) }),
        new Paragraph({ children: [t('Favor de surtir una caja con 6 cápsulas')], indent: { left: 360 }, ...sp(400) }),
        new Paragraph({ children: [tb('DR. PABLO VIDAL GONZÁLEZ', { color: AZUL })], alignment: AlignmentType.RIGHT }),
      ];
    }

    // ── Documento 1: Indicaciones ─────────────────────────────────────────────
    const childrenIndicaciones = [
      ...buildHojaAlta(true),
      ...buildHojaAlta(true),
      ...buildIndicacionesGenerales(),
      ...(hojaEspecial ? buildHojaEspecial(hojaEspecial) : []),
    ];
    // Quitar el último PageBreak si no hay más hojas
    if (!hojaEspecial && childrenIndicaciones[childrenIndicaciones.length-1]) {
      // ya sin pagebreak final
    }

    const docIndicaciones = new Document({
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: childrenIndicaciones }]
    });

    // ── Documento 2: Receta ───────────────────────────────────────────────────
    const docReceta = new Document({
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: buildReceta() }]
    });

    const bufferInd   = await Packer.toBuffer(docIndicaciones);
    const bufferRec   = await Packer.toBuffer(docReceta);
    const base64Ind   = bufferInd.toString('base64');
    const base64Rec   = bufferRec.toString('base64');

    const nombreBase  = (nombre||'Paciente').replace(/\s+/g, '_');
    const fechaBase   = (fecha||'').replace(/\s+/g, '_');

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Registro Quirurgico <onboarding@resend.dev>',
      to: ['drpablovidal@gmail.com'],
      subject: 'Alta: ' + (nombre||'Paciente') + ' — ' + (fecha||''),
      html: '<div style="font-family:Arial,sans-serif;max-width:600px"><h2 style="color:#365F91">Indicaciones de Alta — Dr. Pablo Vidal</h2><table cellpadding="7" border="1" style="border-collapse:collapse;width:100%;font-size:13px"><tr><td><b>Paciente</b></td><td>' + (nombre||'-') + '</td></tr><tr><td><b>Fecha</b></td><td>' + (fecha||'-') + '</td></tr><tr><td><b>Edad</b></td><td>' + (edad||'-') + '</td></tr><tr><td><b>FN</b></td><td>' + (fechaNacimiento||'-') + '</td></tr><tr><td><b>Procedimiento</b></td><td>' + (procedimiento||'-') + '</td></tr><tr><td><b>Cita</b></td><td>' + (fechaCita||'-') + '</td></tr></table><p style="font-size:12px;color:#555">📎 Adjunto 1: Indicaciones de alta<br>📎 Adjunto 2: Receta</p>' + (indicacionesExtra ? '<p><b>Cambios medicamentos:</b> ' + indicacionesExtra + '</p>' : '') + (indicacionesEspeciales ? '<p><b>Indicaciones especiales:</b> ' + indicacionesEspeciales + '</p>' : '') + '</div>',
      attachments: [
        { filename: 'Indicaciones_' + nombreBase + '_' + fechaBase + '.docx', content: base64Ind },
        { filename: 'Receta_' + nombreBase + '_' + fechaBase + '.docx', content: base64Rec },
      ]
    });

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error generar-alta:', error);
    res.status(500).json({ error: error.message });
  }
};
