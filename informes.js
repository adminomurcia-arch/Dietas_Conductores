// =============================================
// informes.js — Previsualización y exportación
// =============================================

// Estado del informe activo
let _informe = { tipo: '', datos: [], headers: [], filas: [], titulo: '' };

// ---- UTILIDADES ----
function filtrarRegistros(desde, hasta, plataforma, conductorCod) {
  let regs = getRegistros();
  // Excluir registros pendientes de validación — no aparecen en informes hasta ser aprobados
  regs = regs.filter(r => r.estadoDietas !== 'pendiente_validacion');
  if (desde)        regs = regs.filter(r => r.fechaSalida >= desde);
  if (hasta)        regs = regs.filter(r => r.fechaSalida <= hasta);
  if (plataforma)   regs = regs.filter(r => r.plataforma === plataforma);
  if (conductorCod) regs = regs.filter(r => {
    const a = String(r.codigoConductor).replace(/^0+/,'');
    const b = String(conductorCod).replace(/^0+/,'');
    return a === b;
  });
  return regs;
}

function fmt2(n) { return parseFloat(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ---- MULTI-SELECT LIQUIDACIONES ----
// msId: 'conductor' | 'gestoria' | 'rrhh'

function msPoblar(msId, plataforma) {
  const drop = document.getElementById(`ms-drop-${msId}`);
  if (!drop) return;
  // Guardar selección actual
  const seleccionados = msGetSeleccionados(msId);
  // Reconstruir items (manteniendo el "Todas")
  const todas = drop.querySelector('.ms-todas');
  drop.innerHTML = '';
  drop.appendChild(todas);

  // 'gastos' usa un campo y una fuente de datos distintos al resto (que son de dietas)
  const campo  = msId === 'gastos' ? 'numLiquidacionGastos' : 'numLiquidacionDietas';
  const fuente = msId === 'gastos' ? getFuenteGastos() : getRegistros();

  const nums = [...new Set(
    fuente
      .filter(r => r[campo])
      .filter(r => !plataforma || r.plataforma === plataforma)
      .map(r => r[campo])
  )].sort();
  nums.forEach(n => {
    const lbl = document.createElement('label');
    lbl.className = 'ms-liq-item';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.value = n;
    chk.checked = seleccionados.length === 0 || seleccionados.includes(n);
    chk.onchange = () => msActualizarLabel(msId);
    lbl.appendChild(chk);
    lbl.appendChild(document.createTextNode(n));
    drop.appendChild(lbl);
  });
  msActualizarLabel(msId);
}

function msToggle(msId) {
  const drop = document.getElementById(`ms-drop-${msId}`);
  const trigger = drop?.previousElementSibling;
  const isOpen = drop?.classList.contains('open');
  // Cerrar todos los demás
  document.querySelectorAll('.ms-liq-dropdown.open').forEach(d => {
    d.classList.remove('open');
    d.previousElementSibling?.classList.remove('open');
  });
  if (!isOpen) {
    drop?.classList.add('open');
    trigger?.classList.add('open');
    // Poblar si está vacío (solo el "Todas")
    if (drop && drop.querySelectorAll('.ms-liq-item:not(.ms-todas)').length === 0) {
      const plat = msGetPlat(msId);
      msPoblar(msId, plat);
    }
  }
}

function msTodas(msId) {
  const todas = document.getElementById(`ms-todas-${msId}`);
  const drop  = document.getElementById(`ms-drop-${msId}`);
  drop.querySelectorAll('.ms-liq-item:not(.ms-todas) input').forEach(c => {
    c.checked = todas.checked;
  });
  msActualizarLabel(msId);
}

function msActualizarLabel(msId) {
  const drop   = document.getElementById(`ms-drop-${msId}`);
  const todas  = document.getElementById(`ms-todas-${msId}`);
  const items  = Array.from(drop.querySelectorAll('.ms-liq-item:not(.ms-todas) input'));
  const marcados = items.filter(c => c.checked);
  todas.checked = marcados.length === items.length;
  const label = document.getElementById(`ms-label-${msId}`);
  if (!label) return;
  if (marcados.length === 0 || marcados.length === items.length) {
    label.textContent = 'Todas las liquidaciones';
  } else if (marcados.length === 1) {
    label.textContent = marcados[0].value;
  } else {
    label.textContent = `${marcados.length} liquidaciones`;
  }
}

function msGetSeleccionados(msId) {
  const drop = document.getElementById(`ms-drop-${msId}`);
  if (!drop) return [];
  return Array.from(drop.querySelectorAll('.ms-liq-item:not(.ms-todas) input:checked')).map(c => c.value);
}

function msGetPlat(msId) {
  if (msId === 'conductor') return document.getElementById('inf-conductor-plataforma')?.value || '';
  if (msId === 'gestoria')  return document.getElementById('inf-plataforma-gestoria')?.value  || '';
  if (msId === 'rrhh')      return document.getElementById('inf-rrhh-plataforma')?.value      || '';
  return '';
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.ms-liq-wrap')) {
    document.querySelectorAll('.ms-liq-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.previousElementSibling?.classList.remove('open');
    });
  }
});

// Poblar al cambiar plataforma (mantener compatibilidad con onchange existentes)
function toggleConductorNumLiq() {
  msPoblar('conductor', document.getElementById('inf-conductor-plataforma')?.value || '');
}
function toggleGestoriaNumLiq() {
  msPoblar('gestoria', document.getElementById('inf-plataforma-gestoria')?.value || '');
}
function toggleGastosNumLiq() {
  msPoblar('gastos', '');
}

// ---- FUENTE COMBINADA PARA EL INFORME DE GASTOS ----
// Une gastos de viaje (registros de dietas con gasto > 0) + gastos independientes,
// normalizando ambos a los mismos nombres de campo (codigoConductor/nombreConductor)
// para poder filtrarlos y agruparlos de forma uniforme.
function getFuenteGastos() {
  const viajes = getRegistros()
    .filter(r => r.estadoDietas !== 'pendiente_validacion')
    .filter(r => (r.gastosDetalle?.length > 0) || (r.gastosViaje > 0))
    .map(r => ({
      origen:          'Viaje',
      codigoConductor: r.codigoConductor,
      nombreConductor: r.nombreConductor,
      plataforma:      r.plataforma || '',
      fecha:           r.fechaSalida,
      periodo:         `${r.fechaSalida} → ${r.fechaLlegada}`,
      concepto: r.gastosDetalle?.length
        ? [...new Set(r.gastosDetalle.map(g => g.concepto || g.tipo || ''))].filter(Boolean).join(', ')
        : 'Gastos viaje',
      importe: r.gastosDetalle?.length
        ? r.gastosDetalle.reduce((s, g) => s + (parseFloat(g.importe) || 0), 0)
        : parseFloat(r.gastosViaje || 0),
      estadoGastos:         r.estadoGastos || 'pendiente',
      numLiquidacionGastos: r.numLiquidacionGastos || '',
    }));

  const independientes = (typeof getGastosInd === 'function' ? getGastosInd() : [])
    .map(g => ({
      origen:          'Independiente',
      codigoConductor: g.conductorCodigo,
      nombreConductor: g.conductorNombre,
      plataforma:      '',
      fecha:           g.fecha,
      periodo:         g.fecha,
      concepto:        g.concepto || '—',
      importe:         parseFloat(g.importe || 0),
      estadoGastos:         g.estadoGastos || 'pendiente',
      numLiquidacionGastos: g.numLiquidacionGastos || '',
    }));

  return [...viajes, ...independientes];
}

