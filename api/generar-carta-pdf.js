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

  // Tamaño carta fijo siempre
  const PW = 595, PH = 842;
  const MX = 50, TW = PW - MX * 2;
  const FTR_H = 100;
  const HDR_BOT = 128;
  const BODY_TOP_P1 = 178;
  const BODY_TOP_PN = HDR_BOT + 20;
  // Espacio para firma + footer en ultima pagina
  const FIRMA_RESERVA = 110;
  const BODY_BOT = PH - FTR_H - FIRMA_RESERVA;

  const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Carta_${(nombre||'DrVidal').replace(/ /g,'_')}.pdf"`);
    res.send(Buffer.concat(chunks));
  });

  // Dividir texto en lineas y calcular altura real de cada una
  doc.font('Helvetica').fontSize(10);
  var lineas = (texto||'').split('\n');
  var bloques = [];
  lineas.forEach(function(l) {
    if (!l.trim()) {
      bloques.push({ vacio: true, h: 7 });
    } else {
      var h = doc.heightOfString(l, { width: TW, lineGap: 2 });
      bloques.push({ texto: l, h: h + 5 });
    }
  });

  // Paginar: distribuir bloques en paginas de tamaño fijo
  var paginas = [];
  var actual = [];
  var yAcum = BODY_TOP_P1;
  var primera = true;

  bloques.forEach(function(bloque) {
    var limite = BODY_BOT;
    if (yAcum + bloque.h > limite) {
      paginas.push({ bloques: actual, primera: primera });
      actual = [];
      primera = false;
      yAcum = BODY_TOP_PN;
    }
    actual.push(bloque);
    yAcum += bloque.h;
  });
  if (actual.length) paginas.push({ bloques: actual, primera: primera });

  // Renderizar cada pagina
  paginas.forEach(function(pag, pi) {
    var esUltima = pi === paginas.length - 1;
    doc.addPage({ size: [PW, PH], margin: 0 });

    // Header siempre
    doc.image(hdrPath, 0, 0, { width: PW });
    // Footer siempre al fondo fijo
    doc.image(ftrPath, 0, PH - FTR_H, { width: PW });

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
      if (bloque.vacio) { y += bloque.h; return; }
      doc.font('Helvetica').fontSize(10).fillColor('#111');
      doc.text(bloque.texto, MX, y, { width: TW, lineGap: 2 });
      y += bloque.h;
    });

    // Firma solo en ultima pagina, antes del footer
    if (esUltima) {
      var firmaY = Math.min(y + 15, PH - FTR_H - 95);
      doc.image(frmPath, 310, firmaY, { width: 170 });
    }
  });

  doc.end();
};
