import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import './DepotPage.css';

const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;

// --- Componenta pentru "Contenedores en Depot" ---
const ContenedoresEnDepot = ({ onContainerChange }) => {
    const [containers, setContainers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSalidaModalOpen, setIsSalidaModalOpen] = useState(false);
    const [processingContainer, setProcessingContainer] = useState(null);
    const [newContainer, setNewContainer] = useState({
        matricula_contenedor: '', naviera: '', tipo: '40 alto', posicion: '', matricula_camión: '', is_roto: false, detalles: ''
    });

    async function fetchContainers() {
        const { data, error } = await supabase.from('contenedores').select('*');
        if (error) console.error('Error fetching containers:', error);
        else setContainers(data);
    }

    useEffect(() => { fetchContainers(); }, []);

    const handleAddContainer = async (e) => {
        e.preventDefault();
        let tableName = newContainer.is_roto ? 'contenedores_rotos' : 'contenedores';
        let containerToInsert = newContainer.is_roto ? 
            { matricula_contenedor: newContainer.matricula_contenedor, naviera: newContainer.naviera, tipo: newContainer.tipo, posicion: newContainer.posicion, matricula_camión: newContainer.matricula_camión, detalles: newContainer.detalles } :
            { matricula_contenedor: newContainer.matricula_contenedor, naviera: newContainer.naviera, tipo: newContainer.tipo, posicion: newContainer.posicion, matricula_camión: newContainer.matricula_camión };
        
        Object.keys(containerToInsert).forEach(key => { if (containerToInsert[key] === '') containerToInsert[key] = null; });

        const { error } = await supabase.from(tableName).insert([containerToInsert]);
        if (error) { alert(`Error: ${error.message}`); } 
        else {
            alert('Contenedor añadido!');
            setIsEntryModalOpen(false);
            fetchContainers();
            onContainerChange();
            setNewContainer({ matricula_contenedor: '', naviera: '', tipo: '40 alto', posicion: '', matricula_camión: '', is_roto: false, detalles: '' });
        }
    };
  
    const handleUpdatePosition = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('contenedores').update({ posicion: processingContainer.posicion }).eq('id', processingContainer.id);
        if (error) { alert(`Error: ${error.message}`); } 
        else {
            alert('Posición actualizada.');
            setIsEditModalOpen(false);
            fetchContainers();
            setProcessingContainer(null);
        }
    };

    const handleSalida = async (e) => {
        e.preventDefault();
        const dataToInsert = {
            matricula_contenedor: processingContainer.matricula_contenedor,
            naviera: processingContainer.naviera,
            tipo: processingContainer.tipo,
            posicion: processingContainer.posicion,
            matricula_camión: processingContainer.matricula_camión,
            detalles: processingContainer.detalles || null
        };

        const { error: insertError } = await supabase.from('contenedores_salidos').insert([dataToInsert]);
        if (insertError) {
            alert(`Error al mover a salidos: ${insertError.message}`);
            return;
        }
        const { error: deleteError } = await supabase.from('contenedores').delete().eq('id', processingContainer.id);
        if (deleteError) {
            alert(`Error al eliminar de depot: ${deleteError.message}`);
        } else {
            alert('Salida registrada con éxito.');
            setIsSalidaModalOpen(false);
            fetchContainers();
            onContainerChange();
            setProcessingContainer(null);
        }
    };

    const openEditModal = (container) => { setProcessingContainer({...container}); setIsEditModalOpen(true); };
    const openSalidaModal = (container) => { setProcessingContainer({...container}); setIsSalidaModalOpen(true); };

    const filteredContainers = containers.filter(c => c.matricula_contenedor && c.matricula_contenedor.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <div className="toolbar">
                <div className="search-bar"><SearchIcon /><input type="text" placeholder="Buscar por matrícula..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <button className="add-button" onClick={() => setIsEntryModalOpen(true)}><PlusIcon /><span>Entrada Contenedor</span></button>
            </div>
            <div className="containers-grid">
                {filteredContainers.map(container => (
                    <div className="container-card" key={container.id}>
                        <div className="card-header"><h3 className="card-matricula">{container.matricula_contenedor || 'N/A'}</h3><span className="card-tipo">{container.tipo || 'N/A'}</span></div>
                        <div className="card-body"><p><strong>Naviera:</strong> {container.naviera || '-'}</p><p><strong>Posición:</strong> {container.posicion || '-'}</p><p><strong>Matrícula Camión:</strong> {container.matricula_camión || '-'}</p></div>
                        <div className="card-footer"><button className="card-button edit" onClick={() => openEditModal(container)}>Editar</button><button className="card-button salida" onClick={() => openSalidaModal(container)}>Salida</button></div>
                    </div>
                ))}
            </div>

            {isEntryModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Nueva Entrada de Contenedor</h3><button onClick={() => setIsEntryModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleAddContainer} className="modal-body">
                            <div className="input-group full-width"><label>Matrícula Contenedor</label><input type="text" value={newContainer.matricula_contenedor} onChange={(e) => setNewContainer({...newContainer, matricula_contenedor: e.target.value.toUpperCase()})} /></div>
                            <div className="input-group"><label>Naviera</label><input type="text" value={newContainer.naviera} onChange={(e) => setNewContainer({...newContainer, naviera: e.target.value})} /></div>
                            <div className="input-group"><label>Tipo</label><select value={newContainer.tipo} onChange={(e) => setNewContainer({...newContainer, tipo: e.target.value})}><option value="40 alto">40 alto</option><option value="40 bajo">40 bajo</option><option value="40 OpenTop">40 OpenTop</option><option value="45">45</option><option value="20">20</option><option value="20 OpenTop">20 OpenTop</option></select></div>
                            <div className="input-group"><label>Posición</label><input type="text" value={newContainer.posicion} onChange={(e) => setNewContainer({...newContainer, posicion: e.target.value})} /></div>
                            <div className="input-group"><label>Matrícula Camión</label><input type="text" value={newContainer.matricula_camión} onChange={(e) => setNewContainer({...newContainer, matricula_camión: e.target.value})} /></div>
                            <div className="input-group checkbox-group full-width"><input type="checkbox" id="is_roto" checked={newContainer.is_roto} onChange={(e) => setNewContainer({...newContainer, is_roto: e.target.checked})} /><label htmlFor="is_roto">Marcar como Roto</label></div>
                            {newContainer.is_roto && (<div className="input-group full-width"><label>Detalles</label><textarea value={newContainer.detalles} onChange={(e) => setNewContainer({...newContainer, detalles: e.target.value})} placeholder="Describe el daño..."></textarea></div>)}
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsEntryModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Editar Posición: {processingContainer.matricula_contenedor}</h3><button onClick={() => setIsEditModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleUpdatePosition} className="modal-body">
                            <div className="input-group full-width"><label>Nueva Posición</label><input type="text" value={processingContainer.posicion} onChange={(e) => setProcessingContainer({...processingContainer, posicion: e.target.value})} autoFocus /></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Actualizar</button></div>
                        </form>
                    </div>
                </div>
            )}
            {isSalidaModalOpen && (
                 <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Confirmar Salida</h3><button onClick={() => setIsSalidaModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleSalida} className="modal-body">
                            <p>Se va a dar salida al contenedor <strong>{processingContainer.matricula_contenedor}</strong>.</p>
                            <div className="input-group full-width"><label>Matrícula Camión (Salida)</label><input type="text" value={processingContainer.matricula_camión || ''} onChange={(e) => setProcessingContainer({...processingContainer, matricula_camión: e.target.value})} autoFocus /></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsSalidaModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button salida">Confirmar Salida</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

// --- Componenta pentru "Contenedores Rotos" ---
const ContenedoresRotos = ({ refreshKey, onContainerChange }) => {
    const [containers, setContainers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSalidaModalOpen, setIsSalidaModalOpen] = useState(false);
    const [processingContainer, setProcessingContainer] = useState(null);

    async function fetchContainers() {
        const { data, error } = await supabase.from('contenedores_rotos').select('*');
        if (error) console.error('Error fetching broken containers:', error);
        else setContainers(data);
    }

    useEffect(() => { fetchContainers(); }, [refreshKey]);

    const handleUpdatePosition = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('contenedores_rotos').update({ posicion: processingContainer.posicion }).eq('id', processingContainer.id);
        if (error) { alert(`Error: ${error.message}`); } 
        else {
            alert('Posición actualizada.');
            setIsEditModalOpen(false);
            fetchContainers();
            setProcessingContainer(null);
        }
    };

    const handleSalida = async (e) => {
        e.preventDefault();
        const dataToInsert = {
            matricula_contenedor: processingContainer.matricula_contenedor,
            naviera: processingContainer.naviera,
            tipo: processingContainer.tipo,
            posicion: processingContainer.posicion,
            matricula_camión: processingContainer.matricula_camión,
            detalles: processingContainer.detalles
        };

        const { error: insertError } = await supabase.from('contenedores_salidos').insert([dataToInsert]);
        if (insertError) {
            alert(`Error al mover a salidos: ${insertError.message}`);
            return;
        }
        const { error: deleteError } = await supabase.from('contenedores_rotos').delete().eq('id', processingContainer.id);
        if (deleteError) {
            alert(`Error al eliminar: ${deleteError.message}`);
        } else {
            alert('Salida registrada con éxito.');
            setIsSalidaModalOpen(false);
            fetchContainers();
            onContainerChange();
            setProcessingContainer(null);
        }
    };

    const openEditModal = (container) => { setProcessingContainer({...container}); setIsEditModalOpen(true); };
    const openSalidaModal = (container) => { setProcessingContainer({...container}); setIsSalidaModalOpen(true); };

    const filteredContainers = containers.filter(c => c.matricula_contenedor && c.matricula_contenedor.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <div className="toolbar"><div className="search-bar"><SearchIcon /><input type="text" placeholder="Buscar por matrícula..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
            <div className="containers-grid">
                {filteredContainers.map(container => (
                    <div className="container-card" key={container.id}>
                        <div className="card-header"><h3 className="card-matricula">{container.matricula_contenedor || 'N/A'}</h3><span className="card-tipo-roto">{container.tipo || 'N/A'}</span></div>
                        <div className="card-body"><p><strong>Naviera:</strong> {container.naviera || '-'}</p><p><strong>Posición:</strong> {container.posicion || '-'}</p><p><strong>Matrícula Camión:</strong> {container.matricula_camión || '-'}</p><p><strong>Detalles:</strong> {container.detalles || 'No especificado'}</p></div>
                        <div className="card-footer"><button className="card-button edit" onClick={() => openEditModal(container)}>Editar</button><button className="card-button salida" onClick={() => openSalidaModal(container)}>Salida</button></div>
                    </div>
                ))}
            </div>
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Editar Posición: {processingContainer.matricula_contenedor}</h3><button onClick={() => setIsEditModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleUpdatePosition} className="modal-body">
                            <div className="input-group full-width"><label>Nueva Posición</label><input type="text" value={processingContainer.posicion} onChange={(e) => setProcessingContainer({...processingContainer, posicion: e.target.value})} autoFocus /></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Actualizar</button></div>
                        </form>
                    </div>
                </div>
            )}
            {isSalidaModalOpen && (
                 <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Confirmar Salida</h3><button onClick={() => setIsSalidaModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleSalida} className="modal-body">
                            <p>Se va a dar salida al contenedor <strong>{processingContainer.matricula_contenedor}</strong>.</p>
                            <div className="input-group full-width"><label>Matrícula Camión (Salida)</label><input type="text" value={processingContainer.matricula_camión || ''} onChange={(e) => setProcessingContainer({...processingContainer, matricula_camión: e.target.value})} autoFocus /></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsSalidaModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button salida">Confirmar Salida</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

// --- Componenta pentru "Contenedores Salidos" ---
const ContenedoresSalidos = ({ refreshKey }) => {
    const [containers, setContainers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    async function fetchContainers() {
        const { data, error } = await supabase.from('contenedores_salidos').select('*');
        if (error) console.error('Error fetching exited containers:', error);
        else setContainers(data);
    }

    useEffect(() => { fetchContainers(); }, [refreshKey]);

    const filteredContainers = containers.filter(c => c.matricula_contenedor && c.matricula_contenedor.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <>
            <div className="toolbar"><div className="search-bar"><SearchIcon /><input type="text" placeholder="Buscar por matrícula..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
            <div className="containers-grid">
                {filteredContainers.map(container => (
                    <div className="container-card" key={container.id}>
                        <div className="card-header"><h3 className="card-matricula">{container.matricula_contenedor || 'N/A'}</h3><span className="card-tipo">{container.tipo || 'N/A'}</span></div>
                        <div className="card-body"><p><strong>Naviera:</strong> {container.naviera || '-'}</p><p><strong>Posición (última):</strong> {container.posicion || '-'}</p><p><strong>Matrícula Camión (salida):</strong> {container.matricula_camión || '-'}</p>{container.detalles && <p><strong>Detalles (roto):</strong> {container.detalles}</p>}</div>
                    </div>
                ))}
            </div>
        </>
    );
};

function DepotPage() {
    const [activeView, setActiveView] = useState('en_depot');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleContainerChange = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <Layout backgroundClassName="depot-background">
            <main className="main-content">
                <div className="depot-header">
                    <button className={`depot-tab-button ${activeView === 'en_depot' ? 'active' : ''}`} onClick={() => setActiveView('en_depot')}>Contenedores en Depot</button>
                    <button className={`depot-tab-button ${activeView === 'salidos' ? 'active' : ''}`} onClick={() => setActiveView('salidos')}>Contenedores Salidos</button>
                    <button className={`depot-tab-button ${activeView === 'rotos' ? 'active' : ''}`} onClick={() => setActiveView('rotos')}>Contenedores Rotos</button>
                </div>
                
                {activeView === 'en_depot' && <ContenedoresEnDepot onContainerChange={handleContainerChange} />}
                {activeView === 'salidos' && <ContenedoresSalidos refreshKey={refreshKey} />}
                {activeView === 'rotos' && <ContenedoresRotos refreshKey={refreshKey} onContainerChange={handleContainerChange} />}
            </main>
        </Layout>
    );
}

export default DepotPage;
