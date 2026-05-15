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

  // SIEMPRE carta completa 595x842
  // Media carta = misma hoja pero contenido escalado al 50%
  const PW = 595, PH = 842;
  const media = tamano === 'media';
  const scale = media ? 0.5 : 1;

  const MX = 50, TW = PW - MX * 2;
  const HDR_H = 120;   // altura real del header en carta completa
  const FTR_H = 96;    // altura real del footer en carta completa
  const FS = 10;

  // Para carta: posiciones normales
  // Para media carta: todo en la mitad superior, escalado
  const FECHA_Y  = media ? 60  : 128;
  const TITULO_Y = media ? HDR_H*scale + 4 : HDR_H + 8;
  const BODY_TOP = media ? HDR_H*scale + 20 : HDR_H + 28;
  const FIRMA_W  = media ? 100 : 160;
  const FIRMA_H_IMG = media ? 45 : 75;
  // Limite inferior del cuerpo segun tamano
  const CUERPO_BOT = media ? (PH/2) - FTR_H*scale - FIRMA_H_IMG - 5
                            : PH - FTR_H - FIRMA_H_IMG - 10;

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

  // Detectar negritas
  function esBold(l) {
    var t = norm(l.trim());
    if(!t) return false;
    if(t==='A QUIEN CORRESPONDA:') return true;
    if(t.match(/^(DIAGNOSTICO|RECOMENDACIONES|PERIODO|MOTIVO|OBJETIVO|ESTIMADO COLEGA)/) && t.endsWith(':')) return true;
    if(t.endsWith(':') && t.length < 35) return true;
    return false;
  }

  // Medir bloques
  var docMed = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  docMed.addPage();
  var bloques = [];
  lineasLimpias.forEach(function(l){
    if(!l.trim()){bloques.push({vacio:true,h:media?4:7});return;}
    var bold = esBold(l);
    docMed.font(bold?'Helvetica-Bold':'Helvetica').fontSize(FS*scale);
    var h = docMed.heightOfString(l,{width:TW,lineGap:2});
    bloques.push({texto:l,bold:bold,h:h+(media?3:5)});
  });
  docMed.end();

  // Paginar
  var paginas=[], actual=[], yAcum=BODY_TOP, primera=true;
  bloques.forEach(function(b){
    if(yAcum+b.h>CUERPO_BOT){
      paginas.push({bloques:actual,primera:primera});
      actual=[]; primera=false; yAcum=BODY_TOP;
    }
    actual.push(b); yAcum+=b.h;
  });
  if(actual.length||!paginas.length) paginas.push({bloques:actual,primera:primera});

  // Generar PDF - SIEMPRE 595x842
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
      // Media carta: header y footer escalados, en la mitad superior
      doc.image(hdrPath, 0, 0, {width:PW, height:HDR_H*scale});
      doc.image(ftrPath, 0, PH/2 - FTR_H*scale, {width:PW, height:FTR_H*scale});
      // Linea divisoria opcional
      doc.moveTo(0, PH/2).lineTo(PW, PH/2).strokeColor('#ccc').lineWidth(0.5).stroke();
    } else {
      // Carta completa: header y footer a ancho completo
      doc.image(hdrPath, 0, 0, {width:PW});
      doc.image(ftrPath, 0, PH-FTR_H, {width:PW});
    }

    var y = BODY_TOP;
    if(pag.primera){
      doc.font('Helvetica').fontSize(FS*scale).fillColor('#111');
      doc.text('CDMX a '+(fecha||''), MX, FECHA_Y, {align:'right', width:TW});
      doc.font('Helvetica-Bold').fontSize((media?9:11)*scale).fillColor('#1a5278');
      doc.text(titulo||'', MX, TITULO_Y, {align:'center', width:TW});
      y = BODY_TOP;
    }

    var yFinal = y;
    pag.bloques.forEach(function(b){
      if(b.vacio){yFinal+=b.h;return;}
      if(yFinal+b.h<=CUERPO_BOT){
        doc.font(b.bold?'Helvetica-Bold':'Helvetica').fontSize(FS*scale).fillColor('#111');
        doc.text(b.texto, MX, yFinal, {width:TW, lineGap:2});
      }
      yFinal+=b.h;
    });

    if(esUltima){
      var firmaBot = media ? PH/2 - FTR_H*scale - 5 : PH - FTR_H - 5;
      var firmaY = Math.min(yFinal+8, firmaBot - FIRMA_H_IMG);
      doc.image(frmPath, 310, firmaY, {width:FIRMA_W});
    }
  });

  doc.end();
};
