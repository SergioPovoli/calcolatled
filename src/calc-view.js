import { el, renderField, renderCompareTable, renderDelta, renderBreakEven, renderSources, renderDisclaimer } from './render.js';
import { getCalculator } from './registry.js';
import { RATES } from './rates.js';
import { getInputs, setInput, resetInputs, setResult } from './store.js';

const ENV = { scaglioni: RATES.irpefScaglioni.value };

export function computeCalculator(calc) {
  const v = getInputs(calc.id, calc.defaults);
  const result = calc.compute(v, ENV);
  setResult(calc.id, result);
  return { v, result };
}

export function renderCalcView(id) {
  const calc = getCalculator(id);
  if (!calc) return el('p', { class: 'error', text: 'Calcolatore non trovato.' });

  const { v, result } = computeCalculator(calc);

  const fieldsGrid = el('div', { class: 'fields' },
    calc.fields.map((f) => renderField(f, v[f.key], (val) => setInput(calc.id, f.key, val))));

  const note = calc.noteMetodologiche
    ? el('details', { class: 'metodo' }, [
        el('summary', { text: 'Note metodologiche e assunzioni' }),
        el('ul', {}, calc.noteMetodologiche.map((n) => el('li', { text: n }))),
      ])
    : null;

  return el('article', { class: 'calc' }, [
    el('a', { class: 'back', href: '#/', text: '← tutti i calcolatori' }),
    el('header', { class: 'calc__head' }, [
      el('p', { class: 'calc__cat', text: calc.categoria }),
      el('h1', { text: calc.titolo }),
      el('p', { class: 'calc__sommario', text: calc.sommario }),
    ]),
    note,
    el('section', { class: 'panel' }, [
      el('div', { class: 'panel__head' }, [
        el('h2', { text: 'Dati' }),
        el('button', { class: 'btn-reset', type: 'button', onclick: () => resetInputs(calc.id), text: 'ripristina valori' }),
      ]),
      fieldsGrid,
    ]),
    el('section', { class: 'panel' }, [
      el('h2', { text: 'Confronto' }),
      renderCompareTable(result),
      result.breakEven ? renderBreakEven(result.breakEven) : null,
      renderDelta(result.delta),
    ]),
    renderSources(calc.fonti || []),
    renderDisclaimer(),
  ]);
}
