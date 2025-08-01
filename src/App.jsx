// src/App.jsx

import { Routes, Route, Navigate, Link } from 'react-router-dom';
import IniciarSesion from './components/IniciarSesion.jsx';
import Registrar from './components/Registrar.jsx';
import RestaurarContrasena from './components/RestaurarContrasena.jsx';
import ActualizarContrasena from './components/ActualizarContrasena.jsx';
import HomepageDispecer from './components/HomepageDispecer.jsx';
import HomepageSofer from './components/HomepageSofer.jsx';
import DepotPage from './components/DepotPage.jsx';
import GpsPage from './components/GpsPage.jsx';
import MiPerfilPage from './components/MiPerfilPage.jsx';
import CamionPage from './components/CamionPage.jsx';
import RemorcaPage from './components/RemorcaPage.jsx';
import ChoferesPage from './components/ChoferesPage.jsx';
import ChoferProfilePage from './components/ChoferProfilePage.jsx';
import TallerPage from './components/TallerPage.jsx';
import ReparatiiPage from './components/ReparatiiPage.jsx'; // <-- AM IMPORTAT NOUA PAGINĂ

function App() {
  return (
    <Routes>
      {/* --- Rute Publice --- */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<IniciarSesion />} />
      <Route path="/registro" element={<Registrar />} />
      <Route path="/restaurar-contrasena" element={<RestaurarContrasena />} />
      <Route path="/actualizar-contrasena" element={<ActualizarContrasena />} />

      {/* --- Rute Protejate --- */}
      <Route path="/dispecer-homepage" element={<HomepageDispecer />} />
      <Route path="/depot" element={<DepotPage />} />
      <Route path="/choferes" element={<ChoferesPage />} />
      <Route path="/chofer/:id" element={<ChoferProfilePage />} />
      <Route path="/taller" element={<TallerPage />} />
      <Route path="/reparatii/:type/:id" element={<ReparatiiPage />} /> {/* <-- AM ADĂUGAT RUTA NOUĂ */}
      
      <Route path="/gps" element={<GpsPage />} />
      <Route path="/mi-perfil" element={<MiPerfilPage />} />
      <Route path="/camion/:id" element={<CamionPage />} />
      <Route path="/remorca/:id" element={<RemorcaPage />} />
      
      <Route path="/sofer-homepage" element={<HomepageSofer />} />
      
      {/* --- Rută 404 (Pagina nu a fost găsită) --- */}
      <Route path="*" element={
        <div className="login-container">
          <div className="login-card text-center">
            <h1 style={{color: '#dc2626', fontSize: '2rem', fontWeight: 'bold'}}>404 - Página no encontrada</h1>
            <p style={{color: '#4b5563', margin: '16px 0'}}>La página que buscas no existe.</p>
            <Link to="/login" className="link-style">Volver a Iniciar Sesión</Link>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;