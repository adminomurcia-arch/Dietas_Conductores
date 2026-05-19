// =============================================
// app.js — Lógica principal de la interfaz
// =============================================

let modoActual = 'detallado';

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initDB();
  renderTablas();
  renderHistorial();
  setModo('detallado');
  fijarLimiteFechas();
});

// ---- FIJAR LÍMITE Y AÑO ACTUAL EN TODOS LOS INPUTS DATE ----
function fijarLimiteFechas() {
  const hoy = new Date().toISOString().slice(0, 10);
  const añoActual = new Date().getFullYear();
  const primerDiaAño = `${añoActual}-01-01`;

  document.querySelectorAll('input[type="date"]').forEach(el => {
    el.max = hoy;
    // Al hacer clic, si está vacío pre-rellena con hoy
    el.addEventListener('focus', function () {
      if (!this.value) this.value = hoy;
    });
  });
}

// ---- TABS PRINCIPALES ----
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).style.display = 'block';
  event.currentTarget.classList.add('active');
  // Re-aplicar límites de fechas por si hay inputs nuevos visibles
  fijarLimiteFechas();
}

// ---- MODO REGISTRO ----
function setModo(modo) {
  modoActual = modo;
  document.getElementById('btn-detallado').classList.toggle('active', modo === 'detallado');
  document.getElementById('btn-resumido').classList.toggle('active',  modo === 'resumido');
  document.getElementById('section-operaciones-detallado').style.display = modo === 'detallado' ? 'block' : 'none';
  document.getElementById('section-operaciones-resumido').style.display  = modo === 'resumido'  ? 'block' : 'none';
  calcularDietas();
}

// ---- AUTOCOMPLETAR CONDUCTOR ----
function autocompletar() {
  const cod = document.getElementById('codConductor').value.trim();
  const c = buscarConductor(cod);
  if (c) {
    document.getElementById('nombreConductor').value = c.Nombre;
    document.getElementById('plataforma').value      = c.PLATAFORMA;
    document.getElementById('categoria').value       = c.CATEGORIA;
    adaptarPlataforma(c.PLATAFORMA, c.CATEGORIA);
  } else {
    document.getElementById('nombreConductor').value = '';
    document.getElementById('plataforma').value      = '';
    document.getElementById('categoria').value       = '';
    adaptarPlataforma('', '');
  }
}

// ---- ADAPTAR INTERFAZ POR PLATAFORMA ----
function adaptarPlataforma(plataforma, categoria) {
  // Horas (solo CAUDETE)
  const esCaudete = plataforma === 'CAUDETE';
  document.getElementById('field-horaSalida').style.display  = esCaudete ? 'flex' : 'none';
  document.getElementById('field-horaLlegada').style.display = esCaudete ? 'flex' : 'none';
  document.getElementById('field-restoHoras').style.display  = esCaudete ? 'flex' : 'none';
  if (esCaudete) {
    document.getElementById('horaSalida').required  = true;
    document.getElementById('horaLlegada').required = true;
  } else {
    document.getElementById('horaSalida').required  = false;
    document.getElementById('horaLlegada').required = false;
  }

  // Km (COMODIN / PESCADO)
  const catUpper = categoria.toUpperCase();
  const sinKm = catUpper === 'COMODIN' || catUpper === 'PESCADO';
  document.getElementById('section-kms').style.display = plataforma === 'CAUDETE' ? 'none' : 'block';
  if (sinKm) {
    document.getElementById('kmSalida').value  = '';
    document.getElementById('kmVuelta').value  = '';
    document.getElementById('totalKm').value   = 12000;
    document.getElementById('kmSalida').readOnly = true;
    document.getElementById('kmVuelta').readOnly = true;
  } else {
    document.getElementById('kmSalida').readOnly  = false;
    document.getElementById('kmVuelta').readOnly  = false;
    document.getElementById('totalKm').value = '';
  }

  // Bloques detallado — visibilidad por plataforma
  document.querySelectorAll('.plat-TJG').forEach(el =>
    el.style.display = plataforma === 'TJG' ? 'block' : 'none');
  document.querySelectorAll('.plat-FILARDI').forEach(el =>
    el.style.display = plataforma === 'FILARDI' ? 'block' : 'none');
  document.querySelectorAll('.plat-CAUDETE').forEach(el =>
    el.style.display = plataforma === 'CAUDETE' ? 'block' : 'none');

  // Bloques resumido
  ['res-24horas','res-pausa'].forEach(id =>
    document.getElementById(id).style.display = plataforma === 'TJG' ? 'flex' : 'none');
  ['res-uk','res-ndlf'].forEach(id =>
    document.getElementById(id).style.display = plataforma === 'FILARDI' ? 'flex' : 'none');
  document.getElementById('res-nacional').style.display = plataforma === 'CAUDETE' ? 'flex' : 'none';

  // Carga/Palet: ocultar en FILARDI
  ['res-carga','res-palet'].forEach(id =>
    document.getElementById(id).style.display = plataforma === 'FILARDI' ? 'none' : 'flex');
  document.getElementById('bloque-carga').style.display = plataforma === 'FILARDI' ? 'none' : 'block';
  document.getElementById('bloque-palet').style.display = plataforma === 'FILARDI' ? 'none' : 'block';

  // Acarreos y Vlissingen: ocultar en CAUDETE
  document.getElementById('field-acarreos').style.display   = plataforma === 'CAUDETE' ? 'none' : 'flex';
  document.getElementById('field-vlissingen').style.display = plataforma === 'CAUDETE' ? 'none' : 'flex';

  // Domingos y Festivos: solo CAUDETE, separados con check
  document.getElementById('field-domingos').style.display = esCaudete ? 'flex' : 'none';
  document.getElementById('field-festivos').style.display = esCaudete ? 'flex' : 'none';
  // Resetear checks al cambiar plataforma
  if (!esCaudete) {
    document.getElementById('chk-festivos').checked = false;
    document.getElementById('numDomingos').value    = '';
    document.getElementById('numFestivos').value    = '';
    document.getElementById('domingosFestivos').value = 0;
  }

  // Ocultar resultado anterior
  document.getElementById('section-resultado').style.display = 'none';
}

