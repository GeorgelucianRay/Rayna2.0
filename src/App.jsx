// src/App.jsx
import './index.css';

import { Routes, Route, Navigate, Link } from 'react-router-dom';

// --- Pagini existente ---
import RaynaHub from './components/RaynaHub.jsx';
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
import TallerPage from './components/TallerPage.jsx';
import ReparatiiPage from './components/ReparatiiPage.jsx';
import CalculadoraNomina from './components/CalculadoraNomina.jsx';

// --- Noi / actualizate ---
import MapPage from './components/MapPage.jsx';
import SchedulerPage from './components/SchedulerPage.jsx';
import VacacionesStandalone from './components/VacacionesStandalone.jsx';
import VacacionesAdminStandalone from './components/VacacionesAdminStandalone.jsx';
import ChoferFinderProfile from './components/ChoferFinderProfile.jsx';

function App() {
  return (
    <Routes>
      {/* Publice */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<IniciarSesion />} />
      <Route path="/registro" element={<Registrar />} />
      <Route path="/restaurar-contrasena" element={<RestaurarContrasena />} />
      <Route path="/actualizar-contrasena" element={<ActualizarContrasena />} />

      {/* Protejate */}
      <Route path="/rayna-hub" element={<RaynaHub />} />   {/* ✅ NOU */}
      <Route path="/dispecer-homepage" element={<HomepageDispecer />} />
      <Route path="/sofer-homepage" element={<HomepageSofer />} />

      <Route path="/depot" element={<DepotPage />} />
      <Route path="/gps" element={<GpsPage />} />

      <Route path="/mi-perfil" element={<MiPerfilPage />} />

      {/* Vacaciones */}
      <Route path="/vacaciones-standalone" element={<VacacionesStandalone />} /> {/* ✅ MODIFICAT AICI */}
      <Route path="/vacaciones-admin/:id" element={<VacacionesAdminStandalone />} />

      {/* Vehicule */}
      <Route path="/camion/:id" element={<CamionPage />} />
      <Route path="/remorca/:id" element={<RemorcaPage />} />

      {/* Finder unificat */}
      <Route path="/choferes" element={<Navigate to="/choferes-finder" replace />} />
      <Route path="/choferes-finder" element={<ChoferFinderProfile />} />

      {/* Taller / Reparații */}
      <Route path="/taller" element={<TallerPage />} />
      <Route path="/reparatii/:type/:id" element={<ReparatiiPage />} />

      {/* Nómina */}
      <Route path="/calculadora-nomina" element={<CalculadoraNomina />} />

      {/* Extra */}
      <Route path="/mapa" element={<MapPage />} />
      <Route path="/programacion" element={<SchedulerPage />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="container-center">
            <div className="card text-center">
              <h1 className="text-red-600 font-bold text-2xl">404 - Página no encontrada</h1>
              <p className="text-gray-600 mb-4">La página que buscas no existe.</p>
              <Link to="/login" className="text-blue-600 hover-underline">Volver a Iniciar Sesión</Link>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;