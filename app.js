// =============================================
// app.js — Lógica principal de la interfaz
// =============================================

let modoActual = 'detallado';

// ---- INIT ----
// Se llama desde index.html tras initDB() de Firebase
window._appReady = function() {
  renderTablas();
  renderHistorial();
  setModo('detallado');
  fijarLimiteFechas();
};

// ---- FECHAS: máximo = hoy, pre-rellenar al hacer foco ----
function fijarLimiteFechas() {
  const hoy = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach(el => {
    el.max = hoy;
    el.addEventListener('focus', function () { if (!this.value) this.value = hoy; }, { once: false });
  });
}

// ---- TABS PRINCIPALES ----
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`tab-${tab}`);
  el.style.display = 'block';
  el.classList.add('active');
  event.currentTarget.classList.add('active');
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

// ---- AUTOCOMPLETAR POR CÓDIGO ----
function autocompletar() {
  const cod = document.getElementById('codConductor').value.trim();
  const c = buscarConductor(cod);

  document.getElementById('nombreConductor').value = c?.Nombre    || '';
  document.getElementById('plataforma').value      = c?.PLATAFORMA|| '';
  document.getElementById('categoria').value       = c?.CATEGORIA || '';

  // Bloquear/desbloquear el resto del formulario
  const bloqueado = cod.length > 0 && !c;
  document.querySelectorAll('#formRegistro input:not(#codConductor), #formRegistro select, #formRegistro button[type="submit"]')
    .forEach(el => el.disabled = bloqueado);

  if (bloqueado) {
    document.getElementById('codConductor').style.borderColor = '#c0392b';
    showToast('Código de conductor no encontrado', 'error');
  } else {
    document.getElementById('codConductor').style.borderColor = '';
  }

  adaptarPlataforma(c?.PLATAFORMA || '', c?.CATEGORIA || '');
}

// ---- ADAPTAR INTERFAZ POR PLATAFORMA ----
function adaptarPlataforma(plataforma, categoria) {
  const esCaudete  = plataforma === 'CAUDETE';
  const esFilardi  = plataforma === 'FILARDI';
  const sinKm      = ['COMODIN','PESCADO'].includes(categoria.toUpperCase());

  // Horas (solo CAUDETE)
  ['field-horaSalida','field-horaLlegada','field-restoHoras'].forEach(id =>
    document.getElementById(id).style.display = esCaudete ? 'flex' : 'none');
  document.getElementById('horaSalida').required  = esCaudete;
  document.getElementById('horaLlegada').required = esCaudete;

  // Kilómetros
  document.getElementById('section-kms').style.display = esCaudete ? 'none' : 'block';
  const kmS = document.getElementById('kmSalida');
  const kmV = document.getElementById('kmVuelta');
  if (sinKm) {
    kmS.value = ''; kmV.value = '';
    document.getElementById('totalKm').value = 12000;
    kmS.readOnly = kmV.readOnly = true;
  } else {
    kmS.readOnly = kmV.readOnly = false;
    if (!plataforma) document.getElementById('totalKm').value = '';
  }

  // Bloques de operaciones por plataforma
  document.querySelectorAll('.plat-TJG').forEach(el =>
    el.style.display = plataforma === 'TJG' ? 'block' : 'none');
  document.querySelectorAll('.plat-FILARDI').forEach(el =>
    el.style.display = esFilardi ? 'block' : 'none');
  document.querySelectorAll('.plat-CAUDETE').forEach(el =>
    el.style.display = esCaudete ? 'block' : 'none');

  // Resumido: mostrar/ocultar campos por plataforma
  const vis = (id, cond) => document.getElementById(id).style.display = cond ? 'flex' : 'none';
  vis('res-carga',   !esFilardi);
  vis('res-palet',   !esFilardi);
  vis('res-rebote',  true);
  vis('res-24horas', plataforma === 'TJG');
  vis('res-pausa',   plataforma === 'TJG');
  vis('res-nacional',esCaudete);
  vis('res-uk',      esFilardi);
  vis('res-ndlf',    esFilardi);

  // Detallado: carga/palet ocultos en FILARDI
  document.getElementById('bloque-carga').style.display = esFilardi ? 'none' : 'block';
  document.getElementById('bloque-palet').style.display = esFilardi ? 'none' : 'block';

  // Acarreos y Vlissingen: solo TJG y FILARDI
  vis('field-acarreos',   !esCaudete);
  vis('field-vlissingen', !esCaudete);

  // Domingos y Festivos: solo CAUDETE
  vis('field-domingos', esCaudete);
  vis('field-festivos', esCaudete);
  if (!esCaudete) {
    document.getElementById('chk-festivos').checked  = false;
    document.getElementById('numDomingos').value     = '';
    document.getElementById('numFestivos').value     = '';
  }

  document.getElementById('section-resultado').style.display = 'none';
}

