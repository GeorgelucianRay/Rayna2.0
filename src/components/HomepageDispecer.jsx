import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './HomepageDispecer.module.css';
import EditAnnouncementModal from './EditAnnouncementModal';
import { useAuth } from '../AuthContext.jsx';

/* --- Iconițe SVG --- */
const RssIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
);
const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
);
const TiktokIcon = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.73 7.44v3.86a.7.7 0 0 1-.7.7h-3.86a.7.7 0 0 1-.7-.7V7.44a.7.7 0 0 1 .7-.7h3.86a.7.7 0 0 1 .7.7Z" stroke="currentColor" strokeWidth="1.4"/><path d="M16.17 11.3v8.84a3.5 3.5 0 1 1-3.5-3.5h3.5Z" stroke="currentColor" strokeWidth="1.4"/></svg>
);
const WhatsappIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
);
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
);

const renderIcon = (iconType) => {
  switch (iconType) {
    case 'instagram': return <InstagramIcon />;
    case 'tiktok':    return <TiktokIcon />;
    case 'whatsapp':  return <WhatsappIcon />;
    case 'camera':    return <CameraIcon />;
    default:          return null;
  }
};

function HomepageDispecer() {
  const { profile } = useAuth();
  const isAdmin    = profile?.role === 'admin';
  const isDispecer = profile?.role === 'dispecer';
  const canEditAnnouncement = isAdmin || isDispecer;

  const [announcementText, setAnnouncementText] = useState('Cargando anuncios...');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // form adăugare link (admin)
  const [newName, setNewName] = useState('');
  const [newUrl,  setNewUrl]  = useState('');
  const [newType, setNewType] = useState('camera'); // camera | instagram | tiktok | whatsapp
  const [savingNew, setSavingNew] = useState(false);

  // edit inline (admin)
  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const cameraLinks = useMemo(() => links.filter(l => l.icon_type === 'camera'), [links]);
  const socialLinks = useMemo(() => links.filter(l => l.icon_type !== 'camera'), [links]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select('content')
        .eq('id', 1)
        .single();
      if (error) throw error;
      setAnnouncementText(data?.content ?? '');
    } catch (e) {
      setAnnouncementText('No se pudieron cargar los anuncios.');
      console.error('Error fetching announcements:', e);
    }
  }, []);

  const fetchLinks = useCallback(async () => {
    try {
      setLoadingLinks(true);
      const { data, error } = await supabase
        .from('external_links')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      setLinks(data || []);
    } catch (e) {
      console.error('Error fetching links:', e);
    } finally {
      setLoadingLinks(false);
    }
  }, []);

  const handleSaveAnnouncement = async (newContent) => {
    if (!canEditAnnouncement) return;
    try {
      const { error } = await supabase
        .from('anuncios')
        .update({ content: newContent })
        .eq('id', 1);
      if (error) throw error;
      setAnnouncementText(newContent);
      setIsModalOpen(false);
      alert('¡Anuncio actualizado con éxito!');
    } catch (e) {
      alert('Error: No se pudieron guardar los cambios.');
      console.error('Error updating announcement:', e);
    }
  };

  // admin: add link
  const handleAddLink = async (e) => {
    e?.preventDefault?.();
    if (!isAdmin) return;
    if (!newName.trim() || !newUrl.trim()) return;

    setSavingNew(true);
    const pool = newType === 'camera' ? cameraLinks : socialLinks;
    const nextOrder = (pool[pool.length - 1]?.display_order ?? 0) + 1;

    const newRow = {
      name: newName.trim(),
      url: newUrl.trim(),
      icon_type: newType,
      display_order: nextOrder,
    };

    const tempId = `tmp_${Date.now()}`;
    setLinks((cur) => [...cur, { id: tempId, ...newRow }]);

    const { data, error } = await supabase
      .from('external_links')
      .insert(newRow)
      .select()
      .single();

    if (error) {
      setLinks((cur) => cur.filter(l => l.id !== tempId));
      alert(error.message || 'Nu am putut adăuga linkul.');
    } else {
      setLinks((cur) => cur.map(l => (l.id === tempId ? data : l)));
      setNewName(''); setNewUrl(''); setNewType('camera');
    }

    setSavingNew(false);
  };

  // admin: edit link
  const startEdit = (row) => { if (!isAdmin) return; setEditId(row.id); setEditName(row.name); setEditUrl(row.url); };
  const cancelEdit = () => { setEditId(null); setEditName(''); setEditUrl(''); };
  const saveEdit = async () => {
    if (!isAdmin || !editId) return;
    setEditSaving(true);
    const prev = links;
    setLinks((cur) => cur.map(l => (l.id === editId ? { ...l, name: editName, url: editUrl } : l)));
    const { error } = await supabase.from('external_links').update({ name: editName, url: editUrl }).eq('id', editId);
    if (error) { setLinks(prev); alert(error.message || 'Editarea a eșuat.'); }
    setEditSaving(false);
    cancelEdit();
  };

  // admin: delete link
  const handleDeleteLink = async (id) => {
    if (!isAdmin) return;
    if (!confirm('Sigur vrei să ștergi acest link?')) return;
    const prev = links;
    setLinks((cur) => cur.filter(l => l.id !== id));
    const { error } = await supabase.from('external_links').delete().eq('id', id);
    if (error) { setLinks(prev); alert(error.message || 'Ștergerea a eșuat.'); }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchLinks();
  }, [fetchAnnouncements, fetchLinks]);

  return (
    <Layout backgroundClassName="homepageBackground">
      {/* --- Card Anunțuri --- */}
      <div className={styles.announcementsCard}>
        <div className={styles.announcementsHeader}>
          <div className={styles.announcementsHeaderTitle}>
            <RssIcon />
            <h2 className={styles.announcementsTitle}>Anuncios Importantes</h2>
          </div>
          <div className={styles.headerButtons}>
            {canEditAnnouncement && (
              <button onClick={() => setIsModalOpen(true)} className={styles.actionButton}>
                Editar Anuncio
              </button>
            )}
            <button onClick={fetchAnnouncements} className={styles.actionButtonSecondary}>
              Refrescar
            </button>
          </div>
        </div>
        <div className={styles.announcementsContent}>{announcementText}</div>
      </div>

      {/* --- Linkuri Externe --- */}
      <div className={styles.externalLinksContainer}>
        {/* CAMERE */}
        {cameraLinks.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Cámaras de Vigilancia</h2>
            <div className={styles.linksGrid}>
              {cameraLinks.map(link => (
                <div key={link.id} className={styles.linkCard}>
                  {editId === link.id ? (
                    <div className={styles.editRow}>
                      <input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nume" />
                      <input className={styles.input} value={editUrl}  onChange={e => setEditUrl(e.target.value)}  placeholder="URL" />
                      <button className={styles.saveBtnSm} onClick={saveEdit} disabled={editSaving}>Salvează</button>
                      <button className={styles.cancelBtnSm} onClick={cancelEdit}>Anulează</button>
                    </div>
                  ) : (
                    <>
                      <a className={styles.linkAnchor} href={link.url} target="_blank" rel="noopener noreferrer">
                        {renderIcon('camera')}
                        <span className={styles.linkTitle}>{link.name}</span>
                      </a>
                      {isAdmin && (
                        <div className={styles.cardActions}>
                          <button className={styles.iconBtnInfo}  onClick={() => startEdit(link)} title="Editează">✎</button>
                          <button className={styles.iconBtnDanger} onClick={() => handleDeleteLink(link.id)} title="Șterge">✕</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SOCIAL */}
        {socialLinks.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Redes Sociales y Contacto</h2>
            <div className={styles.linksGrid}>
              {socialLinks.map(link => (
                <div key={link.id} className={`${styles.linkCard} ${styles.socialCard}`}>
                  {editId === link.id ? (
                    <div className={styles.editRow}>
                      <input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nume" />
                      <input className={styles.input} value={editUrl}  onChange={e => setEditUrl(e.target.value)}  placeholder="URL" />
                      <button className={styles.saveBtnSm} onClick={saveEdit} disabled={editSaving}>Salvează</button>
                      <button className={styles.cancelBtnSm} onClick={cancelEdit}>Anulează</button>
                    </div>
                  ) : (
                    <>
                      <a className={styles.linkAnchor} href={link.url} target="_blank" rel="noopener noreferrer">
                        {renderIcon(link.icon_type)}
                        <span className={styles.linkTitle}>{link.name}</span>
                      </a>
                      {isAdmin && (
                        <div className={styles.cardActions}>
                          <button className={styles.iconBtnInfo}  onClick={() => startEdit(link)} title="Editează">✎</button>
                          <button className={styles.iconBtnDanger} onClick={() => handleDeleteLink(link.id)} title="Șterge">✕</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {isAdmin && (
  <section className={styles.addCard}>
    <div className={styles.addCardHeader}>
      <div>
        <h3 className={styles.addTitle}>Adaugă link</h3>
        <p className={styles.addSubtitle}>Creează rapid o cameră sau un link social.</p>
      </div>
    </div>

    <form className={styles.addForm} onSubmit={handleAddLink}>
      {/* Tip */}
      <div className={styles.field}>
        <span className={styles.iconLeft}>📂</span>
        <select
          className={`${styles.inputBase} ${styles.selectBase}`}
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          aria-label="Tip link"
        >
          <option value="camera">Cameră</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <label className={styles.floatingLabel}>Tip</label>
      </div>

      {/* Nume */}
      <div className={styles.field}>
        <span className={styles.iconLeft}>🏷️</span>
        <input
          type="text"
          className={styles.inputBase}
          placeholder=" "
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <label className={styles.floatingLabel}>Nume</label>
      </div>

      {/* URL */}
      <div className={styles.fieldWide}>
        <span className={styles.iconLeft}>🔗</span>
        <input
          type="url"
          className={styles.inputBase}
          placeholder=" "
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          inputMode="url"
          pattern="https?://.*"
          required
        />
        <label className={styles.floatingLabel}>URL (https://…)</label>
        <small className={styles.hint}>Folosește un URL complet (ex.: https://exemplu.com)</small>
      </div>

      {/* Actiune */}
      <div className={styles.actionsRow}>
        <button className={styles.btnGhost} type="button" onClick={() => { setNewName(''); setNewUrl(''); }}>
          Resetează
        </button>
        <button className={styles.btnPrimary} type="submit" disabled={savingNew}>
          {savingNew ? 'Se adaugă…' : 'Adaugă'}
        </button>
      </div>
    </form>
  </section>
)}

      <EditAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentContent={announcementText}
        onSave={handleSaveAnnouncement}
      />
    </Layout>
  );
}

export default HomepageDispecer;