// src/components/depot/components/DepotPagination.jsx
import styles from "../DepotPage.module.css";

export default function DepotPagination({ totalPages, currentPage, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.paginationContainer}>
      <button
        className={styles.paginationButton}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        Anterior
      </button>

      <span className={styles.pageIndicator}>
        Página {currentPage} de {totalPages}
      </span>

      <button
        className={styles.paginationButton}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        Siguiente
      </button>
    </div>
  );
}