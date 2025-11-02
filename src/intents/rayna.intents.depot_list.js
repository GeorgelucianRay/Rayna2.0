const depot_list = [
  {
    id: "depot_list",
    priority: 110,
    type: "action",
    action: "depot_list",
    patterns_any: [
      // generic list
      "lista contenedores","listado contenedores","muestrame los contenedores","muéstrame los contenedores",
      "que contenedores hay","contenedores del deposito","contenedores en deposito",
      // categorías
      "lista vacio","lista vacios","contenedores vacios",
      "contenedores llenos","lista llenos",
      "contenedores rotos","contenedores defectuosos","lista rotos","lista defectuosos",
      "contenedores programados","lista programados",
      // navieras
      "lista por naviera","listado por naviera",
      "lista maersk","lista msc","lista hapag","lista cma","lista evergreen","lista cosco","lista one",
      "contenedores de maersk","contenedores de msc","contenedores de hapag","contenedores de cma"
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