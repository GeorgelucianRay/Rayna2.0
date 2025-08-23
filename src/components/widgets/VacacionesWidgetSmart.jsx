// src/widgets/VacacionesWidgetSmart.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import VacacionesWidget from './VacacionesWidget';
import { getVacacionesInfo } from '../vacaciones/vacacionesModel';

export default function VacacionesWidgetSmart({ year = new Date().getFullYear(), onNavigate }) {
  const { profile } = useAuth() || {};
  const userId = profile?.id;
  const [info, setInfo] = useState({ total: 0, usadas: 0, pendientes: 0, disponibles: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      try {
        const data = await getVacacionesInfo(userId, year);
        if (alive) setInfo(data);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [userId, year]);

  if (!userId) return null;

  return (
    <VacacionesWidget
      info={info}
      loading={loading}
      onNavigate={onNavigate}
    />
  );
}
