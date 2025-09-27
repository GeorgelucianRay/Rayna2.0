// Un singur loc pentru meniuri + accente
export const HUB_ROUTE = '/rayna-hub';
export const HUB_IMG   = '/A8CB7FEF-A63A-444E-8B70-B03426F25960.png';

// ce linkuri vede fiecare rol
export const MENU_BY_ROLE = {
  sofer: [
    { id: '/sofer-homepage', text: 'Homepage',     icon: 'home' },
    { id: '/calculadora-nomina', text: 'Calculadora Nómina', icon: 'calc' },
    { id: '/gps',              text: 'GPS',         icon: 'gps' },
    { id: '/mi-perfil',        text: 'Mi Perfil',   icon: 'profile' },
  ],
  dispecer: [
    { id: '/dispecer-homepage', text: 'Homepage',   icon: 'home' },
    { id: '/depot',             text: 'Depot',      icon: 'depot' },
    { id: '/choferes-finder',   text: 'Choferes',   icon: 'users' },
    { id: '/calculadora-nomina',text: 'Calculadora Nómina', icon: 'calc' },
    { id: '/gps',               text: 'GPS',        icon: 'gps' },
    { id: '/taller',            text: 'Taller',     icon: 'wrench' },
  ],
  mecanic: [
    { id: '/taller', text: 'Taller', icon: 'wrench' },
    { id: '/depot',  text: 'Depot',  icon: 'depot'  },
  ],
  admin: [
    // admin moștenește meniul dispecer + iteme extra
    { id: '/dispecer-homepage', text: 'Homepage',   icon: 'home' },
    { id: '/depot',             text: 'Depot',      icon: 'depot' },
    { id: '/choferes-finder',   text: 'Choferes',   icon: 'users' },
    { id: '/calculadora-nomina',text: 'Calculadora Nómina', icon: 'calc' },
    { id: '/gps',               text: 'GPS',        icon: 'gps' },
    { id: '/gps-pro',           text: 'GPS Pro',    icon: 'gps' },
    { id: '/taller',            text: 'Taller',     icon: 'wrench' },
    { id: '/admin/utilizatori', text: 'Utilizatori',icon: 'users' },
  ],
};

// culori neon per rută (doar daca vrei highlight)
export const ACCENT_BY_ROUTE = {
  '/dispecer-homepage': ['#22d3ee', '#06b6d4'],
  '/sofer-homepage':    ['#22d3ee', '#06b6d4'],
  '/choferes-finder':   ['#a78bfa', '#8b5cf6'],
  '/gps':               ['#fb923c', '#f97316'],
  '/taller':            ['#38bdf8', '#0ea5e9'],
  '/depot':             ['#34d399', '#10b981'],
  '/calculadora-nomina':['#f59e0b', '#d97706'],
  '/mi-perfil':         ['#f472b6', '#ec4899'],
  '/admin/utilizatori': ['#facc15', '#eab308'],
  '/gps-pro':           ['#00e5ff', '#60a5fa'],
};

export const getAccent = (routeId) => {
  const [from, to] = ACCENT_BY_ROUTE[routeId] || ['#60a5fa', '#3b82f6'];
  return { from, to };
};