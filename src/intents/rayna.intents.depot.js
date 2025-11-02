const depot = [
  {
    id: "depot_lookup",
    priority: 95,
    type: "action",
    action: "depot_lookup",
    patterns_any: [
      "donde esta el contenedor",
      "donde se encuentra el contenedor",
      "posicion del contenedor",
      "ubicacion del contenedor",
      "localiza el contenedor",
      "ver contenedor",
      "mostrar contenedor",
      "detalles del contenedor",
      "info del contenedor",
      "informacion del contenedor",
      "contenedor hlbu",
      "contenedor tgnu",
      "contenedor sudu",

      // română
      "unde este containerul",
      "unde se afla containerul",
      "pozitia containerului",
      "detalii container",

      // catalană
      "on esta el contenidor",
      "on es troba el contenidor",
      "posicio del contenidor",
      "detalls del contenidor"
    ],

    // 🧠 aici e magia: exclude fraze cu aceste cuvinte
    negative_any: [
      "lista", "listado", "vacío", "vacio", "vacios",
      "rotos", "defectuosos", "programados", "en deposito",
      "contenedores", "todos", "ver lista",
      "llista", "trencats", "buits", "programats"
    ],

    response: {
      text: {
        es: "Un momento... busco el contenedor en el depósito.",
        ro: "Un moment... caut containerul în depozit.",
        ca: "Un segon... estic buscant el contenidor al dipòsit."
      }
    },
    meta: { category: "depot", topic: "lookup" }
  },
  {
    id: "depot_details",
    priority: 94,
    type: "action",
    action: "depot_lookup",
    patterns_any: [
      "detalles del contenedor",
      "mostrar detalles contenedor",
      "info del contenedor",
      "informacion del contenedor",
      "dame la ficha del contenedor",
      "ficha del contenedor",

      "detalii container",
      "vezi detalii container",
      "informatii container",
      "fisa containerului",
      "arata fisa containerului",

      "detalls del contenidor",
      "mostra detalls contenidor",
      "informacio contenidor",
      "fitxa del contenidor"
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