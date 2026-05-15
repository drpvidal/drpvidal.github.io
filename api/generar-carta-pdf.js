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
    const { fecha, titulo, texto } = req.body;

    const PW = 595;
    const PH = 842;
    const HDR_H = Math.round(PW * 175 / 900);
    const FTR_H = Math.round(PW * 145 / 900);
    const MX = PW * 0.05;
    const TW = PW - MX * 2;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PW, PH]);

    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const assets = path.join(__dirname, '..', 'assets');

    // Header y footer
    const hdrImg = await pdfDoc.embedJpg(fs.readFileSync(path.join(assets, 'header.jpg')));
    const ftrImg = await pdfDoc.embedJpg(fs.readFileSync(path.join(assets, 'footer.jpg')));
    page.drawImage(hdrImg, { x: 0, y: PH - HDR_H, width: PW, height: HDR_H });
    page.drawImage(ftrImg, { x: 0, y: 0, width: PW, height: FTR_H });

    // Firma — se carga ahora, se dibuja despues del texto
    const firmaImg = await pdfDoc.embedPng(fs.readFileSync(path.join(assets, 'firma.png')));
    const FIRMA_W = PW * 0.28;
    const FIRMA_H = FIRMA_W * firmaImg.height / firmaImg.width;

    // Funcion wrap
    function wrap(text, font, size, maxW) {
      const lines = [];
      for (const para of (text || '').split('\n')) {
        if (!para.trim()) { lines.push(''); continue; }
        let cur = '';
        for (const w of para.split(' ')) {
          const test = cur ? cur + ' ' + w : w;
          if (font.widthOfTextAtSize(test, size) <= maxW) { cur = test; }
          else { if (cur) lines.push(cur); cur = w; }
        }
        if (cur) lines.push(cur);
      }
      return lines;
    }

    const FECHA_SIZE = 9;
    const TITULO_SIZE = 11;
    const BODY_SIZE = 10;
    const LINE_H = BODY_SIZE * 1.9;

    // Cursor desde arriba
    let yTop = HDR_H + 35;

    // FECHA — derecha
    const fechaW = fontR.widthOfTextAtSize(fecha || '', FECHA_SIZE);
    page.drawText(fecha || '', {
      x: PW - MX - fechaW,
      y: PH - yTop - FECHA_SIZE,
      size: FECHA_SIZE, font: fontR,
      color: rgb(0.15, 0.15, 0.15),
    });
    yTop += FECHA_SIZE * 1.9 + 22;

    // TITULO — centrado, azul
    const tituloText = (titulo || '').toUpperCase();
    const tituloW = fontB.widthOfTextAtSize(tituloText, TITULO_SIZE);
    page.drawText(tituloText, {
      x: (PW - tituloW) / 2,
      y: PH - yTop - TITULO_SIZE,
      size: TITULO_SIZE, font: fontB,
      color: rgb(0.10, 0.32, 0.47),
    });
    yTop += TITULO_SIZE * 1.9 + 22;

    // CUERPO
    const bodyLines = wrap(texto, fontR, BODY_SIZE, TW);
    bodyLines.forEach((line, i) => {
      if (!line) return;
      page.drawText(line, {
        x: MX,
        y: PH - yTop - (i * LINE_H) - BODY_SIZE,
        size: BODY_SIZE, font: fontR,
        color: rgb(0.07, 0.07, 0.07),
      });
    });

    // Avanzar cursor al final del texto
    yTop += bodyLines.length * LINE_H + 8;

    // FIRMA — pegada justo debajo del texto, alineada a la derecha
    page.drawImage(firmaImg, {
      x: PW - MX - FIRMA_W,
      y: PH - yTop - FIRMA_H,
      width: FIRMA_W,
      height: FIRMA_H,
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="carta-medica.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    res.status(200).end(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Error PDF:', err);
    res.status(500).json({ error: 'Error generando PDF', detail: err.message });
  }
};
