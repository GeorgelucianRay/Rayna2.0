import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './HomepageSofer.module.css'; // Importăm ca modul

// --- Iconițe SVG ---
const RssIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>;
const TiktokIcon = () => <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.73 7.44v3.86a.7.7 0 0 1-.7.7h-3.86a.7.7 0 0 1-.7-.7V7.44a.7.7 0 0 1 .7-.7h3.86a.7.7 0 0 1 .7.7Z" stroke="white" strokeWidth="1.4"/><path d="M16.17 11.3v8.84a3.5 3.5 0 1 1-3.5-3.5h3.5Z" stroke="white" strokeWidth="1.4"/></svg>;
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

function HomepageSofer() {
  const [announcements, setAnnouncements] = useState("Cargando anuncios...");
  const [cameraLinks, setCameraLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase.from('anuncios').select('content').eq('id', 1).single();
      if (error) { setAnnouncements('No se pudieron cargar los anuncios.'); } 
      else if (data) { setAnnouncements(data.content); }
    };
    
    const fetchLinks = async () => {
        const { data, error } = await supabase.from('external_links').select('*').order('display_order');
        if (error) {
            console.error("Error fetching links:", error);
        } else {
            setCameraLinks(data.filter(link => link.icon_type === 'camera'));
            setSocialLinks(data.filter(link => link.icon_type !== 'camera'));
        }
    };

    fetchAnnouncements();
    fetchLinks();
  }, []);

  return (
    <Layout backgroundClassName="homepage-background">
        <div className={styles.announcementsCard}>
          <div className={styles.announcementsHeader}>
            <div className={styles.announcementsHeaderTitle}>
              <RssIcon />
              <h2 className={styles.announcementsTitle}>Anuncios Importantes</h2>
            </div>
          </div>
          <div className={styles.announcementsContent}>{announcements}</div>
        </div>
        
        <div className={styles.externalLinksContainer}>
          <div className={styles.linksRow}>
              {cameraLinks.map(link => {
                  const icon = renderIcon(link.icon_type);
                  return (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.cameraLink}`}>
                          {icon}
                          <span style={{ marginLeft: icon ? '0.5rem' : '0' }}>{link.name}</span>
                      </a>
                  );
              })}
          </div>
          <div className={styles.socialLinksRow}>
              {socialLinks.map(link => {
                  const icon = renderIcon(link.icon_type);
                  const linkStyle = styles[`${link.icon_type}Link`];
                  return (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${linkStyle}`}>
                          {icon}
                          <span style={{ marginLeft: icon ? '0.5rem' : '0' }}>{link.name}</span>
                      </a>
                  );
              })}
          </div>
        </div>
    </Layout>
  );
}

export default HomepageSofer;
