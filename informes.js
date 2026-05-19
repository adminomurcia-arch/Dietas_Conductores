// =============================================
// informes.js — Generación de informes
// =============================================

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

// ---- GENERAR CSV (compatible con Excel) ----
function arrayToCSV(headers, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(';')];
  rows.forEach(r => lines.push(headers.map(h => esc(r[h] ?? '')).join(';')));
  return '\uFEFF' + lines.join('\r\n'); // BOM para Excel
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

// ---- VERSIÓN DE FICHERO ----
function nombreVersionado(base, ext) {
  const v = getNextVersion();
  return `${base}_v${v}.${ext}`;
}

// ============================================================
// INFORME CONDUCTOR — Email individual o masivo
// ============================================================
function informeConductorEmail() {
  const cod    = document.getElementById('inf-cod-conductor').value.trim();
  const desde  = document.getElementById('inf-desde').value;
  const hasta  = document.getElementById('inf-hasta').value;
  const regs   = filtrarRegistros(desde, hasta, '', cod);

  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  // Agrupar por conductor
  const porConductor = {};
  regs.forEach(r => {
    if (!porConductor[r.codigoConductor]) porConductor[r.codigoConductor] = [];
    porConductor[r.codigoConductor].push(r);
  });

  const conductores = getConductores();

  Object.entries(porConductor).forEach(([codigo, registros]) => {
    const c = conductores.find(x => String(x.Codigo) === String(codigo));
    if (!c || !c.Email) return;

    const asunto = encodeURIComponent(`Liquidación de dietas — ${c.Nombre}`);
    const cuerpo = encodeURIComponent(generarCuerpoEmail(c, registros));
    window.open(`mailto:${c.Email}?subject=${asunto}&body=${cuerpo}`, '_blank');
  });

  showToast('Emails preparados en Outlook');
}

function generarCuerpoEmail(conductor, registros) {
  let txt = `Estimado/a ${conductor.Nombre},\n\n`;
  txt += `A continuación el detalle de su liquidación de dietas:\n\n`;

  registros.forEach(r => {
    txt += `───────────────────────────────\n`;
    txt += `Período: ${r.fechaSalida} → ${r.fechaLlegada}\n`;
    txt += `Días trabajados: ${r.diasTrabajados}\n`;
    txt += `Total Km: ${r.totalKm}\n`;

    if (r.resultado) {
      if (r.plataforma === 'CAUDETE') {
        txt += `Plus Eficiencia: ${fmt2(r.resultado.PLUS_EFICIENCIA)} €\n`;
        txt += `Disponibilidad: ${fmt2(r.resultado.DISPONIBILIDAD)} €\n`;
        txt += `Dietas: ${fmt2(r.resultado.DIETAS)} €\n`;
        txt += `TOTAL: ${fmt2(r.resultado.TOTAL)} €\n`;
      } else {
        txt += `Total Dietas: ${fmt2(r.resultado.sumDietas)} €\n`;
        txt += `H. Extra: ${fmt2(r.resultado.H_EXTRA)} €\n`;
        txt += `H. Presencia: ${fmt2(r.resultado.H_PRESEN)} €\n`;
        txt += `Nocturno: ${fmt2(r.resultado.NOCTURNO)} €\n`;
        txt += `Dieta Nacional: ${fmt2(r.resultado.DIET_NAC)} €\n`;
        txt += `Dieta Internacional: ${fmt2(r.resultado.DIET_INTER)} €\n`;
        if (r.resultado.MEJORA !== undefined) txt += `Mejora: ${fmt2(r.resultado.MEJORA)} €\n`;
      }
    }
    txt += '\n';
  });

  txt += `Un saludo,\nDpto. de Administración\n`;
  return txt;
}

function informeConductorPDF() {
  const cod   = document.getElementById('inf-cod-conductor').value.trim();
  const desde = document.getElementById('inf-desde').value;
  const hasta = document.getElementById('inf-hasta').value;
  const regs  = filtrarRegistros(desde, hasta, '', cod);
  if (!regs.length) { showToast('No hay registros', 'error'); return; }
  generarHTMLParaImprimir(regs, 'Informe Conductor');
}

// ============================================================
// INFORME GESTORÍA
// ============================================================
function informeGestoria() {
  const plat  = document.getElementById('inf-plataforma-gestoria').value;
  const desde = document.getElementById('inf-gest-desde').value;
  const hasta = document.getElementById('inf-gest-hasta').value;
  const regs  = filtrarRegistros(desde, hasta, plat, '');

  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  const headers = ['COD', 'NOMBRE', 'H_EXTRA', 'H_PRESEN', 'NOCTURNO', 'DIET_NAC', 'DIET_INTER', 'ANTICIPOS', 'MEJORA'];

  const rows = regs.map(r => ({
    COD:        r.codigoConductor,
    NOMBRE:     r.nombreConductor,
    H_EXTRA:    fmt2(r.resultado?.H_EXTRA),
    H_PRESEN:   fmt2(r.resultado?.H_PRESEN),
    NOCTURNO:   fmt2(r.resultado?.NOCTURNO),
    DIET_NAC:   fmt2(r.resultado?.DIET_NAC),
    DIET_INTER: fmt2(r.resultado?.DIET_INTER),
    ANTICIPOS:  fmt2(r.anticipos),
    MEJORA:     fmt2(r.resultado?.MEJORA),
  }));

  const csv = arrayToCSV(headers, rows);
  descargarCSV(csv, nombreVersionado(`gestoria_${plat}`, 'csv'));
  showToast('Informe Gestoría exportado ✓', 'success');
}

