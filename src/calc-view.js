import { el, renderField, renderCompareTable, renderDelta, renderBreakEven, renderSources, renderDisclaimer } from './render.js';
import { getCalculator } from './registry.js';
import { RATES } from './rates.js';
import { getInputs, setInput, resetInputs, setResult, getSetting } from './store.js';
import { fmtEuro } from './format.js';

const NOTE_PROFILO = {
  soloAmministratore:
    'Profilo attivo: solo amministratore in Gestione Separata, nessun’altra copertura previdenziale ' +
    'né altri redditi rilevanti. Aliquota GS 33,72% (≈11,24% persona / ≈22,48% società); il confronto ' +
    'è letto dal lato dell’incasso personale netto. Se hai altri redditi IRPEF, compila i relativi campi: ' +
    'gli scaglioni spostano l’aliquota marginale su compenso e benefit.',
  amministratoreAltraCopertura:
    'Profilo attivo: amministratore che ha anche un lavoro dipendente (o è pensionato). Aliquota ' +
    'Gestione Separata ridotta al 24% (≈8% persona / ≈16% società). I campi "altri redditi IRPEF" ' +
    'partono da un valore realistico da adeguare ai tuoi importi effettivi: per gli scaglioni IRPEF ' +
    'compenso e benefit si sommano al reddito già presente e scontano l’aliquota marginale che ne ' +
    'risulta. Attenzione ai limiti cumulativi su tutti i datori: plafond fringe benefit 1.000/2.000 €, ' +
    'massimale Gestione Separata, detrazioni da lavoro dipendente (una sola dotazione).',
};

// Default effettivi: i valori base del calcolatore, poi lo strato del profilo globale
// (solo per i campi che il profilo tocca), poi gli input salvati dall'utente — che vincono.
function defaultsFor(calc) {
  const profilo = getSetting('profilo');
  const strato = calc.profileDefaults && calc.profileDefaults[profilo];
  return strato ? { ...calc.defaults, ...strato } : calc.defaults;
}

export function computeCalculator(calc) {
  const v = getInputs(calc.id, defaultsFor(calc));
  const profilo = getSetting('profilo');
  const result = calc.compute(v, { scaglioni: RATES.irpefScaglioni.value, profilo });
  if (profilo !== 'standard' && result.delta && typeof result.vantaggioPersona === 'number') {
    result.delta.notaProfilo = `Come amministratore ti porti a casa ${fmtEuro(result.vantaggioPersona, true)} ` +
      'in più all’anno, a parità di costo per la società.';
  }
  setResult(calc.id, result);
  return { v, result };
}

export function renderCalcView(id) {
  const calc = getCalculator(id);
  if (!calc) return el('p', { class: 'error', text: 'Calcolatore non trovato.' });

  const { v, result } = computeCalculator(calc);

  const fieldsGrid = el('div', { class: 'fields' },
    calc.fields.map((f) => renderField(f, v[f.key], (val) => setInput(calc.id, f.key, val))));

  const notaProfilo = getSetting('profilo') !== 'standard' ? NOTE_PROFILO[getSetting('profilo')] : null;
  const noteVoci = [
    ...(notaProfilo ? [notaProfilo] : []),
    ...(calc.noteMetodologiche || []),
  ];
  const note = noteVoci.length
    ? el('details', { class: 'metodo' }, [
        el('summary', { text: 'Note metodologiche e assunzioni' }),
        el('ul', {}, noteVoci.map((n, i) => el('li', {
          class: notaProfilo && i === 0 ? 'metodo__profilo' : '',
          text: n,
        }))),
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
