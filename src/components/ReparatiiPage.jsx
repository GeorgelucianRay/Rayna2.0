import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import './ReparatiiPage.css';

// --- Iconițe SVG ---
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;

function ReparatiiPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    
    const [vehicle, setVehicle] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRepair, setNewRepair] = useState({
        km_reparatie: '',
        operatiune: '',
        detalii: ''
    });

    const tableName = type === 'camion' ? 'camioane' : 'remorci';

    const fetchVehicleData = async () => {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) console.error("Error fetching vehicle data:", error);
        else setVehicle(data);
    };

    const fetchRepairs = async () => {
        const filterColumn = `${type}_id`;
        const { data, error } = await supabase.from('reparatii').select('*').eq(filterColumn, id).order('created_at', { ascending: false });
        if (error) console.error("Error fetching repairs:", error);
        else setRepairs(data);
    };

    useEffect(() => {
        fetchVehicleData();
        fetchRepairs();
    }, [id, type]);

    const handleAddRepair = async (e) => {
        e.preventDefault();
        const repairData = {
            [`${type}_id`]: id,
            km_reparatie: newRepair.km_reparatie || null,
            operatiune: newRepair.operatiune || null,
            detalii: newRepair.detalii || null,
        };

        const { error } = await supabase.from('reparatii').insert([repairData]);
        if (error) {
            alert(`Error al añadir la reparación: ${error.message}`);
        } else {
            alert('Reparación añadida con éxito!');
            setIsModalOpen(false);
            fetchRepairs();
            setNewRepair({ km_reparatie: '', operatiune: '', detalii: '' });
        }
    };

    return (
        <Layout backgroundClassName="taller-background">
            <main className="main-content">
                <div className="profile-header">
                    <button onClick={() => navigate('/taller')} className="back-button"><BackIcon /> Volver a Taller</button>
                    <h1>Historial de Reparaciones</h1>
                    <button className="add-button" onClick={() => setIsModalOpen(true)}><PlusIcon /> Añadir Reparación</button>
                </div>
                <h2 className="vehicle-subtitle">Vehículo: {vehicle?.matricula || 'Cargando...'}</h2>

                <div className="repairs-list">
                    {repairs.length > 0 ? (
                        repairs.map(repair => (
                            <div className="repair-card" key={repair.id}>
                                <div className="repair-header">
                                    <h4>{repair.operatiune}</h4>
                                    <span>{new Date(repair.created_at).toLocaleDateString('es-ES')}</span>
                                </div>
                                {repair.km_reparatie && <p><strong>KM:</strong> {repair.km_reparatie.toLocaleString('es-ES')}</p>}
                                {repair.detalii && <p className="repair-details"><strong>Detalles:</strong> {repair.detalii}</p>}
                            </div>
                        ))
                    ) : (
                        <p className="no-repairs">No hay reparaciones registradas para este vehículo.</p>
                    )}
                </div>
            </main>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Añadir Reparación para {vehicle.matricula}</h3><button onClick={() => setIsModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleAddRepair} className="modal-body">
                            <div className="input-group full-width"><label>Operación / Pieza cambiada</label><input type="text" value={newRepair.operatiune} onChange={(e) => setNewRepair({...newRepair, operatiune: e.target.value})} autoFocus /></div>
                            <div className="input-group"><label>KM en la reparación</label><input type="number" value={newRepair.km_reparatie} onChange={(e) => setNewRepair({...newRepair, km_reparatie: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Detalles (opcional)</label><textarea value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})}></textarea></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default ReparatiiPage;