function informeGestoriaPDF() {
  const plat  = document.getElementById('inf-plataforma-gestoria').value;
  const desde = document.getElementById('inf-gest-desde').value;
  const hasta = document.getElementById('inf-gest-hasta').value;
  const regs  = filtrarRegistros(desde, hasta, plat, '');
  if (!regs.length) { showToast('No hay registros', 'error'); return; }
  generarHTMLParaImprimir(regs, `Gestoría ${plat}`);
}

// ============================================================
// INFORME RRHH
// ============================================================
function informeRRHH() {
  const plat    = document.getElementById('inf-rrhh-plataforma').value;
  const formato = document.getElementById('inf-rrhh-formato').value;
  const desde   = document.getElementById('inf-rrhh-desde').value;
  const hasta   = document.getElementById('inf-rrhh-hasta').value;
  const regs    = filtrarRegistros(desde, hasta, plat, '');

  if (!regs.length) { showToast('No hay registros para ese filtro', 'error'); return; }

  let headers, rows;

  if (formato === 'detallado') {
    headers = ['COD', 'NOMBRE', 'PLATAFORMA', 'CATEGORIA', 'FECHA_SALIDA', 'FECHA_LLEGADA',
               'DIAS_TRAB', 'TOTAL_KM', 'COEF_NAC', 'DOM_FEST',
               'CARGA_DESC', 'MOV_PALET', 'REBOTE', '24H', 'PAUSA', 'UK', 'NDLF',
               'ACARREOS', 'VLISSINGEN', 'EXTRAS', 'ANTICIPOS',
               'SUM_DIETAS', 'H_EXTRA', 'H_PRESEN', 'NOCTURNO',
               'DIET_NAC', 'DIET_INTER', 'MEJORA',
               'PLUS_EFIC', 'DISPONIB', 'DIETAS_CAU'];
    rows = regs.map(r => ({
      COD: r.codigoConductor, NOMBRE: r.nombreConductor,
      PLATAFORMA: r.plataforma, CATEGORIA: r.categoria,
      FECHA_SALIDA: r.fechaSalida, FECHA_LLEGADA: r.fechaLlegada,
      DIAS_TRAB: r.diasTrabajados, TOTAL_KM: r.totalKm,
      COEF_NAC: r.coefNacional, DOM_FEST: r.domingosFestivos,
      CARGA_DESC: r.nCarga, MOV_PALET: r.nPalet, REBOTE: r.nRebote,
      '24H': r.n24h, PAUSA: r.nPausa, UK: r.nUK, NDLF: r.nNDLF,
      ACARREOS: r.acarreos, VLISSINGEN: r.dietaVlissingen,
      EXTRAS: r.extras, ANTICIPOS: r.anticipos,
      SUM_DIETAS: fmt2(r.resultado?.sumDietas),
      H_EXTRA: fmt2(r.resultado?.H_EXTRA), H_PRESEN: fmt2(r.resultado?.H_PRESEN),
      NOCTURNO: fmt2(r.resultado?.NOCTURNO), DIET_NAC: fmt2(r.resultado?.DIET_NAC),
      DIET_INTER: fmt2(r.resultado?.DIET_INTER), MEJORA: fmt2(r.resultado?.MEJORA),
      PLUS_EFIC: fmt2(r.resultado?.PLUS_EFICIENCIA),
      DISPONIB: fmt2(r.resultado?.DISPONIBILIDAD),
      DIETAS_CAU: fmt2(r.resultado?.DIETAS),
    }));
  } else {
    headers = ['COD', 'NOMBRE', 'PLATAFORMA', 'FECHA_SALIDA', 'FECHA_LLEGADA', 'DIAS_TRAB', 'TOTAL_KM', 'SUM_DIETAS'];
    rows = regs.map(r => ({
      COD: r.codigoConductor, NOMBRE: r.nombreConductor,
      PLATAFORMA: r.plataforma,
      FECHA_SALIDA: r.fechaSalida, FECHA_LLEGADA: r.fechaLlegada,
      DIAS_TRAB: r.diasTrabajados, TOTAL_KM: r.totalKm,
      SUM_DIETAS: fmt2(r.resultado?.sumDietas || r.resultado?.TOTAL),
    }));
  }

  const csv = arrayToCSV(headers, rows);
  descargarCSV(csv, nombreVersionado(`rrhh_${formato}`, 'csv'));
  showToast('Informe RRHH exportado ✓', 'success');
}

