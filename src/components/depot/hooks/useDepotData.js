// src/components/depot/hooks/useDepotData.js
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../../supabaseClient";

export default function useDepotData(activeTab, search) {
  const ITEMS = 25;

  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedContainer, setSelectedContainer] = useState(null);

  const modalState = {
    add: false,
    edit: false,
    salida: false
  };
  const [modals, setModals] = useState(modalState);

  const refresh = useRef(0);
  const triggerRefresh = () => (refresh.current += 1);

  const closeModals = () => setModals(modalState);

  const openAddModal = () => setModals({ ...modalState, add: true });
  const openEditModal = (c) =>
    setModals({ ...modalState, edit: true }) || setSelectedContainer(c);
  const openSalidaModal = (c) =>
    setModals({ ...modalState, salida: true }) || setSelectedContainer(c);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const norm = (s) => String(s || "").toLowerCase();
    const q = norm(search);

    if (activeTab === "contenedores") {
      const [{ data: dep }, { data: prog }] = await Promise.all([
        supabase.from("contenedores").select("*").order("created_at", { ascending: false }),
        supabase.from("contenedores_programados").select("*").order("created_at", { ascending: false })
      ]);

      let list = [
        ...(dep || []).map((x) => ({ ...x, __from: "contenedores" })),
        ...(prog || []).map((x) => ({ ...x, __from: "programados" }))
      ];

      if (q) {
        list = list.filter((x) =>
          norm(x.matricula_contenedor).includes(q) ||
          norm(x.naviera).includes(q) ||
          norm(x.posicion).includes(q) ||
          norm(x.matricula_camion).includes(q) ||
          norm(x.empresa_descarga).includes(q)
        );
      }

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const total = list.length;
      setTotalPages(Math.max(1, Math.ceil(total / ITEMS)));

      const start = (currentPage - 1) * ITEMS;
      const end = start + ITEMS;

      setContainers(list.slice(start, end));
      setLoading(false);
      return;
    }

    // rotos / salidos
    const query = supabase
      .from(activeTab)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .ilike("matricula_contenedor", `%${search}%`);

    const { data, count } = await query;
    setTotalPages(Math.max(1, Math.ceil((count || 0) / ITEMS)));

    const start = (currentPage - 1) * ITEMS;
    const end = start + ITEMS;

    setContainers(data?.slice(start, end) || []);
    setLoading(false);
  }, [activeTab, search, currentPage, refresh.current]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    containers,
    loading,
    totalPages,
    currentPage,
    setCurrentPage,
    refresh: triggerRefresh,
    selectedContainer,

    modalState: modals,
    openAddModal,
    openEditModal,
    openSalidaModal,
    closeModals
  };
}