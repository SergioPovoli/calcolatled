import { montanteAnnuo, bisezione } from '../tax.js';
import { rate } from '../rates.js';

export default {
  id: 'tfm',
  categoria: 'Compensi e utili',
  titolo: 'TFM — Trattamento di Fine Mandato vs compenso ordinario',
  sommario: 'Accantonamento annuo deducibile per la SRL, con tassazione dell’amministratore rinviata alla percezione e separata, contro l’erogazione dello stesso importo come compenso annuo tassato subito per cassa. Misura il beneficio del differimento d’imposta.',

  noteMetodologiche: [
    'Confronto a parità di erogazione lorda complessiva (accantonamento annuo × anni di mandato), misurato come ricchezza netta accumulata alla fine del mandato.',
    'I flussi netti annui della via "compenso ordinario" sono reinvestiti al rendimento indicato; l’accantonamento TFM è capitalizzato allo stesso tasso (ipotesi di fondo o polizza dedicata).',
    'Via TFM con atto di data certa anteriore all’inizio del rapporto: accantonamento deducibile per competenza per la SRL; percezione tassata separatamente (art. 17 co. 1 lett. c TUIR), di norma a un’aliquota media inferiore alla marginale. Senza data certa: deduzione solo per cassa e tassazione ordinaria alla percezione.',
    'L’aliquota di tassazione separata è una stima: l’Agenzia la riliquida sul reddito di riferimento del biennio precedente.',
    'La quota di TFM eccedente 1.000.000 € è comunque assoggettata a tassazione ordinaria.',
    'L’assoggettamento del TFM a contributi Gestione Separata è dibattuto: opzione attivabile, applicata in modo simmetrico alle due vie.',
  ],

  fields: [
    { key: 'accantonamentoAnnuo', label: 'Accantonamento / compenso annuo', unit: 'euro',
      hint: 'Importo annuo accantonato a TFM (via TFM) o erogato come compenso ordinario (via alternativa).' },
    { key: 'anniMandato', label: 'Anni di mandato residui', unit: 'num' },
    { key: 'rendimentoAnnuo', label: 'Rendimento annuo netto di capitalizzazione', unit: 'perc',
      hint: 'Rendimento figurativo del fondo/polizza TFM e del reinvestimento dei netti annui. Metti 0 per un confronto puramente fiscale.' },
    { key: 'aliquotaIres', label: 'Aliquota IRES', unit: 'perc' },
    { key: 'aliquotaMarginaleOrd', label: 'Aliquota IRPEF marginale (compenso ordinario)', unit: 'perc',
      hint: 'Aliquota sull’ultimo scaglione del reddito dell’amministratore.' },
    { key: 'addizionali', label: 'Addizionali IRPEF regionale + comunale', unit: 'perc' },
    { key: 'aliquotaTassSeparata', label: 'Aliquota stimata di tassazione separata sul TFM', unit: 'perc',
      hint: 'Tipicamente vicina all’aliquota media IRPEF del biennio di riferimento.' },
    { key: 'assoggettaContributi', label: 'Assoggetta l’erogazione a contributi Gestione Separata', type: 'checkbox' },
    { key: 'aliquotaContrPersona', label: 'Aliquota contributi a carico dell’amministratore', unit: 'perc',
      hint: 'Applicata a entrambe le vie se l’opzione sopra è attiva. 1/3 di 33,72% ≈ 11,24%.' },
    { key: 'dataCerta', label: 'Atto istitutivo del TFM con data certa anteriore all’inizio del rapporto', type: 'checkbox' },
    { key: 'tfmCap', label: 'Soglia tassazione separata TFM', unit: 'euro', locked: true, ref: 'tfmCap' },
  ],

  defaults: {
    accantonamentoAnnuo: 20000,
    anniMandato: 6,
    rendimentoAnnuo: 0.02,
    aliquotaIres: rate('ires'),
    aliquotaMarginaleOrd: 0.43,
    addizionali: rate('addizionaliIrpef'),
    aliquotaTassSeparata: 0.27,
    assoggettaContributi: true,
    aliquotaContrPersona: rate('gsQuotaCollaboratore') * rate('gestioneSeparata'),
    dataCerta: true,
    tfmCap: rate('tfmCap'),
  },

  fonti: ['tfmDataCerta', 'tfmCap', 'ires', 'irpefScaglioni', 'addizionaliIrpef', 'gestioneSeparata'],

  compute(v) {
    const A = Math.max(0, v.accantonamentoAnnuo);
    const N = Math.max(1, Math.round(v.anniMandato));
    const r = v.rendimentoAnnuo;
    const erogazioneLorda = A * N;

    const contrPersonaRate = v.assoggettaContributi ? v.aliquotaContrPersona : 0;

    // --- Lato SRL: risparmio IRES, valorizzato a fine mandato ---
    // Con data certa: deduzione per competenza -> risparmio annuo capitalizzato.
    // Senza data certa: deduzione per cassa all'erogazione -> risparmio secco a fine mandato.
    const risparmioIresTFM = v.dataCerta
      ? montanteAnnuo(A * v.aliquotaIres, N, r)
      : erogazioneLorda * v.aliquotaIres;
    const risparmioIresOrd = montanteAnnuo(A * v.aliquotaIres, N, r); // compenso sempre deducibile per cassa

    // --- Via TFM: montante e imposta personale alla percezione ---
    const montanteLordoTFM = montanteAnnuo(A, N, r);
    const rendimentoTFM = montanteLordoTFM - erogazioneLorda;

    const nettoTFMfun = (sep) => {
      const quotaSeparata = Math.min(erogazioneLorda, v.tfmCap);
      const quotaOrdinaria = Math.max(0, erogazioneLorda - v.tfmCap);
      const aliqCapitale = v.dataCerta ? sep : (v.aliquotaMarginaleOrd + v.addizionali);
      const impostaCapitale = quotaSeparata * aliqCapitale + quotaOrdinaria * (v.aliquotaMarginaleOrd + v.addizionali);
      const impostaRendimento = rendimentoTFM * aliqCapitale;
      const contributi = erogazioneLorda * contrPersonaRate;
      const imposta = impostaCapitale + impostaRendimento;
      return { imposta, contributi, netto: montanteLordoTFM - imposta - contributi };
    };
    const tfm = nettoTFMfun(v.aliquotaTassSeparata);

    // --- Via compenso ordinario: tassazione annua, netti reinvestiti ---
    const impostaOrdAnnua = A * (v.aliquotaMarginaleOrd + v.addizionali);
    const contributiOrdAnnui = A * contrPersonaRate;
    const nettoOrdAnnuo = A - impostaOrdAnnua - contributiOrdAnnui;
    const nettoOrdFine = montanteAnnuo(nettoOrdAnnuo, N, r);
    const impostaOrdTot = impostaOrdAnnua * N;
    const contributiOrdTot = contributiOrdAnnui * N;

    const deltaNetto = tfm.netto - nettoOrdFine;
    const deltaSrl = risparmioIresTFM - risparmioIresOrd;

    // Aliquota di tassazione separata di pareggio (a parità di netto personale a fine mandato).
    const pareggio = bisezione((s) => nettoTFMfun(s).netto - nettoOrdFine, 0, 0.8);

    return {
      colonne: ['TFM (accantonamento)', 'Compenso ordinario annuo'],
      righe: [
        { section: true, label: 'Lato SRL' },
        { label: 'Deduzione dell’importo', a: v.dataCerta ? 'per competenza' : 'per cassa', b: 'per cassa', kind: 'num' },
        { label: 'Risparmio IRES (valore a fine mandato)', a: risparmioIresTFM, b: risparmioIresOrd, kind: 'euro' },
        { section: true, label: 'Lato amministratore' },
        { label: 'Erogazione lorda complessiva', a: erogazioneLorda, b: erogazioneLorda, kind: 'euro' },
        { label: 'Montante lordo a fine mandato', a: montanteLordoTFM, b: montanteAnnuo(A, N, r), kind: 'euro',
          note: 'capitale + rendimento' },
        { label: 'Regime di tassazione', a: v.dataCerta ? 'separata' : 'ordinaria', b: 'ordinaria, per cassa', kind: 'num' },
        { label: 'Imposta personale complessiva', a: tfm.imposta, b: impostaOrdTot, kind: 'euro',
          note: 'valori nominali' },
        { label: 'Contributi a carico dell’amministratore', a: tfm.contributi, b: contributiOrdTot, kind: 'euro' },
        { label: 'Netto accumulato a fine mandato', a: tfm.netto, b: nettoOrdFine, kind: 'euro', strong: true },
      ],
      delta: {
        label: 'Beneficio del differimento (netto TFM − netto compenso ordinario, a fine mandato)',
        value: deltaNetto,
        favorevole: deltaNetto >= 0
          ? 'Conviene il TFM' + (v.dataCerta ? '' : ' — ma senza data certa il vantaggio è ridotto')
          : 'Conviene il compenso ordinario',
        note: `Differenza di risparmio IRES lato SRL: ${fmt(deltaSrl)}. ` +
          `Il TFM pareggia il compenso ordinario con un’aliquota di tassazione separata del ${(pareggio * 100).toFixed(1)}%.`,
      },
      breakEven: {
        label: 'Aliquota di tassazione separata di pareggio',
        valore: v.aliquotaTassSeparata,
        riferimento: Math.max(0, Math.min(0.8, pareggio)),
        min: 0, max: 0.5, unit: 'perc',
        notaValore: 'aliquota stimata',
        notaRiferimento: 'pareggio',
      },
      risparmioSrl: deltaNetto + deltaSrl,
      risparmioTipo: 'differimento',
    };
  },
};

function fmt(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
