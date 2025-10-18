import { supabase } from '../../../supabaseClient';
import { showContainerCard } from './uiHelpers'; // funcția ta existentă care creează cartonașul vizual

export const handleDepotChat = async (message, user) => {
  const lowerMsg = message.toLowerCase();

  // === 1️⃣ extragem codul containerului (ex: "MRSK1234567")
  const contRegex = /([A-Z]{4}\d{6,7})/i;
  const match = message.match(contRegex);
  const containerCode = match ? match[1].toUpperCase() : null;

  if (!containerCode) {
    return "No he encontrado ningún número de contenedor en tu mensaje.";
  }

  // === 2️⃣ verificăm rolul
  const role = user?.role || 'unknown';
  if (role === 'sofer') {
    return "Lo siento, no tienes acceso al Depot. ¿Quieres que te ayude en algo más?";
  }

  // === 3️⃣ căutăm containerul în toate tabelele
  let container = null;
  let origen = null;

  const tables = [
    'contenedores',
    'contenedores_rotos',
    'contenedores_programados',
    'contenedores_salidos'
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('num_contenedor', containerCode)
      .maybeSingle();

    if (data) {
      container = data;
      origen = table;
      break;
    }
  }

  // === 4️⃣ dacă nu există
  if (!container) {
    return `No he encontrado el contenedor ${containerCode} en el depósito.`;
  }

  // === 5️⃣ Construim răspunsul de bază
  const position = container.posicion || '—';
  let response = `El contenedor **${containerCode}** está en la posición **${position}**.`;

  // === 6️⃣ Detalii suplimentare cerute
  if (lowerMsg.includes('detall')) {
    response = `Claro, aquí tienes todos los datos del contenedor **${containerCode}** 👇`;
    await showContainerCard(container); // cartonașul tău existent vizual
  }

  // === 7️⃣ Adăugăm mesaje dinamice în funcție de rol și stare
  if (role === 'mecanic') {
    if (origen === 'contenedores_programados') {
      response += `\n\nEste contenedor está programado, ¿quieres marcarlo como **Hecho**?`;
    } else {
      response += `\n\nSi quieres le cambiamos el sitio.`;
    }
  }

  if (role === 'dispecer' || role === 'admin') {
    if (origen === 'contenedores_programados') {
      response += `\n\nEste contenedor está **programado**. ¿Quieres marcarlo como **Hecho** o cambiar su posición?`;
    } else {
      response += `\n\nSi quieres, lo podemos **programar**, **cambiar posición** o **sacarlo del Depot**. Dime qué necesitas.`;
    }
  }

  return response;
};