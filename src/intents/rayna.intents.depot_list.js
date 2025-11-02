const depot_list = [
  {
    id: "depot_list",
    priority: 110,
    type: "action",
    action: "depot_list",
    patterns_any: [
      "lista contenedores",
      "listado contenedores",
      "muéstrame los contenedores",
      "muestrame los contenedores",
      "que contenedores hay",
      "contenedores del deposito",
      "contenedores en deposito",
      "lista vacio",
      "lista vacios",
      "contenedores vacios",
      "contenedores rotos",
      "contenedores defectuosos",
      "contenedores programados",
      "lista programados",
      "lista por naviera",
      "lista maersk",
      "lista msc",
      "lista hapag",
      "lista cma",
      "listado por naviera",
      "contenedores de maersk",
      "contenedores de msc",
      "contenedores de hapag",
      "contenedores de cma"
    ],
    response: {
      text: {
        es: "Un momento… preparo la lista.",
        ro: "O secundă… pregătesc lista.",
        ca: "Un segon… preparo la llista."
      }
    },
    meta: { category: "depot", topic: "list" }
  }
];

export default depot_list;