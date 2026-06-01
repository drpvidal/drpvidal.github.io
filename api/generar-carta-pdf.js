const PDFDocument = require('pdfkit');
const path = require('path');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { nombre, fecha, titulo, texto, tamano } = req.body;
    const PW = 595, PH = 842;
    const HDR_H = 116, FTR_H = 96;
    const MX = 50, TW = PW - MX * 2;
    const media = tamano === 'media';
    const assetsDir = path.join(process.cwd(), 'assets');
    const hdrPath = path.join(assetsDir, 'header.jpg');
    const ftrPath = path.join(assetsDir, 'footer.jpg');
    const frmPath = path.join(assetsDir, 'firma.png');
    let textoLimpio = (texto || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/Atentamente[^]*$/i, '').replace(/Dr\.\s*Pablo\s*Vidal[^]*$/i, '').trim();
    const pageHeight = media ? Math.floor(PH / 2) : PH;
    const BODY_TOP = HDR_H + 28;
    const FIRMA_H = 70;
    const BODY_BOT = pageHeight - FTR_H - FIRMA_H - 10;
    const doc = new PDFDocument({ size: [PW, pageHeight], autoFirstPage: false, margin: 0 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Carta_${(nombre||'DrVidal').replace(/ /g,'_')}.pdf"`);
      res.send(Buffer.concat(chunks));
    });
    const addPage = (pageTexto, isFirst) => {
      doc.addPage({ size: [PW, pageHeight], margin: 0 });
      doc.image(hdrPath, 0, 0, { width: PW });
      if (isFirst) {
        doc.font('Helvetica').fontSize(10).fillColor('#111111');
        doc.text('Ciudad de México, a ' + (fecha || ''), MX, 102, { align: 'right', width: TW });
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5278');
        doc.text(titulo || '', MX, HDR_H + 8, { align: 'center', width: TW });
      }
      const bodyY = isFirst ? BODY_TOP : HDR_H + 20;
      doc.font('Helvetica').fontSize(10).fillColor('#111111');
      const availH = BODY_BOT - bodyY;
      const words = pageTexto.split(' ');
      let chunk = '';
      let remaining = '';
      for (let i = 0; i < words.length; i++) {
        const test = chunk + (chunk ? ' ' : '') + words[i];
        const h = doc.heightOfString(test, { width: TW, lineGap: 3 });
        if (h > availH && chunk) { remaining = words.slice(i).join(' '); break; }
        chunk = test;
      }
      doc.text(chunk, MX, bodyY, { width: TW, lineGap: 3 });
      const textH = doc.heightOfString(chunk, { width: TW, lineGap: 3 });
      const firmaY = Math.min(bodyY + textH + 20, BODY_BOT);
      doc.image(frmPath, PW - MX - 170, firmaY, { width: 170 });
      doc.image(ftrPath, 0, pageHeight - FTR_H, { width: PW });
      return remaining;
    };
    let restante = addPage(textoLimpio, true);
    let guard = 0;
    while (restante && restante.trim() && guard < 3) { restante = addPage(restante, false); guard++; }
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
