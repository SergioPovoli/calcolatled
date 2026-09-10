import { el } from './render.js';
import { startRouter, currentRoute, onRoute } from './router.js';
import { subscribe } from './store.js';
import { fmtEuro } from './format.js';
import { renderHome } from './home.js';
import { renderCalcView } from './calc-view.js';
import { renderRiepilogo, aggregateLive } from './riepilogo.js';
import { renderFonti } from './fonti.js';

const app = document.getElementById('app');

function header() {
  const agg = aggregateLive();
  const route = currentRoute();
  const link = (href, text) => el('a', {
    href, text,
    class: 'nav__link' + (isActive(route, href) ? ' is-active' : ''),
  });
  return el('header', { class: 'topbar' }, [
    el('a', { class: 'brand', href: '#/' }, [
      el('span', { class: 'brand__mark', text: 'conti' }),
      el('span', { class: 'brand__dot', text: '·' }),
      el('span', { class: 'brand__mark', text: 'srl' }),
    ]),
    el('nav', { class: 'nav' }, [
      link('#/', 'Calcolatori'),
      link('#/riepilogo', 'Riepilogo'),
      link('#/fonti', 'Fonti'),
    ]),
    el('a', { class: 'topbar__agg', href: '#/riepilogo', title: 'Risparmio permanente stimato in SRL' }, [
      el('span', { class: 'topbar__agg-label', text: 'risparmio SRL / anno' }),
      el('span', { class: 'topbar__agg-value', text: fmtEuro(agg.permanente) }),
    ]),
  ]);
}

function isActive(route, href) {
  if (href === '#/') return route.name === 'home' || route.name === 'calc';
  if (href === '#/riepilogo') return route.name === 'riepilogo';
  if (href === '#/fonti') return route.name === 'fonti';
  return false;
}

function footer() {
  return el('footer', { class: 'sitefoot' }, [
    el('p', {}, [
      el('strong', { text: 'conti · srl' }),
      ' — strumento illustrativo per fare i propri conti di ottimizzazione fiscale legale di una SRL italiana. ',
      'Non è consulenza fiscale. Ogni strategia va validata con un commercialista: la linea fra ottimizzazione lecita ed elusione dipende dal caso concreto — documentazione, congruità degli importi, sostanza economica dell’operazione, delibere con data certa. ',
      'Valori 2026, soggetti a modifica a ogni legge di bilancio: vedi ',
      el('a', { href: '#/fonti', text: 'Fonti' }),
      '.',
    ]),
  ]);
}

function view(route) {
  switch (route.name) {
    case 'calc': return renderCalcView(route.id);
    case 'riepilogo': return renderRiepilogo();
    case 'fonti': return renderFonti();
    default: return renderHome();
  }
}

let lastRoute = null;

function render() {
  const route = currentRoute();
  const active = document.activeElement;
  const keepId = active && app.contains(active) ? active.id : null;

  app.replaceChildren(header(), el('main', { class: 'content' }, view(route)), footer());

  const routeKey = route.name + (route.id || '');
  if (routeKey !== lastRoute) window.scrollTo(0, 0);
  lastRoute = routeKey;

  if (keepId) {
    const next = document.getElementById(keepId);
    if (next) {
      next.focus();
      if (typeof next.selectionStart === 'number') {
        const end = next.value.length;
        try { next.setSelectionRange(end, end); } catch { /* input type non selezionabile */ }
      }
    }
  }
}

onRoute(render);
subscribe(render);
startRouter();
