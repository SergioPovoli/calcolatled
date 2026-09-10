// Hash router minimale. Rotte: '' (home), 'calc/<id>', 'riepilogo', 'fonti'.

const handlers = [];

export function onRoute(fn) {
  handlers.push(fn);
}

export function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'calc' && parts[1]) return { name: 'calc', id: parts[1] };
  if (parts[0] === 'riepilogo') return { name: 'riepilogo' };
  if (parts[0] === 'fonti') return { name: 'fonti' };
  return { name: 'home' };
}

export function navigate(path) {
  location.hash = path;
}

export function startRouter() {
  const fire = () => {
    const route = currentRoute();
    for (const fn of handlers) fn(route);
  };
  window.addEventListener('hashchange', fire);
  fire();
}
