// src/components/SearchBox.jsx
import React, { useState, useEffect } from 'react';
import styles from './SearchBox.module.css';

export default function SearchBox({ containers, onContainerSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const filtered = containers.filter(c =>
        c.matricula_contenedor.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered.slice(0, 5)); // Afișăm maxim 5 rezultate
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [searchTerm, containers]);

  const handleSelect = (container) => {
    setSearchTerm(container.matricula_contenedor);
    onContainerSelect(container);
    setIsOpen(false);
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Caută după matriculă..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => searchTerm.length > 1 && setIsOpen(true)}
      />
      {isOpen && results.length > 0 && (
        <ul className={styles.resultsList}>
          {results.map(container => (
            <li
              key={container.id}
              className={styles.resultItem}
              onClick={() => handleSelect(container)}
            >
              {container.matricula_contenedor}
              <span className={styles.resultDetails}>{container.posicion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}