/**
 * CAMPOS — BACKEND (Google Apps Script)
 * ─────────────────────────────────────────────────────────
 * Pega este código en el editor de Apps Script (Extensiones →
 * Apps Script) del Google Sheet que vas a usar para CampOS.
 *
 * 1. Cambia PASSWORD por la misma clave que pongas en el HTML
 *    (const PASSWORD en campos.html).
 * 2. Ejecuta la función `setup` UNA VEZ desde el editor
 *    (▶ Ejecutar) para crear las 3 hojas con sus cabeceras.
 * 3. Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 *    Copia la URL que te da y pégala en SCRIPT_URL en campos.html.
 */

const PASSWORD = 'campos2026'; // debe coincidir con PASSWORD en campos.html
const INSCRIPCION_PWD = 'inscripcion2026'; // clave del formulario público — distinta de PASSWORD, cámbiala por proyecto

const SHEET_PARTICIPANTES = 'Participantes';
const SHEET_FICHAS        = 'Fichas';
const SHEET_CONFIG        = 'Config';

const COLS_PARTICIPANTES = ['n','gid','apellidos','nombre','grupo','grupoCamp','monitorId','activo'];
const COLS_FICHAS = ['n','apellidos','nombre','curso','grupo','contacto','tel1','tel2','codigoAN','alergias','medicacion','observaciones','grupoCamp','datosExtra','modificadoPor','actualizado'];
const COLS_CONFIG = ['key','value'];

/* ═══════════════ SETUP (ejecutar una vez a mano) ═══════════════ */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  crearHojaSiNoExiste_(ss, SHEET_PARTICIPANTES, COLS_PARTICIPANTES);
  crearHojaSiNoExiste_(ss, SHEET_FICHAS, COLS_FICHAS);
  crearHojaSiNoExiste_(ss, SHEET_CONFIG, COLS_CONFIG);
}

function crearHojaSiNoExiste_(ss, nombre, cabeceras) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras]);
    sh.setFrozenRows(1);
  }
}

