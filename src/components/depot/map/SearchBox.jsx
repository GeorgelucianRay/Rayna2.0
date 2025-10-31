// src/components/SearchBox.jsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './SearchBox.module.css';

export default function SearchBox({ containers, onContainerSelect, placeholder = 'Caută după matriculă…' }) {
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // filtrează când se tastează
  useEffect(() => {
    const q = value.trim().toLowerCase();
    if (q.length > 1) {
      const filtered = containers
        .filter(c => c.matricula_contenedor?.toLowerCase().includes(q))
        .slice(0, 8);
      setResults(filtered);
      setOpen(filtered.length > 0);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [value, containers]);

  // închide la click în afară
  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDocClick);
    return () => document.removeEventListener('pointerdown', onDocClick);
  }, []);

  const handleSelect = (container) => {
    // 1) trimite containerul în sus (va centra camera + deschide cardul)
    onContainerSelect?.(container);
    // 2) curăță și închide UI-ul de căutare
    setValue('');
    setResults([]);
    setOpen(false);
  };

  const clear = () => {
    setValue('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className={styles.searchContainer} ref={rootRef}>
      <div className={styles.inputWrap}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => value.trim().length > 1 && results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { clear(); e.currentTarget.blur(); }
          }}
          // iOS: minimizează sugestiile tastaturii
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="search"
          inputMode="text"
        />
        {value.length > 0 && (
          <button className={styles.clearBtn} onClick={clear} aria-label="Șterge căutarea">✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className={styles.resultsList}>
          {results.map((c) => (
            <li
              key={c.id ?? c.matricula_contenedor}
              className={styles.resultItem}
              onClick={() => handleSelect(c)}
            >
              <span className={styles.resultCode}>{c.matricula_contenedor}</span>
              <span className={styles.resultDetails}>{c.posicion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}