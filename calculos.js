// =============================================
// calculos.js — Lógica de cálculo de dietas
// =============================================

// ---- HELPERS DE CALENDARIO ----
function parseFecha(fecha) {
  // Evita desfase de zona horaria interpretando siempre en local
  const [y, m, d] = String(fecha).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function esDomingo(fecha) {
  return parseFecha(fecha).getDay() === 0;
}

function esFestivoNacional(fecha) {
  const d   = parseFecha(fecha);
  const mes = d.getMonth() + 1;
  const dia = d.getDate();
  return [[1,1],[6,1],[19,3],[1,5],[15,8],[12,10],[1,11],[6,12],[8,12],[25,12]]
    .some(([m, dd]) => m === mes && dd === dia);
}

function contarDomingos(inicio, fin) {
  let n = 0;
  const d = parseFecha(inicio);
  const f = parseFecha(fin);
  while (d <= f) { if (d.getDay() === 0) n++; d.setDate(d.getDate() + 1); }
  return n;
}

function contarFestivos(inicio, fin) {
  // Solo festivos que NO caen en domingo (para no duplicar)
  const fest = [[1,1],[6,1],[19,3],[1,5],[15,8],[12,10],[1,11],[6,12],[8,12],[25,12]];
  let n = 0;
  const d = parseFecha(inicio);
  const f = parseFecha(fin);
  while (d <= f) {
    const mes = d.getMonth() + 1, dia = d.getDate();
    if (d.getDay() !== 0 && fest.some(([m, dd]) => m === mes && dd === dia)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

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
  if (f.categoria === 'PESCADO') res = calcPESCADO(f);
  else if (f.plataforma === 'TJG')     res = calcTJG(f);
  else if (f.plataforma === 'FILARDI') res = calcFILARDI(f);
  else if (f.plataforma === 'CAUDETE') res = calcCAUDETE(f);

  mostrarResultado(res, f.plataforma, f.categoria);
  return res;
}

// ---- PESCADO ----
function calcPESCADO({ totalKm, coefNac }) {
  const precioKm  = buscarConductorActual()?.PrecioKmt || 0;
  const sumDietas = totalKm * precioKm;  // siempre 12.000 × PrecioKmt
  const H_EXTRA   = 0.02926 * 0.4 * totalKm;
  const H_PRESEN  = 0.02926 * 0.5 * totalKm;
  const NOCTURNO  = 0.02926 * 0.1 * totalKm;
  const DIET_NAC  = coefNac * 45.19;
  const DIET_INTER = 0;
  return { sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER };
}

// ---- TJG ----
function calcTJG({ totalKm, diasTrab, coefNac, nCarga, nPalet, nRebote, n24h, nPausa, nAcarreos, nVlissingen, extras }) {
  const precioKm = buscarConductorActual()?.PrecioKmt || 0;

  const sumVariables = nCarga      * getTarifa('CARGA/DESCARGAS', 'TJG')
                     + nPalet      * getTarifa('MOV. PALETS',     'TJG')
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
function calcCAUDETE({ diasTrab, restoHoras, nDomingos, nFestivos, nCarga, nPalet, nRebote, nNacional, extras, fechaSalida, fechaLlegada }) {
  const tarDF = getTarifa('DOMINGO_FESTIVOS', 'CAUDETE');

  // Plus Eficiencia = (fecha llegada - fecha salida + 1) × 8,75
  let diasEfic = diasTrab;
  if (fechaSalida && fechaLlegada) {
    const fs = parseFecha(fechaSalida);
    const fl = parseFecha(fechaLlegada);
    diasEfic = Math.round((fl - fs) / 86400000) + 1;
  }
  const PLUS_EFICIENCIA = diasEfic * 8.75;

  const DISPONIBILIDAD  = (nDomingos + nFestivos) * tarDF
                        + nCarga    * getTarifa('CARGA/DESCARGAS', 'CAUDETE')
                        + nPalet    * getTarifa('MOV. PALETS',     'CAUDETE')
                        + nNacional * 10.3;
  const DIETAS          = diasTrab   * getTarifa('DIA',    'CAUDETE')
                        + restoHoras * getTarifa('HORAS',  'CAUDETE')
                        + nRebote    * getTarifa('REBOTE', 'CAUDETE')
                        + extras;
  const TOTAL = PLUS_EFICIENCIA + DISPONIBILIDAD + DIETAS;

  return { PLUS_EFICIENCIA, DISPONIBILIDAD, DIETAS, TOTAL };
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
  if (!fs || !fl) return;

  let dias = 0, resto = 0;

  if (plataforma === 'CAUDETE') {
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
    document.getElementById('totalKm').value = (12000).toLocaleString('es-ES');
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
