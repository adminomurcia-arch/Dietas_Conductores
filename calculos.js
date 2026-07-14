// =============================================
// calculos.js — Lógica de cálculo de dietas
// =============================================

// Funciones de calendario: parseFecha, contarDomingos, contarFestivos, esDomingo, esFestivoNacional
// → definidas en utils.js (cargado antes en index.html)

// ---- LEER OPERACIONES ----
function getCount(tipo) {
  const detallado = document.getElementById('btn-detallado').classList.contains('active');
  if (detallado) {
    return document.querySelectorAll(`#lista-${tipo} .operacion-row`).length;
  }
  const el = document.getElementById(`r-${tipo}`);
  return el ? parseInt(el.value) || 0 : 0;
}

// ---- LEER TODOS LOS INPUTS DEL FORMULARIO ----
function leerFormulario() {
  const plataforma = document.getElementById('plataforma').value.trim();
  const categoria  = document.getElementById('categoria').value.trim().toUpperCase();
  const esCaudete  = plataforma === 'CAUDETE';

  const nDomingos = esCaudete ? (parseFloat(document.getElementById('numDomingos').value) || 0) : 0;
  const nFestivos = esCaudete && document.getElementById('chk-festivos').checked
    ? (parseFloat(document.getElementById('numFestivos').value) || 0) : 0;

  return {
    plataforma,
    categoria,
    fechaSalida:  document.getElementById('fechaSalida').value,
    fechaLlegada: document.getElementById('fechaLlegada').value,
    totalKm:      parseKm(document.getElementById('totalKm').value),
    diasTrab:     parseFloat(document.getElementById('diasTrabajados').value)  || 0,
    restoHoras:   parseFloat(document.getElementById('restoHoras').value)      || 0,
    coefNac:      parseFloat(document.getElementById('coefNacional').value)    || 0,
    extras:       parseFloat(document.getElementById('extras').value)          || 0,
    nAcarreos:    parseFloat(document.getElementById('acarreos').value)        || 0,
    nVlissingen:  parseFloat(document.getElementById('dietaVlissingen').value) || 0,
    nCarga:   getCount('carga'),
    nPalet:   getCount('palet'),
    nRebote:  getCount('rebote'),
    n24h:     getCount('24horas'),
    nPausa:   getCount('pausa'),
    nNacional:getCount('nacional'),
    nUK:      getCount('uk'),
    nNDLF:    getCount('ndlf'),
    nDomingos,
    nFestivos,
  };
}

// ---- CÁLCULO PRINCIPAL (calcula Y muestra) ----
function calcularDietas() {
  const f = leerFormulario();
  if (!f.plataforma) return null;

  let res = {};
  if (f.categoria === 'PESCADO' || f.categoria === 'COMODIN') res = calcPESCADO(f);
  else if (f.plataforma === 'TJG')     res = calcTJG(f);
  else if (f.plataforma === 'FILARDI') res = calcFILARDI(f);
  else if (f.plataforma === 'CAUDETE') res = calcCAUDETE(f);

  mostrarResultado(res, f.plataforma, f.categoria);
  return res;
}

// ---- PESCADO / COMODÍN ----
function calcPESCADO({ totalKm }) {
  const precioKm  = buscarConductorActual()?.PrecioKmt || 0;
  const sumDietas = totalKm * precioKm;  // siempre 12.000 × PrecioKmt
  const H_EXTRA   = 0.02926 * 0.4 * totalKm;
  const H_PRESEN  = 0.02926 * 0.5 * totalKm;
  const NOCTURNO  = 0.02926 * 0.1 * totalKm;
  // DIET_NAC = diferencia entre el total y las horas (H_EXTRA + H_PRESEN + NOCTURNO), para que siempre cuadre
  const DIET_NAC  = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO;
  const DIET_INTER = 0;
  return { sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER };
}

