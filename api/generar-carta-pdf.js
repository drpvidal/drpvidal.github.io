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
  const TITULO_Y = HDR_H + 10;
  const BODY_TOP = HDR_H + 32;
  const BODY_BOT = media ? (PH/2) - FTR_H - 80 : PH - FTR_H - 85;

  var norm = function(s){ return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); };

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

  // Detectar si toda la linea va en negrita
  function esBold(l) {
    var t = norm(l.trim());
    if(!t) return false;
    if(t==='A QUIEN CORRESPONDA:') return true;
    if(t.endsWith(':') && t.length < 40) return true;
    return false;
  }

  // Parsear segmentos bold/normal dentro de una linea
  // Marca con ** las partes que deben ir en negrita
  function marcarNegritas(l) {
    // Nombre del paciente (palabras en mayusculas despues de "paciente")
    l = l.replace(/(paciente\s+)([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ ]{3,})/g, '$1**$2**');
    // Edad
    l = l.replace(/(\bde\s+)(\d+)\s+(a[ñn]os?\s+de\s+edad)/gi, '$1**$2** $3');
    // Fecha de nacimiento
    l = l.replace(/(fecha\s+de\s+nacimiento\s+)(\d{1,2}\s+de\s+\w+\s+de\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/gi, '$1**$2**');
    // Dias de incapacidad
    l = l.replace(/(se\s+otorga[n]?\s+)(\d+\s+(?:\(\w+\)\s+)?d[ií]as?[^,.]*)/gi, '$1**$2**');
    return l;
  }

  // Construir segmentos de una linea con bold/normal
  function parsearLinea(l) {
    var marcada = marcarNegritas(l);
    var partes = marcada.split(/\*\*([^*]+)\*\*/g);
    return partes.map(function(s,i){ return {t:s, b:i%2===1}; }).filter(function(s){ return s.t; });
  }

  // Medir bloques
  var tmp = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  tmp.addPage();
  var bloques = [];
  lineasLimpias.forEach(function(l){
    if(!l.trim()){bloques.push({vacio:true,h:7});return;}
    var boldLinea = esBold(l);
    tmp.font(boldLinea?'Helvetica-Bold':'Helvetica').fontSize(10);
    var h = tmp.heightOfString(l,{width:TW,lineGap:3});
    var segs = boldLinea ? [{t:l,b:true}] : parsearLinea(l);
    bloques.push({segs:segs, plain:l, boldLinea:boldLinea, h:h+6});
  });
  tmp.end();

  // Paginar
  var paginas=[], actual=[], yAcum=BODY_TOP, primera=true;
  bloques.forEach(function(b){
    if(yAcum+b.h > BODY_BOT){
      paginas.push({bloques:actual,primera:primera});
      actual=[]; primera=false; yAcum=BODY_TOP;
    }
    actual.push(b); yAcum+=b.h;
  });
  if(actual.length||!paginas.length) paginas.push({bloques:actual,primera:primera});

  // PDF
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
    doc.image(hdrPath, 0, 0, {width:PW});
    doc.image(ftrPath, 0, media ? PH/2-FTR_H : PH-FTR_H, {width:PW});

    var yFinal = BODY_TOP;
    if(pag.primera){
      doc.font('Helvetica').fontSize(10).fillColor('#111');
      doc.text('CDMX a '+(fecha||''), MX, FECHA_Y, {align:'right', width:TW});
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
      doc.text(titulo||'', MX, TITULO_Y, {align:'center', width:TW});
    }

    pag.bloques.forEach(function(b){
      if(b.vacio){yFinal+=b.h;return;}
      if(yFinal+b.h > BODY_BOT) return;
      if(b.segs.length===1){
        doc.font(b.segs[0].b?'Helvetica-Bold':'Helvetica').fontSize(10).fillColor('#111');
        doc.text(b.segs[0].t, MX, yFinal, {width:TW, lineGap:3});
      } else {
        var last = b.segs.length-1;
        b.segs.forEach(function(seg,si){
          doc.font(seg.b?'Helvetica-Bold':'Helvetica').fontSize(10).fillColor('#111');
          doc.text(seg.t,
            si===0 ? MX : undefined,
            si===0 ? yFinal : undefined,
            {width:TW, lineGap:3, continued: si<last}
          );
        });
      }
      yFinal+=b.h;
    });

    if(esUltima){
      var firmaLimite = media ? PH/2-FTR_H-75 : PH-FTR_H-75;
      var firmaY = Math.min(yFinal+15, firmaLimite);
      doc.image(frmPath, 310, firmaY, {width:160});
    }
  });

  doc.end();
};