// ---- AÑADIR FILA DE OPERACIÓN (DETALLADO) ----
function addOperacion(tipo) {
  const row = document.createElement('div');
  row.className = 'operacion-row';
  row.innerHTML = `
    <input type="number" placeholder="Nº" min="1" value="1" onchange="calcularDietas()">
    <input type="date">
    <input type="text" placeholder="Lugar">
    <button type="button" class="btn-del" onclick="this.parentElement.remove();calcularDietas()">🗑</button>
  `;
  document.getElementById(`lista-${tipo}`).appendChild(row);
  fijarLimiteFechas();
  calcularDietas();
}

// ---- GUARDAR REGISTRO ----
async function guardarRegistro(e) {
  e.preventDefault();
  const plataforma = document.getElementById('plataforma').value;
  if (!plataforma) { showToast('Introduce un código de conductor válido', 'error'); return; }

  // calcularDietas() ya devuelve el resultado; lo reutilizamos
  const resultado = calcularDietas();

  const nDomingos = parseFloat(document.getElementById('numDomingos').value) || 0;
  const nFestivos = parseFloat(document.getElementById('numFestivos').value) || 0;

  await addRegistro({
    codigoConductor: document.getElementById('codConductor').value.trim(),
    nombreConductor: document.getElementById('nombreConductor').value,
    plataforma,
    categoria:       document.getElementById('categoria').value,
    fechaSalida:     document.getElementById('fechaSalida').value,
    horaSalida:      document.getElementById('horaSalida').value,
    fechaLlegada:    document.getElementById('fechaLlegada').value,
    horaLlegada:     document.getElementById('horaLlegada').value,
    diasTrabajados:  parseFloat(document.getElementById('diasTrabajados').value) || 0,
    restoHoras:      parseFloat(document.getElementById('restoHoras').value)     || 0,
    coefNacional:    parseFloat(document.getElementById('coefNacional').value)   || 0,
    nDomingos,
    nFestivos,
    festivosEnLiquidacion: document.getElementById('chk-festivos').checked,
    kmSalida:        parseFloat(document.getElementById('kmSalida').value)       || 0,
    kmVuelta:        parseFloat(document.getElementById('kmVuelta').value)       || 0,
    totalKm:         parseFloat(document.getElementById('totalKm').value)        || 0,
    nCarga:          getCount('carga'),
    nPalet:          getCount('palet'),
    nRebote:         getCount('rebote'),
    n24h:            getCount('24horas'),
    nPausa:          getCount('pausa'),
    nNacional:       getCount('nacional'),
    nUK:             getCount('uk'),
    nNDLF:           getCount('ndlf'),
    acarreos:        parseFloat(document.getElementById('acarreos').value)         || 0,
    dietaVlissingen: parseFloat(document.getElementById('dietaVlissingen').value)  || 0,
    extras:          parseFloat(document.getElementById('extras').value)           || 0,
    anticipos:       parseFloat(document.getElementById('anticipos').value)        || 0,
    modo:            modoActual,
    resultado,
  });

  renderHistorial();
  showToast('Registro guardado ✓', 'success');
  limpiarFormulario();
}

