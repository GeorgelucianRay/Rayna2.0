// src/App.jsx
import './index.css';

import { Routes, Route, Navigate, Link } from 'react-router-dom';

// --- Pagina mutată (rămâne la fel) ---
import MiPerfilPage from './pages/MiPerfilPage.jsx';

// --- Toate celelalte componente/pagini rămân în dosarul original 'components' ---
import RaynaHub from './components/chat/RaynaHub.jsx';
import IniciarSesion from './components/IniciarSesion.jsx';
import Registrar from './components/Registrar.jsx';
import RestaurarContrasena from './components/RestaurarContrasena.jsx';
import ActualizarContrasena from './components/ActualizarContrasena.jsx';
import HomepageDispecer from './components/HomepageDispecer.jsx';
import HomepageSofer from './components/HomepageSofer.jsx';

// --- DEPOT (mutate sub components/Depot) ---
import DepotPage from './components/depot/DepotPage';
import SchedulerPage from './components/depot/scheduler/SchedulerPage';
import Map3DPage from './components/depot/map/Map3DPage';

// --- Restul paginilor existente ---
import GpsProPage from './components/GpsPro/GpsProPage.jsx';
import GpsPage from './components/rutas/GpsPage.jsx'; // <- relativ din /src
import CamionPage from './components/CamionPage.jsx';
import RemorcaPage from './components/RemorcaPage.jsx';
import TallerPage from './components/TallerPage.jsx';
import ReparatiiPage from './components/ReparatiiPage.jsx';
import CalculadoraNomina from './components/nomina/CalculadoraNomina';
import VacacionesStandalone from './components/VacacionesStandalone.jsx';
import VacacionesAdminStandalone from './components/VacacionesAdminStandalone.jsx';
import ChoferFinderProfile from './components/ChoferFinderProfile.jsx';

// --- ✅ Admin: pagina Utilizatori ---
import Utilizatori from './pages/admin/Utilizatori.jsx';
// sus, lângă celelalte importuri de pagini
import AdminFeedback from './pages/admin/AdminFeedback.jsx';
import Aprender from "./pages/admin/Aprender";

function App() {
  return (
    <Routes>
      {/* Rute Publice */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<IniciarSesion />} />
      <Route path="/registro" element={<Registrar />} />
      <Route path="/restaurar-contrasena" element={<RestaurarContrasena />} />
      <Route path="/actualizar-contrasena" element={<ActualizarContrasena />} />

      {/* Rute Protejate */}
      <Route path="/rayna-hub" element={<RaynaHub />} />
      <Route path="/dispecer-homepage" element={<HomepageDispecer />} />
      <Route path="/sofer-homepage" element={<HomepageSofer />} />

      {/* ✅ Admin */}
      <Route path="/admin/utilizatori" element={<Utilizatori />} />
      {/* ✅ Admin: Feedback */}
<Route path="/admin/feedback" element={<AdminFeedback />} />
      <Route path="/admin/aprender" element={<Aprender />} />

      {/* DEPOT */}
      <Route path="/depot" element={<DepotPage />} />
      <Route path="/programacion" element={<SchedulerPage />} />
      <Route path="/mapa" element={<Map3DPage />} />

      {/* GPS */}
      <Route path="/gps" element={<GpsPage />} />
      <Route path="/gps-pro" element={<GpsProPage />} />

      {/* Profil */}
      <Route path="/mi-perfil" element={<MiPerfilPage />} />

      {/* Vacaciones */}
      <Route path="/vacaciones-standalone" element={<VacacionesStandalone />} />
      <Route path="/vacaciones-admin" element={<VacacionesAdminStandalone />} />
      <Route path="/vacaciones-admin/:id" element={<VacacionesAdminStandalone />} />

      {/* Vehicule */}
      <Route path="/camion/:id" element={<CamionPage />} />
      <Route path="/remorca/:id" element={<RemorcaPage />} />

      {/* Finder */}
      <Route path="/choferes" element={<Navigate to="/choferes-finder" replace />} />
      <Route path="/choferes-finder" element={<ChoferFinderProfile />} />

      {/* Taller */}
      <Route path="/taller" element={<TallerPage />} />
      <Route path="/reparatii/:type/:id" element={<ReparatiiPage />} />

      {/* Nómina */}
      <Route path="/calculadora-nomina" element={<CalculadoraNomina />} />

      {/* Pagina 404 */}
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