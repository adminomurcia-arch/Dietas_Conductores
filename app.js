// =============================================
// app.js — Lógica principal de la interfaz
// =============================================

let modoActual = 'detallado';

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
  const enEdicion = !!document.getElementById('formRegistro').dataset.editId;
  const cod = document.getElementById('codConductor').value.trim();
  const c   = buscarConductor(cod);

  // Normalizar a 6 dígitos en el campo — solo si NO estamos editando
  if (c && !enEdicion) document.getElementById('codConductor').value = c.Codigo;

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

  // Pareja — solo en creación nueva; en edición el campo pareja es meramente informativo
  if (!enEdicion) {
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
  row.innerHTML = `
    <span class="op-num" style="min-width:22px;text-align:center;font-weight:600;
      color:var(--primary);font-size:13px;align-self:center">${n}</span>
    <input type="date">
    <input type="text" placeholder="Lugar" oninput="this.value=this.value.toUpperCase()">
    <button type="button" class="btn-del" onclick="this.parentElement.remove();renumerarOperaciones('${tipo}');calcularDietas()">🗑</button>
  `;
  lista.appendChild(row);
  fijarLimiteFechas();
  calcularDietas();
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
  const codCond = document.getElementById('codConductor').value.trim();
  const registrosCond = getRegistros().filter(r =>
    r.codigoConductor === codCond && r.id !== editId
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
    codigoConductor: document.getElementById('codConductor').value.trim(),
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
      // Identidad del conductor — nunca se cambia al editar
      datosRegistro.codigoConductor = regOriginal.codigoConductor;
      datosRegistro.nombreConductor = regOriginal.nombreConductor;
      // Campos de pareja — meramente informativos, no se tocan al editar
      datosRegistro.pareja         = regOriginal.pareja         || '';
      datosRegistro.registroPareja = regOriginal.registroPareja || '';
      datosRegistro.esDuplicado    = regOriginal.esDuplicado    || false;
      // Trazabilidad
      datosRegistro.creadoPor    = regOriginal.creadoPor  || 'admin';
      datosRegistro.creadoEn     = regOriginal.creadoEn   || regOriginal.fechaCreacion || ahora;
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
  } else {
    // SALVAGUARDA: nunca crear registro nuevo si editId tiene valor (por si acaso)
    if (document.getElementById('formRegistro').dataset.editId) {
      showToast('Error: se detectó edición activa pero no se procesó. Recarga y vuelve a intentarlo.', 'error');
      console.error('guardarRegistro: editId en dataset pero no en variable local — abortando addRegistro');
      return;
    }
    datosRegistro.creadoPor = 'admin';
    datosRegistro.creadoEn  = ahora;
    const regGuardado = await addRegistro(datosRegistro);
    showToast('Registro guardado ✓', 'success');

    // Si es DOBLE y NO es ya un duplicado, duplicar para la pareja (SOLO en creación nueva)
    if (datosRegistro.equipaje === 'DOBLE' && datosRegistro.pareja && !datosRegistro.esDuplicado) {
      const codPareja  = String(datosRegistro.pareja).split('—')[0].trim().padStart(6,'0');
      const condPareja = buscarConductor(codPareja);
      if (condPareja && confirm(`¿Duplicar este registro para la pareja ${condPareja.Nombre}?`)) {
        // Recalcular resultado con el PrecioKmt propio de la pareja (no copiar el del original)
        const resultadoPareja = calcularDietasParaConductor(condPareja, datosRegistro);
        const datosPareja = {
          ...datosRegistro,
          codigoConductor: condPareja.Codigo,
          nombreConductor: condPareja.Nombre,
          tractora:        condPareja.tractoraAsignada || datosRegistro.tractora,
          equipaje:        condPareja.EQUIPAJE         || 'DOBLE',
          pareja:          `${datosRegistro.codigoConductor} — ${datosRegistro.nombreConductor}`,
          creadoPor:       'admin',
          creadoEn:        ahora,
          // Copiar conteos de operaciones del registro original
          nCarga:    datosRegistro.nCarga,
          nPalet:    datosRegistro.nPalet,
          nRebote:   datosRegistro.nRebote,
          n24h:      datosRegistro.n24h,
          nPausa:    datosRegistro.nPausa,
          nNacional: datosRegistro.nNacional,
          nUK:       datosRegistro.nUK,
          nNDLF:     datosRegistro.nNDLF,
          // NO copiar gastos del conductor original: cada conductor tiene sus propios gastos
          gastosViaje:   0,
          gastosDetalle: [],
          anticipos:     0,
          // Usar resultado recalculado con PrecioKmt de la pareja
          resultado:     resultadoPareja,
        };
        await addRegistro(datosPareja);
        showToast(`Registro duplicado para ${condPareja.Nombre} ✓`, 'success');
      }
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

// ---- LIMPIAR FORMULARIO ----
function limpiarFormulario() {
  document.getElementById('formRegistro').reset();
  // Limpiar también el campo visual de búsqueda de conductor
  const buscarEl = document.getElementById('buscarConductorInput');
  if (buscarEl) buscarEl.value = '';
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
    String(r.codigoConductor).includes(filtro));
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
        ${r.equipaje==='DOBLE' && r.registroPareja
          ? `<span style="font-size:10px;color:#92400e;cursor:pointer" onclick="editarRegistro('${r.registroPareja}')"> 👥</span>` : ''}
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
  if (!confirm('¿Aprobar este registro del móvil?')) return;
  await setEstadoDietas(id, 'pendiente');
  showToast('Registro aprobado ✓', 'success');
  renderHistorial();
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

  // Datos del conductor — fijos en edición, no se tocan
  document.getElementById('codConductor').value         = r.codigoConductor;
  document.getElementById('nombreConductor').value      = r.nombreConductor  || '';
  document.getElementById('plataforma').value           = r.plataforma        || '';
  document.getElementById('categoria').value            = r.categoria         || '';
  document.getElementById('equipaje').value             = r.equipaje          || '';
  document.getElementById('pareja').value               = r.pareja            || '';
  document.getElementById('buscarConductorInput').value = `${r.codigoConductor} — ${r.nombreConductor || ''}`;
  document.getElementById('coefNacional').value         = r.coefNacional      || 0;
  // Adaptar interfaz según plataforma del registro (sin tocar conductor)
  adaptarPlataforma(r.plataforma || '', r.categoria || '');

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
          const inputs = row.querySelectorAll('input');
          if (inputs[0] && detalles[i].fecha) inputs[0].value = detalles[i].fecha;
          if (inputs[1] && detalles[i].lugar) inputs[1].value = detalles[i].lugar;
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

  // Incluir también los registros pareja de los DOBLE
  const idsConPareja = new Set(ids);
  getRegistros().forEach(r => {
    if (ids.includes(r.id) && r.registroPareja) idsConPareja.add(r.registroPareja);
  });

  await liquidarRegistros([...idsConPareja]);
  showToast(`${idsConPareja.size} registros liquidados ✓`, 'success');
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
  if (cod)   regs = regs.filter(r => String(r.codigoConductor) === cod);
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
    const c     = conductores.find(x => String(x.Codigo) === String(r.codigoConductor));
    const total = r.gastosDetalle?.reduce((s,g) => s + g.importe, 0) || r.gastosViaje || 0;
    const esDup = idsDup.has(r.id);
    // Concepto: lista de conceptos únicos del detalle
    const conceptos = r.gastosDetalle?.length
      ? [...new Set(r.gastosDetalle.map(g => g.concepto || g.tipo || ''))].filter(Boolean).join(', ')
      : (r.detalleGastos?.length
        ? [...new Set(r.detalleGastos.map(g => g.tipo || ''))].filter(Boolean).join(', ')
        : '—');
    const dupBadge = esDup
      ? `<span title="Posible duplicado detectado" style="font-size:10px;padding:2px 6px;background:#fef3c7;color:#b45309;border-radius:8px;font-weight:600;margin-left:4px">⚠️ DUP</span>`
      : '';
    const rowStyle = esDup ? 'background:#fffbeb;' : '';
    return `<tr style="${rowStyle}">
      <td><input type="checkbox" class="chk-liq-g" data-id="${r.id}"
          data-total="${total}" data-iban="${c?.IBAN||''}"
          data-nombre="${r.nombreConductor}"
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
  if (cod)   regs = regs.filter(r => String(r.codigoConductor).includes(cod));
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
