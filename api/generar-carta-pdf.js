const PDFDocument = require('pdfkit');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, fecha, titulo, texto } = req.body;
  const hdrPath = path.join(__dirname, '../assets/header.jpg');
  const ftrPath = path.join(__dirname, '../assets/footer.jpg');
  const frmPath = path.join(__dirname, '../assets/firma.png');

  const PW = 595, PH = 842;
  const MX = 50, TW = PW - MX * 2;
  const FTR_H = 100;
  const HDR_BOT = 128;
  const FIRMA_H = 95;
  const BODY_BOT = PH - FTR_H - FIRMA_H - 5;
  const BODY_TOP_P1 = 182;
  const BODY_TOP_PN = HDR_BOT + 18;

  // Limpiar agresivamente el texto
  var textoLimpio = (texto || '')
    .split('\n')
    .filter(function(l) {
      var t = l.trim().toUpperCase();
      // Quitar lineas que sean el titulo
      if (t === 'CONSTANCIA DE INCAPACIDAD LABORAL') return false;
      if (t === 'JUSTIFICANTE MEDICO ESCOLAR') return false;
      if (t === 'CARTA DE SALUD') return false;
      if (t === 'CARTA DE REFERENCIA MEDICA') return false;
      if (t === 'CARTA MEDICA PARA VIAJE') return false;
      if (t === 'CARTA MEDICA') return false;
      // Quitar firma al final
      if (t === 'ATENTAMENTE') return false;
      if (t.startsWith('DR. PABLO VIDAL')) return false;
      if (t.startsWith('CIRUJANO GENERAL')) return false;
      if (t.startsWith('CEDULA PROFESIONAL')) return false;
      if (t.startsWith('CIUDAD DE MEXICO')) return false;
      if (t.startsWith('CDMX,')) return false;
      if (t.startsWith('FECHA DE EXPEDICION')) return false;
      return true;
    })
    .join('\n')
    // Quitar lineas vacías al inicio y al final
    .trim();

  const doc = new PDFDocument({ size: [PW, PH], margin: 0, autoFirstPage: false });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Carta_${(nombre||'DrVidal').replace(/ /g,'_')}.pdf"`);
    res.send(Buffer.concat(chunks));
  });

  doc.font('Helvetica').fontSize(10);
  var lineas = textoLimpio.split('\n');
  var bloques = [];
  lineas.forEach(function(l) {
    if (!l.trim()) {
      bloques.push({ vacio: true, h: 6 });
    } else {
      var h = doc.heightOfString(l, { width: TW, lineGap: 2 });
      bloques.push({ texto: l, h: h + 5 });
    }
  });

  // Paginar en hojas de tamaño FIJO 595x842
  var paginas = [];
  var actual = [];
  var yAcum = BODY_TOP_P1;
  var primera = true;

  bloques.forEach(function(bloque) {
    if (yAcum + bloque.h > BODY_BOT) {
      paginas.push({ bloques: actual, primera: primera });
      actual = [];
      primera = false;
      yAcum = BODY_TOP_PN;
    }
    actual.push(bloque);
    yAcum += bloque.h;
  });
  if (actual.length || !paginas.length) paginas.push({ bloques: actual, primera: primera });

  paginas.forEach(function(pag, pi) {
    var esUltima = pi === paginas.length - 1;
    doc.addPage({ size: [PW, PH], margin: 0 });
    doc.image(hdrPath, 0, 0, { width: PW });
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

    if (esUltima) {
      doc.image(frmPath, 310, PH - FTR_H - FIRMA_H, { width: 170 });
    }
  });

  doc.end();
};
