// Stato per-calcolatore: input dell'utente + ultimo risultato calcolato.
// Persistito su localStorage; notifica i sottoscrittori a ogni modifica.

const KEY = 'calcolatled:v1';
const listeners = new Set();

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { inputs: {} };
  } catch {
    return { inputs: {} };
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ inputs: state.inputs }));
  } catch { /* storage non disponibile: si prosegue in memoria */ }
}

const results = {}; // non persistiti: ricalcolati a ogni render

export function getInputs(id, defaults) {
  const saved = state.inputs[id] || {};
  return { ...defaults, ...saved };
}

export function setInput(id, key, value) {
  state.inputs[id] = { ...(state.inputs[id] || {}), [key]: value };
  persist();
  emit();
}

export function resetInputs(id) {
  delete state.inputs[id];
  delete results[id];
  persist();
  emit();
}

export function isTouched(id) {
  return Boolean(state.inputs[id]);
}

export function setResult(id, result) {
  results[id] = result;
}

export function getResult(id) {
  return results[id];
}

// Riepilogo aggregato dei calcolatori effettivamente compilati dall'utente.
export function aggregate(registry) {
  const dettaglio = [];
  let permanente = 0;
  let differimento = 0;
  for (const calc of registry) {
    if (!isTouched(calc.id)) continue;
    const r = results[calc.id];
    if (!r || typeof r.risparmioSrl !== 'number') continue;
    const voce = {
      id: calc.id,
      titolo: calc.titolo,
      categoria: calc.categoria,
      valore: r.risparmioSrl,
      tipo: r.risparmioTipo || 'permanente',
    };
    dettaglio.push(voce);
    if (voce.tipo === 'differimento') differimento += voce.valore;
    else permanente += voce.valore;
  }
  return { permanente, differimento, dettaglio };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn();
}