// ---- AÑADIR FILA DE OPERACIÓN (DETALLADO) ----
function addOperacion(tipo) {
  const lista = document.getElementById(`lista-${tipo}`);
  const row = document.createElement('div');
  row.className = 'operacion-row';
  row.innerHTML = `
    <input type="number" placeholder="Nº" min="1" value="1" onchange="calcularDietas()">
    <input type="date" placeholder="Fecha">
    <input type="text" placeholder="Lugar">
    <button type="button" class="btn-del" onclick="this.parentElement.remove(); calcularDietas()">🗑</button>
  `;
  lista.appendChild(row);
  calcularDietas();
}

// ---- GUARDAR REGISTRO ----
function guardarRegistro(e) {
  e.preventDefault();

  const plataforma = document.getElementById('plataforma').value;
  if (!plataforma) { showToast('Introduce un código de conductor válido', 'error'); return; }

  const resultado = calcularYObtener();

  const reg = {
    codigoConductor:  document.getElementById('codConductor').value.trim(),
    nombreConductor:  document.getElementById('nombreConductor').value,
    plataforma,
    categoria:        document.getElementById('categoria').value,
    fechaSalida:      document.getElementById('fechaSalida').value,
    horaSalida:       document.getElementById('horaSalida').value,
    fechaLlegada:     document.getElementById('fechaLlegada').value,
    horaLlegada:      document.getElementById('horaLlegada').value,
    diasTrabajados:   parseFloat(document.getElementById('diasTrabajados').value) || 0,
    restoHoras:       parseFloat(document.getElementById('restoHoras').value)     || 0,
    coefNacional:     parseFloat(document.getElementById('coefNacional').value)   || 0,
    domingosFestivos: parseFloat(document.getElementById('domingosFestivos').value) || 0,
    numDomingos:      parseFloat(document.getElementById('numDomingos').value) || 0,
    numFestivos:      parseFloat(document.getElementById('numFestivos').value) || 0,
    chkFestivos:      document.getElementById('chk-festivos').checked,
    kmSalida:         parseFloat(document.getElementById('kmSalida').value)       || 0,
    kmVuelta:         parseFloat(document.getElementById('kmVuelta').value)       || 0,
    totalKm:          parseFloat(document.getElementById('totalKm').value)        || 0,
    nCarga:           getCount('carga'),
    nPalet:           getCount('palet'),
    nRebote:          getCount('rebote'),
    n24h:             getCount('24horas'),
    nPausa:           getCount('pausa'),
    nNacional:        getCount('nacional'),
    nUK:              getCount('uk'),
    nNDLF:            getCount('ndlf'),
    acarreos:         parseFloat(document.getElementById('acarreos').value)         || 0,
    dietaVlissingen:  parseFloat(document.getElementById('dietaVlissingen').value)  || 0,
    extras:           parseFloat(document.getElementById('extras').value)           || 0,
    anticipos:        parseFloat(document.getElementById('anticipos').value)        || 0,
    modo:             modoActual,
    resultado,
  };

  addRegistro(reg);
  renderHistorial();
  showToast('Registro guardado ✓', 'success');
  limpiarFormulario();
}

