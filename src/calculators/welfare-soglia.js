import { campiComuni, defaultComuni, latoPersona, latoSrl } from './_benefit.js';
import { rate } from '../rates.js';

export default {
  id: 'welfare-soglia',
  categoria: 'Benefit vs stipendio',
  titolo: 'Welfare entro soglia fringe benefit (1.000 / 2.000 € con figli) vs aumento di stipendio',
  sommario: 'Rimborso di utenze domestiche, affitto o interessi sul mutuo prima casa (o beni e servizi) entro la soglia di esenzione 2026 — esente e deducibile — contro lo stesso importo come aumento di stipendio lordo.',

  perche: 'Scelto come terzo calcolatore benefit perché è la leva 2026 con il miglior rapporto beneficio/complessità: la soglia rafforzata è legislata fino al 2027 (non è una misura incerta), si applica anche all’amministratore, non richiede tabelle esterne e produce un delta netto ampio e immediato (0% di imposte e contributi entro soglia contro IRPEF marginale + contributi sull’equivalente lordo).',

  noteMetodologiche: [
    'Confronto a parità di costo per la SRL: tara l’aumento di stipendio lordo finché i costi netti aziendali coincidono.',
    'Regime rafforzato 2025–2026–2027 (L. 207/2024 art. 1 co. 390-391): soglia di esenzione a 1.000 € in generale, 2.000 € per i dipendenti con figli fiscalmente a carico. Rientrano beni e servizi, buoni acquisto e il rimborso o pagamento di utenze domestiche, affitto o interessi sul mutuo della prima casa.',
    'Regola della franchigia azzerata: se il totale dei fringe benefit supera la soglia, concorre al reddito l’intero importo, non solo l’eccedenza.',
    'Si assume il welfare erogato in forza di regolamento aziendale o accordo, quindi costo del lavoro integralmente deducibile per la SRL — diverso dal welfare volontario ex art. 100 TUIR, deducibile entro il 5‰ delle spese per prestazioni di lavoro.',
    'Vale anche per l’amministratore (reddito assimilato a lavoro dipendente).',
  ],

  fields: [
    { key: 'importoWelfare', label: 'Importo welfare erogato nell’anno', unit: 'euro',
      hint: 'Rimborso utenze / affitto / interessi mutuo prima casa, buoni acquisto, beni e servizi.' },
    { key: 'sogliaEsente', label: 'Soglia di esenzione applicabile', type: 'select',
      options: [
        { value: rate('fringeSoglia2026'), label: 'Generale — 1.000 €' },
        { value: rate('fringeSoglia2026Figli'), label: 'Con figli fiscalmente a carico — 2.000 €' },
      ] },
    { key: 'aumentoStipendioLordo', label: 'Aumento di stipendio lordo alternativo', unit: 'euro',
      hint: 'Taralo finché il costo netto per la SRL pareggia quello della colonna welfare.' },
    { key: 'isAmministratore', label: 'Il beneficiario è amministratore (co.co.co.), non dipendente', type: 'checkbox' },
    ...campiComuni(),
  ],

  defaults: {
    importoWelfare: 2000,
    sogliaEsente: rate('fringeSoglia2026Figli'),
    aumentoStipendioLordo: 2000,
    isAmministratore: false,
    ...defaultComuni(),
  },

  fonti: ['fringeSoglia2026', 'fringeSoglia2026Figli', 'fringeSogliaOrdinaria', 'irpefScaglioni',
    'addizionaliIrpef', 'contribDipendenteQuota', 'contribDatoreQuota', 'ires'],

  compute(v, { scaglioni }) {
    const soglia = v.sogliaEsente;
    const quotaImponibile = v.importoWelfare <= soglia ? 0 : v.importoWelfare; // franchigia azzerata

    // --- Via welfare ---
    const personaWelfare = latoPersona({ valoreRicevuto: v.importoWelfare, baseImponibile: quotaImponibile, v, scaglioni });
    const contributiAziendaWelfare = quotaImponibile * v.aliquotaContrAzienda;
    const srlWelfare = latoSrl({
      costoBase: v.importoWelfare, contributiAzienda: contributiAziendaWelfare,
      quotaDeducibile: v.importoWelfare + contributiAziendaWelfare, aliquotaIres: v.aliquotaIres,
    });

    // --- Via stipendio ---
    const personaStip = latoPersona({ valoreRicevuto: v.aumentoStipendioLordo, baseImponibile: v.aumentoStipendioLordo, v, scaglioni });
    const contributiAziendaStip = v.aumentoStipendioLordo * v.aliquotaContrAzienda;
    const srlStip = latoSrl({
      costoBase: v.aumentoStipendioLordo, contributiAzienda: contributiAziendaStip,
      quotaDeducibile: v.aumentoStipendioLordo + contributiAziendaStip, aliquotaIres: v.aliquotaIres,
    });

    const vantaggioPersona = personaWelfare.netto - personaStip.netto;
    const differenzaCostoSrl = srlStip.costoNetto - srlWelfare.costoNetto;
    const deltaNetto = vantaggioPersona + differenzaCostoSrl;

    return {
      colonne: ['Welfare entro soglia', 'Aumento di stipendio'],
      righe: [
        { section: true, label: 'Lato dipendente / amministratore' },
        { label: 'Importo erogato / aumento lordo', a: v.importoWelfare, b: v.aumentoStipendioLordo, kind: 'euro' },
        { label: 'Soglia di esenzione applicabile', a: soglia, b: null, kind: 'euro' },
        { label: 'Base imponibile', a: quotaImponibile, b: v.aumentoStipendioLordo, kind: 'euro',
          note: v.importoWelfare > soglia ? 'oltre soglia: franchigia azzerata' : 'entro soglia: esente' },
        { label: 'Contributi a carico della persona', a: personaWelfare.contributi, b: personaStip.contributi, kind: 'euro' },
        { label: 'IRPEF + addizionali', a: personaWelfare.irpef + personaWelfare.addizionali, b: personaStip.irpef + personaStip.addizionali, kind: 'euro' },
        { label: 'Netto effettivo per la persona', a: personaWelfare.netto, b: personaStip.netto, kind: 'euro', strong: true },
        { section: true, label: 'Lato SRL' },
        { label: 'Costo lordo per la SRL', a: srlWelfare.costoLordo, b: srlStip.costoLordo, kind: 'euro' },
        { label: 'Contributi a carico della SRL', a: srlWelfare.contributiAzienda, b: srlStip.contributiAzienda, kind: 'euro' },
        { label: 'Risparmio fiscale da deducibilità (IRES)', a: srlWelfare.risparmioIres, b: srlStip.risparmioIres, kind: 'euro' },
        { label: 'Costo netto per la SRL', a: srlWelfare.costoNetto, b: srlStip.costoNetto, kind: 'euro', strong: true },
      ],
      delta: {
        label: 'Vantaggio netto complessivo (welfare − stipendio), a parità di costo per la SRL',
        value: deltaNetto,
        favorevole: deltaNetto >= 0 ? 'Conviene il welfare entro soglia' : 'Conviene l’aumento di stipendio',
        note: v.importoWelfare > soglia
          ? `Importo oltre la soglia di ${fmt(soglia)}: l’intero importo concorre al reddito (franchigia azzerata).`
          : `Importo entro la soglia di ${fmt(soglia)}: nessuna imposta né contributo per la persona.`,
      },
      risparmioSrl: Math.max(0, deltaNetto),
      risparmioTipo: 'permanente',
    };
  },
};

function fmt(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