/* ═══════════════ ENTRADA HTTP ═══════════════ */
function doGet(e) {
  try {
    const p = e.parameter;
    if (p.pwd !== PASSWORD) return json_({ ok: false, error: 'pwd' });

    switch (p.action) {
      case 'getAll':            return json_({ ok: true, data: getAllFichas_() });
      case 'getFicha':          return json_({ ok: true, data: getFicha_(p.n) });
      case 'getConfig':         return json_({ ok: true, data: getConfig_(p.key) });
      case 'getAllConfig':      return json_({ ok: true, data: getAllConfig_() });
      case 'getParticipantes':  return json_({ ok: true, data: getParticipantes_() });
      case 'saveParticipante':  return json_({ ok: saveParticipante_(p) });
      case 'deleteParticipante':return json_({ ok: deleteParticipante_(p.n) });
      default: return json_({ ok: false, error: 'accion desconocida' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');

    if (body.action === 'saveInscripcion') {
      if (body.pwd !== INSCRIPCION_PWD) return json_({ ok: false, error: 'pwd' });
      return json_(saveInscripcion_(body));
    }

    if (body.pwd !== PASSWORD) return json_({ ok: false, error: 'pwd' });

    switch (body.action) {
      case 'saveConfig':            return json_({ ok: saveConfig_(body.key, body.value) });
      case 'saveAllParticipantes':  return json_({ ok: saveAllParticipantes_(body.lista) });
      default:
        // Sin "action" => guardado de ficha individual (apellidos, nombre, curso, grupo,
        // contacto, tel1, tel2, codigoAN, alergias, medicacion, observaciones, grupoCamp, datosExtra)
        return json_({ ok: saveFicha_(body) });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════════ FICHAS ═══════════════ */
function getAllFichas_() {
  const sh = hoja_(SHEET_FICHAS);
  const rows = filas_(sh);
  const out = {};
  rows.forEach(r => { if (r.n) out[String(r.n)] = r; });
  return out;
}

function getFicha_(n) {
  const rows = filas_(hoja_(SHEET_FICHAS));
  return rows.find(r => String(r.n) === String(n)) || null;
}

function siguienteN_() {
  const sh = hoja_(SHEET_PARTICIPANTES);
  const idx = indiceColumnas_(sh);
  const numFilas = sh.getLastRow() - 1;
  if (numFilas <= 0) return 1;
  const col = sh.getRange(2, idx.n + 1, numFilas, 1).getValues();
  let max = 0;
  col.forEach(r => { const v = Number(r[0]); if (!isNaN(v) && v > max) max = v; });
  return max + 1;
}

function saveInscripcion_(data) {
  const n = siguienteN_();

  saveParticipante_({
    n: n,
    gid: data.gid || '',
    apellidos: data.apellidos || '',
    nombre: data.nombre || '',
    grupo: data.grupo || '❓',
    grupoCamp: data.grupoCamp || '',
    monitorId: '',
    activo: 'pendiente',
  });

  saveFicha_({
    n: n,
    apellidos: data.apellidos || '',
    nombre: data.nombre || '',
    curso: data.curso || '',
    grupo: data.grupo || '',
    contacto: data.contacto || '',
    tel1: data.tel1 || '',
    tel2: data.tel2 || '',
    codigoAN: data.codigoAN || '',
    alergias: data.alergias || '',
    medicacion: data.medicacion || '',
    observaciones: data.observaciones || '',
    grupoCamp: data.grupoCamp || '',
    datosExtra: data.datosExtra || null,
    modificadoPor: 'Inscripción online',
  });

  return { ok: true, n: n };
}

function saveFicha_(data) {
  const sh = hoja_(SHEET_FICHAS);
  const idx = indiceColumnas_(sh);
  const n = String(data.n);
  const filaExistente = buscarFila_(sh, idx.n, n);

  const registro = {
    n: data.n,
    apellidos: data.apellidos || '',
    nombre: data.nombre || '',
    curso: data.curso || '',
    grupo: data.grupo || '',
    contacto: data.contacto || '',
    tel1: data.tel1 || '',
    tel2: data.tel2 || '',
    codigoAN: data.codigoAN || '',
    alergias: data.alergias || '',
    medicacion: data.medicacion || '',
    observaciones: data.observaciones || '',
    grupoCamp: data.grupoCamp || '',
    datosExtra: data.datosExtra ? JSON.stringify(data.datosExtra) : '',
    modificadoPor: data.modificadoPor || '',
    actualizado: new Date().toISOString(),
  };
  escribirFila_(sh, COLS_FICHAS, registro, filaExistente);
  return true;
}

/* ═══════════════ PARTICIPANTES ═══════════════ */
function getParticipantes_() {
  return filas_(hoja_(SHEET_PARTICIPANTES));
}

function saveParticipante_(p) {
  const sh = hoja_(SHEET_PARTICIPANTES);
  const idx = indiceColumnas_(sh);
  const n = String(p.n);
  const filaExistente = buscarFila_(sh, idx.n, n);
  const registro = {
    n: p.n,
    gid: p.gid || '',
    apellidos: p.apellidos || '',
    nombre: p.nombre || '',
    grupo: p.grupo || '❓',
    grupoCamp: p.grupoCamp || '',
    monitorId: p.monitorId || '',
    // Si viene un estado explícito (ej. 'pendiente' desde una inscripción) se respeta.
    // Si no viene nada y es fila nueva, se activa por defecto. Si ya existía, no se pisa.
    activo: p.activo !== undefined ? p.activo : (filaExistente ? undefined : true),
  };
  escribirFila_(sh, COLS_PARTICIPANTES, registro, filaExistente);
  return true;
}

function deleteParticipante_(n) {
  const sh = hoja_(SHEET_PARTICIPANTES);
  const idx = indiceColumnas_(sh);
  const fila = buscarFila_(sh, idx.n, String(n));
  if (!fila) return true; // no existía, nada que borrar
  sh.getRange(fila, idx.activo + 1).setValue(false);
  return true;
}

function saveAllParticipantes_(lista) {
  if (!Array.isArray(lista)) return false;
  const sh = hoja_(SHEET_PARTICIPANTES);
  sh.clearContents();
  sh.getRange(1, 1, 1, COLS_PARTICIPANTES.length).setValues([COLS_PARTICIPANTES]);
  const filas = lista.map(p => COLS_PARTICIPANTES.map(c => {
    if (c === 'activo') return p.activo === undefined ? true : p.activo;
    return p[c] !== undefined ? p[c] : '';
  }));
  if (filas.length) sh.getRange(2, 1, filas.length, COLS_PARTICIPANTES.length).setValues(filas);
  return true;
}

/* ═══════════════ CONFIG (clave/valor JSON) ═══════════════ */
function getConfig_(key) {
  const sh = hoja_(SHEET_CONFIG);
  const idx = indiceColumnas_(sh);
  const fila = buscarFila_(sh, idx.key, key);
  if (!fila) return null;
  const raw = sh.getRange(fila, idx.value + 1).getValue();
  try { return JSON.parse(raw); } catch (e) { return raw; }
}

function getAllConfig_() {
  const sh = hoja_(SHEET_CONFIG);
  const rows = filas_(sh);
  const out = {};
  rows.forEach(r => {
    try { out[r.key] = JSON.parse(r.value); } catch (e) { out[r.key] = r.value; }
  });
  return out;
}

function saveConfig_(key, value) {
  const sh = hoja_(SHEET_CONFIG);
  const idx = indiceColumnas_(sh);
  const fila = buscarFila_(sh, idx.key, key);
  const valorStr = JSON.stringify(value);
  if (fila) {
    sh.getRange(fila, idx.value + 1).setValue(valorStr);
  } else {
    sh.appendRow([key, valorStr]);
  }
  return true;
}

/* ═══════════════ HELPERS DE HOJA ═══════════════ */
function hoja_(nombre) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la hoja "' + nombre + '". Ejecuta setup() primero.');
  return sh;
}

function indiceColumnas_(sh) {
  const cabeceras = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idx = {};
  cabeceras.forEach((c, i) => idx[c] = i);
  return idx;
}

function filas_(sh) {
  const cabeceras = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const numFilas = sh.getLastRow() - 1;
  if (numFilas <= 0) return [];
  const datos = sh.getRange(2, 1, numFilas, cabeceras.length).getValues();
  return datos
    .filter(fila => fila.some(v => v !== ''))
    .map(fila => {
      const obj = {};
      cabeceras.forEach((c, i) => obj[c] = fila[i]);
      return obj;
    });
}

function buscarFila_(sh, colIdx, valor) {
  const numFilas = sh.getLastRow() - 1;
  if (numFilas <= 0) return null;
  const columna = sh.getRange(2, colIdx + 1, numFilas, 1).getValues();
  for (let i = 0; i < columna.length; i++) {
    if (String(columna[i][0]) === String(valor)) return i + 2; // +2: cabecera + 1-index
  }
  return null;
}

function escribirFila_(sh, columnas, registro, filaExistente) {
  const idx = indiceColumnas_(sh);
  const fila = filaExistente || (sh.getLastRow() + 1); // si es nueva, la siguiente libre
  columnas.forEach(c => {
    if (registro[c] === undefined) return;   // no pisar si no se especifica este campo
    if (idx[c] === undefined) return;        // esa columna no existe en la hoja, se ignora
    sh.getRange(fila, idx[c] + 1).setValue(registro[c]);
  });
}
