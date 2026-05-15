const PDFDocument = require('pdfkit');
const path = require('path');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const { nombre, edad, fn, fecha, meds } = req.body;
  const hdrPath = path.join(__dirname, '../assets/header.jpg');
  const ftrPath = path.join(__dirname, '../assets/footer.jpg');
  const frmPath = path.join(__dirname, '../assets/firma.png');
  const pageHeight = Math.max(580, 350 + (meds.length * 55) + 150);
  const doc = new PDFDocument({ size: [595, pageHeight], margin: 0 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receta_${(nombre||'Dr_Vidal').replace(/ /g,'_')}.pdf"`);
    res.send(Buffer.concat(chunks));
  });
  doc.image(hdrPath, 0, 0, { width: 595 });
  doc.font('Helvetica').fontSize(10).fillColor('#111111');
  doc.text('CDMX a ' + (fecha||''), 0, 130, { align: 'center', width: 595 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a5278');
  doc.text('Nombre: ' + (nombre||''), 44, 150);
  doc.font('Helvetica').fontSize(10).fillColor('#111111');
  doc.text('Edad: ' + (edad||'') + ' anos          FN: ' + (fn||''), 44, 164);
  let y = 184;
  (meds||[]).forEach(function(med, i) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a5278');
    doc.text((i+1)+'.- '+med.n, 44, y, {width:507});
    y += doc.heightOfString((i+1)+'.- '+med.n, {width:507}) + 2;
    if (med.i) {
      doc.font('Helvetica').fontSize(10).fillColor('#111111');
      doc.text(med.i, 44, y, {width:507});
      y += doc.heightOfString(med.i, {width:507}) + 2;
    }
    if (med.c) {
      var cant = med.c.replace(/^[(]|[)]$/g,'');
      doc.text('('+cant+')', 44, y, {width:507});
      y += doc.heightOfString('('+cant+')', {width:507}) + 8;
    }
  });
  doc.image(frmPath, 310, pageHeight-180, {width:170});
  doc.image(ftrPath, 0, pageHeight-100, {width:595});
  doc.end();
};