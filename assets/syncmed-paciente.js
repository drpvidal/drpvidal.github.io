/* SyncMed One · Paciente compartido entre recetas
   Guarda nombre y fecha de nacimiento del paciente en este dispositivo
   (12 horas) para no perderlos al regresar y para pasar de una receta a otra. */
(function () {
  var KEY = 'syncmed_paciente';
  var VIGENCIA = 12 * 60 * 60 * 1000;
  var APPS = [
    ['laboratorios.html', 'Laboratorios'],
    ['recetario.html', 'Antibióticos'],
    ['recetario2.html', 'Receta múltiple'],
    ['receta-libre.html', 'Receta libre'],
    ['cartas.html', 'Cartas y justificantes']
  ];

  var nombre = document.getElementById('nombre');
  var fn = document.getElementById('fn');
  if (!nombre || !fn) return;

  function leer() {
    try {
      var p = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (p && Date.now() - p.t < VIGENCIA) return p;
      localStorage.removeItem(KEY);
    } catch (e) {}
    return null;
  }
  function guardar() {
    try {
      if (!nombre.value.trim() && !fn.value) { localStorage.removeItem(KEY); }
      else localStorage.setItem(KEY, JSON.stringify({ nombre: nombre.value.trim(), fn: fn.value, t: Date.now() }));
    } catch (e) {}
    pintar();
  }
  function disparar(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Barra con paciente actual y accesos a las demás recetas
  var css = document.createElement('style');
  css.textContent =
    '.smp{max-width:520px;margin:10px auto 0;padding:0 14px;font-family:Arial,sans-serif;}' +
    '.smp-box{background:#fff;border:1px solid rgba(18,102,255,.15);border-radius:10px;padding:10px 12px;box-shadow:0 6px 18px rgba(11,31,58,.06);}' +
    '.smp-top{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.8rem;color:#0b1f3a;}' +
    '.smp-top b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.smp-new{background:none;border:1.5px solid #dde5ef;color:#64748b;border-radius:8px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap;}' +
    '.smp-links{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;}' +
    '.smp-links a{flex:0 0 auto;text-decoration:none;font-size:.74rem;font-weight:700;color:#1266ff;background:#eef7ff;border:1px solid rgba(18,102,255,.25);border-radius:20px;padding:6px 11px;}' +
    '.smp-links a.act{background:linear-gradient(135deg,#1266ff,#08c7c7);color:#fff;border-color:transparent;}';
  document.head.appendChild(css);

  var actual = (location.pathname.split('/').pop() || '').toLowerCase();
  var bar = document.createElement('div');
  bar.className = 'smp';
  var links = APPS.map(function (a) {
    return '<a href="' + a[0] + '"' + (a[0] === actual ? ' class="act"' : '') + '>' + a[1] + '</a>';
  }).join('');
  bar.innerHTML = '<div class="smp-box"><div class="smp-top">👤 <b id="smp-pac">Sin paciente</b>' +
    '<button type="button" class="smp-new" id="smp-new">Nuevo paciente</button></div>' +
    '<div class="smp-links">' + links + '</div></div>';
  var header = document.querySelector('header');
  if (header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
  else document.body.insertBefore(bar, document.body.firstChild);

  function pintar() {
    var n = nombre.value.trim().toUpperCase();
    document.getElementById('smp-pac').textContent = n || 'Sin paciente';
  }

  document.getElementById('smp-new').addEventListener('click', function () {
    if ((nombre.value || fn.value) && !confirmar()) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    nombre.value = ''; fn.value = '';
    disparar(nombre); disparar(fn);
    pintar(); nombre.focus();
  });
  // Confirmación sin cuadros de diálogo del navegador: segundo toque en 3 s
  var armado = 0;
  function confirmar() {
    var b = document.getElementById('smp-new');
    if (Date.now() - armado < 3000) { b.textContent = 'Nuevo paciente'; return true; }
    armado = Date.now(); b.textContent = '¿Borrar? Toque otra vez';
    setTimeout(function () { b.textContent = 'Nuevo paciente'; }, 3000);
    return false;
  }

  // Restaurar al abrir o al regresar
  var p = leer();
  if (p) {
    if (!nombre.value) { nombre.value = p.nombre || ''; disparar(nombre); }
    if (!fn.value && p.fn) { fn.value = p.fn; disparar(fn); }
  }
  pintar();

  nombre.addEventListener('input', guardar);
  fn.addEventListener('change', guardar);
  fn.addEventListener('input', guardar);
  // Al volver con el botón "atrás" (página en caché), refrescar desde lo guardado
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var q = leer();
    if (q) { nombre.value = q.nombre || ''; fn.value = q.fn || ''; disparar(fn); pintar(); }
  });
})();
