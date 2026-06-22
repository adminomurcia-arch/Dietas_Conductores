// =============================================
// utils.js — Utilidades compartidas
// Usado por: calculos.js, movil.html, app.js
// =============================================

// ---- HELPERS DE CALENDARIO ----

/**
 * Parsea una fecha 'YYYY-MM-DD' en hora local (evita desfase UTC).
 */
function parseFecha(fecha) {
  const [y, m, d] = String(fecha).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function esDomingo(fecha) {
  return parseFecha(fecha).getDay() === 0;
}

// Festivos nacionales fijos: [mes, día]
const FESTIVOS_NACIONALES = [
  [1,1],[6,1],[19,3],[1,5],[15,8],[12,10],[1,11],[6,12],[8,12],[25,12]
];

function esFestivoNacional(fecha) {
  const d   = parseFecha(fecha);
  const mes = d.getMonth() + 1;
  const dia = d.getDate();
  return FESTIVOS_NACIONALES.some(([m, dd]) => m === mes && dd === dia);
}

/**
 * Cuenta los domingos en el rango [inicio, fin] (fechas 'YYYY-MM-DD').
 */
function contarDomingos(inicio, fin) {
  let n = 0;
  const d = parseFecha(inicio);
  const f = parseFecha(fin);
  while (d <= f) {
    if (d.getDay() === 0) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/**
 * Cuenta los festivos nacionales en el rango [inicio, fin] que NO caen en domingo
 * (para no duplicar con contarDomingos).
 */
function contarFestivos(inicio, fin) {
  let n = 0;
  const d = parseFecha(inicio);
  const f = parseFecha(fin);
  while (d <= f) {
    const mes = d.getMonth() + 1, dia = d.getDate();
    if (d.getDay() !== 0 && FESTIVOS_NACIONALES.some(([m, dd]) => m === mes && dd === dia)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
