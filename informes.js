// =============================================
// informes.js — Previsualización y exportación
// =============================================

// Estado del informe activo
let _informe = { tipo: '', datos: [], headers: [], filas: [], titulo: '' };

// ---- UTILIDADES ----
function filtrarRegistros(desde, hasta, plataforma, conductorCod) {
  let regs = getRegistros();
  if (desde)        regs = regs.filter(r => r.fechaSalida >= desde);
  if (hasta)        regs = regs.filter(r => r.fechaSalida <= hasta);
  if (plataforma)   regs = regs.filter(r => r.plataforma === plataforma);
  if (conductorCod) regs = regs.filter(r => String(r.codigoConductor) === String(conductorCod));
  return regs;
}

function fmt2(n) { return parseFloat(n || 0).toFixed(2); }

// ============================================================
// PREVISUALIZACIÓN — Conductor
// ============================================================
function previsualizarConductor() {
  const cod   = document.getElementById('inf-cod-conductor').value.trim();
  const desde = document.getElementById('inf-desde').value;
  const hasta = document.getElementById('inf-hasta').value;
  const regs  = filtrarRegistros(desde, hasta, '', cod);
  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  const headers = ['Código', 'Nombre', 'Plataforma', 'Salida', 'Llegada', 'Días', 'Total Km', 'Total Dietas'];
  const filas = regs.map(r => ({
    'Código':       r.codigoConductor,
    'Nombre':       r.nombreConductor,
    'Plataforma':   r.plataforma,
    'Salida':       r.fechaSalida,
    'Llegada':      r.fechaLlegada,
    'Días':         r.diasTrabajados,
    'Total Km':     r.totalKm,
    'Total Dietas': fmt2(r.plataforma === 'CAUDETE' ? r.resultado?.TOTAL : r.resultado?.sumDietas) + ' €',
  }));

  _informe = { tipo: 'conductor', datos: regs, headers, filas, titulo: 'Informe Conductor' };
  mostrarPreview(headers, filas, 'Informe Conductor');
}

// ============================================================
// PREVISUALIZACIÓN — Gestoría
// ============================================================
function previsualizarGestoria() {
  const plat  = document.getElementById('inf-plataforma-gestoria').value;
  const desde = document.getElementById('inf-gest-desde').value;
  const hasta = document.getElementById('inf-gest-hasta').value;
  const regs  = filtrarRegistros(desde, hasta, plat, '');
  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  const headers = ['COD', 'NOMBRE', 'PERÍODO', 'H_EXTRA', 'H_PRESEN', 'NOCTURNO', 'DIET_NAC', 'DIET_INTER', 'ANTICIPOS', 'MEJORA'];
  const filas = regs.map(r => ({
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
  }));

  _informe = { tipo: 'gestoria', datos: regs, headers, filas, titulo: `Gestoria_${plat}` };
  mostrarPreview(headers, filas, `Gestoría — ${plat}`);
}

// ============================================================
// PREVISUALIZACIÓN — RRHH
// ============================================================
function previsualizarRRHH() {
  const plat    = document.getElementById('inf-rrhh-plataforma').value;
  const formato = document.getElementById('inf-rrhh-formato').value;
  const desde   = document.getElementById('inf-rrhh-desde').value;
  const hasta   = document.getElementById('inf-rrhh-hasta').value;
  const regs    = filtrarRegistros(desde, hasta, plat, '');
  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  let headers, filas;

  if (formato === 'detallado') {
    headers = ['COD','NOMBRE','PLATAFORMA','CATEGORÍA','TRACTORA','SALIDA','LLEGADA',
               'DÍAS','KM','COEF_NAC','DOM_FEST',
               'CARGA','PALET','REBOTE','24H','PAUSA','UK','NDLF',
               'ACARREOS','VLISSINGEN','EXTRAS','ANTICIPOS',
               'SUM_DIETAS','H_EXTRA','H_PRESEN','NOCTURNO',
               'DIET_NAC','DIET_INTER','MEJORA',
               'PLUS_EFIC','DISPONIB','DIETAS_CAU'];
    filas = regs.map(r => ({
      'COD': r.codigoConductor, 'NOMBRE': r.nombreConductor,
      'PLATAFORMA': r.plataforma, 'CATEGORÍA': r.categoria,
      'TRACTORA': r.tractora || '',
      'SALIDA': r.fechaSalida, 'LLEGADA': r.fechaLlegada,
      'DÍAS': r.diasTrabajados, 'KM': r.totalKm,
      'COEF_NAC': r.coefNacional, 'DOM_FEST': (r.nDomingos||0) + (r.nFestivos||0),
      'CARGA': r.nCarga, 'PALET': r.nPalet, 'REBOTE': r.nRebote,
      '24H': r.n24h, 'PAUSA': r.nPausa, 'UK': r.nUK, 'NDLF': r.nNDLF,
      'ACARREOS': r.acarreos, 'VLISSINGEN': r.dietaVlissingen,
      'EXTRAS': fmt2(r.extras), 'ANTICIPOS': fmt2(r.anticipos),
      'SUM_DIETAS': fmt2(r.resultado?.sumDietas),
      'H_EXTRA': fmt2(r.resultado?.H_EXTRA), 'H_PRESEN': fmt2(r.resultado?.H_PRESEN),
      'NOCTURNO': fmt2(r.resultado?.NOCTURNO), 'DIET_NAC': fmt2(r.resultado?.DIET_NAC),
      'DIET_INTER': fmt2(r.resultado?.DIET_INTER), 'MEJORA': fmt2(r.resultado?.MEJORA),
      'PLUS_EFIC': fmt2(r.resultado?.PLUS_EFICIENCIA),
      'DISPONIB': fmt2(r.resultado?.DISPONIBILIDAD),
      'DIETAS_CAU': fmt2(r.resultado?.DIETAS),
    }));
  } else {
    headers = ['COD','NOMBRE','PLATAFORMA','SALIDA','LLEGADA','DÍAS','KM','TOTAL'];
    filas = regs.map(r => ({
      'COD': r.codigoConductor, 'NOMBRE': r.nombreConductor,
      'PLATAFORMA': r.plataforma,
      'SALIDA': r.fechaSalida, 'LLEGADA': r.fechaLlegada,
      'DÍAS': r.diasTrabajados, 'KM': r.totalKm,
      'TOTAL': fmt2(r.resultado?.sumDietas || r.resultado?.TOTAL),
    }));
  }

  const titulo = `RRHH_${plat || 'Todas'}_${formato}`;
  _informe = { tipo: 'rrhh', datos: regs, headers, filas, titulo };
  mostrarPreview(headers, filas, `RRHH — ${plat || 'Todas'} (${formato})`);
}

