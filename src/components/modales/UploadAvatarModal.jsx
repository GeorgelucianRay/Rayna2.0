// UploadAvatarModal.jsx - VERSIUNE CORECTATĂ
import React, { useState, useRef, useEffect } from 'react';
import styles from './UploadAvatarModal.module.css';
import { CloseIcon } from '../ui/Icons';
import { supabase } from '../../supabaseClient';

export default function UploadAvatarModal({ isOpen, onClose, onUploadComplete, userId }) {
  const [photoStep, setPhotoStep] = useState('choice'); // 'choice' | 'preview'
  const [previewURL, setPreviewURL] = useState('');
  const [tempBlob, setTempBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  
  const fileSelfieRef = useRef(null);
  const fileGalRef = useRef(null);

  // Cleanup pentru URL.createObjectURL
  useEffect(() => {
    return () => {
      if (previewURL) {
        URL.revokeObjectURL(previewURL);
      }
    };
  }, [previewURL]);

  const handleClose = () => {
    // Confirmă dacă există imagine nesalvată
    if (photoStep === 'preview' && !isUploading) {
      if (!window.confirm('¿Estás seguro? La imagen no se ha guardado.')) {
        return;
      }
    }
    
    // Cleanup
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
    }
    
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

    // Validare tip fișier
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipo de archivo no permitido. Usa JPEG, PNG, GIF o WebP.');
      return;
    }

    // Verifică dimensiunea (max 32MB pentru imgbb free)
    if (file.size > 32 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 32MB.');
      return;
    }

    // Cleanup URL vechi
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
    }

    setTempBlob(file); 
    const newPreviewURL = URL.createObjectURL(file);
    setPreviewURL(newPreviewURL);
    setPhotoStep('preview');
    setError('');
  };
  
  const uploadToImgBB = async (file) => {
    try {
      console.log('Starting imgBB upload...');
      
      // Convertește în base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Verifică API key
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
      if (!apiKey) {
        throw new Error('ImgBB API key no configurada');
      }

      const formData = new FormData();
      formData.append('image', base64);
      
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Debug logging
      console.log('ImgBB Response:', data);
      
      if (data.success) {
        // ImgBB returnează mai multe URL-uri, folosește display_url care e cel mai stabil
        const imageUrl = data.data.display_url || data.data.url || data.data.image.url;
        console.log('Image URL obtained:', imageUrl);
        
        if (!imageUrl) {
          throw new Error('No se recibió URL de imgBB');
        }
        
        return imageUrl;
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading to imgBB:', err);
      throw err;
    }
  };
  
  const updateSupabaseProfile = async (avatarUrl) => {
    try {
      console.log('Updating Supabase profile...');
      console.log('User ID:', userId);
      console.log('Avatar URL:', avatarUrl);
      
      if (!userId) {
        throw new Error('User ID no disponible');
      }
      
      if (!avatarUrl) {
        throw new Error('Avatar URL no disponible');
      }
      
      // Primero verifica si existe el perfil
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('id', userId)
        .maybeSingle(); // Usa maybeSingle en lugar de single para evitar errores si no existe
      
      console.log('Existing profile:', existingProfile);
      
      let result;
      
      if (!existingProfile) {
        // El perfil no existe, créalo
        console.log('Creating new profile...');
        result = await supabase
          .from('profiles')
          .insert({ 
            id: userId, 
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .select();
      } else {
        // El perfil existe, actualízalo
        console.log('Updating existing profile...');
        result = await supabase
          .from('profiles')
          .update({ 
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select();
      }
      
      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }
      
      console.log('Profile updated successfully:', result.data);
      
      // Verifica que se guardó correctamente
      const { data: verification, error: verifyError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      
      if (verifyError) {
        console.error('Verification error:', verifyError);
      } else {
        console.log('Verified avatar URL in database:', verification.avatar_url);
      }
      
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };
  
  const handleSave = async () => {
    if (!tempBlob) {
      setError('No hay imagen para guardar');
      return;
    }
    
    if (!userId) {
      setError('Error: Usuario no identificado');
      console.error('No userId provided to component');
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    try {
      // 1. Upload a imgBB
      console.log('Step 1: Uploading to imgBB...');
      const imageUrl = await uploadToImgBB(tempBlob);
      
      if (!imageUrl) {
        throw new Error('No se obtuvo URL de la imagen');
      }
      
      console.log('Step 2: Image uploaded successfully:', imageUrl);
      
      // 2. Actualiza Supabase
      console.log('Step 3: Updating Supabase profile...');
      await updateSupabaseProfile(imageUrl);
      
      console.log('Step 4: Profile updated successfully');
      
      // 3. Notifica al componente padre
      if (onUploadComplete) {
        console.log('Step 5: Calling onUploadComplete with URL:', imageUrl);
        onUploadComplete(imageUrl);
      }
      
      // 4. Cierra el modal
      console.log('Step 6: Upload complete, closing modal');
      
      // Reset states antes de cerrar
      if (previewURL) {
        URL.revokeObjectURL(previewURL);
      }
      setPhotoStep('choice');
      setPreviewURL('');
      setTempBlob(null);
      setError('');
      onClose();
      
    } catch (err) {
      console.error('Upload error:', err);
      
      // Mensajes de error más específicos
      if (err.message.includes('network') || err.message.includes('fetch')) {
        setError('Error de conexión. Verifica tu internet.');
      } else if (err.message.includes('User ID')) {
        setError('Error de autenticación. Por favor, vuelve a iniciar sesión.');
      } else if (err.message.includes('imgBB')) {
        setError('Error al subir la imagen. Intenta con otra imagen.');
      } else if (err.message.includes('Supabase')) {
        setError('Error al guardar en la base de datos.');
      } else {
        setError('Error al cargar la imagen. Por favor intenta de nuevo.');
      }
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
          <button 
            className={styles.iconBtn} 
            onClick={handleClose} 
            disabled={isUploading}
            aria-label="Cerrar modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}
          
          {photoStep === 'choice' && (
            <div className={styles.choiceGrid}>
              <button 
                type="button" 
                className={styles.choiceCard} 
                onClick={openNativeSelfie}
                aria-label="Tomar selfie con la cámara"
              >
                <div className={styles.choiceIcon}>📸</div>
                <div className={styles.choiceTitle}>Hacer un selfie</div>
              </button>
              <button 
                type="button" 
                className={styles.choiceCard} 
                onClick={openNativeGallery}
                aria-label="Seleccionar imagen de la galería"
              >
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
                aria-hidden="true"
              />
              <input 
                ref={fileGalRef} 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={onNativePicked}
                aria-hidden="true"
              />
            </div>
          )}

          {photoStep === 'preview' && (
            <div className={styles.previewWrapXL}>
              {previewURL && (
                <img 
                  src={previewURL} 
                  alt="Vista previa de la imagen" 
                  className={styles.previewImg} 
                />
              )}
              {isUploading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.spinner}></div>
                  <p>Cargando...</p>
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
                onClick={() => {
                  setPhotoStep('choice');
                  setError('');
                }}
                disabled={isUploading}
              >
                Volver
              </button>
              <button 
                className={styles.btnPrimary} 
                onClick={handleSave}
                disabled={isUploading}
              >
                {isUploading ? 'Cargando...' : 'Guardar foto'}
              </button>
            </>
          ) : (
            <button 
              className={styles.btnPrimary} 
              onClick={handleClose}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}