import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import styles from './Layout.module.css';
import { MENU_BY_ROLE, HUB_ROUTE, HUB_IMG, getAccent } from '../navigation/menuConfig';

const icons = {
  bell:   (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  home:   (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 7v10a2 2 0 0 1-2 2h-5v-6H10v6H5a2 2 0 0 1-2-2V10l9-7z"/></svg>),
  depot:  (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M3 7l9-4 9 4v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm4 3h10v8H7v-8zM9 5.9l3-1.3 3 1.3V7H9V5.9z"/></svg>),
  profile:(p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z"/></svg>),
  users:  (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 1a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-6 1.7-6 4v2h8v-2c0-1.2.5-2.2 1.3-3A8 8 0 0 0 8 14Zm8 0a6 6 0 0 0-4.8 2.3A4.4 4.4 0 0 0 10 20v2h12v-2c0-2.3-2.7-4-6-4Z"/></svg>),
  gps:    (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a1 1 0 0 1 1 1v2a7 7 0 0 1 6 6h2a1 1 0 0 1 0 2h-2a7 7 0 0 1-6 6v2a1 1 0 0 1-2 0v-2a7 7 0 0 1-6-6H2a1 1 0 0 1 0-2h2a7 7 0 0 1 6-6V3a1 1 0 0 1 1-1Zm0 6a4 4 0 1 0 4 4 4 4 0 0 0-4-4Z"/></svg>),
  wrench: (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M21 7.5a5.5 5.5 0 0 1-7.8 5L6 19.7 4.3 18 12.2 10a5.5 5.5 0 1 1 8.8-2.5Z"/></svg>),
  logout: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>),
  menu:   (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>),
  close:  (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>),
  calc:   (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1 4h10v3H7V6Zm0 5h3v3H7v-3Zm4 0h3v3h-3v-3Zm4 0h3v3h-3v-3ZM7 15h3v3H7v-3Zm4 0h7v3h-7v-3Z"/></svg>),
  books:  (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9v2h2V4a2 2 0 0 0-2-2Zm0 16H9V4h9Zm-11 0H4V4h3Zm0 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2Z"/>
    </svg>
  ),
};
const Icon = ({ name, className }) => {
  const C = icons[name] || (() => null);
  return <C className={className} width="24" height="24" />;
};

const Navbar = ({ open, onOpen, onClose }) => {
  const { pathname } = useLocation();
  const { user, profile, alarms } = useAuth();
  const navigate = useNavigate();

  const role = profile?.role;
  const items = role ? (MENU_BY_ROLE[role] || []) : [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Header fix: mereu deasupra oricărui overlay */}
      <header className={`${styles.header} ${styles.headerTransparent}`} style={{ zIndex: 4000 }}>
        <button type="button" onClick={onOpen} className={styles.menuButtonHeader} aria-label="Deschide meniul">
          <Icon name="menu" />
        </button>
      </header>

      {/* Meniu lateral controlat 100% de prop-ul `open` */}
      {role && (
        <>
          <aside className={`${styles.navMenu} ${open ? styles.navMenuOpen : ''}`}>
            <div className={styles.navHeader}>
              <Link to={HUB_ROUTE} className={styles.hubButton} onClick={onClose}>
                <img src={HUB_IMG} alt="Rayna Hub" className={styles.hubLogo} draggable="false" />
              </Link>
              <div className={styles.headerIcons}>
                {alarms?.length > 0 && (
                  <button type="button" className={styles.notificationBell} onClick={onOpen}>
                    <Icon name="bell" />
                    <span className={styles.notificationBadge}>{alarms.length}</span>
                  </button>
                )}
                <button type="button" onClick={onClose} className={styles.closeButtonMenu} aria-label="Închide meniul">
                  <Icon name="close" />
                </button>
              </div>
            </div>

            <div className={styles.userBlock}>
              <div className={styles.userName}>{profile?.nombre_completo || user?.email || 'Usuario'}</div>
            </div>

            <nav className={styles.navLinks}>
              {items.map(({ id, text, icon }) => {
                const isActive = pathname.startsWith(id);
                const { from, to } = getAccent(id);
                const style = isActive ? ({ '--accent': from, '--accent-strong': to }) : undefined;
                return (
                  <Link key={id} to={id} onClick={onClose} style={style}
                        className={`${styles.navLink} ${isActive ? styles.active : ''}`}>
                    <Icon name={icon} />
                    <span>{text}</span>
                  </Link>
                );
              })}

              {role === "admin" && (
                <Link to="/admin/aprender" onClick={onClose} className={styles.navLink}>
                  <Icon name="books" />
                  <span>Aprender</span>
                </Link>
              )}

              <hr style={{ margin: '1rem 0', borderColor: 'rgba(255,255,255,0.2)' }} />

              <button type="button" className={`${styles.navLink} ${styles.navLinkLogout}`} onClick={handleLogout}>
                <Icon name="logout" />
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </aside>

          {/* Overlay doar când e deschis */}
          {open && <div className={styles.navMenuOverlay} onClick={onClose} />}
        </>
      )}
    </>
  );
};

export default Navbar;