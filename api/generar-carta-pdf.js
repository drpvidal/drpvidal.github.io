const htmlPdf = require('html-pdf-node');
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, fecha, titulo, texto, tamano } = req.body;
  const media = tamano === 'media';

  // Assets como base64
  const assetsDir = path.join(__dirname, '../assets');
  const hdrB64 = fs.readFileSync(path.join(assetsDir,'header.jpg')).toString('base64');
  const ftrB64 = fs.readFileSync(path.join(assetsDir,'footer.jpg')).toString('base64');
  const frmB64 = fs.readFileSync(path.join(assetsDir,'firma.png')).toString('base64');

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

  function esBold(l){
    var t = norm(l.trim());
    if(!t) return false;
    if(t==='A QUIEN CORRESPONDA:') return true;
    if(t.endsWith(':') && t.length < 40) return true;
    return false;
  }

  // Construir HTML del cuerpo
  var cuerpoHtml = lineasLimpias.map(function(l){
    if(!l.trim()) return '<div style="height:6px"></div>';
    if(esBold(l)) return '<p style="font-weight:bold;margin:0 0 4px 0">'+l+'</p>';
    return '<p style="margin:0 0 6px 0">'+l+'</p>';
  }).join('');

  var html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10pt;
    color: #111;
    width: 595px;
  }
  .header { width: 595px; display: block; }
  .footer { width: 595px; display: block; }
  .fecha {
    text-align: right;
    padding: 6px 50px 0 50px;
    font-size: 10pt;
  }
  .titulo {
    text-align: center;
    padding: 4px 50px;
    font-size: 11pt;
    font-weight: bold;
    color: #1a5278;
  }
  .cuerpo {
    padding: ${media ? '4px 50px' : '8px 50px'};
    font-size: 10pt;
    line-height: 1.5;
  }
  .firma-area {
    text-align: right;
    padding: 10px 50px 0 50px;
  }
  .firma { width: ${media ? '110px' : '155px'}; }
  p { margin-bottom: 6px; }
</style>
</head>
<body>
<img class="header" src="data:image/jpeg;base64,${hdrB64}"/>
<div class="fecha">CDMX a ${fecha||''}</div>
<div class="titulo">${titulo||''}</div>
<div class="cuerpo">${cuerpoHtml}</div>
<div class="firma-area">
  <img class="firma" src="data:image/png;base64,${frmB64}"/>
</div>
<img class="footer" src="data:image/jpeg;base64,${ftrB64}"/>
</body>
</html>`;

  try {
    const file = { content: html };
    const options = {
      format: media ? undefined : 'Letter',
      width: media ? '595px' : undefined,
      height: media ? '421px' : undefined,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Carta_${(nombre||'DrVidal').replace(/ /g,'_')}.pdf"`);
    res.send(pdfBuffer);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
