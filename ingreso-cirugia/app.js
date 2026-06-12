const HOSPITALS = [
  {
    name: "Centro Médico ABC Observatorio",
    address: "Sur 136 No. 116, Col. Las Américas, Álvaro Obregón, Ciudad de México"
  },
  {
    name: "Centro Médico ABC Santa Fe",
    address: "Av. Carlos Graef Fernández 154, Santa Fe, Cuajimalpa, Ciudad de México"
  },
  {
    name: "Hospital Ángeles Lomas",
    address: "Vialidad de la Barranca s/n, Valle de las Palmas, Huixquilucan, Estado de México"
  },
  {
    name: "Hospital San Ángel Inn Patriotismo",
    address: "Av. Patriotismo 67, San Juan, Benito Juárez, Ciudad de México"
  },
  {
    name: "Hospital San Ángel Inn Chapultepec",
    address: "Av. Chapultepec 489, Juárez, Cuauhtémoc, Ciudad de México"
  },
  {
    name: "Hospital San Ángel Inn Universidad",
    address: "Mayorazgo 130, Xoco, Benito Juárez, Ciudad de México"
  },
  {
    name: "Hospital San Ángel Inn del Valle",
    address: "San Borja 214, Del Valle, Benito Juárez, Ciudad de México"
  },
  {
    name: "Cirugía Ambulatoria Medici",
    address: "Dirección por confirmar"
  }
];

const PROCEDURES = [
  "Apendicitis aguda - Apendicectomía laparoscópica",
  "Colecistectomía por laparoscopia",
  "Colecistectomía por laparoscopia más colangiografía transoperatoria",
  "Colecistectomía por laparoscopia más colangiografía transoperatoria más identificación de tejidos por fluorescencia",
  "Plastia inguinal bilateral por laparoscopia más colocación de mallas",
  "Plastia inguinal derecha por laparoscopia con colocación de malla",
  "Plastia inguinal izquierda por laparoscopia más colocación de malla",
  "Plastia ventral por laparoscopia más colocación de malla (IPOM Plus)",
  "Funduplicatura tipo Toupet por laparoscopia",
  "Funduplicatura tipo Nissen por laparoscopia",
  "Hemorroidectomía",
  "Hemorroidectomía tipo Ferguson",
  "Exploración anal bajo anestesia",
  "Exploración anal con esfinterotomía lateral y cura de fisura anal",
  "Exploración anal con esfinterotomía lateral y cura de fisura anal más hemorroidectomía",
  "Tiroidectomía total",
  "Hemitiroidectomía derecha",
  "Hemitiroidectomía izquierda",
  "Plastia umbilical",
  "Plastia umbilical con malla",
  "Coledocolitiasis - CPRE y/o exploración de vía biliar",
  "Obstrucción intestinal - Laparotomía / laparoscopía exploradora",
  "Absceso anorrectal - Drenaje quirúrgico",
  "Otro procedimiento"
];

