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

  const media = tamano === 'media';
  const PW = 595;
  const PH = media ? 421 : 842;
  const MX = 50, TW = PW - MX * 2;

  // Header y footer proporcionales
  const HDR_H = media ? 60 : 120;
  const FTR_H = media ? 48 : 96;
  const FS = media ? 9 : 10;

  // Posiciones
  const FECHA_Y = media ? 46 : 128;
  const TITULO_Y = media ? HDR_H + 4 : HDR_H + 8;
  const BODY_TOP = media ? HDR_H + 22 : HDR_H + 28;
  const FIRMA_H_IMG = media ? 50 : 80;
  const FIRMA_W = media ? 120 : 160;
  const BODY_BOT = PH - FTR_H - FIRMA_H_IMG - 8;

  // Limpiar texto
  var norm = function(s){ return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); };
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

  // Detectar si una linea debe ir en negrita
  function esBold(l) {
    var t = norm(l.trim());
    if(t==='') return false;
    if(t.endsWith(':') && t.length < 40) return true;
    if(t==='A QUIEN CORRESPONDA:') return true;
    return false;
  }

  // Medir y construir bloques
  var docMed = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  docMed.addPage();
  var bloques = [];
  lineasLimpias.forEach(function(l){
    if(!l.trim()){bloques.push({vacio:true,h:media?4:6});return;}
    var bold = esBold(l);
    docMed.font(bold?'Helvetica-Bold':'Helvetica').fontSize(FS);
    var h = docMed.heightOfString(l,{width:TW,lineGap:2});
    bloques.push({texto:l,bold:bold,h:h+(media?3:5)});
  });
  docMed.end();

  // Paginar
  var paginas=[], actual=[], yAcum=BODY_TOP, primera=true;
  bloques.forEach(function(b){
    if(yAcum+b.h>BODY_BOT){
      paginas.push({bloques:actual,primera:primera});
      actual=[]; primera=false; yAcum=BODY_TOP;
    }
    actual.push(b); yAcum+=b.h;
  });
  if(actual.length||!paginas.length) paginas.push({bloques:actual,primera:primera});

  // Generar PDF
  var doc = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  var chunks=[];
  doc.on('data',function(c){chunks.push(c);});
  doc.on('end',function(){
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',
      'attachment; filename="Carta_'+(nombre||'DrVidal').replace(/ /g,'_')+'.pdf"');
    res.send(Buffer.concat(chunks));
  });

  paginas.forEach(function(pag,pi){
    var esUltima = pi===paginas.length-1;
    doc.addPage({size:[PW,PH],margin:0});

    // Header y footer proporcionales al tamaño
    doc.image(hdrPath, 0, 0, {width:PW, height:HDR_H});
    doc.image(ftrPath, 0, PH-FTR_H, {width:PW, height:FTR_H});

    var y = BODY_TOP;
    if(pag.primera){
      // Fecha alineada a la derecha, sin tocar el header
      doc.font('Helvetica').fontSize(FS).fillColor('#111');
      doc.text('CDMX a '+(fecha||''), MX, FECHA_Y, {align:'right', width:TW});
      // Titulo centrado
      doc.font('Helvetica-Bold').fontSize(media?9:11).fillColor('#1a5278');
      doc.text(titulo||'', MX, TITULO_Y, {align:'center', width:TW});
      y = BODY_TOP;
    }

    var yFinal = y;
    pag.bloques.forEach(function(b){
      if(b.vacio){yFinal+=b.h;return;}
      if(yFinal+b.h<=BODY_BOT){
        doc.font(b.bold?'Helvetica-Bold':'Helvetica').fontSize(FS).fillColor('#111');
        doc.text(b.texto, MX, yFinal, {width:TW, lineGap:2});
      }
      yFinal+=b.h;
    });

    if(esUltima){
      var firmaY = Math.min(yFinal+10, PH-FTR_H-FIRMA_H_IMG-5);
      doc.image(frmPath, 310, firmaY, {width:FIRMA_W});
    }
  });

  doc.end();
};
