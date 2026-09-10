import { campiComuni, defaultComuni, latoPersona, latoSrl } from './_benefit.js';
import { rate } from '../rates.js';

export default {
  id: 'buoni-pasto',
  categoria: 'Benefit vs stipendio',
  titolo: 'Buoni pasto vs aumento di stipendio',
  sommario: 'Buoni pasto esenti entro il limite giornaliero (4,00 € cartacei / 10,00 € elettronici dal 2026), deducibili per la SRL senza i limiti sulle spese di vitto, contro un aumento di stipendio di pari costo aziendale.',

  noteMetodologiche: [
    'Confronto a parità di costo per la SRL: tara l’aumento di stipendio lordo finché i costi netti aziendali coincidono.',
    'Il buono pasto non concorre al reddito entro il limite giornaliero: 4,00 € per i buoni cartacei, 10,00 € per gli elettronici dal 1/1/2026 (L. 199/2025). L’eccedenza concorre a IRPEF e contributi.',
    'Per la SRL il costo del servizio sostitutivo di mensa è deducibile per intero, senza i limiti dell’art. 109 TUIR sulle spese di vitto e alloggio.',
    'I buoni pasto non spettano automaticamente all’amministratore: vanno previsti e devono rispettare i requisiti di legge (collegamento alla giornata di lavoro, non cedibilità, non cumulabilità oltre 8 unità).',
  ],

  fields: [
    { key: 'giorniLavorati', label: 'Giorni lavorati nell’anno', unit: 'num' },
    { key: 'tipoBuono', label: 'Tipo di buono', type: 'select',
      options: [
        { value: rate('buoniPastoCartacei'), label: 'Cartaceo — esente fino a 4,00 €/giorno' },
        { value: rate('buoniPastoElettronici'), label: 'Elettronico — esente fino a 10,00 €/giorno' },
      ] },
    { key: 'valoreBuonoGiorno', label: 'Valore facciale del buono al giorno', unit: 'euro' },
    { key: 'aumentoStipendioLordo', label: 'Aumento di stipendio lordo alternativo', unit: 'euro',
      hint: 'Taralo finché il costo netto per la SRL pareggia quello della colonna buoni.' },
    { key: 'isAmministratore', label: 'Il beneficiario è amministratore (co.co.co.), non dipendente', type: 'checkbox' },
    ...campiComuni(),
  ],

  defaults: {
    giorniLavorati: 220,
    tipoBuono: rate('buoniPastoElettronici'),
    valoreBuonoGiorno: 10.00,
    aumentoStipendioLordo: 2200,
    isAmministratore: false,
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

  fonti: ['buoniPastoCartacei', 'buoniPastoElettronici', 'irpefScaglioni', 'addizionaliIrpef',
    'contribDipendenteQuota', 'contribDatoreQuota', 'ires'],

  compute(v, { scaglioni }) {
    const limiteEsente = v.tipoBuono;
    const valoreAnnuo = v.valoreBuonoGiorno * v.giorniLavorati;
    const quotaEsenteAnnua = Math.min(v.valoreBuonoGiorno, limiteEsente) * v.giorniLavorati;
    const quotaImponibile = Math.max(0, valoreAnnuo - quotaEsenteAnnua);

    // --- Via buoni ---
    const personaBuoni = latoPersona({ valoreRicevuto: valoreAnnuo, baseImponibile: quotaImponibile, v, scaglioni });
    const contributiAziendaBuoni = quotaImponibile * v.aliquotaContrAzienda;
    const srlBuoni = latoSrl({
      costoBase: valoreAnnuo, contributiAzienda: contributiAziendaBuoni,
      quotaDeducibile: valoreAnnuo + contributiAziendaBuoni, aliquotaIres: v.aliquotaIres,
    });

    // --- Via stipendio ---
    const personaStip = latoPersona({ valoreRicevuto: v.aumentoStipendioLordo, baseImponibile: v.aumentoStipendioLordo, v, scaglioni });
    const contributiAziendaStip = v.aumentoStipendioLordo * v.aliquotaContrAzienda;
    const srlStip = latoSrl({
      costoBase: v.aumentoStipendioLordo, contributiAzienda: contributiAziendaStip,
      quotaDeducibile: v.aumentoStipendioLordo + contributiAziendaStip, aliquotaIres: v.aliquotaIres,
    });

    const vantaggioPersona = personaBuoni.netto - personaStip.netto;
    const differenzaCostoSrl = srlStip.costoNetto - srlBuoni.costoNetto;
    const deltaNetto = vantaggioPersona + differenzaCostoSrl;

    return {
      colonne: ['Buoni pasto', 'Aumento di stipendio'],
      righe: [
        { section: true, label: 'Lato dipendente / amministratore' },
        { label: 'Valore annuo buoni / aumento lordo', a: valoreAnnuo, b: v.aumentoStipendioLordo, kind: 'euro' },
        { label: 'di cui quota esente', a: quotaEsenteAnnua, b: 0, kind: 'euro' },
        { label: 'Base imponibile (quota eccedente / aumento lordo)', a: quotaImponibile, b: v.aumentoStipendioLordo, kind: 'euro' },
        { label: 'Contributi a carico della persona', a: personaBuoni.contributi, b: personaStip.contributi, kind: 'euro' },
        { label: 'IRPEF + addizionali', a: personaBuoni.irpef + personaBuoni.addizionali, b: personaStip.irpef + personaStip.addizionali, kind: 'euro' },
        { label: 'Netto effettivo per la persona', a: personaBuoni.netto, b: personaStip.netto, kind: 'euro', strong: true },
        { section: true, label: 'Lato SRL' },
        { label: 'Costo lordo per la SRL', a: srlBuoni.costoLordo, b: srlStip.costoLordo, kind: 'euro' },
        { label: 'Contributi a carico della SRL', a: srlBuoni.contributiAzienda, b: srlStip.contributiAzienda, kind: 'euro' },
        { label: 'Risparmio fiscale da deducibilità (IRES)', a: srlBuoni.risparmioIres, b: srlStip.risparmioIres, kind: 'euro' },
        { label: 'Costo netto per la SRL', a: srlBuoni.costoNetto, b: srlStip.costoNetto, kind: 'euro', strong: true },
      ],
      delta: {
        label: 'Vantaggio netto complessivo (buoni − stipendio), a parità di costo per la SRL',
        value: deltaNetto,
        favorevole: deltaNetto >= 0 ? 'Conviene il buono pasto' : 'Conviene l’aumento di stipendio',
        note: `Quota annua esente ${fmt(quotaEsenteAnnua)}, quota imponibile ${fmt(quotaImponibile)}.`,
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
