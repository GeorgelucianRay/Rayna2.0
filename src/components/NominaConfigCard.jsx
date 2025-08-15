// src/components/NominaConfigCard.jsx
import React, { useState } from 'react';
import styles from './Nominas.module.css';
import { supabase } from '../supabaseClient';

export default function NominaConfigCard({ config, onChange, onSave }) {
  const [loading, setLoading] = useState(false);

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

  const saveConfig = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('config_nomina')
      .upsert(config, { onConflict: ['id'] }); // ajustează coloanele
    setLoading(false);
    if (!error) {
      onSave();
    } else {
      console.error('Eroare salvare config:', error);
    }
  };

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

      <button
        className={styles.calculateButton}
        onClick={saveConfig}
        disabled={loading}
      >
        {loading ? 'Salvando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}