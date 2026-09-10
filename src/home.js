import { el, renderDisclaimer } from './render.js';
import { byCategoria } from './registry.js';
import { fmtEuro } from './format.js';
import { aggregateLive } from './riepilogo.js';

export function renderHome() {
  const agg = aggregateLive();
  const hasData = agg.dettaglio.length > 0;

  const banner = el('a', { class: 'home-agg' + (hasData ? '' : ' home-agg--empty'), href: '#/riepilogo' }, [
    el('span', { class: 'home-agg__label', text: hasData ? 'Risparmio fiscale complessivo stimato in SRL' : 'Compila un calcolatore per vedere qui il risparmio aggregato' }),
    hasData ? el('span', { class: 'home-agg__value', text: fmtEuro(agg.permanente) + ' / anno' }) : null,
    hasData && agg.differimento ? el('span', { class: 'home-agg__defer', text: '+ ' + fmtEuro(agg.differimento) + ' di beneficio da differimento (TFM)' }) : null,
  ]);

  const categorie = byCategoria().map((cat) =>
    el('section', { class: 'cat' }, [
      el('h2', { class: 'cat__title', text: cat.id }),
      el('p', { class: 'cat__desc', text: cat.descrizione }),
      el('ul', { class: 'sommario' }, cat.calcolatori.map((c) =>
        el('li', { class: 'sommario__row' }, [
          el('a', { class: 'sommario__link', href: '#/calc/' + c.id }, [
            el('span', { class: 'sommario__titolo', text: c.titolo }),
            el('span', { class: 'sommario__blurb', text: c.sommario }),
          ]),
          el('span', { class: 'sommario__go', text: 'apri →' }),
        ]))),
    ]));

  return el('div', { class: 'home' }, [
    el('header', { class: 'home__head' }, [
      el('h1', { text: 'Calcoli di ottimizzazione fiscale per una SRL' }),
      el('p', { class: 'home__lede', text:
        'Strumenti per fare i conti, riga per riga, su come distribuire valore a sé e ai dipendenti e come strutturare compensi e utili della società. Tutti i valori sono modificabili; le aliquote 2026 sono documentate nella pagina Fonti.' }),
    ]),
    banner,
    ...categorie,
    renderDisclaimer(),
  ]);
}