// ============================================================
// PREVISUALIZACIÓN — Conductor
// ============================================================
function previsualizarConductor() {
  const rawCod = document.getElementById('inf-cod-conductor').value.trim();
  // Si el usuario seleccionó del datalist puede venir "10042 — García, Juan" — extraer solo el código
  const match  = rawCod.match(/^(\d+)/);
  const cod    = match ? match[1] : rawCod;
  const desde    = document.getElementById('inf-desde').value;
  const hasta    = document.getElementById('inf-hasta').value;
  const plat     = document.getElementById('inf-conductor-plataforma')?.value || '';
  const equipaje = document.getElementById('inf-conductor-equipaje')?.value   || '';
  const estado   = document.getElementById('inf-conductor-estado')?.value     || '';
  const numLiqs  = msGetSeleccionados('conductor');
  let regsRaw = filtrarRegistros(desde, hasta, plat, cod);
  if (equipaje)        regsRaw = regsRaw.filter(r => (r.equipaje || '').toUpperCase() === equipaje);
  if (estado)          regsRaw = regsRaw.filter(r => (r.estadoDietas || 'pendiente') === estado);
  if (numLiqs.length)  regsRaw = regsRaw.filter(r => numLiqs.includes(r.numLiquidacionDietas));
  const regs    = regsRaw.slice().sort((a,b) => String(a.codigoConductor).localeCompare(String(b.codigoConductor)));
  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  const ESTADO_LABEL = { pendiente: 'Pendiente', liquidado: 'Liquidado', pagado: 'Pagado', bloqueado: 'Bloqueado', pendiente_validacion: 'Pend. validación' };
  const fmtKm = v => (v && Number(v) > 0) ? Number(v).toLocaleString('es-ES') : '—';
  const fmtN0 = v => (v && Number(v) > 0) ? Number(v) : '';
  const conds = getConductores();
  const getCond = cod => conds.find(c => c.Codigo === String(cod).padStart(6,'0')) || {};

  // Detectar si hay registros CAUDETE para mostrar sus columnas propias
  const hayCAUDETE = regs.some(r => r.plataforma === 'CAUDETE');
  const hayTJGFIL  = regs.some(r => r.plataforma !== 'CAUDETE');

  const headers = [
    'Código', 'Nombre', 'Plataforma', 'Equipaje', 'Pareja', 'Tractora',
    'Salida', 'Llegada', 'Días', 'Estado', 'Finiquito',
    // Kilómetros
    'Km Salida', 'Km Vuelta', 'Total Km',
    // Operaciones
    '24H', 'Pausa', 'Cargas', 'Palets', 'Rebote', 'Nac.', 'UK', 'NDLF',
    // Económico TJG/FILARDI
    ...(hayTJGFIL ? ['H.Extra', 'H.Presen.', 'Nocturno', 'Diet.Nac', 'Diet.Int', 'Mejora'] : []),
    // Económico CAUDETE
    ...(hayCAUDETE ? ['Plus Efic.', 'Disponib.', 'Dietas Cau.'] : []),
    // Totales
    'Total Dietas', 'Gastos Viaje', 'Anticipos',
  ];

  const filas = regs.map(r => {
    const c = getCond(r.codigoConductor);
    const esCau = r.plataforma === 'CAUDETE';
    const fila = {
      'Código':       r.codigoConductor,
      'Nombre':       r.nombreConductor,
      'Plataforma':   r.plataforma || '—',
      'Equipaje':     c.EQUIPAJE    || '—',
      'Pareja':       c.PAREJA      || '—',
      'Tractora':     r.tractora    || c.tractoraAsignada || '—',
      'Salida':       r.fechaSalida,
      'Llegada':      r.fechaLlegada,
      'Días':         r.diasTrabajados,
      'Estado':       ESTADO_LABEL[r.estadoDietas || 'pendiente'] || r.estadoDietas || 'Pendiente',
      'Finiquito':    r.esFiniquito ? `🏁 ${r.numFiniquito || ''}` : '—',
      // Kilómetros
      'Km Salida':    fmtKm(r.kmSalida),
      'Km Vuelta':    fmtKm(r.kmVuelta),
      'Total Km':     fmtKm(r.totalKm),
      // Operaciones
      '24H':    fmtN0(r.n24h),
      'Pausa':  fmtN0(r.nPausa),
      'Cargas': fmtN0(r.nCarga),
      'Palets': fmtN0(r.nPalet),
      'Rebote': fmtN0(r.nRebote),
      'Nac.':   fmtN0(r.nNacional),
      'UK':     fmtN0(r.nUK),
      'NDLF':   fmtN0(r.nNDLF),
      // Totales
      'Total Dietas': fmt2(esCau ? r.resultado?.TOTAL : r.resultado?.sumDietas) + ' €',
      'Gastos Viaje': r.gastosViaje ? fmt2(r.gastosViaje) + ' €' : '—',
      'Anticipos':    r.anticipos   ? fmt2(r.anticipos)   + ' €' : '—',
    };
    if (hayTJGFIL) {
      fila['H.Extra']   = !esCau ? fmt2(r.resultado?.H_EXTRA)   + ' €' : '';
      fila['H.Presen.'] = !esCau ? fmt2(r.resultado?.H_PRESEN)  + ' €' : '';
      fila['Nocturno']  = !esCau ? fmt2(r.resultado?.NOCTURNO)  + ' €' : '';
      fila['Diet.Nac']  = !esCau ? fmt2(r.resultado?.DIET_NAC)  + ' €' : '';
      fila['Diet.Int']  = !esCau ? fmt2(r.resultado?.DIET_INTER)+ ' €' : '';
      fila['Mejora']    = !esCau ? fmt2(r.resultado?.MEJORA)    + ' €' : '';
    }
    if (hayCAUDETE) {
      fila['Plus Efic.']  = esCau ? fmt2(r.resultado?.PLUS_EFICIENCIA) + ' €' : '';
      fila['Disponib.']   = esCau ? fmt2(r.resultado?.DISPONIBILIDAD)  + ' €' : '';
      fila['Dietas Cau.'] = esCau ? fmt2(r.resultado?.DIETAS)          + ' €' : '';
    }
    return fila;
  });

  // Añadir columnas numéricas al set de alineación derecha
  ['Días','Km Salida','Km Vuelta','Total Km','24H','Pausa','Cargas','Palets','Rebote','Nac.','UK','NDLF',
   'H.Extra','H.Presen.','Nocturno','Diet.Nac','Diet.Int','Mejora',
   'Plus Efic.','Disponib.','Dietas Cau.','Total Dietas','Gastos Viaje','Anticipos']
    .forEach(h => NUM_COLS.add(h));

  _informe = { tipo: 'conductor', datos: regs, headers, filas, titulo: 'Informe Conductor' };
  mostrarPreview(headers, filas, 'Informe Conductor');
}

