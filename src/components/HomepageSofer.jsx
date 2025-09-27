import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import { useAuth } from '../AuthContext.jsx';
import styles from './HomepageSofer.module.css';

// --- Iconițe SVG ---
const RssIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>;
const TiktokIcon = () => <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.73 7.44v3.86a.7.7 0 0 1-.7.7h-3.86a.7.7 0 0 1-.7-.7V7.44a.7.7 0 0 1 .7-.7h3.86a.7.7 0 0 1 .7.7Z" stroke="currentColor" strokeWidth="1.4"/><path d="M16.17 11.3v8.84a3.5 3.5 0 1 1-3.5-3.5h3.5Z" stroke="currentColor" strokeWidth="1.4"/></svg>;
const WhatsappIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;

const renderIcon = (iconType) => {
  switch (iconType) {
    case 'instagram': return <InstagramIcon />;
    case 'tiktok':    return <TiktokIcon />;
    case 'whatsapp':  return <WhatsappIcon />;
    case 'camera':    return null; // pentru camere afișăm doar text
    default:          return null;
  }
};

function HomepageSofer() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [announcements, setAnnouncements] = useState('Cargando anuncios...');
  const [annEdit, setAnnEdit] = useState('');
  const [annSaving, setAnnSaving] = useState(false);

  const [links, setLinks] = useState([]); // toate linkurile
  const [loading, setLoading] = useState(true);

  // form camera (doar admin)
  const [camName, setCamName] = useState('');
  const [camUrl, setCamUrl]   = useState('');
  const [camSaving, setCamSaving] = useState(false);

  // filtre utile
  const cameraLinks = useMemo(() => links.filter(l => l.icon_type === 'camera'), [links]);
  const socialLinks = useMemo(() => links.filter(l => l.icon_type !== 'camera'), [links]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('anuncios')
        .select('content')
        .eq('id', 1)
        .maybeSingle();
      if (error) {
        setAnnouncements('No se pudieron cargar los anuncios.');
      } else {
        setAnnouncements(data?.content || '');
        setAnnEdit(data?.content || '');
      }
    };

    const fetchLinks = async () => {
      const { data, error } = await supabase
        .from('external_links')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error) setLinks(data || []);
    };

    (async () => {
      setLoading(true);
      await Promise.all([fetchAnnouncements(), fetchLinks()]);
      setLoading(false);
    })();
  }, []);

  // --- ADMIN: salvare anunț
  const handleSaveAnnouncement = async () => {
    setAnnSaving(true);
    const { error } = await supabase
      .from('anuncios')
      .update({ content: annEdit })
      .eq('id', 1);
    if (!error) setAnnouncements(annEdit);
    setAnnSaving(false);
  };

  // --- ADMIN: adăugare cameră
  const handleAddCamera = async (e) => {
    e?.preventDefault?.();
    if (!camName.trim() || !camUrl.trim()) return;

    setCamSaving(true);

    // determinăm următorul display_order
    const nextOrder =
      (cameraLinks[cameraLinks.length - 1]?.display_order ?? 0) + 1;

    const newRow = {
      name: camName.trim(),
      url: camUrl.trim(),
      icon_type: 'camera',
      display_order: nextOrder,
    };

    // optimist
    const tempId = `temp_${Date.now()}`;
    setLinks((cur) => [...cur, { id: tempId, ...newRow }]);

    const { data, error } = await supabase
      .from('external_links')
      .insert(newRow)
      .select()
      .single();

    if (error) {
      // revert
      setLinks((cur) => cur.filter(l => l.id !== tempId));
      alert(error.message || 'Nu am putut adăuga camera.');
    } else {
      // înlocuim temporarul cu rândul real
      setLinks((cur) => cur.map(l => (l.id === tempId ? data : l)));
      setCamName('');
      setCamUrl('');
    }
    setCamSaving(false);
  };

  // --- ADMIN: ștergere link (opțional)
  const handleDeleteLink = async (id) => {
    const keep = confirm('Sigur vrei să ștergi acest link?');
    if (!keep) return;

    const prev = links;
    setLinks((cur) => cur.filter(l => l.id !== id));

    const { error } = await supabase
      .from('external_links')
      .delete()
      .eq('id', id);

    if (error) {
      setLinks(prev);
      alert(error.message || 'Ștergerea a eșuat.');
    }
  };

  if (loading) {
    return (
      <Layout backgroundClassName="homepage-background">
        <div className={styles.announcementsCard}>Se încarcă…</div>
      </Layout>
    );
  }

  return (
    <Layout backgroundClassName="homepage-background">
      {/* --- ANUNȚURI --- */}
      <div className={styles.announcementsCard}>
        <div className={styles.announcementsHeader}>
          <div className={styles.announcementsHeaderTitle}>
            <RssIcon />
            <h2 className={styles.announcementsTitle}>Anuncios Importantes</h2>
          </div>
        </div>

        {/* vizualizare pentru non-admin */}
        {!isAdmin && (
          <div className={styles.announcementsContent}>{announcements}</div>
        )}

        {/* editor pentru admin */}
        {isAdmin && (
          <div className={styles.announcementsContent}>
            <textarea
              className={styles.textarea}
              value={annEdit}
              onChange={(e) => setAnnEdit(e.target.value)}
              rows={5}
              placeholder="Scrie anunțul aici..."
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className={styles.saveBtn}
                onClick={handleSaveAnnouncement}
                disabled={annSaving}
              >
                {annSaving ? 'Se salvează…' : 'Salvează anunțul'}
              </button>
              <button
                className={styles.secondaryBtn}
                onClick={() => setAnnEdit(announcements)}
                disabled={annSaving}
                title="Revine la conținutul salvat"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- LINKURI EXTERNE --- */}
      <div className={styles.externalLinksContainer}>
        {/* CAMERE */}
        <div className={styles.linksRow}>
          {cameraLinks.map(link => (
            <div key={link.id} className={`${styles.socialLink} ${styles.cameraLink}`}>
              {/* fără icon pentru camere */}
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <span>{link.name}</span>
              </a>
              {isAdmin && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteLink(link.id)}
                  title="Șterge"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* SOCIAL */}
        <div className={styles.socialLinksRow}>
          {socialLinks.map(link => {
            const icon = renderIcon(link.icon_type);
            const linkStyle = styles[`${link.icon_type}Link`];
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.socialLink} ${linkStyle}`}
              >
                {icon}
                <span style={{ marginLeft: icon ? '0.5rem' : '0' }}>{link.name}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* --- FORM ADMIN: adăugare cameră --- */}
      {isAdmin && (
        <div className={styles.adminPanel}>
          <h3 className={styles.adminPanelTitle}>Adaugă Cameră</h3>
          <form className={styles.formRow} onSubmit={handleAddCamera}>
            <input
              type="text"
              className={styles.input}
              placeholder="Nume cameră"
              value={camName}
              onChange={(e) => setCamName(e.target.value)}
              required
            />
            <input
              type="url"
              className={styles.input}
              placeholder="URL cameră (http…)"
              value={camUrl}
              onChange={(e) => setCamUrl(e.target.value)}
              required
            />
            <button className={styles.addBtn} type="submit" disabled={camSaving}>
              {camSaving ? 'Se adaugă…' : 'Adaugă'}
            </button>
          </form>
        </div>
      )}
    </Layout>
  );
}

export default HomepageSofer;