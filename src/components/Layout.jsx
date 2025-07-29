import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import styles from './Layout.module.css'; // MODIFICARE CRITICĂ: Importăm ca modul
import UpdatePrompt from './UpdatePrompt';

// --- Iconițe SVG ---
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 O 0 1-3.46 0"></path></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const DepotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19H2a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z"></path><path d="M14 5v14"></path><path d="M6 5v14"></path><path d="M10 5v14"></path><path d="M18 5v14"></path></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const GpsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const WrenchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;

const NavLink = ({ to, icon, text, isLogout = false, onClick, isActive }) => {
    const linkClasses = [
        styles.navLink,
        isLogout ? styles.navLinkLogout : '',
        isActive ? styles.active : ''
    ].join(' ');

    return (
        <Link to={to} className={linkClasses} onClick={onClick}>
            {icon}
            <span>{text}</span>
        </Link>
    );
};

const Layout = ({ children, backgroundClassName }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const location = useLocation();
    const { user, profile, alarms } = useAuth();
    const navigate = useNavigate();

    const soferMenu = [
        { id: '/sofer-homepage', icon: <HomeIcon />, text: 'Homepage' },
        { id: '/gps', icon: <GpsIcon />, text: 'GPS' },
        { id: '/mi-perfil', icon: <ProfileIcon />, text: 'Mi Perfil' },
    ];
    const dispecerMenu = [
        { id: '/dispecer-homepage', icon: <HomeIcon />, text: 'Homepage' },
        { id: '/depot', icon: <DepotIcon />, text: 'Depot' },
        { id: '/choferes', icon: <UsersIcon />, text: 'Choferes' },
        { id: '/gps', icon: <GpsIcon />, text: 'GPS' },
        { id: '/taller', icon: <WrenchIcon />, text: 'Taller' },
    ];
    const mecanicMenu = [
        { id: '/taller', icon: <WrenchIcon />, text: 'Taller' },
        { id: '/depot', icon: <DepotIcon />, text: 'Depot' },
    ];

    let navLinksData = [];
    if (profile?.role === 'sofer') {
        navLinksData = soferMenu;
    } else if (profile?.role === 'mecanic') {
        navLinksData = mecanicMenu;
    } else if (profile?.role === 'dispecer') {
        navLinksData = dispecerMenu;
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const wrapperClass = [
        styles.layoutWrapper,
        isMenuOpen ? styles.menuOpen : '',
        backgroundClassName ? styles.hasBackground : '',
        backgroundClassName ? styles[backgroundClassName] : ''
    ].join(' ');

    return (
        <div className={wrapperClass}>
            <aside className={styles.navMenu}>
                <div className={styles.navHeader}>
                    <div>
                        <h2 className={styles.navTitle}>Rayna</h2>
                        {user && <p className={styles.userEmail}>{user.email}</p>}
                    </div>
                    <div className={styles.headerIcons}>
                        {alarms.length > 0 && (
                            <button className={styles.notificationBell} onClick={() => setIsNotificationsOpen(true)}>
                                <BellIcon />
                                <span className={styles.notificationBadge}>{alarms.length}</span>
                            </button>
                        )}
                        <button onClick={() => setIsMenuOpen(false)} className={styles.closeButtonMenu}><CloseIcon /></button>
                    </div>
                </div>
                <nav className={styles.navLinks}>
                    {navLinksData.map((link) => (
                        <NavLink key={link.id} to={link.id} icon={link.icon} text={link.text} isActive={location.pathname === link.id} onClick={() => setIsMenuOpen(false)} />
                    ))}
                    <hr style={{ margin: '1rem 0', borderColor: 'rgba(255,255,255,0.2)' }} />
                    <NavLink to="#" icon={<LogoutIcon />} text="Cerrar Sesión" onClick={handleLogout} isLogout={true} />
                </nav>
            </aside>

            {isMenuOpen && <div className={styles.navMenuOverlay} onClick={() => setIsMenuOpen(false)}></div>}

            <div className={styles.pageContentWrapper}>
                <header className={styles.header}>
                    <button onClick={() => setIsMenuOpen(true)} className={styles.menuButtonHeader}><MenuIcon /></button>
                </header>
                <main className={styles.mainContent}>
                    {children}
                </main>
            </div>

            {isNotificationsOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.notificationsModal}`}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Notificaciones</h3>
                            <button onClick={() => setIsNotificationsOpen(false)} className="close-button"><CloseIcon /></button>
                        </div>
                        <div className={styles.modalBody}>
                            {alarms.length > 0 ? (
                                <ul className={styles.notificationsList}>
                                    {alarms.map((alarm, index) => (
                                        <li key={index} className={alarm.expired ? styles.expired : ''}>{alarm.message}</li>
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