// ============================================================
// PREVISUALIZACIÓN — Gestoría
// ============================================================
function previsualizarGestoria() {
  try {
  const plat    = document.getElementById('inf-plataforma-gestoria').value;
  const formato = document.getElementById('inf-gest-formato').value;
  const desde   = document.getElementById('inf-gest-desde').value;
  const hasta   = document.getElementById('inf-gest-hasta').value;
  const estado  = document.getElementById('inf-gest-estado')?.value  || '';
  const numLiqs = msGetSeleccionados('gestoria');
  let regsRaw  = filtrarRegistros(desde, hasta, plat, '');
  if (estado)         regsRaw = regsRaw.filter(r => (r.estadoDietas || 'pendiente') === estado);
  if (numLiqs.length) regsRaw = regsRaw.filter(r => numLiqs.includes(r.numLiquidacionDietas));
  const regs     = regsRaw.slice().sort((a,b) => String(a.codigoConductor).localeCompare(String(b.codigoConductor)));
  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  let headers, filas;

  if (formato === 'resumido') {
    // Agrupar por conductor y sumar importes
    const mapa = {};
    regs.forEach(r => {
      const cod = r.codigoConductor;
      if (!mapa[cod]) {
        mapa[cod] = {
          cod, nombre: r.nombreConductor, nReg: 0,
          PLUS_EFICIENCIA: 0, DISPONIBILIDAD: 0, DIETAS: 0, DIET_NAC: 0, DIET_INTER: 0, TOTAL_CAU: 0, ANTICIPOS: 0,
          H_EXTRA: 0, H_PRESEN: 0, NOCTURNO: 0, MEJORA: 0, TOTAL: 0,
        };
      }
      const m = mapa[cod];
      m.nReg++;
      m.ANTICIPOS += parseFloat(r.anticipos || 0);
      if (plat === 'CAUDETE') {
        const dietas   = parseFloat(r.resultado?.DIETAS      || 0);
        const diasTrab = parseFloat(r.diasTrabajados          || 0);
        const coefNac  = parseFloat(r.coefNacional            || 0);
        const dietNac  = r.resultado?.DIET_NAC  !== undefined
          ? parseFloat(r.resultado.DIET_NAC)
          : (diasTrab > 0 ? (dietas / diasTrab) * coefNac : 0);
        const dietInter = r.resultado?.DIET_INTER !== undefined
          ? parseFloat(r.resultado.DIET_INTER)
          : dietas - dietNac;
        m.PLUS_EFICIENCIA += parseFloat(r.resultado?.PLUS_EFICIENCIA || 0);
        m.DISPONIBILIDAD  += parseFloat(r.resultado?.DISPONIBILIDAD  || 0);
        m.DIETAS          += dietas;
        m.DIET_NAC        += dietNac;
        m.DIET_INTER      += dietInter;
        m.TOTAL_CAU       += parseFloat(r.resultado?.TOTAL           || 0);
      } else {
        m.H_EXTRA   += parseFloat(r.resultado?.H_EXTRA   || 0);
        m.H_PRESEN  += parseFloat(r.resultado?.H_PRESEN  || 0);
        m.NOCTURNO  += parseFloat(r.resultado?.NOCTURNO  || 0);
        m.DIET_NAC  += parseFloat(r.resultado?.DIET_NAC  || 0);
        m.DIET_INTER+= parseFloat(r.resultado?.DIET_INTER|| 0);
        m.MEJORA    += parseFloat(r.resultado?.MEJORA    || 0);
        m.TOTAL     += parseFloat(r.resultado?.sumDietas || 0);
      }
    });

    const conductores = Object.values(mapa).sort((a,b) => String(a.cod).localeCompare(String(b.cod)));

    if (plat === 'CAUDETE') {
      headers = ['COD','NOMBRE','PLUS_EFICIENCIA','DISPONIBILIDAD','DIETAS','DIET_NAC','DIET_INTER','TOTAL','ANTICIPOS'];
      filas = conductores.map(m => ({
        'COD':             m.cod,
        'NOMBRE':          m.nombre,
        'PLUS_EFICIENCIA': fmt2(m.PLUS_EFICIENCIA),
        'DISPONIBILIDAD':  fmt2(m.DISPONIBILIDAD),
        'DIETAS':          fmt2(m.DIETAS),
        'DIET_NAC':        fmt2(m.DIET_NAC),
        'DIET_INTER':      fmt2(m.DIET_INTER),
        'TOTAL':           fmt2(m.TOTAL_CAU),
        'ANTICIPOS':       fmt2(m.ANTICIPOS),
      }));
    } else {
      headers = ['COD','NOMBRE','H_EXTRA','H_PRESEN','NOCTURNO','DIET_NAC','DIET_INTER','MEJORA','TOTAL','ANTICIPOS'];
      filas = conductores.map(m => ({
        'COD':        m.cod,
        'NOMBRE':     m.nombre,
        'H_EXTRA':    fmt2(m.H_EXTRA),
        'H_PRESEN':   fmt2(m.H_PRESEN),
        'NOCTURNO':   fmt2(m.NOCTURNO),
        'DIET_NAC':   fmt2(m.DIET_NAC),
        'DIET_INTER': fmt2(m.DIET_INTER),
        'MEJORA':     fmt2(m.MEJORA),
        'TOTAL':      fmt2(m.TOTAL),
        'ANTICIPOS':  fmt2(m.ANTICIPOS),
      }));
    }

  } else {
    // Detallado — una fila por registro
    if (plat === 'CAUDETE') {
      headers = ['COD','NOMBRE','PERÍODO','PLUS_EFICIENCIA','DISPONIBILIDAD','DIETAS','DIET_NAC','DIET_INTER','TOTAL','ANTICIPOS','FINIQUITO'];
      filas = regs.map(r => {
        const dietas   = parseFloat(r.resultado?.DIETAS      || 0);
        const diasTrab = parseFloat(r.diasTrabajados          || 0);
        const coefNac  = parseFloat(r.coefNacional            || 0);
        const dietNac  = r.resultado?.DIET_NAC  !== undefined
          ? parseFloat(r.resultado.DIET_NAC)
          : (diasTrab > 0 ? (dietas / diasTrab) * coefNac : 0);
        const dietInter = r.resultado?.DIET_INTER !== undefined
          ? parseFloat(r.resultado.DIET_INTER)
          : dietas - dietNac;
        return {
          'COD':             r.codigoConductor,
          'NOMBRE':          r.nombreConductor,
          'PERÍODO':         `${r.fechaSalida} → ${r.fechaLlegada}`,
          'PLUS_EFICIENCIA': fmt2(r.resultado?.PLUS_EFICIENCIA),
          'DISPONIBILIDAD':  fmt2(r.resultado?.DISPONIBILIDAD),
          'DIETAS':          fmt2(dietas),
          'DIET_NAC':        fmt2(dietNac),
          'DIET_INTER':      fmt2(dietInter),
          'TOTAL':           fmt2(r.resultado?.TOTAL),
          'ANTICIPOS':       fmt2(r.anticipos),
          'FINIQUITO':       r.esFiniquito ? `🏁 ${r.numFiniquito || ''}` : '—',
        };
      });
    } else {
      headers = ['COD','NOMBRE','PERÍODO','H_EXTRA','H_PRESEN','NOCTURNO','DIET_NAC','DIET_INTER','ANTICIPOS','MEJORA','FINIQUITO'];
      filas = regs.map(r => ({
        'COD':        r.codigoConductor,
        'NOMBRE':     r.nombreConductor,
        'PERÍODO':    `${r.fechaSalida} → ${r.fechaLlegada}`,
        'H_EXTRA':    fmt2(r.resultado?.H_EXTRA),
        'H_PRESEN':   fmt2(r.resultado?.H_PRESEN),
        'NOCTURNO':   fmt2(r.resultado?.NOCTURNO),
        'DIET_NAC':   fmt2(r.resultado?.DIET_NAC),
        'DIET_INTER': fmt2(r.resultado?.DIET_INTER),
        'ANTICIPOS':  fmt2(r.anticipos),
        'MEJORA':     fmt2(r.resultado?.MEJORA),
        'FINIQUITO':  r.esFiniquito ? `🏁 ${r.numFiniquito || ''}` : '—',
      }));
    }
  }

  const titulo = `Gestoria_${plat}_${formato}`;
  _informe = { tipo: 'gestoria', datos: regs, headers, filas, titulo };
  mostrarPreview(headers, filas, `Gestoría — ${plat} (${formato})`);
  } catch(err) { showToast('Error: ' + err.message, 'error'); console.error(err); }
}

// ============================================================
// PREVISUALIZACIÓN — RRHH
// ============================================================
function toggleRrhhConductorField() {
  const fmt = document.getElementById('inf-rrhh-formato').value;
  const field = document.getElementById('inf-rrhh-field-conductor');
  if (field) field.style.display = fmt === 'pausas' ? '' : 'none';
}