const DIAGNOSES_BY_PROCEDURE = {
  "Apendicitis aguda - Apendicectomía laparoscópica": [
    "Apendicitis aguda",
    "Apendicitis aguda complicada",
    "Apendicitis aguda perforada",
    "Plastrón apendicular",
    "Absceso apendicular"
  ],
  "Colecistectomía por laparoscopia": [
    "Colecistitis crónica litiásica",
    "Colelitiasis sintomática",
    "Cólico biliar",
    "Pólipo vesicular",
    "Discinesia vesicular"
  ],
  "Colecistectomía por laparoscopia más colangiografía transoperatoria": [
    "Colecistitis aguda litiásica",
    "Colecistitis crónica litiásica",
    "Colelitiasis con sospecha de coledocolitiasis",
    "Coledocolitiasis probable",
    "Ictericia obstructiva en estudio"
  ],
  "Colecistectomía por laparoscopia más colangiografía transoperatoria más identificación de tejidos por fluorescencia": [
    "Colecistitis aguda litiásica",
    "Colecistitis crónica litiásica",
    "Colelitiasis con sospecha de coledocolitiasis",
    "Anatomía biliar compleja",
    "Síndrome de Mirizzi probable"
  ],
  "Plastia inguinal bilateral por laparoscopia más colocación de mallas": [
    "Hernia inguinal bilateral",
    "Hernia inguinal bilateral recidivante",
    "Hernia inguinoescrotal bilateral"
  ],
  "Plastia inguinal derecha por laparoscopia con colocación de malla": [
    "Hernia inguinal derecha",
    "Hernia inguinal derecha recidivante",
    "Hernia inguinoescrotal derecha"
  ],
  "Plastia inguinal izquierda por laparoscopia más colocación de malla": [
    "Hernia inguinal izquierda",
    "Hernia inguinal izquierda recidivante",
    "Hernia inguinoescrotal izquierda"
  ],
  "Plastia ventral por laparoscopia más colocación de malla (IPOM Plus)": [
    "Hernia ventral",
    "Hernia incisional",
    "Hernia epigástrica",
    "Eventración abdominal",
    "Diástasis de rectos con hernia ventral"
  ],
  "Funduplicatura tipo Toupet por laparoscopia": [
    "Enfermedad por reflujo gastroesofágico",
    "Hernia hiatal",
    "Esofagitis por reflujo",
    "Trastorno de motilidad esofágica con reflujo"
  ],
  "Funduplicatura tipo Nissen por laparoscopia": [
    "Enfermedad por reflujo gastroesofágico",
    "Hernia hiatal",
    "Esofagitis por reflujo",
    "Reflujo gastroesofágico refractario"
  ],
  "Hemorroidectomía": [
    "Enfermedad hemorroidal grado III",
    "Enfermedad hemorroidal grado IV",
    "Sangrado hemorroidal recurrente",
    "Trombosis hemorroidal",
    "Prolapso hemorroidal"
  ],
  "Hemorroidectomía tipo Ferguson": [
    "Enfermedad hemorroidal grado III",
    "Enfermedad hemorroidal grado IV",
    "Trombosis hemorroidal",
    "Sangrado hemorroidal recurrente"
  ],
  "Exploración anal bajo anestesia": [
    "Fístula anal",
    "Fisura anal",
    "Dolor anal en estudio",
    "Absceso anorrectal",
    "Lesión anal en estudio"
  ],
  "Exploración anal con esfinterotomía lateral y cura de fisura anal": [
    "Fisura anal crónica",
    "Fisura anal posterior",
    "Fisura anal anterior",
    "Hipertonía esfinteriana",
    "Dolor anal secundario a fisura anal"
  ],
  "Exploración anal con esfinterotomía lateral y cura de fisura anal más hemorroidectomía": [
    "Fisura anal crónica más enfermedad hemorroidal",
    "Fisura anal crónica con hemorroides grado III",
    "Fisura anal crónica con hemorroides grado IV",
    "Dolor anal por fisura anal y enfermedad hemorroidal",
    "Sangrado anal por fisura anal y enfermedad hemorroidal"
  ],
  "Tiroidectomía total": [
    "Bocio multinodular",
    "Nódulo tiroideo sospechoso",
    "Cáncer de tiroides",
    "Enfermedad de Graves",
    "Tumor tiroideo"
  ],
  "Hemitiroidectomía derecha": [
    "Nódulo tiroideo derecho",
    "Tumor tiroideo derecho",
    "Bocio nodular derecho",
    "Lesión folicular tiroidea derecha"
  ],
  "Hemitiroidectomía izquierda": [
    "Nódulo tiroideo izquierdo",
    "Tumor tiroideo izquierdo",
    "Bocio nodular izquierdo",
    "Lesión folicular tiroidea izquierda"
  ],
  "Plastia umbilical": [
    "Hernia umbilical",
    "Hernia umbilical encarcelada",
    "Hernia umbilical recidivante"
  ],
  "Plastia umbilical con malla": [
    "Hernia umbilical",
    "Hernia umbilical mayor a 2 cm",
    "Hernia umbilical recidivante",
    "Hernia umbilical con diástasis de rectos"
  ],
  "Coledocolitiasis - CPRE y/o exploración de vía biliar": [
    "Coledocolitiasis",
    "Ictericia obstructiva",
    "Colangitis aguda",
    "Pancreatitis biliar",
    "Dilatación de vía biliar en estudio"
  ],
  "Obstrucción intestinal - Laparotomía / laparoscopía exploradora": [
    "Obstrucción intestinal",
    "Oclusión intestinal",
    "Bridas y adherencias",
    "Hernia interna",
    "Abdomen agudo obstructivo"
  ],
  "Absceso anorrectal - Drenaje quirúrgico": [
    "Absceso perianal",
    "Absceso isquiorrectal",
    "Absceso anorrectal",
    "Absceso interesfintérico",
    "Sepsis perianal"
  ]
};

