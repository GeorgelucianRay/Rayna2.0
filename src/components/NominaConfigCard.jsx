// src/components/nomina/NominaConfigCard.jsx
import React from 'react';
import styles from './Nominas.module.css';

export default function NominaConfigCard({ config, onChange }) {
  const set = (name, value) => {
    onChange(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  const input = (name, label) => (
    <div className={styles.inputGroup}>
      <label>{label}</label>
      <input
        type="number"
        value={config[name] === '' ? '' : config[name]}
        onChange={(e) => set(name, e.target.value)}
      />
    </div>
  );

  return (
    <div className={styles.card}>
      <h3>1. Configuración de Contrato</h3>
      <div className={styles.inputGrid}>
        {input('salario_base', 'Salario Base (€)')}
        {input('antiguedad', 'Antigüedad (€)')}
        {input('precio_dia_trabajado', 'Precio Día Trabajado (€)')}
        {input('precio_desayuno', 'Precio Desayuno (€)')}
        {input('precio_cena', 'Precio Cena (€)')}
        {input('precio_procena', 'Precio Procena (€)')}
        {input('precio_km', 'Precio/km (€)')}
        {input('precio_contenedor', 'Precio Contenedor (€)')}
      </div>
    </div>
  );
}