// ============================================================
// MOSTRAR PREVIEW EN PANTALLA
// ============================================================
const NUM_COLS = new Set(['Días','Total Km','KM','DÍAS','TOTAL',
  'H_EXTRA','H_PRESEN','NOCTURNO','DIET_NAC','DIET_INTER','MEJORA','ANTICIPOS',
  'SUM_DIETAS','PLUS_EFIC','DISPONIB','DIETAS_CAU','EXTRAS','COEF_NAC','DOM_FEST',
  'CARGA','PALET','REBOTE','24H','PAUSA','UK','NDLF','ACARREOS','VLISSINGEN']);

function mostrarPreview(headers, filas, titulo) {
  document.getElementById('inf-preview-empty').style.display   = 'none';
  document.getElementById('inf-preview-content').style.display = 'block';
  document.getElementById('inf-preview-titulo').textContent     = `${titulo} — ${filas.length} registros`;

  let html = `<table><thead><tr>`;
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
    // Conductor: email automático a cada conductor usando su email de la BD
    const conductores = getConductores();
    const porConductor = {};
    _informe.datos.forEach(r => {
      if (!porConductor[r.codigoConductor]) porConductor[r.codigoConductor] = [];
      porConductor[r.codigoConductor].push(r);
    });
    let enviados = 0;
    Object.entries(porConductor).forEach(([codigo, registros]) => {
      const c = conductores.find(x => String(x.Codigo) === String(codigo));
      if (!c || !c.Email) return;
      const asunto = encodeURIComponent(`Liquidación de dietas — ${c.Nombre}`);
      const cuerpo = encodeURIComponent(generarCuerpoEmail(c, registros));
      window.open(`mailto:${c.Email}?subject=${asunto}&body=${cuerpo}`, '_blank');
      enviados++;
    });
    if (enviados === 0) showToast('Ningún conductor tiene email registrado', 'error');
    else showToast(`${enviados} email(s) preparados en Outlook ✓`, 'success');
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

function descargarJSON(data, nombre) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

function generarCuerpoEmail(conductor, registros) {
  let txt = `Estimado/a ${conductor.Nombre},\n\nDetalle de su liquidación de dietas:\n\n`;
  registros.forEach(r => {
    txt += `────────────────────────────────\n`;
    txt += `Período: ${r.fechaSalida} → ${r.fechaLlegada}\n`;
    txt += `Días trabajados: ${r.diasTrabajados} | Total Km: ${r.totalKm}\n`;
    if (r.resultado) {
      if (r.plataforma === 'CAUDETE') {
        txt += `Plus Eficiencia: ${fmt2(r.resultado.PLUS_EFICIENCIA)} €\n`;
        txt += `Disponibilidad:  ${fmt2(r.resultado.DISPONIBILIDAD)} €\n`;
        txt += `Dietas:          ${fmt2(r.resultado.DIETAS)} €\n`;
        txt += `TOTAL:           ${fmt2(r.resultado.TOTAL)} €\n`;
      } else {
        txt += `Total Dietas:       ${fmt2(r.resultado.sumDietas)} €\n`;
        txt += `H. Extra:           ${fmt2(r.resultado.H_EXTRA)} €\n`;
        txt += `H. Presencia:       ${fmt2(r.resultado.H_PRESEN)} €\n`;
        txt += `Nocturno:           ${fmt2(r.resultado.NOCTURNO)} €\n`;
        txt += `Dieta Nacional:     ${fmt2(r.resultado.DIET_NAC)} €\n`;
        txt += `Dieta Internacional:${fmt2(r.resultado.DIET_INTER)} €\n`;
        if (r.resultado.MEJORA !== undefined) txt += `Mejora:             ${fmt2(r.resultado.MEJORA)} €\n`;
      }
    }
    txt += '\n';
  });
  txt += `Un saludo,\nDpto. de Administración\n`;
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
      if (data.conductores) saveConductores(data.conductores);
      if (data.tarifas)     saveTarifas(data.tarifas);
      if (data.registros)   saveRegistros(data.registros);
      renderTablas();
      renderHistorial();
      showToast('Datos importados correctamente ✓', 'success');
    } catch {
      showToast('Error al leer el fichero', 'error');
    }
  };
  reader.readAsText(file);
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