const OTHER_VALUE = "__other__";

const form = document.querySelector("#form");
const preview = document.querySelector("#documentPreview");
const EMAIL_TO = "drpablovidal@gmail.com";
const fields = {
  patientName: document.querySelector("#patientName"),
  birthDate: document.querySelector("#birthDate"),
  ageOutput: document.querySelector("#ageOutput"),
  procedure: document.querySelector("#procedure"),
  otherProcedureField: document.querySelector("#otherProcedureField"),
  otherProcedure: document.querySelector("#otherProcedure"),
  diagnosis: document.querySelector("#diagnosis"),
  otherDiagnosisField: document.querySelector("#otherDiagnosisField"),
  otherDiagnosis: document.querySelector("#otherDiagnosis"),
  hospital: document.querySelector("#hospital"),
  admissionDate: document.querySelector("#admissionDate"),
  admissionTime: document.querySelector("#admissionTime"),
  surgeryDate: document.querySelector("#surgeryDate"),
  surgeryTime: document.querySelector("#surgeryTime"),
  fastingDate: document.querySelector("#fastingDate"),
  fastingTime: document.querySelector("#fastingTime"),
  solutionRate: document.querySelector("#solutionRate"),
  extraNotes: document.querySelector("#extraNotes"),
  otherInterconsultationCheck: document.querySelector("#otherInterconsultationCheck"),
  otherInterconsultation: document.querySelector("#otherInterconsultation")
};

function fillSelect(select, placeholder, values, getLabel = (value) => value) {
  select.innerHTML = [
    `<option value="">${placeholder}</option>`,
    ...values.map((value, index) => `<option value="${index}">${escapeHtml(getLabel(value))}</option>`)
  ].join("");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function calculateAge(dateString) {
  if (!dateString) return null;
  const birthDate = new Date(`${dateString}T12:00:00`);
  const current = new Date();
  let age = current.getFullYear() - birthDate.getFullYear();
  const monthDiff = current.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && current.getDate() < birthDate.getDate())) age -= 1;
  return Number.isFinite(age) && age >= 0 ? age : null;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function longDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  return `${Number(day)} de ${months[Number(month) - 1]} de ${year}`;
}

function selectedHospital() {
  if (fields.hospital.value === "") return { name: "", address: "" };
  return HOSPITALS[Number(fields.hospital.value)] || { name: "", address: "" };
}

function selectedProcedure() {
  if (fields.procedure.value === "") return "";
  const procedure = PROCEDURES[Number(fields.procedure.value)] || "";
  if (procedure === "Otro procedimiento") return fields.otherProcedure.value.trim();
  return procedure;
}

function selectedProcedureLabel() {
  if (fields.procedure.value === "") return "";
  return PROCEDURES[Number(fields.procedure.value)] || "";
}

function selectedDiagnosis() {
  if (fields.diagnosis.value === OTHER_VALUE) return fields.otherDiagnosis.value.trim();
  return fields.diagnosis.value || selectedProcedure();
}

function diagnosisOptionsForProcedure(procedureLabel) {
  if (!procedureLabel || procedureLabel === "Otro procedimiento") return [];
  return DIAGNOSES_BY_PROCEDURE[procedureLabel] || [];
}

function selectedStudies() {
  return Array.from(document.querySelectorAll("input[name='studies']:checked")).map((item) => item.value);
}

function selectedInterconsultations() {
  const list = Array.from(document.querySelectorAll("input[name='interconsultations']:checked")).map((item) => item.value);
  const other = fields.otherInterconsultationCheck.checked ? fields.otherInterconsultation.value.trim() : "";
  if (other) list.push(other);
  return list;
}

