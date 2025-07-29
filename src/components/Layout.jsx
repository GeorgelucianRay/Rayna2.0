import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import styles from './Layout.module.css';
import UpdatePrompt from './UpdatePrompt';

// ... Iconițele și componenta NavLink rămân la fel ...

const Layout = ({ children, backgroundClassName }) => {
    // ... logica componentei (useState, useEffect, etc.) rămâne la fel ...

    // MODIFICARE CRITICĂ: Combinăm clasele corect
    const wrapperClass = [
        styles.layoutWrapper,
        isMenuOpen ? styles.menuOpen : '',
        backgroundClassName ? styles.hasBackground : '',
        backgroundClassName || '' // Adaugă direct numele clasei primite
    ].join(' ');

    return (
        <div className={wrapperClass}>
            {/* ... restul JSX-ului (aside, header, main, etc.) rămâne la fel ... */}
        </div>
    );
};

export default Layout;