// Recalcula y devuelve el resultado actual sin mostrarlo
function calcularYObtener() {
  const plataforma  = document.getElementById('plataforma').value;
  const totalKm     = parseFloat(document.getElementById('totalKm').value)       || 0;
  const diasTrab    = parseFloat(document.getElementById('diasTrabajados').value) || 0;
  const restoHoras  = parseFloat(document.getElementById('restoHoras').value)    || 0;
  const coefNac     = parseFloat(document.getElementById('coefNacional').value)  || 0;
  const extras      = parseFloat(document.getElementById('extras').value)        || 0;
  const nCarga      = getCount('carga');
  const nPalet      = getCount('palet');
  const nRebote     = getCount('rebote');
  const n24h        = getCount('24horas');
  const nPausa      = getCount('pausa');
  const nNacional   = getCount('nacional');
  const nUK         = getCount('uk');
  const nNDLF       = getCount('ndlf');
  const nAcarreos   = parseFloat(document.getElementById('acarreos').value)        || 0;
  const nVlissingen = parseFloat(document.getElementById('dietaVlissingen').value) || 0;

  let nDomingos = 0, nFestivos = 0;
  if (plataforma === 'CAUDETE') {
    nDomingos = parseFloat(document.getElementById('numDomingos').value) || 0;
    nFestivos = document.getElementById('chk-festivos').checked
      ? (parseFloat(document.getElementById('numFestivos').value) || 0) : 0;
  }

  if (plataforma === 'TJG')     return calcTJG({ totalKm, coefNac, nCarga, nPalet, nRebote, n24h, nPausa, nAcarreos, nVlissingen, extras });
  if (plataforma === 'FILARDI') return calcFILARDI({ totalKm, diasTrab, coefNac, nRebote, nUK, nNDLF, nAcarreos, nVlissingen, extras });
  if (plataforma === 'CAUDETE') return calcCAUDETE({ diasTrab, restoHoras, nDomingos, nFestivos, nCarga, nPalet, nRebote, nNacional, extras });
  return {};
}

// ---- LIMPIAR FORMULARIO ----
function limpiarFormulario() {
  document.getElementById('formRegistro').reset();
  document.getElementById('nombreConductor').value = '';
  document.getElementById('plataforma').value      = '';
  document.getElementById('categoria').value       = '';
  document.getElementById('section-resultado').style.display = 'none';
  ['carga','palet','rebote','24horas','pausa','nacional','uk','ndlf'].forEach(tipo => {
    document.getElementById(`lista-${tipo}`).innerHTML = '';
  });
  adaptarPlataforma('', '');
}

// ---- SIDEBAR HISTORIAL ----
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  sb.classList.toggle('closed');
  ov.classList.toggle('active');
}

function renderHistorial() {
  const lista = document.getElementById('listaHistorial');
  const filtro = (document.getElementById('filtroHistorial')?.value || '').toLowerCase();
  let regs = getRegistros().slice().reverse();
  if (filtro) regs = regs.filter(r =>
    r.nombreConductor.toLowerCase().includes(filtro) ||
    String(r.codigoConductor).includes(filtro)
  );
  lista.innerHTML = '';
  if (!regs.length) {
    lista.innerHTML = '<p style="padding:16px;color:#888;font-size:12px">Sin registros</p>';
    return;
  }
  regs.forEach(r => {
    const div = document.createElement('div');
    div.className = 'hist-item';
    const platClass = `plat-${r.plataforma}-badge`;
    const total = r.plataforma === 'CAUDETE'
      ? `${(r.resultado?.TOTAL || 0).toFixed(2)} €`
      : `${(r.resultado?.sumDietas || 0).toFixed(2)} €`;
    div.innerHTML = `
      <div class="hist-nombre">${r.nombreConductor}
        <span class="hist-plat ${platClass}">${r.plataforma}</span>
      </div>
      <div class="hist-meta">${r.fechaSalida} → ${r.fechaLlegada} · ${r.diasTrabajados} días</div>
      <div class="hist-meta" style="margin-top:3px;font-weight:500;color:#4a7c59">${total}</div>
    `;
    lista.appendChild(div);
  });
}

