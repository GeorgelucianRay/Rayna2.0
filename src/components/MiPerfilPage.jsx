import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './MiPerfilPage.module.css';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const AlarmIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 8v4l2 2"></path><path d="M19.94 15.5a.5.5 0 0 0 .06.7l.6.6a.5.5 0 0 0 .7-.06l1.42-1.42a.5.5 0 0 0-.06-.7l-.6-.6a.5.5 0 0 0-.7.06z"></path><path d="M4.06 15.5a.5.5 0 0 1-.06.7l-.6.6a.5.5 0 0 1-.7-.06L1.28 15.4a.5.5 0 0 1 .06-.7l.6-.6a.5.5 0 0 1 .7.06z"></path><path d="M12 4V2"></path><path d="M12 22v-2"></path></svg>;

const calculatePersonalExpirations = (profile) => {
    if (!profile) return [];
    const alarms = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const checkDate = (dateString, ownerName, docType) => {
        if (!dateString) return;
        const docDate = new Date(dateString);
        if (docDate < today) {
            const daysAgo = Math.floor((today - docDate) / (1000 * 60 * 60 * 24));
            alarms.push({ message: `El ${docType} para ${ownerName} ha caducado hace ${daysAgo} días.`, days: -daysAgo, expired: true });
        } else if (docDate <= thirtyDaysFromNow) {
            const daysLeft = Math.ceil((docDate - today) / (1000 * 60 * 60 * 24));
            alarms.push({ message: `El ${docType} para ${ownerName} caduca en ${daysLeft} días.`, days: daysLeft, expired: false });
        }
    };

    checkDate(profile.cap_expirare, 'ti', 'Certificado CAP');
    checkDate(profile.carnet_caducidad, 'ti', 'Permiso de Conducir');
    if (profile.tiene_adr) {
        checkDate(profile.adr_caducidad, 'ti', 'Certificado ADR');
    }
    if (profile.camioane) {
        checkDate(profile.camioane.fecha_itv, profile.camioane.matricula, 'ITV del Camión');
    }
    if (profile.remorci) {
        checkDate(profile.remorci.fecha_itv, profile.remorci.matricula, 'ITV del Remolque');
    }
    return alarms.sort((a, b) => a.days - b.days);
};

