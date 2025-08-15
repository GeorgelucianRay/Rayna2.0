// src/components/Layout.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import styles from './Layout.module.css';
import UpdatePrompt from './UpdatePrompt';

/* Icons */
const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);
const HomeIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 7v10a2 2 0 0 1-2 2h-5v-6H10v6H5a2 2 0 0 1-2-2V10l9-7z"/></svg>);
const DepotIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l9-4 9 4v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm4 3h10v8H7v-8zM9 5.9l3-1.3 3 1.3V7H9V5.9z"/></svg>);
const ProfileIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z"/></svg>);
const UsersIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 1a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-6 1.7-6 4v2h8v-2c0-1.2.5-2.2 1.3-3A8 8 0 0 0 8 14Zm8 0a6 6 0 0 0-4.8 2.3A4.4 4.4 0 0 0 10 20v2h12v-2c0-2.3-2.7-4-6-4Z"/></svg>);
const GpsIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a1 1 0 0 1 1 1v2a7 7 0 0 1 6 6h2a1 1 0 0 1 0 2h-2a7 7 0 0 1-6 6v2a1 1 0 0 1-2 0v-2a7 7 0 0 1-6-6H2a1 1 0 0 1 0-2h2a7 7 0 0 1 6-6V3a1 1 0 0 1 1-1Zm0 6a4 4 0 1 0 4 4 4 4 0 0 0-4-4Z"/></svg>);
const WrenchIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 7.5a5.5 5.5 0 0 1-7.8 5L6 19.7 4.3 18 12.2 10a5.5 5.5 0 1 1 8.8-2.5Z"/></svg>);
const LogoutIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>);
const MenuIcon = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>);
const CloseIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>);
const CalculatorIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1 4h10v3H7V6Zm0 5h3v3H7v-3Zm4 0h3v3h-3v-3Zm4 0h3v3h-3v-3ZM7 15h3v3H7v-3Zm4 0h7v3h-7v-3Z"/></svg>);

/* rute & asset */
const HUB_ROUTE = '/rayna-hub';
const HUB_IMG   = '/A8CB7FEF-A63A-444E-8B70-B03426F25960.png';

/* link de meniu cu accent neon când e activ */
const NavLink = ({ to, icon, text, isLogout = false, onClick, isActive, accentFrom, accentTo }) => {
  const inlineStyle = isActive ? ({ '--accent': accentFrom, '--accent-strong': accentTo }) : undefined;
  const cls = [
    styles.navLink,
    isLogout ? styles.navLinkLogout : '',
    isActive ? styles.active : ''
  ].join(' ');
  return (
    <Link to={to} className={cls} onClick={onClick} style={inlineStyle}>
      {icon} <span>{text}</span>
    </Link>
  );
};

