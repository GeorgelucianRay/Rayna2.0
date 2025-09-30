import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../AuthContext";
import styles from "./Aprender.module.css";

export default function AprenderAdmin() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("aprender_links")
      .select("id, title, url, updated_at")
      .order("title", { ascending: true });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const addItem = async (e) => {
    e?.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("aprender_links")
      .insert({ title: title.trim(), url: url.trim() });
    setSaving(false);
    if (error) {
      alert("Nu am putut salva linkul.");
      return;
    }
    setTitle("");
    setUrl("");
    loadItems();
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Ștergi acest link?")) return;
    const { error } = await supabase.from("aprender_links").delete().eq("id", id);
    if (error) {
      alert("Nu am putut șterge.");
      return;
    }
    setItems((arr) => arr.filter((x) => x.id !== id));
  };

  if (!isAdmin) {
    return (
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>¡Vámonos a aprender!</h1>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>Volver</button>
        </header>
        <div className={styles.card}>
          <p>Doar administratorii pot gestiona conținutul „Aprender”.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>¡Vámonos a aprender!</h1>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>Volver</button>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Adaugă material</h2>
        <form className={styles.form} onSubmit={addItem}>
          <div className={styles.row}>
            <label className={styles.label}>Nume</label>
            <input
              className={styles.input}
              placeholder="ex.: Rayna"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Link</label>
            <input
              className={styles.input}
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button
              type="submit"
              className={`${styles.ghostBtn} ${styles.ghostGreen}`}
              disabled={saving}
            >
              {saving ? "Se salvează…" : "Salvează"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Materiale existente</h2>
        {loading ? (
          <div className={styles.empty}>Se încarcă…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Încă nu există materiale.</div>
        ) : (
          <ul className={styles.list}>
            {items.map((it) => (
              <li key={it.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>{it.title}</div>
                  <div className={styles.itemUrl}>{it.url}</div>
                </div>
                <div className={styles.itemActions}>
                  <a
                    className={`${styles.ghostBtn} ${styles.ghostGreen}`}
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir
                  </a>
                  <button
                    className={`${styles.ghostBtn} ${styles.ghostRed}`}
                    onClick={() => deleteItem(it.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}