import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './ReparatiiPage.module.css'; // Importăm ca modul
import depotStyles from './DepotPage.module.css'; // Refolosim stiluri din Depot
import modalStyles from './MiPerfilPage.module.css'; // Refolosim stiluri pentru modal

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;


function ReparatiiPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();

    const [vehicle, setVehicle] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newRepair, setNewRepair] = useState({
        data: new Date().toISOString().slice(0, 10),
        detalii: '',
        cost: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const tableName = type === 'camion' ? 'camioane' : 'remorci';
            const foreignKey = type === 'camion' ? 'camion_id' : 'remorca_id';

            const { data: vehicleData, error: vehicleError } = await supabase
                .from(tableName)
                .select('matricula')
                .eq('id', id)
                .single();

            if (vehicleError) console.error(`Error fetching vehicle:`, vehicleError);
            else setVehicle(vehicleData);

            const { data: repairsData, error: repairsError } = await supabase
                .from('reparatii')
                .select('*')
                .eq(foreignKey, id)
                .order('data', { ascending: false });

            if (repairsError) console.error(`Error fetching repairs:`, repairsError);
            else setRepairs(repairsData);

            setLoading(false);
        };

        fetchData();
    }, [id, type]);

    const handleAddRepair = async (e) => {
        e.preventDefault();
        const foreignKey = type === 'camion' ? 'camion_id' : 'remorca_id';
        
        const repairData = {
            ...newRepair,
            [foreignKey]: id,
            cost: parseFloat(newRepair.cost) || 0
        };

        const { error } = await supabase.from('reparatii').insert([repairData]);

        if (error) {
            alert(`Error al añadir la reparación: ${error.message}`);
        } else {
            alert('Reparación añadida con éxito!');
            setIsAddModalOpen(false);
            setNewRepair({ data: new Date().toISOString().slice(0, 10), detalii: '', cost: '' });
            const { data: repairsData } = await supabase.from('reparatii').select('*').eq(foreignKey, id).order('data', { ascending: false });
            setRepairs(repairsData);
        }
    };
    
    const canEdit = profile?.role === 'dispecer' || profile?.role === 'mecanic';

    if (loading) {
        return <div className={modalStyles.loadingScreen}>Cargando...</div>;
    }

    return (
        <Layout backgroundClassName="taller-background">
            <div className={styles.repairsHeaderContainer}>
                <h1 className={styles.pageTitle}>Historial de Reparaciones</h1>
                <div className={styles.headerActions}>
                    {canEdit && (
                        <button className={depotStyles.addButton} onClick={() => setIsAddModalOpen(true)}>
                            <PlusIcon /> Añadir Reparación
                        </button>
                    )}
                    <button onClick={() => navigate('/taller')} className={styles.backButton}>
                        <BackIcon /> Volver a Taller
                    </button>
                </div>
            </div>

            {vehicle && <h2 className={styles.vehicleSubtitle}>{vehicle.matricula}</h2>}

            {repairs.length > 0 ? (
                <div className={styles.repairsList}>
                    {repairs.map(repair => (
                        <div className={styles.repairCard} key={repair.id}>
                            <div className={styles.repairHeader}>
                                <h4>Reparación del {new Date(repair.data).toLocaleDateString()}</h4>
                                <span><strong>Coste:</strong> {repair.cost} €</span>
                            </div>
                            <p className={styles.repairDetails}>{repair.detalii}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.noRepairs}>No hay reparaciones registradas para este vehículo.</p>
            )}

            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="modal-title">Añadir Nueva Reparación</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="close-button"><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleAddRepair} className="modal-body">
                            <div className={depotStyles.inputGroup} style={{gridColumn: '1 / -1'}}><label>Fecha</label><input type="date" value={newRepair.data} onChange={(e) => setNewRepair({...newRepair, data: e.target.value})} required /></div>
                            <div className={depotStyles.inputGroup} style={{gridColumn: '1 / -1'}}><label>Coste (€)</label><input type="number" step="0.01" placeholder="Ej: 150.50" value={newRepair.cost} onChange={(e) => setNewRepair({...newRepair, cost: e.target.value})} /></div>
                            <div className={depotStyles.inputGroup} style={{gridColumn: '1 / -1'}}><label>Detalles de la Reparación</label><textarea value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})} required rows="6"></textarea></div>
                            <div className="modal-footer">
                                <button type="button" className={`${depotStyles.modalButton} ${depotStyles.secondary}`} onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={`${depotStyles.modalButton} ${depotStyles.primary}`}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default ReparatiiPage;
