// src/components/GpsPro/GpsProPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import styles from './GpsPro.module.css';

import MapPanelCore from './map/MapPanelCore';
import DestinationPicker from './DestinationPicker';

// --- Iconos ---
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className={styles.icon}>
    <path fill="currentColor" d="M10 18a8 8 0 1 1 5.293-14.293L21 9.414l-1.414 1.414l-1.9-1.9l-1.415 1.414l1.9 1.9L16 13.9L14.6 12.5A7.96 7.96 0 0 1 10 18m0-2a6 6 0 1 0-6-6a6.006 6.006 0 0 0 6 6Z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className={styles.icon}>
    <path fill="currentColor" d="M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2z"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className={styles.icon}>
    <path fill="currentColor" d="M18.3 5.71L12 12.01l-6.29-6.3L4.29 7.12L10.59 13.4l-6.3 6.3l1.42 1.41l6.29-6.29l6.3 6.29l1.41-1.41l-6.29-6.3l6.29-6.29z"/>
  </svg>
);

const ITEMS_PER_PAGE = 24;

function Toolbar({ activeView, setActiveView, canEdit, searchTerm, onSearch, onAdd, title }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeView === 'clientes' ? styles.tabActive : ''}`} onClick={() => setActiveView('clientes')}>Clientes</button>
        <button className={`${styles.tab} ${activeView === 'parkings' ? styles.tabActive : ''}`} onClick={() => setActiveView('parkings')}>Parkings</button>
        <button className={`${styles.tab} ${activeView === 'servicios' ? styles.tabActive : ''}`} onClick={() => setActiveView('servicios')}>Servicios</button>
        <button className={`${styles.tab} ${activeView === 'terminale' ? styles.tabActive : ''}`} onClick={() => setActiveView('terminale')}>Terminales</button>
      </div>
      <div className={styles.actions}>
        <div className={styles.search}>
          <SearchIcon />
          <input type="text" placeholder="Buscar por nombre…" value={searchTerm} onChange={(e) => onSearch(e.target.value)} />
        </div>
        {canEdit && (
          <button className={styles.primary} onClick={onAdd}>
            <PlusIcon /> Añadir {title}
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ item, onClick, canEdit, onEdit }) {
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e)=> (e.key==='Enter'||e.key===' ') && onClick()}>
      <div className={styles.cardImgWrap}>
        <img
          src={item.link_foto || 'https://placehold.co/800x600/0b1f3a/99e6ff?text=Sin+Foto'}
          alt={`Foto de ${item.nombre}`}
          onError={(e)=>{ e.currentTarget.src = 'https://placehold.co/800x600/0b1f3a/99e6ff?text=Error'; }}
        />
      </div>
      <div className={styles.cardOverlay}>
        <h3 className={styles.cardTitle}>{item.nombre}</h3>
        {canEdit && (
          <button className={styles.cardEdit} onClick={(e)=>{ e.stopPropagation(); onEdit(item); }} aria-label="Editar" title="Editar">✎</button>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, footer }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Cerrar"><CloseIcon/></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

function ListView({ tableName, title }) {
  const { profile } = useAuth();
  const canEdit = profile?.role === 'dispecer';

  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // pentru formularul de adăugare (era folosit în onAddSubmit)
  const [newItem, setNewItem] = useState({
    nombre: '', direccion: '', link_maps: '', detalles: '', coordenadas: '', link_foto: '', tiempo_espera: ''
  });

  // pentru hartă și picker (nou)
  const [openMapFor, setOpenMapFor] = useState(null);
  const [openDestPickerFor, setOpenDestPickerFor] = useState(null);

  const typeMap = {
    gps_clientes: 'clientes',
    gps_parkings: 'parkings',
    gps_servicios: 'servicios',
    gps_terminale: 'terminale',
  };
  const currentType = typeMap[tableName];

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const cols =
      'id, created_at, nombre, direccion, link_maps, coordenadas, link_foto, detalles' +
      (tableName==='gps_clientes' ? ', tiempo_espera, dest_coords' : '');
    let q = supabase.from(tableName).select(cols, { count: 'exact' });
    if (term) q = q.ilike('nombre', `%${term}%`);
    const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
    if (error) { console.error(error); setItems([]); setCount(0); }
    else { setItems(data || []); setCount(count || 0); }
    setLoading(false);
  }, [page, term, tableName]);

  useEffect(()=>{ fetchItems(); }, [fetchItems]);

  const totalPages = Math.max(1, Math.ceil((count||0)/ITEMS_PER_PAGE));
  const getMapsLink = (it) => it.link_maps || (it.coordenadas ? `https://maps.google.com/?q=${it.coordenadas}` : null);

  const onAddSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...newItem };
    if (tableName !== 'gps_clientes') delete payload.tiempo_espera;
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    const { error } = await supabase.from(tableName).insert([payload]);
    if (error) alert(`Error al añadir: ${error.message}`);
    else {
      setAddOpen(false);
      setNewItem({ nombre:'', direccion:'', link_maps:'', detalles:'', coordenadas:'', link_foto:'', tiempo_espera:'' });
      setTerm('');
      setPage(1);
    }
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = editing;
    const payload = { ...rest };
    if (tableName !== 'gps_clientes') delete payload.tiempo_espera;
    const { error } = await supabase.from(tableName).update(payload).eq('id', id);
    if (error) alert(`Error al actualizar: ${error.message}`);
    else { setEditOpen(false); setEditing(null); fetchItems(); }
  };

  return (
    <div className={styles.view}>
      <Toolbar
        activeView={null}
        setActiveView={()=>{}}
        canEdit={canEdit}
        searchTerm={term}
        onSearch={(v)=>{ setTerm(v); setPage(1); }}
        onAdd={()=> setAddOpen(true)}
        title={title}
      />

      {loading ? (
        <div className={styles.loading}>Cargando…</div>
      ) : (
        <>
          <div className={styles.grid}>
            {items.map(it => (
              <Card
                key={it.id}
                item={it}
                canEdit={canEdit}
                onClick={()=> setSelected(it)}
                onEdit={(i)=>{ setEditing(i); setEditOpen(true); }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} onClick={()=> setPage(p=>Math.max(1, p-1))} disabled={page===1}>Anterior</button>
              <span className={styles.pageInfo}>Página {page} de {totalPages}</span>
              <button className={styles.pageBtn} onClick={()=> setPage(p=>Math.min(totalPages, p+1))} disabled={page===totalPages}>Siguiente</button>
            </div>
          )}
        </>
      )}

      {/* Detalle */}
      {selected && (
        <Modal
          title={selected.nombre}
          onClose={()=> setSelected(null)}
          footer={
            <>
              {getMapsLink(selected)
                ? <a className={`${styles.btn} ${styles.btnPrimary}`} href={getMapsLink(selected)} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
                : <button className={`${styles.btn} ${styles.btnDisabled}`} disabled>Maps no disponible</button>
              }

              {/* Abrir mapa & Crear ruta → disponibile pe TOATE tab-urile */}
              <button
                className={`${styles.btn}`}
                onClick={() => {
                  if (currentType === 'clientes') {
                    // deschide harta pe client (fără destinație preset)
                    setOpenMapFor({
                      ...selected,
                      _subject: { type: 'clientes', id: selected.id, label: selected.nombre, coords: selected.coordenadas }
                    });
                  } else {
                    // dacă e parking/servicio/terminal → îl folosim ca destinație implicită + autoStart
                    setOpenMapFor({
                      ...selected,
                      _subject: { type: currentType, id: selected.id, label: selected.nombre, coords: selected.coordenadas },
                      _pickedDestination: { type: currentType, id: selected.id, label: selected.nombre, coords: selected.coordenadas },
                      _autoStart: true,
                    });
                  }
                }}
              >
                Abrir mapa
              </button>

              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setOpenDestPickerFor({
                  ...selected,
                  _subject: { type: currentType, id: selected.id, label: selected.nombre, coords: selected.coordenadas }
                })}
              >
                Crear ruta →
              </button>

              <button className={`${styles.btn}`} onClick={()=> setSelected(null)}>Cerrar</button>
            </>
          }
        >
          <div className={styles.detail}>
            <img
              className={styles.detailImg}
              src={selected.link_foto || 'https://placehold.co/1000x700/0b1f3a/99e6ff?text=Sin+Foto'}
              alt={selected.nombre}
              onError={(e)=>{ e.currentTarget.src = 'https://placehold.co/1000x700/0b1f3a/99e6ff?text=Error'; }}
            />
            <div className={styles.detailInfo}>
              {selected.direccion && <p><strong>Dirección:</strong> {selected.direccion}</p>}
              {selected.tiempo_espera && tableName==='gps_clientes' && <p><strong>Tiempo de Espera:</strong> {selected.tiempo_espera}</p>}
              {selected.detalles && <p><strong>Detalles:</strong> {selected.detalles}</p>}
              {selected.coordenadas && <p><strong>Coordenadas:</strong> {selected.coordenadas}</p>}
            </div>
          </div>
        </Modal>
      )}

      {/* Añadir */}
      {addOpen && (
        <Modal title={`Añadir ${title}`} onClose={()=> setAddOpen(false)} footer={null}>
          <form className={styles.form} onSubmit={onAddSubmit}>
            <label>Nombre<input value={newItem.nombre} onChange={(e)=> setNewItem({...newItem, nombre:e.target.value})} required/></label>
            <label>Dirección<input value={newItem.direccion || ''} onChange={(e)=> setNewItem({...newItem, direccion:e.target.value})} /></label>
            <label>Link Google Maps<input value={newItem.link_maps || ''} onChange={(e)=> setNewItem({...newItem, link_maps:e.target.value})} /></label>
            <label>Coordenadas<input placeholder="Ej: 41.15, 1.10" value={newItem.coordenadas || ''} onChange={(e)=> setNewItem({...newItem, coordenadas:e.target.value})} /></label>
            {tableName==='gps_clientes' && (
              <label>Tiempo de Espera<input value={newItem.tiempo_espera || ''} onChange={(e)=> setNewItem({...newItem, tiempo_espera:e.target.value})} /></label>
            )}
            <label>Link Foto<input value={newItem.link_foto || ''} onChange={(e)=> setNewItem({...newItem, link_foto:e.target.value})} /></label>
            <label>Detalles<textarea rows={4} value={newItem.detalles || ''} onChange={(e)=> setNewItem({...newItem, detalles:e.target.value})} /></label>
            <div className={styles.formActions}>
              <button type="button" className={styles.btn} onClick={()=> setAddOpen(false)}>Cancelar</button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}><PlusIcon/> Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Editar */}
      {editOpen && editing && (
        <Modal title={`Editar ${editing.nombre}`} onClose={()=>{ setEditOpen(false); setEditing(null); }} footer={null}>
          <form className={styles.form} onSubmit={onEditSubmit}>
            <label>Nombre<input value={editing.nombre || ''} onChange={(e)=> setEditing({...editing, nombre:e.target.value})} required/></label>
            <label>Dirección<input value={editing.direccion || ''} onChange={(e)=> setEditing({...editing, direccion:e.target.value})} /></label>
            <label>Link Google Maps<input value={editing.link_maps || ''} onChange={(e)=> setEditing({...editing, link_maps:e.target.value})} /></label>
            <label>Coordenadas<input value={editing.coordenadas || ''} onChange={(e)=> setEditing({...editing, coordenadas:e.target.value})} placeholder="Ej: 41.15, 1.10"/></label>
            {tableName==='gps_clientes' && (
              <label>Tiempo de Espera<input value={editing.tiempo_espera || ''} onChange={(e)=> setEditing({...editing, tiempo_espera:e.target.value})} /></label>
            )}
            <label>Link Foto<input value={editing.link_foto || ''} onChange={(e)=> setEditing({...editing, link_foto:e.target.value})} /></label>
            <label>Detalles<textarea rows={4} value={editing.detalles || ''} onChange={(e)=> setEditing({...editing, detalles:e.target.value})} /></label>
            <div className={styles.formActions}>
              <button type="button" className={styles.btn} onClick={()=> { setEditOpen(false); setEditing(null); }}>Cancelar</button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Guardar Cambios</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Picker de destinație */}
      {openDestPickerFor && (
        <DestinationPicker
          onClose={()=> setOpenDestPickerFor(null)}
          initialTab={currentType === 'clientes' ? 'parkings' : 'clientes'}
          onPick={(dest) => {
            setOpenDestPickerFor(null);
            // deschide harta cu destinația aleasă + autoStart
            setOpenMapFor({
              ...openDestPickerFor,
              _pickedDestination: dest,
              _autoStart: true,
            });
          }}
        />
      )}

      {/* Map overlay */}
      {openMapFor && (
        <MapPanelCore
          client={openMapFor}
          destination={openMapFor._pickedDestination}   // undefined dacă ai apăsat doar “Abrir mapa”
          autoStart={openMapFor._autoStart === true}
          onClose={() => setOpenMapFor(null)}
        />
      )}
    </div>
  );
}