// ---- TABLAS BASE DE DATOS ----
function renderTablas() {
  renderTablaConductores();
  renderTablaTarifas();
}

function renderTablaConductores() {
  const tbody = document.getElementById('tbody-conductores');
  tbody.innerHTML = '';
  getConductores().forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.PLATAFORMA}</td><td>${c.CATEGORIA}</td><td>${c.Codigo}</td>
      <td>${c.Nombre}</td><td>${c.NIF || ''}</td><td class="font-mono" style="font-size:11px">${c.IBAN || ''}</td>
      <td>${c.PrecioKmt}</td><td>${c.Email || ''}</td>
      <td>
        <button class="btn-icon" onclick="editarConductor('${c.Codigo}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="confirmarEliminar('${c.Codigo}')" title="Eliminar">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTablaTarifas() {
  const tbody = document.getElementById('tbody-tarifas');
  tbody.innerHTML = '';
  getTarifas().forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.CONCEPTO}</td><td>${t.TJG}</td><td>${t.CAUDETE}</td><td>${t.FILARDI}</td>`;
    tbody.appendChild(tr);
  });
}

// ---- BD TABS ----
function showBDTab(tab) {
  document.querySelectorAll('.bd-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.bd-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`bd-${tab}`).style.display = 'block';
  event.currentTarget.classList.add('active');
}

// ---- MODAL CONDUCTOR ----
function nuevoConductor() {
  document.getElementById('modal-title').textContent = 'Nuevo Conductor';
  document.getElementById('m-codigo-original').value = '';
  ['m-plataforma','m-categoria','m-codigo','m-nombre','m-nif','m-iban','m-precio','m-email']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('modal-conductor').style.display = 'flex';
}

function editarConductor(codigo) {
  const c = buscarConductor(codigo);
  if (!c) return;
  document.getElementById('modal-title').textContent = 'Editar Conductor';
  document.getElementById('m-codigo-original').value = codigo;
  document.getElementById('m-plataforma').value = c.PLATAFORMA;
  document.getElementById('m-categoria').value  = c.CATEGORIA;
  document.getElementById('m-codigo').value     = c.Codigo;
  document.getElementById('m-nombre').value     = c.Nombre;
  document.getElementById('m-nif').value        = c.NIF    || '';
  document.getElementById('m-iban').value       = c.IBAN   || '';
  document.getElementById('m-precio').value     = c.PrecioKmt || '';
  document.getElementById('m-email').value      = c.Email  || '';
  document.getElementById('modal-conductor').style.display = 'flex';
}

function guardarConductor() {
  const conductor = {
    PLATAFORMA: document.getElementById('m-plataforma').value,
    CATEGORIA:  document.getElementById('m-categoria').value,
    Codigo:     document.getElementById('m-codigo').value.trim(),
    Nombre:     document.getElementById('m-nombre').value.trim(),
    NIF:        document.getElementById('m-nif').value.trim(),
    IBAN:       document.getElementById('m-iban').value.trim(),
    PrecioKmt:  parseFloat(document.getElementById('m-precio').value) || 0,
    Email:      document.getElementById('m-email').value.trim(),
  };
  if (!conductor.Codigo || !conductor.Nombre) { showToast('Código y Nombre son obligatorios', 'error'); return; }
  upsertConductor(conductor);
  renderTablaConductores();
  cerrarModal();
  showToast('Conductor guardado ✓', 'success');
}

function confirmarEliminar(codigo) {
  if (confirm(`¿Eliminar conductor ${codigo}?`)) {
    eliminarConductor(codigo);
    renderTablaConductores();
    showToast('Conductor eliminado');
  }
}

function cerrarModal() {
  document.getElementById('modal-conductor').style.display = 'none';
}

// ---- TOAST ----
function showToast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${tipo} show`;
  setTimeout(() => t.className = 'toast', 3000);
}
