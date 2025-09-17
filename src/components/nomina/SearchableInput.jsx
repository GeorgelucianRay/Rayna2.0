// src/components/nomina/SearchableInput.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import styles from './Nominas.module.css';

/**
 * Input cu căutare + listă rezultate.
 * Props:
 *  - value: string
 *  - onChange: (v:string) => void
 *  - onLocationSelect: (name:string) => void
 *  - placeholder?: string
 *  - closeOnSelect?: boolean  // << nou: închide dropdownul la select
 */
export default function SearchableInput({
  value,
  onChange,
  onLocationSelect,
  placeholder = 'Buscar…',
  closeOnSelect = false,
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // deschide la focus
  const onFocus = () => setOpen(true);

  // clic în afara -> închide
  useEffect(() => {
    const handler = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // căutare debounced
  const [q, setQ] = useState(value || '');
  useEffect(() => setQ(value || ''), [value]);

  useEffect(() => {
    const id = setTimeout(async () => {
      const query = q?.trim();
      if (!query) { setResults([]); return; }
      setLoading(true);
      try {
        const tables = ['gps_clientes', 'gps_parkings', 'gps_servicios', 'gps_terminale'];
        const lookups = await Promise.all(
          tables.map(t =>
            supabase.from(t)
              .select('nombre')
              .ilike('nombre', `%${query}%`)
              .limit(10)
          )
        );
        const items = [];
        lookups.forEach(({ data }) => {
          (data || []).forEach(r => { if (r?.nombre) items.push(r.nombre); });
        });
        // dedupe + sort
        const uniq = Array.from(new Set(items)).sort((a,b)=>a.localeCompare(b));
        setResults(uniq.slice(0, 20));
      } catch (e) {
        console.error('Search error:', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  const selectItem = (name) => {
    onLocationSelect?.(name);
    onChange?.(name);
    if (closeOnSelect) {
      setOpen(false);
      // închide tastatura pe iOS
      inputRef.current?.blur();
    }
  };

  return (
    <div className={styles.searchableInputWrapper} ref={wrapRef}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); onChange?.(e.target.value); }}
        onFocus={onFocus}
        placeholder={placeholder}
        className={styles.numericDisplay ? '' : ''}
        style={{
          width: '100%',
          padding: '.75rem',
          borderRadius: '.5rem',
          border: '1px solid rgba(255,255,255,.25)',
          background: 'rgba(255,255,255,.1)',
          color: '#fff',
        }}
      />
      {open && (results.length > 0 || loading) && (
        <div className={styles.searchResults}>
          {loading && <div className={styles.searchResultItem}>Buscando…</div>}
          {!loading && results.map((r, i) => (
            <div
              key={r + i}
              className={styles.searchResultItem}
              onClick={() => selectItem(r)}
            >
              {r}
            </div>
          ))}
          {!loading && results.length === 0 && (
            <div className={styles.searchResultItem}>Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}