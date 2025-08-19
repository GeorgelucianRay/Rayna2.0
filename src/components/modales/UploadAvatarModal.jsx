import React, { useState, useRef } from 'react';
import styles from '../MiPerfilPage.module.css';
import { CloseIcon } from '../ui/Icons';

// Notă: Logica de upload (resize, conversie, fetch) va fi extrasă ulterior într-un hook custom.
// Pentru moment, o lăsăm aici pentru a finaliza extragerea componentei vizuale.

export default function UploadAvatarModal({ isOpen, onClose, onUploadComplete }) {
  const [photoStep, setPhotoStep] = useState('choice'); // 'choice' | 'preview'
  const [previewURL, setPreviewURL] = useState('');
  const [tempBlob, setTempBlob] = useState(null); // Aici vom stoca imaginea procesată
  
  const fileSelfieRef = useRef(null);
  const fileGalRef = useRef(null);

  const handleClose = () => {
    // Resetăm starea internă la închidere
    setPhotoStep('choice');
    setPreviewURL('');
    setTempBlob(null);
    onClose(); // Apelăm funcția primită de la părinte
  };

  const openNativeSelfie = () => fileSelfieRef.current?.click();
  const openNativeGallery = () => fileGalRef.current?.click();

  const onNativePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aici ar intra logica de procesare a imaginii (ex: resizeSquare)
    // Momentan, simulăm procesul și creăm un URL de preview
    const blob = file; // În pasul următor, aici vom redimensiona imaginea
    setTempBlob(blob);
    setPreviewURL(URL.createObjectURL(blob));
    setPhotoStep('preview');
  };
  
  const handleSave = () => {
      // Apelăm funcția onUploadComplete cu fișierul Blob procesat
      // și lăsăm componenta părinte să se ocupe de upload.
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
