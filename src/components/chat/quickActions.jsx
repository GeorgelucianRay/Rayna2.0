// src/components/chat/quickActions.js
export function makeQuickAprender({ supabase, styles, setMessages }) {
  return async function quickAprender() {
    setMessages(m => [...m, { from:"user", text:"Quiero aprender" }]);
    try {
      const { data, error } = await supabase
        .from("aprender_links")
        .select("id,title,url")
        .order("title", { ascending: true });
      if (error) throw error;

      setMessages(m => [
        ...m,
        { from:"bot", reply_text:"¿Qué quieres aprender? Aquí tienes los tutoriales:" },
        {
          from:"bot",
          reply_text:"Lista de tutoriales:",
          render: () => (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Aprender</div>
              <div className={styles.cardActionsColumn}>
                {(data || []).map(item => (
                  <a
                    key={item.id}
                    className={styles.actionBtn}
                    data-variant="secondary"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          )
        }
      ]);
    } catch (e) {
      console.error("[quickAprender]", e);
      setMessages(m => [...m, { from:"bot", reply_text:"No he podido cargar los tutoriales ahora mismo." }]);
    }
  };
}

export function makeQuickReport({ setMessages, setAwaiting }) {
  return function quickReport() {
    setMessages((m) => [
      ...m,
      { from: "user", text: "Quiero reclamar un error" },
      { from: "bot", reply_text: "Claro, dime qué problema hay. Me encargo de resolverlo." },
    ]);
    setAwaiting("report_error_text");
  };
}
