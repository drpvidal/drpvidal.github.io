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

  // Tamaño carta fijo SIEMPRE - nunca crece
  const PW = 595, PH = 842;
  const MX = 50, TW = PW - MX * 2;
  const FTR_H = 100;
  const HDR_BOT = 128;
  const FIRMA_H = 95;
  const BODY_TOP_P1 = 182;
  const BODY_TOP_PN = HDR_BOT + 18;
  // Limite absoluto del cuerpo - nunca pasar de aqui
  const BODY_BOT = PH - FTR_H - FIRMA_H - 10;

  // Limpiar texto
  var normalize = function(s){ return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); };
  var lineasRaw = (texto||'').split('\n');
  var lineasLimpias = [];
  var cortar = false;
  lineasRaw.forEach(function(l){
    var t = normalize(l.trim());
    if(t==='ATENTAMENTE'||t.startsWith('DR. PABLO')||t.startsWith('DR PABLO')||
       t.startsWith('CIRUJANO GENERAL')||t.startsWith('CEDULA')||
       t.startsWith('CIUDAD DE MEXICO')||t.startsWith('CDMX,')||
       t==='CONSTANCIA DE INCAPACIDAD LABORAL'||t==='JUSTIFICANTE MEDICO ESCOLAR'||
       t==='CARTA DE SALUD'||t==='CARTA DE REFERENCIA MEDICA'||
       t==='CARTA MEDICA PARA VIAJE'||t==='CARTA MEDICA') cortar=true;
    if(!cortar) lineasLimpias.push(l);
  });

  // Crear doc temporal para medir alturas
  var docMed = new PDFDocument({ size:[PW,PH], margin:0, autoFirstPage:false });
  docMed.addPage();
  docMed.font('Helvetica').fontSize(10);

  // Construir bloques con altura real medida
  var bloques = [];
  lineasLimpias.forEach(function(l){
    if(!l.trim()){ bloques.push({vacio:true,h:6}); return; }
    var h = docMed.heightOfString(l, {width:TW, lineGap:3});
    bloques.push({texto:l, h:h+5});
  });
  docMed.end();

  // Distribuir bloques en paginas de tamaño FIJO
  var paginas = [];
  var actual = [];
  var yAcum = BODY_TOP_P1;
  var primera = true;

  bloques.forEach(function(bloque){
    var tope = BODY_BOT;
    if(yAcum + bloque.h > tope){
      paginas.push({bloques:actual, primera:primera});
      actual = [];
      primera = false;
      yAcum = BODY_TOP_PN;
    }
    actual.push(bloque);
    yAcum += bloque.h;
  });
  if(actual.length||!paginas.length) paginas.push({bloques:actual,primera:primera});

  // Generar PDF con paginas de tamaño fijo
  var doc = new PDFDocument({ size:[PW,PH], margin:0, autoFirstPage:false });
  var chunks = [];
  doc.on('data', function(c){ chunks.push(c); });
  doc.on('end', function(){
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',
      'attachment; filename="Carta_'+(nombre||'DrVidal').replace(/ /g,'_')+'.pdf"');
    res.send(Buffer.concat(chunks));
  });

  paginas.forEach(function(pag, pi){
    var esUltima = pi === paginas.length-1;
    // Forzar tamaño fijo en cada pagina
    doc.addPage({size:[PW,PH], margin:0});
    doc.image(hdrPath, 0, 0, {width:PW});
    doc.image(ftrPath, 0, PH-FTR_H, {width:PW});

    var y;
    if(pag.primera){
      doc.font('Helvetica').fontSize(10).fillColor('#111');
      doc.text('CDMX a '+(fecha||''), 180, 130, {align:'right', width:370});
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
      doc.text(titulo||'', MX, HDR_BOT+10, {align:'center', width:TW});
      y = BODY_TOP_P1;
    } else {
      y = BODY_TOP_PN;
    }

    pag.bloques.forEach(function(bloque){
      if(bloque.vacio){ y+=bloque.h; return; }
      // Solo dibujar si cabe en la pagina
      if(y + bloque.h <= BODY_BOT){
        doc.font('Helvetica').fontSize(10).fillColor('#111');
        doc.text(bloque.texto, MX, y, {width:TW, lineGap:3});
      }
      y += bloque.h;
    });

    if(esUltima){
      doc.image(frmPath, 310, PH-FTR_H-FIRMA_H, {width:170});
    }
  });

  doc.end();
};
