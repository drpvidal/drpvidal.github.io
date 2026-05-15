const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { nombre, fecha, titulo, texto, tamano } = req.body;

    const PW = 595;
    const PH = tamano === 'media' ? 421 : 842;
    const HDR_H = Math.round(595 * 175 / 900);
    const FTR_H = Math.round(595 * 145 / 900);
    const MX = 50;
    const FIRMA_H = 70;
    const BODY_BOT = PH - FTR_H - FIRMA_H;
    const TW = PW - MX * 2;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PW, PH]);

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const assetsDir = path.join(__dirname, '..', 'assets');
    const hdrImg = await pdfDoc.embedJpg(fs.readFileSync(path.join(assetsDir, 'header.jpg')));
    const ftrImg = await pdfDoc.embedJpg(fs.readFileSync(path.join(assetsDir, 'footer.jpg')));

    page.drawImage(hdrImg, { x: 0, y: PH - HDR_H, width: PW, height: HDR_H });
    page.drawImage(ftrImg, { x: 0, y: 0, width: PW, height: FTR_H });

    page.drawText(fecha || '', {
      x: MX, y: PH - HDR_H + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2)
    });

    const tituloText = (titulo || '').toUpperCase();
    const tituloSize = 11;
    const tituloW = fontBold.widthOfTextAtSize(tituloText, tituloSize);
    page.drawText(tituloText, {
      x: (PW - tituloW) / 2, y: PH - HDR_H - tituloSize - 6,
      size: tituloSize, font: fontBold, color: rgb(0, 0, 0)
    });

    const nombreSize = 10;
    const NOMBRE_Y = PH - HDR_H - tituloSize - 6 - nombreSize - 8;
    page.drawText('Paciente: ' + (nombre || ''), {
      x: MX, y: NOMBRE_Y, size: nombreSize, font: fontRegular, color: rgb(0.1, 0.1, 0.1)
    });

    const REAL_BODY_TOP_PX = PH - NOMBRE_Y + nombreSize + 8;
    const REAL_BODY_H = BODY_BOT - (PH - NOMBRE_Y + nombreSize + 8);

    function wrapText(text, font, size, maxWidth) {
      const lines = [];
      for (const para of text.split('\n')) {
        if (!para.trim()) { lines.push(''); continue; }
        let current = '';
        for (const word of para.split(' ')) {
          const test = current ? current + ' ' + word : word;
          if (font.widthOfTextAtSize(test, size) <= maxWidth) { current = test; }
          else { if (current) lines.push(current); current = word; }
        }
        if (current) lines.push(current);
      }
      return lines;
    }

    const LINE_GAP = 4;
    let bodySize = 11;
    let lines = [];
    while (bodySize >= 9) {
      lines = wrapText(texto || '', fontRegular, bodySize, TW);
      if (lines.length * (bodySize + LINE_GAP) <= REAL_BODY_H) break;
      bodySize -= 0.5;
    }
    if (bodySize < 9) {
      bodySize = 9;
      lines = wrapText(texto || '', fontRegular, bodySize, TW);
      const maxLines = Math.floor(REAL_BODY_H / (bodySize + LINE_GAP));
      if (lines.length > maxLines) lines = lines.slice(0, maxLines);
    }

    const BODY_START_Y = NOMBRE_Y - nombreSize - 8;
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: MX, y: BODY_START_Y - i * (bodySize + LINE_GAP),
        size: bodySize, font: fontRegular, color: rgb(0.05, 0.05, 0.05)
      });
    });

    const firmaLines = [
      'Dr. Pablo Vidal González',
      'Cirujano General y Gastrointestinal',
      'Cédula Profesional: 3629683  |  Especialidad: 5328117',
    ];
    const firmaSize = 9;
    const FIRMA_TOP_Y = FTR_H + FIRMA_H - 10;
    firmaLines.forEach((fl, i) => {
      const fw = (i === 0 ? fontBold : fontRegular).widthOfTextAtSize(fl, firmaSize);
      page.drawText(fl, {
        x: (PW - fw) / 2,
        y: FIRMA_TOP_Y - i * (firmaSize + 3),
        size: firmaSize,
        font: i === 0 ? fontBold : fontRegular,
        color: rgb(0.1, 0.1, 0.1)
      });
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="carta-medica.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    res.status(200).end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: 'Error generando PDF', detail: err.message });
  }
};
