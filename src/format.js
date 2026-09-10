// Formattazione e parsing localizzati it-IT.

const euro0 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euro2 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num2 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function fmtEuro(v, decimals = false) {
  if (v == null || Number.isNaN(v)) return '—';
  return (decimals ? euro2 : euro0).format(v);
}

export function fmtPerc(v, digits = 1) {
  if (v == null || Number.isNaN(v)) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function fmtNum(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return num2.format(v);
}

export function fmtValue(v, unit) {
  if (unit === 'perc') return fmtPerc(v);
  if (unit === 'euro') return fmtEuro(v, true);
  return fmtNum(v);
}

// Converte una stringa digitata dall'utente ("1.234,56", "12%", "  3,9 ") in numero.
export function parseNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  let s = String(str).trim().replace(/[€%\s]/g, '');
  s = s.replace(/\.(?=\d{3}(\D|$))/g, ''); // punti come separatori di migliaia
  s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Valore di un campo verso la stringa mostrata nell'input (percentuali come "33" non "0.33").
export function toInputString(value, unit) {
  if (value == null || Number.isNaN(value)) return '';
  if (unit === 'perc') return fmtNum(value * 100);
  return fmtNum(value);
}

// Stringa dell'input verso il valore memorizzato.
export function fromInputString(str, unit) {
  const n = parseNumber(str);
  return unit === 'perc' ? n / 100 : n;
}