function formatList(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

function formatCommaList(items) {
  return items.join(", ");
}

function getData() {
  const procedure = selectedProcedure();
  return {
    documentDate: today(),
    patientName: fields.patientName.value.trim(),
    birthDate: fields.birthDate.value,
    age: calculateAge(fields.birthDate.value),
    procedure,
    diagnosis: selectedDiagnosis(),
    hospital: selectedHospital(),
    admissionDate: fields.admissionDate.value,
    admissionTime: fields.admissionTime.value,
    surgeryDate: fields.surgeryDate.value,
    surgeryTime: fields.surgeryTime.value,
    fastingTime: fields.fastingTime.value || "23:30",
    fastingDate: fields.fastingDate.value || addDays(fields.surgeryDate.value || fields.admissionDate.value, -1),
    solution: `Solución Hartmann a ${fields.solutionRate.value || "80"} ml/hora`,
    studies: selectedStudies(),
    interconsultations: selectedInterconsultations(),
    extraNotes: fields.extraNotes.value.trim()
  };
}

function renderPreview() {
  const data = getData();
  fields.ageOutput.value = data.age === null ? "Ingrese fecha de nacimiento" : `${data.age} años`;

  preview.innerHTML = `
    <img class="letterhead" src="assets/membrete.jpg" alt="Membrete Dr. Pablo Vidal González">
    <div class="doc-content">
      <p class="doc-date">CDMX a ${longDate(data.documentDate)}</p>
      <div class="doc-title">
        <h3>INDICACIONES MÉDICAS PARA INGRESO A CIRUGÍA GENERAL</h3>
      </div>

      ${missingNotice(data)}

      <div class="patient-block">
        <p>
          <span>Paciente:</span> <strong>${escapeHtml(data.patientName.toUpperCase())}</strong>
          <span class="age-label">Edad:</span> <strong>${data.age === null ? "" : `${data.age} años`}</strong>
        </p>
        <p>
          <span>Fecha de ingreso:</span> <strong>${formatDate(data.admissionDate)}</strong>
          <span class="admission-time-label">Hora de ingreso:</span> <strong>${escapeHtml(data.admissionTime)}</strong>
        </p>
        <p><span>Diagnóstico de ingreso:</span> <strong>${escapeHtml(data.diagnosis.toUpperCase())}</strong></p>
      </div>

      <section class="doc-section-block">
        <p class="doc-section">1. Ingreso:</p>
        <ul>
          <li>Ingresar por admisión:</li>
          <li><strong>${escapeHtml(data.hospital.name)}</strong></li>
          <li>
            Dirección
            <ul>
              <li>${escapeHtml(data.hospital.address)}</li>
            </ul>
          </li>
        </ul>
      </section>

      <section class="doc-section-block">
        <p class="doc-section">2. Procedimiento Quirúrgico:</p>
        <ul>
          <li>Se opera de</li>
        </ul>
        <p class="procedure-line">
          ${escapeHtml(data.procedure.toUpperCase())}
          <span>el día <strong>${formatDate(data.surgeryDate)}</strong> a las <strong>${escapeHtml(data.surgeryTime)}</strong></span>
        </p>
      </section>

      <section class="doc-section-block">
        <p class="doc-section">3. Ayuno:</p>
        <ul>
          <li>Ayuno a partir de las ${escapeHtml(data.fastingTime)} horas del día ${formatDate(data.fastingDate)} (No tomar ni agua).</li>
        </ul>
      </section>

      <p class="doc-section ingress-heading">A SU INGRESO:</p>
      <div class="orders">
        <p><strong>1. Soluciones:</strong></p>
        <ul><li>Canalizar con ${escapeHtml(data.solution)}.</li></ul>

        <p><strong>2. Prevención antiembólica:</strong></p>
        <ul><li>Medias TED al muslo</li></ul>

        <p><strong>3. Estudios:</strong></p>
        <ul><li>Solicitar ${escapeHtml(formatCommaList(data.studies) || "Perfil Quirurgico XIII")}</li></ul>

        ${data.interconsultations.length ? `
          <p><strong>4. Interconsultas:</strong></p>
          <ul><li>Interconsulta e indicaciones por ${escapeHtml(formatCommaList(data.interconsultations))}.</li></ul>
        ` : ""}

        <p><strong>${data.interconsultations.length ? "5" : "4"}. Avisar a su ingreso:</strong></p>
        <ul><li>Avisar a su ingreso Dr. Pablo Vidal 5522715257</li></ul>
      </div>
      ${data.extraNotes ? `<p class="doc-line extra-note"><strong>Indicaciones adicionales:</strong> ${escapeHtml(data.extraNotes)}</p>` : ""}

      <div class="signature-block">
        <img src="assets/firma.png" alt="Firma Dr. Pablo Vidal González">
      </div>
    </div>
    <img class="doc-footer-img" src="assets/pie-membretado.png" alt="Pie de página membretado">
  `;
}

function missingNotice(data) {
  const missing = [];
  if (!data.patientName) missing.push("nombre del paciente");
  if (!data.birthDate) missing.push("fecha de nacimiento");
  if (!data.procedure) missing.push("procedimiento");
  if (!data.hospital.name) missing.push("hospital");
  if (!data.admissionDate) missing.push("fecha de ingreso");
  if (!data.surgeryDate) missing.push("fecha del procedimiento");
  if (!missing.length) return "";
  return `<p class="missing">Falta completar: ${escapeHtml(missing.join(", "))}.</p>`;
}

function copyDocumentText() {
  const text = preview.innerText.trim();
  navigator.clipboard.writeText(text).then(() => {
    const button = document.querySelector("#copyButton");
    button.textContent = "Copiado";
    setTimeout(() => {
      button.textContent = "Copiar texto";
    }, 1200);
  });
}

function pdfFileName() {
  const data = getData();
  const patient = (data.patientName || "paciente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  return `Indicaciones_ingreso_${patient || "paciente"}.pdf`;
}

function setButtonBusy(button, busyText) {
  const original = button.textContent;
  button.textContent = busyText;
  button.disabled = true;
  return () => {
    button.textContent = original;
    button.disabled = false;
  };
}

async function waitForDocumentImages() {
  const images = Array.from(preview.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });
  }));
}

