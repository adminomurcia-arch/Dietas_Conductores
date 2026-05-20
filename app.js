// =============================================
// app.js — Lógica principal de la interfaz
// =============================================

let modoActual = 'detallado';

// ---- INIT ----
// Se llama desde index.html tras initDB() de Firebase
window._appReady = function() {
  renderTablas();
  renderHistorial();
  poblarSelectTractoras();
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
  document.getElementById('section-gastos-detallado').style.display = modo === 'detallado' ? 'block' : 'none';
  document.getElementById('section-gastos-resumido').style.display  = modo === 'resumido'  ? 'block' : 'none';
  calcularDietas();
}

// ---- AUTOCOMPLETAR POR CÓDIGO ----
function autocompletar() {
  const cod = document.getElementById('codConductor').value.trim();
  const c   = buscarConductor(cod);

  document.getElementById('nombreConductor').value = c?.Nombre    || '';
  document.getElementById('plataforma').value      = c?.PLATAFORMA|| '';
  document.getElementById('categoria').value       = c?.CATEGORIA || '';

  // Bloquear/desbloquear formulario
  const bloqueado = cod.length > 0 && !c;
  document.querySelectorAll('#formRegistro input:not(#codConductor), #formRegistro select, #formRegistro button[type="submit"]')
    .forEach(el => el.disabled = bloqueado);
  document.getElementById('codConductor').style.borderColor = bloqueado ? '#c0392b' : '';
  if (bloqueado) { showToast('Código de conductor no encontrado', 'error'); }

  // Tractora: recuperar última usada por este conductor
  if (c) {
    const ultimaTractora = localStorage.getItem(`tractora_${cod}`) || '';
    const sel = document.getElementById('tractora');
    if (ultimaTractora && sel.querySelector(`option[value="${ultimaTractora}"]`)) {
      sel.value = ultimaTractora;
    }
    // Coef. Nacional: recuperar último valor usado por este conductor
    const ultimoCoef = localStorage.getItem(`coef_${cod}`);
    if (ultimoCoef !== null) {
      document.getElementById('coefNacional').value = ultimoCoef;
    }
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

  // Kilómetros — siempre visible, badge informativo en CAUDETE
  document.getElementById('section-kms').style.display = 'block';
  document.getElementById('kms-nota').style.display    = esCaudete ? '' : 'none';
  const kmS = document.getElementById('kmSalida');
  const kmV = document.getElementById('kmVuelta');
  if (sinKm) {
    kmS.value = ''; kmV.value = '';
    document.getElementById('totalKm').value = 12000;
    kmS.readOnly = kmV.readOnly = true;
    // Ocultar campos de entrada — no tiene sentido para PESCADO/COMODIN
    kmS.closest('.field').style.display = 'none';
    kmV.closest('.field').style.display = 'none';
  } else {
    kmS.readOnly = kmV.readOnly = false;
    kmS.closest('.field').style.display = '';
    kmV.closest('.field').style.display = '';
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

  const tractora = document.getElementById('tractora').value;
  const coefNac  = document.getElementById('coefNacional').value;
  const cod      = document.getElementById('codConductor').value.trim();
  if (tractora) localStorage.setItem(`tractora_${cod}`, tractora);
  if (coefNac)  localStorage.setItem(`coef_${cod}`, coefNac);

  await addRegistro({
    codigoConductor: document.getElementById('codConductor').value.trim(),
    nombreConductor: document.getElementById('nombreConductor').value,
    tractora,
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
    kmSalida:        parseKm(document.getElementById('kmSalida').value),
    kmVuelta:        parseKm(document.getElementById('kmVuelta').value),
    totalKm:         parseKm(document.getElementById('totalKm').value),
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
    gastosViaje:     modoActual === 'detallado' ? leerGastosDetallados() : (parseFloat(document.getElementById('gastosViaje').value) || 0),
    gastosDetalle:   modoActual === 'detallado' ? leerGastosDetallados(true) : [],
    anticipos:       parseFloat(document.getElementById('anticipos').value)        || 0,
    modo:            modoActual,
    resultado,
  });

  renderHistorial();
  showToast('Registro guardado ✓', 'success');
  limpiarFormulario();
}

// ---- GASTOS DETALLADOS ----
function addGasto() {
  const lista = document.getElementById('lista-gastos');
  const row   = document.createElement('div');
  row.className = 'gasto-row';
  const hoy = new Date().toISOString().slice(0,10);

  // Construir opciones de conceptos
  const opts = getConceptos().map(c =>
    `<option value="${c.nombre}">${c.nombre}</option>`
  ).join('');

  row.innerHTML = `
    <input type="date" value="${hoy}" max="${hoy}">
    <select>${opts}</select>
    <input type="text" placeholder="Lugar">
    <select><option value="€">€ EUR</option><option value="£">£ GBP</option>
      <option value="$">$ USD</option><option value="Otro">Otro</option></select>
    <input type="number" min="0" step="0.01" value="0" placeholder="Importe"
           oninput="actualizarTotalGastos()">
    <button type="button" class="btn-del" onclick="this.parentElement.remove();actualizarTotalGastos()">🗑</button>
  `;
  lista.appendChild(row);
  actualizarTotalGastos();
}

function actualizarTotalGastos() {
  const rows  = document.querySelectorAll('#lista-gastos .gasto-row');
  const total = Array.from(rows).reduce((s, r) => {
    return s + (parseFloat(r.querySelectorAll('input[type="number"]')[0]?.value) || 0);
  }, 0);
  const div = document.getElementById('gastos-total');
  if (rows.length > 0) {
    div.style.display = 'block';
    div.textContent   = `Total Gastos: ${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
  } else {
    div.style.display = 'none';
  }
}

function leerGastosDetallados(comoArray = false) {
  const rows = document.querySelectorAll('#lista-gastos .gasto-row');
  const gastos = Array.from(rows).map(r => {
    const inputs  = r.querySelectorAll('input');
    const selects = r.querySelectorAll('select');
    return {
      fecha:    inputs[0].value,
      concepto: selects[0].value,
      lugar:    inputs[1].value,
      moneda:   selects[1].value,
      importe:  parseFloat(inputs[2].value) || 0,
    };
  }).filter(g => g.importe > 0);

  if (comoArray) return gastos;
  return gastos.reduce((s, g) => s + g.importe, 0);
}

// ---- LIMPIAR FORMULARIO ----
function limpiarFormulario() {
  document.getElementById('formRegistro').reset();
  ['nombreConductor','plataforma','categoria'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('section-resultado').style.display = 'none';
  document.getElementById('lista-gastos').innerHTML = '';
  document.getElementById('gastos-total').style.display = 'none';
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
      ? `${(r.resultado?.TOTAL || 0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`
      : `${(r.resultado?.sumDietas || 0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
    const edDietas = r.estadoDietas || 'pendiente';
    const edGastos = r.estadoGastos || 'pendiente';
    return `<div class="hist-item">
      <div class="hist-nombre">${r.nombreConductor}
        <span class="hist-plat plat-${r.plataforma}-badge">${r.plataforma}</span>
      </div>
      <div class="hist-meta">${r.fechaSalida} → ${r.fechaLlegada} · ${r.diasTrabajados} días</div>
      <div class="hist-meta" style="margin-top:3px;font-weight:500;color:#4a7c59">${total}</div>
      <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
        <span class="estado-badge estado-${edDietas}" style="cursor:pointer"
          onclick="abrirModalEstado('${r.id}','dietas','${edDietas}')">💰 ${edDietas}</span>
        <span class="estado-badge estado-${edGastos}" style="cursor:pointer"
          onclick="abrirModalEstado('${r.id}','gastos','${edGastos}')">🧾 ${edGastos}</span>
      </div>
      <div style="display:flex;gap:4px;margin-top:6px">
        <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px"
          onclick="editarRegistro('${r.id}')">✏️ Editar</button>
        <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;color:#c0392b"
          onclick="borrarRegistro('${r.id}')">🗑️</button>
      </div>
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

  // Tarifas — celdas editables directamente
  document.getElementById('tbody-tarifas').innerHTML =
    getTarifas().map(t => `<tr>
      <td><strong>${t.CONCEPTO}</strong></td>
      ${['TJG','CAUDETE','FILARDI'].map(plat => `
        <td>
          <input type="number" value="${t[plat]}" step="0.01" min="0"
            style="width:80px;padding:4px 6px;border:1px solid var(--border);
                   border-radius:4px;font-size:13px;font-family:var(--font)"
            onchange="guardarTarifa('${t.CONCEPTO}','${plat}',this.value)"
            onfocus="this.style.borderColor='var(--primary)'"
            onblur="this.style.borderColor='var(--border)'">
        </td>`).join('')}
    </tr>`).join('');

  // Tractoras
  renderTablaTractoras();

  // Conceptos
  renderTablaConceptos();
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

// ---- TARIFAS ----
async function guardarTarifa(concepto, plataforma, valor) {
  await upsertTarifa(concepto, plataforma, valor);
  showToast(`Tarifa actualizada ✓`, 'success');
}

// ---- TRACTORAS ----
function poblarSelectTractoras() {
  const sel = document.getElementById('tractora');
  const actual = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar —</option>';
  getTractoras().forEach(t => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = t.matricula;
    sel.appendChild(opt);
  });
  if (actual) sel.value = actual;
}

function renderTablaTractoras() {
  document.getElementById('tbody-tractoras').innerHTML =
    getTractoras().map(t => `<tr>
      <td>${t.matricula}</td>
      <td>
        <button class="btn-icon" onclick="editarTractora('${t.matricula}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="confirmarEliminarTractora('${t.matricula}')" title="Eliminar">🗑️</button>
      </td>
    </tr>`).join('');
}

function nuevaTractora() {
  document.getElementById('t-matricula-original').value = '';
  document.getElementById('t-matricula').value = '';
  document.getElementById('modal-tractora').style.display = 'flex';
}

function editarTractora(matricula) {
  document.getElementById('t-matricula-original').value = matricula;
  document.getElementById('t-matricula').value = matricula;
  document.getElementById('modal-tractora').style.display = 'flex';
}

async function guardarTractora() {
  const mat      = document.getElementById('t-matricula').value.trim().toUpperCase();
  const original = document.getElementById('t-matricula-original').value;
  if (!mat) { showToast('Introduce una matrícula', 'error'); return; }
  await upsertTractora(mat, original || null);
  renderTablaTractoras();
  poblarSelectTractoras();
  cerrarModalTractora();
  showToast('Tractora guardada ✓', 'success');
}

async function confirmarEliminarTractora(matricula) {
  if (confirm(`¿Eliminar tractora ${matricula}?`)) {
    await eliminarTractora(matricula);
    renderTablaTractoras();
    poblarSelectTractoras();
    showToast('Tractora eliminada');
  }
}

function cerrarModalTractora() {
  document.getElementById('modal-tractora').style.display = 'none';
}

// ---- CONCEPTOS DE GASTO ----
function renderTablaConceptos() {
  document.getElementById('tbody-conceptos').innerHTML =
    getConceptos().map(c => `<tr>
      <td>${c.nombre}</td>
      <td>
        <button class="btn-icon" onclick="editarConcepto('${c.id}','${c.nombre}')">✏️</button>
        <button class="btn-icon" onclick="confirmarEliminarConcepto('${c.id}','${c.nombre}')">🗑️</button>
      </td>
    </tr>`).join('');
}

function nuevoConcepto() {
  document.getElementById('c-id-original').value = '';
  document.getElementById('c-nombre').value = '';
  document.getElementById('modal-concepto').style.display = 'flex';
}

function editarConcepto(id, nombre) {
  document.getElementById('c-id-original').value = id;
  document.getElementById('c-nombre').value = nombre;
  document.getElementById('modal-concepto').style.display = 'flex';
}

async function guardarConcepto() {
  const nombre   = document.getElementById('c-nombre').value.trim();
  const idOrig   = document.getElementById('c-id-original').value;
  if (!nombre) { showToast('Introduce un nombre', 'error'); return; }
  await upsertConcepto({ id: idOrig || null, nombre });
  renderTablaConceptos();
  cerrarModalConcepto();
  showToast('Concepto guardado ✓', 'success');
}

async function confirmarEliminarConcepto(id, nombre) {
  if (confirm(`¿Eliminar concepto "${nombre}"?`)) {
    await eliminarConcepto(id);
    renderTablaConceptos();
    showToast('Concepto eliminado');
  }
}

function cerrarModalConcepto() {
  document.getElementById('modal-concepto').style.display = 'none';
}

// ---- EDITAR / BORRAR REGISTROS ----
async function editarRegistro(id) {
  const r = getRegistros().find(x => x.id === id);
  if (!r) return;
  // Cargar datos en formulario
  document.getElementById('codConductor').value    = r.codigoConductor;
  autocompletar();
  document.getElementById('fechaSalida').value     = r.fechaSalida;
  document.getElementById('fechaLlegada').value    = r.fechaLlegada;
  document.getElementById('horaSalida').value      = r.horaSalida  || '';
  document.getElementById('horaLlegada').value     = r.horaLlegada || '';
  document.getElementById('coefNacional').value    = r.coefNacional || 0;
  document.getElementById('kmSalida').value        = r.kmSalida    || '';
  document.getElementById('kmVuelta').value        = r.kmVuelta    || '';
  document.getElementById('totalKm').value         = r.totalKm     || '';
  document.getElementById('acarreos').value        = r.acarreos    || 0;
  document.getElementById('dietaVlissingen').value = r.dietaVlissingen || 0;
  document.getElementById('extras').value          = r.extras      || 0;
  document.getElementById('anticipos').value       = r.anticipos   || 0;
  // Marcar el registro que se está editando
  document.getElementById('formRegistro').dataset.editId = id;
  document.getElementById('formRegistro').querySelector('button[type="submit"]').textContent = '💾 Actualizar Registro';
  // Recalcular
  calcularTiempos();
  // Cerrar sidebar y hacer scroll al formulario
  if (!document.getElementById('sidebar').classList.contains('closed')) toggleSidebar();
  document.getElementById('formRegistro').scrollIntoView({ behavior: 'smooth' });
  showToast('Registro cargado para editar', '');
}

async function borrarRegistro(id) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  await deleteRegistro(id);
  renderHistorial();
  showToast('Registro eliminado');
}

// ---- ESTADOS ----
function abrirModalEstado(id, tipo, estadoActual) {
  document.getElementById('estado-reg-id').value  = id;
  document.getElementById('estado-tipo').value    = tipo;
  document.getElementById('estado-titulo').textContent =
    tipo === 'dietas' ? '💰 Estado Dietas' : '🧾 Estado Gastos';
  const sel = document.getElementById('estado-valor');
  // Mostrar opciones según tipo
  sel.innerHTML = tipo === 'dietas'
    ? `<option value="pendiente">🟡 Pendiente</option>
       <option value="liquidado">🟢 Liquidado</option>
       <option value="bloqueado">🔒 Bloqueado</option>`
    : `<option value="pendiente">🟡 Pendiente</option>
       <option value="pagado">🟢 Pagado</option>
       <option value="bloqueado">🔒 Bloqueado</option>`;
  sel.value = estadoActual;
  document.getElementById('modal-estado').style.display = 'flex';
}

async function confirmarCambioEstado() {
  const id    = document.getElementById('estado-reg-id').value;
  const tipo  = document.getElementById('estado-tipo').value;
  const valor = document.getElementById('estado-valor').value;
  if (tipo === 'dietas') await setEstadoDietas(id, valor);
  else                   await setEstadoGastos(id, valor);
  cerrarModalEstado();
  showToast('Estado actualizado ✓', 'success');
}

function cerrarModalEstado() {
  document.getElementById('modal-estado').style.display = 'none';
}

// ---- LIQUIDACIONES ----
function showLiqTab(tab) {
  document.querySelectorAll('.liq-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.liq-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`liq-${tab}`).style.display = 'block';
  event.currentTarget.classList.add('active');
  if (tab === 'dietas')     cargarLiqDietas();
  if (tab === 'gastos')     cargarLiqGastos();
  if (tab === 'validacion') cargarLiqValidacion();
}

function cargarLiqDietas() {
  const plat   = document.getElementById('liq-d-plat').value;
  const cod    = document.getElementById('liq-d-conductor').value.trim();
  const desde  = document.getElementById('liq-d-desde').value;
  const hasta  = document.getElementById('liq-d-hasta').value;
  const estado = document.getElementById('liq-d-estado').value;

  let regs = getRegistros().filter(r => (r.estadoDietas || 'pendiente') === estado);
  if (plat)  regs = regs.filter(r => r.plataforma === plat);
  if (cod)   regs = regs.filter(r => String(r.codigoConductor) === cod);
  if (desde) regs = regs.filter(r => r.fechaSalida >= desde);
  if (hasta) regs = regs.filter(r => r.fechaSalida <= hasta);

  const tbody = document.getElementById('tbody-liq-dietas');
  tbody.innerHTML = regs.map(r => {
    const total = r.plataforma === 'CAUDETE'
      ? (r.resultado?.TOTAL || 0) : (r.resultado?.sumDietas || 0);
    return `<tr>
      <td><input type="checkbox" class="chk-liq-d" data-id="${r.id}"
          data-total="${total}" onchange="actualizarTotalLiqDietas()"></td>
      <td>${r.nombreConductor}<br><small>${r.codigoConductor}</small></td>
      <td><span class="hist-plat plat-${r.plataforma}-badge">${r.plataforma}</span></td>
      <td>${r.fechaSalida} → ${r.fechaLlegada}</td>
      <td>${r.diasTrabajados}</td>
      <td style="font-family:var(--font-mono);text-align:right">${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</td>
      <td><span class="estado-badge estado-${r.estadoDietas||'pendiente'}">${r.estadoDietas||'pendiente'}</span></td>
      <td><button class="btn-icon" onclick="abrirModalEstado('${r.id}','dietas','${r.estadoDietas||'pendiente'}')">✏️</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#888">Sin registros</td></tr>';

  actualizarTotalLiqDietas();
}

function actualizarTotalLiqDietas() {
  const total = Array.from(document.querySelectorAll('.chk-liq-d:checked'))
    .reduce((s, c) => s + parseFloat(c.dataset.total || 0), 0);
  document.getElementById('liq-d-total').textContent = `${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
}

function liqDietasToggleTodos() {
  const todos = document.getElementById('chk-d-todos').checked;
  document.querySelectorAll('.chk-liq-d').forEach(c => c.checked = todos);
  actualizarTotalLiqDietas();
}

function liqDietasMarcarTodos() {
  document.querySelectorAll('.chk-liq-d').forEach(c => c.checked = true);
  document.getElementById('chk-d-todos').checked = true;
  actualizarTotalLiqDietas();
}

async function liqDietasLiquidar() {
  const ids = Array.from(document.querySelectorAll('.chk-liq-d:checked')).map(c => c.dataset.id);
  if (!ids.length) { showToast('Selecciona al menos un registro', 'error'); return; }
  if (!confirm(`¿Liquidar ${ids.length} registro(s)?`)) return;
  await liquidarRegistros(ids);
  showToast(`${ids.length} registros liquidados ✓`, 'success');
  cargarLiqDietas();
}

function cargarLiqGastos() {
  const cod    = document.getElementById('liq-g-conductor').value.trim();
  const desde  = document.getElementById('liq-g-desde').value;
  const hasta  = document.getElementById('liq-g-hasta').value;
  const estado = document.getElementById('liq-g-estado').value;

  // Solo registros con gastos > 0
  let regs = getRegistros().filter(r =>
    (r.estadoGastos || 'pendiente') === estado &&
    ((r.gastosDetalle?.length > 0) || (r.gastosViaje > 0))
  );
  if (cod)   regs = regs.filter(r => String(r.codigoConductor) === cod);
  if (desde) regs = regs.filter(r => r.fechaSalida >= desde);
  if (hasta) regs = regs.filter(r => r.fechaSalida <= hasta);

  const conductores = getConductores();
  const tbody = document.getElementById('tbody-liq-gastos');
  tbody.innerHTML = regs.map(r => {
    const c     = conductores.find(x => String(x.Codigo) === String(r.codigoConductor));
    const total = r.gastosDetalle?.reduce((s,g) => s + g.importe, 0) || r.gastosViaje || 0;
    return `<tr>
      <td><input type="checkbox" class="chk-liq-g" data-id="${r.id}"
          data-total="${total}" data-iban="${c?.IBAN||''}"
          data-nombre="${r.nombreConductor}"
          onchange="actualizarTotalLiqGastos()"></td>
      <td>${r.nombreConductor}<br><small>${r.codigoConductor}</small></td>
      <td style="font-size:11px;font-family:monospace">${c?.IBAN||'—'}</td>
      <td>${r.fechaSalida} → ${r.fechaLlegada}</td>
      <td style="font-family:var(--font-mono);text-align:right">${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</td>
      <td><span class="estado-badge estado-${r.estadoGastos||'pendiente'}">${r.estadoGastos||'pendiente'}</span></td>
      <td><button class="btn-icon" onclick="abrirModalEstado('${r.id}','gastos','${r.estadoGastos||'pendiente'}')">✏️</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">Sin registros con gastos</td></tr>';

  actualizarTotalLiqGastos();
}

function actualizarTotalLiqGastos() {
  const total = Array.from(document.querySelectorAll('.chk-liq-g:checked'))
    .reduce((s, c) => s + parseFloat(c.dataset.total || 0), 0);
  document.getElementById('liq-g-total').textContent = `${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
}

function liqGastosToggleTodos() {
  const todos = document.getElementById('chk-g-todos').checked;
  document.querySelectorAll('.chk-liq-g').forEach(c => c.checked = todos);
  actualizarTotalLiqGastos();
}

function liqGastosMarcarTodos() {
  document.querySelectorAll('.chk-liq-g').forEach(c => c.checked = true);
  document.getElementById('chk-g-todos').checked = true;
  actualizarTotalLiqGastos();
}

async function liqGastosPagar() {
  const ids = Array.from(document.querySelectorAll('.chk-liq-g:checked')).map(c => c.dataset.id);
  if (!ids.length) { showToast('Selecciona al menos un registro', 'error'); return; }
  if (!confirm(`¿Marcar como pagados los gastos de ${ids.length} registro(s)?`)) return;
  await pagarGastosRegistros(ids);
  showToast(`${ids.length} registros marcados como pagados ✓`, 'success');
  cargarLiqGastos();
}

function liqGastosXML() {
  const checks = document.querySelectorAll('.chk-liq-g:checked');
  if (!checks.length) { showToast('Selecciona al menos un registro', 'error'); return; }
  // Pre-rellenar modal SEPA con datos memorizados
  const mem = JSON.parse(localStorage.getItem('sepa_config') || '{}');
  document.getElementById('sepa-nombre').value   = mem.nombre   || '';
  document.getElementById('sepa-iban').value     = mem.iban     || '';
  document.getElementById('sepa-bic').value      = mem.bic      || '';
  document.getElementById('sepa-concepto').value = mem.concepto || `Gastos viaje ${new Date().toLocaleDateString('es-ES',{month:'2-digit',year:'numeric'})}`;
  document.getElementById('modal-sepa').style.display = 'flex';
}

function cerrarModalSEPA() {
  document.getElementById('modal-sepa').style.display = 'none';
}

function generarXMLSEPA() {
  const nombre   = document.getElementById('sepa-nombre').value.trim();
  const iban     = document.getElementById('sepa-iban').value.trim().replace(/\s/g,'');
  const bic      = document.getElementById('sepa-bic').value.trim();
  const concepto = document.getElementById('sepa-concepto').value.trim();

  if (!nombre || !iban || !bic) { showToast('Completa todos los campos obligatorios', 'error'); return; }

  // Memorizar config
  localStorage.setItem('sepa_config', JSON.stringify({ nombre, iban, bic, concepto }));

  const checks = Array.from(document.querySelectorAll('.chk-liq-g:checked'));
  const fecha  = new Date().toISOString().slice(0,10);
  const msgId  = `MSG${Date.now()}`;
  let totalSum = 0;
  let txs = '';

  checks.forEach((c, i) => {
    const importe = parseFloat(c.dataset.total || 0);
    if (!importe || !c.dataset.iban) return;
    totalSum += importe;
    txs += `
    <CdtTrfTxInf>
      <PmtId><EndToEndId>TX${i+1}-${msgId}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="EUR">${importe.toFixed(2)}</InstdAmt></Amt>
      <CdtrAgt><FinInstnId><BICFI>${bic}</BICFI></FinInstnId></CdtrAgt>
      <Cdtr><Nm>${c.dataset.nombre.substring(0,70)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${c.dataset.iban}</IBAN></Id></CdtrAcct>
      <RmtInf><Ustrd>${concepto.substring(0,140)}</Ustrd></RmtInf>
    </CdtTrfTxInf>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString().slice(0,19)}</CreDtTm>
      <NbOfTxs>${checks.length}</NbOfTxs>
      <CtrlSum>${totalSum.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${nombre.substring(0,70)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT${msgId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${checks.length}</NbOfTxs>
      <CtrlSum>${totalSum.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${fecha}</ReqdExctnDt>
      <Dbtr><Nm>${nombre.substring(0,70)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${iban}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BICFI>${bic}</BICFI></FinInstnId></DbtrAgt>
      ${txs}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  const blob = new Blob([xml], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `sepa_gastos_${fecha}.xml`;
  a.click();
  URL.revokeObjectURL(url);
  cerrarModalSEPA();
  showToast('XML SEPA generado ✓', 'success');
}

function cargarLiqValidacion() {
  const cod  = document.getElementById('liq-v-conductor').value.trim();
  let regs = getRegistros().filter(r => r.estadoDietas === 'pendiente_validacion');
  if (cod) regs = regs.filter(r => String(r.codigoConductor) === cod);

  const tbody = document.getElementById('tbody-liq-validacion');
  tbody.innerHTML = regs.map(r => {
    const total = r.plataforma === 'CAUDETE'
      ? (r.resultado?.TOTAL||0) : (r.resultado?.sumDietas||0);
    return `<tr>
      <td>${r.nombreConductor}<br><small>${r.codigoConductor}</small></td>
      <td><span class="hist-plat plat-${r.plataforma}-badge">${r.plataforma}</span></td>
      <td>${r.fechaSalida} → ${r.fechaLlegada}</td>
      <td>${r.diasTrabajados}</td>
      <td style="font-family:var(--font-mono);text-align:right">${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</td>
      <td><span class="estado-badge" style="background:#fce7f3;color:#9d174d">📱 Móvil</span></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-primary" style="padding:4px 10px;font-size:12px"
          onclick="aprobarRegistro('${r.id}')">✅ Aprobar</button>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:12px;color:#c0392b"
          onclick="rechazarRegistro('${r.id}')">❌ Rechazar</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">Sin registros pendientes de validación</td></tr>';
}

async function aprobarRegistro(id) {
  await setEstadoDietas(id, 'pendiente');
  showToast('Registro aprobado ✓', 'success');
  cargarLiqValidacion();
}

async function rechazarRegistro(id) {
  if (!confirm('¿Rechazar y eliminar este registro?')) return;
  await deleteRegistro(id);
  showToast('Registro rechazado y eliminado');
  cargarLiqValidacion();
}

async function liqValidarTodos() {
  const ids = getRegistros()
    .filter(r => r.estadoDietas === 'pendiente_validacion')
    .map(r => r.id);
  if (!ids.length) { showToast('No hay registros pendientes', 'error'); return; }
  if (!confirm(`¿Aprobar todos los ${ids.length} registros pendientes?`)) return;
  await Promise.all(ids.map(id => setEstadoDietas(id, 'pendiente')));
  showToast(`${ids.length} registros aprobados ✓`, 'success');
  cargarLiqValidacion();
}

// ---- TOAST ----
function showToast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${tipo} show`;
  setTimeout(() => t.className = 'toast', 3000);
}
