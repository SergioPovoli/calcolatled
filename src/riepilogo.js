import { el, renderDisclaimer } from './render.js';
import { CALCULATORS } from './registry.js';
import { isTouched } from './store.js';
import { computeCalculator } from './calc-view.js';
import { fmtEuro } from './format.js';

// Ricalcola dal vivo tutti i calcolatori compilati dall'utente e aggrega il risparmio.
export function aggregateLive() {
  const dettaglio = [];
  let permanente = 0;
  let differimento = 0;
  for (const calc of CALCULATORS) {
    if (!isTouched(calc.id)) continue;
    const { result } = computeCalculator(calc);
    if (typeof result.risparmioSrl !== 'number') continue;
    const voce = {
      id: calc.id, titolo: calc.titolo, categoria: calc.categoria,
      valore: result.risparmioSrl, tipo: result.risparmioTipo || 'permanente',
      delta: result.delta,
    };
    dettaglio.push(voce);
    if (voce.tipo === 'differimento') differimento += voce.valore;
    else permanente += voce.valore;
  }
  return { permanente, differimento, dettaglio };
}

export function renderRiepilogo() {
  const agg = aggregateLive();

  if (agg.dettaglio.length === 0) {
    return el('div', { class: 'riepilogo' }, [
      el('a', { class: 'back', href: '#/', text: '← tutti i calcolatori' }),
      el('h1', { text: 'Riepilogo aggregato' }),
      el('p', { class: 'empty', text: 'Nessun calcolatore ancora compilato. Apri un calcolatore e modifica almeno un valore: comparirà qui il contributo al risparmio complessivo.' }),
      renderDisclaimer(),
    ]);
  }

  const righe = agg.dettaglio.map((d) =>
    el('tr', {}, [
      el('th', { class: 'ct__voce' }, el('a', { href: '#/calc/' + d.id, text: d.titolo })),
      el('td', { class: 'ct__num', text: d.tipo === 'differimento' ? 'differimento' : 'permanente' }),
      el('td', { class: 'ct__num' + (d.valore > 0 ? ' is-pos' : ''), text: fmtEuro(d.valore, true) }),
    ]));

  const totali = [
    el('tr', { class: 'ct__row--strong' }, [
      el('th', { class: 'ct__voce', text: 'Risparmio permanente stimato / anno' }),
      el('td', { class: 'ct__num', text: '' }),
      el('td', { class: 'ct__num is-pos', text: fmtEuro(agg.permanente, true) }),
    ]),
  ];
  if (agg.differimento) {
    totali.push(el('tr', { class: 'ct__row--strong' }, [
      el('th', { class: 'ct__voce', text: 'Beneficio da differimento d’imposta (TFM, a fine mandato)' }),
      el('td', { class: 'ct__num', text: '' }),
      el('td', { class: 'ct__num is-pos', text: fmtEuro(agg.differimento, true) }),
    ]));
  }

  return el('div', { class: 'riepilogo' }, [
    el('a', { class: 'back', href: '#/', text: '← tutti i calcolatori' }),
    el('h1', { text: 'Riepilogo aggregato' }),
    el('p', { class: 'riepilogo__lede', text:
      'Somma indicativa dei benefici stimati nei calcolatori che hai compilato. Non è un consolidato: le ipotesi dei singoli calcolatori possono sovrapporsi o essere incompatibili fra loro (stesso importo usato in più leve, stesso plafond contributivo). Il beneficio del TFM è un differimento d’imposta, non un risparmio permanente, ed è tenuto separato.' }),
    el('div', { class: 'ledger' }, [
      el('table', { class: 'ct' }, [
        el('thead', {}, el('tr', {}, [
          el('th', { class: 'ct__voce', text: 'Calcolatore' }),
          el('th', { class: 'ct__num', text: 'Tipo' }),
          el('th', { class: 'ct__num', text: 'Risparmio stimato' }),
        ])),
        el('tbody', {}, [...righe, ...totali]),
      ]),
    ]),
    renderDisclaimer(),
  ]);
}
