// src/components/ErrorBoundary3D.jsx
import React from 'react';
import styles from './MapStandalone.module.css';

class ErrorBoundary3D extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('3D Scene Error:', error, errorInfo);
    
    // Log to monitoring service if available
    if (window.reportError) {
      window.reportError({
        error: error.toString(),
        errorInfo,
        component: '3D Map',
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback}>
          <h2>Error en el Mapa 3D</h2>
          <p>No se pudo cargar la visualización 3D.</p>
          <details style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
            <summary>Detalles técnicos</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
          <button 
            className={styles.primary} 
            onClick={() => window.location.href = '/depot'}
          >
            Volver al Depot
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary3D;

// Usage in MapPage:
// Wrap your MapPage content with this boundary:
// <ErrorBoundary3D>
//   <MapPage />
// </ErrorBoundary3D>
