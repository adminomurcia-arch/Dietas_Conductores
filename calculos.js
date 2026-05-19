// =============================================
// calculos.js — Lógica de cálculo de dietas
// =============================================

// ---- OBTENER VALORES DE OPERACIONES ----
function getCountDetallado(tipo) {
  return document.querySelectorAll(`#lista-${tipo} .operacion-row`).length;
}

function getCountResumido(tipo) {
  const el = document.getElementById(`r-${tipo}`);
  return el ? parseInt(el.value) || 0 : 0;
}

function getCount(tipo) {
  const modo = document.getElementById('btn-detallado').classList.contains('active') ? 'detallado' : 'resumido';
  return modo === 'detallado' ? getCountDetallado(tipo) : getCountResumido(tipo);
}

// ---- CÁLCULO PRINCIPAL ----
function calcularDietas() {
  const plataforma = document.getElementById('plataforma').value.trim();
  if (!plataforma) return;

  const totalKm     = parseFloat(document.getElementById('totalKm').value)      || 0;
  const diasTrab    = parseFloat(document.getElementById('diasTrabajados').value)|| 0;
  const restoHoras  = parseFloat(document.getElementById('restoHoras').value)    || 0;
  const coefNac     = parseFloat(document.getElementById('coefNacional').value)  || 0;
  const domFest     = parseFloat(document.getElementById('domingosFestivos').value) || 0;
  const extras      = parseFloat(document.getElementById('extras').value)        || 0;

  const nCarga      = getCount('carga');
  const nPalet      = getCount('palet');
  const nRebote     = getCount('rebote');
  const n24h        = getCount('24horas');
  const nPausa      = getCount('pausa');
  const nNacional   = getCount('nacional');
  const nUK         = getCount('uk');
  const nNDLF       = getCount('ndlf');
  const nAcarreos   = parseFloat(document.getElementById('acarreos').value)         || 0;
  const nVlissingen = parseFloat(document.getElementById('dietaVlissingen').value)  || 0;

  let resultado = {};

  if (plataforma === 'TJG') {
    resultado = calcTJG({ totalKm, coefNac, nCarga, nPalet, nRebote, n24h, nPausa, nAcarreos, nVlissingen, extras });
  } else if (plataforma === 'FILARDI') {
    resultado = calcFILARDI({ totalKm, diasTrab, coefNac, nRebote, nUK, nNDLF, nAcarreos, nVlissingen, extras });
  } else if (plataforma === 'CAUDETE') {
    resultado = calcCAUDETE({ diasTrab, restoHoras, domFest, nCarga, nPalet, nRebote, nNacional, extras });
  }

  mostrarResultado(resultado, plataforma);
}

// ---- TJG ----
function calcTJG({ totalKm, coefNac, nCarga, nPalet, nRebote, n24h, nPausa, nAcarreos, nVlissingen, extras }) {
  const conductor = buscarConductorActual();
  const precioKm  = conductor ? conductor.PrecioKmt : 0;

  const varCarga   = nCarga     * getTarifa('CARGA/DESCARGAS', 'TJG');
  const varPalet   = nPalet     * getTarifa('MOV. PALETS',     'TJG');
  const varRebote  = nRebote    * getTarifa('REBOTE',          'TJG');
  const var24h     = n24h       * getTarifa('24HORAS_PAUSA',   'TJG');
  const varPausa   = nPausa     * getTarifa('24HORAS_PAUSA',   'TJG');
  const varAcarr   = nAcarreos  * getTarifa('ACARREOS',        'TJG');
  const varVliss   = nVlissingen* getTarifa('DIETA_VLISSINGEN','TJG');

  const sumVariables = varCarga + varPalet + varRebote + var24h + varPausa + varAcarr + varVliss + extras;
  const sumDietas    = (totalKm * precioKm) + sumVariables;

  const H_EXTRA  = 0.02926 * 0.4 * totalKm;
  const H_PRESEN = 0.02926 * 0.5 * totalKm;
  const NOCTURNO = 0.02926 * 0.1 * totalKm;
  const DIET_NAC = coefNac * 45.19;
  const DIET_INT = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC;

  return {
    sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER: DIET_INT,
    desglose: { varCarga, varPalet, varRebote, var24h, varPausa, varAcarr, varVliss, extras }
  };
}

// ---- FILARDI ----
function calcFILARDI({ totalKm, diasTrab, coefNac, nRebote, nUK, nNDLF, nAcarreos, nVlissingen, extras }) {
  const conductor = buscarConductorActual();
  const precioKm  = conductor ? conductor.PrecioKmt : 0;

  const varRebote  = nRebote     * getTarifa('REBOTE',           'FILARDI');
  const varUK      = nUK         * getTarifa('UK',               'FILARDI');
  const varNDLF    = nNDLF       * getTarifa('NDLF',             'FILARDI');
  const varAcarr   = nAcarreos   * getTarifa('ACARREOS',         'FILARDI');
  const varVliss   = nVlissingen * getTarifa('DIETA_VLISSINGEN', 'FILARDI');

  const sumVariables = varRebote + varUK + varNDLF + varAcarr + varVliss + extras;
  const sumDietas    = (totalKm * precioKm) + sumVariables;

  const H_EXTRA  = 0.02926 * 0.4 * totalKm;
  const H_PRESEN = 0.02926 * 0.5 * totalKm;
  const NOCTURNO = 0.02926 * 0.1 * totalKm;
  const DIET_NAC = coefNac * 45.19;

  let DIET_INTER = (diasTrab - coefNac) * 59;
  let MEJORA     = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC - DIET_INTER;

  if (MEJORA < 0) {
    DIET_INTER = sumDietas - H_EXTRA - H_PRESEN - NOCTURNO - DIET_NAC;
    MEJORA = 0;
  }

  return {
    sumDietas, H_EXTRA, H_PRESEN, NOCTURNO, DIET_NAC, DIET_INTER, MEJORA,
    desglose: { varRebote, varUK, varNDLF, varAcarr, varVliss, extras }
  };
}

