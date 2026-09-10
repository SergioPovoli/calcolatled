// Registro dei calcolatori. Per aggiungerne uno: crea un modulo in calculators/
// e importalo qui. Tutto il resto (home, menu, routing, riepilogo aggregato) è automatico.

import compensoVsDividendo from './calculators/compenso-vs-dividendo.js';
import tfm from './calculators/tfm.js';
import autoFringeBenefit from './calculators/auto-fringe-benefit.js';
import buoniPasto from './calculators/buoni-pasto.js';
import welfareSoglia from './calculators/welfare-soglia.js';

export const CALCULATORS = [
  compensoVsDividendo,
  tfm,
  autoFringeBenefit,
  buoniPasto,
  welfareSoglia,
];

export const CATEGORIE = [
  {
    id: 'Compensi e utili',
    descrizione: 'Come strutturare compensi e utili della società: confronto SRL vs socio/amministratore.',
  },
  {
    id: 'Benefit vs stipendio',
    descrizione: 'A parità di costo per la SRL: dare valore alla persona come benefit o come retribuzione.',
  },
];

export function getCalculator(id) {
  return CALCULATORS.find((c) => c.id === id);
}

export function byCategoria() {
  return CATEGORIE.map((cat) => ({
    ...cat,
    calcolatori: CALCULATORS.filter((c) => c.categoria === cat.id),
  }));
}
