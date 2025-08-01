import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './HomepageDispecer.module.css';

// --- Iconițe SVG ---
const RssIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>;
const TiktokIcon = () => <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.73 7.44v3.86a.7.7 0 0 1-.7.7h-3.86a.7.7 0 0 1-.7-.7V7.44a.7.7 0 0 1 .7-.7h3.86a.7.7 0 0 1 .7.7Z" stroke="white" strokeWidth="1.4"/><path d="M16.17 11.3v8.84a3.5 3.5 0 1 1-3.5-3.5h3.5Z" stroke="white" strokeWidth="1.4"/></svg>;
const WhatsappIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
// NOU: Iconiță pentru butonul de editare
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;


const renderIcon = (iconType) => { /* ... codul existent ... */ };

function HomepageDispecer() {
  const [announcements, setAnnouncements] = useState("Cargando anuncios...");
  const [cameraLinks, setCameraLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

  // NOU: Stări pentru modul de editare
  const [isEditing, setIsEditing] = useState(false);
  const [editableAnnouncements, setEditableAnnouncements] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // ... funcțiile fetchAnnouncements și fetchLinks rămân la fel ...
  }, []);

  // NOU: Funcția pentru a intra în modul de editare
  const handleEditClick = () => {
    setEditableAnnouncements(announcements);
    setIsEditing(true);
  };

  // NOU: Funcția pentru a anula editarea
  const handleCancelClick = () => {
    setIsEditing(false);
  };
  
  // NOU: Funcția pentru a salva modificările
  const handleSaveClick = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('anuncios')
      .update({ content: editableAnnouncements })
      .eq('id', 1);

    if (error) {
      alert('Error al actualizar el anuncio.');
      console.error(error);
    } else {
      setAnnouncements(editableAnnouncements);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  return (
    <Layout backgroundClassName="homepageBackground">
        <div className={styles.announcementsCard}>
          <div className={styles.announcementsHeader}>
            <div className={styles.announcementsHeaderTitle}>
              <RssIcon />
              <h2 className={styles.announcementsTitle}>Anuncios Importantes</h2>
            </div>
            {/* MODIFICAT: Afișare condiționată a butoanelor */}
            <div className={styles.actionsContainer}>
              {isEditing ? (
                <>
                  <button onClick={handleCancelClick} className={`${styles.actionButton} ${styles.cancelButton}`}>Cancelar</button>
                  <button onClick={handleSaveClick} disabled={isSaving} className={`${styles.actionButton} ${styles.saveButton}`}>
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </>
              ) : (
                <button onClick={handleEditClick} className={styles.editButton}>
                  <EditIcon /> Editar
                </button>
              )}
            </div>
          </div>
          {/* MODIFICAT: Afișare condiționată a textului sau a zonei de editare */}
          <div className={styles.announcementsContent}>
            {isEditing ? (
              <textarea
                className={styles.editTextarea}
                value={editableAnnouncements}
                onChange={(e) => setEditableAnnouncements(e.target.value)}
                autoFocus
              />
            ) : (
              announcements
            )}
          </div>
        </div>
        
        {/* ... Restul componentei cu external links ... */}
    </Layout>
  );
}

export default HomepageDispecer;

