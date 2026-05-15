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

  const PW = 595;
  // Media carta o carta completa - SIEMPRE FIJO
  const PH = (tamano === 'media') ? 421 : 842;
  const MX = 50, TW = PW - MX * 2;
  const FTR_H = (tamano === 'media') ? 50 : 100;
  const HDR_BOT = (tamano === 'media') ? 64 : 128;
  const BODY_TOP = (tamano === 'media') ? 90 : 182;
  const FIRMA_MIN_GAP = 20;
  const FIRMA_W = 170;
  const FIRMA_H_IMG = 60;
  // Limite del cuerpo: deja espacio para firma + footer
  const BODY_BOT = PH - FTR_H - FIRMA_H_IMG - FIRMA_MIN_GAP - 5;

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

  // Medir alturas
  var docMed = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  docMed.addPage();
  var fs10 = (tamano==='media') ? 9 : 10;
  docMed.font('Helvetica').fontSize(fs10);
  var bloques = [];
  lineasLimpias.forEach(function(l){
    if(!l.trim()){bloques.push({vacio:true,h:5});return;}
    var h = docMed.heightOfString(l,{width:TW,lineGap:2});
    bloques.push({texto:l,h:h+4});
  });
  docMed.end();

  // Paginar en hojas FIJAS
  var paginas=[], actual=[], yAcum=BODY_TOP, primera=true;
  bloques.forEach(function(bloque){
    if(yAcum+bloque.h > BODY_BOT){
      paginas.push({bloques:actual,primera:primera});
      actual=[]; primera=false; yAcum=BODY_TOP;
    }
    actual.push(bloque);
    yAcum+=bloque.h;
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

    // Header escalado
    doc.image(hdrPath,0,0,{width:PW,height:HDR_BOT});
    // Footer siempre al fondo fijo
    doc.image(ftrPath,0,PH-FTR_H,{width:PW,height:FTR_H});

    var y = BODY_TOP;
    if(pag.primera){
      doc.font('Helvetica').fontSize(fs10).fillColor('#111');
      var fechaY = (tamano==='media') ? 52 : 130;
      doc.text('CDMX a '+(fecha||''), 180, fechaY,{align:'right',width:370});
      doc.font('Helvetica-Bold').fontSize(tamano==='media'?9:11).fillColor('#1a5278');
      doc.text(titulo||'', MX, HDR_BOT+8,{align:'center',width:TW});
      y = BODY_TOP;
    }

    var yFinal = y;
    pag.bloques.forEach(function(bloque){
      if(bloque.vacio){yFinal+=bloque.h;return;}
      if(yFinal+bloque.h<=BODY_BOT){
        doc.font('Helvetica').fontSize(fs10).fillColor('#111');
        doc.text(bloque.texto,MX,yFinal,{width:TW,lineGap:2});
      }
      yFinal+=bloque.h;
    });

    // Firma pegada al texto, nunca fuera de la pagina
    if(esUltima){
      var firmaY = Math.min(yFinal+10, PH-FTR_H-FIRMA_H_IMG-5);
      doc.image(frmPath,310,firmaY,{width:FIRMA_W});
    }
  });

  doc.end();
};
