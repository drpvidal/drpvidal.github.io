const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, edad, fn, fecha, medNombre, medInd, medCant } = req.body;

  const hdrPath = path.join(__dirname, '../assets/header.jpg');
  const ftrPath = path.join(__dirname, '../assets/footer.jpg');
  const frmPath = path.join(__dirname, '../assets/firma.png');

  const doc = new PDFDocument({ size: [595, 495], margin: 0 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => {
    const pdf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receta_${(nombre||'Dr_Vidal').replace(/ /g,'_')}.pdf"`);
    res.send(pdf);
  });

  // Header
  doc.image(hdrPath, 0, 0, { width: 595 });

  // Fecha centrada
  doc.font('Helvetica').fontSize(10).fillColor('#111111');
  doc.text('CDMX a ' + (fecha || ''), 0, 130, { align: 'center', width: 595 });

  // Nombre azul bold
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a5278');
  doc.text('Nombre: ' + (nombre || ''), 44, 150);

  // Edad normal
  doc.font('Helvetica').fontSize(10).fillColor('#111111');
  doc.text('Edad: ' + (edad || '') + ' años          FN: ' + (fn || ''), 44, 164);

  // Medicamento
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a5278');
  doc.text('1.- ' + (medNombre || ''), 44, 184);

  let y = 198;
  if (medInd) {
    doc.font('Helvetica').fontSize(10).fillColor('#111111');
    const lines = doc.heightOfString(medInd, { width: 507 });
    doc.text(medInd, 44, y, { width: 507 });
    y += lines + 4;
  }
  if (medCant) {
    doc.font('Helvetica').fontSize(10).fillColor('#111111');
    doc.text('(' + medCant.replace(/^\(|\)$/g, '') + ')', 44, y);
    y += 14;
  }

  // Firma
  doc.image(frmPath, 310, 330, { width: 170 });

  // Footer
  doc.image(ftrPath, 0, 418, { width: 595 });

  doc.end();
};