function previsualizarRRHH() {
  const plat     = document.getElementById('inf-rrhh-plataforma').value;
  const formato  = document.getElementById('inf-rrhh-formato').value;
  const equipaje = document.getElementById('inf-rrhh-equipaje').value;
  const estado   = document.getElementById('inf-rrhh-estado').value;
  const desde    = document.getElementById('inf-rrhh-desde').value;
  const hasta    = document.getElementById('inf-rrhh-hasta').value;
  const numLiqs  = msGetSeleccionados('rrhh');
  let regsRaw    = filtrarRegistros(desde, hasta, plat, '');
  if (equipaje)        regsRaw = regsRaw.filter(r => r.equipaje === equipaje);
  if (estado)          regsRaw = regsRaw.filter(r => (r.estadoDietas || 'pendiente') === estado);
  if (numLiqs.length)  regsRaw = regsRaw.filter(r => numLiqs.includes(r.numLiquidacionDietas));
  const regs = regsRaw.slice().sort((a,b) => String(a.codigoConductor).localeCompare(String(b.codigoConductor)));
  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  let headers, filas;

  if (formato === 'detallado') {
    headers = ['COD','NOMBRE','PLATAFORMA','CATEGORÍA','EQUIPAJE','PAREJA','TRACTORA','SALIDA','LLEGADA',
               'DÍAS','RESTO_HORAS','KM_SALIDA','KM_VUELTA','KM_TOTAL','COEF_NAC','DOM_FEST',
               'CARGA','PALET','REBOTE','24H','PAUSA','UK','NDLF','NACIONAL',
               'ACARREOS','VLISSINGEN','EXTRAS','GASTOS_VIAJE','ANTICIPOS',
               'SUM_DIETAS','H_EXTRA','H_PRESEN','NOCTURNO',
               'DIET_NAC','DIET_INTER','MEJORA',
               'PLUS_EFIC','DISPONIB','DIETAS_CAU','FINIQUITO'];
    const condsR = getConductores();
    const getCondR = cod => condsR.find(c => c.Codigo === String(cod).padStart(6,'0')) || {};
    filas = regs.map(r => {
      const cr = getCondR(r.codigoConductor);
      return {
      'COD': r.codigoConductor, 'NOMBRE': r.nombreConductor,
      'PLATAFORMA': r.plataforma, 'CATEGORÍA': r.categoria,
      'EQUIPAJE': cr.EQUIPAJE || '—', 'PAREJA': cr.PAREJA || '—',
      'TRACTORA': r.tractora || cr.tractoraAsignada || '',
      'SALIDA': r.fechaSalida, 'LLEGADA': r.fechaLlegada,
      'DÍAS': r.diasTrabajados, 'RESTO_HORAS': r.restoHoras || 0,
      'KM_SALIDA': r.kmSalida || 0, 'KM_VUELTA': r.kmVuelta || 0, 'KM_TOTAL': r.totalKm || 0,
      'COEF_NAC': r.coefNacional, 'DOM_FEST': (r.nDomingos||0) + (r.nFestivos||0),
      'CARGA': r.nCarga, 'PALET': r.nPalet, 'REBOTE': r.nRebote,
      '24H': r.n24h, 'PAUSA': r.nPausa, 'UK': r.nUK, 'NDLF': r.nNDLF, 'NACIONAL': r.nNacional,
      'ACARREOS': r.acarreos, 'VLISSINGEN': r.dietaVlissingen,
      'EXTRAS': fmt2(r.extras), 'GASTOS_VIAJE': fmt2(r.gastosViaje), 'ANTICIPOS': fmt2(r.anticipos),
      'SUM_DIETAS': fmt2(r.resultado?.sumDietas),
      'H_EXTRA': fmt2(r.resultado?.H_EXTRA), 'H_PRESEN': fmt2(r.resultado?.H_PRESEN),
      'NOCTURNO': fmt2(r.resultado?.NOCTURNO), 'DIET_NAC': fmt2(r.resultado?.DIET_NAC),
      'DIET_INTER': fmt2(r.resultado?.DIET_INTER), 'MEJORA': fmt2(r.resultado?.MEJORA),
      'PLUS_EFIC': fmt2(r.resultado?.PLUS_EFICIENCIA),
      'DISPONIB': fmt2(r.resultado?.DISPONIBILIDAD),
      'DIETAS_CAU': fmt2(r.resultado?.DIETAS),
      'FINIQUITO': r.esFiniquito ? `🏁 ${r.numFiniquito || ''}` : '—',
    };});
  } else {
    headers = ['COD','NOMBRE','PLATAFORMA','EQUIPAJE','PAREJA','TRACTORA','SALIDA','LLEGADA','DÍAS','KM_SALIDA','KM_VUELTA','KM_TOTAL','GASTOS_VIAJE','TOTAL','FINIQUITO'];
    const condsRs = getConductores();
    const getCondRs = cod => condsRs.find(c => c.Codigo === String(cod).padStart(6,'0')) || {};
    filas = regs.map(r => {
      const crs = getCondRs(r.codigoConductor);
      return {
        'COD': r.codigoConductor, 'NOMBRE': r.nombreConductor,
        'PLATAFORMA': r.plataforma,
        'EQUIPAJE': crs.EQUIPAJE || '—', 'PAREJA': crs.PAREJA || '—',
        'TRACTORA': r.tractora || crs.tractoraAsignada || '—',
        'SALIDA': r.fechaSalida, 'LLEGADA': r.fechaLlegada,
        'DÍAS': r.diasTrabajados,
        'KM_SALIDA': r.kmSalida || 0, 'KM_VUELTA': r.kmVuelta || 0, 'KM_TOTAL': r.totalKm || 0,
        'GASTOS_VIAJE': fmt2(r.gastosViaje),
        'TOTAL': fmt2(r.resultado?.sumDietas || r.resultado?.TOTAL),
        'FINIQUITO': r.esFiniquito ? `🏁 ${r.numFiniquito || ''}` : '—',
      };
    });
  }

  if (formato === 'pausas') {
    const codFiltro = (document.getElementById('inf-rrhh-conductor')?.value || '').trim().padStart(6,'0').replace(/^0+$/, '');
    headers = ['COD','NOMBRE','PLATAFORMA','SALIDA_VIAJE','LLEGADA_VIAJE','TIPO_OP','FECHA_OP','H_INICIO','H_FIN','HORAS','LUGAR','ESTADO'];
    filas = [];
    regs.forEach(r => {
      if (codFiltro && String(r.codigoConductor).padStart(6,'0') !== codFiltro) return;
      const estado = r.estadoDietas || 'pendiente';
      const fmtF = f => f ? f.split('-').reverse().join('/') : '—';
      const addOps = (arr, tipo) => {
        if (!arr?.length) return;
        arr.forEach(op => {
          filas.push({
            'COD':         r.codigoConductor,
            'NOMBRE':      r.nombreConductor,
            'PLATAFORMA':  r.plataforma,
            'SALIDA_VIAJE':fmtF(r.fechaSalida),
            'LLEGADA_VIAJE':fmtF(r.fechaLlegada),
            'TIPO_OP':     tipo,
            'FECHA_OP':    fmtF(op.fechaInicio || op.fecha),
            'H_INICIO':    op.horaInicio || '—',
            'H_FIN':       op.horaFin    || '—',
            'HORAS':       op.horas != null ? op.horas : '—',
            'LUGAR':       op.lugar || '—',
            'ESTADO':      estado,
          });
        });
      };
      addOps(r.op24h,   '24H');
      addOps(r.opPausa, 'PAUSA');
    });
    if (!filas.length) { showToast('No hay operaciones 24H/Pausa para ese filtro', 'error'); return; }
    const titulo2 = `RRHH_Pausas_${plat || 'Todas'}`;
    _informe = { tipo: 'rrhh', datos: regs, headers, filas, titulo: titulo2 };
    mostrarPreview(headers, filas, `RRHH — 24H/Pausas (${plat || 'Todas'})`);
    return;
  }

  const titulo = `RRHH_${plat || 'Todas'}_${formato}`;
  _informe = { tipo: 'rrhh', datos: regs, headers, filas, titulo };
  mostrarPreview(headers, filas, `RRHH — ${plat || 'Todas'} (${formato})`);
}

