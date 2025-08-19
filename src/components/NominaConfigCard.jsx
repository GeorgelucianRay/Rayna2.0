// src/components/NominaConfigCard.jsx
import React, { useState } from 'react';
import styles from './Nominas.module.css';
import { supabase } from '../supabaseClient';

export default function NominaConfigCard({ config, onChange, onSave, userId }) {
  const [loading, setLoading] = useState(false);

  const set = (name, value) => {
    onChange(prev => ({ ...prev, [name]: value === '' ? 0 : Number(value) }));
  };

  const input = (name, label) => (
    <div className={styles.inputGroup}>
      <label>{label}</label>
      <input
        type="number"
        step="0.01"
        value={config[name] === '' ? '' : config[name]}
        onChange={(e) => set(name, e.target.value)}
      />
    </div>
  );

  const saveConfig = async () => {
    if (!userId) {
      console.error('No user ID provided');
      alert('Necesita iniciar sesión para guardar la configuración');
      return;
    }

    setLoading(true);
    
    try {
      // First check if config exists for this user
      const { data: existingData, error: checkError } = await supabase
        .from('config_nomina')
        .select('id')
        .eq('user_id', userId)
        .single();

      let result;
      
      if (existingData && !checkError) {
        // Update existing config
        result = await supabase
          .from('config_nomina')
          .update({
            salario_base: config.salario_base || 0,
            antiguedad: config.antiguedad || 0,
            precio_dia_trabajado: config.precio_dia_trabajado || 0,
            precio_desayuno: config.precio_desayuno || 0,
            precio_cena: config.precio_cena || 0,
            precio_procena: config.precio_procena || 0,
            precio_km: config.precio_km || 0,
            precio_contenedor: config.precio_contenedor || 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        // Insert new config
        result = await supabase
          .from('config_nomina')
          .insert({
            user_id: userId,
            salario_base: config.salario_base || 0,
            antiguedad: config.antiguedad || 0,
            precio_dia_trabajado: config.precio_dia_trabajado || 0,
            precio_desayuno: config.precio_desayuno || 0,
            precio_cena: config.precio_cena || 0,
            precio_procena: config.precio_procena || 0,
            precio_km: config.precio_km || 0,
            precio_contenedor: config.precio_contenedor || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      if (result.error) {
        console.error('Error saving config:', result.error);
        alert('Error al guardar la configuración: ' + result.error.message);
      } else {
        alert('Configuración guardada correctamente');
        onSave();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Error inesperado al guardar la configuración');
    } finally {
      setLoading(false);
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
        {loading ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}