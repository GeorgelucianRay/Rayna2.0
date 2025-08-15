import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import styles from './MapStandalone.module.css';

/** ===============================
 *  CONFIG
 *  =============================== */

// setările scenei
const ROWS = ['A','B','C','D','E','F'];      // A-C față, D-F spate
const COLS = 10;                              // 1..10
const CELL_LEN = 12.2;                        // ~ lungimea pt 40ft (m) – axa Z
const LANE_W = 3.0;                           // distanță între rânduri – axa X
const CELL_W = 2.6;                           // lățime + buffer (axa X intern pentru “bandă”)
const STACK_H = 2.9;                          // înălțime per container high-cube (m)
const GND_MARGIN = 8;                         // margini asfalt

// tipuri containere (L, H, W aproximativ metri)
const TYPE_DIM = {
  '20':           { L: 6.1,  H: 2.6, W: 2.44, label: '20' },
  '20-opentop':   { L: 6.1,  H: 2.6, W: 2.44, label: '20 OpenTop' },
  '40-bajo':      { L: 12.2, H: 2.6, W: 2.44, label: '40 Bajo' },
  '40-alto':      { L: 12.2, H: 2.9, W: 2.44, label: '40 Alto' },
  '40-opentop':   { L: 12.2, H: 2.6, W: 2.44, label: '40 OpenTop' },
  '45':           { L: 13.7, H: 2.9, W: 2.44, label: '45' },
};

// culori “naviera”
const LINE_COLOR = {
  'Maersk':        '#c9d6df',
  'Hapag-Lloyd':   '#ff5a00',
  'ONE':           '#e4007f',
  'Messina':       '#dd4f00',
  'Evergreen':     '#009f42',
  'Arkas':         '#1e64c8',
  'MSC':           '#d4b100',   // “MSK/MSC” galben muștar
  'Otros':         '#8b5e3c',
};

// fallback
const safeColor = (name) => LINE_COLOR[name] || LINE_COLOR['Otros'];

const USE_SUPABASE = true; // schimbă pe false dacă vrei doar demo local

/** Helpers coordonate **/
const rowToIndex = (r) => ROWS.indexOf(r); // A->0
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function posToXYZ({ row, col, stack, L = 12.2 }) {
  // rând pe axa X, coloana pe axa Z, stiva pe axa Y
  const rIdx = rowToIndex(row);
  const x = (rIdx - (ROWS.length - 1) / 2) * (CELL_W + LANE_W);
  const z = (col - (COLS + 1) / 2) * CELL_LEN + L/2; // aliniem la celulă, lungimea influențează
  const y = (stack - 1) * STACK_H + STACK_H / 2;     // centrat pe înălțime
  return [x, y, z];
}

/** ===============================
 *  Mesh Container
 *  =============================== */
function ContainerMesh({
  cont, isSelected, onClick, onDoubleClick
}) {
  const { tipo, naviera = 'Otros', estado = 'bueno', programado = false } = cont;
  const dims = TYPE_DIM[tipo] || TYPE_DIM['40-alto'];
  const colorBase = estado === 'roto' ? '#ef4444' : safeColor(naviera);
  const groupRef = useRef();
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (programado && groupRef.current) {
      pulseRef.current += delta * 3;
      const s = 1 + Math.sin(pulseRef.current) * 0.05;
      groupRef.current.scale.set(s, 1, s);
    } else if (groupRef.current) {
      groupRef.current.scale.set(1,1,1);
    }
  });

  const [x, y, z] = posToXYZ({
    row: cont.fila, col: cont.columna, stack: cont.pila, L: dims.L
  });

  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      onClick={(e)=>{e.stopPropagation(); onClick?.(cont);}}
      onDoubleClick={(e)=>{e.stopPropagation(); onDoubleClick?.(cont);}}
    >
      {/* cutie */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dims.W, dims.H, dims.L]} />
        <meshStandardMaterial color={colorBase} metalness={0.2} roughness={0.6} />
      </mesh>

      {/* contur subțire */}
      <mesh>
        <boxGeometry args={[dims.W*1.002, dims.H*1.002, dims.L*1.002]} />
        <meshBasicMaterial color={isSelected ? '#ffffff' : '#000000'} wireframe opacity={0.4} transparent />
      </mesh>

      {/* etichetă mică în față */}
      <Text
        position={[0, dims.H/2 + 0.2, 0]}
        fontSize={0.45}
        color={isSelected ? '#ffffff' : '#e5e7eb'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {cont.codigo || cont.naviera || 'CNTR'}
      </Text>
    </group>
  );
}

