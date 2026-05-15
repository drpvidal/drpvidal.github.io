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
  const FECHA_Y  = 120;
  const TITULO_Y = 138;
  const BODY_TOP = 162;
  const FIRMA_H  = 75;
  const BODY_BOT = media ? PH/2 - FTR_H - FIRMA_H
                         : PH - FTR_H - FIRMA_H;
  const ESPACIO  = BODY_BOT - BODY_TOP;

  var norm = function(s){ return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); };

  // Limpiar texto
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

  // Encontrar font size que haga caber todo en ESPACIO
  function calcAltura(fs, lineGap, lineas){
    var tmp = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
    tmp.addPage();
    var total = 0;
    lineas.forEach(function(l){
      if(!l.trim()){total+=4;return;}
      tmp.font(esBold(l)?'Helvetica-Bold':'Helvetica').fontSize(fs);
      total += tmp.heightOfString(l,{width:TW,lineGap:lineGap}) + 4;
    });
    tmp.end();
    return total;
  }

  // Buscar el font size adecuado (entre 8 y 10)
  var fs = 10, lineGap = 2;
  var altura = calcAltura(fs, lineGap, limpias);
  if(altura > ESPACIO){
    fs = 9; lineGap = 1;
    altura = calcAltura(fs, lineGap, limpias);
    if(altura > ESPACIO){
      fs = 8; lineGap = 1;
    }
  }

  // Si aun no cabe con fs=8, paginar normalmente
  var paginas=[], actual=[], yAcum=BODY_TOP, primera=true;
  var tmp2 = new PDFDocument({size:[PW,PH],margin:0,autoFirstPage:false});
  tmp2.addPage();
  limpias.forEach(function(l){
    var h = !l.trim() ? 4 : (tmp2.font(esBold(l)?'Helvetica-Bold':'Helvetica').fontSize(fs)
      .heightOfString(l,{width:TW,lineGap:lineGap}) + 4);
    if(yAcum+h > BODY_BOT){
      paginas.push({lines:actual,primera:primera});
      actual=[]; primera=false; yAcum=BODY_TOP;
    }
    actual.push({texto:l,h:h});
    yAcum+=h;
  });
  tmp2.end();
  if(actual.length||!paginas.length) paginas.push({lines:actual,primera:primera});

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
    doc.image(hdrPath,0,0,{width:PW});
    doc.image(ftrPath,0,media?PH/2-FTR_H:PH-FTR_H,{width:PW});

    var y = BODY_TOP;
    if(pag.primera){
      doc.font('Helvetica').fontSize(fs).fillColor('#111');
      doc.text('CDMX a '+(fecha||''),MX,FECHA_Y,{align:'right',width:TW});
      doc.font('Helvetica-Bold').fontSize(fs+1).fillColor('#1a5278');
      doc.text(titulo||'',MX,TITULO_Y,{align:'center',width:TW});
    }

    pag.lines.forEach(function(b){
      if(!b.texto.trim()){y+=b.h;return;}
      if(y+b.h>BODY_BOT) return;
      var bold = esBold(b.texto);
      doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(fs).fillColor('#111');
      doc.text(b.texto,MX,y,{width:TW,lineGap:lineGap});
      y+=b.h;
    });

    if(esUltima){
      var firmaY = Math.min(y+10, media?PH/2-FTR_H-FIRMA_H:PH-FTR_H-FIRMA_H);
      doc.image(frmPath,310,firmaY,{width:150});
    }
  });

  doc.end();
};
