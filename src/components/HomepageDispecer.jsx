import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './HomepageDispecer.module.css';
import EditAnnouncementModal from './EditAnnouncementModal'; // Asigură-te că acest fișier există

// --- Iconițe SVG ---
const RssIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>;

function HomepageDispecer() {
  const [announcementText, setAnnouncementText] = useState("Cargando anuncios...");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementText("Actualizando anuncios...");
    try {
        const { data, error } = await supabase.from('anuncios').select('content').eq('id', 1).single();
        if (error) throw error;
        if (data) {
            setAnnouncementText(data.content);
        }
    } catch (error) {
        setAnnouncementText('No se pudieron cargar los anuncios.');
        console.error("Error fetching announcements:", error);
    }
  }, []);

  const handleSaveAnnouncement = async (newContent) => {
    if (newContent.trim() === announcementText.trim()) {
        setIsModalOpen(false);
        return;
    }

    try {
        const { error } = await supabase
            .from('anuncios')
            .update({ content: newContent })
            .eq('id', 1);
        if (error) throw error;
        
        alert('¡Anuncio actualizado con éxito!');
        setAnnouncementText(newContent);
        setIsModalOpen(false);
    } catch (error) {
        alert('Error: No se pudieron guardar los cambios.');
        console.error("Error updating announcement:", error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return (
    // Asigurăm că trimitem clasa corectă pentru fundal
    <Layout backgroundClassName={styles.homepageBackground}>
        <div className={styles.announcementsCard}>
          <div className={styles.announcementsHeader}>
            <div className={styles.announcementsHeaderTitle}>
              <RssIcon />
              <h2 className={styles.announcementsTitle}>Anuncios Importantes</h2>
            </div>
            <div className={styles.headerButtons}>
                {/* Butoanele folosesc acum clasele corecte din fișierul CSS */}
                <button onClick={() => setIsModalOpen(true)} className={styles.actionButton}>
                  Editar Anuncio
                </button>
                <button onClick={fetchAnnouncements} className={styles.actionButtonSecondary}>
                  Refrescar
                </button>
            </div>
          </div>
          <div className={styles.announcementsContent}>{announcementText}</div>
        </div>
        
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