/** ===============================
 *  Grilă curte + etichete rânduri
 *  =============================== */
function YardGrid() {
  const lines = [];

  // Linii pe rânduri
  for (let r = 0; r < ROWS.length; r++) {
    const x = (r - (ROWS.length - 1) / 2) * (CELL_W + LANE_W);
    const z1 = - (COLS * CELL_LEN)/2 - GND_MARGIN;
    const z2 =   (COLS * CELL_LEN)/2 + GND_MARGIN;
    lines.push(<line key={`r${r}`}>
      <bufferGeometry
        attach="geometry"
        attributes={{
          position: new THREE.Float32BufferAttribute([x, 0.01, z1, x, 0.01, z2], 3)
        }}
      />
      <lineBasicMaterial attach="material" color="#3b3b3b" />
    </line>);
  }

  // Linii pe coloane
  for (let c = 0; c <= COLS; c++) {
    const z = (c - COLS/2) * CELL_LEN;
    const x1 = -((ROWS.length - 1)/2) * (CELL_W + LANE_W) - GND_MARGIN;
    const x2 =  ((ROWS.length - 1)/2) * (CELL_W + LANE_W) + GND_MARGIN;
    lines.push(<line key={`c${c}`}>
      <bufferGeometry
        attach="geometry"
        attributes={{
          position: new THREE.Float32BufferAttribute([x1, 0.01, z, x2, 0.01, z], 3)
        }}
      />
      <lineBasicMaterial attach="material" color="#2a2a2a" />
    </line>);
  }

  return <group>{lines}</group>;
}

/** ===============================
 *  Scena 3D
 *  =============================== */
function Scene({ containers, selectedId, setSelectedId, onDoubleMove }) {
  return (
    <>
      {/* lumină */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 18, 10]} intensity={0.8} castShadow />

      {/* asfalt */}
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[ (ROWS.length+4)*(CELL_W+LANE_W), COLS*CELL_LEN + GND_MARGIN*2 ]} />
        <meshStandardMaterial color="#2a2f34" roughness={1} metalness={0} />
      </mesh>

      {/* grilă și litere rânduri */}
      <YardGrid />
      {ROWS.map((r, i) => {
        const x = (i - (ROWS.length - 1)/2) * (CELL_W + LANE_W);
        return (
          <Text key={r} position={[x, 0.05, -COLS*CELL_LEN/2 - 3]} fontSize={1.2} color="#9aa3ac" rotation={[-Math.PI/2,0,0]}>
            {r}
          </Text>
        );
      })}

      {/* containere */}
      {containers.map(c => (
        <ContainerMesh
          key={c.id}
          cont={c}
          isSelected={selectedId === c.id}
          onClick={(ct)=> setSelectedId(ct.id)}
          onDoubleClick={(ct)=> onDoubleMove(ct)}
        />
      ))}

      <OrbitControls enablePan enableRotate enableZoom />
    </>
  );
}

/** ===============================
 *  Componenta principală
 *  =============================== */
