import React, { useState, useEffect } from 'react';
import styles from './EditProfileModal.module.css';
import { CloseIcon } from '../ui/Icons';

export default function EditProfileModal({ isOpen, onClose, profile, onSave }) {
  const [editableProfile, setEditableProfile] = useState(null);

  useEffect(() => {
    if (profile && isOpen) {
      setEditableProfile({
        ...profile,
        new_camion_matricula: '',
        new_remorca_matricula: '',
      });
    }
  }, [profile, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'tiene_adr') {
      finalValue = value === 'true';
    } else if (name.includes('matricula')) {
      finalValue = value.toUpperCase();
    }
    
    setEditableProfile(p => ({ ...p, [name]: finalValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editableProfile);
  };
  
  if (!isOpen || !editableProfile) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Editar perfil</h3>
          <button className={styles.iconBtn} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label>Nombre completo</label>
            <input
              type="text"
              name="nombre_completo"
              value={editableProfile.nombre_completo || ''}
              onChange={handleChange}
            />
          </div>
          <div className={styles.grid2}>
            <div className={styles.inputGroup}>
              <label>Caducidad CAP</label>
              <input
                type="date"
                name="cap_expirare"
                value={editableProfile.cap_expirare || ''}
                onChange={handleChange}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Caducidad carnet</label>
              <input
                type="date"
                name="carnet_caducidad"
                value={editableProfile.carnet_caducidad || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.inputGroup}>
              <label>¿Tiene ADR?</label>
              <select name="tiene_adr" value={String(!!editableProfile.tiene_adr)} onChange={handleChange}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </div>
            {editableProfile.tiene_adr && (
              <div className={styles.inputGroup}>
                <label>Caducidad ADR</label>
                <input
                  type="date"
                  name="adr_caducidad"
                  value={editableProfile.adr_caducidad || ''}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {!profile.camion_id ? (
            <div className={styles.inputGroup}>
              <label>Matrícula camión</label>
              <input
                type="text"
                name="new_camion_matricula"
                placeholder="Introduce la matrícula…"
                value={editableProfile.new_camion_matricula}
                onChange={handleChange}
              />
            </div>
          ) : ( 
            <div className={styles.inputGroup}>
              <label>Camión asignado</label>
              <input type="text" value={profile.camioane?.matricula || ''} disabled />
            </div> 
          )}
          
          {!profile.remorca_id ? (
            <div className={styles.inputGroup}>
              <label>Matrícula remolque</label>
              <input
                type="text"
                name="new_remorca_matricula"
                placeholder="Introduce la matrícula…"
                value={editableProfile.new_remorca_matricula}
                onChange={handleChange}
              />
            </div>
          ) : ( 
            <div className={styles.inputGroup}>
              <label>Remolque asignado</label>
              <input type="text" value={profile.remorci?.matricula || ''} disabled />
            </div> 
          )}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary}>
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