async function createPdfBlob() {
  if (!window.html2canvas || !window.jspdf) {
    throw new Error("No se cargaron las librerías para generar PDF. Use Imprimir / Guardar PDF.");
  }
  await waitForDocumentImages();
  const canvas = await window.html2canvas(preview, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true
  });
  const pdf = new window.jspdf.jsPDF({
    orientation: "portrait",
    unit: "in",
    format: "letter",
    compress: true
  });
  const imageData = canvas.toDataURL("image/jpeg", 0.98);
  pdf.addImage(imageData, "JPEG", 0, 0, 8.5, 11);
  return pdf.output("blob");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadPdf() {
  const button = document.querySelector("#downloadPdfButton");
  const done = setButtonBusy(button, "Generando...");
  try {
    const blob = await createPdfBlob();
    downloadBlob(blob, pdfFileName());
  } catch (error) {
    alert((error.message || "No se pudo generar el PDF.") + "\n\nSe abrirá la ventana de impresión para guardarlo como PDF.");
    window.print();
  } finally {
    done();
  }
}

async function sharePdf() {
  const button = document.querySelector("#sharePdfButton");
  const done = setButtonBusy(button, "Preparando...");
  try {
    const blob = await createPdfBlob();
    const file = new File([blob], pdfFileName(), { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Indicaciones de ingreso",
        text: "Indicaciones médicas de ingreso."
      });
    } else {
      downloadBlob(blob, file.name);
      window.open("https://wa.me/?text=PDF%20de%20indicaciones%20generado.%20Adjuntar%20el%20archivo%20descargado.", "_blank");
    }
  } catch (error) {
    alert((error.message || "No se pudo compartir el PDF.") + "\n\nSe abrirá WhatsApp con una nota. Si el PDF no se adjunta automáticamente, use Descargar PDF y adjúntelo manualmente.");
    window.open("https://wa.me/?text=PDF%20de%20indicaciones%20de%20ingreso%20listo.%20Adjuntar%20el%20archivo%20PDF%20generado.", "_blank");
  } finally {
    done();
  }
}

async function emailPdf() {
  const button = document.querySelector("#emailPdfButton");
  const done = setButtonBusy(button, "Preparando...");
  try {
    const blob = await createPdfBlob();
    const fileName = pdfFileName();
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Indicaciones de ingreso",
        text: `Enviar a ${EMAIL_TO}`
      });
    } else {
      downloadBlob(blob, fileName);
      const subject = encodeURIComponent("Indicaciones de ingreso");
      const body = encodeURIComponent(`Adjunto PDF de indicaciones de ingreso.\n\nArchivo generado: ${fileName}`);
      window.location.href = `mailto:${EMAIL_TO}?subject=${subject}&body=${body}`;
    }
  } catch (error) {
    alert((error.message || "No se pudo preparar el correo.") + "\n\nSe abrirá un correo dirigido a drpablovidal@gmail.com. Si el PDF no se adjunta automáticamente, use Descargar PDF y adjúntelo manualmente.");
    const subject = encodeURIComponent("Indicaciones de ingreso");
    const body = encodeURIComponent("Adjunto PDF de indicaciones de ingreso.");
    window.location.href = `mailto:${EMAIL_TO}?subject=${subject}&body=${body}`;
  } finally {
    done();
  }
}

