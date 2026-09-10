# CalcolAtled

Dashboard di calcolatori per l'**ottimizzazione fiscale legale di una SRL italiana**.
HTML + CSS + JavaScript puro: nessun framework, nessuno step di build, nessuna
dipendenza esterna. Tutti i calcoli girano nel browser; nessun dato lascia il dispositivo.

## Calcolatori

### Compensi e utili — confronto SRL vs socio/amministratore

| Calcolatore | Confronta |
|---|---|
| **Compenso amministratore vs utile distribuito** | A parità di utile ante-imposte: `utile → IRES 24% + IRAP 3,9% → dividendo 26%` contro `compenso deducibile → IRPEF progressiva + contributi Gestione Separata`. Evidenzia il punto di pareggio in funzione dell'aliquota marginale IRPEF. |
| **TFM — Trattamento di Fine Mandato** | Accantonamento annuo deducibile per la SRL, con tassazione dell'amministratore rinviata alla percezione e separata, contro l'erogazione dello stesso importo come compenso annuo tassato subito per cassa. Misura il beneficio del differimento d'imposta. |

### Benefit vs stipendio — a parità di costo per la SRL

Doppia colonna con dettaglio *lato dipendente/amministratore* e *lato SRL*: base
imponibile, imposte e contributi, risparmio fiscale aziendale da deducibilità.

| Calcolatore | Confronta |
|---|---|
| **Auto aziendale in fringe benefit vs aumento di stipendio** | Base imponibile sulle tabelle ACI (% per alimentazione × costo km × 15.000 km), deducibilità 70% per la SRL (art. 164 lett. b-bis TUIR) e detrazione IVA, contro un aumento di stipendio di pari costo. |
| **Buoni pasto vs aumento di stipendio** | Limite di esenzione giornaliero (4,00 € cartacei / 10,00 € elettronici dal 2026), deducibilità piena per l'azienda, nessuna imposta né contributo per la persona entro soglia. |
| **Welfare entro soglia fringe benefit (1.000 / 2.000 € con figli) vs aumento di stipendio** | Rimborso di utenze domestiche, affitto o interessi sul mutuo prima casa entro la soglia rafforzata 2025–2027: esente e deducibile, contro lo stesso importo come RAL lorda. |

Perché il welfare come terzo calcolatore benefit: è la leva 2026 con il miglior
rapporto beneficio/complessità — soglia legislata fino al 2027, applicabile anche
all'amministratore, nessuna tabella esterna da consultare, delta netto ampio e immediato.

Una pagina **Riepilogo** somma il risparmio stimato dei calcolatori compilati
(il beneficio del TFM è tenuto separato: è un differimento, non un risparmio permanente).
Una pagina **Fonti** elenca ogni aliquota, soglia e regola con la relativa fonte;
è generata dallo stesso oggetto che alimenta i calcoli e non può divergerne.

## Struttura del progetto

```
index.html                shell: <div id="app">, monta src/main.js
styles/
  tokens.css              variabili di tema, reset, tipografia
  app.css                 layout e componenti
src/
  main.js                 bootstrap: router, header/footer, render della vista
  router.js               hash router (#/  #/calc/<id>  #/riepilogo  #/fonti)
  store.js                stato per-calcolatore + persistenza localStorage
  format.js               formattazione e parsing it-IT (€, %, migliaia)
  tax.js                  motore fiscale puro: IRPEF progressiva, IRES/IRAP, contributi…
  rates.js                TUTTE le aliquote/soglie 2026 in un punto solo, con fonte e URL
  render.js               renderer generici: campi, tabella di confronto, delta, fonti
  registry.js             elenco dei calcolatori e delle categorie
  calc-view.js             vista di un calcolatore (dal descrittore)
  home.js / riepilogo.js / fonti.js   le altre viste
  calculators/
    _benefit.js           helper condivisi dai calcolatori "benefit vs stipendio"
    compenso-vs-dividendo.js
    tfm.js
    auto-fringe-benefit.js
    buoni-pasto.js
    welfare-soglia.js
```

### Aggiungere un calcolatore

1. Crea `src/calculators/<id>.js` che esporta un descrittore:

   ```js
   export default {
     id: 'nuovo-calcolatore',
     categoria: 'Compensi e utili',            // deve esistere in registry.js
     titolo: '…',
     sommario: '…',
     noteMetodologiche: ['…'],                  // opzionale
     fields: [
       { key: 'importo', label: 'Importo', unit: 'euro', hint: '…' },
       { key: 'aliquota', label: 'Aliquota', unit: 'perc' },
       { key: 'valoreDiLegge', label: '…', unit: 'num', locked: true, ref: 'chiaveInRates' },
     ],
     defaults: { importo: 1000, aliquota: 0.24, valoreDiLegge: 15000 },
     fonti: ['ires', 'irpefScaglioni'],         // chiavi di rates.js
     compute(v, { scaglioni }) {
       return {
         colonne: ['Via A', 'Via B'],
         righe: [
           { section: true, label: 'Sezione' },
           { label: 'Riga', a: 100, b: 120, kind: 'euro', strong: false, note: '…' },
         ],
         delta: { label: '…', value: 20, favorevole: '…', note: '…' },
         breakEven: { label: '…', valore: 0.3, riferimento: 0.35, min: 0, max: 0.55, unit: 'perc' }, // opzionale
         risparmioSrl: 20,
         risparmioTipo: 'permanente',           // o 'differimento'
       };
     },
   };
   ```

2. Aggiungi un valore mancante in `src/rates.js` (con `fonte` e `url`) se serve.
3. Importa il modulo in `src/registry.js` e aggiungilo all'array `CALCULATORS`.

Nessun'altra modifica: home, menu, routing, elenco fonti e riepilogo aggregato si aggiornano da soli.

## Sviluppo in locale

Il progetto usa ES modules, che richiedono un server HTTP (non `file://`). Un qualsiasi
server statico va bene:

```sh
python3 -m http.server 8000
# poi apri http://localhost:8000
```

oppure `npx serve`, `php -S localhost:8000`, l'estensione "Live Server" di VS Code, ecc.

Non c'è nulla da compilare né da installare.

## Pubblicazione su GitHub Pages

1. Crea un repository su GitHub e caricaci il contenuto di questa cartella:

   ```sh
   git init
   git add .
   git commit -m "conti · srl — dashboard calcoli fiscali SRL"
   git branch -M main
   git remote add origin git@github.com:<utente>/<repo>.git
   git push -u origin main
   ```

2. Su GitHub: **Settings → Pages → Build and deployment**
   - *Source*: **Deploy from a branch**
   - *Branch*: **main**, cartella **/ (root)**
   - Salva.

3. Dopo qualche minuto il sito è online su
   `https://<utente>.github.io/<repo>/`.

Il file `.nojekyll` (già incluso) disattiva l'elaborazione Jekyll, così la cartella
`src/` viene servita così com'è. Non servono workflow di Actions: i file sono già statici.

Per pubblicare sotto un dominio o in una sottocartella diversa non è necessario
cambiare nulla: tutti i percorsi nel codice sono relativi.

## Avvertenza

Strumento **illustrativo** per fare i propri conti. **Non è consulenza fiscale.**
Ogni strategia va validata con un commercialista: la linea fra ottimizzazione lecita
ed elusione dipende dal caso concreto — documentazione, congruità degli importi,
sostanza economica dell'operazione, delibere con data certa. I valori sono aggiornati
al 2026 e cambiano quasi a ogni legge di bilancio: controlla sempre la pagina **Fonti**
e riscontra i numeri sui testi normativi e sulla prassi dell'Agenzia delle Entrate.
