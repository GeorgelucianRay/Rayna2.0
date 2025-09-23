// src/components/GpsPro/ui/ItemCard.jsx
import React from 'react';
import styles from '../GpsPro.module.css';

export default function ItemCard({ item, onClick, canEdit, onEdit }) {
  return (
    <div
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e)=> (e.key==='Enter'||e.key===' ') && onClick()}
    >
      <div className={styles.cardImgWrap}>
        <img
          src={item.link_foto || 'https://placehold.co/800x600/0b1f3a/99e6ff?text=Sin+Foto'}
          alt={`Foto de ${item.nombre}`}
          onError={(e)=>{ e.currentTarget.src = 'https://placehold.co/800x600/0b1f3a/99e6ff?text=Error'; }}
        />
      </div>
      <div className={styles.cardOverlay}>
        <h3 className={styles.cardTitle}>{item.nombre}</h3>
        {canEdit && (
          <button
            className={styles.cardEdit}
            onClick={(e)=>{ e.stopPropagation(); onEdit(item); }}
            aria-label="Editar"
            title="Editar"
          >
            ✎
          </button>
        )}
      </div>
    </div>
  );
}