// ============================================================
// PREVISUALIZACIÓN — Gastos (viaje + independientes)
// ============================================================
function previsualizarGastos() {
  try {
  const rawCod = document.getElementById('inf-gastos-cod-conductor')?.value.trim() || '';
  const match  = rawCod.match(/^(\d+)/);
  const cod    = match ? match[1] : rawCod;
  const desde   = document.getElementById('inf-gastos-desde').value;
  const hasta   = document.getElementById('inf-gastos-hasta').value;
  const estado  = document.getElementById('inf-gastos-estado')?.value  || '';
  const formato = document.getElementById('inf-gastos-formato')?.value || 'detallado';
  const numLiqs = msGetSeleccionados('gastos');

  let regs = getFuenteGastos();

  if (cod) regs = regs.filter(r => {
    const a = String(r.codigoConductor || '').replace(/^0+/, '');
    const b = String(cod).replace(/^0+/, '');
    return a === b;
  });
  if (desde)  regs = regs.filter(r => r.fecha >= desde);
  if (hasta)  regs = regs.filter(r => r.fecha <= hasta);
  if (estado) regs = regs.filter(r => r.estadoGastos === estado);
  if (numLiqs.length) regs = regs.filter(r => numLiqs.includes(r.numLiquidacionGastos));

  regs.sort((a, b) =>
    String(a.codigoConductor).localeCompare(String(b.codigoConductor)) ||
    String(a.fecha || '').localeCompare(String(b.fecha || ''))
  );

  if (!regs.length) { showToast('No hay gastos para ese filtro', 'error'); return; }

  const ESTADO_G_LABEL = { pendiente: 'Pendiente', pagado: 'Pagado' };
  let headers, filas;

  if (formato === 'resumido') {
    const mapa = {};
    regs.forEach(r => {
      const cod = String(r.codigoConductor || '—');
      if (!mapa[cod]) mapa[cod] = { cod, nombre: r.nombreConductor || '—', nReg: 0, total: 0 };
      mapa[cod].nReg++;
      mapa[cod].total += r.importe;
    });
    const filasArr = Object.values(mapa).sort((a, b) => a.cod.localeCompare(b.cod));
    headers = ['COD', 'NOMBRE', 'Nº GASTOS', 'TOTAL'];
    filas = filasArr.map(m => ({
      'COD':        m.cod,
      'NOMBRE':     m.nombre,
      'Nº GASTOS':  m.nReg,
      'TOTAL':      fmt2(m.total) + ' €',
    }));
  } else {
    headers = ['COD', 'NOMBRE', 'ORIGEN', 'PLATAFORMA', 'FECHA/PERÍODO', 'CONCEPTO', 'IMPORTE', 'ESTADO', 'NÚM.LIQ.GASTOS'];
    filas = regs.map(r => ({
      'COD':             r.codigoConductor || '—',
      'NOMBRE':          r.nombreConductor || '—',
      'ORIGEN':          r.origen,
      'PLATAFORMA':      r.plataforma || '—',
      'FECHA/PERÍODO':   r.periodo || r.fecha || '—',
      'CONCEPTO':        r.concepto || '—',
      'IMPORTE':         fmt2(r.importe) + ' €',
      'ESTADO':          ESTADO_G_LABEL[r.estadoGastos] || r.estadoGastos || 'Pendiente',
      'NÚM.LIQ.GASTOS':  r.numLiquidacionGastos || '—',
    }));
  }

  const titulo = `Gastos_${formato}`;
  _informe = { tipo: 'gastos', datos: regs, headers, filas, titulo };
  mostrarPreview(headers, filas, `Gastos (${formato === 'resumido' ? 'Resumido' : 'Detallado'})`);
  } catch (err) { showToast('Error: ' + err.message, 'error'); console.error(err); }
}

// ============================================================
// PREVISUALIZACIÓN — Embargos
// ============================================================
function previsualizarEmbargos() {
  try {
  const rawCod    = document.getElementById('inf-emb-cod-conductor')?.value.trim() || '';
  const match     = rawCod.match(/^(\d+)/);
  const cod       = match ? match[1] : rawCod;
  const organismo = document.getElementById('inf-emb-organismo')?.value.trim().toLowerCase() || '';
  const estado    = document.getElementById('inf-emb-estado')?.value || '';
  const formato   = document.getElementById('inf-emb-formato')?.value || 'detallado';
  const desde     = document.getElementById('inf-emb-desde')?.value || '';
  const hasta     = document.getElementById('inf-emb-hasta')?.value || '';

  let embargos = typeof getEmbargos === 'function' ? getEmbargos() : [];
  if (cod) embargos = embargos.filter(e => {
    const a = String(e.codigoConductor || '').replace(/^0+/, '');
    const b = String(cod).replace(/^0+/, '');
    return a === b;
  });
  if (organismo) embargos = embargos.filter(e => String(e.organismo || '').toLowerCase().includes(organismo));
  if (estado)    embargos = embargos.filter(e => e.estado === estado);

  if (!embargos.length) { showToast('No hay embargos para ese filtro', 'error'); return; }

  let headers, filas;

  if (formato === 'resumen') {
    headers = ['COD','NOMBRE','ORGANISMO','Nº EXPEDIENTE','IMPORTE TOTAL','TOTAL PAGADO','PENDIENTE','FECHA INICIO','ÚLTIMO PAGO','ESTADO'];
    filas = embargos
      .slice()
      .sort((a,b) => String(a.codigoConductor).localeCompare(String(b.codigoConductor)))
      .map(e => {
        const pagos = (e.pagos || []).slice().sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
        const ultimoPago = pagos.length ? pagos[pagos.length - 1].fecha?.slice(0,10) : '—';
        return {
          'COD': e.codigoConductor,
          'NOMBRE': e.nombreConductor,
          'ORGANISMO': e.organismo || '—',
          'Nº EXPEDIENTE': e.numExpediente || '—',
          'IMPORTE TOTAL': fmt2(e.importeTotal) + ' €',
          'TOTAL PAGADO':  fmt2(e.totalPagado)  + ' €',
          'PENDIENTE':     fmt2(parseFloat(e.importeTotal||0) - parseFloat(e.totalPagado||0)) + ' €',
          'FECHA INICIO':  e.fechaInicio || '—',
          'ÚLTIMO PAGO':   ultimoPago,
          'ESTADO':        e.estado === 'finalizado' ? 'Finalizado' : 'Activo',
        };
      });
  } else {
    // Detallado — una fila por pago mensual registrado
    headers = ['COD','NOMBRE','ORGANISMO','Nº EXPEDIENTE','FECHA PAGO','REMESA','IMPORTE','ESTADO'];
    filas = [];
    embargos
      .slice()
      .sort((a,b) => String(a.codigoConductor).localeCompare(String(b.codigoConductor)))
      .forEach(e => {
        let pagos = (e.pagos || []).slice().sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));
        if (desde) pagos = pagos.filter(p => (p.fecha || '') >= desde);
        if (hasta) pagos = pagos.filter(p => (p.fecha || '') <= hasta);
        pagos.forEach(p => {
          filas.push({
            'COD': e.codigoConductor,
            'NOMBRE': e.nombreConductor,
            'ORGANISMO': e.organismo || '—',
            'Nº EXPEDIENTE': e.numExpediente || '—',
            'FECHA PAGO': (p.fecha || '').slice(0,10),
            'REMESA': p.numRemesa || '—',
            'IMPORTE': fmt2(p.importe) + ' €',
            'ESTADO': e.estado === 'finalizado' ? 'Finalizado' : 'Activo',
          });
        });
      });
    if (!filas.length) { showToast('Ninguno de los embargos filtrados tiene pagos registrados en ese período', 'error'); return; }
  }

  const titulo = `Embargos_${formato}`;
  _informe = { tipo: 'embargos', datos: embargos, headers, filas, titulo };
  mostrarPreview(headers, filas, `Embargos (${formato === 'resumen' ? 'Resumen' : 'Detallado'})`);
  } catch (err) { showToast('Error: ' + err.message, 'error'); console.error(err); }
}

// ============================================================
// MOSTRAR PREVIEW EN PANTALLA
// ============================================================
const NUM_COLS = new Set(['Días','Total Km','Km Salida','Km Vuelta','24H/PAUSA','Cargas/Desc.','Mov. Palets','Rebote','KM','DÍAS','TOTAL',
  'H_EXTRA','H_PRESEN','NOCTURNO','DIET_NAC','DIET_INTER','MEJORA','ANTICIPOS',
  'SUM_DIETAS','PLUS_EFIC','DISPONIB','DIETAS_CAU','EXTRAS','COEF_NAC','DOM_FEST',
  'CARGA','PALET','REBOTE','24H','PAUSA','UK','NDLF','ACARREOS','VLISSINGEN',
  'PLUS_EFICIENCIA','DISPONIBILIDAD','DIETAS','IMPORTE','Nº GASTOS']);

