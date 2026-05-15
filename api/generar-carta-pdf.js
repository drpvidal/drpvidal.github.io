const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

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

  // Header: 900x175px -> en 595px de ancho -> alto = 595*175/900 = 115.97px
  // Footer: 900x145px -> en 595px de ancho -> alto = 595*
cat > ~/drpvidal.github.io/api/generar-carta-pdf.js << 'EOF'
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

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

  // Header: 900x175px -> en 595px de ancho -> alto = 595*175/900 = 115.97px
  // Footer: 900x145px -> en 595px de ancho -> alto = 595*145/900 = 95.81px
  const PW = 595, PH = 842;
  const HDR_H = Math.round(595*175/900); // 116
  const FTR_H = Math.round(595*145/900); // 96
  const MX = 50, TW = PW - MX * 2;
  const media = tamano === 'media';

  // Posiciones bien calculadas
  const FECHA_Y  = HDR_H - 14;  // justo dentro del espacio blanco del header
  const TITULO_Y = HDR_H + 8;
  const BODY_TOP = HDR_H + 28;
  const FIRMA_H  = 70;
  const BODY_BOT = media ? Math.floor(PH/2) - FTR_H - FIRMA_H
                         : PH - FTR_H - FIRMA_H;

  var norm = function(s){ return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); };
  var lineas = (texto||'').split('\n');
  var limpias = [];
  var cortar = false;
  lineas.forEach(function(l){
    var t = norm(l.trim());
    if(t==='ATENTAMENTE'||t.startsWith('DR. PABLO')||t.startsWith('DR PABLO')||
       t.startsWith('CIRUJANO GENERAL')||t.startsWith('CEDULA')||
       t.startsWith('CIUDAD DE MEXICO')||t.startsWith('CDMX,')||
       t==='CONSTANCIA DE INCAPACIDAD LABORAL'||t==='JUSTIFICANTE MEDICO ESCOLAR'||
       t==='CARTA DE SALUD'||t==='CARTA DE REFERENCIA MEDICA'||
       t==='CARTA MEDICA PARA VIAJE'||t==='CARTA MEDICA') cortar=true;
    if(!cortar) limpias.push(l);
  });

  function esBold(l){
    var t = norm(l.trim());
    if(!t) return false;
    if(t==='A QUIEN CORRESPONDA:') return true;
    if(t.endsWith(':') && t.length < 40) return true;
    return false;
  }

  // Medir altura total del texto
  var docMed = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  docMed.addPage();
  var alturaTotal = 0;
  var bloquesMed = [];
  limpias.forEach(function(l){
    if(!l.trim()){alturaTotal+=5;bloquesMed.push({vacio:true,h:5});return;}
    var bold=esBold(l);
    docMed.font(bold?'Helvetica-Bold':'Helvetica').fontSize(10);
    var h=docMed.heightOfString(l,{width:TW,lineGap:2})+5;
    alturaTotal+=h;
    bloquesMed.push({texto:l,bold:bold,h:h});
  });
  docMed.end();

  var espacio = BODY_BOT - BODY_TOP;

  // Si no cabe, paginar en segunda hoja
  var paginas=[], actual=[], yAcum=BODY_TOP, primera=true;
  bloquesMed.forEach(function(b){
    if(yAcum+b.h > BODY_BOT){
      paginas.push({bloques:actual,primera:primera});
      actual=[]; primera=false; yAcum=BODY_TOP;
    }
    actual.push(b); yAcum+=b.h;
  });
  if(actual.length||!paginas.length) paginas.push({bloques:actual,primera:primera});

  // PDF con tamaño FIJO - usar opciones de pdfkit para deshabilitar autosize
  var doc = new PDFDocument({
    size:[PW,PH],
    margin:0,
    autoFirstPage:false,
    bufferPages:true,
    compress:false
  });
  var chunks=[];
  doc.on('data',function(c){chunks.push(c);});
  doc.on('end',function(){
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',
      'attachment; filename="Carta_'+(nombre||'DrVidal').replace(/ /g,'_')+'.pdf"');
    res.send(Buffer.concat(chunks));
  });

  paginas.forEach(function(pag,pi){
    var esUltima=pi===paginas.length-1;
    // addPage con size explícito fuerza tamaño fijo
    doc.addPage({size:[PW,PH],margin:0,layout:'portrait'});

    // Dibujar header a altura exacta calculada
    doc.image(hdrPath,0,0,{width:PW,height:HDR_H});
    // Footer pegado al fondo fijo
    doc.image(ftrPath,0,media?Math.floor(PH/2)-FTR_H:PH-FTR_H,{width:PW,height:FTR_H});

    var y=BODY_TOP;
    if(pag.primera){
      doc.font('Helvetica').fontSize(10).fillColor('#111');
      doc.text('CDMX a '+(fecha||''),MX,FECHA_Y,{align:'right',width:TW});
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
      doc.text(titulo||'',MX,TITULO_Y,{align:'center',width:TW});
    }

    var yF=y;
    pag.bloques.forEach(function(b){
      if(b.vacio){yF+=b.h;return;}
      if(yF+b.h>BODY_BOT) return;
      doc.font(b.bold?'Helvetica-Bold':'Helvetica').fontSize(10).fillColor('#111');
      doc.text(b.texto,MX,yF,{width:TW,lineGap:2});
      yF+=b.h;
    });

    if(esUltima){
      var firmaMax=media?Math.floor(PH/2)-FTR_H-5:PH-FTR_H-5;
      var firmaY=Math.min(yF+10,firmaMax-FIRMA_H);
      doc.image(frmPath,310,firmaY,{width:150});
    }
  });

  doc.flushPages();
  doc.end();
};
