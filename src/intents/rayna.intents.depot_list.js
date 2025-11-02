// src/intents/rayna.intents.depot_list.js
// Intenții SPECIFICE pentru listele din Depot. Toate -> action: "depot_list".

const depot_list = [
  // ——— cele mai specifice (prioritate mare)
  {
    id: "depot_list_vacios",
    priority: 130,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "lista vacio", "lista vacíos", "lista vacios",
      "contenedores vacio", "contenedores vacíos", "contenedores vacios",
      "mostrar vacios", "muéstrame vacios"
    ],
    response: { text: { es: "Un momento… preparo la lista de vacíos." } },
    meta: { category: "depot", topic: "list/vacios" }
  },
  {
    id: "depot_list_llenos",
    priority: 128,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "lista llenos", "contenedores llenos", "mostrar llenos"
    ],
    response: { text: { es: "Un momento… preparo la lista de llenos." } },
    meta: { category: "depot", topic: "list/llenos" }
  },
  {
    id: "depot_list_rotos",
    priority: 126,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "contenedores rotos", "contenedores defectuosos",
      "lista rotos", "lista defectuosos"
    ],
    response: { text: { es: "Un momento… preparo la lista de rotos." } },
    meta: { category: "depot", topic: "list/rotos" }
  },
  {
    id: "depot_list_programados",
    priority: 124,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "contenedores programados", "lista programados", "programados"
    ],
    response: { text: { es: "Un momento… preparo la lista de programados." } },
    meta: { category: "depot", topic: "list/programados" }
  },

  // ——— pe naviera explicită
  {
    id: "depot_list_naviera",
    priority: 122,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "lista por naviera", "listado por naviera",
      "lista maersk", "lista msc", "lista hapag", "lista cma",
      "contenedores de maersk", "contenedores de msc",
      "contenedores de hapag", "contenedores de cma", "lista evergreen",
      "contenedores de evergreen", "contenedores de one", "lista one"
    ],
    response: { text: { es: "Un momento… filtro por naviera." } },
    meta: { category: "depot", topic: "list/naviera" }
  },

  // ——— generic fallback pt. “lista contenedores…”
  {
    id: "depot_list_generic",
    priority: 120,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "lista contenedores", "listado contenedores",
      "muéstrame los contenedores", "muestrame los contenedores",
      "que contenedores hay", "contenedores del deposito", "contenedores en deposito",
      "lista containers", "lista contenidores"
    ],
    response: { text: { es: "Un momento… preparo la lista." } },
    meta: { category: "depot", topic: "list/todos" }
  }
];

export default depot_list;