function mostrarPreview(headers, filas, titulo) {
  document.getElementById('inf-preview-empty').style.display   = 'none';
  document.getElementById('inf-preview-content').style.display = 'block';
  document.getElementById('inf-preview-titulo').textContent     = `${titulo} — ${filas.length} registros`;

  // Aviso informativo si el informe incluye registros marcados como Finiquito.
  // No afecta a informes normales (sin finiquitos, banner queda vacío).
  let banner = '';
  const finiquitos = [...new Set((_informe.datos || [])
    .filter(r => r && r.esFiniquito && r.numFiniquito)
    .map(r => r.numFiniquito))];
  if (finiquitos.length) {
    const anticipos  = typeof getAnticipos === 'function' ? getAnticipos() : [];
    const importeAnt = anticipos
      .filter(a => finiquitos.includes(a.numFiniquito))
      .reduce((s, a) => s + parseFloat(a.importe || 0), 0);
    banner = `<div style="margin-bottom:14px;padding:10px 14px;background:#f5f3ff;border:1.5px solid #a78bfa;
      border-radius:8px;font-size:13px;font-weight:500;color:#5b21b6">
      🏁 Incluye ${finiquitos.length} finiquito(s): ${finiquitos.join(', ')}
      ${importeAnt > 0 ? ` · Anticipos asociados: ${fmt2(importeAnt)} € (informativo — no descontado del total)` : ''}
    </div>`;
  }

  let html = banner + `<table><thead><tr>`;
  headers.forEach(h => html += `<th>${h}</th>`);
  html += `</tr></thead><tbody>`;
  filas.forEach(f => {
    html += '<tr>';
    headers.forEach(h => {
      html += `<td class="${NUM_COLS.has(h) ? 'num' : ''}">${f[h] ?? ''}</td>`;
    });
    html += '</tr>';
  });
  html += `</tbody></table>`;
  document.getElementById('inf-preview-tabla').innerHTML = html;
}

// ============================================================
// ACCIONES DESDE BARRA DE PREVIEW
// ============================================================
function accionInformeEmail() {
  if (!_informe.datos?.length) return;

  if (_informe.tipo === 'conductor') {
    // Conductor: cola de emails uno a uno para evitar bloqueo de popups
    const conductores = getConductores();
    const porConductor = {};
    _informe.datos.forEach(r => {
      if (!porConductor[r.codigoConductor]) porConductor[r.codigoConductor] = [];
      porConductor[r.codigoConductor].push(r);
    });
    // Construir cola solo con conductores que tienen email
    _emailCola = [];
    Object.entries(porConductor).forEach(([codigo, registros]) => {
      const c = conductores.find(x => String(x.Codigo) === String(codigo));
      if (!c || !c.Email) return;
      const registrosOrdenados = registros.slice().sort((a, b) => (a.fechaSalida || '').localeCompare(b.fechaSalida || ''));
      _emailCola.push({ conductor: c, registros: registrosOrdenados });
    });
    if (_emailCola.length === 0) {
      showToast('Ningún conductor tiene email registrado', 'error');
      return;
    }
    _emailColaIdx = 0;
    ecMostrarActual();
  } else {
    // Gestoría / RRHH: abrir modal para introducir destinatario manualmente
    const asuntoDefault = _informe.tipo === 'gestoria'
      ? `Informe Gestoría — ${_informe.titulo}`
      : `Informe RRHH — ${_informe.titulo}`;
    document.getElementById('email-asunto').value = asuntoDefault;
    document.getElementById('email-destino').value = '';
    document.getElementById('email-nota').value = '';
    document.getElementById('modal-email').style.display = 'flex';
  }
}

function accionInformeImprimir() { abrirVentanaImpresion(false); }
function accionInformePDF()      { abrirVentanaImpresion(true);  }

function abrirVentanaImpresion(esPDF) {
  if (!_informe.filas?.length) return;
  const win = window.open('', '_blank');
  win.document.write(htmlParaImprimir(_informe.titulo, _informe.headers, _informe.filas));
  win.document.close();
  if (esPDF) showToast('Usa "Guardar como PDF" en el diálogo de impresión', '');
  else win.onload = () => win.print();
}

function accionInformeExcel() {
  if (!_informe.filas?.length) return;
  const csv = arrayToCSV(_informe.headers, _informe.filas);
  const fecha = new Date().toISOString().slice(0, 10);
  descargarCSV(csv, `${_informe.tipo}_${fecha}.csv`);
  showToast(`Exportado: ${_informe.tipo}_${fecha}.csv ✓`, 'success');
}

