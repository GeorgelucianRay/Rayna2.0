import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './HomepageDispecer.module.css';
import EditAnnouncementModal from './EditAnnouncementModal'; // Asigură-te că acest fișier există

// --- Iconițe SVG (neschimbate) ---
const RssIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>;
const TiktokIcon = () => <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.73 7.44v3.86a.7.7 0 0 1-.7.7h-3.86a.7.7 0 0 1-.7-.7V7.44a.7.7 0 0 1 .7-.7h3.86a.7.7 0 0 1 .7.7Z" stroke="currentColor" strokeWidth="1.4"/><path d="M16.17 11.3v8.84a3.5 3.5 0 1 1-3.5-3.5h3.5Z" stroke="currentColor" strokeWidth="1.4"/></svg>;
const WhatsappIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;

const renderIcon = (iconType) => {
    switch (iconType) {
        case 'instagram': return <InstagramIcon />;
        case 'tiktok': return <TiktokIcon />;
        case 'whatsapp': return <WhatsappIcon />;
        case 'camera': return null;
        default: return null;
    }
};

function HomepageDispecer() {
  const [announcementText, setAnnouncementText] = useState("Cargando anuncios...");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cameraLinks, setCameraLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

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
    const fetchLinks = async () => {
        try {
            const { data, error } = await supabase.from('external_links').select('*').order('display_order');
            if (error) throw error;
            setCameraLinks(data.filter(link => link.icon_type === 'camera'));
            setSocialLinks(data.filter(link => link.icon_type !== 'camera'));
        } catch (error) {
            console.error("Error fetching links:", error);
        }
    };
    fetchAnnouncements();
    fetchLinks();
  }, [fetchAnnouncements]);

  return (
    <Layout backgroundClassName={styles.homepageBackground}>
        <div className={styles.announcementsCard}>
          <div className={styles.announcementsHeader}>
            <div className={styles.announcementsHeaderTitle}>
              <RssIcon />
              <h2 className={styles.announcementsTitle}>Anuncios Importantes</h2>
            </div>
            <div className={styles.headerButtons}>
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
        
        <div className={styles.externalLinksContainer}>
            {/* Aici vine codul pentru link-uri, pe care l-am omis pentru claritate */}
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
