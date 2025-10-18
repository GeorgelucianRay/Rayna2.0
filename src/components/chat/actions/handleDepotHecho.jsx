import { supabase } from "../../../supabaseClient";

/**
 * ✅ Marca un contenedor programado como "Hecho"
 * Muta înregistrarea din `contenedores_programados` în `contenedores_salidos`
 */
export async function handleDepotHecho(containerCode, setMessages) {
  try {
    // 1️⃣ Căutăm containerul în `contenedores_programados`
    const { data: programado, error: findErr } = await supabase
      .from("contenedores_programados")
      .select("*")
      .eq("num_contenedor", containerCode)
      .maybeSingle();

    if (findErr) throw findErr;

    if (!programado) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text: `No he encontrado ningún contenedor programado con código **${containerCode}**.`,
        },
      ]);
      return;
    }

    // 2️⃣ Inserăm containerul în `contenedores_salidos`
    const insertData = {
      ...programado,
      fecha_salida: new Date().toISOString(),
      origen: "programado",
    };

    const { error: insertErr } = await supabase
      .from("contenedores_salidos")
      .insert([insertData]);

    if (insertErr) throw insertErr;

    // 3️⃣ Ștergem din `contenedores_programados`
    const { error: deleteErr } = await supabase
      .from("contenedores_programados")
      .delete()
      .eq("id", programado.id);

    if (deleteErr) throw deleteErr;

    // 4️⃣ Confirmare pentru utilizator
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `Hecho ✅\n\nEl contenedor **${containerCode}** ha sido movido correctamente a **Salidos**.`,
      },
    ]);

  } catch (err) {
    console.error("Error en handleDepotHecho:", err);
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `Lo siento, ha ocurrido un error al marcar como Hecho el contenedor **${containerCode}**.`,
      },
    ]);
  }
}