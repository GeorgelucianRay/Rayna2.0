import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- Pictograme SVG pentru a înlocui react-icons ---
const FiTool = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
);

const FiSearch = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const FiPackage = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
);

// --- Configurare Supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// Componenta pentru afișarea unui card de container defect
const RotoContainerCard = ({ container }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg text-gray-800 dark:text-gray-100">ID: {container.id_container}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(container.created_at).toLocaleDateString()}
                </span>
            </div>
            <div>
                <p className="text-md font-semibold text-red-600 dark:text-red-400 mb-2">Problemă raportată:</p>
                <p className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-3 rounded-md">{container.problema}</p>
            </div>
        </div>
    );
};


// Componenta principală a paginii pentru containere defecte
export default function ContenedoresRotosPage() {
    const [rotoContainers, setRotoContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Funcție pentru a prelua datele din Supabase
    const fetchRotoContainers = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('contenedores_roto')
                .select('*')
                .order('created_at', { ascending: false }); // Ordonare după data creării

            if (fetchError) {
                throw fetchError;
            }
            setRotoContainers(data || []);
        } catch (err) {
            console.error("Eroare la preluarea containerelor defecte:", err);
            setError('Nu s-au putut încărca datele. Verifică configurația Supabase și reîncearcă.');
        } finally {
            setLoading(false);
        }
    };

    // Preluarea datelor la încărcarea componentei
    useEffect(() => {
        fetchRotoContainers();
    }, []);

    // Filtrarea containerelor pe baza termenului de căutare
    const filteredContainers = useMemo(() => {
        if (!searchTerm) {
            return rotoContainers;
        }
        return rotoContainers.filter(container =>
            (container.id_container?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (container.problema?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, rotoContainers]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Antetul paginii */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                    <div className="flex items-center mb-4 sm:mb-0">
                        <FiTool className="text-3xl text-red-500 mr-3" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
                            Containere Raportate ca Defecte
                        </h1>
                    </div>
                </div>

                {/* Bara de căutare */}
                <div className="mb-6">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <FiSearch className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Caută după ID sau problemă..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Afișarea stării */}
                {loading && <p className="text-center text-gray-500 dark:text-gray-400">Se încarcă containerele...</p>}
                {error && <p className="text-center text-red-500">{error}</p>}

                {/* Grila cu containere */}
                {!loading && !error && (
                    filteredContainers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredContainers.map(container => (
                                <RotoContainerCard key={container.id} container={container} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <FiPackage className="mx-auto text-5xl text-gray-400 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Niciun container defect găsit</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">
                                {searchTerm ? 'Nu s-au găsit rezultate pentru căutarea dvs.' : 'Toate containerele sunt în stare bună.'}
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}