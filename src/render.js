// Renderer generici condivisi da tutti i calcolatori.
// Un calcolatore descrive i propri campi e le proprie righe di confronto;
// qui si trasformano in DOM. I calcolatori non toccano mai il layout.

import { fmtEuro, fmtPerc, fmtNum, fmtValue, toInputString, fromInputString } from './format.js';
import { RATES } from './rates.js';

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// --- Campo di input --------------------------------------------------------

// field: { key, label, unit, hint, ref (chiave RATES), type: 'number'|'select'|'checkbox',
//          options: [{value,label}], locked }
export function renderField(field, value, onChange) {
  const id = 'f_' + field.key;

  if (field.locked) {
    const ref = field.ref ? RATES[field.ref] : null;
    return el('div', { class: 'field field--locked' }, [
      el('label', { for: id, text: field.label }),
      el('div', { class: 'field__locked-value' }, [
        el('span', { class: 'lock', text: '🔒', 'aria-hidden': 'true' }),
        el('span', { text: fmtValue(value, field.unit) }),
      ]),
      el('p', { class: 'field__ref', text: 'fissato per legge' + (ref ? ' — ' + ref.label : '') }),
    ]);
  }

  let control;
  if (field.type === 'select') {
    control = el('select', { id, onchange: (e) => onChange(parseSelect(e.target.value)) },
      field.options.map((o) => el('option', {
        value: String(o.value),
        selected: String(o.value) === String(value),
      }, o.label)));
  } else if (field.type === 'checkbox') {
    control = el('input', {
      id, type: 'checkbox', checked: Boolean(value),
      onchange: (e) => onChange(e.target.checked),
    });
  } else {
    control = el('input', {
      id, type: 'text', inputmode: 'decimal', value: toInputString(value, field.unit),
      onchange: (e) => {
        const v = fromInputString(e.target.value, field.unit);
        e.target.value = toInputString(v, field.unit);
        onChange(v);
      },
    });
  }

  const parts = [el('label', { for: id, text: field.label })];
  if (field.type === 'checkbox') {
    return el('div', { class: 'field field--check' }, [control, el('label', { for: id, text: field.label })]);
  }
  const wrap = el('div', { class: 'field__control' }, [control]);
  if (field.unit === 'perc') wrap.appendChild(el('span', { class: 'field__unit', text: '%' }));
  else if (field.unit === 'euro') wrap.appendChild(el('span', { class: 'field__unit', text: '€' }));
  parts.push(wrap);
  if (field.hint) parts.push(el('p', { class: 'field__hint', text: field.hint }));
  return el('div', { class: 'field' }, parts);
}

function parseSelect(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && raw.trim() !== '' ? n : raw;
}

// --- Tabella di confronto ------------------------------------------------------

// spec: { colonne: [labelA, labelB], righe: [riga, ...] }
// riga: { label, a, b, kind: 'euro'|'perc'|'num', strong, note, section (bool: riga-titolo) }
export function renderCompareTable(spec) {
  const thead = el('thead', {}, el('tr', {}, [
    el('th', { class: 'ct__voce', text: 'Voce' }),
    ...spec.colonne.map((c) => el('th', { class: 'ct__num', text: c })),
  ]));

  const rows = spec.righe.map((r) => {
    if (r.section) {
      return el('tr', { class: 'ct__section' }, el('th', { colspan: 3, text: r.label }));
    }
    const cls = 'ct__row' + (r.strong ? ' ct__row--strong' : '');
    // Colorazione per segno solo sulle righe che la chiedono esplicitamente (r.signed):
    // in una tabella di costi, dipingere di verde ogni numero positivo sarebbe fuorviante.
    const sc = r.signed ? signClass : () => '';
    return el('tr', { class: cls }, [
      el('th', { class: 'ct__voce' }, [
        r.label,
        r.note ? el('span', { class: 'ct__rownote', text: r.note }) : null,
      ]),
      el('td', { class: 'ct__num' + sc(r.a, r.kind) }, fmtCell(r.a, r.kind)),
      el('td', { class: 'ct__num' + sc(r.b, r.kind) }, fmtCell(r.b, r.kind)),
    ]);
  });

  return el('div', { class: 'ledger' }, [
    el('table', { class: 'ct' }, [thead, el('tbody', {}, rows)]),
  ]);
}

