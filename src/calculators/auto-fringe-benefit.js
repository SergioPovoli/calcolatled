import { campiComuni, defaultComuni, latoPersona, latoSrl } from './_benefit.js';
import { rate } from '../rates.js';

export default {
  id: 'auto-fringe-benefit',
  categoria: 'Benefit vs stipendio',
  titolo: 'Auto aziendale in fringe benefit vs aumento di stipendio',
  sommario: 'Auto in uso promiscuo assegnata nel 2026: base imponibile sulle tabelle ACI (% per alimentazione × costo km × 15.000), deducibilità 70% per la SRL (art. 164 lett. b-bis), contro un aumento di stipendio di pari costo aziendale.',

  noteMetodologiche: [
    'Confronto a parità di costo per la SRL: taratura fine l’aumento di stipendio lordo finché il "costo netto per la SRL" delle due colonne coincide, poi si legge la differenza di netto per la persona.',
    'Base imponibile fringe benefit = % ACI (per tipo di alimentazione, assegnazione 2026) × costo chilometrico ACI del modello × 15.000 km, al netto di quanto trattenuto o fatturato al dipendente.',
    'Deducibilità SRL: 70% del costo auto se assegnata a un dipendente per la maggior parte del periodo (art. 164 co. 1 lett. b-bis). Per l’amministratore co.co.co.: deducibile l’importo pari al fringe benefit + 20% dell’eccedenza (art. 164 co. 1 lett. b).',
    'IVA: 40% detraibile in via ordinaria; 100% con addebito di un corrispettivo con IVA almeno pari al valore normale.',
    'Il "valore d’uso privato" è quanto varrebbe per te disporre dell’auto pagandola di tasca tua: è il metro del beneficio effettivamente ricevuto, distinto dalla base imponibile ACI.',
    'IRAP non considerata sul costo auto (impatto marginale e variabile).',
  ],

  fields: [
    { key: 'percAci', label: '% ACI per tipo di alimentazione', type: 'select',
      options: [
        { value: rate('autoPercBEV'), label: 'Elettrico puro (BEV) — 10%' },
        { value: rate('autoPercPHEV'), label: 'Ibrido plug-in (PHEV) — 20%' },
        { value: rate('autoPercAltri'), label: 'Benzina / diesel / GPL / metano / full-mild hybrid — 50%' },
      ] },
    { key: 'costoKmAci', label: 'Costo chilometrico ACI del modello', unit: 'euro',
      hint: 'Cerca il tuo modello nelle tabelle nazionali ACI 2026 su aci.it (voce "costo chilometrico" per 15.000 km/anno).' },
    { key: 'kmConvenzionali', label: 'Percorrenza convenzionale annua', unit: 'num', locked: true, ref: 'autoKmConvenzionali' },
    { key: 'riaddebitoDipendente', label: 'Quota fringe benefit trattenuta / fatturata al dipendente', unit: 'euro',
      hint: 'Riduce la base imponibile. Se fatturata con IVA pari al valore normale abilita la detrazione IVA al 100%.' },
    { key: 'costoAnnuoAutoSrl', label: 'Costo annuo dell’auto per la SRL', unit: 'euro',
      hint: 'Noleggio o ammortamento + assicurazione + bollo + manutenzione + carburante.' },
    { key: 'valoreUsoPrivato', label: 'Valore d’uso privato dell’auto per la persona', unit: 'euro',
      hint: 'Quanto spenderesti per avere la stessa auto a tue spese. Di norma vicino al costo annuo per la SRL.' },
    { key: 'aumentoStipendioLordo', label: 'Aumento di stipendio lordo alternativo', unit: 'euro',
      hint: 'Taralo finché il costo netto per la SRL pareggia quello della colonna auto.' },
    { key: 'isAmministratore', label: 'Il beneficiario è amministratore (co.co.co.), non dipendente', type: 'checkbox' },
    { key: 'detraibilitaIva', label: 'Detraibilità IVA sui costi auto', type: 'select',
      options: [
        { value: 0.40, label: '40% — uso promiscuo standard' },
        { value: 1.00, label: '100% — con riaddebito di corrispettivo con IVA' },
      ] },
    { key: 'ivaAuto', label: 'Aliquota IVA sui costi auto', unit: 'perc' },
    { key: 'quotaImponibileIva', label: 'Quota del costo annuo auto che sconta IVA', unit: 'perc',
      hint: 'Carburante, canoni e manutenzione scontano IVA; bollo e assicurazione no. Tipicamente 50–70%.' },
    ...campiComuni(),
  ],

  defaults: {
    percAci: rate('autoPercAltri'),
    costoKmAci: 0.55,
    kmConvenzionali: rate('autoKmConvenzionali'),
    riaddebitoDipendente: 0,
    costoAnnuoAutoSrl: 8000,
    valoreUsoPrivato: 8000,
    aumentoStipendioLordo: 8000,
    isAmministratore: false,
    detraibilitaIva: rate('ivaAutoPromiscuo'),
    ivaAuto: 0.22,
    quotaImponibileIva: 0.6,
    ...defaultComuni(),
  },

  profileDefaults: {
    soloAmministratore: {
      isAmministratore: true,
      aliquotaContrPersona: rate('gsQuotaCollaboratore') * rate('gestioneSeparata'),
      aliquotaContrAzienda: (1 - rate('gsQuotaCollaboratore')) * rate('gestioneSeparata'),
    },
    amministratoreAltraCopertura: {
      isAmministratore: true,
      aliquotaContrPersona: rate('gsQuotaCollaboratore') * rate('gestioneSeparataConCopertura'),
      aliquotaContrAzienda: (1 - rate('gsQuotaCollaboratore')) * rate('gestioneSeparataConCopertura'),
    },
  },

  fonti: ['autoPercBEV', 'autoPercPHEV', 'autoPercAltri', 'autoKmConvenzionali', 'autoDedDipendente',
    'autoDedAmministratore', 'ivaAutoPromiscuo', 'irpefScaglioni', 'addizionaliIrpef',
    'contribDipendenteQuota', 'contribDatoreQuota', 'ires'],

  compute(v, { scaglioni }) {
    const fringeLordo = v.percAci * v.costoKmAci * v.kmConvenzionali;
    const fringeImponibile = Math.max(0, fringeLordo - v.riaddebitoDipendente);

    // --- Via auto ---
    const personaAuto = latoPersona({ valoreRicevuto: v.valoreUsoPrivato, baseImponibile: fringeImponibile, v, scaglioni });
    const quotaDedAuto = v.isAmministratore
      ? fringeLordo + Math.max(0, v.costoAnnuoAutoSrl - fringeLordo) * rate('autoDedAmministratore')
      : v.costoAnnuoAutoSrl * rate('autoDedDipendente');
    const recuperoIva = v.costoAnnuoAutoSrl * v.quotaImponibileIva * (v.ivaAuto / (1 + v.ivaAuto)) * v.detraibilitaIva;
    const srlAuto = latoSrl({ costoBase: v.costoAnnuoAutoSrl, quotaDeducibile: quotaDedAuto, aliquotaIres: v.aliquotaIres, recuperoIva });

    // --- Via stipendio ---
    const personaStip = latoPersona({ valoreRicevuto: v.aumentoStipendioLordo, baseImponibile: v.aumentoStipendioLordo, v, scaglioni });
    const contributiAzienda = v.aumentoStipendioLordo * v.aliquotaContrAzienda;
    const srlStip = latoSrl({
      costoBase: v.aumentoStipendioLordo, contributiAzienda,
      quotaDeducibile: v.aumentoStipendioLordo + contributiAzienda, aliquotaIres: v.aliquotaIres,
    });

    const vantaggioPersona = personaAuto.netto - personaStip.netto;
    const differenzaCostoSrl = srlStip.costoNetto - srlAuto.costoNetto;
    const deltaNetto = vantaggioPersona + differenzaCostoSrl;

    return {
      colonne: ['Auto in fringe benefit', 'Aumento di stipendio'],
      righe: [
        { section: true, label: 'Lato dipendente / amministratore' },
        { label: 'Base imponibile (fringe ACI / aumento lordo)', a: fringeImponibile, b: v.aumentoStipendioLordo, kind: 'euro' },
        { label: 'Contributi a carico della persona', a: personaAuto.contributi, b: personaStip.contributi, kind: 'euro' },
        { label: 'IRPEF + addizionali', a: personaAuto.irpef + personaAuto.addizionali, b: personaStip.irpef + personaStip.addizionali, kind: 'euro' },
        { label: 'Valore ricevuto dalla persona', a: v.valoreUsoPrivato, b: v.aumentoStipendioLordo, kind: 'euro' },
        { label: 'Netto effettivo per la persona', a: personaAuto.netto, b: personaStip.netto, kind: 'euro', strong: true },
        { section: true, label: 'Lato SRL' },
        { label: 'Costo lordo per la SRL', a: srlAuto.costoLordo, b: srlStip.costoLordo, kind: 'euro' },
        { label: 'Quota deducibile', a: quotaDedAuto, b: v.aumentoStipendioLordo + contributiAzienda, kind: 'euro' },
        { label: 'Risparmio fiscale da deducibilità (IRES)', a: srlAuto.risparmioIres, b: srlStip.risparmioIres, kind: 'euro' },
        { label: 'Recupero IVA', a: srlAuto.recuperoIva, b: 0, kind: 'euro' },
        { label: 'Costo netto per la SRL', a: srlAuto.costoNetto, b: srlStip.costoNetto, kind: 'euro', strong: true },
      ],
      delta: {
        label: 'Vantaggio netto complessivo (auto − stipendio), a parità di costo per la SRL',
        value: deltaNetto,
        favorevole: deltaNetto >= 0 ? 'Conviene l’auto in fringe benefit' : 'Conviene l’aumento di stipendio',
        note: `Fringe benefit ACI lordo ${fmt(fringeLordo)} · quota auto deducibile per la SRL ${fmt(quotaDedAuto)} ` +
          `(${((quotaDedAuto / (v.costoAnnuoAutoSrl || 1)) * 100).toFixed(0)}% del costo).`,
      },
      vantaggioPersona,
      risparmioSrl: Math.max(0, deltaNetto),
      risparmioTipo: 'permanente',
    };
  },
};

function fmt(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
