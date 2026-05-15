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
    const { fecha, titulo, texto, tamano } = req.body;

    // Dimensiones fijas
    const PW = 595;
    const PH = tamano === 'media' ? 421 : 842;
    const HDR_H = Math.round(PW * 175 / 900); // 116
    const FTR_H = Math.round(PW * 145 / 900); // 96
    const MX = PW * 0.08;  // 8% margen igual que el CSS (padding:4% 8%)
    const TW = PW - MX * 2;

    // Crear doc con pagina de tamano fijo
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PW, PH]);

    const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const assets = path.join(__dirname, '..', 'assets');

    // Header
    const hdrImg = await pdfDoc.embedJpg(fs.readFileSync(path.join(assets, 'header.jpg')));
    page.drawImage(hdrImg, { x: 0, y: PH - HDR_H, width: PW, height: HDR_H });

    // Footer
    const ftrImg = await pdfDoc.embedJpg(fs.readFileSync(path.join(assets, 'footer.jpg')));
    page.drawImage(ftrImg, { x: 0, y: 0, width: PW, height: FTR_H });

    // Firma (PNG con transparencia)
    const firmaBytes = fs.readFileSync(path.join(assets, 'firma.png'));
    const firmaImg = await pdfDoc.embedPng(firmaBytes);
    // 28% del ancho total, alineada a la derecha con margen derecho igual a MX
    const FIRMA_W = PW * 0.28;
    const FIRMA_H = FIRMA_W * firmaImg.height / firmaImg.width;

    // Area de texto disponible entre header y footer
    const AREA_TOP = HDR_H + 8;           // donde empieza el contenido
    const AREA_BOT = PH - FTR_H - 8;     // donde termina (encima del footer)
    const AREA_H = AREA_BOT - AREA_TOP;

    // Tamanio de fuentes base
    const FECHA_SIZE  = 9;
    const TITULO_SIZE = 10;
    const BODY_SIZE_START = 10;
    const LINE_H_FACTOR = 1.6; // equivale a line-height:1.7 del CSS

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

    // Calcular layout completo con un body size dado
    // Retorna null si no cabe, o el layout si cabe
    function tryLayout(bodySize) {
      const fechaH  = FECHA_SIZE * LINE_H_FACTOR;
      const tituloH = TITULO_SIZE * LINE_H_FACTOR;
      const gap     = 6; // espacio entre bloques
      const firmaAreaH = FIRMA_H + gap;

      const bodyLines = wrap(texto, fontR, bodySize, TW);
      const bodyH = bodyLines.length * bodySize * LINE_H_FACTOR;

      const totalH = fechaH + gap + tituloH + gap + bodyH + gap + firmaAreaH;

      if (totalH > AREA_H) return null;
      return { bodyLines, bodySize, fechaH, tituloH, gap, firmaAreaH, bodyH };
    }

    // Intentar desde 10pt bajando a 9pt en pasos de 0.5
    let layout = null;
    for (let s = BODY_SIZE_START; s >= 9; s -= 0.5) {
      layout = tryLayout(s);
      if (layout) break;
    }
    // Safety net: forzar 9pt y truncar
    if (!layout) {
      const bodySize = 9;
      const fechaH  = FECHA_SIZE * LINE_H_FACTOR;
      const tituloH = TITULO_SIZE * LINE_H_FACTOR;
      const gap = 6;
      const firmaAreaH = FIRMA_H + gap;
      const availForBody = AREA_H - fechaH - tituloH - firmaAreaH - gap * 3;
      const maxLines = Math.floor(availForBody / (bodySize * LINE_H_FACTOR));
      let bodyLines = wrap(texto, fontR, bodySize, TW);
      if (bodyLines.length > maxLines) bodyLines = bodyLines.slice(0, maxLines);
      layout = { bodyLines, bodySize, fechaH, tituloH, gap, firmaAreaH };
    }

    // --- Dibujar desde arriba hacia abajo ---
    // pdf-lib: y=0 es abajo, y=PH es arriba
    // Convertir: yPDF = PH - yDesdeArriba

    let cursor = AREA_TOP; // cursor en coordenadas "desde arriba"

    // FECHA — alineada a la derecha
    const fechaText = fecha || '';
    const fechaW = fontR.widthOfTextAtSize(fechaText, FECHA_SIZE);
    page.drawText(fechaText, {
      x: PW - MX - fechaW,
      y: PH - cursor - FECHA_SIZE,
      size: FECHA_SIZE,
      font: fontR,
      color: rgb(0.15, 0.15, 0.15),
    });
    cursor += layout.fechaH + layout.gap;

    // TITULO — centrado, azul oscuro
    const tituloText = (titulo || '').toUpperCase();
    const tituloW = fontB.widthOfTextAtSize(tituloText, TITULO_SIZE);
    page.drawText(tituloText, {
      x: (PW - tituloW) / 2,
      y: PH - cursor - TITULO_SIZE,
      size: TITULO_SIZE,
      font: fontB,
      color: rgb(0.10, 0.32, 0.47), // #1a5278
    });
    cursor += layout.tituloH + layout.gap;

    // CUERPO
    for (let i = 0; i < layout.bodyLines.length; i++) {
      const line = layout.bodyLines[i];
      if (line) {
        page.drawText(line, {
          x: MX,
          y: PH - cursor - (i + 1) * layout.bodySize * LINE_H_FACTOR + layout.bodySize * LINE_H_FACTOR - layout.bodySize,
          size: layout.bodySize,
          font: fontR,
          color: rgb(0.07, 0.07, 0.07),
        });
      }
    }
    cursor += layout.bodyLines.length * layout.bodySize * LINE_H_FACTOR + layout.gap;

    // FIRMA — alineada a la derecha
    page.drawImage(firmaImg, {
      x: PW - MX - FIRMA_W,
      y: PH - cursor - FIRMA_H,
      width: FIRMA_W,
      height: FIRMA_H,
    });

    // Serializar
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
