// src/components/nomina/SearchableInput.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import styles from './Nominas.module.css';

// Hook custom pentru a întârzia căutarea (debounce)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchableInput({ value, onChange, placeholder, onLocationSelect }) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Așteaptă 300ms după ce utilizatorul nu mai tastează
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value); // Sincronizează cu valoarea primită de la părinte (ex: după selecția GPS)
  }, [value]);

  useEffect(() => {
    const searchLocations = async () => {
      if (debouncedSearchTerm.length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      const tableNames = ['gps_clientes', 'gps_parkings', 'gps_servicios', 'gps_terminale'];
      const promises = tableNames.map(table =>
        supabase.from(table).select('nombre').ilike('nombre', `%${debouncedSearchTerm}%`).limit(5)
      );

      try {
        const results = await Promise.all(promises);
        const allNames = new Set();
        results.forEach(res => {
          if (res.data) {
            res.data.forEach(item => allNames.add(item.nombre));
          }
        });
        setResults(Array.from(allNames));
      } catch (error) {
        console.error("Error searching locations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    searchLocations();
  }, [debouncedSearchTerm]);

  // Ascunde rezultatele dacă se dă click în afara componentei
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);


  const handleSelect = (name) => {
    setSearchTerm(name);
    onLocationSelect(name); // Trimite valoarea selectată componentei părinte
    setResults([]);
  };

  return (
    <div className={styles.searchableInputWrapper} ref={wrapperRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onChange(e.target.value); // Notifică părintele de fiecare schimbare
        }}
        placeholder={placeholder}
      />
      {isLoading && <div className={styles.searchResults}><em>Căutare...</em></div>}
      {results.length > 0 && (
        <div className={styles.searchResults}>
          {results.map((name, index) => (
            <div key={index} className={styles.searchResultItem} onClick={() => handleSelect(name)}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
