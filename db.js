// =============================================
// db.js — Base de datos (localStorage + Excel)
// =============================================

const DB_KEY_CONDUCTORES = 'dietas_conductores';
const DB_KEY_TARIFAS     = 'dietas_tarifas';
const DB_KEY_REGISTROS   = 'dietas_registros';
const DB_KEY_VERSION     = 'dietas_export_version';

// ---- TARIFAS POR DEFECTO ----
const TARIFAS_DEFAULT = [
  { CONCEPTO: 'CARGA/DESCARGAS',   TJG: 10,  CAUDETE: 15.45, FILARDI: 0   },
  { CONCEPTO: 'MOV. PALETS',       TJG: 10,  CAUDETE: 5.15,  FILARDI: 0   },
  { CONCEPTO: 'REBOTE',            TJG: 80,  CAUDETE: 82.40, FILARDI: 80  },
  { CONCEPTO: 'UK',                TJG: 0,   CAUDETE: 0,     FILARDI: 50  },
  { CONCEPTO: 'NDLF',              TJG: 0,   CAUDETE: 0,     FILARDI: 20  },
  { CONCEPTO: 'ACARREOS',          TJG: 15,  CAUDETE: 0,     FILARDI: 15  },
  { CONCEPTO: 'DIETA_VLISSINGEN',  TJG: 110, CAUDETE: 0,     FILARDI: 110 },
  { CONCEPTO: 'DIA',               TJG: 80,  CAUDETE: 77.25, FILARDI: 0   },
  { CONCEPTO: 'DOMINGO_FESTIVOS',  TJG: 0,   CAUDETE: 36.05, FILARDI: 0   },
  { CONCEPTO: 'HORAS',             TJG: 0,   CAUDETE: 3.22,  FILARDI: 0   },
  { CONCEPTO: '24HORAS_PAUSA',     TJG: 80,  CAUDETE: 0,     FILARDI: 0   },
];

// ---- CONDUCTORES DEFAULT (del Excel proporcionado) ----
const CONDUCTORES_DEFAULT = [
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10001', Nombre:'ENCHEV, TSVETAN IVANOV',         NIF:'X4341880D', IBAN:'ES1400814238870001999302', PrecioKmt:0.14, Email:'ivanovenchev@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10004', Nombre:'ROMANOV, ANATOLIY',              NIF:'X6524356S', IBAN:'ES8100811434140006320148', PrecioKmt:0.14, Email:'tellmy75@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10006', Nombre:'GALBEAZA, CONSTANTIN GABRIEL',   NIF:'Y4271693D', IBAN:'ES0530580334522810035511', PrecioKmt:0.14, Email:'arianagalbeaza82@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10007', Nombre:'MILEVSKI, VALENTIN IVANOV',      NIF:'X7844477M', IBAN:'ES5800811452760006767189', PrecioKmt:0.14, Email:'ivanovmilevskivalentin@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10008', Nombre:'PICOITA CHECA, JORGE EDISON',    NIF:'48752112R', IBAN:'ES6601827611540208518685', PrecioKmt:0.14, Email:'picoitajorgeedison2012@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10009', Nombre:'MIRON, TOADER',                  NIF:'X3573353G', IBAN:'ES5421008382960200115250', PrecioKmt:0.14, Email:'Mirontoader60@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10015', Nombre:'DIMITROV, GEORGI HRISTOV',       NIF:'X4093636G', IBAN:'ES9101823203570201617524', PrecioKmt:0.14, Email:'ghristov378@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10018', Nombre:'IVANOV, ANDREAN DIMITROV',       NIF:'X5627466X', IBAN:'ES6700494795152595025115', PrecioKmt:0.14, Email:'andreandimitrovivanov@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10019', Nombre:'GRUTZKAU, BODO',                 NIF:'X6280101C', IBAN:'ES1930580380372810019532', PrecioKmt:0.12, Email:'Elaleman43@msn.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10020', Nombre:'PARASHKEVOV, NEDKO HRISTOV',     NIF:'X9439090M', IBAN:'ES0900750284780700486355', PrecioKmt:0.14, Email:'nedkopr@hotmail.com' },
];

