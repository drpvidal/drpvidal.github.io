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
    const HDR_H = Math.round(PW * 175 / 900); // 116
    const FTR_H = Math.round(PW * 145 / 900); // 96
    const MX = PW * 0.08; // margen horizontal ~47px

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

    // Firma anclada encima del footer
    const firmaBytes = fs.readFileSync(path.join(assets, 'firma.png'));
    const firmaImg = await pdfDoc.embedPng(firmaBytes);
    const FIRMA_W = PW * 0.28;
    const FIRMA_H = FIRMA_W * firmaImg.height / firmaImg.width;
    // Firma fija: su borde inferior queda 16px encima del footer
    const FIRMA_Y = FTR_H + 60;
    page.drawImage(firmaImg, {
      x: PW - MX - FIRMA_W,
      y: FIRMA_Y,
      width: FIRMA_W,
      height: FIRMA_H,
    });

    // --- Texto: empieza debajo del header ---
    const TW = PW - MX * 2;
    const BODY_SIZE = 10;
    const LINE_H = BODY_SIZE * 1.7;

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

    // Cursor desde arriba (yTop = distancia desde top de pagina)
    let yTop = HDR_H + 20; // 20px de respiro debajo del header

    // FECHA — derecha
    const FECHA_SIZE = 9;
    const fechaW = fontR.widthOfTextAtSize(fecha || '', FECHA_SIZE);
    page.drawText(fecha || '', {
      x: PW - MX - fechaW,
      y: PH - yTop - FECHA_SIZE,
      size: FECHA_SIZE, font: fontR,
      color: rgb(0.15, 0.15, 0.15),
    });
    yTop += FECHA_SIZE * 1.7 + 14;

    // TITULO — centrado, azul
    const TITULO_SIZE = 11;
    const tituloText = (titulo || '').toUpperCase();
    const tituloW = fontB.widthOfTextAtSize(tituloText, TITULO_SIZE);
    page.drawText(tituloText, {
      x: (PW - tituloW) / 2,
      y: PH - yTop - TITULO_SIZE,
      size: TITULO_SIZE, font: fontB,
      color: rgb(0.10, 0.32, 0.47),
    });
    yTop += TITULO_SIZE * 1.7 + 14;

    // CUERPO
    const bodyLines = wrap(texto, fontR, BODY_SIZE, TW);
    bodyLines.forEach((line, i) => {
      if (!line) return; // linea vacia = salto de parrafo, ya esta en LINE_H
      page.drawText(line, {
        x: MX,
        y: PH - yTop - (i * LINE_H) - BODY_SIZE,
        size: BODY_SIZE, font: fontR,
        color: rgb(0.07, 0.07, 0.07),
      });
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