// ---- CAUDETE ----
function calcCAUDETE({ diasTrab, restoHoras, domFest, nCarga, nPalet, nRebote, nNacional, extras }) {
  const PLUS_EFICIENCIA = diasTrab * 8.75;
  const DISPONIBILIDAD  = (domFest   * getTarifa('DOMINGO_FESTIVOS', 'CAUDETE'))
                        + (nCarga    * getTarifa('CARGA/DESCARGAS',  'CAUDETE'))
                        + (nPalet    * getTarifa('MOV. PALETS',      'CAUDETE'))
                        + (nNacional * 10.3);
  const DIETAS          = (diasTrab  * getTarifa('DIA',    'CAUDETE'))
                        + (restoHoras* getTarifa('HORAS',  'CAUDETE'))
                        + (nRebote   * getTarifa('REBOTE', 'CAUDETE'))
                        + extras;
  const TOTAL = PLUS_EFICIENCIA + DISPONIBILIDAD + DIETAS;

  return { PLUS_EFICIENCIA, DISPONIBILIDAD, DIETAS, TOTAL };
}

// ---- MOSTRAR RESULTADO ----
function mostrarResultado(res, plataforma) {
  const sec = document.getElementById('section-resultado');
  const grid = document.getElementById('resultado-dietas');
  sec.style.display = 'block';
  grid.innerHTML = '';

  const fmt = v => `${(+v).toFixed(2)} €`;

  if (plataforma === 'TJG') {
    const items = [
      { label: 'Total Dietas', value: fmt(res.sumDietas), total: true },
      { label: 'H. Extra',     value: fmt(res.H_EXTRA) },
      { label: 'H. Presencia', value: fmt(res.H_PRESEN) },
      { label: 'Nocturno',     value: fmt(res.NOCTURNO) },
      { label: 'Dieta Nac.',   value: fmt(res.DIET_NAC) },
      { label: 'Dieta Inter.', value: fmt(res.DIET_INTER) },
    ];
    items.forEach(i => grid.appendChild(crearResultadoItem(i)));
  } else if (plataforma === 'FILARDI') {
    const items = [
      { label: 'Total Dietas', value: fmt(res.sumDietas), total: true },
      { label: 'H. Extra',     value: fmt(res.H_EXTRA) },
      { label: 'H. Presencia', value: fmt(res.H_PRESEN) },
      { label: 'Nocturno',     value: fmt(res.NOCTURNO) },
      { label: 'Dieta Nac.',   value: fmt(res.DIET_NAC) },
      { label: 'Dieta Inter.', value: fmt(res.DIET_INTER) },
      { label: 'Mejora',       value: fmt(res.MEJORA) },
    ];
    items.forEach(i => grid.appendChild(crearResultadoItem(i)));
  } else if (plataforma === 'CAUDETE') {
    const items = [
      { label: 'Plus Eficiencia',  value: fmt(res.PLUS_EFICIENCIA) },
      { label: 'Disponibilidad',   value: fmt(res.DISPONIBILIDAD) },
      { label: 'Dietas',           value: fmt(res.DIETAS) },
      { label: 'TOTAL',            value: fmt(res.TOTAL), total: true },
    ];
    items.forEach(i => grid.appendChild(crearResultadoItem(i)));
  }
}

function crearResultadoItem({ label, value, total }) {
  const div = document.createElement('div');
  div.className = 'resultado-item' + (total ? ' total' : '');
  div.innerHTML = `<div class="r-label">${label}</div><div class="r-value">${value}</div>`;
  return div;
}

// ---- HELPER: conductor actual ----
function buscarConductorActual() {
  const cod = document.getElementById('codConductor').value.trim();
  return buscarConductor(cod);
}

// ---- CALCULAR TIEMPOS ----
function calcularTiempos() {
  const plataforma = document.getElementById('plataforma').value;
  const fs = document.getElementById('fechaSalida').value;
  const fl = document.getElementById('fechaLlegada').value;
  if (!fs || !fl) return;

  let dias = 0, resto = 0;

  if (plataforma === 'CAUDETE') {
    const hs = document.getElementById('horaSalida').value;
    const hl = document.getElementById('horaLlegada').value;
    if (!hs || !hl) return;
    const inicio = new Date(`${fs}T${hs}`);
    const fin    = new Date(`${fl}T${hl}`);
    const diffH  = (fin - inicio) / 3600000;
    dias  = Math.floor(diffH / 24);
    resto = diffH % 24;
  } else {
    const inicio = new Date(fs);
    const fin    = new Date(fl);
    dias = Math.round((fin - inicio) / 86400000) + 1;
  }

  document.getElementById('diasTrabajados').value = dias > 0 ? dias : 0;
  if (plataforma === 'CAUDETE') {
    document.getElementById('restoHoras').value = resto.toFixed(2);
  }

  // Domingos y festivos
  if (fs && fl) {
    const df = contarDomingosFestivos(fs, fl);
    document.getElementById('domingosFestivos').value = df;
  }

  calcularDietas();
}

// ---- CALCULAR KMs ----
function calcularKms() {
  const categoria = document.getElementById('categoria').value.toUpperCase();
  if (categoria === 'COMODIN' || categoria === 'PESCADO') {
    document.getElementById('totalKm').value = 12000;
    return;
  }
  const sal  = parseFloat(document.getElementById('kmSalida').value)  || 0;
  const vuel = parseFloat(document.getElementById('kmVuelta').value)  || 0;
  document.getElementById('totalKm').value = sal + vuel;
  calcularDietas();
}
