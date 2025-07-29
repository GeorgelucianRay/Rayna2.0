import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './ChoferProfilePage.module.css'; // Importăm ca modul
import modalStyles from './DepotPage.module.css'; // Refolosim stilurile pentru modal

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;

function ChoferProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [profileData, setProfileData] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editableProfile, setEditableProfile] = useState(null);
    const [camioane, setCamioane] = useState([]);
    const [remorci, setRemorci] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            
            const { data, error } = await supabase
                .from('profiles')
                .select(`*, camioane:camion_id(*), remorci:remorca_id(*)`)
                .eq('id', id)
                .single();
            
            if (error) {
                console.error("Error fetching driver profile:", error);
                alert("No se pudo cargar el perfil del chofer.");
            } else {
                setProfileData(data);
            }

            const { data: camioaneData } = await supabase.from('camioane').select('*');
            const { data: remorciData } = await supabase.from('remorci').select('*');
            setCamioane(camioaneData || []);
            setRemorci(remorciData || []);

            setLoading(false);
        };

        fetchAllData();
    }, [id]);

    const handleEditClick = () => {
        if (!profileData) return;
        setEditableProfile({ ...profileData });
        setIsEditModalOpen(true);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        const { id: profileId, role, camioane, remorci, ...updateData } = editableProfile;
        
        const dataToUpdate = {
            ...updateData,
            camion_id: updateData.camion_id === '' ? null : updateData.camion_id,
            remorca_id: updateData.remorca_id === '' ? null : updateData.remorca_id,
        };

        const { error } = await supabase.from('profiles').update(dataToUpdate).eq('id', profileId);
        if (error) {
            alert(`Error al actualizar el perfil: ${error.message}`);
        } else {
            alert('Perfil del chofer actualizado con éxito!');
            setIsEditModalOpen(false);
            const { data } = await supabase.from('profiles').select(`*, camioane:camion_id(*), remorci:remorca_id(*)`).eq('id', id).single();
            setProfileData(data);
        }
    };
    
    if (loading) {
        return <div className="loading-screen">Cargando...</div>;
    }

    if (!profileData) {
        return (
             <Layout backgroundClassName="profile-background">
                <p style={{color: 'white', textAlign: 'center'}}>No se pudo cargar el perfil del chofer.</p>
             </Layout>
        )
    }

    return (
        <Layout backgroundClassName="profile-background">
            <div className={styles.profileHeader}>
                <h1>Perfil del Chofer</h1>
                <div>
                    <button className={styles.editProfileButton} onClick={handleEditClick}><EditIcon /> Editar Perfil</button>
                    <button onClick={() => navigate('/choferes')} className={styles.backButton} style={{marginLeft: '1rem'}}><BackIcon /> Volver</button>
                </div>
            </div>
            <div className={styles.profileGrid}>
                <div className={styles.profileCard}><h3>Nombre</h3><p>{profileData.nombre_completo || 'No completado'}</p></div>
                <div className={styles.profileCard}><h3>Caducidad CAP</h3><p>{profileData.cap_expirare || 'N/A'}</p></div>
                <div className={styles.profileCard}><h3>Caducidad Carnet</h3><p>{profileData.carnet_caducidad || 'N/A'}</p></div>
                <div className={styles.profileCard}><h3>Certificado ADR</h3><p>{profileData.tiene_adr ? `Sí, expira: ${profileData.adr_caducidad || 'N/A'}` : 'No'}</p></div>
                <Link to={`/camion/${profileData.camion_id}`} className={`${styles.profileCard} ${styles.vehicleLink}`}><h3>Camión</h3><p>{profileData.camioane?.matricula || 'No asignado'}</p></Link>
                <Link to={`/remorca/${profileData.remorca_id}`} className={`${styles.profileCard} ${styles.vehicleLink}`}><h3>Remorca</h3><p>{profileData.remorci?.matricula || 'No asignada'}</p></Link>
            </div>

            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Editar Perfil de {profileData.nombre_completo}</h3><button onClick={() => setIsEditModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleProfileUpdate} className="modal-body">
                            <div className={modalStyles.inputGroup}><label>Nombre Completo</label><input type="text" value={editableProfile.nombre_completo || ''} onChange={(e) => setEditableProfile({...editableProfile, nombre_completo: e.target.value})} /></div>
                            <div className={modalStyles.inputGroup}><label>Caducidad CAP</label><input type="date" value={editableProfile.cap_expirare || ''} onChange={(e) => setEditableProfile({...editableProfile, cap_expirare: e.target.value})} /></div>
                            <div className={modalStyles.inputGroup}><label>Caducidad Carnet</label><input type="date" value={editableProfile.carnet_caducidad || ''} onChange={(e) => setEditableProfile({...editableProfile, carnet_caducidad: e.target.value})} /></div>
                            <div className={modalStyles.inputGroup}><label>Tiene ADR?</label><select value={editableProfile.tiene_adr} onChange={(e) => setEditableProfile({...editableProfile, tiene_adr: e.target.value === 'true'})}><option value={false}>No</option><option value={true}>Sí</option></select></div>
                            {editableProfile.tiene_adr && (<div className={modalStyles.inputGroup}><label>Caducidad ADR</label><input type="date" value={editableProfile.adr_caducidad || ''} onChange={(e) => setEditableProfile({...editableProfile, adr_caducidad: e.target.value})} /></div>)}
                            <div className={modalStyles.inputGroup}><label>Camión Asignado</label><select value={editableProfile.camion_id || ''} onChange={(e) => setEditableProfile({...editableProfile, camion_id: e.target.value})}><option value="">Ninguno</option>{camioane.map(c => <option key={c.id} value={c.id}>{c.matricula}</option>)}</select></div>
                            <div className={modalStyles.inputGroup}><label>Remorca Asignada</label><select value={editableProfile.remorca_id || ''} onChange={(e) => setEditableProfile({...editableProfile, remorca_id: e.target.value})}><option value="">Ninguna</option>{remorci.map(r => <option key={r.id} value={r.id}>{r.matricula}</option>)}</select></div>
                            <div className="modal-footer">
                                <button type="button" className={`${modalStyles.modalButton} ${modalStyles.secondary}`} onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={`${modalStyles.modalButton} ${modalStyles.primary}`}>Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default ChoferProfilePage;