function clearForm() {
  form.reset();
  fields.admissionDate.value = today();
  fields.surgeryDate.value = today();
  fields.fastingDate.value = addDays(fields.surgeryDate.value, -1);
  fields.admissionTime.value = "08:00";
  fields.surgeryTime.value = "11:00";
  fields.fastingTime.value = "23:30";
  fields.solutionRate.value = "80";
  fields.otherProcedureField.hidden = true;
  fields.otherProcedure.value = "";
  fields.otherDiagnosisField.hidden = true;
  fields.otherDiagnosis.value = "";
  fields.otherInterconsultation.hidden = true;
  updateDiagnosisOptions();
  renderPreview();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

fillSelect(fields.procedure, "— Seleccione procedimiento —", PROCEDURES);
fillSelect(fields.hospital, "— Seleccione hospital —", HOSPITALS, (hospital) => hospital.name);
fields.admissionDate.value = today();
fields.surgeryDate.value = today();
fields.fastingDate.value = addDays(fields.surgeryDate.value, -1);

function updateDiagnosisOptions() {
  const procedureLabel = selectedProcedureLabel();
  const options = diagnosisOptionsForProcedure(procedureLabel);
  fields.otherProcedureField.hidden = procedureLabel !== "Otro procedimiento";
  if (procedureLabel !== "Otro procedimiento") fields.otherProcedure.value = "";

  if (!procedureLabel) {
    fields.diagnosis.innerHTML = `<option value="">— Primero seleccione procedimiento —</option>`;
    fields.diagnosis.value = "";
    fields.otherDiagnosisField.hidden = true;
    fields.otherDiagnosis.value = "";
    return;
  }

  fields.diagnosis.innerHTML = [
    `<option value="">${options.length ? "— Seleccione diagnóstico —" : "— Diagnóstico libre —"}</option>`,
    ...options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
    `<option value="${OTHER_VALUE}">Otro diagnóstico</option>`
  ].join("");

  if (options.length) fields.diagnosis.value = options[0];
  else fields.diagnosis.value = OTHER_VALUE;
  fields.otherDiagnosisField.hidden = fields.diagnosis.value !== OTHER_VALUE;
}

function syncFastingDateToPreviousDay() {
  fields.fastingDate.value = addDays(fields.surgeryDate.value || fields.admissionDate.value, -1);
  renderPreview();
}

form.addEventListener("input", renderPreview);
form.addEventListener("change", renderPreview);
fields.diagnosis.addEventListener("change", () => {
  fields.otherDiagnosisField.hidden = fields.diagnosis.value !== OTHER_VALUE;
  if (fields.diagnosis.value !== OTHER_VALUE) fields.otherDiagnosis.value = "";
  renderPreview();
});
fields.otherInterconsultationCheck.addEventListener("change", () => {
  fields.otherInterconsultation.hidden = !fields.otherInterconsultationCheck.checked;
  if (!fields.otherInterconsultationCheck.checked) fields.otherInterconsultation.value = "";
  renderPreview();
});
fields.procedure.addEventListener("change", () => {
  updateDiagnosisOptions();
  renderPreview();
});
fields.surgeryDate.addEventListener("change", () => {
  if (!fields.fastingDate.value) fields.fastingDate.value = addDays(fields.surgeryDate.value, -1);
  renderPreview();
});
document.querySelector("#fastingPreviousButton").addEventListener("click", syncFastingDateToPreviousDay);
document.querySelector("#fastingSameDayButton").addEventListener("click", () => {
  fields.fastingDate.value = fields.surgeryDate.value || fields.admissionDate.value;
  renderPreview();
});
document.querySelector("#copyButton").addEventListener("click", copyDocumentText);
document.querySelector("#downloadPdfButton").addEventListener("click", downloadPdf);
document.querySelector("#sharePdfButton").addEventListener("click", sharePdf);
document.querySelector("#emailPdfButton").addEventListener("click", emailPdf);
document.querySelector("#printButton").addEventListener("click", () => window.print());
document.querySelector("#clearButton").addEventListener("click", clearForm);

window.createPdfBlob = createPdfBlob;
window.downloadPdf = downloadPdf;
window.sharePdf = sharePdf;
window.emailPdf = emailPdf;

updateDiagnosisOptions();
renderPreview();
