// =============================================
// utils.js — Utilidades compartidas
// Usado por: calculos.js, movil.html, app.js
// =============================================

// ---- NORMALIZACIÓN DE CÓDIGOS DE CONDUCTOR ----

/**
 * Normaliza un código de conductor a 6 dígitos con ceros a la izquierda,
 * igual que el campo Codigo del maestro de conductores.
 * Evita que el mismo conductor quede guardado como "10195" (admin) y
 * "010195" (móvil), lo que rompía filtros y cruces.
 *   normCod('10195')  -> '010195'
 *   normCod('010195') -> '010195'
 *   normCod(110034)   -> '110034'
 *   normCod('')       -> ''
 */
function normCod(c) {
  const s = String(c ?? '').trim();
  if (!s) return '';
  return s.padStart(6, '0');
}

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

// ---- FESTIVOS ----
//
// FESTIVOS_FIJOS: se repiten todos los años. Formato [día, mes].
//   Incluye los 10 nacionales de España + el Día de la Región de Murcia (9 jun).
//
// FESTIVOS_VARIABLES: fechas completas 'AAAA-MM-DD' que cambian cada año
//   (festivos locales de Molina de Segura, Semana Santa, traslados de festivo
//   que cae en domingo, etc.). ⚠️ REVISAR Y ACTUALIZAR CADA ENERO.
//
// Motivo de la separación: los festivos locales de Molina de Segura y los de
// Semana Santa NO caen en la misma fecha todos los años, así que no pueden ir
// en la lista fija [día, mes].

const FESTIVOS_FIJOS = [
  // --- Nacionales de España (fijos) ---
  [1, 1],    // Año Nuevo
  [6, 1],    // Reyes
  [19, 3],   // San José
  [1, 5],    // Día del Trabajo
  [15, 8],   // Asunción de la Virgen
  [12, 10],  // Fiesta Nacional de España
  [1, 11],   // Todos los Santos
  [6, 12],   // Día de la Constitución
  [8, 12],   // Inmaculada Concepción
  [25, 12],  // Navidad
  // --- Autonómico Región de Murcia (fijo) ---
  [9, 6],    // Día de la Región de Murcia
];

const FESTIVOS_VARIABLES = [
  // Molina de Segura — festivo local (cambia cada año, revisar)
  '2026-09-21',  // Molina de Segura 2026
  // Añadir aquí cada enero los festivos variables del año:
  //   - Jueves y Viernes Santo (Semana Santa)
  //   - Festivo local de Molina de Segura del año en curso
  //   - Traslados de festivos que caen en domingo, si aplica
];

/**
 * ¿La fecha ('YYYY-MM-DD') es festivo?
 * Comprueba tanto los fijos [día, mes] como los variables (fecha completa).
 */
function esFestivoNacional(fecha) {
  const d   = parseFecha(fecha);
  const mes = d.getMonth() + 1;
  const dia = d.getDate();
  if (FESTIVOS_FIJOS.some(([dd, m]) => dd === dia && m === mes)) return true;
  const iso = String(fecha).slice(0, 10);
  return FESTIVOS_VARIABLES.includes(iso);
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
 * Cuenta los festivos en el rango [inicio, fin] que NO caen en domingo
 * (para no duplicar con contarDomingos).
 */
function contarFestivos(inicio, fin) {
  let n = 0;
  const d = parseFecha(inicio);
  const f = parseFecha(fin);
  while (d <= f) {
    const mes = d.getMonth() + 1;
    const dia = d.getDate();
    const iso = `${d.getFullYear()}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const esFijo = FESTIVOS_FIJOS.some(([dd, m]) => dd === dia && m === mes);
    const esVar  = FESTIVOS_VARIABLES.includes(iso);
    if (d.getDay() !== 0 && (esFijo || esVar)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
