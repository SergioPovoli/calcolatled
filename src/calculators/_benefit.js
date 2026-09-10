// Helper condivisi dai calcolatori "Benefit vs stipendio".
// Confronto a parità di costo per la SRL, con dettaglio lato persona e lato SRL.

import { caricoPersonale } from '../tax.js';
import { rate } from '../rates.js';

// Campi personali/aziendali comuni a tutti i calcolatori benefit.
export function campiComuni() {
  return [
    { key: 'redditoBase', label: 'Reddito imponibile IRPEF già presente (dipendente/amministratore)', unit: 'euro',
      hint: 'Serve a collocare il benefit sullo scaglione marginale corretto.' },
    { key: 'detrazioneAggiuntiva', label: 'Detrazioni IRPEF aggiuntive attribuibili all’importo', unit: 'euro',
      hint: 'Di norma 0: le detrazioni da lavoro sono già assorbite dal reddito base. Inserisci un valore solo se sai che l’importo genera detrazione ulteriore.' },
    { key: 'addizionali', label: 'Addizionali IRPEF regionale + comunale', unit: 'perc',
      hint: 'Cerca le aliquote del tuo Comune e della tua Regione.' },
    { key: 'aliquotaContrPersona', label: 'Aliquota contributi a carico della persona', unit: 'perc',
      hint: 'Dipendente: ~9,19%. Amministratore in Gestione Separata: 1/3 di 33,72% ≈ 11,24%.' },
    { key: 'aliquotaContrAzienda', label: 'Aliquota contributi a carico della SRL', unit: 'perc',
      hint: 'Dipendente: ~30% (costo pieno). Amministratore in Gestione Separata: 2/3 di 33,72% ≈ 22,48%.' },
    { key: 'aliquotaIres', label: 'Aliquota IRES', unit: 'perc' },
  ];
}

export function defaultComuni(extra = {}) {
  return {
    redditoBase: 35000,
    detrazioneAggiuntiva: 0,
    addizionali: rate('addizionaliIrpef'),
    aliquotaContrPersona: rate('contribDipendenteQuota'),
    aliquotaContrAzienda: rate('contribDatoreQuota'),
    aliquotaIres: rate('ires'),
    ...extra,
  };
}

// Lato persona: imposte e contributi sulla base imponibile, più il netto effettivo
// tenendo conto del valore realmente ricevuto (può differire dalla base imponibile).
export function latoPersona({ valoreRicevuto, baseImponibile, v, scaglioni }) {
  const c = caricoPersonale(baseImponibile, {
    redditoBase: v.redditoBase,
    scaglioni,
    detrazioneAggiuntiva: v.detrazioneAggiuntiva,
    addizionali: v.addizionali,
    aliquotaContributi: v.aliquotaContrPersona,
  });
  return {
    baseImponibile,
    contributi: c.contributi,
    irpef: c.irpef,
    addizionali: c.addizionali,
    carico: c.totale,
    netto: valoreRicevuto - c.totale,
  };
}

// Lato SRL: costo lordo, contributi datoriali, risparmio da deducibilità (IRES),
// eventuale recupero IVA, costo netto finale.
export function latoSrl({ costoBase, contributiAzienda = 0, quotaDeducibile, aliquotaIres, recuperoIva = 0 }) {
  const costoLordo = costoBase + contributiAzienda;
  const risparmioIres = quotaDeducibile * aliquotaIres;
  return {
    costoLordo,
    contributiAzienda,
    risparmioIres,
    recuperoIva,
    costoNetto: costoLordo - risparmioIres - recuperoIva,
  };
}

// Assembla le righe standard del confronto a due colonne (Benefit | Stipendio).
export function righeConfronto({ colBenefit, colStipendio }) {
  const row = (label, sel, kind = 'euro', extra = {}) => ({
    label, a: colBenefit[sel], b: colStipendio[sel], kind, ...extra,
  });
  return [
    { section: true, label: 'Lato dipendente / amministratore' },
    row('Base imponibile IRPEF/contributi', 'baseImponibile'),
    row('Contributi a carico della persona', 'contributiPersona'),
    row('IRPEF + addizionali', 'irpefPersona'),
    row('Valore netto in tasca alla persona', 'nettoPersona', 'euro', { strong: true }),
    { section: true, label: 'Lato SRL' },
    row('Costo lordo per la SRL', 'costoLordoSrl'),
    row('Risparmio fiscale da deducibilità (IRES)', 'risparmioSrl'),
    row('Recupero IVA', 'recuperoIva'),
    row('Costo netto per la SRL', 'costoNettoSrl', 'euro', { strong: true }),
  ];
}
