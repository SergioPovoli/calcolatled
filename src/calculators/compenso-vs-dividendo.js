import { irpefLorda, irpefMarginale, bisezione } from '../tax.js';
import { rate } from '../rates.js';

export default {
  id: 'compenso-vs-dividendo',
  categoria: 'Compensi e utili',
  titolo: 'Compenso amministratore vs utile distribuito',
  sommario: 'A parità di utile ante-imposte generato dalla SRL: la via "utile → IRES + IRAP → dividendo al 26%" contro la via "compenso amministratore deducibile → IRPEF progressiva + contributi". Mostra il punto di pareggio.',

  noteMetodologiche: [
    'Si confronta la distribuzione di un dato utile ante-imposte, interamente per una via o per l’altra.',
    'Via dividendo: l’utile sconta IRES e IRAP in capo alla SRL, poi il dividendo è tassato al 26% (ritenuta a titolo d’imposta, nessuna addizionale).',
    'Via compenso: il compenso è deducibile IRES e azzera l’IRES sull’importo erogato. L’IRAP resta dovuta (il compenso co.co.co. non è deducibile IRAP), salvo attivare l’opzione "amministratore con partita IVA".',
    'Il budget aziendale (utile ante-imposte, al netto dell’eventuale IRAP) si ripartisce fra compenso lordo e contributi Gestione Separata a carico della società (2/3). Dal compenso lordo si sottraggono la quota contributi dell’amministratore (1/3) e l’IRPEF progressiva incrementale.',
    'Il pareggio è l’aliquota media di carico personale sul compenso che eguaglia il netto ottenibile via dividendo: sotto quel valore conviene il compenso, sopra conviene il dividendo.',
  ],

  fields: [
    { key: 'utileAnteImposte', label: 'Utile ante-imposte da distribuire', unit: 'euro',
      hint: 'Utile della SRL prima di IRES/IRAP e prima del compenso amministratore.' },
    { key: 'redditoIrpefPregresso', label: 'Altri redditi IRPEF dell’amministratore', unit: 'euro',
      hint: 'Redditi già presenti (altri compensi, locazioni a tassazione ordinaria…). Determina lo scaglione marginale.' },
    { key: 'aliquotaIres', label: 'Aliquota IRES', unit: 'perc' },
    { key: 'aliquotaIrap', label: 'Aliquota IRAP', unit: 'perc',
      hint: 'Ordinaria 3,9%; può arrivare a ~4,82% con maggiorazione regionale.' },
    { key: 'aliquotaDividendo', label: 'Aliquota sul dividendo', unit: 'perc' },
    { key: 'aliquotaGs', label: 'Aliquota Gestione Separata INPS', unit: 'perc',
      hint: '33,72% amministratore senza altra copertura; 24% se pensionato o con altra copertura.' },
    { key: 'massimaleGs', label: 'Massimale contributivo Gestione Separata', unit: 'euro' },
    { key: 'quotaContrAmm', label: 'Quota contributi a carico dell’amministratore', unit: 'perc',
      locked: true, ref: 'gsQuotaCollaboratore' },
    { key: 'detrazioneAmm', label: 'Detrazioni IRPEF stimate sul compenso', unit: 'euro',
      hint: 'Detrazione da lavoro assimilato (art. 13 TUIR) attribuibile al compenso. Lascia 0 se già assorbita da altri redditi.' },
    { key: 'addizionali', label: 'Addizionali IRPEF regionale + comunale', unit: 'perc' },
    { key: 'compensoDeducibileIrap', label: 'Amministratore con partita IVA (compenso deducibile anche IRAP)',
      type: 'checkbox' },
  ],

  defaults: {
    utileAnteImposte: 60000,
    redditoIrpefPregresso: 0,
    aliquotaIres: rate('ires'),
    aliquotaIrap: rate('irap'),
    aliquotaDividendo: rate('dividendo'),
    aliquotaGs: rate('gestioneSeparata'),
    massimaleGs: rate('gsMassimale'),
    quotaContrAmm: rate('gsQuotaCollaboratore'),
    detrazioneAmm: 0,
    addizionali: rate('addizionaliIrpef'),
    compensoDeducibileIrap: false,
  },

  fonti: ['ires', 'irap', 'dividendo', 'irpefScaglioni', 'gestioneSeparata', 'gsMassimale',
    'gsQuotaCollaboratore', 'compensoAmmCassa', 'addizionaliIrpef', 'detrazioneLavoroDip'],

  compute(v, { scaglioni }) {
    const U = Math.max(0, v.utileAnteImposte);

    // --- Via dividendo ---
    const iresDiv = U * v.aliquotaIres;
    const irapDiv = U * v.aliquotaIrap;
    const utileNettoDiv = U - iresDiv - irapDiv;
    const impostaDiv = Math.max(0, utileNettoDiv) * v.aliquotaDividendo;
    const nettoSocioDiv = utileNettoDiv - impostaDiv;
    const caricoDiv = iresDiv + irapDiv + impostaDiv;

    // --- Via compenso ---
    // Compenso lordo tale che l'uscita di cassa complessiva della SRL
    // (compenso + contributi datoriali + IRES residua + IRAP) eguagli l'utile ante-imposte.
    // IRES: il compenso e i contributi datoriali sono deducibili. IRAP: solo se l'amministratore
    // fattura con partita IVA (compensoDeducibileIrap).
    const parti = (C) => {
      const contributiTot = Math.min(Math.max(0, C), v.massimaleGs) * v.aliquotaGs;
      const contributiAzienda = contributiTot * (1 - v.quotaContrAmm);
      const irap = v.compensoDeducibileIrap ? Math.max(0, U - C) * v.aliquotaIrap : U * v.aliquotaIrap;
      const ires = Math.max(0, U - C - contributiAzienda) * v.aliquotaIres;
      return { contributiTot, contributiAzienda, irap, ires, cassa: C + contributiAzienda + ires + irap };
    };
    const compensoLordo = Math.max(0, bisezione((C) => parti(C).cassa - U, 0, U));
    const p = parti(compensoLordo);
    const contributiTot = p.contributiTot;
    const contributiAzienda = p.contributiAzienda;
    const contributiAmm = contributiTot - contributiAzienda;
    const irapComp = p.irap;
    const iresComp = p.ires;

    const imponibileAmm = v.redditoIrpefPregresso + compensoLordo - contributiAmm;
    const irpefLorde = irpefLorda(imponibileAmm, scaglioni) - irpefLorda(v.redditoIrpefPregresso, scaglioni);
    const irpefNetta = Math.max(0, irpefLorde - v.detrazioneAmm);
    const addizAmm = Math.max(0, compensoLordo - contributiAmm) * v.addizionali;
    const irpefTotAmm = irpefNetta + addizAmm;
    const nettoSocioComp = compensoLordo - contributiAmm - irpefTotAmm;
    const caricoComp = irapComp + iresComp + contributiTot + irpefTotAmm;

    // --- Pareggio ---
    const aliquotaEffettiva = compensoLordo > 0 ? irpefTotAmm / compensoLordo : 0;
    const impostaPareggio = compensoLordo - contributiAmm - nettoSocioDiv;
    const aliquotaPareggio = compensoLordo > 0 ? impostaPareggio / compensoLordo : 0;
    const marginale = irpefMarginale(imponibileAmm, scaglioni);

    const deltaNetto = nettoSocioComp - nettoSocioDiv;

    return {
      colonne: ['Dividendo', 'Compenso amministratore'],
      righe: [
        { label: 'Utile ante-imposte', a: U, b: U, kind: 'euro' },
        { label: 'IRAP', a: irapDiv, b: irapComp, kind: 'euro' },
        { label: 'IRES', a: iresDiv, b: iresComp, kind: 'euro' },
        { label: 'Imposta sul dividendo', a: impostaDiv, b: null, kind: 'euro' },
        { label: 'Contributi INPS — quota SRL (2/3)', a: null, b: contributiAzienda, kind: 'euro' },
        { label: 'Contributi INPS — quota amministratore (1/3)', a: null, b: contributiAmm, kind: 'euro' },
        { label: 'IRPEF + addizionali amministratore', a: null, b: irpefTotAmm, kind: 'euro' },
        { label: 'Netto in tasca al socio / amministratore', a: nettoSocioDiv, b: nettoSocioComp, kind: 'euro', strong: true },
        { label: 'Carico fiscale e contributivo totale', a: caricoDiv, b: caricoComp, kind: 'euro' },
      ],
      delta: {
        label: 'Differenza di netto per il socio (compenso − dividendo)',
        value: deltaNetto,
        favorevole: deltaNetto >= 0
          ? 'Conviene erogare compenso amministratore'
          : 'Conviene distribuire l’utile come dividendo',
        note: `Compenso lordo erogabile ${fmt(compensoLordo)} · aliquota IRPEF marginale amministratore ${(marginale * 100).toFixed(0)}% · ` +
          `carico personale effettivo sul compenso ${(aliquotaEffettiva * 100).toFixed(1)}% contro pareggio al ${(aliquotaPareggio * 100).toFixed(1)}%.`,
      },
      breakEven: {
        label: 'Punto di pareggio — carico personale sul compenso',
        valore: aliquotaEffettiva,
        riferimento: Math.max(0, aliquotaPareggio),
        min: 0, max: 0.55, unit: 'perc',
        notaValore: 'carico effettivo',
        notaRiferimento: 'pareggio col dividendo',
      },
      risparmioSrl: Math.abs(caricoDiv - caricoComp),
      risparmioTipo: 'permanente',
    };
  },
};

function fmt(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
