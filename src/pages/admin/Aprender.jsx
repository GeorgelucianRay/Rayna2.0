import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../AuthContext";
import styles from "./Aprender.module.css";

export default function Aprender() {
  const { profile } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    const fetchLinks = async () => {
      if (!isAdmin) return setLoading(false);
      const { data, error } = await supabase
        .from("aprender_links")
        .select("id, nombre, url")
        .order("nombre", { ascending: true });
      if (error) console.error("Eroare Aprender:", error);
      setLinks(data || []);
      setLoading(false);
    };
    fetchLinks();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className={styles.shell}>
        <button className={styles.backBtn} onClick={() => window.history.back()}>
          ← Înapoi
        </button>
        <p className={styles.noAccess}>⛔ Nu ai acces la această secțiune.</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <button className={styles.backBtn} onClick={() => window.history.back()}>
        ← Înapoi
      </button>

      <h1 className={styles.title}>📚 Aprender</h1>
      <p className={styles.subtitle}>
        Resurse pentru a învăța cum se folosesc componentele aplicației.
      </p>

      {loading && <p>Se încarcă…</p>}
      {!loading && links.length === 0 && <p>Nu există resurse încă.</p>}

      <div className={styles.linkList}>
        {links.map((l) => (
          <button
            key={l.id}
            className={styles.linkBtn}
            onClick={() => window.open(l.url, "_blank", "noopener")}
          >
            {l.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}