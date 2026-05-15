const PDFDocument = require('pdfkit');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, fecha, titulo, texto, tamano } = req.body;
  const hdrPath = path.join(__dirname, '../assets/header.jpg');
  const ftrPath = path.join(__dirname, '../assets/footer.jpg');
  const frmPath = path.join(__dirname, '../assets/firma.png');

  const PW = 595, PH = 842;
  const HDR_H = 116, FTR_H = 96;
  const MX = 50, TW = PW - MX * 2;
  const media = tamano === 'media';
  const FECHA_Y  = 128;
  const TITULO_Y = HDR_H + 12;
  const BODY_TOP = HDR_H + 35;
  const FIRMA_RESERVA = 80;
  const BODY_BOT = media ? (PH/2) - FTR_H - FIRMA_RESERVA
                         : PH - FTR_H - FIRMA_RESERVA;

  var norm = function(s){
    return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  };

  // Limpiar texto
  var lineasRaw = (texto||'').split('\n');
  var lineasLimpias = [];
  var cortar = false;
  lineasRaw.forEach(function(l){
    var t = norm(l.trim());
    if(t==='ATENTAMENTE'||t.startsWith('DR. PABLO')||t.startsWith('DR PABLO')||
       t.startsWith('CIRUJANO GENERAL')||t.startsWith('CEDULA')||
       t.startsWith('CIUDAD DE MEXICO')||t.startsWith('CDMX,')||
       t==='CONSTANCIA DE INCAPACIDAD LABORAL'||t==='JUSTIFICANTE MEDICO ESCOLAR'||
       t==='CARTA DE SALUD'||t==='CARTA DE REFERENCIA MEDICA'||
       t==='CARTA MEDICA PARA VIAJE'||t==='CARTA MEDICA') cortar=true;
    if(!cortar) lineasLimpias.push(l);
  });

  function esBold(l) {
    var t = norm(l.trim());
    if(!t) return false;
    if(t==='A QUIEN CORRESPONDA:') return true;
    if(t.endsWith(':') && t.length < 40) return true;
    return false;
  }

  // Usar doc real para medir — no doc temporal
  // Estrategia: generar con autoFirstPage:false y addPage manual con size fijo
  var doc = new PDFDocument({
    size: [PW, PH],
    margin: 0,
    autoFirstPage: false,
    // CRITICO: deshabilitar el autosize
    bufferPages: true
  });

  var chunks=[];
  doc.on('data',function(c){chunks.push(c);});
  doc.on('end',function(){
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',
      'attachment; filename="Carta_'+(nombre||'DrVidal').replace(/ /g,'_')+'.pdf"');
    res.send(Buffer.concat(chunks));
  });

  // Primera pagina
  doc.addPage({size:[PW,PH], margin:0});
  doc.image(hdrPath, 0, 0, {width:PW});
  doc.image(ftrPath, 0, media ? PH/2-FTR_H : PH-FTR_H, {width:PW});

  // Fecha y titulo
  doc.font('Helvetica').fontSize(10).fillColor('#111');
  doc.text('CDMX a '+(fecha||''), MX, FECHA_Y, {align:'right', width:TW});
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
  doc.text(titulo||'', MX, TITULO_Y, {align:'center', width:TW});

  var y = BODY_TOP;
  var paginaActual = 0;

  lineasLimpias.forEach(function(l){
    if(!l.trim()){
      y += 6;
      return;
    }
    var bold = esBold(l);
    doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(10);
    var h = doc.heightOfString(l, {width:TW, lineGap:2}) + 5;

    // Si no cabe, nueva pagina FIJA
    if(y + h > BODY_BOT){
      paginaActual++;
      doc.addPage({size:[PW,PH], margin:0});
      doc.image(hdrPath, 0, 0, {width:PW});
      doc.image(ftrPath, 0, media ? PH/2-FTR_H : PH-FTR_H, {width:PW});
      y = BODY_TOP;
    }

    doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(10).fillColor('#111');
    doc.text(l, MX, y, {width:TW, lineGap:2});
    y += h;
  });

  // Firma en ultima pagina
  var firmaLimite = media ? PH/2-FTR_H-70 : PH-FTR_H-70;
  var firmaY = Math.min(y+15, firmaLimite);
  doc.image(frmPath, 310, firmaY, {width:155});

  doc.end();
};
