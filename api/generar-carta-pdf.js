const PDFDocument = require('pdfkit');
const path = require('path');

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
  const MX = 50, TW = PW - MX * 2;
  const HDR_BOT = 128;
  const FTR_H = 100;
  const FIRMA_SPACE = 110;
  const BODY_TOP_P1 = 178;
  const BODY_TOP_PN = HDR_BOT + 20;
  const BODY_BOT = PH - FTR_H - FIRMA_SPACE - 10;

  const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Carta_${(nombre||'DrVidal').replace(/ /g,'_')}.pdf"`);
    res.send(Buffer.concat(chunks));
  });

  // Parsear texto: dividir en segmentos bold/normal
  function parsear(linea) {
    var partes = linea.split(/\*\*([^*]+)\*\*/g);
    return partes.map(function(s, i){ return { t: s, b: i%2===1 }; }).filter(function(s){ return s.t; });
  }

  // Calcular altura de una linea (texto plano)
  function altoLinea(txt) {
    return doc.font('Helvetica').fontSize(10).heightOfString(txt, { width: TW, lineGap: 2 });
  }

  // Construir bloques a renderizar
  var lineas = (texto||'').split('\n');
  var bloques = [];
  lineas.forEach(function(l) {
    if (!l.trim()) { bloques.push({ vacio: true }); return; }
    var segs = parsear(l);
    var plain = segs.map(function(s){ return s.t; }).join('');
    bloques.push({ segs: segs, plain: plain, h: altoLinea(plain) + 4 });
  });

  var paginas = [];
  var paginaActual = [];
  var yUsado = BODY_TOP_P1;
  var esPrimera = true;

  bloques.forEach(function(bloque) {
    var h = bloque.vacio ? 8 : bloque.h;
    var limite = esPrimera ? BODY_BOT : BODY_BOT;
    if (yUsado + h > limite) {
      paginas.push({ bloques: paginaActual, primera: esPrimera });
      paginaActual = [];
      esPrimera = false;
      yUsado = BODY_TOP_PN;
    }
    paginaActual.push(bloque);
    yUsado += h;
  });
  paginas.push({ bloques: paginaActual, primera: esPrimera });

  paginas.forEach(function(pag, pi) {
    var esUltima = pi === paginas.length - 1;
    doc.addPage({ size: [PW, PH], margin: 0 });
    doc.image(hdrPath, 0, 0, { width: PW });

    var y;
    if (pag.primera) {
      doc.font('Helvetica').fontSize(10).fillColor('#111');
      doc.text('CDMX a ' + (fecha||''), 180, 130, { align: 'right', width: 370 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
      doc.text(titulo||'', MX, HDR_BOT + 10, { align: 'center', width: TW });
      y = BODY_TOP_P1;
    } else {
      y = BODY_TOP_PN;
    }

    pag.bloques.forEach(function(bloque) {
      if (bloque.vacio) { y += 8; return; }
      if (bloque.segs.length === 1 && !bloque.segs[0].b) {
        doc.font('Helvetica').fontSize(10).fillColor('#111');
        doc.text(bloque.segs[0].t, MX, y, { width: TW, lineGap: 2 });
      } else {
        var last = bloque.segs.length - 1;
        bloque.segs.forEach(function(seg, si) {
          doc.font(seg.b ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#111');
          doc.text(seg.t,
            si === 0 ? MX : undefined,
            si === 0 ? y : undefined,
            { width: TW, lineGap: 2, continued: si < last }
          );
        });
      }
      y += bloque.h;
    });

    if (esUltima) {
      doc.image(frmPath, 310, y + 15, { width: 170 });
    }
    doc.image(ftrPath, 0, PH - FTR_H, { width: PW });
  });

  doc.end();
};
