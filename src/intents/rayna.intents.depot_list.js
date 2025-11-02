{
  id: "depot_list",
  priority: 90,
  type: "action",
  action: "depot_list",
  patterns_any: [
    "lista contenedores",
    "lista de contenedores",
    "que contenedores vacio tenemos",
    "dime contenedores vacio",
    "muestrame contenedores rotos",
    "que contenedores rotos hay",
    "contenedores programados",
    "lista de contenedores programados",
    "contenedores de maersk",
    "lista de maersk",
    "dime que contenedores de maersk hay",
    "lista contenedores msc",
    "lista contenedores hapag",
    "lista contenedores cma",
    "lista contenedores evergreen",
    "lista contenedores one",
    "lista contenedores cosco",
    "lista contenedores zim",
    "lista contenedores arkas",
    "lista contenedores 40",
    "lista contenedores 20",
    "lista de naviera",
    "que contenedores hay"
  ],
  response: {
    text: {
      es: "Un momento… preparo la lista de contenedores.",
      ro: "Un moment… pregătesc lista containerelor.",
      ca: "Un segon… preparo la llista de contenidors."
    }
  },
  meta: { category: "depot", topic: "list" }
}