function informeRRHHPDF() {
  const plat  = document.getElementById('inf-rrhh-plataforma').value;
  const desde = document.getElementById('inf-rrhh-desde').value;
  const hasta = document.getElementById('inf-rrhh-hasta').value;
  const regs  = filtrarRegistros(desde, hasta, plat, '');
  if (!regs.length) { showToast('No hay registros', 'error'); return; }
  generarHTMLParaImprimir(regs, 'Informe RRHH');
}

// ============================================================
// HTML PARA IMPRIMIR / PDF
// ============================================================
function generarHTMLParaImprimir(regs, titulo) {
  const conductores = getConductores();
  let html = `<html><head><meta charset="UTF-8">
    <title>${titulo}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 20px; }
      h1 { color: #4a7c59; font-size: 18px; margin-bottom: 4px; }
      .subtitulo { color: #888; font-size: 11px; margin-bottom: 20px; }
      .reg { border: 1px solid #ddd; border-radius: 6px; padding: 14px; margin-bottom: 14px; page-break-inside: avoid; }
      .reg-header { font-weight: bold; font-size: 13px; color: #4a7c59; margin-bottom: 8px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .item label { display: block; font-size: 10px; color: #888; }
      .item span  { font-weight: 500; }
      .total { background: #4a7c59; color: #fff; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; font-weight: bold; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>${titulo}</h1>
    <div class="subtitulo">Generado: ${new Date().toLocaleString('es-ES')}</div>
    <button onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;background:#4a7c59;color:#fff;border:none;border-radius:4px;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>`;

  regs.forEach(r => {
    const c = conductores.find(x => String(x.Codigo) === String(r.codigoConductor));
    html += `<div class="reg">
      <div class="reg-header">${r.nombreConductor} (${r.codigoConductor}) — ${r.plataforma}</div>
      <div class="grid">
        <div class="item"><label>Fecha Salida</label><span>${r.fechaSalida}</span></div>
        <div class="item"><label>Fecha Llegada</label><span>${r.fechaLlegada}</span></div>
        <div class="item"><label>Días Trabajados</label><span>${r.diasTrabajados}</span></div>
        <div class="item"><label>Total Km</label><span>${r.totalKm}</span></div>
        <div class="item"><label>Coef. Nacional</label><span>${r.coefNacional}</span></div>
        <div class="item"><label>Dom. & Festivos</label><span>${r.domingosFestivos}</span></div>
      </div>`;

    if (r.resultado) {
      if (r.plataforma === 'CAUDETE') {
        html += `<div class="grid" style="margin-top:8px">
          <div class="item"><label>Plus Eficiencia</label><span>${fmt2(r.resultado.PLUS_EFICIENCIA)} €</span></div>
          <div class="item"><label>Disponibilidad</label><span>${fmt2(r.resultado.DISPONIBILIDAD)} €</span></div>
          <div class="item"><label>Dietas</label><span>${fmt2(r.resultado.DIETAS)} €</span></div>
        </div>
        <div class="total">TOTAL: ${fmt2(r.resultado.TOTAL)} €</div>`;
      } else {
        html += `<div class="grid" style="margin-top:8px">
          <div class="item"><label>H. Extra</label><span>${fmt2(r.resultado.H_EXTRA)} €</span></div>
          <div class="item"><label>H. Presencia</label><span>${fmt2(r.resultado.H_PRESEN)} €</span></div>
          <div class="item"><label>Nocturno</label><span>${fmt2(r.resultado.NOCTURNO)} €</span></div>
          <div class="item"><label>Dieta Nac.</label><span>${fmt2(r.resultado.DIET_NAC)} €</span></div>
          <div class="item"><label>Dieta Inter.</label><span>${fmt2(r.resultado.DIET_INTER)} €</span></div>
          ${r.resultado.MEJORA !== undefined ? `<div class="item"><label>Mejora</label><span>${fmt2(r.resultado.MEJORA)} €</span></div>` : ''}
        </div>
        <div class="total">TOTAL DIETAS: ${fmt2(r.resultado.sumDietas)} €</div>`;
      }
    }
    html += `</div>`;
  });

  html += `</body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ============================================================
// EXPORT / IMPORT EXCEL (JSON en fichero versionado)
// ============================================================
function exportarExcel() {
  const data = {
    version:     getNextVersion(),
    exportado:   new Date().toISOString(),
    conductores: getConductores(),
    tarifas:     getTarifas(),
    registros:   getRegistros(),
  };
  const v = data.version;
  descargarJSON(data, `dietas_v${v}.json`);
  showToast(`Exportado como dietas_v${v}.json ✓`, 'success');
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
