import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import './HomepageDispecer.css';

// --- Iconițe SVG ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const RssIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>;
const InstagramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>;
const TiktokIcon = () => <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.73 7.44v3.86a.7.7 0 0 1-.7.7h-3.86a.7.7 0 0 1-.7-.7V7.44a.7.7 0 0 1 .7-.7h3.86a.7.7 0 0 1 .7.7Z" stroke="white" strokeWidth="1.4"/><path d="M16.17 11.3v8.84a3.5 3.5 0 1 1-3.5-3.5h3.5Z" stroke="white" strokeWidth="1.4"/></svg>;
const WhatsappIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;

const renderIcon = (iconType) => {
    switch (iconType) {
        case 'instagram': return <InstagramIcon />;
        case 'tiktok': return <TiktokIcon />;
        case 'whatsapp': return <WhatsappIcon />;
        case 'camera': return null; // Am eliminat pictograma
        default: return null;
    }
};

function HomepageDispecer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState("Cargando anuncios...");
  const [editableContent, setEditableContent] = useState("");
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

  const openModal = () => {
    setEditableContent(announcements);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('anuncios').update({ content: editableContent, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', 1);
    if (error) { alert(`Error al actualizar: ${error.message}`); } 
    else {
      alert('Anuncios actualizados!');
      setAnnouncements(editableContent);
      setIsModalOpen(false);
    }
  };

  return (
    <Layout backgroundClassName="homepage-background">
        <main className="main-content">
          <div className="announcements-card">
            <div className="announcements-header"><div className="announcements-header-title"><RssIcon /><h2 className="announcements-title">Anuncios Importantes</h2></div><button className="update-button" onClick={openModal}>Actualizar</button></div>
            <div className="announcements-content" style={{ whiteSpace: 'pre-wrap' }}>{announcements}</div>
          </div>
          <div className="external-links-container">
            <div className="links-row">
                {cameraLinks.map(link => {
                    const icon = renderIcon(link.icon_type);
                    return (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={`social-link ${link.icon_type}-link`}>
                            {icon}
                            <span style={{ marginLeft: icon ? '0.5rem' : '0' }}>{link.name}</span>
                        </a>
                    );
                })}
            </div>
            <div className="social-links-row">
                {socialLinks.map(link => {
                    const icon = renderIcon(link.icon_type);
                    return (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={`social-link ${link.icon_type}-link`}>
                            {icon}
                            <span style={{ marginLeft: icon ? '0.5rem' : '0' }}>{link.name}</span>
                        </a>
                    );
                })}
            </div>
          </div>
        </main>
        {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header"><h3 className="modal-title">Actualizar Anuncios</h3><button onClick={() => setIsModalOpen(false)} className="menu-button"><CloseIcon /></button></div>
                <div className="modal-body"><textarea value={editableContent} onChange={(e) => setEditableContent(e.target.value)} /></div>
                <div className="modal-footer"><button className="modal-button secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button><button className="modal-button primary" onClick={handleSave}>Guardar Cambios</button></div>
              </div>
            </div>
        )}
    </Layout>
  );
}

export default HomepageDispecer;