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

  // Dimensiones exactas calculadas
  // header 900x175 -> width 595 -> height = 595*175/900 = 115.8 ~ 116
  // footer 900x145 -> width 595 -> height = 595*145/900 = 95.9 ~ 96
  const PW = 595, PH = 842;
  const HDR_H = 116;
  const FTR_H = 96;
  const MX = 50, TW = PW - MX * 2;
  const media = tamano === 'media';

  // Carta completa: cuerpo entre header y footer
  // Media carta: misma hoja, todo en mitad superior
  const FECHA_Y   = 130;
  const TITULO_Y  = HDR_H + 12;
  const BODY_TOP  = HDR_H + 34;
  const BODY_BOT  = media ? (PH/2) - FTR_H - 80
                           : PH - FTR_H - 85;

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

  // Negritas
  function esBold(l) {
    var t = norm(l.trim());
    if(!t) return false;
    if(t==='A QUIEN CORRESPONDA:') return true;
    if(t.endsWith(':') && t.length < 40) return true;
    return false;
  }

  // Medir bloques
  var tmp = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  tmp.addPage();
  var bloques = [];
  lineasLimpias.forEach(function(l){
    if(!l.trim()){bloques.push({vacio:true,h:7});return;}
    var bold = esBold(l);
    tmp.font(bold?'Helvetica-Bold':'Helvetica').fontSize(10);
    var h = tmp.heightOfString(l,{width:TW,lineGap:3});
    bloques.push({texto:l,bold:bold,h:h+6});
  });
  tmp.end();

  // Paginar — NUNCA pasa de BODY_BOT
  var paginas=[], actual=[], yAcum=BODY_TOP, primera=true;
  bloques.forEach(function(b){
    if(yAcum+b.h > BODY_BOT){
      paginas.push({bloques:actual,primera:primera});
      actual=[]; primera=false; yAcum=BODY_TOP;
    }
    actual.push(b); yAcum+=b.h;
  });
  if(actual.length||!paginas.length) paginas.push({bloques:actual,primera:primera});

  // PDF — siempre 595x842
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

    if(media){
      // Media carta: header y footer en mitad superior
      doc.image(hdrPath, 0, 0, {width:PW});
      doc.image(ftrPath, 0, PH/2-FTR_H, {width:PW});
    } else {
      // Carta completa
      doc.image(hdrPath, 0, 0, {width:PW});
      doc.image(ftrPath, 0, PH-FTR_H, {width:PW});
    }

    var y = BODY_TOP;
    if(pag.primera){
      // Fecha en su lugar correcto, a la derecha, BAJO el header
      doc.font('Helvetica').fontSize(10).fillColor('#111');
      doc.text('CDMX a '+(fecha||''), MX, FECHA_Y, {align:'right', width:TW});
      // Titulo centrado
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
      doc.text(titulo||'', MX, TITULO_Y, {align:'center', width:TW});
      y = BODY_TOP;
    }

    var yFinal = y;
    pag.bloques.forEach(function(b){
      if(b.vacio){yFinal+=b.h;return;}
      if(yFinal+b.h <= BODY_BOT){
        doc.font(b.bold?'Helvetica-Bold':'Helvetica').fontSize(10).fillColor('#111');
        doc.text(b.texto, MX, yFinal, {width:TW, lineGap:3});
      }
      yFinal+=b.h;
    });

    // Firma pegada al texto pero nunca encima del footer
    if(esUltima){
      var firmaLimite = media ? PH/2-FTR_H-80 : PH-FTR_H-80;
      var firmaY = Math.min(yFinal+15, firmaLimite);
      doc.image(frmPath, 310, firmaY, {width:160});
    }
  });

  doc.end();
};