// ---- LIMPIAR FORMULARIO ----
function limpiarFormulario() {
  document.getElementById('formRegistro').reset();
  ['nombreConductor','plataforma','categoria'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('section-resultado').style.display = 'none';
  ['carga','palet','rebote','24horas','pausa','nacional','uk','ndlf'].forEach(tipo =>
    document.getElementById(`lista-${tipo}`).innerHTML = '');
  adaptarPlataforma('', '');
}

// ---- SIDEBAR HISTORIAL ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('closed');
  document.getElementById('overlay').classList.toggle('active');
}

function renderHistorial() {
  const lista  = document.getElementById('listaHistorial');
  const filtro = (document.getElementById('filtroHistorial')?.value || '').toLowerCase();
  let regs = getRegistros().slice().reverse();
  if (filtro) regs = regs.filter(r =>
    r.nombreConductor.toLowerCase().includes(filtro) ||
    String(r.codigoConductor).includes(filtro));

  if (!regs.length) {
    lista.innerHTML = '<p style="padding:16px;color:#888;font-size:12px">Sin registros</p>';
    return;
  }
  lista.innerHTML = regs.map(r => {
    const total = r.plataforma === 'CAUDETE'
      ? `${(r.resultado?.TOTAL || 0).toFixed(2)} €`
      : `${(r.resultado?.sumDietas || 0).toFixed(2)} €`;
    return `<div class="hist-item">
      <div class="hist-nombre">${r.nombreConductor}
        <span class="hist-plat plat-${r.plataforma}-badge">${r.plataforma}</span>
      </div>
      <div class="hist-meta">${r.fechaSalida} → ${r.fechaLlegada} · ${r.diasTrabajados} días</div>
      <div class="hist-meta" style="margin-top:3px;font-weight:500;color:#4a7c59">${total}</div>
    </div>`;
  }).join('');
}

// ---- TABLAS BASE DE DATOS ----
function renderTablas() {
  // Conductores
  document.getElementById('tbody-conductores').innerHTML =
    getConductores().map(c => `<tr>
      <td>${c.PLATAFORMA}</td><td>${c.CATEGORIA}</td><td>${c.Codigo}</td>
      <td>${c.Nombre}</td><td>${c.NIF||''}</td>
      <td style="font-size:11px;font-family:monospace">${c.IBAN||''}</td>
      <td>${c.PrecioKmt}</td><td>${c.Email||''}</td>
      <td>
        <button class="btn-icon" onclick="editarConductor('${c.Codigo}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="confirmarEliminar('${c.Codigo}')" title="Eliminar">🗑️</button>
      </td>
    </tr>`).join('');

  // Tarifas
  document.getElementById('tbody-tarifas').innerHTML =
    getTarifas().map(t =>
      `<tr><td>${t.CONCEPTO}</td><td>${t.TJG}</td><td>${t.CAUDETE}</td><td>${t.FILARDI}</td></tr>`
    ).join('');
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
  document.getElementById('modal-title').textContent   = 'Editar Conductor';
  document.getElementById('m-codigo-original').value   = codigo;
  document.getElementById('m-plataforma').value        = c.PLATAFORMA;
  document.getElementById('m-categoria').value         = c.CATEGORIA;
  document.getElementById('m-codigo').value            = c.Codigo;
  document.getElementById('m-nombre').value            = c.Nombre;
  document.getElementById('m-nif').value               = c.NIF    || '';
  document.getElementById('m-iban').value              = c.IBAN   || '';
  document.getElementById('m-precio').value            = c.PrecioKmt || '';
  document.getElementById('m-email').value             = c.Email  || '';
  document.getElementById('modal-conductor').style.display = 'flex';
}

async function guardarConductor() {
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
  if (!conductor.Codigo || !conductor.Nombre) {
    showToast('Código y Nombre son obligatorios', 'error'); return;
  }
  await upsertConductor(conductor);
  renderTablas();
  cerrarModal();
  showToast('Conductor guardado ✓', 'success');
}

async function confirmarEliminar(codigo) {
  if (confirm(`¿Eliminar conductor ${codigo}?`)) {
    await eliminarConductor(codigo);
    renderTablas();
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