// ---- TJG ----
function calcTJG({ totalKm, diasTrab, coefNac, nCarga, nPalet, nRebote, n24h, nPausa, nAcarreos, nVlissingen, extras }) {
  const precioKm = buscarConductorActual()?.PrecioKmt || 0;
  // EQUIPAJE DOBLE: cargas y palets se reparten al 50% entre los dos conductores
  const coefDoble = document.getElementById('equipaje').value === 'DOBLE' ? 0.5 : 1;

  const sumVariables = nCarga      * getTarifa('CARGA/DESCARGAS', 'TJG') * coefDoble
                     + nPalet      * getTarifa('MOV. PALETS',     'TJG') * coefDoble
                     + nRebote     * getTarifa('REBOTE',          'TJG')
                     + n24h        * getTarifa('24HORAS_PAUSA',   'TJG')
                     + nPausa      * getTarifa('24HORAS_PAUSA',   'TJG')
                     + nAcarreos   * getTarifa('ACARREOS',        'TJG')
                     + nVlissingen * getTarifa('DIETA_VLISSINGEN','TJG')
                     + extras;

  const sumDietas = totalKm * precioKm + sumVariables;
  const H_EXTRA  = 0.02926 * 0.4 * totalKm;
  const H_PRESEN = 0.02926 * 0.5 * totalKm;
  const NOCTURNO = 0.02926 * 0.1 * totalKm;

  let DIET_NAC, DIET_INTER;
  if (coefNac >= diasTrab) {
    // Todo nacional — sin días internacionales
    DIET_INTER = 0;
    DIET_NAC   = Math.max(0, sumDietas - H_EXTRA - H_PRESEN - NOCTURNO);
  } else {
    // Hay días internacionales
    DIET_NAC   = coefNac * 45.19;
    DIET_INTER = Math.max(0, sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC);
  }

  return { sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER };
}

// ---- FILARDI ----
function calcFILARDI({ totalKm, diasTrab, coefNac, nRebote, nUK, nNDLF, nAcarreos, nVlissingen, extras }) {
  const precioKm = buscarConductorActual()?.PrecioKmt || 0;

  const sumVariables = nRebote     * getTarifa('REBOTE',           'FILARDI')
                     + nUK         * getTarifa('UK',               'FILARDI')
                     + nNDLF       * getTarifa('NDLF',             'FILARDI')
                     + nAcarreos   * getTarifa('ACARREOS',         'FILARDI')
                     + nVlissingen * getTarifa('DIETA_VLISSINGEN', 'FILARDI')
                     + extras;

  const sumDietas = totalKm * precioKm + sumVariables;
  const H_EXTRA   = 0.02926 * 0.4 * totalKm;
  const H_PRESEN  = 0.02926 * 0.5 * totalKm;
  const NOCTURNO  = 0.02926 * 0.1 * totalKm;
  const DIET_NAC  = coefNac * 45.19;

  let DIET_INTER = (diasTrab - coefNac) * 59;
  let MEJORA     = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC - DIET_INTER;

  if (MEJORA < 0) {
    DIET_INTER = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC;
    MEJORA = 0;
  }

  return { sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER, MEJORA };
}

// ---- CAUDETE ----
function calcCAUDETE({ diasTrab, restoHoras, nDomingos, nFestivos, nCarga, nPalet, nRebote, nNacional, coefNac, extras, fechaSalida, fechaLlegada }) {
  const tarDF = getTarifa('DOMINGO_FESTIVOS', 'CAUDETE');

  // Plus Eficiencia = (fecha llegada - fecha salida + 1) × 8,75
  let diasEfic = diasTrab;
  if (fechaSalida && fechaLlegada) {
    const fs = parseFecha(fechaSalida);
    const fl = parseFecha(fechaLlegada);
    diasEfic = Math.round((fl - fs) / 86400000) + 1;
  }
  const PLUS_EFICIENCIA = diasEfic * 8.75;

  // EQUIPAJE DOBLE: cargas y palets se reparten al 50% entre los dos conductores
  const coefDobleC = document.getElementById('equipaje').value === 'DOBLE' ? 0.5 : 1;
  const DISPONIBILIDAD  = (nDomingos + nFestivos) * tarDF
                        + nCarga    * getTarifa('CARGA/DESCARGAS', 'CAUDETE') * coefDobleC
                        + nPalet    * getTarifa('MOV. PALETS',     'CAUDETE') * coefDobleC
                        + nNacional * 10.3;
  const DIETAS          = diasTrab   * getTarifa('DIA',    'CAUDETE')
                        + restoHoras * getTarifa('HORAS',  'CAUDETE')
                        + nRebote    * getTarifa('REBOTE', 'CAUDETE')
                        + extras;
  const TOTAL = PLUS_EFICIENCIA + DISPONIBILIDAD + DIETAS;

  // Desglose nacional / internacional
  const DIET_NAC   = diasTrab > 0 ? (DIETAS / diasTrab) * coefNac : 0;
  const DIET_INTER = DIETAS - DIET_NAC;

  return { PLUS_EFICIENCIA, DISPONIBILIDAD, DIETAS, TOTAL, DIET_NAC, DIET_INTER };
}

