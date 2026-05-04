// api/generar-alta.js
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const b = req.body;
    const templatePath = path.join(__dirname, '..', 'plantilla_alta.docx');
    const templateBuffer = fs.readFileSync(templatePath);
    const docxBuffer = await fillDocx(templateBuffer, {
      fecha: b.fecha || '',
      nombre: b.nombre || '',
      edad: b.edad || '',
      fechaNacimiento: b.fechaNacimiento || '',
      procedimiento: b.procedimiento || '',
      fechaCita: b.fechaCita || '',
    });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const nombreArchivo = `Alta_${(b.nombre||'Paciente').replace(/\s+/g,'_')}.docx`;
    await resend.emails.send({
      from: 'Registro Quirurgico <onboarding@resend.dev>',
      to: ['drpablovidal@gmail.com'],
      subject: `Indicaciones de Alta: ${b.nombre||'Paciente'} - ${b.fecha||''}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2>Indicaciones de Alta — Dr. Pablo Vidal</h2><table cellpadding="7" border="1" style="border-collapse:collapse;width:100%;font-size:13px"><tr><td><b>Paciente</b></td><td>${b.nombre||'-'}</td></tr><tr><td><b>Fecha documento</b></td><td>${b.fecha||'-'}</td></tr><tr><td><b>Edad</b></td><td>${b.edad||'-'} años</td></tr><tr><td><b>Fecha nacimiento</b></td><td>${b.fechaNacimiento||'-'}</td></tr><tr><td><b>Procedimiento</b></td><td>${b.procedimiento||'-'}</td></tr><tr><td><b>Cita de revisión</b></td><td>${b.fechaCita||'-'}</td></tr></table><p style="font-size:11px;color:#bbb">Enviado automáticamente — App Registro Quirúrgico Dr. Pablo Vidal</p></div>`,
      attachments: [{ filename: nombreArchivo, content: docxBuffer.toString('base64') }]
    });
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error generar-alta:', error);
    res.status(500).json({ error: error.message });
  }
};

function fillDocx(buffer, datos) {
  return new Promise((resolve, reject) => {
    try {
      const entries = parseZip(buffer);
      const docEntry = entries.find(e => e.name === 'word/document.xml');
      if (!docEntry) throw new Error('No se encontró word/document.xml');
      let xml = docEntry.data.toString('utf8');
      const bookmarks = {
        fecha: datos.fecha, fecha2: datos.fecha, fecha3: datos.fecha,
        nombre: datos.nombre, nombre2: datos.nombre, nombre3: datos.nombre,
        edad: datos.edad, edad2: datos.edad, edad3: datos.edad,
        fechanacimiento: datos.fechaNacimiento, fechanacimiento2: datos.fechaNacimiento, fechanacimiento3: datos.fechaNacimiento,
        procedimiento_qx1: datos.procedimiento, procedimiento_qx: datos.procedimiento,
        fechaconsulta: datos.fechaCita, fechaconsulta2: datos.fechaCita,
      };
      for (const [name, value] of Object.entries(bookmarks)) {
        xml = replaceBookmark(xml, name, value || '');
      }
      docEntry.data = Buffer.from(xml, 'utf8');
      resolve(buildZip(entries));
    } catch (e) { reject(e); }
  });
}

