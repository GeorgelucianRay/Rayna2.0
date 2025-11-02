// src/intents/rayna.intents.depot_list.js
const depotList = [
  {
    id: "depot_list_generic",
    priority: 90,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "lista contenedores", "listado contenedores", "que contenedores hay", "qué contenedores tenemos",
      "lista depot", "lista deposito", "listado depot", "listado deposito",
      "contenedores vacio", "contenedores vacios", "contenedores vacíos",
      "contenedores rotos", "contenedores defectuosos",
      "contenedores programados", "lista programados",
      "contenedores maersk", "contenedores por naviera", "lista naviera", "lista maersk",
      "lista contenedor", "ver lista de contenedores"
    ],
    response: {
      text: {
        es: "Un momento… preparo la lista.",
        ro: "Un moment… pregătesc lista.",
        ca: "Un segon… preparo la llista."
      }
    },
    meta: { category: "depot", topic: "list" }
  },

  {
    id: "depot_list_vacios",
    priority: 89,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "vacio", "vacíos", "vacios", "goale", "gol", "empty containers",
      "lista vacio", "lista vacios", "lista vacíos"
    ],
    response: {
      text: {
        es: "Ok, preparo la lista de vacíos…",
        ro: "Ok, pregătesc lista de goale…",
        ca: "D'acord, preparo la llista de buits…"
      }
    },
    meta: { category: "depot", topic: "list_vacios" }
  },

  {
    id: "depot_list_rotos",
    priority: 89,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "rotos", "defectuosos", "defectis", "stricate", "broken containers",
      "lista rotos", "lista defectuosos"
    ],
    response: {
      text: {
        es: "Vale, saco la lista de rotos…",
        ro: "Bine, scot lista de defecte…",
        ca: "D'acord, trec la llista d'espatllats…"
      }
    },
    meta: { category: "depot", topic: "list_rotos" }
  },

  {
    id: "depot_list_programados",
    priority: 89,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "programados", "programate", "programate", "programate", "lista programados",
      "contenedores programados"
    ],
    response: {
      text: {
        es: "Un momento… preparo los programados…",
        ro: "Un moment… pregătesc programatele…",
        ca: "Un segon… preparo els programats…"
      }
    },
    meta: { category: "depot", topic: "list_programados" }
  },

  {
    id: "depot_list_naviera",
    priority: 89,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "por naviera", "naviera", "maersk", "msc", "cma", "cosco", "one",
      "lista maersk", "lista por naviera", "contenedores de maersk", "contenedores maersk"
    ],
    response: {
      text: {
        es: "Entendido… filtro por naviera.",
        ro: "Am înțeles… filtrez după naviera.",
        ca: "Entesos… filtro per naviliera."
      }
    },
    meta: { category: "depot", topic: "list_naviera" }
  }
];

export default depotList;