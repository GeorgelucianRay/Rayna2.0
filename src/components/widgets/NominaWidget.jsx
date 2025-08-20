import React, { useState, useEffect, useMemo } from 'react';
// Calea NOUĂ și CORECTĂ
import MiniCalendar from '../ui/MiniCalendar';
import styles from './NominaWidget.module.css';
import { supabase } from '../../supabaseClient'; // Corect - urcă 2 nivele până la src/
import { useAuth } from '../../AuthContext'; // Corect - urcă 2 nivele până la src/
import { useNavigate } from 'react-router-dom';

// Funcție ajutătoare pentru a formata data în spaniolă
const monthLabelES = (d) =>
  d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\p{L}/u, (c) => c.toUpperCase());

export default function NominaWidget() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentDate] = useState(new Date());
  const [pontajData, setPontajData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Încarcă datele din Supabase
  useEffect(() => {
    const loadPontajData = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      try {
        const { data, error } = await supabase
          .from('pontaj_diario')
          .select('*')
          .eq('user_id', profile.id)
          .eq('year', year)
          .eq('month', month)
          .order('day', { ascending: true });

        if (error) {
          console.error('Error loading pontaj data:', error);
        } else {
          setPontajData(data || []);
        }
      } catch (error) {
        console.error('Error loading pontaj data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPontajData();

    // Subscription pentru actualizări în timp real
    if (profile?.id) {
      const subscription = supabase
        .channel(`pontaj_changes_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pontaj_diario',
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            loadPontajData(); // Reîncarcă datele când se schimbă ceva
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id, currentDate]);

  // Calculează summary și marks din datele încărcate
  const { summary, marks } = useMemo(() => {
    let desayunos = 0;
    let totalKm = 0;
    let totalContenedores = 0;
    const workedDays = new Set();
    const marksSet = new Set();

    pontajData.forEach((item) => {
      const hasActivity = 
        item.desayuno || 
        item.cena || 
        item.procena ||
        ((item.km_final || 0) - (item.km_iniciar || 0) > 0) ||
        (item.contenedores || 0) > 0 ||
        (item.suma_festivo || 0) > 0;

      if (hasActivity) {
        workedDays.add(item.day);
        marksSet.add(item.day);
      }

      if (item.desayuno) desayunos++;
      
      const km = (item.km_final || 0) - (item.km_iniciar || 0);
      if (km > 0) totalKm += km;
      
      totalContenedores += (item.contenedores || 0);
    });

    return {
      summary: {
        desayunos: desayunos,
        km: Math.round(totalKm),
        conts: totalContenedores,
        dias: workedDays.size
      },
      marks: marksSet
    };
  }, [pontajData]);

  const handleNavigate = () => {
    navigate('/calculadora-nomina');
  };

  // Dacă nu există profil, nu afișa widget-ul
  if (!profile?.id) {
    return null;
  }

  if (loading) {
    return (
      <section className={`${styles.card} ${styles.widget}`}>
        <div className={styles.widgetHeader}>
          <div className={styles.cardTitle}>Nómina</div>
          <span className={styles.badge}>Beta</span>
        </div>
        <div className={styles.widgetBody}>
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Cargando datos...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.card} ${styles.widget}`}>
      <div className={styles.widgetHeader}>
        <div className={styles.cardTitle}>Nómina</div>
        <span className={styles.badge}>Beta</span>
      </div>
      <div className={styles.widgetBody}>
        {/* Coloana principală cu datele dinamice */}
        <div className={styles.widgetCol}>
          <div className={styles.statLine}>
            <strong>Desayunos:</strong> {summary.desayunos}
          </div>
          <div className={styles.statLine2}>
            Este mes: <b>{summary.km}</b> km • <b>{summary.conts}</b> contenedores • <b>{summary.dias}</b> días
          </div>
          <button className={styles.cta} onClick={handleNavigate}>
            Abrir calculadora
          </button>
        </div>
        {/* Coloana secundară cu mini-calendarul */}
        <div className={styles.widgetColMiniCal}>
          <div className={styles.miniCalTitle}>{monthLabelES(currentDate)}</div>
          <MiniCalendar date={currentDate} marks={marks} />
        </div>
      </div>
    </section>
  );
}