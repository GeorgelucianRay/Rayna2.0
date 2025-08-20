// UploadAvatarModal.jsx
import React, { useState, useRef } from 'react';
import styles from './UploadAvatarModal.module.css';
import { CloseIcon } from '../ui/Icons';
import { createClient } from '@supabase/supabase-js';

// Inițializează Supabase client cu variabilele Vite
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function UploadAvatarModal({ isOpen, onClose, onUploadComplete, userId }) {
  const [photoStep, setPhotoStep] = useState('choice'); // 'choice' | 'preview'
  const [previewURL, setPreviewURL] = useState('');
  const [tempBlob, setTempBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  const fileSelfieRef = useRef(null);
  const fileGalRef = useRef(null);

  const handleClose = () => {
    setPhotoStep('choice');
    setPreviewURL('');
    setTempBlob(null);
    setError('');
    onClose();
  };

  const openNativeSelfie = () => fileSelfieRef.current?.click();
  const openNativeGallery = () => fileGalRef.current?.click();

  const onNativePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifică dimensiunea fișierului (max 32MB pentru imgbb free)
    if (file.size > 32 * 1024 * 1024) {
      setError('Imaginea este prea mare. Maxim 32MB.');
      return;
    }

    setTempBlob(file); 
    setPreviewURL(URL.createObjectURL(file));
    setPhotoStep('preview');
    setError('');
  };
  
  const uploadToImgBB = async (file) => {
    try {
      // Convertește fișierul în base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Elimină prefixul "data:image/...;base64,"
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Trimite direct către imgbb API (CORS permis)
      const formData = new FormData();
      formData.append('image', base64);
      
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.data.url; // URL-ul imaginii de pe imgbb
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading to imgbb:', err);
      throw err;
    }
  };
  
  const updateSupabaseProfile = async (avatarUrl) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };
  
  const handleSave = async () => {
    if (!tempBlob) return;
    
    setIsUploading(true);
    setError('');
    
    try {
      // 1. Upload către imgbb direct din browser
      console.log('Uploading to imgbb...');
      const imageUrl = await uploadToImgBB(tempBlob);
      console.log('Image uploaded:', imageUrl);
      
      // 2. Actualizează Supabase
      console.log('Updating Supabase profile...');
      await updateSupabaseProfile(imageUrl);
      console.log('Profile updated successfully');
      
      // 3. Notifică componenta părinte
      if (onUploadComplete) {
        onUploadComplete(imageUrl);
      }
      
      // 4. Închide modalul
      handleClose();
    } catch (err) {
      setError('Eroare la încărcarea imaginii. Te rog încearcă din nou.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Fotografía de perfil</h3>
          <button className={styles.iconBtn} onClick={handleClose} disabled={isUploading}>
            <CloseIcon />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c00',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          {photoStep === 'choice' && (
            <div className={styles.choiceGrid}>
              <button type="button" className={styles.choiceCard} onClick={openNativeSelfie}>
                <div className={styles.choiceIcon}>🤳</div>
                <div className={styles.choiceTitle}>Hacer un selfie</div>
              </button>
              <button type="button" className={styles.choiceCard} onClick={openNativeGallery}>
                <div className={styles.choiceIcon}>🖼️</div>
                <div className={styles.choiceTitle}>Subir desde galería</div>
              </button>
              <input 
                ref={fileSelfieRef} 
                type="file" 
                accept="image/*" 
                capture="user" 
                style={{ display: 'none' }} 
                onChange={onNativePicked} 
              />
              <input 
                ref={fileGalRef} 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={onNativePicked} 
              />
            </div>
          )}

          {photoStep === 'preview' && (
            <div className={styles.previewWrapXL} style={{ position: 'relative' }}>
              {previewURL && (
                <img src={previewURL} alt="Vista previa" className={styles.previewImg} />
              )}
              {isUploading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #3498db',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p style={{ marginTop: '10px' }}>Se încarcă...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {photoStep === 'preview' ? (
            <>
              <button 
                className={styles.btnGhost} 
                onClick={() => setPhotoStep('choice')}
                disabled={isUploading}
              >
                Volver
              </button>
              <button 
                className={styles.btnPrimary} 
                onClick={handleSave}
                disabled={isUploading}
              >
                {isUploading ? 'Se încarcă...' : 'Guardar foto'}
              </button>
            </>
          ) : (
            <button className={styles.btnPrimary} onClick={handleClose}>
              Cerrar
            </button>
          )}
        </div>
        
        {/* Adaugă animația pentru spinner */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}