export default function Depot3D() {
  const navigate = useNavigate();
  const [containers, setContainers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMove, setShowMove] = useState(null); // obiect container pt mutare

  // formular “add”
  const [form, setForm] = useState({
    tipo: '40-alto',
    naviera: 'Maersk',
    naviera_manual: '',
    estado: 'bueno',  // 'bueno' | 'roto'
    detalles: '',
    carga: 'vacio',   // 'vacio' | 'lleno'
    matricula_camion: '',
    programado: false,
    fila: 'A', columna: 1, pila: 1,
    codigo: ''
  });

  // DEMO fallback local
  function demoData() {
    return [
      { id: 'd1', tipo:'40-alto', naviera:'Maersk', estado:'bueno', carga:'vacio', programado:false, fila:'A', columna:1, pila:1, codigo:'MSKU 1234' },
      { id: 'd2', tipo:'20', naviera:'Hapag-Lloyd', estado:'bueno', carga:'lleno', programado:true, fila:'B', columna:3, pila:1, codigo:'HLCU 5678' },
      { id: 'd3', tipo:'45', naviera:'MSC', estado:'roto', detalles:'golpe esquina', programado:false, fila:'E', columna:6, pila:2, codigo:'MSCU 9012' },
    ];
  }

  // fetch din Supabase sau demo
  useEffect(() => {
    (async () => {
      if (!USE_SUPABASE) { setContainers(demoData()); return; }
      const { data, error } = await supabase
        .from('contenedores') // <- adaptează numele tabelului tău
        .select('*')
        .limit(500);
      if (error) { console.warn('SB error:', error.message); setContainers(demoData()); }
      else setContainers(data || []);
    })();
  }, []);

  // adaugă container
  async function handleAdd(e) {
    e?.preventDefault?.();
    const nav = form.naviera === 'Otros' ? (form.naviera_manual || 'Otros') : form.naviera;
    const payload = { ...form, naviera: nav };
    delete payload.naviera_manual;

    if (!USE_SUPABASE) {
      setContainers(prev => [...prev, { id: 'local_'+Date.now(), ...payload }]);
      setShowAdd(false);
      return;
    }
    const { data, error } = await supabase.from('contenedores').insert([payload]).select().single();
    if (error) { alert('Error guardando: ' + error.message); return; }
    setContainers(prev => [data, ...prev]);
    setShowAdd(false);
  }

  // mută container
  async function handleMove(e) {
    e?.preventDefault?.();
    if (!showMove) return;
    const { id } = showMove;

    const fila = clampRow(form.fila);
    const columna = clamp(form.columna, 1, COLS);
    const pila = clamp(form.pila, 1, 5);

    if (!USE_SUPABASE) {
      setContainers(prev => prev.map(c => c.id===id ? { ...c, fila, columna, pila } : c));
      setShowMove(null);
      return;
    }
    const { data, error } = await supabase
      .from('contenedores')
      .update({ fila, columna, pila })
      .eq('id', id)
      .select()
      .single();
    if (error) { alert('Error moviendo: ' + error.message); return; }
    setContainers(prev => prev.map(c => c.id===id ? data : c));
    setShowMove(null);
  }

  const clampRow = (r) => (ROWS.includes(r) ? r : 'A');

  // la dublu-click pe un container deschidem dialogul de mutare cu poziția lui
  function openMoveDialog(cont) {
    setShowMove(cont);
    setForm(f => ({ ...f, fila: cont.fila, columna: cont.columna, pila: cont.pila }));
  }

  // UI helpers
  const selected = useMemo(() => containers.find(c => c.id === selectedId), [containers, selectedId]);

  return (
    <div className={styles.wrap}>
      {/* BARĂ TOP: X & + */}
      <div className={styles.topbar}>
        <button className={styles.roundBtn} onClick={() => navigate('/depot')} aria-label="Volver a Depot">✕</button>
        <div className={styles.flexGrow} />
        <button className={`${styles.roundBtn} ${styles.primary}`} onClick={() => setShowAdd(true)} aria-label="Añadir contenedor">＋</button>
      </div>

      {/* CARD INFO SELECȚIE */}
      {selected && (
        <div className={styles.sideCard}>
          <div className={styles.sideHeader}>
            <strong>{selected.codigo || 'Contenedor'}</strong>
            <span className={styles.badge}>{(TYPE_DIM[selected.tipo]?.label) || selected.tipo}</span>
          </div>
          <div className={styles.kv}><span>Naviera</span><b>{selected.naviera}</b></div>
          <div className={styles.kv}><span>Estado</span><b>{selected.estado}</b></div>
          <div className={styles.kv}><span>Carga</span><b>{selected.carga || '-'}</b></div>
          <div className={styles.kv}><span>Fila/Col/Pila</span><b>{selected.fila}-{selected.columna}-{selected.pila}</b></div>
          {selected.matricula_camion && <div className={styles.kv}><span>Matrícula</span><b>{selected.matricula_camion}</b></div>}
          {selected.detalles && <div className={styles.kv}><span>Detalles</span><b>{selected.detalles}</b></div>}

          <div className={styles.cardActions}>
            <button className={styles.btn} onClick={()=>openMoveDialog(selected)}>Mover</button>
            <button className={styles.btnGhost} onClick={()=>setSelectedId(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* CANVAS 3D */}
      <Canvas
        shadows
        gl={{ antialias: true }}
        camera={{ position:[18, 22, 38], fov: 50 }}
        onPointerMissed={()=> setSelectedId(null)}
      >
        <Scene
          containers={containers}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onDoubleMove={openMoveDialog}
        />
      </Canvas>

      {/* MODAL: ADD */}
      {showAdd && (
        <div className={styles.modal} onClick={()=>setShowAdd(false)}>
          <div className={styles.modalBox} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Añadir Contenedor</h3>
              <button className={styles.iconBtn} onClick={()=>setShowAdd(false)}>✕</button>
            </div>
            <form className={styles.form} onSubmit={handleAdd}>
              <div className={styles.grid2}>
                <label>Tipo
                  <select value={form.tipo} onChange={e=>setForm(f=>({...f, tipo:e.target.value}))}>
                    {Object.keys(TYPE_DIM).map(k=><option key={k} value={k}>{TYPE_DIM[k].label}</option>)}
                  </select>
                </label>
                <label>Código
                  <input value={form.codigo} onChange={e=>setForm(f=>({...f, codigo:e.target.value}))} placeholder="Ej: MSKU 123456" />
                </label>
              </div>

              <div className={styles.grid2}>
                <label>Naviera
                  <select value={form.naviera} onChange={e=>setForm(f=>({...f, naviera:e.target.value}))}>
                    {Object.keys(LINE_COLOR).map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                {form.naviera === 'Otros' && (
                  <label>Naviera (manual)
                    <input value={form.naviera_manual} onChange={e=>setForm(f=>({...f, naviera_manual:e.target.value}))} />
                  </label>
                )}
              </div>

              <div className={styles.grid3}>
                <label>Estado
                  <select value={form.estado} onChange={e=>setForm(f=>({...f, estado:e.target.value}))}>
                    <option value="bueno">Bueno</option>
                    <option value="roto">Roto</option>
                  </select>
                </label>
                <label>Carga
                  <select value={form.carga} onChange={e=>setForm(f=>({...f, carga:e.target.value}))}>
                    <option value="vacio">Vacío</option>
                    <option value="lleno">Lleno</option>
                  </select>
                </label>
                <label>Programado
                  <select value={form.programado ? 'si' : 'no'} onChange={e=>setForm(f=>({...f, programado: e.target.value==='si'}))}>
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </label>
              </div>

              {form.estado === 'roto' && (
                <label>Detalles (daños)
                  <textarea rows="2" value={form.detalles} onChange={e=>setForm(f=>({...f, detalles:e.target.value}))}/>
                </label>
              )}

              <div className={styles.grid2}>
                <label>Matrícula Camión
                  <input value={form.matricula_camion} onChange={e=>setForm(f=>({...f, matricula_camion:e.target.value}))} placeholder="Ej: 1234ABC"/>
                </label>
                <div />
              </div>

              <div className={styles.grid3}>
                <label>Fila
                  <select value={form.fila} onChange={e=>setForm(f=>({...f, fila:e.target.value}))}>
                    {ROWS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </label>
                <label>Columna
                  <input type="number" min="1" max={COLS} value={form.columna} onChange={e=>setForm(f=>({...f, columna: +e.target.value}))}/>
                </label>
                <label>Pila
                  <input type="number" min="1" max="5" value={form.pila} onChange={e=>setForm(f=>({...f, pila: +e.target.value}))}/>
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={()=>setShowAdd(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVE */}
      {showMove && (
        <div className={styles.modal} onClick={()=>setShowMove(null)}>
          <div className={styles.modalBox} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Mover {showMove.codigo || showMove.naviera}</h3>
              <button className={styles.iconBtn} onClick={()=>setShowMove(null)}>✕</button>
            </div>
            <form className={styles.form} onSubmit={handleMove}>
              <div className={styles.grid3}>
                <label>Fila
                  <select value={form.fila} onChange={e=>setForm(f=>({...f, fila:e.target.value}))}>
                    {ROWS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </label>
                <label>Columna
                  <input type="number" min="1" max={COLS} value={form.columna} onChange={e=>setForm(f=>({...f, columna:+e.target.value}))}/>
                </label>
                <label>Pila
                  <input type="number" min="1" max="5" value={form.pila} onChange={e=>setForm(f=>({...f, pila:+e.target.value}))}/>
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={()=>setShowMove(null)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Mover</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}