// Motore fiscale puro: nessun accesso al DOM, nessuno stato. Solo funzioni.

// IRPEF lorda su un imponibile, dati gli scaglioni [[soglia, aliquota], ...].
export function irpefLorda(imponibile, scaglioni) {
  let imposta = 0;
  let prev = 0;
  for (const [soglia, aliquota] of scaglioni) {
    if (imponibile <= prev) break;
    const quota = Math.min(imponibile, soglia) - prev;
    imposta += quota * aliquota;
    prev = soglia;
  }
  return imposta;
}

// Aliquota marginale IRPEF applicabile all'ultimo euro di imponibile.
export function irpefMarginale(imponibile, scaglioni) {
  let prev = 0;
  for (const [soglia, aliquota] of scaglioni) {
    if (imponibile <= soglia) return aliquota;
    prev = soglia;
  }
  return scaglioni[scaglioni.length - 1][1];
}

// Detrazione art. 13 co. 1 TUIR (approssimazione a tre fasce, senza bonus cuneo 2025).
export function detrazioneLavoroDipendente(reddito) {
  if (reddito <= 0) return 0;
  if (reddito <= 15000) return 1955;
  if (reddito <= 28000) return 1910 + 1190 * (28000 - reddito) / 13000;
  if (reddito <= 50000) return 1910 * (50000 - reddito) / 22000;
  return 0;
}

// IRES + IRAP su una base imponibile societaria (approssimazione: stessa base per entrambe).
export function iresIrap(base, { ires, irap }) {
  const b = Math.max(0, base);
  return { ires: b * ires, irap: b * irap, totale: b * (ires + irap) };
}

// Contributi Gestione Separata su un compenso, con massimale. Restituisce il totale;
// la ripartizione società/collaboratore è responsabilità del chiamante.
export function gestioneSeparata(compenso, { aliquota, massimale = Infinity, giaVersato = 0 }) {
  const imponibile = Math.max(0, Math.min(compenso, massimale - giaVersato));
  return imponibile * aliquota;
}

// Carico personale incrementale (IRPEF netta + addizionali + contributi) generato da
// una base aggiuntiva rispetto a un reddito già presente.
export function caricoPersonale(baseAggiuntiva, {
  redditoBase = 0,
  scaglioni,
  detrazioneAggiuntiva = 0,
  addizionali = 0,
  aliquotaContributi = 0,
  massimaleContributi = Infinity,
} = {}) {
  const contributi = Math.max(0, Math.min(baseAggiuntiva, massimaleContributi - redditoBase)) * aliquotaContributi;
  const imponibileIrpef = Math.max(0, baseAggiuntiva - contributi); // contributi deducibili dal reddito
  const irpefLorde = irpefLorda(redditoBase + imponibileIrpef, scaglioni) - irpefLorda(redditoBase, scaglioni);
  const irpefNetta = Math.max(0, irpefLorde - detrazioneAggiuntiva);
  const addiz = imponibileIrpef * addizionali;
  return {
    contributi,
    irpef: irpefNetta,
    addizionali: addiz,
    totale: contributi + irpefNetta + addiz,
    netto: baseAggiuntiva - contributi - irpefNetta - addiz,
  };
}

// Montante di versamenti annui costanti capitalizzati a fine periodo (rendita posticipata).
export function montanteAnnuo(versamento, anni, tasso) {
  if (tasso === 0) return versamento * anni;
  return versamento * ((Math.pow(1 + tasso, anni) - 1) / tasso);
}

// Ricerca del punto di pareggio di f su [lo, hi] (f monotona che cambia segno).
export function bisezione(f, lo, hi, iter = 80) {
  let a = lo, b = hi;
  let fa = f(a);
  if (fa === 0) return a;
  for (let i = 0; i < iter; i++) {
    const m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0 || (b - a) < 1e-7) return m;
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; }
  }
  return (a + b) / 2;
}
