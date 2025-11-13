// src/components/depot/components/DepotPagination.jsx
import React from "react";
import styles from "../DepotPage.module.css";

export default function DepotPagination({
  totalPages,
  currentPage,
  onPageChange,
}) {
  if (!totalPages || totalPages <= 1) return null; // nu mai arătăm bara dacă e o singură pagină

  const goPrev = () => onPageChange(Math.max(1, currentPage - 1));
  const goNext = () => onPageChange(Math.min(totalPages, currentPage + 1));

  return (
    <div className={styles.paginationContainer}>
      <button
        className={styles.paginationButton}
        onClick={goPrev}
        disabled={currentPage === 1}
      >
        Anterior
      </button>
      <span className={styles.pageIndicator}>
        Página {currentPage} de {totalPages}
      </span>
      <button
        className={styles.paginationButton}
        onClick={goNext}
        disabled={currentPage >= totalPages}
      >
        Siguiente
      </button>
    </div>
  );
}