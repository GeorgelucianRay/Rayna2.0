// src/components/SchedulerPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function SchedulerPage() {
  const { user, profile } = useAuth(); // profile.rol = "dispecer" sau "mecanic"
  const [programados, setProgramados] = useState([]);
  const [nuevo, setNuevo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [formData, setFormData] = useState({
    matricula_contenedor: "",
    empresa_descarga: "",
    fecha: "",
    hora: "",
    matricula_camion: "",
  });

  // 🔹 Obține lista de containere programate
  useEffect(() => {
    fetchProgramados();
  }, []);

  async function fetchProgramados() {
    const { data, error } = await supabase
      .from("contenedores_programados")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) console.error(error);
    else setProgramados(data);
  }

  // 🔹 Căutare container în "contenedores" după matriculă
  async function buscarContenedor() {
    if (!busqueda.trim()) return;
    const { data, error } = await supabase
      .from("contenedores")
      .select("*")
      .ilike("matricula_contenedor", `%${busqueda}%`);

    if (error) console.error(error);
    else setResultados(data);
  }

  // 🔹 Adaugă nou programat
  async function guardarProgramacion() {
    const { error } = await supabase.from("contenedores_programados").insert([
      {
        matricula_contenedor: formData.matricula_contenedor,
        empresa_descarga: formData.empresa_descarga,
        fecha: formData.fecha,
        hora: formData.hora,
        matricula_camion: formData.matricula_camion,
      },
    ]);
    if (error) console.error(error);
    else {
      setNuevo(false);
      fetchProgramados();
    }
  }

  // 🔹 Șterge programare
  async function eliminarProgramacion(id) {
    if (!window.confirm("¿Eliminar esta programación?")) return;
    const { error } = await supabase
      .from("contenedores_programados")
      .delete()
      .eq("id", id);
    if (error) console.error(error);
    else fetchProgramados();
  }

  // 🔹 Marchează ca completat → mută în "contenedores_salidos"
  async function marcarHecho(programacion) {
    // Adăugăm în salidos
    const { error: insertError } = await supabase
      .from("contenedores_salidos")
      .insert([programacion]);

    if (insertError) {
      console.error(insertError);
      return;
    }

    // Ștergem din programados
    const { error: deleteError } = await supabase
      .from("contenedores_programados")
      .delete()
      .eq("id", programacion.id);

    if (deleteError) console.error(deleteError);
    else fetchProgramados();
  }

  return (
    <div className="scheduler-container">
      <h2>Programar Contenedores</h2>

      {/* Buton Nuevo doar pentru dispecer */}
      {profile?.rol === "dispecer" && (
        <button className="btn-nuevo" onClick={() => setNuevo(!nuevo)}>
          Nuevo
        </button>
      )}

      {/* Formular Nuevo */}
      {nuevo && profile?.rol === "dispecer" && (
        <div className="form-nuevo">
          <h3>Buscar contenedor por matrícula</h3>
          <input
            type="text"
            placeholder="Matrícula contenedor"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button onClick={buscarContenedor}>Buscar</button>

          {resultados.length > 0 && (
            <ul className="resultados">
              {resultados.map((c) => (
                <li
                  key={c.id}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      matricula_contenedor: c.matricula_contenedor,
                    })
                  }
                >
                  {c.matricula_contenedor} - {c.posicion} - {c.tipo}
                </li>
              ))}
            </ul>
          )}

          <input
            type="text"
            placeholder="Nombre de la empresa de descarga"
            value={formData.empresa_descarga}
            onChange={(e) =>
              setFormData({ ...formData, empresa_descarga: e.target.value })
            }
          />
          <input
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
          />
          <input
            type="time"
            value={formData.hora}
            onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
          />
          <input
            type="text"
            placeholder="Matrícula del camión"
            value={formData.matricula_camion}
            onChange={(e) =>
              setFormData({ ...formData, matricula_camion: e.target.value })
            }
          />
          <button onClick={guardarProgramacion}>Guardar</button>
        </div>
      )}

      {/* Lista Todas */}
      <div className="lista-programados">
        {programados.map((p) => (
          <div className="card" key={p.id}>
            <h4>{p.matricula_contenedor}</h4>
            <p>Empresa: {p.empresa_descarga}</p>
            <p>Fecha: {p.fecha} - Hora: {p.hora}</p>
            <p>Camión: {p.matricula_camion}</p>

            <div className="acciones">
              {profile?.rol === "dispecer" && (
                <>
                  <button onClick={() => eliminarProgramacion(p.id)}>Eliminar</button>
                  {/* Aici poți adăuga un buton Editar dacă dorești */}
                </>
              )}
              <button onClick={() => marcarHecho(p)}>Hecho</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}