// ============================================================
// HTML PARA IMPRIMIR / PDF
// ============================================================
function htmlParaImprimir(titulo, headers, filas) {
  let rows = '';
  filas.forEach(f => {
    rows += '<tr>' + headers.map(h =>
      `<td style="${NUM_COLS.has(h) ? 'text-align:right' : ''}">${f[h] ?? ''}</td>`
    ).join('') + '</tr>';
  });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#222}
    h1{color:#4a7c59;font-size:16px;margin-bottom:4px}
    .sub{color:#888;font-size:10px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th{background:#4a7c59;color:#fff;padding:7px 8px;text-align:left;font-size:10px;text-transform:uppercase}
    td{padding:6px 8px;border-bottom:1px solid #e0e0e0}
    tr:nth-child(even) td{background:#f5f8f4}
  </style></head><body>
  <h1>${titulo}</h1>
  <div class="sub">Generado: ${new Date().toLocaleString('es-ES')} · ${filas.length} registros</div>
  <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`;
}

// ============================================================
// UTILIDADES EXPORT
// ============================================================
function arrayToCSV(headers, filas) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(';')];
  filas.forEach(f => lines.push(headers.map(h => esc(f[h] ?? '')).join(';')));
  return '\uFEFF' + lines.join('\r\n');
}

function descargarCSV(csv, nombre) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

function descargarXLSX(headers, filas, nombre) {
  const TEXT_COLS = new Set(['COD', 'Código', 'PAREJA']);

  function esc(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function celda(h, val) {
    const v = esc(val);
    if (TEXT_COLS.has(h)) {
      return `<Cell ss:StyleID="text" ss:Formula="=TEXTO(&quot;${v}&quot;,&quot;@&quot;)"><Data ss:Type="String">${v}</Data></Cell>`;
    }
    const s = String(val ?? '').trim();
    const num = parseFloat(s.replace(',', '.'));
    if (s !== '' && !isNaN(num) && !s.includes('→') && !s.includes(' ')) {
      return `<Cell><Data ss:Type="Number">${num}</Data></Cell>`;
    }
    return `<Cell><Data ss:Type="String">${v}</Data></Cell>`;
  }

  let rows = '<Row>' + headers.map(h =>
    `<Cell ss:StyleID="header"><Data ss:Type="String">${esc(h)}</Data></Cell>`
  ).join('') + '</Row>';

  filas.forEach(f => {
    rows += '<Row>' + headers.map(h => celda(h, f[h] ?? '')).join('') + '</Row>';
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Interior ss:Color="#4a7c59" ss:Pattern="Solid"/>
      <Font ss:Color="#FFFFFF" ss:Bold="1" ss:Size="10"/>
    </Style>
    <Style ss:ID="text">
      <NumberFormat ss:Format="@"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Informe">
    <Table>${rows}</Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = nombre.replace('.xlsx', '.xls');
  a.click();
  URL.revokeObjectURL(url);
}

function descargarJSON(data, nombre) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

function generarCuerpoEmail(conductor, registros) {
  const fmtKm = v => (v && Number(v) > 0) ? Number(v).toLocaleString('es-ES') + ' km' : '—';
  const fmtN  = v => (v && Number(v) > 0) ? Number(v) : null;
  const SEP   = '\u2501'.repeat(40);
  const lbl   = (k, v) => `  ${(k + ' ').padEnd(18, '.')}: ${v}\n`;

  let txt = `Estimado/a ${conductor.Nombre},\n\n`;
  txt += `Le remitimos el detalle de sus kilómetros y operaciones:\n\n`;

  registros.forEach((r, i) => {
    const fSal   = r.fechaSalida  ? r.fechaSalida.split('-').reverse().join('/')  : '—';
    const fLle   = r.fechaLlegada ? r.fechaLlegada.split('-').reverse().join('/') : '—';
    const esCau  = r.plataforma === 'CAUDETE';
    const hSal   = esCau && r.horaSalida  ? ` ${r.horaSalida}`  : '';
    const hLle   = esCau && r.horaLlegada ? ` ${r.horaLlegada}` : '';
    txt += SEP + '\n';
    txt += `VIAJE ${i + 1}  |  ${fSal}${hSal} → ${fLle}${hLle}\n`;
    txt += SEP + '\n';

    // Kilómetros y días
    txt += lbl('Días trabajados', r.diasTrabajados || '—');
    txt += lbl('Km salida',  fmtKm(r.kmSalida));
    txt += lbl('Km vuelta',  fmtKm(r.kmVuelta));
    txt += lbl('Total Km',   fmtKm(r.totalKm));

    // Operaciones — todas las que tienen valor > 0, con detalle fecha/lugar si existe
    const fmtFecha = f => f ? f.split('-').reverse().join('/') : '';
    const fmtDet   = (arr, label) => {
      if (!arr?.length) return '';
      return arr.map((d, i) => {
        const f = fmtFecha(d.fecha);
        const l = (d.lugar || '').trim();
        const detalle = [f, l].filter(Boolean).join('  ');
        return `      ${i+1}. ${detalle || '—'}`;
      }).join('\n');
    };

    const opsDef = [
      [fmtN(r.n24h),            '24H/Pausa larga', r.op24h],
      [fmtN(r.nPausa),          'Pausas',           r.opPausa],
      [fmtN(r.nCarga),          'Cargas/Desc.',     r.opCarga],
      [fmtN(r.nPalet),          'Mov. Palets',      r.opPalet],
      [fmtN(r.nRebote),         'Rebotes',          r.opRebote],
      [fmtN(r.nNacional),       'Nacionales',       r.opNacional],
      [fmtN(r.nUK),             'UK',               r.opUK],
      [fmtN(r.nNDLF),           'NDLF',             r.opNDLF],
      ...(esCau ? [
        [fmtN(r.nDomingos), 'Domingos', null],
        [fmtN(r.nFestivos), 'Festivos', null],
        [fmtN(r.restoHoras), 'Resto horas', null],
      ] : []),
      [fmtN(r.acarreos),        'Acarreos Vlissingen',  null],
      [fmtN(r.dietaVlissingen), 'Dietas Vlissingen',   null],
    ].filter(([v]) => v !== null);

    if (opsDef.length) {
      txt += `\n  Operaciones:\n`;
      opsDef.forEach(([v, k, det]) => {
        txt += `    · ${(k + ' ').padEnd(18, '.')}: ${v}\n`;
        const detTxt = fmtDet(det, k);
        if (detTxt) txt += detTxt + '\n';
      });
    }

    // Extras con concepto
    if (r.extras && Number(r.extras) > 0) {
      const fmtE = Number(r.extras).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
      txt += `    · ${((r.extrasConcepto || 'Extras') + ' ').padEnd(18,'.')}: ${fmtE} €\n`;
    }

    // Gastos de viaje con fecha y concepto
    const gastos = r.gastosDetalle?.length
      ? r.gastosDetalle
      : (r.gastosViaje > 0 ? [{ concepto: 'Gastos viaje', importe: r.gastosViaje, fecha: '' }] : []);
    if (gastos.length) {
      txt += `\n  Gastos de viaje:\n`;
      gastos.forEach(g => {
        const imp   = Number(g.importe||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
        const fecha = g.fecha ? g.fecha.split('-').reverse().join('/') + '  ' : '';
        const conc  = (g.concepto || g.tipo || 'Gasto').trim();
        txt += `    · ${fecha}${(conc + ' ').padEnd(16,'.')}: ${imp} €\n`;
      });
    }
    txt += '\n';
  });

  txt += SEP + '\n';
  txt += `\nUn saludo,\nDpto. de Administración\n`;
  return txt;
}

// ============================================================
// EXPORT / IMPORT DATOS (copia de seguridad con fecha)
// ============================================================
function exportarExcel() {
  const fecha = new Date().toISOString().slice(0, 10);
  const data = {
    exportado:   new Date().toISOString(),
    conductores: getConductores(),
    tarifas:     getTarifas(),
    registros:   getRegistros(),
  };
  descargarJSON(data, `dietas_backup_${fecha}.json`);
  showToast(`Copia guardada: dietas_backup_${fecha}.json ✓`, 'success');
}

function importarExcel() {
  document.getElementById('inputImport').click();
}

function cargarExcel(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.registros && !data.conductores && !data.tarifas) {
        showToast('Fichero no reconocido como backup válido', 'error');
        return;
      }
      if (data.conductores) saveConductores(data.conductores);
      if (data.tarifas)     saveTarifas(data.tarifas);
      if (data.registros)   saveRegistros(data.registros);
      try { renderTablas(); }   catch(e2) { console.warn('renderTablas:', e2); }
      try { renderHistorial(); } catch(e2) { console.warn('renderHistorial:', e2); }
      showToast(`Importado: ${(data.registros||[]).length} registros, ${(data.conductores||[]).length} conductores ✓`, 'success');
    } catch(err) {
      console.error('Error importando backup:', err);
      showToast('Error al leer el fichero: ' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
}

// ============================================================
// MODAL EMAIL MANUAL (Gestoría / RRHH)
// ============================================================
function cerrarModalEmail() {
  document.getElementById('modal-email').style.display = 'none';
}

function enviarEmailManual() {
  const destino = document.getElementById('email-destino').value.trim();
  if (!destino) { showToast('Introduce al menos un destinatario', 'error'); return; }

  const asunto = document.getElementById('email-asunto').value.trim()
    || `Informe ${_informe.titulo}`;
  const nota   = document.getElementById('email-nota').value.trim();

  // Construir cuerpo con resumen de filas
  let cuerpo = nota ? nota + '\n\n' : '';
  cuerpo += `${asunto}\nGenerado: ${new Date().toLocaleString('es-ES')}\n`;
  cuerpo += `Registros: ${_informe.filas.length}\n\n`;

  // Añadir cabecera y primeras filas (mailto tiene límite de longitud)
  const MAX_FILAS = 20;
  cuerpo += _informe.headers.join(' | ') + '\n';
  cuerpo += '─'.repeat(60) + '\n';
  _informe.filas.slice(0, MAX_FILAS).forEach(f => {
    cuerpo += _informe.headers.map(h => f[h] ?? '').join(' | ') + '\n';
  });
  if (_informe.filas.length > MAX_FILAS) {
    cuerpo += `\n… y ${_informe.filas.length - MAX_FILAS} registros más. Ver fichero adjunto.`;
  }
  cuerpo += '\n\nUn saludo,\nDpto. de Administración';

  const href = `mailto:${encodeURIComponent(destino)}`
    + `?subject=${encodeURIComponent(asunto)}`
    + `&body=${encodeURIComponent(cuerpo)}`;

  window.open(href, '_blank');
  cerrarModalEmail();
  showToast('Email preparado en Outlook ✓', 'success');
}

// ============================================================
// COLA DE ENVÍO MASIVO DE EMAILS (Informe Conductor)
// ============================================================
let _emailCola    = [];
let _emailColaIdx = 0;

function ecMostrarActual() {
  const total  = _emailCola.length;
  const idx    = _emailColaIdx;
  if (idx >= total) { ecCerrarCola(); return; }

  const { conductor: c, registros } = _emailCola[idx];
  document.getElementById('ec-contador').textContent  = `${idx + 1} de ${total}`;
  document.getElementById('ec-nombre').textContent    = `${c.Codigo} — ${c.Nombre}`;
  document.getElementById('ec-email').textContent     = c.Email;
  document.getElementById('ec-registros').textContent = `${registros.length} viaje${registros.length !== 1 ? 's' : ''}`;
  document.getElementById('modal-email-cola').style.display = 'flex';
}

function ecAbrirOutlook() {
  const { conductor: c, registros } = _emailCola[_emailColaIdx];
  const asunto = `Liquidación de dietas — ${c.Nombre}`;
  const cuerpo = generarCuerpoEmail(c, registros);
  const href = `mailto:${encodeURIComponent(c.Email)}`
    + `?subject=${encodeURIComponent(asunto)}`
    + `&body=${encodeURIComponent(cuerpo)}`;
  window.open(href, '_blank');
}

function ecSiguiente() {
  _emailColaIdx++;
  if (_emailColaIdx >= _emailCola.length) {
    ecCerrarCola();
    showToast(`${_emailCola.length} email(s) preparados en Outlook ✓`, 'success');
  } else {
    ecMostrarActual();
  }
}

function ecCerrarCola() {
  document.getElementById('modal-email-cola').style.display = 'none';
  _emailCola    = [];
  _emailColaIdx = 0;
}

// =============================================
// BLOQUE 5 — INFORME DE INTEGRIDAD DE DATOS
// =============================================
function previsualizarIntegridad() {
  const regs  = getRegistros();
  const conds = getConductores();
  const problemas = [];

  // 1. Conductores sin IBAN
  conds.forEach(c => {
    if (!c.IBAN) problemas.push({
      tipo: '👤 Conductor', severidad: 'alta',
      descripcion: `Sin IBAN`,
      detalle: `${c.Codigo} — ${c.Nombre} (${c.PLATAFORMA})`
    });
  });

  // 2. Conductores sin PrecioKmt
  conds.forEach(c => {
    if (!c.PrecioKmt || c.PrecioKmt <= 0) problemas.push({
      tipo: '👤 Conductor', severidad: 'alta',
      descripcion: `PrecioKmt = 0`,
      detalle: `${c.Codigo} — ${c.Nombre} (${c.PLATAFORMA})`
    });
  });

  // 3. Conductores sin NIF
  conds.forEach(c => {
    if (!c.NIF) problemas.push({
      tipo: '👤 Conductor', severidad: 'media',
      descripcion: `Sin NIF`,
      detalle: `${c.Codigo} — ${c.Nombre}`
    });
  });

  // 4. Conductores sin Email
  conds.forEach(c => {
    if (!c.Email) problemas.push({
      tipo: '👤 Conductor', severidad: 'baja',
      descripcion: `Sin email`,
      detalle: `${c.Codigo} — ${c.Nombre}`
    });
  });

  // 5. Registros liquidados sin número de liquidación
  regs.filter(r => r.estadoDietas === 'liquidado' && !r.numLiquidacionDietas).forEach(r => {
    problemas.push({
      tipo: '📋 Registro', severidad: 'media',
      descripcion: `Liquidado sin número`,
      detalle: `${r.codigoConductor} — ${r.nombreConductor} | ${r.fechaSalida} → ${r.fechaLlegada}`
    });
  });

  // 6. Registros con total = 0
  regs.filter(r => r.estadoDietas !== 'pendiente_validacion').forEach(r => {
    const total = r.plataforma === 'CAUDETE' ? (r.resultado?.TOTAL||0) : (r.resultado?.sumDietas||0);
    if (total <= 0) problemas.push({
      tipo: '📋 Registro', severidad: 'alta',
      descripcion: `Total dietas = 0 €`,
      detalle: `${r.codigoConductor} — ${r.nombreConductor} | ${r.fechaSalida} → ${r.fechaLlegada} | ${r.plataforma}`
    });
  });

  // 7. Registros con días trabajados = 0
  regs.forEach(r => {
    if (!r.diasTrabajados || r.diasTrabajados <= 0) problemas.push({
      tipo: '📋 Registro', severidad: 'alta',
      descripcion: `Días trabajados = 0`,
      detalle: `${r.codigoConductor} — ${r.nombreConductor} | ${r.fechaSalida} → ${r.fechaLlegada}`
    });
  });

  // 8. Registros con extras sin concepto
  regs.filter(r => (r.extras||0) > 0 && !r.extrasConcepto).forEach(r => {
    problemas.push({
      tipo: '📋 Registro', severidad: 'media',
      descripcion: `Extras sin concepto (${Number(r.extras).toLocaleString('es-ES',{minimumFractionDigits:2})} €)`,
      detalle: `${r.codigoConductor} — ${r.nombreConductor} | ${r.fechaSalida} → ${r.fechaLlegada}`
    });
  });

  // 9. Registros pendientes de validación > 7 días
  const hace7dias = new Date(); hace7dias.setDate(hace7dias.getDate() - 7);
  regs.filter(r => r.estadoDietas === 'pendiente_validacion').forEach(r => {
    const creado = new Date(r.fechaCreacion || r.creadoEn || 0);
    if (creado < hace7dias) problemas.push({
      tipo: '⏳ Validación', severidad: 'media',
      descripcion: `Pendiente de validación > 7 días`,
      detalle: `${r.codigoConductor} — ${r.nombreConductor} | creado: ${creado.toLocaleDateString('es-ES')}`
    });
  });

  // Mostrar resultados
  const colSev = { alta: '#fee2e2', media: '#fef3c7', baja: '#f0fdf4' };
  const txtSev = { alta: '#991b1b', media: '#92400e', baja: '#166534' };
  const labelSev = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };

  const resumen = `${problemas.length} problema(s) detectado(s) en ${regs.length} registros y ${conds.length} conductores`;

  const headers = ['Tipo', 'Severidad', 'Descripción', 'Detalle'];
  const filas   = problemas.map(p => ({
    'Tipo':        p.tipo,
    'Severidad':   labelSev[p.severidad],
    'Descripción': p.descripcion,
    'Detalle':     p.detalle,
  }));

  _informe = { tipo: 'integridad', datos: problemas, headers, filas, titulo: 'Informe de Integridad' };

  if (!problemas.length) {
    document.getElementById('inf-preview-empty').style.display = 'none';
    document.getElementById('inf-preview-content').style.display = 'block';
    document.getElementById('inf-preview-titulo').textContent = '✅ Sin problemas detectados';
    document.getElementById('inf-preview-tabla').innerHTML =
      `<div style="text-align:center;padding:40px;color:#166534;font-size:15px;font-weight:500">
        ✅ Todos los datos están en orden. No se detectaron problemas.
      </div>`;
    return;
  }

  // Tabla con colores por severidad
  let html = `<div style="margin-bottom:14px;padding:10px 14px;background:#fffbeb;border:1.5px solid #f59e0b;
    border-radius:8px;font-size:13px;font-weight:500;color:#92400e">⚠️ ${resumen}</div>`;
  html += `<table class="data-table" style="font-size:12px">
    <thead><tr>
      ${headers.map(h => `<th>${h}</th>`).join('')}
    </tr></thead>
    <tbody>`;
  html += problemas.map(p => `
    <tr style="background:${colSev[p.severidad]}">
      <td style="white-space:nowrap">${p.tipo}</td>
      <td style="white-space:nowrap;font-weight:600;color:${txtSev[p.severidad]}">${labelSev[p.severidad]}</td>
      <td>${p.descripcion}</td>
      <td style="font-size:11px;color:#555">${p.detalle}</td>
    </tr>`).join('');
  html += '</tbody></table>';

  document.getElementById('inf-preview-empty').style.display = 'none';
  document.getElementById('inf-preview-content').style.display = 'block';
  document.getElementById('inf-preview-titulo').textContent = `🔍 Integridad — ${problemas.length} problema(s)`;
  document.getElementById('btn-inf-email').style.display = 'none'; // No tiene sentido enviar esto por email
  document.getElementById('inf-preview-tabla').innerHTML = html;
}