// ---- MOSTRAR RESULTADO ----
function mostrarResultado(res, plataforma, categoria) {
  const grid = document.getElementById('resultado-dietas');
  document.getElementById('section-resultado').style.display = 'block';
  grid.innerHTML = '';

  const fmt = v => (+v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const esPescado = (categoria || '').toUpperCase() === 'PESCADO';

  const items =
    (plataforma === 'TJG' || esPescado) ? [
      { label: 'Total Dietas',  value: fmt(res.sumDietas), total: true },
      { label: 'H. Extra',      value: fmt(res.H_EXTRA)  },
      { label: 'H. Presencia',  value: fmt(res.H_PRESEN) },
      { label: 'Nocturno',      value: fmt(res.NOCTURNO) },
      { label: 'Dieta Nac.',    value: fmt(res.DIET_NAC) },
      ...(!esPescado ? [{ label: 'Dieta Inter.', value: fmt(res.DIET_INTER) }] : []),
    ] : plataforma === 'FILARDI' ? [
      { label: 'Total Dietas',  value: fmt(res.sumDietas), total: true },
      { label: 'H. Extra',      value: fmt(res.H_EXTRA)  },
      { label: 'H. Presencia',  value: fmt(res.H_PRESEN) },
      { label: 'Nocturno',      value: fmt(res.NOCTURNO) },
      { label: 'Dieta Nac.',    value: fmt(res.DIET_NAC) },
      { label: 'Dieta Inter.',  value: fmt(res.DIET_INTER) },
      { label: 'Mejora',        value: fmt(res.MEJORA)   },
    ] : [
      { label: 'Plus Eficiencia', value: fmt(res.PLUS_EFICIENCIA) },
      { label: 'Disponibilidad',  value: fmt(res.DISPONIBILIDAD)  },
      { label: 'Dietas',          value: fmt(res.DIETAS)          },
      { label: 'TOTAL',           value: fmt(res.TOTAL), total: true },
    ];

  items.forEach(({ label, value, total }) => {
    const div = document.createElement('div');
    div.className = 'resultado-item' + (total ? ' total' : '');
    div.innerHTML = `<div class="r-label">${label}</div><div class="r-value">${value}</div>`;
    grid.appendChild(div);
  });
}

// ---- CONDUCTOR ACTUAL ----
function buscarConductorActual() {
  return buscarConductor(document.getElementById('codConductor').value.trim());
}

// ---- CALCULAR TIEMPOS ----
function calcularTiempos() {
  const plataforma = document.getElementById('plataforma').value;
  const fs  = document.getElementById('fechaSalida').value;
  const fl  = document.getElementById('fechaLlegada').value;
  const inFS = document.getElementById('fechaSalida');
  const inFL = document.getElementById('fechaLlegada');
  const hoy  = new Date().toISOString().slice(0, 10);

  inFS.style.borderColor = '';
  inFL.style.borderColor = '';

  if (fs && fs > hoy) {
    inFS.style.borderColor = '#c0392b';
    showToast('La fecha de salida no puede ser futura', 'error');
    return;
  }
  if (fl && fl > hoy) {
    inFL.style.borderColor = '#c0392b';
    showToast('La fecha de llegada no puede ser futura', 'error');
    return;
  }
  if (fs && fl && fl <= fs) {
    inFL.style.borderColor = '#c0392b';
    showToast('La fecha de llegada debe ser posterior a la de salida', 'error');
    return;
  }
  if (!fs) return;

  const categoria = document.getElementById('categoria').value.toUpperCase();
  const esSinKm   = ['COMODIN','PESCADO'].includes(categoria);

  let dias = 0, resto = 0;

  if (esSinKm) {
    // COMODÍN/PESCADO: días = fechaLlegada - fechaSalida + 1 (igual que el resto)
    if (!fl) return;
    dias = Math.round((parseFecha(fl) - parseFecha(fs)) / 86400000) + 1;
    if (dias < 1) dias = 0;
    // coefNacional = días calculados (todo nacional por defecto)
    document.getElementById('coefNacional').value = dias;
  } else if (!fl) {
    return;
  } else if (plataforma === 'CAUDETE') {
    const hs = document.getElementById('horaSalida').value;
    const hl = document.getElementById('horaLlegada').value;
    if (!hs || !hl) return;
    const diffH = (new Date(`${fl}T${hl}`) - new Date(`${fs}T${hs}`)) / 3600000;
    dias  = Math.floor(diffH / 24);
    resto = diffH % 24;
    document.getElementById('restoHoras').value  = resto.toFixed(2);
    document.getElementById('numDomingos').value = contarDomingos(fs, fl);
    document.getElementById('numFestivos').value = contarFestivos(fs, fl);
  } else {
    dias = Math.round((new Date(fl) - new Date(fs)) / 86400000) + 1;
  }

  document.getElementById('diasTrabajados').value = dias > 0 ? dias : 0;
  calcularDietas();
}

// ---- FORMATEAR KM CON SEPARADOR DE MILES ----
function formatKm(input) {
  const val = parseKm(input.value);
  if (val) input.value = val.toLocaleString('es-ES');
}

function parseKm(str) {
  // Elimina puntos de miles y convierte coma decimal
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

// ---- CALCULAR KMs ----
function calcularKms() {
  const cat = document.getElementById('categoria').value.toUpperCase();
  if (cat === 'COMODIN' || cat === 'PESCADO') {
    const tkEl = document.getElementById('totalKm');
    if (!parseKm(tkEl.value)) tkEl.value = (12000).toLocaleString('es-ES');
    calcularDietas();
    return;
  }
  const sal  = parseKm(document.getElementById('kmSalida').value);
  const vuel = parseKm(document.getElementById('kmVuelta').value);
  const inS  = document.getElementById('kmSalida');
  const inV  = document.getElementById('kmVuelta');

  if (sal && vuel && vuel < sal) {
    inS.style.borderColor = '#c0392b';
    inV.style.borderColor = '#c0392b';
    showToast('Km Vuelta no puede ser inferior a Km Salida', 'error');
    document.getElementById('totalKm').value = '';
    return;
  }
  inS.style.borderColor = '';
  inV.style.borderColor = '';
  const total = sal && vuel ? vuel - sal : 0;
  document.getElementById('totalKm').value = total ? total.toLocaleString('es-ES') : '';
  calcularDietas();
}


// ---- CALCULAR DIETAS PARA UN CONDUCTOR ESPECÍFICO (sin usar el formulario) ----
function calcularDietasParaConductor(conductor, datos) {
  const f = {
    plataforma:   datos.plataforma,
    categoria:    (datos.categoria || '').toUpperCase(),
    totalKm:      datos.totalKm      || 0,
    diasTrab:     datos.diasTrabajados || 0,
    restoHoras:   datos.restoHoras   || 0,
    coefNac:      datos.coefNacional  || 0,
    extras:       datos.extras        || 0,
    nAcarreos:    datos.acarreos      || 0,
    nVlissingen:  datos.dietaVlissingen || 0,
    nCarga:       datos.nCarga   || 0,
    nPalet:       datos.nPalet   || 0,
    nRebote:      datos.nRebote  || 0,
    n24h:         datos.n24h     || 0,
    nPausa:       datos.nPausa   || 0,
    nNacional:    datos.nNacional || 0,
    nUK:          datos.nUK      || 0,
    nNDLF:        datos.nNDLF    || 0,
    nDomingos:    datos.nDomingos || 0,
    nFestivos:    datos.nFestivos || 0,
    fechaSalida:  datos.fechaSalida  || '',
    fechaLlegada: datos.fechaLlegada || '',
  };

  // Sobreescribir precioKm con el del conductor de la pareja
  const precioKm = conductor?.PrecioKmt || 0;

  let res = {};
  if (f.categoria === 'PESCADO' || f.categoria === 'COMODIN') {
    const sumDietas = f.totalKm * precioKm;
    const H_EXTRA   = 0.02926 * 0.4 * f.totalKm;
    const H_PRESEN  = 0.02926 * 0.5 * f.totalKm;
    const NOCTURNO  = 0.02926 * 0.1 * f.totalKm;
    // DIET_NAC = diferencia entre el total y las horas, para que siempre cuadre
    const DIET_NAC  = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO;
    res = { sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER: 0 };
  } else if (f.plataforma === 'TJG') {
    // EQUIPAJE DOBLE: cargas y palets al 50%
    const coefDobleTJG = (datos.equipaje === 'DOBLE') ? 0.5 : 1;
    const sumVariables = f.nCarga    * getTarifa('CARGA/DESCARGAS', 'TJG') * coefDobleTJG
                       + f.nPalet    * getTarifa('MOV. PALETS',     'TJG') * coefDobleTJG
                       + f.nRebote   * getTarifa('REBOTE',          'TJG')
                       + f.n24h      * getTarifa('24HORAS_PAUSA',   'TJG')
                       + f.nPausa    * getTarifa('24HORAS_PAUSA',   'TJG')
                       + f.nAcarreos * getTarifa('ACARREOS',        'TJG')
                       + f.nVlissingen * getTarifa('DIETA_VLISSINGEN','TJG')
                       + f.extras;
    const sumDietas = f.totalKm * precioKm + sumVariables;
    const H_EXTRA   = 0.02926 * 0.4 * f.totalKm;
    const H_PRESEN  = 0.02926 * 0.5 * f.totalKm;
    const NOCTURNO  = 0.02926 * 0.1 * f.totalKm;
    let DIET_NAC, DIET_INTER;
    if (f.coefNac >= f.diasTrab) {
      DIET_INTER = 0;
      DIET_NAC   = Math.max(0, sumDietas - H_EXTRA - H_PRESEN - NOCTURNO);
    } else {
      DIET_NAC   = f.coefNac * 45.19;
      DIET_INTER = Math.max(0, sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC);
    }
    res = { sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER };
  } else if (f.plataforma === 'FILARDI') {
    const sumVariables = f.nRebote     * getTarifa('REBOTE',           'FILARDI')
                       + f.nUK         * getTarifa('UK',               'FILARDI')
                       + f.nNDLF       * getTarifa('NDLF',             'FILARDI')
                       + f.nAcarreos   * getTarifa('ACARREOS',         'FILARDI')
                       + f.nVlissingen * getTarifa('DIETA_VLISSINGEN', 'FILARDI')
                       + f.extras;
    const sumDietas = f.totalKm * precioKm + sumVariables;
    const H_EXTRA   = 0.02926 * 0.4 * f.totalKm;
    const H_PRESEN  = 0.02926 * 0.5 * f.totalKm;
    const NOCTURNO  = 0.02926 * 0.1 * f.totalKm;
    const DIET_NAC  = f.coefNac * 45.19;
    let DIET_INTER  = (f.diasTrab - f.coefNac) * 59;
    let MEJORA      = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC - DIET_INTER;
    if (MEJORA < 0) { DIET_INTER = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC; MEJORA = 0; }
    res = { sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER, MEJORA };
  } else if (f.plataforma === 'CAUDETE') {
    const tarDF = getTarifa('DOMINGO_FESTIVOS', 'CAUDETE');
    let diasEfic = f.diasTrab;
    if (f.fechaSalida && f.fechaLlegada) {
      const fs = parseFecha(f.fechaSalida);
      const fl = parseFecha(f.fechaLlegada);
      diasEfic = Math.round((fl - fs) / 86400000) + 1;
    }
    const PLUS_EFICIENCIA = diasEfic * 8.75;
    // EQUIPAJE DOBLE: cargas y palets al 50%
    const coefDobleCAU = (datos.equipaje === 'DOBLE') ? 0.5 : 1;
    const DISPONIBILIDAD  = (f.nDomingos + f.nFestivos) * tarDF
                          + f.nCarga    * getTarifa('CARGA/DESCARGAS', 'CAUDETE') * coefDobleCAU
                          + f.nPalet    * getTarifa('MOV. PALETS',     'CAUDETE') * coefDobleCAU
                          + f.nNacional * 10.3;
    const DIETAS = f.diasTrab   * getTarifa('DIA',    'CAUDETE')
                 + f.restoHoras * getTarifa('HORAS',  'CAUDETE')
                 + f.nRebote    * getTarifa('REBOTE', 'CAUDETE')
                 + f.extras;
    const TOTAL = PLUS_EFICIENCIA + DISPONIBILIDAD + DIETAS;
    const DIET_NAC   = f.diasTrab > 0 ? (DIETAS / f.diasTrab) * f.coefNac : 0;
    const DIET_INTER = DIETAS - DIET_NAC;
    res = { PLUS_EFICIENCIA, DISPONIBILIDAD, DIETAS, TOTAL, DIET_NAC, DIET_INTER };
  }

  return res;
}
