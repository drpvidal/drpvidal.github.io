const PDFDocument = require('pdfkit');
const path = require('path');

function renderTexto(doc, texto, x, y, maxWidth) {
  // Divide el texto en segmentos normales y en negritas (**texto**)
  var parrafos = texto.split('\n');
  parrafos.forEach(function(parrafo) {
    if (!parrafo.trim()) { y += 8; return; }
    var partes = parrafo.split(/\*\*([^*]+)\*\*/g);
    var lineX = x;
    var segmentos = [];
    partes.forEach(function(parte, idx) {
      segmentos.push({ texto: parte, bold: idx % 2 === 1 });
    });
    // Calcular altura total del parrafo para saber si cabe
    var textoPlano = partes.join('');
    var h = doc.fontSize(10).heightOfString(textoPlano, { width: maxWidth, lineGap: 3 });
    segmentos.forEach(function(seg) {
      if (!seg.texto) return;
      doc.font(seg.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#111111');
      doc.text(seg.texto, lineX, y, {
        width: maxWidth,
        continued: false,
        lineGap: 3
      });
      if (seg.bold) {
        // Para bold inline necesitamos manejar manualmente
      }
    });
    // Renderizado simple parrafo a parrafo
    y += h + 4;
  });
  return y;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const { nombre, fn, fecha, titulo, texto } = req.body;
  const hdrPath = path.join(__dirname, '../assets/header.jpg');
  const ftrPath = path.join(__dirname, '../assets/footer.jpg');
  const frmPath = path.join(__dirname, '../assets/firma.png');

  const PW = 595, PH = 842;
  const MX = 50, textWidth = PW - MX * 2;
  const HDR_H = 128, FTR_H = 100, FIRMA_H = 90;
  const BODY_TOP = 148, BODY_BOTTOM = PH - FTR_H - FIRMA_H - 10;

  const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Carta_${(nombre||'DrVidal').replace(/ /g,'_')}.pdf"`);
    res.send(Buffer.concat(chunks));
  });

  function nuevaPagina(esPrimera) {
    doc.addPage({ size: [PW, PH], margin: 0 });
    doc.image(hdrPath, 0, 0, { width: PW });
    if (esPrimera) {
      doc.font('Helvetica').fontSize(10).fillColor('#111111');
      doc.text('CDMX a ' + (fecha || ''), 180, 130, { align: 'right', width: 370 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
      doc.text(titulo || '', MX, BODY_TOP, { align: 'center', width: textWidth });
      return BODY_TOP + 30;
    } else {
      return HDR_H + 20;
    }
  }

  function cerrarPagina(y, esUltima) {
    if (esUltima) {
      doc.image(frmPath, 310, y + 20, { width: 170 });
    }
    doc.image(ftrPath, 0, PH - FTR_H, { width: PW });
  }

  // Parsear texto en bloques con formato
  var parrafos = (texto || '').split('\n');
  var bloques = [];
  parrafos.forEach(function(p) {
    if (!p.trim()) { bloques.push({ tipo: 'espacio' }); return; }
    var partes = p.split(/\*\*([^*]+)\*\*/g);
    var segs = partes.map(function(s, i) {
      return { texto: s, bold: i % 2 === 1 };
    }).filter(function(s) { return s.texto; });
    bloques.push({ tipo: 'parrafo', segs: segs });
  });

  // Calcular altura de cada bloque
  function alturaBloque(bloque) {
    if (bloque.tipo === 'espacio') return 8;
    var textoPlano = bloque.segs.map(function(s){ return s.texto; }).join('');
    return doc.font('Helvetica').fontSize(10).heightOfString(textoPlano, { width: textWidth, lineGap: 3 }) + 4;
  }

  var y = nuevaPagina(true);
  var pagina = 1;
  var totalBloques = bloques.length;

  for (var i = 0; i < totalBloques; i++) {
    var bloque = bloques[i];
    var h = alturaBloque(bloque);

    // Ver si cabe en esta pagina
    var espacioRestante = BODY_BOTTOM - y;
    if (h > espacioRestante) {
      // Cerrar pagina actual sin firma
      cerrarPagina(y, false);
      y = nuevaPagina(false);
      pagina++;
    }

    if (bloque.tipo === 'espacio') {
      y += 8;
      continue;
    }

    // Renderizar parrafo con segmentos bold/normal inline
    var textoPlano = bloque.segs.map(function(s){ return s.texto; }).join('');
    if (bloque.segs.length === 1 && !bloque.segs[0].bold) {
      doc.font('Helvetica').fontSize(10).fillColor('#111111');
      doc.text(textoPlano, MX, y, { width: textWidth, lineGap: 3 });
    } else {
      // Renderizar con negrita inline usando continued
      var last = bloque.segs.length - 1;
      bloque.segs.forEach(function(seg, si) {
        doc.font(seg.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#111111');
        doc.text(seg.texto, si === 0 ? MX : undefined, si === 0 ? y : undefined, {
          width: textWidth,
          lineGap: 3,
          continued: si < last
        });
      });
    }
    y += h;
  }

  // Cerrar ultima pagina con firma
  cerrarPagina(y, true);
  doc.end();
};