function escapeXml(val) {
  return String(val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function replaceBookmark(xml, name, value) {
  const val = escapeXml(value);
  let m = xml.match(new RegExp(`<w:bookmarkStart\\s[^>]*w:id="(\\d+)"[^>]*w:name="${name}"[^>]*/>`));
  if (!m) m = xml.match(new RegExp(`<w:bookmarkStart\\s[^>]*w:name="${name}"[^>]*w:id="(\\d+)"[^>]*/>`));
  if (!m) return xml;
  const bid = m[1];
  const startTag = m[0];
  const endTag = `<w:bookmarkEnd w:id="${bid}"/>`;
  const altEndTag = `<w:bookmarkEnd w:id="${bid}" />`;
  let startIdx = xml.indexOf(startTag);
  if (startIdx === -1) return xml;
  startIdx += startTag.length;
  let endIdx = xml.indexOf(endTag, startIdx);
  if (endIdx === -1) endIdx = xml.indexOf(altEndTag, startIdx);
  if (endIdx === -1) return xml;
  const inner = xml.substring(startIdx, endIdx);
  const newInner = inner.replace(/(<w:t(?:\s[^>]*)?>)[^<]*(<\/w:t>)/, `$1${val}$2`);
  const finalInner = newInner === inner ? `<w:r><w:t xml:space="preserve">${val}</w:t></w:r>` : newInner;
  return xml.substring(0, startIdx) + finalInner + xml.substring(endIdx);
}

function parseZip(buffer) {
  const entries = [];
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('Invalid ZIP');
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdSize = buffer.readUInt32LE(eocd + 12);
  let pos = cdOffset;
  while (pos < cdOffset + cdSize) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(pos + 10);
    const compSize = buffer.readUInt32LE(pos + 20);
    const uncompSize = buffer.readUInt32LE(pos + 24);
    const nameLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name = buffer.slice(pos + 46, pos + 46 + nameLen).toString('utf8');
    const lhNameLen = buffer.readUInt16LE(localOffset + 26);
    const lhExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + lhNameLen + lhExtraLen;
    let data;
    if (method === 0) { data = buffer.slice(dataOffset, dataOffset + uncompSize); }
    else if (method === 8) { data = zlib.inflateRawSync(buffer.slice(dataOffset, dataOffset + compSize)); }
    else { data = buffer.slice(dataOffset, dataOffset + compSize); }
    entries.push({ name, method, data });
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function buildZip(entries) {
  const parts = [], cdParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    let compData, method;
    try {
      const deflated = zlib.deflateRawSync(entry.data, { level: 6 });
      compData = deflated.length < entry.data.length ? deflated : entry.data;
      method = deflated.length < entry.data.length ? 8 : 0;
    } catch(e) { compData = entry.data; method = 0; }
    const lh = Buffer.alloc(30 + name.length);
    lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt16LE(0,6);
    lh.writeUInt16LE(method,8); lh.writeUInt16LE(0,10); lh.writeUInt16LE(0,12);
    lh.writeUInt32LE(crc,14); lh.writeUInt32LE(compData.length,18);
    lh.writeUInt32LE(entry.data.length,22); lh.writeUInt16LE(name.length,26);
    lh.writeUInt16LE(0,28); name.copy(lh,30);
    parts.push(lh, compData);
    const cd = Buffer.alloc(46 + name.length);
    cd.writeUInt32LE(0x02014b50,0); cd.writeUInt16LE(20,4); cd.writeUInt16LE(20,6);
    cd.writeUInt16LE(0,8); cd.writeUInt16LE(method,10); cd.writeUInt16LE(0,12);
    cd.writeUInt16LE(0,14); cd.writeUInt32LE(crc,16); cd.writeUInt32LE(compData.length,20);
    cd.writeUInt32LE(entry.data.length,24); cd.writeUInt16LE(name.length,28);
    cd.writeUInt16LE(0,30); cd.writeUInt16LE(0,32); cd.writeUInt16LE(0,34);
    cd.writeUInt16LE(0,36); cd.writeUInt32LE(0,38); cd.writeUInt32LE(offset,42);
    name.copy(cd,46); cdParts.push(cd);
    offset += lh.length + compData.length;
  }
  const cdBuffer = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(0,4); eocd.writeUInt16LE(0,6);
  eocd.writeUInt16LE(entries.length,8); eocd.writeUInt16LE(entries.length,10);
  eocd.writeUInt32LE(cdBuffer.length,12); eocd.writeUInt32LE(offset,16); eocd.writeUInt16LE(0,20);
  return Buffer.concat([...parts, cdBuffer, eocd]);
}

function crc32(buf) {
  if (!crc32.t) { crc32.t = new Uint32Array(256); for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);crc32.t[i]=c;} }
  let crc = 0xFFFFFFFF;
  for (let i=0;i<buf.length;i++) crc=crc32.t[(crc^buf[i])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}