function MiPerfilPage() {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { user, profile: authProfile, loading, setProfile: setAuthProfile } = useAuth();
    const navigate = useNavigate();
    const [personalAlarms, setPersonalAlarms] = useState([]);
    const [editableProfile, setEditableProfile] = useState(null);

    useEffect(() => {
        if (authProfile) {
            const alarms = calculatePersonalExpirations(authProfile);
            setPersonalAlarms(alarms);
        }
    }, [authProfile]);

    const handleEditClick = () => {
        if (!authProfile) return;
        setEditableProfile({ ...authProfile, new_camion_matricula: '', new_remorca_matricula: '' });
        setIsEditModalOpen(true);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            let camionIdToUpdate = authProfile.camion_id;
            let remorcaIdToUpdate = authProfile.remorca_id;

            if (!camionIdToUpdate && editableProfile.new_camion_matricula) {
                const { data: newCamion, error } = await supabase.from('camioane').insert({ matricula: editableProfile.new_camion_matricula }).select().single();
                if (error) throw error;
                camionIdToUpdate = newCamion.id;
            }

            if (!remorcaIdToUpdate && editableProfile.new_remorca_matricula) {
                const { data: newRemorca, error } = await supabase.from('remorci').insert({ matricula: editableProfile.new_remorca_matricula }).select().single();
                if (error) throw error;
                remorcaIdToUpdate = newRemorca.id;
            }

            const profileUpdateData = {
                nombre_completo: editableProfile.nombre_completo,
                cap_expirare: editableProfile.cap_expirare || null,
                carnet_caducidad: editableProfile.carnet_caducidad || null,
                tiene_adr: editableProfile.tiene_adr,
                adr_caducidad: editableProfile.tiene_adr ? (editableProfile.adr_caducidad || null) : null,
                camion_id: camionIdToUpdate || null,
                remorca_id: remorcaIdToUpdate || null,
            };

            const { error: profileError } = await supabase.from('profiles').update(profileUpdateData).eq('id', user.id);
            if (profileError) throw profileError;
            
            const { data: updatedProfile } = await supabase.from('profiles').select('*, camioane:camion_id(*), remorci:remorca_id(*)').eq('id', user.id).maybeSingle();
            setAuthProfile(updatedProfile);

            alert('Perfil actualizado con éxito!');
            setIsEditModalOpen(false);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    const handleVehicleClick = (vehicleId, type) => {
        if (!vehicleId) return;
        if (type === 'camion') navigate(`/camion/${vehicleId}`);
        // Aici am schimbat 'remorca' in 'remolque' pentru consistenta, desi nu este vizibil
        else if (type === 'remolque') navigate(`/remorca/${vehicleId}`);
    };

    if (loading || !authProfile) {
        return <div className={styles.loadingScreen}>Cargando...</div>;
    }

    return (
        <Layout backgroundClassName="profile-background">
            <div className={styles.profileHeader}>
                <h1>Mi Perfil</h1>
                <button className={styles.editProfileButton} onClick={handleEditClick}><EditIcon /> Editar Perfil</button>
            </div>

            {personalAlarms.length > 0 && (
                <div className={styles.alarmSection}>
                    <div className={styles.alarmHeader}><AlarmIcon /><h3>Mis Alertas de Caducidad</h3></div>
                    <ul>
                        {personalAlarms.map((alarm, index) => (
                            <li key={index} className={alarm.expired ? styles.expired : ''}>{alarm.message}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className={styles.profileGrid}>
                <div className={styles.profileCard}><h3>Nombre</h3><p>{authProfile.nombre_completo || 'No completado'}</p></div>
                <div className={styles.profileCard}><h3>Caducidad CAP</h3><p>{authProfile.cap_expirare || 'N/A'}</p></div>
                <div className={styles.profileCard}><h3>Caducidad Carnet</h3><p>{authProfile.carnet_caducidad || 'N/A'}</p></div>
                <div className={styles.profileCard}><h3>Certificado ADR</h3><p>{authProfile.tiene_adr ? `Sí, caduca: ${authProfile.adr_caducidad || 'N/A'}` : 'No'}</p></div>
                <div className={`${styles.profileCard} ${styles.vehicleLink}`} onClick={() => handleVehicleClick(authProfile.camion_id, 'camion')}><h3>Camión</h3><p>{authProfile.camioane?.matricula || 'No asignado'}</p></div>
                <div className={`${styles.profileCard} ${styles.vehicleLink}`} onClick={() => handleVehicleClick(authProfile.remorca_id, 'remolque')}><h3>Remolque</h3><p>{authProfile.remorci?.matricula || 'No asignado'}</p></div>
            </div>

            {isEditModalOpen && editableProfile && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Editar Perfil</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className={styles.closeButton}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleProfileUpdate} className={styles.modalBody}>
                            <div className={styles.inputGroup}><label>Nombre Completo</label><input type="text" value={editableProfile.nombre_completo || ''} onChange={(e) => setEditableProfile({...editableProfile, nombre_completo: e.target.value})} /></div>
                            <div className={styles.inputGroup}><label>Caducidad CAP</label><input type="date" value={editableProfile.cap_expirare || ''} onChange={(e) => setEditableProfile({...editableProfile, cap_expirare: e.target.value})} /></div>
                            <div className={styles.inputGroup}><label>Caducidad Carnet</label><input type="date" value={editableProfile.carnet_caducidad || ''} onChange={(e) => setEditableProfile({...editableProfile, carnet_caducidad: e.target.value})} /></div>
                            <div className={styles.inputGroup}><label>¿Tiene ADR?</label><select value={editableProfile.tiene_adr} onChange={(e) => setEditableProfile({...editableProfile, tiene_adr: e.target.value === 'true'})}><option value={false}>No</option><option value={true}>Sí</option></select></div>
                            {editableProfile.tiene_adr && (<div className={styles.inputGroup}><label>Caducidad ADR</label><input type="date" value={editableProfile.adr_caducidad || ''} onChange={(e) => setEditableProfile({...editableProfile, adr_caducidad: e.target.value})} /></div>)}
                            
                            {!authProfile.camion_id ? (
                                <div className={styles.inputGroup}><label>Matrícula Camión</label><input type="text" placeholder="Introduce la matrícula..." value={editableProfile.new_camion_matricula} onChange={(e) => setEditableProfile({...editableProfile, new_camion_matricula: e.target.value.toUpperCase()})} /></div>
                            ) : (<div className={styles.inputGroup}><label>Camión Asignado</label><input type="text" value={authProfile.camioane?.matricula} disabled /></div>)}

                            {!authProfile.remorca_id ? (
                                <div className={styles.inputGroup}><label>Matrícula Remolque</label><input type="text" placeholder="Introduce la matrícula..." value={editableProfile.new_remorca_matricula} onChange={(e) => setEditableProfile({...editableProfile, new_remorca_matricula: e.target.value.toUpperCase()})} /></div>
                            ) : (<div className={styles.inputGroup}><label>Remolque Asignado</label><input type="text" value={authProfile.remorci?.matricula} disabled /></div>)}

                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}>Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default MiPerfilPage;
