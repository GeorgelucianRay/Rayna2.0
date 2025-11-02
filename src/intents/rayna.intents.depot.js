const depot = [
  {
    id: "depot_lookup",
    priority: 110,
    type: "action",
    action: "depot_lookup",
    patterns_any: [
      "contenedor","numero de contenedor","donde esta el contenedor","donde se encuentra el contenedor",
      "muestrame el contenedor","detalles del contenedor","dame detalles del contenedor",
      "busca el contenedor","localiza el contenedor","ver contenedor","mostrar contenedor",
      "posicion del contenedor","ubicacion del contenedor","cont en depot","buscar en el deposito",
      "contenedor en el deposito","container","numar container","numarul containerului",
      "unde este containerul","unde se afla containerul","arata-mi containerul","vezi containerul",
      "detalii container","detalii despre container","verifica containerul","pozitia containerului",
      "localizeaza containerul","container in depozit","verifica in depozit","contenidor",
      "numero de contenidor","on esta el contenidor","on es troba el contenidor","mostram el contenidor",
      "veure contenidor","detalls del contenidor","donam detalls del contenidor","cerca el contenidor",
      "localitza el contenidor","posicio del contenidor","contenidor al diposit","busca al diposit"
    ],
    response: {
      text: {
        es: "Un momento... busco el contenedor en el deposito.",
        ro: "Un moment... caut containerul in depozit.",
        ca: "Un segon... estic buscant el contenidor al diposit."
      }
    },
    meta: { category: "depot", topic: "lookup" }
  },
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
},
  {
    id: "depot_details",
    priority: 110,
    type: "action",
    action: "depot_lookup",
    patterns_any: [
      "detalles del contenedor","mostrar detalles contenedor","info del contenedor",
      "informacion del contenedor","dame la ficha del contenedor","detalii container",
      "vezi detalii container","informatii container","fisa containerului","arata fisa containerului",
      "detalls del contenidor","mostra detalls contenidor","informacio contenidor","fitxa del contenidor"
    ],
    response: {
      text: {
        es: "Busco los detalles del contenedor...",
        ro: "Caut detaliile containerului...",
        ca: "Busco els detalls del contenidor..."
      }
    },
    meta: { category: "depot", topic: "details" }
  }
];

export default depot;