const Layout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const location = useLocation();
  const { user, profile, alarms } = useAuth();
  const navigate = useNavigate();
  const { pathname } = location;

  /* accente neon per rută (pentru highlight activ) */
  const accentMap = {
    '/dispecer-homepage': ['#22d3ee', '#06b6d4'],
    '/sofer-homepage': ['#22d3ee', '#06b6d4'],
    '/choferes-finder': ['#a78bfa', '#8b5cf6'],
    '/gps': ['#fb923c', '#f97316'],
    '/taller': ['#38bdf8', '#0ea5e9'],
    '/depot': ['#34d399', '#10b981'],
    '/calculadora-nomina': ['#f59e0b', '#d97706'],
    '/mi-perfil': ['#f472b6', '#ec4899'],
  };
  const getAccent = (routeId) => {
    const [from, to] = accentMap[routeId] || ['#60a5fa', '#3b82f6'];
    return { from, to };
  };

  /* fundaluri (nemodificate) */
  const backgroundMap = {
    '/sofer-homepage': styles.homepageSoferBackground,
    '/dispecer-homepage': styles.homepageSoferBackground,
    '/camion': styles.camionBackground,
    '/remorca': styles.remorcaBackground,
    '/taller': styles.tallerBackground,
    '/choferes-finder': styles.choferesBackground,
    '/choferes': styles.choferesBackground,
    '/mi-perfil': styles.miPerfilBackground,
    '/depot': styles.depotBackground,
    '/gps': styles.gpsBackground,
    '/reparatii': styles.reparatiiBackground,
    '/calculadora-nomina': styles.calculadoraBackground,
    '/vacaciones': styles.miPerfilBackground,
    '/vacaciones-admin': styles.miPerfilBackground,
    '/chofer': styles.miPerfilBackground,
  };
  const getBackgroundClass = () => {
    const matchingPath = Object.keys(backgroundMap)
      .sort((a, b) => b.length - a.length)
      .find(key => pathname.startsWith(key));
    return matchingPath ? backgroundMap[matchingPath] : null;
  };
  const backgroundClassName = getBackgroundClass();

  /* meniuri role-based — FĂRĂ Rayna Hub aici (e sus, în header) */
  const soferMenu = [
    { id: '/sofer-homepage', icon: <HomeIcon />, text: 'Homepage' },
    { id: '/calculadora-nomina', icon: <CalculatorIcon />, text: 'Calculadora Nómina' },
    { id: '/gps', icon: <GpsIcon />, text: 'GPS' },
    { id: '/mi-perfil', icon: <ProfileIcon />, text: 'Mi Perfil' },
  ];
  const dispecerMenu = [
    { id: '/dispecer-homepage', icon: <HomeIcon />, text: 'Homepage' },
    { id: '/depot', icon: <DepotIcon />, text: 'Depot' },
    { id: '/choferes-finder', icon: <UsersIcon />, text: 'Choferes' },
    { id: '/calculadora-nomina', icon: <CalculatorIcon />, text: 'Calculadora Nómina' },
    { id: '/gps', icon: <GpsIcon />, text: 'GPS' },
    { id: '/taller', icon: <WrenchIcon />, text: 'Taller' },
  ];
  const mecanicMenu = [
    { id: '/taller', icon: <WrenchIcon />, text: 'Taller' },
    { id: '/depot', icon: <DepotIcon />, text: 'Depot' },
  ];

  let navLinksData = [];
  if (profile?.role === 'sofer') navLinksData = soferMenu;
  else if (profile?.role === 'mecanic') navLinksData = mecanicMenu;
  else if (profile?.role === 'dispecer') navLinksData = dispecerMenu;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const wrapperClass = [
    styles.layoutWrapper,
    backgroundClassName ? styles.hasBackground : '',
    isMenuOpen ? styles.menuOpen : '',
  ].join(' ');

  return (
    <div className={wrapperClass}>
      {backgroundClassName && (
        <div className={styles.backgroundContainer}>
          <div className={`${styles.backgroundImage} ${backgroundClassName}`} />
          <div className={styles.backgroundOverlay} />
        </div>
      )}

      <aside className={styles.navMenu}>
        {/* HEADER MENIU: buton RaynaHub + iconițe */}
        <div className={styles.navHeader}>
          <Link
            to={HUB_ROUTE}
            className={styles.hubButton}
            onClick={() => setIsMenuOpen(false)}
            aria-label="Rayna Hub"
          >
            <img
              src={HUB_IMG}
              alt="Rayna Hub"
              className={styles.hubLogo}
              draggable="false"
            />
          </Link>
          <div className={styles.headerIcons}>
            {alarms.length > 0 && (
              <button className={styles.notificationBell} onClick={() => setIsNotificationsOpen(true)}>
                <BellIcon />
                <span className={styles.notificationBadge}>{alarms.length}</span>
              </button>
            )}
            <button onClick={() => setIsMenuOpen(false)} className={styles.closeButtonMenu}>
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Numele utilizatorului sub butonul Hub */}
        <div className={styles.userBlock}>
          <div className={styles.userName}>{profile?.nombre_completo || user?.email || 'Usuario'}</div>
        </div>

        {/* LINKURI MENIU */}
        <nav className={styles.navLinks}>
          {navLinksData.map(link => {
            const isActive = pathname.startsWith(link.id);
            const { from, to } = getAccent(link.id);
            return (
              <NavLink
                key={link.id}
                to={link.id}
                icon={link.icon}
                text={link.text}
                isActive={isActive}
                onClick={() => setIsMenuOpen(false)}
                accentFrom={from}
                accentTo={to}
              />
            );
          })}

          <hr style={{ margin: '1rem 0', borderColor: 'rgba(255,255,255,0.2)' }} />

          <NavLink
            to="#"
            icon={<LogoutIcon />}
            text="Cerrar Sesión"
            onClick={handleLogout}
            isLogout={true}
            isActive={false}
          />
        </nav>
      </aside>

      {isMenuOpen && <div className={styles.navMenuOverlay} onClick={() => setIsMenuOpen(false)} />}

      <div className={styles.pageContentWrapper}>
        <header className={`${styles.header} ${backgroundClassName ? styles.headerTransparent : ''}`}>
          <button onClick={() => setIsMenuOpen(true)} className={styles.menuButtonHeader}>
            <MenuIcon />
          </button>
        </header>

        <main className={styles.mainContent}>{children}</main>
      </div>

      {isNotificationsOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.notificationsModal}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Notificaciones</h3>
              <button onClick={() => setIsNotificationsOpen(false)} className="close-button">
                <CloseIcon />
              </button>
            </div>
            <div className={styles.modalBody}>
              {alarms.length > 0 ? (
                <ul className={styles.notificationsList}>
                  {alarms.map((alarm, index) => (
                    <li key={index} className={alarm.expired ? styles.expired : ''}>
                      {alarm.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay notificaciones nuevas.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <UpdatePrompt />
    </div>
  );
};

export default Layout;