import { el, renderDisclaimer } from './render.js';
import { RATES } from './rates.js';
import { fmtValue } from './format.js';

function valoreLeggibile(r) {
  if (r.unit === 'scaglioni') {
    return r.value.map(([soglia, aliq]) =>
      (soglia === Infinity ? 'oltre' : 'fino a ' + fmtValue(soglia, 'euro')) + ' → ' + fmtValue(aliq, 'perc')).join('  ·  ');
  }
  if (r.unit === 'num' && r.value === 1) return 'regola / requisito';
  return fmtValue(r.value, r.unit);
}

export function renderFonti() {
  const righe = Object.entries(RATES).map(([key, r]) =>
    el('tr', {}, [
      el('th', { class: 'fonti__voce' }, [
        el('span', { class: 'fonti__label', text: r.label }),
        r.nota ? el('span', { class: 'fonti__nota', text: r.nota }) : null,
      ]),
      el('td', { class: 'fonti__valore', text: valoreLeggibile(r) }),
      el('td', { class: 'fonti__fonte' }, el('a', { href: r.url, target: '_blank', rel: 'noopener', text: r.fonte })),
    ]));

  return el('div', { class: 'fonti' }, [
    el('a', { class: 'back', href: '#/', text: '← tutti i calcolatori' }),
    el('h1', { text: 'Fonti e valori 2026' }),
    el('p', { class: 'fonti__lede', text:
      'Ogni aliquota, soglia o regola usata dai calcolatori, con la relativa fonte. Questa tabella è generata dallo stesso oggetto che alimenta i calcoli: non può divergere da ciò che il codice usa davvero. Verifica effettuata a settembre 2026; fonti in prevalenza secondarie (studi e portali) datate 2026. Prima di decidere, riscontra ogni valore sui testi normativi (normattiva.it, Gazzetta Ufficiale) e sulla prassi dell’Agenzia delle Entrate. La normativa su questi temi cambia quasi a ogni legge di bilancio.' }),
    el('div', { class: 'ledger' }, [
      el('table', { class: 'ct fonti__table' }, [
        el('thead', {}, el('tr', {}, [
          el('th', { class: 'fonti__voce', text: 'Voce' }),
          el('th', { class: 'fonti__valore', text: 'Valore 2026' }),
          el('th', { class: 'fonti__fonte', text: 'Fonte' }),
        ])),
        el('tbody', {}, righe),
      ]),
    ]),
    renderDisclaimer(),
  ]);
}
