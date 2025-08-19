import React, { useState, useRef } from 'react';
import styles from './UploadAvatarModal.module.css';
import { CloseIcon } from '../ui/Icons';

export default function UploadAvatarModal({ isOpen, onClose, onUploadComplete }) {
  const [photoStep, setPhotoStep] = useState('choice'); // 'choice' | 'preview'
  const [previewURL, setPreviewURL] = useState('');
  const [tempBlob, setTempBlob] = useState(null);
  
  const fileSelfieRef = useRef(null);
  const fileGalRef = useRef(null);

  const handleClose = () => {
    setPhotoStep('choice');
    setPreviewURL('');
    setTempBlob(null);
    onClose();
  };

  const openNativeSelfie = () => fileSelfieRef.current?.click();
  const openNativeGallery = () => fileGalRef.current?.click();

  const onNativePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aici se poate adăuga logica de redimensionare a imaginii dacă este necesar
    setTempBlob(file); 
    setPreviewURL(URL.createObjectURL(file));
    setPhotoStep('preview');
  };
  
  const handleSave = () => {
      if (tempBlob) {
          onUploadComplete(tempBlob);
      }
  }

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Fotografía de perfil</h3>
          <button className={styles.iconBtn} onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <div className={styles.modalBody}>
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
              <input ref={fileSelfieRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={onNativePicked} />
              <input ref={fileGalRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onNativePicked} />
            </div>
          )}

          {photoStep === 'preview' && (
            <div className={styles.previewWrapXL}>
              {previewURL && <img src={previewURL} alt="Vista previa" className={styles.previewImg} />}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {photoStep === 'preview' ? (
            <>
              <button className={styles.btnGhost} onClick={() => setPhotoStep('choice')}>Volver</button>
              <button className={styles.btnPrimary} onClick={handleSave}>Guardar foto</button>
            </>
          ) : (
            <button className={styles.btnPrimary} onClick={handleClose}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}
