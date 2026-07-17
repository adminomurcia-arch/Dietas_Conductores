// =============================================
// app.js — Lógica principal de la interfaz
// =============================================

let modoActual = 'detallado';
let _finiquitoIds = [];
let _finiquitoConductor = '';
let _pagoEmbargoRows = [];

// ---- AVISO AL SALIR CON EDICIÓN ACTIVA ----
window.addEventListener('beforeunload', e => {
  const editId = document.getElementById('formRegistro')?.dataset.editId;
  if (editId) {
    e.preventDefault();
    e.returnValue = 'Tienes una edición en curso. ¿Seguro que quieres salir?';
  }
});

// ---- INIT ----
// Se llama desde index.html tras initDB() de Firebase
window._appReady = function() {
  renderTablas();
  renderHistorial();
  poblarInfConductoresDatalist();
  poblarSelectTractoras();
  setModo('detallado');
  fijarLimiteFechas();
  if (typeof cargarGastosInd === 'function') cargarGastosInd();
  if (typeof cargarAnticipos === 'function') cargarAnticipos();
  if (typeof cargarEmbargos === 'function') cargarEmbargos();
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
  // Poblar multi-select de liquidaciones al abrir la pestaña de informes
  if (tab === 'informes' && typeof msPoblar === 'function') {
    msPoblar('conductor', '');
    msPoblar('gestoria', '');
    msPoblar('rrhh', '');
    msPoblar('gastos', '');
  }
  // Inicializar módulo de nóminas
  if (tab === 'nominas') nomInicializar();
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

// ---- AUTOCOMPLETE: filtrar conductores por código o nombre ----
function filtrarConductores(query) {
  const sugerencias = document.getElementById('conductorSugerencias');
  const q = query.trim().toLowerCase();

  if (!q) {
    sugerencias.style.display = 'none';
    sugerencias.innerHTML = '';
    return;
  }

  const lista = getConductores().filter(c => {
    return c.Codigo.toLowerCase().includes(q) ||
           c.Nombre.toLowerCase().includes(q);
  }).slice(0, 10); // máximo 10 resultados

  if (!lista.length) {
    sugerencias.style.display = 'none';
    sugerencias.innerHTML = '';
    return;
  }

  sugerencias.innerHTML = lista.map(c => `
    <div onclick="seleccionarConductor('${c.Codigo}')"
      style="padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--border);
             display:flex;align-items:center;gap:10px;font-size:13px;
             transition:background .15s"
      onmouseover="this.style.background='var(--surface-hover,#f0f4ee)'"
      onmouseout="this.style.background=''">
      <span style="font-family:var(--font-mono);color:var(--primary);min-width:58px">${c.Codigo}</span>
      <span style="flex:1;color:var(--text)">${c.Nombre}</span>
      <span style="font-size:11px;color:var(--soft);background:var(--bg);
                   padding:2px 7px;border-radius:10px">${c.PLATAFORMA}</span>
    </div>
  `).join('');

  sugerencias.style.display = 'block';
}

function seleccionarConductor(codigo) {
  const sugerencias = document.getElementById('conductorSugerencias');
  const c = buscarConductor(codigo);
  if (!c) return;

  // Rellenar el campo de búsqueda con código + nombre
  document.getElementById('buscarConductorInput').value = `${c.Codigo} — ${c.Nombre}`;
  // Guardar código en el campo oculto
  document.getElementById('codConductor').value = c.Codigo;
  // Ocultar sugerencias
  sugerencias.style.display = 'none';
  sugerencias.innerHTML = '';
  // Ejecutar el relleno del formulario
  autocompletar();
}

// Cerrar sugerencias al hacer clic fuera
document.addEventListener('click', function(e) {
  const input = document.getElementById('buscarConductorInput');
  const sugerencias = document.getElementById('conductorSugerencias');
  if (input && sugerencias && !input.contains(e.target) && !sugerencias.contains(e.target)) {
    sugerencias.style.display = 'none';
  }
});

// ---- AUTOCOMPLETAR POR CÓDIGO ----
function autocompletar() {
  const cod = document.getElementById('codConductor').value.trim();
  const c   = buscarConductor(cod);

  // Normalizar a 6 dígitos en el campo
  if (c) document.getElementById('codConductor').value = c.Codigo;

  document.getElementById('nombreConductor').value = c?.Nombre    || '';
  document.getElementById('plataforma').value      = c?.PLATAFORMA|| '';
  document.getElementById('categoria').value       = c?.CATEGORIA || '';

  // Bloquear/desbloquear formulario
  const bloqueado = cod.length > 0 && !c;
  document.querySelectorAll('#formRegistro input:not(#codConductor), #formRegistro select, #btn-guardar')
    .forEach(el => el.disabled = bloqueado);
  document.getElementById('codConductor').style.borderColor = bloqueado ? '#c0392b' : '';
  if (bloqueado) { showToast('Código de conductor no encontrado', 'error'); }

  // Equipaje: mostrar valor del conductor y ajustar coefNacional por defecto
  const equipaje = c?.EQUIPAJE || '';
  document.getElementById('equipaje').value = equipaje;
  const catUpp = (c?.CATEGORIA || '').toUpperCase();
  const esSinKmCat = ['COMODIN','PESCADO'].includes(catUpp);
  if (esSinKmCat) {
    // COMODÍN/PESCADO: días se calculan al rellenar fechas (calcularTiempos)
    // Solo actualizar coefNacional si ya hay fechas en el formulario
    const fs = document.getElementById('fechaSalida').value;
    const fl = document.getElementById('fechaLlegada').value;
    if (fs && fl) {
      const diasFechas = Math.round((parseFecha(fl) - parseFecha(fs)) / 86400000) + 1;
      if (diasFechas > 0) {
        document.getElementById('coefNacional').value   = diasFechas;
        document.getElementById('diasTrabajados').value = diasFechas;
      }
    }
  } else if (equipaje === 'SIMPLE') {
    document.getElementById('coefNacional').value = 2.7;
  } else if (equipaje === 'DOBLE') {
    document.getElementById('coefNacional').value = 1.30;
  }

  // Tractora: recuperar la asignada en Firestore (con fallback a localStorage)
  if (c) {
    const ultimaTractora = c.tractoraAsignada || localStorage.getItem(`tractora_${cod}`) || '';
    const sel = document.getElementById('tractora');
    if (ultimaTractora) {
      if (sel.querySelector(`option[value="${ultimaTractora}"]`)) {
        sel.value = ultimaTractora;
      } else {
        const opt = document.createElement('option');
        opt.value = opt.textContent = ultimaTractora;
        sel.appendChild(opt);
        sel.value = ultimaTractora;
      }
    }
    // Coef. Nacional: equipaje tiene prioridad; localStorage solo si no hay equipaje definido
    if (!equipaje) {
      const ultimoCoef = localStorage.getItem(`coef_${cod}`);
      if (ultimoCoef !== null) {
        document.getElementById('coefNacional').value = ultimoCoef;
      }
    }
  }

  // Pareja — validar y mostrar nombre si EQUIPAJE=DOBLE
  const parejaEl = document.getElementById('pareja');
  const parejaLabel = document.getElementById('pareja-label');
  if (equipaje === 'DOBLE' && c?.PAREJA) {
    const codPareja = String(c.PAREJA).padStart(6, '0');
    const condPareja = buscarConductor(codPareja);
    if (condPareja) {
      parejaEl.value = `${c.PAREJA} — ${condPareja.Nombre}`;
      if (parejaLabel) parejaLabel.style.color = 'var(--primary)';
    } else {
      parejaEl.value = `${c.PAREJA} — ⚠️ No encontrado`;
      if (parejaLabel) parejaLabel.style.color = '#c0392b';
    }
  } else {
    parejaEl.value = c?.PAREJA || '';
    if (parejaLabel) parejaLabel.style.color = '';
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
  const tkEl = document.getElementById('totalKm');
  if (sinKm) {
    kmS.value = ''; kmV.value = '';
    if (!parseKm(tkEl.value)) tkEl.value = (12000).toLocaleString('es-ES');
    kmS.readOnly = kmV.readOnly = true;
    tkEl.readOnly = false;
    tkEl.classList.remove('readonly', 'calc');
    // Ocultar campos de entrada — no tiene sentido para PESCADO/COMODIN
    kmS.closest('.field').style.display = 'none';
    kmV.closest('.field').style.display = 'none';
  } else {
    kmS.readOnly = kmV.readOnly = false;
    tkEl.readOnly = true;
    tkEl.classList.add('readonly', 'calc');
    kmS.closest('.field').style.display = '';
    kmV.closest('.field').style.display = '';
    if (!plataforma) tkEl.value = '';
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

  const exC = document.getElementById('extrasConcepto'); if(exC) exC.value = '';
  document.getElementById('section-resultado').style.display = 'none';

  // Obligatoriedad de fechas y km según categoría
  const esSinKm2 = sinKm;
  const fsEl = document.getElementById('fechaSalida');
  const flEl = document.getElementById('fechaLlegada');
  const kmSEl = document.getElementById('kmSalida');
  const kmVEl = document.getElementById('kmVuelta');
  fsEl.required = !esSinKm2;
  flEl.required = !esSinKm2;
  // Km no usan required nativo (son texto), se validan en guardarRegistro
}

// ---- AÑADIR FILA DE OPERACIÓN (DETALLADO) ----
function renumerarOperaciones(tipo) {
  document.querySelectorAll(`#lista-${tipo} .operacion-row`).forEach((row, i) => {
    const span = row.querySelector('.op-num');
    if (span) span.textContent = i + 1;
  });
}

function addOperacion(tipo) {
  const lista = document.getElementById(`lista-${tipo}`);
  const n = lista.querySelectorAll('.operacion-row').length + 1;
  const row = document.createElement('div');
  row.className = 'operacion-row';

  if (tipo === '24horas' || tipo === 'pausa') {
    row.innerHTML = `
      <span class="op-num" style="min-width:22px;text-align:center;font-weight:600;
        color:var(--primary);font-size:13px;align-self:start;padding-top:4px">${n}</span>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div>
          <div style="font-size:10px;color:var(--soft);margin-bottom:2px">Fecha inicio</div>
          <input type="date" data-field="fechaInicio" onchange="calcularDietas()">
        </div>
        <div>
          <div style="font-size:10px;color:var(--soft);margin-bottom:2px">Hora inicio</div>
          <input type="time" data-field="horaInicio">
        </div>
        <div>
          <div style="font-size:10px;color:var(--soft);margin-bottom:2px">Fecha fin</div>
          <input type="date" data-field="fechaFin" onchange="calcularDietas()">
        </div>
        <div>
          <div style="font-size:10px;color:var(--soft);margin-bottom:2px">Hora fin</div>
          <input type="time" data-field="horaFin">
        </div>
        <div>
          <div style="font-size:10px;color:var(--soft);margin-bottom:2px">Horas</div>
          <input type="text" data-field="horas" readonly
            style="background:var(--calc-bg,#eaf4ef);color:var(--calc-text,#2a5c40);font-weight:600">
        </div>
        <div>
          <div style="font-size:10px;color:var(--soft);margin-bottom:2px">Lugar</div>
          <input type="text" data-field="lugar" placeholder="Lugar"
            oninput="this.value=this.value.toUpperCase()">
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:10px;color:var(--soft);margin-bottom:2px">Observaciones</div>
          <input type="text" data-field="obs" placeholder="Texto libre (opcional)">
        </div>
      </div>
      <button type="button" class="btn-del" onclick="this.parentElement.remove();renumerarOperaciones('${tipo}');calcularDietas()">🗑</button>
    `;
  } else {
    row.innerHTML = `
      <span class="op-num" style="min-width:22px;text-align:center;font-weight:600;
        color:var(--primary);font-size:13px;align-self:center">${n}</span>
      <input type="date">
      <input type="text" placeholder="Lugar" oninput="this.value=this.value.toUpperCase()">
      <button type="button" class="btn-del" onclick="this.parentElement.remove();renumerarOperaciones('${tipo}');calcularDietas()">🗑</button>
    `;
  }

  lista.appendChild(row);
  fijarLimiteFechas();
  calcularDietas();
}

// ---- LEER DETALLE DE OPERACIONES ----
function leerDetalleOp(tipo) {
  const rows = document.querySelectorAll(`#lista-${tipo} .operacion-row`);
  return Array.from(rows).map(row => {
    if (tipo === '24horas' || tipo === 'pausa') {
      const g = f => row.querySelector(`[data-field="${f}"]`)?.value || '';
      return {
        fechaInicio: g('fechaInicio'), horaInicio: g('horaInicio'),
        fechaFin:    g('fechaFin'),    horaFin:    g('horaFin'),
        horas:       parseFloat(g('horas')) || 0,
        lugar:       g('lugar'),       obs:        g('obs'),
        fecha:       g('fechaInicio'), // compatibilidad
      };
    } else {
      const inputs = row.querySelectorAll('input');
      return { fecha: inputs[0]?.value || '', lugar: inputs[1]?.value || '' };
    }
  });
}

// ---- GUARDAR REGISTRO ----
async function guardarRegistro() {
  const plataforma = document.getElementById('plataforma').value;
  if (!plataforma) { showToast('Introduce un código de conductor válido', 'error'); return; }

  const editId    = document.getElementById('formRegistro').dataset.editId || '';
  const categoria = document.getElementById('categoria').value.toUpperCase();
  const sinKmVal  = ['COMODIN','PESCADO'].includes(categoria);

  // Validar fechas obligatorias
  const fs = document.getElementById('fechaSalida').value;
  const fl = document.getElementById('fechaLlegada').value;
  if (!sinKmVal) {
    if (!fs) { showToast('La fecha de salida es obligatoria', 'error'); document.getElementById('fechaSalida').focus(); return; }
    if (!fl) { showToast('La fecha de llegada es obligatoria', 'error'); document.getElementById('fechaLlegada').focus(); return; }
    // [2] Fecha llegada no puede ser anterior a fecha salida
    if (fl < fs) { showToast('La fecha de llegada no puede ser anterior a la de salida', 'error'); document.getElementById('fechaLlegada').focus(); return; }
  }

  // Validar km obligatorios (salvo COMODÍN/PESCADO)
  if (!sinKmVal) {
    const kmS = parseKm(document.getElementById('kmSalida').value);
    const kmV = parseKm(document.getElementById('kmVuelta').value);
    if (!kmS) { showToast('El Km de salida es obligatorio', 'error'); document.getElementById('kmSalida').focus(); return; }
    if (!kmV) { showToast('El Km de vuelta es obligatorio', 'error'); document.getElementById('kmVuelta').focus(); return; }
    // [2] Km vuelta no puede ser menor que km salida del mismo registro
    if (kmV < kmS) { showToast('El Km de vuelta no puede ser menor que el Km de salida', 'error'); document.getElementById('kmVuelta').focus(); return; }
  }

  // [3] coefNacional no puede ser mayor que diasTrabajados
  const diasTrab   = parseFloat(document.getElementById('diasTrabajados').value) || 0;
  const coefNacEl  = document.getElementById('coefNacional');
  const coefNacVal = parseFloat(coefNacEl.value) || 0;
  if (coefNacVal > diasTrab && diasTrab > 0) {
    coefNacEl.value = diasTrab;
    showToast(`⚠️ Días conduciendo en España ajustado a ${diasTrab} (no puede superar los días trabajados)`, '');
  }

  // Validar solapamiento de fechas con otros registros del mismo conductor
  // [1] Permitir mismo día: solapamiento real excluye el caso fs=fl con registro anterior de fl=fs
  const codCond = normCod(document.getElementById('codConductor').value);
  const registrosCond = getRegistros().filter(r =>
    normCod(r.codigoConductor) === codCond && r.id !== editId
  );
  const solapado = registrosCond.find(r => fs < r.fechaLlegada && fl > r.fechaSalida);
  if (solapado && !sinKmVal) {
    if (!confirm(`⚠️ Las fechas se solapan con un registro existente (${solapado.fechaSalida} → ${solapado.fechaLlegada}). ¿Continuar igualmente?`)) return;
  }

  // [4] Km salida ≥ km vuelta del registro anterior de la misma tractora — aviso pero no bloquea
  const tractoraSel = document.getElementById('tractora').value;
  if (tractoraSel && !sinKmVal) {
    const kmSActual = parseKm(document.getElementById('kmSalida').value);
    const registrosTractora = getRegistros()
      .filter(r => r.tractora === tractoraSel && r.id !== editId && r.fechaLlegada <= fs)
      .sort((a, b) => b.fechaLlegada.localeCompare(a.fechaLlegada));
    if (registrosTractora.length) {
      const ultimo = registrosTractora[0];
      if (ultimo.kmVuelta && kmSActual && kmSActual < ultimo.kmVuelta) {
        if (!confirm(`⚠️ Km salida (${kmSActual.toLocaleString('es-ES')}) menor que km vuelta del registro anterior de esta tractora (${Number(ultimo.kmVuelta).toLocaleString('es-ES')}). ¿Continuar igualmente?`)) return;
      }
    }
  }

  // calcularDietas() ya devuelve el resultado; lo reutilizamos
  const resultado = calcularDietas();

  const nDomingos = parseFloat(document.getElementById('numDomingos').value) || 0;
  const nFestivos = parseFloat(document.getElementById('numFestivos').value) || 0;

  const tractora = document.getElementById('tractora').value;
  const coefNac  = document.getElementById('coefNacional').value;
  const cod      = document.getElementById('codConductor').value.trim();
  if (tractora) {
    localStorage.setItem(`tractora_${cod}`, tractora); // fallback local
    updateTractoraConductor(cod, tractora);             // guardar en Firestore
  }
  if (coefNac)  localStorage.setItem(`coef_${cod}`, coefNac);

  const datosRegistro = {
    codigoConductor: normCod(document.getElementById('codConductor').value),
    nombreConductor: document.getElementById('nombreConductor').value,
    tractora,
    equipaje:        document.getElementById('equipaje').value,
    pareja:          document.getElementById('pareja').value,
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
    opCarga:    leerDetalleOp('carga'),   opPalet:    leerDetalleOp('palet'),
    opRebote:   leerDetalleOp('rebote'),  op24h:      leerDetalleOp('24horas'),
    opPausa:    leerDetalleOp('pausa'),   opNacional: leerDetalleOp('nacional'),
    opUK:       leerDetalleOp('uk'),      opNDLF:     leerDetalleOp('ndlf'),
    acarreos:        parseFloat(document.getElementById('acarreos').value)         || 0,
    dietaVlissingen: parseFloat(document.getElementById('dietaVlissingen').value)  || 0,
    extrasConcepto:  document.getElementById('extrasConcepto')?.value || '',
    extras:          parseFloat(document.getElementById('extras').value)           || 0,
    gastosViaje:     modoActual === 'detallado' ? leerGastosDetallados() : (parseFloat(document.getElementById('gastosViaje').value) || 0),
    gastosDetalle:   modoActual === 'detallado' ? leerGastosDetallados(true) : [],
    anticipos:       parseFloat(document.getElementById('anticipos').value)        || 0,
    modo:            modoActual,
    resultado,
  };

  // Trazabilidad
  const ahora = new Date().toISOString();
  if (editId) {
    datosRegistro.modificadoPor     = 'admin';
    datosRegistro.fechaModificacion = ahora;
    // Preservar campos de trazabilidad del registro original
    const regOriginal = getRegistros().find(r => r.id === editId);
    if (regOriginal) {
      datosRegistro.creadoPor   = regOriginal.creadoPor   || 'admin';
      datosRegistro.creadoEn    = regOriginal.creadoEn    || regOriginal.fechaCreacion || ahora;
      datosRegistro.estadoDietas = regOriginal.estadoDietas;
    // Si el admin marcó "Aprobar al guardar", pasar a pendiente
    const chkAprobar = document.getElementById('chk-aprobar');
    if (chkAprobar && chkAprobar.closest('#chk-aprobar-wrap')?.style.display !== 'none' && chkAprobar.checked) {
      datosRegistro.estadoDietas = 'pendiente';
    }
      datosRegistro.estadoGastos = regOriginal.estadoGastos;
    }
    await updateRegistro(editId, datosRegistro);
    showToast('Registro actualizado ✓', 'success');

    // Si es DOBLE y viene del móvil (validación), ofrecer cargar datos para la pareja
    if (datosRegistro.equipaje === 'DOBLE' && datosRegistro.pareja && regOriginal?.origenMovil) {
      const codPareja  = String(datosRegistro.pareja).split('—')[0].trim().padStart(6,'0');
      const condPareja = buscarConductor(codPareja);
      if (condPareja && confirm(`¿Cargar los mismos datos para la pareja ${condPareja.Nombre}?`)) {
        cargarDatosParaPareja(datosRegistro, condPareja);
        return; // No limpiar formulario — queda listo para revisar y grabar
      }
    }
  } else {
    // SALVAGUARDA: nunca crear registro nuevo si editId tiene valor (por si acaso)
    if (document.getElementById('formRegistro').dataset.editId) {
      showToast('Error: se detectó edición activa pero no se procesó. Recarga y vuelve a intentarlo.', 'error');
      console.error('guardarRegistro: editId en dataset pero no en variable local — abortando addRegistro');
      return;
    }
    datosRegistro.creadoPor = 'admin';
    datosRegistro.creadoEn  = ahora;
    try {
      const regGuardado = await addRegistro(datosRegistro);
      showToast('Registro guardado ✓', 'success');

      // DOBLE: ofrecer cargar datos para la pareja (sin grabar — el admin revisa y graba)
      if (datosRegistro.equipaje === 'DOBLE' && datosRegistro.pareja) {
        const codPareja  = String(datosRegistro.pareja).split('—')[0].trim().padStart(6,'0');
        const condPareja = buscarConductor(codPareja);
        if (condPareja && confirm(`¿Cargar los mismos datos para la pareja ${condPareja.Nombre}?`)) {
          cargarDatosParaPareja(datosRegistro, condPareja);
          return;
        }
      }
    } catch(e) {
      showToast(e.message || 'Error al guardar el registro', 'error');
      return;
    }
  }

  renderHistorial();
  limpiarFormulario();
}

// ---- GASTOS DETALLADOS ----
function addGasto(datos) {
  const lista = document.getElementById('lista-gastos');
  const row   = document.createElement('div');
  row.className = 'gasto-row';
  const hoy = new Date().toISOString().slice(0,10);

  const opts = getConceptos().map(c =>
    `<option value="${c.nombre}"${datos?.concepto === c.nombre ? ' selected' : ''}>${c.nombre}</option>`
  ).join('');

  const fecha   = datos?.fecha   || hoy;
  const lugar   = datos?.lugar   || '';
  const moneda  = datos?.moneda  || '€';
  const importe = datos?.importe != null ? datos.importe : '';

  row.innerHTML = `
    <input type="date" value="${fecha}" max="${hoy}" title="Fecha">
    <select title="Concepto">${opts}</select>
    <input type="text" placeholder="Lugar" value="${lugar}" title="Lugar"
           oninput="this.value=this.value.toUpperCase()">
    <select title="Moneda">
      <option value="€"${moneda==='€'?' selected':''}>€ EUR</option>
      <option value="£"${moneda==='£'?' selected':''}>£ GBP</option>
      <option value="$"${moneda==='$'?' selected':''}>$ USD</option>
      <option value="Otro"${moneda==='Otro'?' selected':''}>Otro</option>
    </select>
    <input type="number" min="0" step="0.01" value="${importe}" placeholder="0,00"
           style="font-weight:600;color:var(--primary);text-align:right"
           title="Importe" oninput="actualizarTotalGastos()" onfocus="this.select()">
    <button type="button" class="btn-del" title="Eliminar"
      onclick="this.parentElement.remove();actualizarTotalGastos()">🗑</button>
  `;
  lista.appendChild(row);
  if (!datos) {
    const imp = row.querySelector('input[type="number"]');
    if (imp) imp.focus();
  }
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

// ---- CARGAR DATOS PARA PAREJA (sin grabar) ----
function cargarDatosParaPareja(reg, condPareja) {
  // Limpiar formulario y quitar modo edición
  limpiarFormulario();

  // Rellenar conductor de la pareja
  document.getElementById('codConductor').value    = condPareja.Codigo;
  document.getElementById('nombreConductor').value = condPareja.Nombre;
  document.getElementById('plataforma').value      = condPareja.PLATAFORMA || reg.plataforma;
  document.getElementById('categoria').value       = condPareja.CATEGORIA  || reg.categoria;
  document.getElementById('equipaje').value        = condPareja.EQUIPAJE   || reg.equipaje;
  // Pareja: apunta al conductor original
  document.getElementById('pareja').value          = `${reg.codigoConductor} — ${reg.nombreConductor}`;
  // Campo visual — readOnly para no disparar filtrarConductores
  const bci = document.getElementById('buscarConductorInput');
  bci.value    = `${condPareja.Codigo} — ${condPareja.Nombre}`;
  bci.readOnly = true;

  // Adaptar interfaz a la plataforma de la pareja
  adaptarPlataforma(condPareja.PLATAFORMA || reg.plataforma, condPareja.CATEGORIA || reg.categoria);

  // Fechas y tiempos
  document.getElementById('fechaSalida').value     = reg.fechaSalida  || '';
  document.getElementById('fechaLlegada').value    = reg.fechaLlegada || '';
  document.getElementById('horaSalida').value      = reg.horaSalida   || '';
  document.getElementById('horaLlegada').value     = reg.horaLlegada  || '';
  document.getElementById('diasTrabajados').value  = reg.diasTrabajados || 0;
  document.getElementById('restoHoras').value      = reg.restoHoras   || 0;
  document.getElementById('coefNacional').value    = reg.coefNacional  || 0;

  // Kilómetros
  document.getElementById('kmSalida').value        = reg.kmSalida  || '';
  document.getElementById('kmVuelta').value        = reg.kmVuelta  || '';
  document.getElementById('totalKm').value         = reg.totalKm   || '';

  // Tractora: usar la asignada a la pareja si existe, si no la del registro
  const tractoraPareja = condPareja.tractoraAsignada || reg.tractora || '';
  const sel = document.getElementById('tractora');
  if (tractoraPareja) {
    if (!sel.querySelector(`option[value="${tractoraPareja}"]`)) {
      const opt = document.createElement('option');
      opt.value = opt.textContent = tractoraPareja;
      sel.appendChild(opt);
    }
    sel.value = tractoraPareja;
  }

  // Otros conceptos
  document.getElementById('acarreos').value        = reg.acarreos        || 0;
  document.getElementById('dietaVlissingen').value = reg.dietaVlissingen || 0;
  document.getElementById('extras').value          = reg.extras          || 0;
  const exCEl = document.getElementById('extrasConcepto');
  if (exCEl) exCEl.value = reg.extrasConcepto || '';
  // Gastos — NO se copian: cada conductor tiene los suyos
  document.getElementById('anticipos').value = 0;

  // Domingos / festivos (CAUDETE)
  document.getElementById('numDomingos').value = reg.nDomingos || '';
  document.getElementById('numFestivos').value = reg.nFestivos || '';

  // Modo del formulario
  if (reg.modo && reg.modo !== modoActual) setModo(reg.modo);

  // Operaciones — copiar conteos
  setTimeout(() => {
    const opMap = { nCarga:'carga', nPalet:'palet', nRebote:'rebote',
                    n24h:'24horas', nPausa:'pausa', nNacional:'nacional',
                    nUK:'uk', nNDLF:'ndlf' };
    const opDetalleMap = { carga:'opCarga', palet:'opPalet', rebote:'opRebote',
                           '24horas':'op24h', pausa:'opPausa', nacional:'opNacional',
                           uk:'opUK', ndlf:'opNDLF' };
    Object.entries(opMap).forEach(([campo, tipo]) => {
      const n = reg[campo] || 0;
      const detalles = reg[opDetalleMap[tipo]] || [];
      for (let i = 0; i < n; i++) {
        addOperacion(tipo);
        const lista = document.getElementById(`lista-${tipo}`);
        const rows  = lista.querySelectorAll('.operacion-row');
        const row   = rows[rows.length - 1];
        if (row && detalles[i]) {
          if (tipo === '24horas' || tipo === 'pausa') {
            const d = detalles[i];
            const f = (f,v) => { const el=row.querySelector(`[data-field="${f}"]`); if(el && v) el.value=v; };
            f('fechaInicio', d.fechaInicio); f('horaInicio', d.horaInicio);
            f('fechaFin',    d.fechaFin);    f('horaFin',    d.horaFin);
            f('horas',       d.horas != null ? d.horas : '');
            f('lugar',       d.lugar);       f('obs',         d.obs || '');
          } else {
            const inputs = row.querySelectorAll('input');
            if (inputs[0] && detalles[i].fecha) inputs[0].value = detalles[i].fecha;
            if (inputs[1] && detalles[i].lugar) inputs[1].value = detalles[i].lugar;
          }
        }
      }
    });

    // Modo resumido
    const rMap = { nCarga:'r-carga', nPalet:'r-palet', nRebote:'r-rebote',
                   n24h:'r-24horas', nPausa:'r-pausa', nNacional:'r-nacional',
                   nUK:'r-uk', nNDLF:'r-ndlf' };
    Object.entries(rMap).forEach(([campo, elId]) => {
      const el = document.getElementById(elId);
      if (el) el.value = reg[campo] || 0;
    });
    calcularTiempos();
    calcularDietas();
  }, 100);

  showToast(`Datos cargados para ${condPareja.Nombre} — revisa y pulsa Guardar`, 'success');
  document.getElementById('formRegistro').scrollIntoView({ behavior: 'smooth' });
}

// ---- LIMPIAR FORMULARIO ----
function limpiarFormulario() {
  document.getElementById('formRegistro').reset();
  // Limpiar también el campo visual de búsqueda de conductor
  const buscarEl = document.getElementById('buscarConductorInput');
  if (buscarEl) buscarEl.value = '';
  if (buscarEl) buscarEl.removeAttribute('readOnly');
  const sugsEl = document.getElementById('conductorSugerencias');
  if (sugsEl) { sugsEl.style.display = 'none'; sugsEl.innerHTML = ''; }
  ['nombreConductor','plataforma','categoria','equipaje','pareja'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('section-resultado').style.display = 'none';
  document.getElementById('lista-gastos').innerHTML = '';
  document.getElementById('gastos-total').style.display = 'none';
  ['carga','palet','rebote','24horas','pausa','nacional','uk','ndlf'].forEach(tipo =>
    document.getElementById(`lista-${tipo}`).innerHTML = '');
  adaptarPlataforma('', '');
  // Restaurar modo nuevo registro
  delete document.getElementById('formRegistro').dataset.editId;
  document.getElementById('btn-guardar').textContent = '💾 Guardar Registro';
  document.getElementById('btn-cancelar-edicion').style.display = 'none';
  const chkWrap = document.getElementById('chk-aprobar-wrap');
  if (chkWrap) chkWrap.style.display = 'none';
}

function cancelarEdicion() {
  limpiarFormulario();
  showToast('Edición cancelada');
}

// ---- SIDEBAR HISTORIAL ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('closed');
  document.getElementById('overlay').classList.toggle('active');
}

window.limpiarFiltrosHistorial = function limpiarFiltrosHistorial() {
  ['filtroHistorial','filtroDesde','filtroHasta'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['filtroPlataforma','filtroEstado','filtroEquipaje','filtroOrigen'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  renderHistorial();
};

function renderHistorial() {
  const lista     = document.getElementById('listaHistorial');
  const filtro    = (document.getElementById('filtroHistorial')?.value || '').toLowerCase();
  const fPlat     = document.getElementById('filtroPlataforma')?.value  || '';
  const fEstado   = document.getElementById('filtroEstado')?.value      || '';
  const fEquipaje = document.getElementById('filtroEquipaje')?.value    || '';
  const fOrigen   = document.getElementById('filtroOrigen')?.value      || '';
  const fDesde    = document.getElementById('filtroDesde')?.value       || '';
  const fHasta    = document.getElementById('filtroHasta')?.value       || '';

  let regs = getRegistros().slice().reverse();
  if (filtro)    regs = regs.filter(r =>
    (r.nombreConductor||'').toLowerCase().includes(filtro) ||
    normCod(r.codigoConductor).includes(filtro));
  if (fPlat)     regs = regs.filter(r => r.plataforma   === fPlat);
  if (fEstado)   regs = regs.filter(r => (r.estadoDietas || 'pendiente') === fEstado);
  if (fEquipaje) regs = regs.filter(r => (r.equipaje||'').toUpperCase() === fEquipaje);
  if (fOrigen)   regs = regs.filter(r => fOrigen === 'movil' ? r.origenMovil : !r.origenMovil);
  if (fDesde)    regs = regs.filter(r => r.fechaSalida  >= fDesde);
  if (fHasta)    regs = regs.filter(r => r.fechaLlegada <= fHasta);

  if (!regs.length) {
    lista.innerHTML = '<p style="padding:16px;color:#888;font-size:12px">Sin registros</p>';
    return;
  }

  // Separar pendientes de validación y el resto; dentro de cada grupo, último primero
  const pendVal = regs.filter(r => r.estadoDietas === 'pendiente_validacion')
    .sort((a,b) => b.fechaSalida.localeCompare(a.fechaSalida));
  const resto   = regs.filter(r => r.estadoDietas !== 'pendiente_validacion')
    .sort((a,b) => b.fechaSalida.localeCompare(a.fechaSalida));
  const ordenados = [...pendVal, ...resto];

  const fmt2 = v => v != null ? Number(v).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €' : '—';

  let html = `<table class="hist-tabla">
    <thead><tr>
      <th>Conductor</th>
      <th>Plat.</th>
      <th>Período</th>
      <th>Km Sal./Lle.</th>
      <th>Días</th>
      <th>Km Tot.</th>
      <th>Total</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr></thead>
    <tbody>`;

  html += ordenados.map(r => {
    const total      = r.plataforma === 'CAUDETE'
      ? fmt2(r.resultado?.TOTAL)
      : fmt2(r.resultado?.sumDietas);
    const edDietas   = r.estadoDietas || 'pendiente';
    const edGastos   = r.estadoGastos || 'pendiente';
    const esPendVal  = edDietas === 'pendiente_validacion';
    const origenIcon = r.origenMovil ? '📱' : '🖥️';
    const rowStyle   = esPendVal ? 'background:#fdf2f8;' : '';

    return `<tr style="${rowStyle}">
      <td>
        <span style="font-weight:600">${r.nombreConductor}</span>
        <span style="font-size:10px;margin-left:4px">${origenIcon}</span>
        ${r.equipaje==='DOBLE' ? `<span style="font-size:10px;color:#92400e" title="Conductor DOBLE"> 👥</span>` : ''}
        <br><span style="font-size:11px;color:#888">${r.codigoConductor}</span>
      </td>
      <td><span class="hist-plat plat-${r.plataforma}-badge">${r.plataforma}</span></td>
      <td style="font-size:12px;white-space:nowrap">${r.fechaSalida}<br>${r.fechaLlegada}</td>
      <td style="font-size:12px;white-space:nowrap;text-align:right">${r.kmSalida ? Number(r.kmSalida).toLocaleString('es-ES') : '—'}<br>${r.kmVuelta ? Number(r.kmVuelta).toLocaleString('es-ES') : '—'}</td>
      <td style="text-align:center">${r.diasTrabajados || '—'}</td>
      <td style="font-size:11px;white-space:nowrap;text-align:right">${r.totalKm ? Number(r.totalKm).toLocaleString('es-ES') + ' km' : '—'}</td>
      <td style="font-weight:600;white-space:nowrap;color:${esPendVal?'#9d174d':'#4a7c59'}">
        ${esPendVal ? '⏳ Pendiente' : total}
      </td>
      <td>
        <span class="estado-badge estado-${edDietas}" style="cursor:pointer;display:block;margin-bottom:2px"
          onclick="abrirModalEstado('${r.id}','dietas','${edDietas}')">💰 ${edDietas}</span>
        <span class="estado-badge estado-${edGastos}" style="cursor:pointer;display:block"
          onclick="abrirModalEstado('${r.id}','gastos','${edGastos}')">🧾 ${edGastos}</span>
      </td>
      <td style="white-space:nowrap">
        ${esPendVal ? `<button class="btn btn-primary" style="padding:3px 8px;font-size:11px;display:block;margin-bottom:3px;width:100%"
          onclick="editarRegistro('${r.id}')">✅ Validar y editar</button>` : ''}
        <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;display:block;margin-bottom:3px;width:100%"
          onclick="editarRegistro('${r.id}')">✏️ Editar</button>
        <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;color:#c0392b;display:block;width:100%"
          onclick="borrarRegistro('${r.id}')">🗑️ Borrar</button>
      </td>
    </tr>`;
  }).join('');

  html += '</tbody></table>';
  lista.innerHTML = html;
}

async function validarDesdeHistorial(id) {
  // C7: no se aprueba directamente. Se abre en modo edición para que el admin
  // revise y el registro se recalcule con las tarifas actuales al guardar.
  // (El resultado que trae del móvil usa lógica y tarifas del momento del registro.)
  showToast('Revisa y guarda el registro para validarlo', '');
  editarRegistro(id);
}

// ---- TABLAS BASE DE DATOS ----
function poblarInfConductoresDatalist() {
  const dl = document.getElementById('inf-conductores-list');
  if (!dl) return;
  dl.innerHTML = getConductores()
    .sort((a,b) => String(a.Codigo).localeCompare(String(b.Codigo)))
    .map(c => `<option value="${c.Codigo}">${c.Codigo} — ${c.Nombre}</option>`)
    .join('');
}

function infFiltrarConductor(input) {
  // Si el usuario seleccionó una opción del datalist, extraer solo el código
  const val = input.value;
  const match = val.match(/^(\d{5,6})/);
  if (match) input.value = match[1];
}

function renderTablas() {
  // Conductores
  document.getElementById('tbody-conductores').innerHTML =
    getConductores().map(c => {
      const codPar = c.PAREJA ? String(c.PAREJA).padStart(6,'0') : '';
      const condPar = codPar ? buscarConductor(codPar) : null;
      const parejaInfo = condPar ? `${codPar} — ${condPar.Nombre.split(',')[0]}` : (codPar || '—');
      const equipajeBadge = c.EQUIPAJE
        ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600;
                        background:${c.EQUIPAJE==='DOBLE'?'#e0f2fe':'#f0fdf4'};
                        color:${c.EQUIPAJE==='DOBLE'?'#0369a1':'#166534'}">${c.EQUIPAJE}</span>`
        : '—';
      return `<tr>
        <td><span class="hist-plat plat-${c.PLATAFORMA}-badge">${c.PLATAFORMA}</span></td>
        <td>${c.CATEGORIA}</td>
        <td style="font-family:var(--font-mono)">${c.Codigo}</td>
        <td style="font-weight:500">${c.Nombre}</td>
        <td style="font-family:var(--font-mono)">${c.NIF||'—'}</td>
        <td class="td-iban">${c.IBAN||'—'}</td>
        <td style="text-align:right;font-family:var(--font-mono)">${c.PrecioKmt}</td>
        <td class="td-email" title="${c.Email||''}">${c.Email||'—'}</td>
        <td style="text-align:center">${equipajeBadge}</td>
        <td style="color:var(--soft)">${parejaInfo}</td>
        <td style="color:var(--soft)">${c.tractoraAsignada||'—'}</td>
        <td style="white-space:nowrap">
          <button class="btn-icon" onclick="editarConductor('${c.Codigo}')" title="Editar">✏️</button>
          <button class="btn-icon" onclick="confirmarEliminar('${c.Codigo}')" title="Eliminar">🗑️</button>
        </td>
      </tr>`;
    }).join('');

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
  ['m-plataforma','m-categoria','m-codigo','m-nombre','m-nif','m-iban','m-precio','m-email','m-equipaje']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-pareja').value        = '';
  document.getElementById('m-pareja-input').value  = '';
  document.getElementById('m-pareja-nombre').textContent = '';
  document.getElementById('m-pareja-sugerencias').style.display = 'none';
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
  document.getElementById('m-email').value             = c.Email    || '';
  document.getElementById('m-equipaje').value           = c.EQUIPAJE || '';
  // Cargar pareja
  const codPar = c.PAREJA ? String(c.PAREJA).padStart(6,'0') : '';
  document.getElementById('m-pareja').value = codPar;
  if (codPar) {
    const condPar = buscarConductor(codPar);
    document.getElementById('m-pareja-input').value = condPar ? `${codPar} — ${condPar.Nombre}` : codPar;
    document.getElementById('m-pareja-nombre').textContent = condPar ? condPar.Nombre : '⚠️ No encontrado';
  } else {
    document.getElementById('m-pareja-input').value = '';
    document.getElementById('m-pareja-nombre').textContent = '';
  }
  document.getElementById('m-pareja-sugerencias').style.display = 'none';
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
    EQUIPAJE:   document.getElementById('m-equipaje').value,
    PAREJA:     document.getElementById('m-pareja').value.trim() || null,
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

  // Modo del formulario
  if (r.modo && r.modo !== modoActual) setModo(r.modo);

  // Datos básicos del conductor
  document.getElementById('codConductor').value    = r.codigoConductor;
  // Rellenar también el campo visual de búsqueda
  const cEdit = buscarConductor(r.codigoConductor);
  document.getElementById('buscarConductorInput').value = cEdit
    ? `${cEdit.Codigo} — ${cEdit.Nombre}`
    : r.codigoConductor;
  autocompletar();
  // Sobreescribir coefNacional con el del registro (no el por defecto de equipaje)
  document.getElementById('coefNacional').value    = r.coefNacional || 0;

  // Fechas y tiempos
  document.getElementById('fechaSalida').value     = r.fechaSalida;
  document.getElementById('fechaLlegada').value    = r.fechaLlegada;
  document.getElementById('horaSalida').value      = r.horaSalida  || '';
  document.getElementById('horaLlegada').value     = r.horaLlegada || '';

  // Kilómetros
  document.getElementById('kmSalida').value        = r.kmSalida    || '';
  document.getElementById('kmVuelta').value        = r.kmVuelta    || '';
  document.getElementById('totalKm').value         = r.totalKm     || '';

  // Otros conceptos
  document.getElementById('acarreos').value        = r.acarreos    || 0;
  document.getElementById('dietaVlissingen').value = r.dietaVlissingen || 0;
  document.getElementById('extras').value          = r.extras      || 0;
  const exCEl = document.getElementById('extrasConcepto'); if(exCEl) exCEl.value = r.extrasConcepto || '';
  document.getElementById('anticipos').value       = r.anticipos   || 0;

  // Domingos / festivos (CAUDETE)
  document.getElementById('numDomingos').value     = r.nDomingos   || '';
  document.getElementById('numFestivos').value     = r.nFestivos   || '';
  if (r.festivosEnLiquidacion) document.getElementById('chk-festivos').checked = true;

  // Marcar modo edición
  document.getElementById('formRegistro').dataset.editId = id;
  document.getElementById('btn-guardar').textContent = '💾 Actualizar Registro';
  document.getElementById('btn-cancelar-edicion').style.display = 'inline-flex';

  // Mostrar/ocultar opción de aprobar si viene del móvil pendiente de validación
  let checkAprobar = document.getElementById('chk-aprobar-wrap');
  if (!checkAprobar) {
    checkAprobar = document.createElement('div');
    checkAprobar.id = 'chk-aprobar-wrap';
    checkAprobar.style.cssText = 'display:none;align-items:center;gap:8px;margin-top:8px;padding:10px 14px;background:#f0fdf4;border:1.5px solid #4a7c59;border-radius:8px';
    checkAprobar.innerHTML = `
      <input type="checkbox" id="chk-aprobar" checked style="width:16px;height:16px;accent-color:#4a7c59">
      <label for="chk-aprobar" style="font-size:13px;font-weight:500;color:#2d6a4f;cursor:pointer">
        ✅ Aprobar registro al guardar (viene del móvil pendiente de validación)
      </label>`;
    document.getElementById('btn-guardar').parentElement.insertBefore(
      checkAprobar, document.getElementById('btn-guardar')
    );
  }
  checkAprobar.style.display = r.estadoDietas === 'pendiente_validacion' ? 'flex' : 'none';

  // Navegar al formulario
  if (!document.getElementById('sidebar').classList.contains('closed')) toggleSidebar();
  document.getElementById('formRegistro').scrollIntoView({ behavior: 'smooth' });

  // Operaciones y gastos DESPUÉS de adaptarPlataforma (que se llama en autocompletar)
  setTimeout(() => {
    calcularTiempos();

    // Reconstruir operaciones con detalle si viene del móvil
    ['carga','palet','rebote','24horas','pausa','nacional','uk','ndlf'].forEach(tipo =>
      document.getElementById(`lista-${tipo}`).innerHTML = '');
    const opMap = { nCarga:'carga', nPalet:'palet', nRebote:'rebote',
                    n24h:'24horas', nPausa:'pausa', nNacional:'nacional',
                    nUK:'uk', nNDLF:'ndlf' };
    const opDetalleMap = { carga:'opCarga', palet:'opPalet', rebote:'opRebote',
                           '24horas':'op24h', pausa:'opPausa', nacional:'opNacional',
                           uk:'opUK', ndlf:'opNDLF' };
    Object.entries(opMap).forEach(([campo, tipo]) => {
      const n = r[campo] || 0;
      const detalles = r[opDetalleMap[tipo]] || [];
      for (let i = 0; i < n; i++) {
        addOperacion(tipo);
        const lista = document.getElementById(`lista-${tipo}`);
        const rows  = lista.querySelectorAll('.operacion-row');
        const row   = rows[rows.length - 1];
        if (row && detalles[i]) {
          if (tipo === '24horas' || tipo === 'pausa') {
            const d = detalles[i];
            const f = (f,v) => { const el=row.querySelector(`[data-field="${f}"]`); if(el && v!==undefined) el.value=v; };
            f('fechaInicio', d.fechaInicio); f('horaInicio', d.horaInicio);
            f('fechaFin',    d.fechaFin);    f('horaFin',    d.horaFin);
            f('horas',       d.horas != null ? d.horas : '');
            f('lugar',       d.lugar);       f('obs',         d.obs || '');
          } else {
            const inputs = row.querySelectorAll('input');
            if (inputs[0] && detalles[i].fecha) inputs[0].value = detalles[i].fecha;
            if (inputs[1] && detalles[i].lugar) inputs[1].value = detalles[i].lugar;
          }
        }
      }
    });

    // Rellenar campos del modo Resumido
    const rMap = { nCarga:'r-carga', nPalet:'r-palet', nRebote:'r-rebote',
                   n24h:'r-24horas', nPausa:'r-pausa', nNacional:'r-nacional',
                   nUK:'r-uk', nNDLF:'r-ndlf' };
    Object.entries(rMap).forEach(([campo, elId]) => {
      const el = document.getElementById(elId);
      if (el) el.value = r[campo] || 0;
    });

    // Reconstruir gastos de viaje — usando addGasto(datos) directamente
    document.getElementById('lista-gastos').innerHTML = '';
    if (r.gastosDetalle && r.gastosDetalle.length) {
      r.gastosDetalle.forEach(g => addGasto(g));
      actualizarTotalGastos();
    } else if (r.gastosViaje && !r.gastosDetalle?.length) {
      document.getElementById('gastosViaje').value = r.gastosViaje || 0;
    }

    calcularDietas();
  }, 100);

  showToast('Registro cargado para editar', '');
}

async function borrarRegistro(id) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const reg = getRegistros().find(r => r.id === id);
  try {
    // Marcar como pendiente ANTES de borrar para que onSnapshot lo ignore
    if (typeof window.marcarPendienteBorrado === 'function') window.marcarPendienteBorrado(id);
    await window.deleteRegistro(id);
  } catch(e) {
    console.error('Error al borrar:', e.code, e.message);
    showToast('Error al borrar: ' + e.message, 'error');
    return;
  }
  showToast('Registro eliminado');
  renderHistorial();
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
  if (tab === 'validacion')   cargarLiqValidacion();
  if (tab === 'anticipos')  cargarLiqAnticipos();
  if (tab === 'embargos')   cargarLiqEmbargos();
  if (tab === 'historial-liq') cargarHistorialLiq();
}

function cargarLiqDietas() {
  const plat   = document.getElementById('liq-d-plat').value;
  const cod    = document.getElementById('liq-d-conductor').value.trim();
  const desde  = document.getElementById('liq-d-desde').value;
  const hasta  = document.getElementById('liq-d-hasta').value;
  const estado = document.getElementById('liq-d-estado').value;

  let regs = getRegistros().filter(r =>
    (r.estadoDietas || 'pendiente') === estado &&
    r.estadoDietas !== 'pendiente_validacion'
  );
  if (plat)  regs = regs.filter(r => r.plataforma === plat);
  if (cod)   regs = regs.filter(r => normCod(r.codigoConductor) === normCod(cod));
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

// ---- MODAL DE FALLOS EN LIQUIDACIÓN/PAGO (C1/C8) ----
// Se inyecta dinámicamente; no necesita HTML fijo en index.html.
function mostrarModalFallidos(titulo, resultado) {
  const { ok, total, fallidos } = resultado;
  // Eliminar uno previo si existiera
  document.getElementById('modal-fallidos')?.remove();

  const filas = fallidos.map(f => `
    <tr>
      <td style="font-family:var(--font-mono,monospace);white-space:nowrap">${f.codigo}</td>
      <td>${f.nombre}</td>
      <td style="font-size:11px;color:#b91c1c">${(f.error || '').substring(0,80)}</td>
    </tr>`).join('');

  const wrap = document.createElement('div');
  wrap.id = 'modal-fallidos';
  wrap.className = 'modal';
  wrap.style.display = 'flex';
  wrap.innerHTML = `
    <div class="modal-box" style="width:560px;max-width:92vw">
      <div class="modal-header">
        <h3>⚠️ ${titulo} — registros con error</h3>
        <button onclick="document.getElementById('modal-fallidos').remove()" class="btn-icon">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;margin:0 0 12px">
          Se completaron <strong style="color:#166534">${ok}</strong> de <strong>${total}</strong>.
          Los siguientes <strong style="color:#b91c1c">${fallidos.length}</strong> NO se guardaron y siguen
          <strong>sin número de liquidación</strong> — vuelve a intentarlo con ellos:
        </p>
        <div style="max-height:340px;overflow:auto;border:1px solid var(--border,#ddd);border-radius:8px">
          <table class="data-table" style="width:100%">
            <thead><tr>
              <th style="text-align:left">Código</th>
              <th style="text-align:left">Conductor</th>
              <th style="text-align:left">Error</th>
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="copiarFallidosPortapapeles(${JSON.stringify(JSON.stringify(fallidos.map(f=>`${f.codigo} ${f.nombre}`)))})">📋 Copiar lista</button>
        <button class="btn btn-primary" onclick="document.getElementById('modal-fallidos').remove()">Entendido</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function copiarFallidosPortapapeles(jsonLista) {
  try {
    const lista = JSON.parse(jsonLista);
    navigator.clipboard.writeText(lista.join('\n'));
    showToast('Lista copiada al portapapeles ✓', 'success');
  } catch(e) {
    showToast('No se pudo copiar', 'error');
  }
}

async function liqDietasLiquidar() {
  const ids = Array.from(document.querySelectorAll('.chk-liq-d:checked')).map(c => c.dataset.id);
  if (!ids.length) { showToast('Selecciona al menos un registro', 'error'); return; }
  if (!confirm(`¿Liquidar ${ids.length} registro(s)?`)) return;

  const numLiq = prompt('Número de liquidación:', generarNumLiquidacion());
  if (numLiq === null) return; // canceló el prompt

  let resultado;
  window._suprimirListener = true;
  try {
    resultado = await liquidarRegistros(ids, numLiq.trim().toUpperCase());
  } finally {
    window._suprimirListener = false;
  }

  if (resultado.fallidos.length) {
    showToast(`${resultado.ok}/${resultado.total} liquidados — ${resultado.fallidos.length} con error`, 'error');
    mostrarModalFallidos('Liquidación de dietas', resultado);
  } else {
    showToast(`${resultado.ok} registros liquidados ✓`, 'success');
  }
  cargarLiqDietas();
}

// ---- DETECTOR DE DUPLICADOS EN GASTOS ----
function detectarDuplicadosGastos(regs) {
  // Genera una clave por conductor+importe+fecha+periodo
  // Dos gastos son "duplicados sospechosos" si comparten las 4 dimensiones
  const claves = new Map();
  regs.forEach(r => {
    const gastos = r.gastosDetalle?.length ? r.gastosDetalle : (r.gastosViaje ? [{ importe: r.gastosViaje, fecha: r.fechaSalida, concepto: '—' }] : []);
    gastos.forEach(g => {
      const clave = `${r.codigoConductor}|${g.importe}|${g.fecha || ''}|${r.fechaSalida}|${r.fechaLlegada}`;
      if (!claves.has(clave)) claves.set(clave, []);
      claves.get(clave).push(r.id);
    });
  });
  // IDs de registros que tienen al menos un gasto duplicado
  const idsDuplicados = new Set();
  claves.forEach((ids, clave) => {
    if (ids.length > 1) ids.forEach(id => idsDuplicados.add(id));
  });
  return idsDuplicados;
}

function filtrarDuplicadosGastos() {
  const chk = document.getElementById('liq-g-solo-dup');
  if (chk) chk.checked = !chk.checked;
  cargarLiqGastos();
}

// ---- VISTA GASTOS: DETALLADO / ACUMULADO ----
let _vistaGastos = 'detallado';

function liqGastosSetVista(vista) {
  _vistaGastos = vista;
  document.getElementById('tbl-g-detallado').style.display = vista === 'detallado' ? '' : 'none';
  document.getElementById('tbl-g-acumulado').style.display = vista === 'acumulado'  ? '' : 'none';
  document.getElementById('btn-g-det').className = vista === 'detallado'
    ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('btn-g-acu').className = vista === 'acumulado'
    ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('btn-g-det').style.cssText = 'border-radius:0;padding:6px 12px;font-size:12px';
  document.getElementById('btn-g-acu').style.cssText = 'border-radius:0;padding:6px 12px;font-size:12px';
  cargarLiqGastos();
}

function cargarLiqGastos() {
  // Popular datalist
  const dl = document.getElementById('liq-g-conductores-list');
  if (dl) dl.innerHTML = getConductores()
    .sort((a,b) => String(a.Codigo).localeCompare(String(b.Codigo)))
    .map(c => `<option value="${c.Codigo}">${c.Codigo} — ${c.Nombre}</option>`)
    .join('');

  const rawCod = document.getElementById('liq-g-conductor').value.trim();
  const match  = rawCod.match(/^(\d{5,6})/);
  const cod    = match ? match[1] : rawCod;
  const desde  = document.getElementById('liq-g-desde').value;
  const hasta  = document.getElementById('liq-g-hasta').value;
  const estado = document.getElementById('liq-g-estado').value;
  const soloDup = document.getElementById('liq-g-solo-dup')?.checked || false;

  // Solo registros con gastos > 0
  let regs = getRegistros().filter(r =>
    (r.estadoGastos || 'pendiente') === estado &&
    ((r.gastosDetalle?.length > 0) || (r.gastosViaje > 0))
  );
  if (cod)   regs = regs.filter(r => normCod(r.codigoConductor) === normCod(cod));
  if (desde) regs = regs.filter(r => r.fechaSalida >= desde);
  if (hasta) regs = regs.filter(r => r.fechaSalida <= hasta);

  // Ordenar por código
  regs.sort((a,b) => String(a.codigoConductor).localeCompare(String(b.codigoConductor)));

  // Detectar duplicados en el conjunto filtrado
  const idsDup = detectarDuplicadosGastos(regs);

  // Actualizar contador de duplicados en UI
  const contDup = document.getElementById('liq-g-cont-dup');
  if (contDup) {
    contDup.textContent = idsDup.size > 0
      ? `⚠️ ${idsDup.size} registro(s) con posibles duplicados`
      : '✅ Sin duplicados detectados';
    contDup.style.color = idsDup.size > 0 ? '#b45309' : '#166534';
  }

  // Filtrar solo duplicados si está marcado
  if (soloDup) regs = regs.filter(r => idsDup.has(r.id));

  const conductores = getConductores();
  const tbody = document.getElementById('tbody-liq-gastos');
  tbody.innerHTML = regs.map(r => {
    const c     = conductores.find(x => normCod(x.Codigo) === normCod(r.codigoConductor));
    const total = r.gastosDetalle?.reduce((s,g) => s + g.importe, 0) || r.gastosViaje || 0;
    const esDup = idsDup.has(r.id);
    // Concepto: lista de conceptos únicos del detalle
    const conceptos = r.gastosDetalle?.length
      ? [...new Set(r.gastosDetalle.map(g => g.concepto || g.tipo || ''))].filter(Boolean).join(', ')
      : '—';
    const dupBadge = esDup
      ? `<span title="Posible duplicado detectado" style="font-size:10px;padding:2px 6px;background:#fef3c7;color:#b45309;border-radius:8px;font-weight:600;margin-left:4px">⚠️ DUP</span>`
      : '';
    const rowStyle = esDup ? 'background:#fffbeb;' : '';
    return `<tr style="${rowStyle}">
      <td><input type="checkbox" class="chk-liq-g" data-id="${r.id}"
          data-total="${total}" data-iban="${c?.IBAN||''}"
          data-nombre="${r.nombreConductor}" data-codigo="${r.codigoConductor||''}"
          data-fecha="${r.fechaSalida||''}" data-concepto="${conceptos}"
          data-estado="${r.estadoGastos||'pendiente'}"
          onchange="actualizarTotalLiqGastos()"></td>
      <td>${r.nombreConductor}${dupBadge}<br><small>${r.codigoConductor}</small></td>
      <td style="font-size:11px;font-family:monospace">${c?.IBAN||'—'}</td>
      <td style="white-space:nowrap">${r.fechaSalida} → ${r.fechaLlegada}</td>
      <td style="font-size:11px;color:#555">${conceptos}</td>
      <td style="font-family:var(--font-mono);text-align:right;font-weight:600">${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</td>
      <td><span class="estado-badge estado-${r.estadoGastos||'pendiente'}">${r.estadoGastos||'pendiente'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn-icon" onclick="abrirModalEstado('${r.id}','gastos','${r.estadoGastos||'pendiente'}')" title="Cambiar estado">✏️</button>
        <button class="btn-icon" onclick="editarRegistro('${r.id}')" title="Editar gastos del registro">📋</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#888">Sin registros con gastos</td></tr>';

  actualizarTotalLiqGastos();
  if (typeof renderGastosInd === 'function') renderGastosInd();

  // ---- VISTA ACUMULADO ----
  const tbodyAcu = document.getElementById('tbody-liq-gastos-acu');
  if (tbodyAcu) {
    const mapa = {};
    regs.forEach(r => {
      const cod = String(r.codigoConductor);
      const c   = conductores.find(x => String(x.Codigo) === cod);
      const total = r.gastosDetalle?.reduce((s,g) => s + g.importe, 0) || r.gastosViaje || 0;
      if (!mapa[cod]) mapa[cod] = { cod, nombre: r.nombreConductor, iban: c?.IBAN || '—', nRegs: 0, total: 0 };
      mapa[cod].nRegs++;
      mapa[cod].total += total;
    });
    const filas = Object.values(mapa).sort((a,b) => a.cod.localeCompare(b.cod));
    tbodyAcu.innerHTML = filas.map(m => `
      <tr>
        <td style="font-family:var(--font-mono)">${m.cod}</td>
        <td>${m.nombre}</td>
        <td style="text-align:center">${m.nRegs}</td>
        <td style="font-size:11px;font-family:monospace">${m.iban}</td>
        <td style="font-family:var(--font-mono);text-align:right;font-weight:600">
          ${m.total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €
        </td>
      </tr>`).join('')
      || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888">Sin registros</td></tr>';
  }
}

function actualizarTotalLiqGastos() {
  const total = [
    ...Array.from(document.querySelectorAll('.chk-liq-g:checked')),
    ...Array.from(document.querySelectorAll('.chk-gi:checked'))
  ].reduce((s, c) => s + parseFloat(c.dataset.total || 0), 0);
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
  const idsViaje = Array.from(document.querySelectorAll('.chk-liq-g:checked')).map(c => c.dataset.id);
  const idsInd   = Array.from(document.querySelectorAll('.chk-gi:checked')).map(c => c.dataset.id);
  const total    = idsViaje.length + idsInd.length;
  if (!total) { showToast('Selecciona al menos un registro', 'error'); return; }
  if (!confirm(`¿Marcar como pagados los gastos de ${total} registro(s)?`)) return;
  const numLiq = prompt('Número de liquidación:', generarNumLiquidacion());
  if (numLiq === null) return;
  const num = numLiq.trim().toUpperCase();

  let rViaje = { total: 0, ok: 0, fallidos: [] };
  let rInd   = { total: 0, ok: 0, fallidos: [] };
  window._suprimirListener = true;
  try {
    if (idsViaje.length) rViaje = await pagarGastosRegistros(idsViaje, num);
    if (idsInd.length)   rInd   = await pagarGastosInd(idsInd, num);
  } finally {
    window._suprimirListener = false;
  }

  const okTotal = rViaje.ok + rInd.ok;
  const fallidos = [...rViaje.fallidos, ...rInd.fallidos];
  if (fallidos.length) {
    showToast(`${okTotal}/${total} pagados — ${fallidos.length} con error`, 'error');
    mostrarModalFallidos('Pago de gastos', { total, ok: okTotal, fallidos });
  } else {
    showToast(`${okTotal} registros marcados como pagados ✓`, 'success');
  }
  cargarLiqGastos();
}

function liqGastosXML() {
  const checks = [...document.querySelectorAll('.chk-liq-g:checked'), ...document.querySelectorAll('.chk-gi:checked')];
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

  const checks = [...Array.from(document.querySelectorAll('.chk-liq-g:checked')), ...Array.from(document.querySelectorAll('.chk-gi:checked'))];
  const fecha  = new Date().toISOString().slice(0,10);
  const msgId  = `MSG${Date.now()}`;
  const tipo   = document.querySelector('input[name="sepa-tipo"]:checked')?.value || 'detallado';
  let totalSum = 0;
  let txs = '';
  let nTxs = 0;

  if (tipo === 'acumulado') {
    // Agrupar por conductor (dataset.codigo) y sumar importes
    const mapa = {};
    checks.forEach(c => {
      const importe = parseFloat(c.dataset.total || 0);
      const ibanC   = (c.dataset.iban || '').replace(/\s/g, '');
      if (!importe || !ibanC) return;
      const cod = c.dataset.codigo || ibanC;
      if (!mapa[cod]) mapa[cod] = { nombre: c.dataset.nombre, iban: ibanC, total: 0 };
      mapa[cod].total += importe;
    });
    Object.values(mapa).forEach((m, i) => {
      totalSum += m.total;
      nTxs++;
      txs += `
    <CdtTrfTxInf>
      <PmtId><EndToEndId>TX${i+1}-${msgId}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="EUR">${m.total.toFixed(2)}</InstdAmt></Amt>
      <CdtrAgt><FinInstnId><BICFI>${bic}</BICFI></FinInstnId></CdtrAgt>
      <Cdtr><Nm>${m.nombre.substring(0,70)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${m.iban}</IBAN></Id></CdtrAcct>
      <RmtInf><Ustrd>${concepto.substring(0,140)}</Ustrd></RmtInf>
    </CdtTrfTxInf>`;
    });
  } else {
    // Detallado: una línea por registro
    checks.forEach((c, i) => {
      const importe = parseFloat(c.dataset.total || 0);
      const ibanC   = (c.dataset.iban || '').replace(/\s/g, '');
      if (!importe || !ibanC) return;
      totalSum += importe;
      nTxs++;
      txs += `
    <CdtTrfTxInf>
      <PmtId><EndToEndId>TX${i+1}-${msgId}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="EUR">${importe.toFixed(2)}</InstdAmt></Amt>
      <CdtrAgt><FinInstnId><BICFI>${bic}</BICFI></FinInstnId></CdtrAgt>
      <Cdtr><Nm>${c.dataset.nombre.substring(0,70)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${ibanC}</IBAN></Id></CdtrAcct>
      <RmtInf><Ustrd>${(c.dataset.concepto || concepto).substring(0,140)}</Ustrd></RmtInf>
    </CdtTrfTxInf>`;
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString().slice(0,19)}</CreDtTm>
      <NbOfTxs>${nTxs}</NbOfTxs>
      <CtrlSum>${totalSum.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${nombre.substring(0,70)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT${msgId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${nTxs}</NbOfTxs>
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

function liqGastosExcel() {
  const checks = [...document.querySelectorAll('.chk-liq-g:checked'), ...document.querySelectorAll('.chk-gi:checked')];
  if (!checks.length) { showToast('Selecciona al menos un registro', 'error'); return; }

  const headers = ['Código','Nombre','IBAN','Fecha','Concepto','Importe','Estado'];
  const filas = checks.map(c => ({
    'Código':  c.dataset.codigo || '',
    'Nombre':  c.dataset.nombre || '',
    'IBAN':    c.dataset.iban   || '',
    'Fecha':   c.dataset.fecha  || '',
    'Concepto':c.dataset.concepto || '',
    'Importe': parseFloat(c.dataset.total||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}),
    'Estado':  c.dataset.estado || 'pendiente',
  }));

  descargarXLSX(headers, filas, `gastos_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function cargarLiqValidacion() {
  const cod  = document.getElementById('liq-v-conductor').value.trim();
  let regs = getRegistros().filter(r => r.estadoDietas === 'pendiente_validacion');
  if (cod) regs = regs.filter(r => normCod(r.codigoConductor) === normCod(cod));

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
  // C7: la aprobación en bloque se elimina. Cada registro del móvil debe
  // validarse y editarse individualmente para que se recalcule con las tarifas
  // actuales antes de aprobarse. Este handler solo informa.
  showToast('Valida cada registro individualmente con "✅ Validar y editar"', 'error');
}

// ---- HISTORIAL DE LIQUIDACIONES ----
function cargarHistorialLiq() {
  const plat   = document.getElementById('liq-h-plat').value;
  const cod    = document.getElementById('liq-h-conductor').value.trim();
  const estado = document.getElementById('liq-h-estado')?.value || '';
  const desde  = document.getElementById('liq-h-desde').value;
  const hasta  = document.getElementById('liq-h-hasta').value;

  // Sin filtro de estado: mostrar liquidado, pagado o gastos pagados (comportamiento original)
  // Con filtro de estado: aplicar exactamente el estado seleccionado
  let regs;
  if (estado) {
    regs = getRegistros().filter(r => r.estadoDietas === estado || r.estadoGastos === estado);
  } else {
    regs = getRegistros().filter(r =>
      r.estadoDietas === 'liquidado' || r.estadoDietas === 'pagado' || r.estadoGastos === 'pagado'
    );
  }
  if (plat)  regs = regs.filter(r => r.plataforma === plat);
  if (cod)   regs = regs.filter(r => normCod(r.codigoConductor).includes(cod.trim()));
  if (desde) regs = regs.filter(r => r.fechaSalida  >= desde);
  if (hasta) regs = regs.filter(r => r.fechaLlegada <= hasta);

  // Ordenar por fecha liquidación desc
  regs.sort((a, b) => (b.fechaLiquidacion || '').localeCompare(a.fechaLiquidacion || ''));

  const fmt2 = v => Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
  let totalDietas = 0;

  const tbody = document.getElementById('tbody-historial-liq');
  tbody.innerHTML = regs.map(r => {
    const dietas = r.plataforma === 'CAUDETE'
      ? (r.resultado?.TOTAL || 0) : (r.resultado?.sumDietas || 0);
    const gastos = r.gastosViaje || 0;
    totalDietas += dietas;
    const fLiq = r.fechaLiquidacion
      ? new Date(r.fechaLiquidacion).toLocaleDateString('es-ES')
      : '—';
    const estadoBadge = `<span class="estado-badge estado-${r.estadoDietas}">${r.estadoDietas}</span>`;
    return `<tr>
      <td>${r.nombreConductor}</td>
      <td>${r.codigoConductor}</td>
      <td><span class="hist-plat plat-${r.plataforma}-badge">${r.plataforma}</span></td>
      <td>${r.fechaSalida} → ${r.fechaLlegada}</td>
      <td style="text-align:center">${r.diasTrabajados}</td>
      <td style="font-family:var(--font-mono);text-align:right;font-weight:600;color:var(--primary)">${fmt2(dietas)} €</td>
      <td style="font-family:var(--font-mono);text-align:right">${gastos ? fmt2(gastos)+' €' : '—'}</td>
      <td style="text-align:center;font-size:12px;color:var(--soft)">${fLiq}</td>
      <td>${estadoBadge}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#888">Sin registros liquidados</td></tr>';

  document.getElementById('liq-h-total').textContent = fmt2(totalDietas) + ' €';
}

function exportarHistorialLiq() {
  const tbody = document.getElementById('tbody-historial-liq');
  const rows  = tbody.querySelectorAll('tr');
  if (!rows.length || rows[0].cells.length < 2) {
    showToast('No hay datos para exportar', 'error'); return;
  }
  const headers = ['Conductor','Código','Plataforma','Período','Días','Total Dietas','Gastos Viaje','Fecha Liquidación','Estado'];
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  const lines = [headers.map(esc).join(';')];
  rows.forEach(row => {
    const cells = Array.from(row.cells).map(td => esc(td.textContent.trim()));
    lines.push(cells.join(';'));
  });
  const csv  = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `historial_liquidaciones_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado ✓', 'success');
}


// ---- AUTOCOMPLETE PAREJA EN MODAL CONDUCTOR ----
function filtrarParejaModal(query) {
  const sugs = document.getElementById('m-pareja-sugerencias');
  const q = query.trim().toLowerCase();
  if (!q) {
    sugs.style.display = 'none';
    sugs.innerHTML = '';
    document.getElementById('m-pareja').value = '';
    document.getElementById('m-pareja-nombre').textContent = '';
    return;
  }
  const lista = getConductores().filter(c =>
    c.Codigo.toLowerCase().includes(q) || c.Nombre.toLowerCase().includes(q)
  ).slice(0, 8);

  if (!lista.length) {
    sugs.style.display = 'none';
    sugs.innerHTML = '';
    return;
  }
  sugs.innerHTML = lista.map(c => `
    <div onclick="seleccionarParejaModal('${c.Codigo}')"
      style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);
             display:flex;align-items:center;gap:10px;font-size:12px;transition:background .15s"
      onmouseover="this.style.background='var(--surface-hover,#f0f4ee)'"
      onmouseout="this.style.background=''">
      <span style="font-family:var(--font-mono);color:var(--primary);min-width:58px">${c.Codigo}</span>
      <span style="flex:1;color:var(--text)">${c.Nombre}</span>
      <span style="font-size:11px;color:var(--soft);background:var(--bg);
                   padding:2px 6px;border-radius:10px">${c.PLATAFORMA}</span>
    </div>
  `).join('');
  sugs.style.display = 'block';
}

function seleccionarParejaModal(codigo) {
  const c = buscarConductor(codigo);
  if (!c) return;
  document.getElementById('m-pareja').value       = codigo;
  document.getElementById('m-pareja-input').value = `${codigo} — ${c.Nombre}`;
  document.getElementById('m-pareja-nombre').textContent = c.Nombre;
  document.getElementById('m-pareja-sugerencias').style.display = 'none';
  document.getElementById('m-pareja-sugerencias').innerHTML = '';
}

// Cerrar sugerencias pareja al clic fuera
document.addEventListener('click', function(e) {
  const input = document.getElementById('m-pareja-input');
  const sugs  = document.getElementById('m-pareja-sugerencias');
  if (input && sugs && !input.contains(e.target) && !sugs.contains(e.target)) {
    sugs.style.display = 'none';
  }
});


// ---- EXPORTAR CONDUCTORES CSV ----
function exportarConductoresCSV() {
  const conductores = getConductores();
  if (!conductores.length) { showToast('No hay conductores para exportar', 'error'); return; }

  const headers = ['Plataforma','Categoría','Código','Nombre','NIF','IBAN','PrecioKmt','Email','Equipaje','Pareja','Tractora'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const lines = [headers.map(esc).join(';')];
  conductores.forEach(c => {
    const codPar = c.PAREJA ? String(c.PAREJA).padStart(6,'0') : '';
    const condPar = codPar ? buscarConductor(codPar) : null;
    const parejaTexto = condPar ? `${codPar} — ${condPar.Nombre}` : (codPar || '');
    lines.push([
      c.PLATAFORMA, c.CATEGORIA, c.Codigo, c.Nombre,
      c.NIF||'', c.IBAN||'', c.PrecioKmt||0, c.Email||'',
      c.EQUIPAJE||'', parejaTexto, c.tractoraAsignada||''
    ].map(esc).join(';'));
  });

  const csv  = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `conductores_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${conductores.length} conductores exportados ✓`, 'success');
}

// ---- TOAST ----
function showToast(msg, tipo = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${tipo} show`;
  setTimeout(() => t.className = 'toast', 3000);
}

// =============================================
// ENVÍO DE LIQUIDACIONES POR EMAIL
// =============================================
const WEBHOOK_URL   = 'https://script.google.com/macros/s/AKfycbzSzXhako36YtFdyP8OOKhV8WjQ9k5tTTlAGswT_TtBLyQWOtEkvHEaDrTW-PlT0PUT2w/exec';
const TOKEN_SECRETO = 'olano2024sec';

// Llamado desde informes.js — envío masivo con filtros
window.enviarLiquidacionesMasivo = async function({ desde, hasta, plataforma, ids }) {
  showToast('Enviando liquidaciones…', '');
  try {
    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'liquidaciones',
        token: TOKEN_SECRETO,
        desde, hasta, plataforma, ids: ids || []
      })
    });
    // no-cors no devuelve body — marcar como enviados localmente
    if (ids?.length) {
      await Promise.all(ids.map(id => marcarEmailEnviado(id)));
    } else {
      const regs = getRegistros().filter(r =>
        r.estadoDietas === 'liquidado' &&
        (!desde || r.fechaSalida >= desde) &&
        (!hasta  || r.fechaSalida <= hasta) &&
        (!plataforma || r.plataforma === plataforma)
      );
      await Promise.all(regs.map(r => marcarEmailEnviado(r.id)));
    }
    showToast('Liquidaciones enviadas ✓', 'success');
    renderHistorial();
  } catch(err) {
    showToast('Error al enviar: ' + err.message, 'error');
  }
};

// ============================================================
// MÓDULO ENVÍO DE NÓMINAS
// ============================================================
const _nom = { pdfs: {}, matched: [] };

// Inicializar al abrir la pestaña
function nomInicializar() {
  const conductores = getConductores();
  const el = document.getElementById('nom-db-status');
  if (!el) return;
  if (conductores.length > 0) {
    el.style.cssText = 'padding:10px 12px;border:1px solid var(--border);border-radius:4px;font-size:12px;color:var(--soft);background:#f0fdf4;border-color:#86efac';
    el.textContent = `✅ ${conductores.length} conductores cargados desde Firestore`;
  } else {
    el.style.cssText = 'padding:10px 12px;border:1px solid #fca5a5;border-radius:4px;font-size:12px;color:#b91c1c';
    el.textContent = '⚠️ No se encontraron conductores en Firestore';
  }
  // Habilitar botón emparejar si ya hay PDFs
  if (Object.keys(_nom.pdfs).length > 0 && conductores.length > 0) {
    document.getElementById('nom-btn-match').disabled = false;
  }
}

function nomCargarPDFs(files) {
  _nom.pdfs = {};
  Array.from(files).forEach(f => {
    if (f.name.toLowerCase().endsWith('.pdf')) _nom.pdfs[f.name] = f;
  });
  const n = Object.keys(_nom.pdfs).length;
  const dz    = document.getElementById('nom-dz');
  const label = document.getElementById('nom-dz-label');
  if (n > 0) {
    dz.style.borderColor = 'var(--primary)';
    dz.style.background  = '#f0fdf4';
    label.textContent    = `${n} PDF${n !== 1 ? 's' : ''} cargado${n !== 1 ? 's' : ''}`;
  } else {
    dz.style.borderColor = '';
    dz.style.background  = '';
    label.textContent    = 'Selecciona los PDFs de nóminas';
  }
  const conductores = getConductores();
  document.getElementById('nom-btn-match').disabled = !(n > 0 && conductores.length > 0);
}

function nomEmparejar() {
  const conductores = getConductores();
  // Índice por NIF normalizado
  const idx = {};
  conductores.forEach(c => {
    const nif = String(c.NIF || '').trim().toUpperCase();
    if (nif) idx[nif] = c;
  });

  // Agrupar PDFs por NIF+período (puede haber _1 y _2)
  const grupos = {}; // clave: NIF-AAAA-MM
  Object.entries(_nom.pdfs).forEach(([name, file]) => {
    // Patrón: NIF-AAAA-MM_1.pdf o NIF-AAAA-MM_2.pdf o NIF-AAAA-MM.pdf
    const stem  = name.replace(/\.pdf$/i, '');
    const match = stem.match(/^([^-]+)-(\d{4})-(\d{2})(?:_(\d+))?$/i);
    if (!match) {
      // Archivo con nombre no reconocido — añadir como error
      const key = name;
      if (!grupos[key]) grupos[key] = { nif: '?', anio: '?', mes: '?', files: [], names: [] };
      grupos[key].files.push(file);
      grupos[key].names.push(name);
      grupos[key].error = 'Nombre no reconocido';
      return;
    }
    const nif  = match[1].toUpperCase();
    const anio = match[2];
    const mes  = match[3];
    const key  = `${nif}-${anio}-${mes}`;
    if (!grupos[key]) grupos[key] = { nif, anio, mes, files: [], names: [] };
    grupos[key].files.push(file);
    grupos[key].names.push(name);
  });

  // Construir lista emparejada
  _nom.matched = [];
  Object.entries(grupos).forEach(([key, g]) => {
    const conductor = idx[g.nif];
    const email  = conductor ? String(conductor.Email || '').trim() : '';
    const nombre = conductor ? String(conductor.Nombre || '').trim() : '';
    let estado, motivo;
    if (g.error)   { estado = 'err'; motivo = g.error; }
    else if (!conductor) { estado = 'err'; motivo = 'NIF no encontrado'; }
    else if (!email)     { estado = 'err'; motivo = 'Email vacío'; }
    else                 { estado = 'ok';  motivo = ''; }
    _nom.matched.push({ ...g, conductor, email, nombre, estado, motivo });
  });

  nomRenderTabla();
  const nOk = _nom.matched.filter(r => r.estado === 'ok').length;
  document.getElementById('nom-btn-gen').disabled = nOk === 0;
  showToast(`${nOk} listos · ${_nom.matched.length - nOk} con error`, nOk === _nom.matched.length ? 'success' : 'warning');
}

function nomRenderTabla() {
  document.getElementById('nom-empty').style.display   = 'none';
  document.getElementById('nom-stats').style.display   = 'flex';
  document.getElementById('nom-tbl-wrap').style.display = 'block';
  document.getElementById('nom-bottom').style.display  = 'flex';

  const ok  = _nom.matched.filter(r => r.estado === 'ok').length;
  const err = _nom.matched.filter(r => r.estado === 'err').length;
  document.getElementById('nom-s-ok').textContent    = ok;
  document.getElementById('nom-s-err').textContent   = err;
  document.getElementById('nom-s-total').textContent = _nom.matched.length;

  const tbody = document.getElementById('nom-tbody');
  tbody.innerHTML = _nom.matched.map((r, i) => {
    const archivos = r.names.map(n => `<div style="font-size:10px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px" title="${n}">${n}</div>`).join('');
    const sufijos  = r.names.map(n => {
      const m = n.match(/_(\d+)\.pdf$/i);
      return m ? `<span style="background:var(--primary);color:white;padding:1px 5px;border-radius:3px;font-size:10px">_${m[1]}</span>` : '';
    }).filter(Boolean).join(' ');
    const badge = r.estado === 'ok'
      ? `<span class="badge badge-green">Listo</span>`
      : `<span class="badge badge-red">Error</span><div style="font-size:10px;color:#c0392b;margin-top:2px">${r.motivo}</div>`;
    return `<tr id="nom-row-${i}" style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 12px;font-size:12px;font-family:var(--font-mono)">${r.nif}</td>
      <td style="padding:8px 12px;font-size:12px">${r.nombre || '—'}</td>
      <td style="padding:8px 12px;font-size:11px;font-family:var(--font-mono);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.email}">${r.email || '—'}</td>
      <td style="padding:8px 12px;font-size:12px;font-family:var(--font-mono)">${r.mes || '?'}/${r.anio || '?'} ${sufijos}</td>
      <td style="padding:8px 12px">${archivos}</td>
      <td style="padding:8px 12px" id="nom-st-${i}">${badge}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--soft)">Sin registros</td></tr>';
}

function nomConfirmar() {
  const n = _nom.matched.filter(r => r.estado === 'ok').length;
  if (!n) { showToast('No hay correos listos para generar', 'error'); return; }
  document.getElementById('nom-modal-n').textContent = n;
  document.getElementById('nom-modal').style.display = 'flex';
}

async function nomGenerarZip() {
  document.getElementById('nom-modal').style.display = 'none';
  const queue = _nom.matched.filter(r => r.estado === 'ok');
  if (!queue.length) return;

  const from    = document.getElementById('nom-from').value.trim() || 'rrhh@empresa.es';
  const asunto  = document.getElementById('nom-asunto').value;
  const cuerpo  = document.getElementById('nom-cuerpo').value;

  document.getElementById('nom-btn-gen').disabled   = true;
  document.getElementById('nom-btn-match').disabled = true;
  document.getElementById('nom-progress').style.display = 'block';

  // Cargar JSZip dinámicamente si no está disponible
  if (typeof JSZip === 'undefined') {
    await nomCargarJSZip();
  }
  const zip = new JSZip();
  const datos = []; // datos.json para la macro VBA
  let done = 0;

  for (const r of queue) {
    const vars = { nombre: r.nombre || r.nif, nif: r.nif, mes: r.mes, anio: r.anio };
    const asuntoR = nomResolveTemplate(asunto, vars);
    const cuerpoR = nomResolveTemplate(cuerpo, vars);

    for (let fi = 0; fi < r.files.length; fi++) {
      const file     = r.files[fi];
      const fileName = r.names[fi];
      const pdfBuffer = await nomLeerArchivo(file);
      // Añadir PDF al ZIP
      zip.file(fileName, pdfBuffer);
      // Añadir entrada al JSON
      datos.push({
        pdf:     fileName,
        to:      r.email,
        subject: asuntoR,
        body:    cuerpoR,
        from:    from,
        nombre:  r.nombre || r.nif,
      });
    }

    done++;
    const pct = Math.round((done / queue.length) * 100);
    document.getElementById('nom-prog-fill').style.width = pct + '%';
    document.getElementById('nom-prog-pct').textContent  = pct + '%';
    document.getElementById('nom-prog-txt').textContent  = `Generando ${done} de ${queue.length}…`;
    const idx = _nom.matched.indexOf(r);
    const el  = document.getElementById(`nom-st-${idx}`);
    if (el) el.innerHTML = '<span class="badge badge-blue">Generado</span>';
    await new Promise(res => setTimeout(res, 20));
  }

  // Añadir datos.json al ZIP
  zip.file('datos.json', JSON.stringify(datos, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `nominas_${new Date().toISOString().slice(0, 7)}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  document.getElementById('nom-prog-txt').textContent = `✅ ZIP generado con ${done} conductores`;
  document.getElementById('nom-btn-match').disabled = false;
  showToast(`ZIP descargado con ${done} PDFs + datos.json ✓`, 'success');
}

function nomCargarJSZip() {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function nomBuildEml({ from, to, subject, body, filename, pdfB64 }) {
  const boundary = `----=_Part_${Math.random().toString(36).slice(2)}`;
  const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const bodyB64 = btoa(unescape(encodeURIComponent(body)));
  return [
    `MIME-Version: 1.0`,
    `X-Unsent: 1`,
    `Date: ${new Date().toUTCString()}`,
    `To: ${to}`,
    `Subject: ${subjectEncoded}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    bodyB64,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${filename}"`,
    ``,
    pdfB64,
    ``,
    `--${boundary}--`,
  ].join('\r\n');
}

function nomResolveTemplate(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] || '');
}

function nomLeerArchivo(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}

function nomArrayBufferToBase64(buffer) {
  let bin = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// ============================================================
// MÓDULO GASTOS INDEPENDIENTES
// ============================================================

async function renderGastosInd() {
  await cargarGastosInd();
  const estado  = document.getElementById('liq-g-estado')?.value || 'pendiente';
  const desde   = document.getElementById('liq-g-desde')?.value  || '';
  const hasta   = document.getElementById('liq-g-hasta')?.value  || '';
  const rawCod  = document.getElementById('liq-g-conductor')?.value.trim() || '';
  const match   = rawCod.match(/^(\d{5,6})/);
  const cod     = match ? match[1] : rawCod.toLowerCase();

  let gastos = getGastosInd().filter(g => (g.estadoGastos || 'pendiente') === estado);
  if (desde) gastos = gastos.filter(g => g.fecha >= desde);
  if (hasta) gastos = gastos.filter(g => g.fecha <= hasta);
  if (cod)   gastos = gastos.filter(g =>
    String(g.conductorCodigo || '').includes(cod) ||
    String(g.conductorNombre || '').toLowerCase().includes(cod)
  );

  const tbody = document.getElementById('tbody-gastos-ind');
  if (!tbody) return;

  const totalInd = gastos.reduce((s, g) => s + parseFloat(g.importe || 0), 0);
  const badge = document.getElementById('gi-total-badge');
  if (badge) badge.textContent = gastos.length
    ? `${gastos.length} registro(s) · ${totalInd.toLocaleString('es-ES',{minimumFractionDigits:2})} €`
    : 'Sin registros';

  tbody.innerHTML = gastos.map(g => `
    <tr style="background:#f0f9ff">
      <td><input type="checkbox" class="chk-gi" data-id="${g.id}"
          data-total="${g.importe}" data-iban="${g.conductorIban||''}"
          data-nombre="${g.conductorNombre||''}" data-codigo="${g.conductorCodigo||''}"
          data-fecha="${g.fecha||''}" data-concepto="${g.concepto||''}"
          data-estado="${g.estadoGastos||'pendiente'}"
          onchange="actualizarTotalLiqGastos()"></td>
      <td>
        <span style="font-size:10px;padding:1px 5px;background:#0ea5e9;color:white;border-radius:3px;margin-right:4px">IND</span>
        ${g.conductorNombre||'—'}<br><small>${g.conductorCodigo||''}</small>
      </td>
      <td>${g.fecha||'—'}</td>
      <td>${g.concepto||'—'}${g.notas ? `<br><small style="color:var(--soft)">${g.notas}</small>` : ''}</td>
      <td><span class="estado-badge estado-${g.estadoGastos||'pendiente'}">${g.estadoGastos||'pendiente'}</span></td>
      <td style="font-family:var(--font-mono);text-align:right;font-weight:600">
        ${parseFloat(g.importe||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €
      </td>
      <td>
        <button class="btn-icon" onclick="eliminarGastoInd('${g.id}')" title="Eliminar">🗑️</button>
      </td>
    </tr>`).join('')
    || '<tr><td colspan="7" style="text-align:center;padding:12px;color:var(--soft)">Sin gastos independientes</td></tr>';
}

function giToggleTodos() {
  const todos = document.getElementById('chk-gi-todos').checked;
  document.querySelectorAll('.chk-gi').forEach(c => c.checked = todos);
  actualizarTotalLiqGastos();
}

function abrirModalGastoInd() {
  // Popular datalist
  const dl = document.getElementById('gi-conductores-list');
  if (dl) dl.innerHTML = getConductores()
    .sort((a,b) => String(a.Codigo).localeCompare(String(b.Codigo)))
    .map(c => `<option value="${c.Codigo} — ${c.Nombre}" data-codigo="${c.Codigo}" data-nombre="${c.Nombre}" data-iban="${c.IBAN||''}">`)
    .join('');
  // Fecha por defecto hoy
  document.getElementById('gi-fecha').value = new Date().toISOString().slice(0,10);
  document.getElementById('gi-conductor').value = '';
  document.getElementById('gi-conductor-id').value = '';
  document.getElementById('gi-conductor-nombre').value = '';
  document.getElementById('gi-conductor-iban').value = '';
  document.getElementById('gi-importe').value = '';
  document.getElementById('gi-concepto').value = '';
  document.getElementById('gi-notas').value = '';
  document.getElementById('modal-gasto-ind').style.display = 'flex';
}

function cerrarModalGastoInd() {
  document.getElementById('modal-gasto-ind').style.display = 'none';
}

function giBuscarConductor() {
  const val = document.getElementById('gi-conductor').value;
  const match = val.match(/^(\d{5,6})/);
  if (match) {
    const cod = match[1].padStart(6,'0');
    const c = getConductores().find(x => String(x.Codigo).padStart(6,'0') === cod);
    if (c) {
      document.getElementById('gi-conductor-id').value     = c.Codigo;
      document.getElementById('gi-conductor-nombre').value = c.Nombre;
      document.getElementById('gi-conductor-iban').value   = c.IBAN || '';
    }
  }
}

async function guardarGastoInd() {
  const conductor = document.getElementById('gi-conductor').value.trim();
  const fecha     = document.getElementById('gi-fecha').value;
  const importe   = parseFloat(document.getElementById('gi-importe').value);
  const concepto  = document.getElementById('gi-concepto').value.trim();
  const notas     = document.getElementById('gi-notas').value.trim();

  if (!conductor || !fecha || !importe || !concepto) {
    showToast('Rellena todos los campos obligatorios', 'error'); return;
  }

  // Intentar extraer código y nombre del valor del input
  const matchVal = conductor.match(/^(\d{5,6})\s*[—-]\s*(.+)/);
  let conductorCodigo = document.getElementById('gi-conductor-id').value || '';
  let conductorNombre = document.getElementById('gi-conductor-nombre').value || '';
  let conductorIban   = document.getElementById('gi-conductor-iban').value  || '';

  if (matchVal && !conductorCodigo) {
    conductorCodigo = matchVal[1];
    conductorNombre = matchVal[2].trim();
    const c = getConductores().find(x => String(x.Codigo).padStart(6,'0') === conductorCodigo.padStart(6,'0'));
    if (c) conductorIban = c.IBAN || '';
  }

  if (!conductorCodigo) { showToast('Selecciona un conductor válido', 'error'); return; }

  await addGastoInd({ conductorCodigo, conductorNombre, conductorIban, fecha, importe, concepto, notas });
  cerrarModalGastoInd();
  showToast('Gasto independiente guardado ✓', 'success');
  renderGastosInd();
}

async function eliminarGastoInd(id) {
  if (!confirm('¿Eliminar este gasto independiente?')) return;
  await deleteGastoInd(id);
  showToast('Gasto eliminado', 'success');
  renderGastosInd();
}

// ============================================================
// HELPERS SEPA COMPARTIDOS (Anticipos y Embargos)
// No modifican generarXMLSEPA() ni el modal-sepa de Gastos —
// usan los mismos datos de empresa guardados en localStorage('sepa_config').
// ============================================================
function _getConfigSEPA() {
  const cfg = JSON.parse(localStorage.getItem('sepa_config') || '{}');
  if (!cfg.nombre || !cfg.iban || !cfg.bic) {
    showToast('Configura antes los datos de tu empresa en Liquidaciones → Gastos → Generar XML SEPA', 'error');
    return null;
  }
  return { ...cfg, iban: (cfg.iban || '').replace(/\s/g, '') };
}

function _construirXMLSEPA(cfg, transacciones, filenamePrefix) {
  const fecha  = new Date().toISOString().slice(0, 10);
  const msgId  = `MSG${Date.now()}`;
  let totalSum = 0, txs = '', nTxs = 0;

  transacciones.forEach((t, i) => {
    if (!t.importe || !t.iban) return;
    totalSum += t.importe;
    nTxs++;
    txs += `
    <CdtTrfTxInf>
      <PmtId><EndToEndId>TX${i + 1}-${msgId}</EndToEndId></PmtId>
      <Amt><InstdAmt Ccy="EUR">${t.importe.toFixed(2)}</InstdAmt></Amt>
      <CdtrAgt><FinInstnId><BICFI>${cfg.bic}</BICFI></FinInstnId></CdtrAgt>
      <Cdtr><Nm>${(t.nombre || '').substring(0,70)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${t.iban}</IBAN></Id></CdtrAcct>
      <RmtInf><Ustrd>${(t.concepto || '').substring(0,140)}</Ustrd></RmtInf>
    </CdtTrfTxInf>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString().slice(0,19)}</CreDtTm>
      <NbOfTxs>${nTxs}</NbOfTxs>
      <CtrlSum>${totalSum.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${cfg.nombre.substring(0,70)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT${msgId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${nTxs}</NbOfTxs>
      <CtrlSum>${totalSum.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${fecha}</ReqdExctnDt>
      <Dbtr><Nm>${cfg.nombre.substring(0,70)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${cfg.iban}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BICFI>${cfg.bic}</BICFI></FinInstnId></DbtrAgt>
      ${txs}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  const blob = new Blob([xml], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}_${fecha}.xml`;
  a.click();
  URL.revokeObjectURL(url);
  return { nTxs, totalSum };
}

// ============================================================
// MÓDULO ANTICIPOS
// ============================================================
async function cargarLiqAnticipos() {
  if (typeof cargarAnticipos === 'function') await cargarAnticipos();

  const cod        = document.getElementById('ant-conductor')?.value.trim().toLowerCase() || '';
  const estado      = document.getElementById('ant-estado')?.value || '';
  const estadoPago  = document.getElementById('ant-estado-pago')?.value || '';
  const desde       = document.getElementById('ant-desde')?.value || '';
  const hasta       = document.getElementById('ant-hasta')?.value || '';

  let lista = getAnticipos();
  if (cod) lista = lista.filter(a =>
    String(a.codigoConductor || '').toLowerCase().includes(cod) ||
    String(a.nombreConductor || '').toLowerCase().includes(cod));
  if (estado)     lista = lista.filter(a => a.estado === estado);
  if (estadoPago) lista = lista.filter(a => a.estadoPago === estadoPago);
  if (desde)       lista = lista.filter(a => a.fecha >= desde);
  if (hasta)       lista = lista.filter(a => a.fecha <= hasta);

  const conductores = getConductores();
  const tbody = document.getElementById('tbody-liq-anticipos');
  if (!tbody) return;

  tbody.innerHTML = lista.map(a => {
    const c = conductores.find(x => String(x.Codigo).padStart(6,'0') === String(a.codigoConductor).padStart(6,'0'));
    return `<tr>
      <td><input type="checkbox" class="chk-liq-ant" data-id="${a.id}" data-codigo="${a.codigoConductor}"
          data-nombre="${a.nombreConductor}" data-importe="${a.importe}" onchange="actualizarTotalLiqAnticipos()"></td>
      <td>${a.nombreConductor}<br><small>${a.codigoConductor}</small></td>
      <td class="td-iban">${c?.IBAN || '—'}</td>
      <td>${a.fecha || '—'}</td>
      <td>${a.concepto || '—'}</td>
      <td style="text-align:right;font-family:var(--font-mono)">
        ${parseFloat(a.importe||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €
      </td>
      <td><span class="estado-badge estado-${a.estado === 'descontado' ? 'liquidado' : 'pendiente'}">${a.estado}</span></td>
      <td><span class="estado-badge estado-${a.estadoPago === 'pagado' ? 'pagado' : 'pendiente'}">${a.estadoPago}</span></td>
      <td>${a.numFiniquito || '—'}</td>
      <td style="white-space:nowrap">
        <button class="btn-icon" onclick="editarAnticipo('${a.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="eliminarAnticipo('${a.id}')" title="Eliminar">🗑️</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;padding:20px;color:#888">Sin anticipos</td></tr>';

  actualizarTotalLiqAnticipos();
}

function actualizarTotalLiqAnticipos() {
  const total = Array.from(document.querySelectorAll('.chk-liq-ant:checked'))
    .reduce((s, c) => s + parseFloat(c.dataset.importe || 0), 0);
  const el = document.getElementById('ant-total');
  if (el) el.textContent = `${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
}

function antToggleTodos() {
  const todos = document.getElementById('chk-ant-todos').checked;
  document.querySelectorAll('.chk-liq-ant').forEach(c => c.checked = todos);
  actualizarTotalLiqAnticipos();
}

function antMarcarTodos() {
  document.querySelectorAll('.chk-liq-ant').forEach(c => c.checked = true);
  document.getElementById('chk-ant-todos').checked = true;
  actualizarTotalLiqAnticipos();
}

function abrirModalAnticipo(id = null) {
  const dl = document.getElementById('ant-conductores-list');
  if (dl) dl.innerHTML = getConductores()
    .sort((a,b) => String(a.Codigo).localeCompare(String(b.Codigo)))
    .map(c => `<option value="${c.Codigo} — ${c.Nombre}" data-codigo="${c.Codigo}" data-nombre="${c.Nombre}">`)
    .join('');

  document.getElementById('anticipo-id').value = '';
  document.getElementById('anticipo-conductor').value = '';
  document.getElementById('anticipo-cod-conductor').value = '';
  document.getElementById('anticipo-fecha').value = new Date().toISOString().slice(0,10);
  document.getElementById('anticipo-importe').value = '';
  document.getElementById('anticipo-concepto').value = '';
  document.getElementById('anticipo-titulo').textContent = '💵 Nuevo Anticipo';

  if (id) {
    const a = getAnticipos().find(x => x.id === id);
    if (a) {
      document.getElementById('anticipo-id').value = a.id;
      document.getElementById('anticipo-conductor').value = `${a.codigoConductor} — ${a.nombreConductor}`;
      document.getElementById('anticipo-cod-conductor').value = a.codigoConductor;
      document.getElementById('anticipo-fecha').value = a.fecha || '';
      document.getElementById('anticipo-importe').value = a.importe || '';
      document.getElementById('anticipo-concepto').value = a.concepto || '';
      document.getElementById('anticipo-titulo').textContent = '✏️ Editar Anticipo';
    }
  }
  document.getElementById('modal-anticipo').style.display = 'flex';
}

function cerrarModalAnticipo() {
  document.getElementById('modal-anticipo').style.display = 'none';
}

function editarAnticipo(id) { abrirModalAnticipo(id); }

async function guardarAnticipo() {
  const conductorVal = document.getElementById('anticipo-conductor').value.trim();
  const fecha    = document.getElementById('anticipo-fecha').value;
  const importe  = parseFloat(document.getElementById('anticipo-importe').value);
  const concepto = document.getElementById('anticipo-concepto').value.trim() || 'Anticipo gastos de viaje';
  const id       = document.getElementById('anticipo-id').value;

  const match = conductorVal.match(/^(\d{5,6})\s*[—-]\s*(.+)/);
  let cod = document.getElementById('anticipo-cod-conductor').value;
  if (match) cod = match[1];
  const c = getConductores().find(x => String(x.Codigo).padStart(6,'0') === String(cod).padStart(6,'0'));

  if (!c) { showToast('Selecciona un conductor válido', 'error'); return; }
  if (!fecha || !importe) { showToast('Rellena fecha e importe', 'error'); return; }

  if (id) {
    await updateAnticipo(id, { codigoConductor: c.Codigo, nombreConductor: c.Nombre, fecha, importe, concepto });
    showToast('Anticipo actualizado ✓', 'success');
  } else {
    await addAnticipo({ codigoConductor: c.Codigo, nombreConductor: c.Nombre, fecha, importe, concepto });
    showToast('Anticipo guardado ✓', 'success');
  }
  cerrarModalAnticipo();
  cargarLiqAnticipos();
}

async function eliminarAnticipo(id) {
  if (!confirm('¿Eliminar este anticipo?')) return;
  await deleteAnticipo(id);
  showToast('Anticipo eliminado', 'success');
  cargarLiqAnticipos();
}

function liqAnticiposXML() {
  const checks = document.querySelectorAll('.chk-liq-ant:checked');
  if (!checks.length) { showToast('Selecciona al menos un anticipo', 'error'); return; }
  const cfg = _getConfigSEPA();
  if (!cfg) return;

  const conductores = getConductores();
  const transacciones = Array.from(checks).map(c => {
    const cond = conductores.find(x => String(x.Codigo).padStart(6,'0') === String(c.dataset.codigo).padStart(6,'0'));
    return {
      nombre:   c.dataset.nombre,
      iban:     (cond?.IBAN || '').replace(/\s/g, ''),
      importe:  parseFloat(c.dataset.importe || 0),
      concepto: 'ANTICIPO GASTOS DE VIAJE',
    };
  }).filter(t => t.iban && t.importe);

  if (!transacciones.length) { showToast('Ningún anticipo seleccionado tiene IBAN válido en la ficha del conductor', 'error'); return; }

  const { nTxs } = _construirXMLSEPA(cfg, transacciones, 'sepa_anticipos');
  showToast(`XML SEPA generado (${nTxs} transacciones) ✓`, 'success');
}

async function liqAnticiposPagar() {
  const ids = Array.from(document.querySelectorAll('.chk-liq-ant:checked')).map(c => c.dataset.id);
  if (!ids.length) { showToast('Selecciona al menos un anticipo', 'error'); return; }
  if (!confirm(`¿Marcar ${ids.length} anticipo(s) como pagados?`)) return;

  const numRemesa = generarNumRemesaAnticipos();
  const resultado = await pagarAnticipos(ids, numRemesa);
  if (resultado.fallidos.length) {
    showToast(`${resultado.ok}/${resultado.total} pagados — ${resultado.fallidos.length} con error`, 'error');
    mostrarModalFallidos('Pago de anticipos', resultado);
  } else {
    showToast(`${resultado.ok} anticipo(s) marcados como pagados ✓`, 'success');
  }
  cargarLiqAnticipos();
}

function liqAnticiposExcel() {
  const lista = getAnticipos();
  if (!lista.length) { showToast('No hay anticipos para exportar', 'error'); return; }
  const conductores = getConductores();
  const headers = ['Código','Nombre','IBAN','Fecha','Concepto','Importe','Estado','Pago','Finiquito'];
  const filas = lista.map(a => {
    const c = conductores.find(x => String(x.Codigo).padStart(6,'0') === String(a.codigoConductor).padStart(6,'0'));
    return {
      'Código': a.codigoConductor, 'Nombre': a.nombreConductor, 'IBAN': c?.IBAN || '',
      'Fecha': a.fecha, 'Concepto': a.concepto,
      'Importe': parseFloat(a.importe||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}),
      'Estado': a.estado, 'Pago': a.estadoPago, 'Finiquito': a.numFiniquito || '',
    };
  });
  descargarXLSX(headers, filas, `anticipos_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ============================================================
// MÓDULO EMBARGOS
// ============================================================
async function cargarLiqEmbargos() {
  if (typeof cargarEmbargos === 'function') await cargarEmbargos();

  const cod       = document.getElementById('emb-conductor')?.value.trim().toLowerCase() || '';
  const organismo = document.getElementById('emb-organismo')?.value.trim().toLowerCase() || '';
  const estado    = document.getElementById('emb-estado')?.value || '';

  let lista = getEmbargos();
  if (cod) lista = lista.filter(e =>
    String(e.codigoConductor || '').toLowerCase().includes(cod) ||
    String(e.nombreConductor || '').toLowerCase().includes(cod));
  if (organismo) lista = lista.filter(e => String(e.organismo || '').toLowerCase().includes(organismo));
  if (estado)    lista = lista.filter(e => e.estado === estado);

  const tbody = document.getElementById('tbody-liq-embargos');
  if (!tbody) return;
  const fmt = n => parseFloat(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  tbody.innerHTML = lista.map(e => {
    const pendiente = parseFloat(e.importeTotal || 0) - parseFloat(e.totalPagado || 0);
    return `<tr>
      <td><input type="checkbox" class="chk-liq-emb" data-id="${e.id}" data-codigo="${e.codigoConductor}"
          data-nombre="${e.nombreConductor}" data-organismo="${e.organismo}" data-expediente="${e.numExpediente}"
          data-iban="${e.ibanTercero}" data-nombretercero="${e.nombreTercero}" data-mensual="${e.importeMensual}"
          onchange="actualizarTotalLiqEmbargos()"></td>
      <td>${e.nombreConductor}<br><small>${e.codigoConductor}</small></td>
      <td>${e.organismo || '—'}</td>
      <td>${e.numExpediente || '—'}</td>
      <td class="td-iban">${e.ibanTercero || '—'}</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(e.importeTotal)} €</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(e.importeMensual)} €</td>
      <td style="text-align:right;font-family:var(--font-mono)">${fmt(e.totalPagado)} €</td>
      <td style="text-align:right;font-family:var(--font-mono);font-weight:600">${fmt(pendiente)} €</td>
      <td><span class="estado-badge estado-${e.estado === 'finalizado' ? 'liquidado' : 'pendiente'}" style="cursor:pointer"
          onclick="cambiarEstadoEmbargo('${e.id}','${e.estado}')" title="Clic para cambiar estado manualmente">${e.estado}</span></td>
      <td style="white-space:nowrap">
        <button class="btn-icon" onclick="editarEmbargo('${e.id}')" title="Editar">✏️</button>
        <button class="btn-icon" onclick="verPagosEmbargo('${e.id}')" title="Histórico de pagos">📋</button>
        <button class="btn-icon" onclick="eliminarEmbargo('${e.id}')" title="Eliminar">🗑️</button>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="11" style="text-align:center;padding:20px;color:#888">Sin embargos</td></tr>';

  actualizarTotalLiqEmbargos();
}

function actualizarTotalLiqEmbargos() {
  const total = Array.from(document.querySelectorAll('.chk-liq-emb:checked'))
    .reduce((s, c) => s + parseFloat(c.dataset.mensual || 0), 0);
  const el = document.getElementById('emb-total');
  if (el) el.textContent = `${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
}

function embToggleTodos() {
  const todos = document.getElementById('chk-emb-todos').checked;
  document.querySelectorAll('.chk-liq-emb').forEach(c => c.checked = todos);
  actualizarTotalLiqEmbargos();
}

function embMarcarTodos() {
  document.querySelectorAll('.chk-liq-emb').forEach(c => c.checked = true);
  document.getElementById('chk-emb-todos').checked = true;
  actualizarTotalLiqEmbargos();
}

async function cambiarEstadoEmbargo(id, actual) {
  const nuevo = actual === 'activo' ? 'finalizado' : 'activo';
  if (!confirm(`¿Cambiar el estado de este embargo a "${nuevo}"?`)) return;
  await setEstadoEmbargo(id, nuevo);
  showToast('Estado actualizado ✓', 'success');
  cargarLiqEmbargos();
}

function abrirModalEmbargo(id = null) {
  document.getElementById('embargo-id').value = '';
  document.getElementById('embargo-conductor').value = '';
  document.getElementById('embargo-cod-conductor').value = '';
  document.getElementById('embargo-organismo').value = '';
  document.getElementById('embargo-num-expediente').value = '';
  document.getElementById('embargo-importe-total').value = '';
  document.getElementById('embargo-importe-mensual').value = '';
  document.getElementById('embargo-fecha-inicio').value = new Date().toISOString().slice(0,10);
  document.getElementById('embargo-fecha-fin').value = '';
  document.getElementById('embargo-nombre-tercero').value = '';
  document.getElementById('embargo-iban-tercero').value = '';
  document.getElementById('embargo-titulo').textContent = '⚖️ Nuevo Embargo';

  if (id) {
    const e = getEmbargos().find(x => x.id === id);
    if (e) {
      document.getElementById('embargo-id').value = e.id;
      document.getElementById('embargo-conductor').value = `${e.codigoConductor} — ${e.nombreConductor}`;
      document.getElementById('embargo-cod-conductor').value = e.codigoConductor;
      document.getElementById('embargo-organismo').value = e.organismo || '';
      document.getElementById('embargo-num-expediente').value = e.numExpediente || '';
      document.getElementById('embargo-importe-total').value = e.importeTotal || '';
      document.getElementById('embargo-importe-mensual').value = e.importeMensual || '';
      document.getElementById('embargo-fecha-inicio').value = e.fechaInicio || '';
      document.getElementById('embargo-fecha-fin').value = e.fechaFin || '';
      document.getElementById('embargo-nombre-tercero').value = e.nombreTercero || '';
      document.getElementById('embargo-iban-tercero').value = e.ibanTercero || '';
      document.getElementById('embargo-titulo').textContent = '✏️ Editar Embargo';
    }
  }
  document.getElementById('modal-embargo').style.display = 'flex';
}

function cerrarModalEmbargo() {
  document.getElementById('modal-embargo').style.display = 'none';
}

function editarEmbargo(id) { abrirModalEmbargo(id); }

async function guardarEmbargo() {
  const conductorVal   = document.getElementById('embargo-conductor').value.trim();
  const organismo      = document.getElementById('embargo-organismo').value.trim();
  const numExpediente  = document.getElementById('embargo-num-expediente').value.trim();
  const importeTotal   = parseFloat(document.getElementById('embargo-importe-total').value);
  const importeMensual = parseFloat(document.getElementById('embargo-importe-mensual').value);
  const fechaInicio    = document.getElementById('embargo-fecha-inicio').value;
  const fechaFin       = document.getElementById('embargo-fecha-fin').value;
  const nombreTercero  = document.getElementById('embargo-nombre-tercero').value.trim();
  const ibanTercero    = document.getElementById('embargo-iban-tercero').value.trim().replace(/\s/g,'');
  const id             = document.getElementById('embargo-id').value;

  const match = conductorVal.match(/^(\d{5,6})\s*[—-]\s*(.+)/);
  let cod = document.getElementById('embargo-cod-conductor').value;
  if (match) cod = match[1];
  const c = getConductores().find(x => String(x.Codigo).padStart(6,'0') === String(cod).padStart(6,'0'));

  if (!c) { showToast('Selecciona un conductor válido', 'error'); return; }
  if (!organismo || !numExpediente || !importeTotal || !importeMensual || !fechaInicio) {
    showToast('Rellena todos los campos obligatorios', 'error'); return;
  }
  if (!nombreTercero || !ibanTercero) { showToast('Indica el beneficiario y su IBAN', 'error'); return; }

  const datos = {
    codigoConductor: c.Codigo, nombreConductor: c.Nombre,
    organismo, numExpediente, importeTotal, importeMensual,
    fechaInicio, fechaFin, nombreTercero, ibanTercero,
  };

  if (id) {
    await updateEmbargo(id, datos);
    showToast('Embargo actualizado ✓', 'success');
  } else {
    await addEmbargo(datos);
    showToast('Embargo guardado ✓', 'success');
  }
  cerrarModalEmbargo();
  cargarLiqEmbargos();
}

async function eliminarEmbargo(id) {
  if (!confirm('¿Eliminar este embargo? Se perderá el histórico de pagos registrado.')) return;
  await deleteEmbargo(id);
  showToast('Embargo eliminado', 'success');
  cargarLiqEmbargos();
}

function verPagosEmbargo(id) {
  const e = getEmbargos().find(x => x.id === id);
  if (!e) return;
  document.getElementById('modal-historico-embargo')?.remove();

  const filas = (e.pagos || []).slice()
    .sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''))
    .map(p => `<tr>
        <td>${(p.fecha||'').slice(0,10)}</td>
        <td>${p.numRemesa||'—'}</td>
        <td style="text-align:right;font-family:var(--font-mono)">
          ${parseFloat(p.importe||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €
        </td>
      </tr>`).join('')
    || '<tr><td colspan="3" style="text-align:center;padding:12px;color:var(--soft)">Sin pagos registrados</td></tr>';

  const pendiente = parseFloat(e.importeTotal||0) - parseFloat(e.totalPagado||0);
  const wrap = document.createElement('div');
  wrap.id = 'modal-historico-embargo';
  wrap.className = 'modal';
  wrap.style.display = 'flex';
  wrap.innerHTML = `
    <div class="modal-box" style="width:420px">
      <div class="modal-header">
        <h3>📋 ${e.nombreConductor} — ${e.numExpediente}</h3>
        <button onclick="document.getElementById('modal-historico-embargo').remove()" class="btn-icon">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:12px;color:var(--text-soft);margin-bottom:10px">
          Total: ${parseFloat(e.importeTotal||0).toLocaleString('es-ES',{minimumFractionDigits:2})} € ·
          Pagado: ${parseFloat(e.totalPagado||0).toLocaleString('es-ES',{minimumFractionDigits:2})} € ·
          Pendiente: ${pendiente.toLocaleString('es-ES',{minimumFractionDigits:2})} €
        </p>
        <table class="data-table" style="width:100%">
          <thead><tr><th>Fecha</th><th>Remesa</th><th style="text-align:right">Importe</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="document.getElementById('modal-historico-embargo').remove()">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function abrirModalPagoEmbargo() {
  const checks = document.querySelectorAll('.chk-liq-emb:checked');
  if (!checks.length) { showToast('Selecciona al menos un embargo', 'error'); return; }

  _pagoEmbargoRows = Array.from(checks).map(c => ({
    id:             c.dataset.id,
    nombreConductor: c.dataset.nombre,
    organismo:      c.dataset.organismo,
    numExpediente:  c.dataset.expediente,
    ibanTercero:    (c.dataset.iban || '').replace(/\s/g,''),
    nombreTercero:  c.dataset.nombretercero,
    importe:        parseFloat(c.dataset.mensual || 0),
  }));

  renderPagoEmbargoTabla();
  document.getElementById('pago-emb-fecha').value  = new Date().toISOString().slice(0,10);
  document.getElementById('pago-emb-numero').value = generarNumRemesaEmbargos();
  document.getElementById('modal-pago-embargo').style.display = 'flex';
}

function renderPagoEmbargoTabla() {
  const tbody = document.getElementById('tbody-pago-embargo');
  if (!tbody) return;
  tbody.innerHTML = _pagoEmbargoRows.map((r, i) => `
    <tr>
      <td>${r.nombreConductor}</td>
      <td>${r.organismo}</td>
      <td>${r.numExpediente}</td>
      <td style="text-align:right">
        <input type="number" value="${r.importe}" min="0" step="0.01" style="width:90px;text-align:right"
          onchange="_pagoEmbargoRows[${i}].importe = parseFloat(this.value)||0">
      </td>
    </tr>`).join('');
}

function cerrarModalPagoEmbargo() {
  document.getElementById('modal-pago-embargo').style.display = 'none';
}

function pagoEmbargoXML() {
  if (!_pagoEmbargoRows.length) { showToast('No hay embargos seleccionados', 'error'); return; }
  const cfg = _getConfigSEPA();
  if (!cfg) return;

  const transacciones = _pagoEmbargoRows
    .filter(r => r.importe > 0 && r.ibanTercero)
    .map(r => ({ nombre: r.nombreTercero || r.nombreConductor, iban: r.ibanTercero, importe: r.importe, concepto: r.numExpediente }));

  if (!transacciones.length) { showToast('Ningún embargo tiene IBAN o importe válido', 'error'); return; }

  const { nTxs } = _construirXMLSEPA(cfg, transacciones, 'sepa_embargos');
  showToast(`XML SEPA generado (${nTxs} transacciones) ✓`, 'success');
}

async function confirmarPagoEmbargos() {
  if (!_pagoEmbargoRows.length) { showToast('No hay embargos seleccionados', 'error'); return; }
  const fecha     = document.getElementById('pago-emb-fecha').value || new Date().toISOString().slice(0,10);
  const numRemesa = (document.getElementById('pago-emb-numero').value || generarNumRemesaEmbargos()).trim().toUpperCase();
  const pagos = _pagoEmbargoRows.filter(r => r.importe > 0).map(r => ({ id: r.id, importe: r.importe, fecha }));

  if (!pagos.length) { showToast('Ningún importe válido para registrar', 'error'); return; }

  const resultado = await registrarPagosEmbargos(pagos, numRemesa);
  if (resultado.fallidos.length) {
    showToast(`${resultado.ok}/${resultado.total} pagos registrados — ${resultado.fallidos.length} con error`, 'error');
    mostrarModalFallidos('Pago de embargos', resultado);
  } else {
    showToast(`${resultado.ok} pago(s) de embargo registrados ✓`, 'success');
  }
  cerrarModalPagoEmbargo();
  cargarLiqEmbargos();
}

function liqEmbargosExcel() {
  const lista = getEmbargos();
  if (!lista.length) { showToast('No hay embargos para exportar', 'error'); return; }
  const headers = ['Código','Nombre','Organismo','Nº Expediente','IBAN Tercero','Importe Total','Importe Mensual','Total Pagado','Pendiente','Estado'];
  const filas = lista.map(e => ({
    'Código': e.codigoConductor, 'Nombre': e.nombreConductor, 'Organismo': e.organismo,
    'Nº Expediente': e.numExpediente, 'IBAN Tercero': e.ibanTercero,
    'Importe Total':   parseFloat(e.importeTotal||0).toLocaleString('es-ES',{minimumFractionDigits:2}),
    'Importe Mensual': parseFloat(e.importeMensual||0).toLocaleString('es-ES',{minimumFractionDigits:2}),
    'Total Pagado':    parseFloat(e.totalPagado||0).toLocaleString('es-ES',{minimumFractionDigits:2}),
    'Pendiente':       (parseFloat(e.importeTotal||0) - parseFloat(e.totalPagado||0)).toLocaleString('es-ES',{minimumFractionDigits:2}),
    'Estado': e.estado,
  }));
  descargarXLSX(headers, filas, `embargos_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ============================================================
// MÓDULO FINIQUITOS (marcado sobre registros de dietas + descuento de anticipos)
// ============================================================
function liqDietasMarcarFiniquito() {
  const checks = Array.from(document.querySelectorAll('.chk-liq-d:checked'));
  if (!checks.length) { showToast('Selecciona al menos un registro', 'error'); return; }

  const ids = checks.map(c => c.dataset.id);
  const seleccionados = getRegistros().filter(r => ids.includes(r.id));
  const codigos = [...new Set(seleccionados.map(r => normCod(r.codigoConductor)))];
  if (codigos.length > 1) {
    showToast('Selecciona registros de un único conductor para marcar el finiquito', 'error');
    return;
  }

  const total   = checks.reduce((s, c) => s + parseFloat(c.dataset.total || 0), 0);
  const primero = seleccionados[0];
  _finiquitoIds = ids;
  _finiquitoConductor = primero.codigoConductor;

  document.getElementById('fin-conductor-nombre').textContent = `${primero.nombreConductor} — ${primero.codigoConductor}`;
  document.getElementById('fin-registros-resumen').textContent = `${seleccionados.length} registro(s) seleccionado(s)`;
  document.getElementById('fin-total-dietas').textContent =
    `${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;

  const pendientes = typeof getAnticiposPendientesConductor === 'function'
    ? getAnticiposPendientesConductor(primero.codigoConductor) : [];
  const avisoEl = document.getElementById('fin-anticipos-aviso');
  if (pendientes.length) {
    const importeAnt = pendientes.reduce((s, a) => s + parseFloat(a.importe || 0), 0);
    document.getElementById('fin-anticipos-importe').textContent =
      `${importeAnt.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} € (${pendientes.length} anticipo(s))`;
    avisoEl.style.display = 'block';
  } else {
    avisoEl.style.display = 'none';
  }

  document.getElementById('fin-numero').value = generarNumFiniquito();
  document.getElementById('modal-finiquito').style.display = 'flex';
}

function cerrarModalFiniquito() {
  document.getElementById('modal-finiquito').style.display = 'none';
}

async function confirmarFiniquito() {
  const numFiniquito = document.getElementById('fin-numero').value.trim().toUpperCase();
  if (!numFiniquito) { showToast('Indica un número de finiquito', 'error'); return; }
  if (!_finiquitoIds?.length) { showToast('No hay registros seleccionados', 'error'); return; }

  let resultado, resultadoAnt;
  window._suprimirListener = true;
  try {
    resultado    = await marcarRegistrosFiniquito(_finiquitoIds, numFiniquito);
    resultadoAnt = await descontarAnticiposConductor(_finiquitoConductor, numFiniquito);
  } finally {
    window._suprimirListener = false;
  }

  if (resultado.fallidos.length) {
    showToast(`${resultado.ok}/${resultado.total} registros marcados — ${resultado.fallidos.length} con error`, 'error');
    mostrarModalFallidos('Marcar Finiquito', resultado);
  } else {
    const msgAnt = resultadoAnt?.ok ? ` · ${resultadoAnt.ok} anticipo(s) marcados como descontados` : '';
    showToast(`Finiquito ${numFiniquito} registrado ✓${msgAnt}`, 'success');
  }

  cerrarModalFiniquito();
  cargarLiqDietas();
  if (document.getElementById('liq-anticipos')?.style.display !== 'none') cargarLiqAnticipos();
}
