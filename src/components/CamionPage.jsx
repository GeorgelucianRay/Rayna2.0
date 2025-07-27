import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import './MiPerfilPage.css';
import './ReparatiiPage.css';

// --- Iconițe SVG ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;

function CamionPage() {
    const { id } = useParams();
    const { profile: authProfile, loading: authLoading } = useAuth();
    const [camionData, setCamionData] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [repairSearchTerm, setRepairSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
    const [editableCamion, setEditableCamion] = useState(null);
    const [newRepair, setNewRepair] = useState({ km_reparatie: '', operatiune: '', detalles: '' });

    const fetchCamionData = async () => {
        if (!id) return;
        const { data, error } = await supabase.from('camioane').select('*').eq('id', id).single();
        if (error) console.error("Error fetching camion data:", error);
        else setCamionData(data);
    };

    const fetchRepairs = async () => {
        if (!id) return;
        const { data, error } = await supabase.from('reparatii').select('*').eq('camion_id', id).order('created_at', { ascending: false });
        if (error) console.error("Error fetching repairs:", error);
        else setRepairs(data);
    };

    useEffect(() => {
        fetchCamionData();
        fetchRepairs();
    }, [id]);

    const handleEditClick = () => {
        setEditableCamion({ ...camionData });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const { id: camionId, created_at, ...updateData } = editableCamion;
        const { error } = await supabase.from('camioane').update(updateData).eq('id', camionId);
        if (error) { alert(`Error al actualizar: ${error.message}`); } 
        else {
            alert('Vehículo actualizado con éxito!');
            setIsEditModalOpen(false);
            fetchCamionData();
        }
    };

    const handleAddRepair = async (e) => {
        e.preventDefault();
        const repairData = { camion_id: id, ...newRepair };
        Object.keys(repairData).forEach(key => { if (repairData[key] === '') repairData[key] = null; });
        const { error } = await supabase.from('reparatii').insert([repairData]);
        if (error) { alert(`Error al añadir la reparación: ${error.message}`); } 
        else {
            alert('Reparación añadida con éxito!');
            setIsRepairModalOpen(false);
            fetchRepairs();
            setNewRepair({ km_reparatie: '', operatiune: '', detalles: '' });
        }
    };

    if (authLoading || !camionData) {
        return <div className="loading-screen">Cargando...</div>;
    }

    const canEdit = authProfile?.role === 'dispecer' || String(authProfile?.camion_id) === id;

    const filteredRepairs = repairs.filter(r => 
        r.operatiune && r.operatiune.toLowerCase().includes(repairSearchTerm.toLowerCase())
    );

    return (
        <Layout backgroundClassName="profile-background">
            <main className="main-content">
                <div className="profile-header">
                    <h1>Profil Camión: {camionData.matricula}</h1>
                    {canEdit && (
                        <button className="edit-profile-button" onClick={handleEditClick}><EditIcon /> Editar Vehículo</button>
                    )}
                </div>
                <div className="profile-grid">
                    <div className="profile-card"><h3>Marca</h3><p>{camionData.marca || 'N/A'}</p></div>
                    <div className="profile-card"><h3>Modelo</h3><p>{camionData.modelo || 'N/A'}</p></div>
                    <div className="profile-card"><h3>Eje</h3><p>{camionData.eje || 'N/A'}</p></div>
                    <div className="profile-card"><h3>Fecha ITV</h3><p>{camionData.fecha_itv || 'N/A'}</p></div>
                    <div className="profile-card full-width"><h3>Detalles</h3><p>{camionData.detalles || 'Sin detalles.'}</p></div>
                </div>

                <div className="profile-header" style={{ marginTop: '2rem' }}>
                    <h2>Historial de Reparaciones</h2>
                    {canEdit && (
                        <button className="add-button" onClick={() => setIsRepairModalOpen(true)}><PlusIcon /> Añadir Reparación</button>
                    )}
                </div>

                <div className="toolbar" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
                    <div className="search-bar">
                        <SearchIcon />
                        <input 
                            type="text" 
                            placeholder="Buscar por operación..."
                            value={repairSearchTerm}
                            onChange={(e) => setRepairSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="repairs-list">
                    {filteredRepairs.length > 0 ? (
                        filteredRepairs.map(repair => (
                            <div className="repair-card" key={repair.id}>
                                <div className="repair-header"><h4>{repair.operatiune}</h4><span>{new Date(repair.created_at).toLocaleDateString('es-ES')}</span></div>
                                {repair.km_reparatie && <p><strong>KM:</strong> {repair.km_reparatie.toLocaleString('es-ES')}</p>}
                                {repair.detalles && <p className="repair-details"><strong>Detalles:</strong> {repair.detalles}</p>}
                            </div>
                        ))
                    ) : (
                        <p className="no-repairs">No hay reparaciones registradas para este vehículo.</p>
                    )}
                </div>
            </main>
            
            {isEditModalOpen && editableCamion && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Editar Camión: {editableCamion.matricula}</h3><button onClick={() => setIsEditModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleUpdate} className="modal-body">
                            <div className="input-group"><label>Marca</label><input type="text" value={editableCamion.marca || ''} onChange={(e) => setEditableCamion({...editableCamion, marca: e.target.value})} /></div>
                            <div className="input-group"><label>Modelo</label><input type="text" value={editableCamion.modelo || ''} onChange={(e) => setEditableCamion({...editableCamion, modelo: e.target.value})} /></div>
                            <div className="input-group"><label>Eje</label><select value={editableCamion.eje || ''} onChange={(e) => setEditableCamion({...editableCamion, eje: e.target.value})}><option value="">N/A</option><option value="2">2</option><option value="3">3</option></select></div>
                            <div className="input-group"><label>Fecha ITV</label><input type="date" value={editableCamion.fecha_itv || ''} onChange={(e) => setEditableCamion({...editableCamion, fecha_itv: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Detalles</label><textarea value={editableCamion.detalles || ''} onChange={(e) => setEditableCamion({...editableCamion, detalles: e.target.value})}></textarea></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Guardar Cambios</button></div>
                        </form>
                    </div>
                </div>
            )}
            {isRepairModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Añadir Reparación para {camionData.matricula}</h3><button onClick={() => setIsRepairModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleAddRepair} className="modal-body">
                            <div className="input-group full-width"><label>Operación / Pieza cambiada</label><input type="text" value={newRepair.operatiune} onChange={(e) => setNewRepair({...newRepair, operatiune: e.target.value})} autoFocus /></div>
                            <div className="input-group"><label>KM en la reparación</label><input type="number" value={newRepair.km_reparatie} onChange={(e) => setNewRepair({...newRepair, km_reparatie: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Detalles (opcional)</label><textarea value={newRepair.detalles} onChange={(e) => setNewRepair({...newRepair, detalles: e.target.value})}></textarea></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsRepairModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default CamionPage;