export default function GpsProPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('clientes');

  if (profile?.role !== 'dispecer') {
    return (
      <div className={styles.frame}>
        <div className={styles.guard}>
          <h2>Acceso restringido</h2>
          <p>Esta sección es solo para <strong>dispecer</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoGlow}/>
          <span>GPS<span className={styles.brandAccent}>Pro</span></span>
        </div>
        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${tab==='clientes'?styles.navBtnActive:''}`} onClick={()=> setTab('clientes')}>Clientes</button>
          <button className={`${styles.navBtn} ${tab==='parkings'?styles.navBtnActive:''}`} onClick={()=> setTab('parkings')}>Parkings</button>
          <button className={`${styles.navBtn} ${tab==='servicios'?styles.navBtnActive:''}`} onClick={()=> setTab('servicios')}>Servicios</button>
          <button className={`${styles.navBtn} ${tab==='terminale'?styles.navBtnActive:''}`} onClick={()=> setTab('terminale')}>Terminales</button>
        </nav>
      </header>

      <main className={styles.main}>
        {tab==='clientes'   && <ListView tableName="gps_clientes"  title="Cliente" />}
        {tab==='parkings'   && <ListView tableName="gps_parkings"  title="Parking" />}
        {tab==='servicios'  && <ListView tableName="gps_servicios" title="Servicio" />}
        {tab==='terminale'  && <ListView tableName="gps_terminale" title="Terminal" />}
      </main>
    </div>
  );
}