function fmtCell(v, kind) {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return v;
  if (kind === 'perc') return fmtPerc(v);
  if (kind === 'num') return fmtNum(v);
  return fmtEuro(v, true);
}

function signClass(v, kind) {
  if (typeof v !== 'number' || kind === 'perc' || kind === 'num') return '';
  if (v < -0.005) return ' is-neg';
  if (v > 0.005) return ' is-pos';
  return '';
}

// --- Pannello del delta netto -----------------------------------------------

// delta: { label, value, favorevole (stringa), note, notaProfilo }
export function renderDelta(delta) {
  const cls = 'delta ' + (delta.value >= 0 ? 'delta--pos' : 'delta--neg');
  return el('div', { class: cls }, [
    el('div', { class: 'delta__label', text: delta.label }),
    el('div', { class: 'delta__value', text: fmtEuro(Math.abs(delta.value), true) }),
    delta.favorevole ? el('div', { class: 'delta__fav', text: delta.favorevole }) : null,
    delta.note ? el('p', { class: 'delta__note', text: delta.note }) : null,
    delta.notaProfilo ? el('p', { class: 'delta__note delta__note--profilo', text: delta.notaProfilo }) : null,
  ]);
}

// --- Barra del punto di pareggio -------------------------------------------

// be: { label, valore, riferimento, min, max, unit, notaValore, notaRiferimento }
export function renderBreakEven(be) {
  const span = be.max - be.min || 1;
  const posVal = clamp((be.valore - be.min) / span);
  const posRif = clamp((be.riferimento - be.min) / span);
  return el('div', { class: 'breakeven' }, [
    el('div', { class: 'breakeven__label', text: be.label }),
    el('div', { class: 'breakeven__track' }, [
      el('div', { class: 'breakeven__mark breakeven__mark--rif', style: `left:${posRif * 100}%` },
        el('span', { text: be.notaRiferimento || 'pareggio' })),
      el('div', { class: 'breakeven__mark breakeven__mark--val', style: `left:${posVal * 100}%` },
        el('span', { text: be.notaValore || 'tuo valore' })),
    ]),
    el('div', { class: 'breakeven__scale' }, [
      el('span', { text: fmtValue(be.min, be.unit) }),
      el('span', { text: fmtValue(be.max, be.unit) }),
    ]),
    el('p', { class: 'breakeven__caption', text:
      `Pareggio a ${fmtValue(be.riferimento, be.unit)} — valore corrente ${fmtValue(be.valore, be.unit)}.` }),
  ]);
}

function clamp(x) { return Math.max(0, Math.min(1, x)); }

// --- Elenco fonti -----------------------------------------------------------

export function renderSources(keys) {
  const seen = new Set();
  const items = [];
  for (const k of keys) {
    const r = RATES[k];
    if (!r || seen.has(r.url)) continue;
    seen.add(r.url);
    items.push(el('li', {}, [
      el('a', { href: r.url, target: '_blank', rel: 'noopener', text: r.fonte }),
      el('span', { class: 'src__what', text: ' — ' + r.label }),
    ]));
  }
  return el('section', { class: 'sources' }, [
    el('h3', { text: 'Fonti dei valori usati' }),
    el('ul', {}, items),
    el('p', { class: 'sources__note', text:
      'Elenco completo e note su tutti i valori: pagina Fonti. Verifica sempre sui testi normativi e sulla prassi dell’Agenzia delle Entrate.' }),
  ]);
}

// --- Disclaimer -----------------------------------------------------------

const DISCLAIMER = 'Strumento illustrativo per fare i propri conti. Non è consulenza fiscale. ' +
  'Ogni strategia va validata con un commercialista: la linea fra ottimizzazione lecita ed elusione ' +
  'dipende dal caso concreto — documentazione, congruità degli importi, sostanza economica dell’operazione, ' +
  'delibere con data certa. I valori 2026 possono cambiare a ogni legge di bilancio.';

export function renderDisclaimer(compact = false) {
  return el('aside', { class: 'disclaimer' + (compact ? ' disclaimer--compact' : '') }, [
    el('strong', { text: 'Attenzione. ' }),
    DISCLAIMER,
  ]);
}