// ---- GETTERS ----
function getConductores() {
  const raw = localStorage.getItem(DB_KEY_CONDUCTORES);
  return raw ? JSON.parse(raw) : [...CONDUCTORES_DEFAULT];
}

function getTarifas() {
  const raw = localStorage.getItem(DB_KEY_TARIFAS);
  return raw ? JSON.parse(raw) : [...TARIFAS_DEFAULT];
}

function getRegistros() {
  const raw = localStorage.getItem(DB_KEY_REGISTROS);
  return raw ? JSON.parse(raw) : [];
}

// ---- SETTERS ----
function saveConductores(data) {
  localStorage.setItem(DB_KEY_CONDUCTORES, JSON.stringify(data));
}

function saveTarifas(data) {
  localStorage.setItem(DB_KEY_TARIFAS, JSON.stringify(data));
}

function saveRegistros(data) {
  localStorage.setItem(DB_KEY_REGISTROS, JSON.stringify(data));
}

// ---- CRUD CONDUCTORES ----
function buscarConductor(codigo) {
  return getConductores().find(c => String(c.Codigo) === String(codigo).trim());
}

function upsertConductor(conductor) {
  const lista = getConductores();
  const idx = lista.findIndex(c => String(c.Codigo) === String(conductor.Codigo));
  if (idx >= 0) lista[idx] = conductor;
  else lista.push(conductor);
  saveConductores(lista);
}

function eliminarConductor(codigo) {
  const lista = getConductores().filter(c => String(c.Codigo) !== String(codigo));
  saveConductores(lista);
}

// ---- CRUD REGISTROS ----
function addRegistro(reg) {
  const lista = getRegistros();
  reg.id = Date.now();
  reg.fechaCreacion = new Date().toISOString();
  lista.push(reg);
  saveRegistros(lista);
  return reg;
}

// ---- TARIFA por concepto y plataforma ----
function getTarifa(concepto, plataforma) {
  const tarifas = getTarifas();
  const fila = tarifas.find(t => t.CONCEPTO === concepto);
  return fila ? (fila[plataforma] || 0) : 0;
}

// ---- FESTIVOS MOLINA DE SEGURA ----
// Festivos nacionales + locales aproximados (ampliable)
function esFestivoNacional(fecha) {
  const d = new Date(fecha);
  const mes = d.getMonth() + 1;
  const dia = d.getDate();
  const festivos = [
    [1,1],[6,1],[19,3],[1,5],[15,8],[12,10],[1,11],[6,12],[8,12],[25,12]
  ];
  return festivos.some(([m, dd]) => m === mes && dd === dia);
}

function esDomingo(fecha) {
  return new Date(fecha).getDay() === 0;
}

function contarDomingosFestivos(inicio, fin) {
  let count = 0;
  const d = new Date(inicio);
  const fEnd = new Date(fin);
  while (d <= fEnd) {
    if (esDomingo(d) || esFestivoNacional(d)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ---- EXPORT VERSION ----
function getNextVersion() {
  const v = parseInt(localStorage.getItem(DB_KEY_VERSION) || '0') + 1;
  localStorage.setItem(DB_KEY_VERSION, String(v));
  return v;
}

// ---- INIT: cargar defaults si vacío ----
function initDB() {
  if (!localStorage.getItem(DB_KEY_CONDUCTORES)) saveConductores(CONDUCTORES_DEFAULT);
  if (!localStorage.getItem(DB_KEY_TARIFAS))     saveTarifas(TARIFAS_DEFAULT);
  if (!localStorage.getItem(DB_KEY_REGISTROS))   saveRegistros([]);
}
