// src/components/depot/DepotPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Layout";
import styles from "./DepotPage.module.css";
import { useAuth } from "../../AuthContext";

import useDepotData from "./hooks/useDepotData";
import useDepotSlots from "./hooks/useDepotSlots";
import useDepotMutations from "./hooks/useDepotMutations";

import DepotTabs from "./components/DepotTabs";
import DepotToolbar from "./components/DepotToolbar";
import DepotMiniMap3D from "./components/DepotMiniMap3D";
import DepotCards from "./components/DepotCards";
import DepotPagination from "./components/DepotPagination";

import AddContainerModal from "./modals/AddContainerModal";
import EditContainerModal from "./modals/EditContainerModal";
import SalidaContainerModal from "./modals/SalidaContainerModal";

export default function DepotPage() {
  const navigate = useNavigate();
  const { session, sessionReady } = useAuth();

  // ► Normal auth check
  if (!sessionReady) {
    return (
      <Layout backgroundClassName="depotBackground">
        <p className={styles.loadingText}>Conectando…</p>
      </Layout>
    );
  }
  if (!session) return navigate("/login");

  // ► State orchestration
  const [activeTab, setActiveTab] = useState("contenedores");
  const [search, setSearch] = useState("");
  const [showMiniMap, setShowMiniMap] = useState(false); // 👈 popup 3D

  // ► Custom hooks that handle logic
  const {
    containers,
    totalPages,
    currentPage,
    setCurrentPage,
    loading,
    refresh,
    selectedContainer,
    openAddModal,
    openEditModal,
    openSalidaModal,
    modalState,
    closeModals,
  } = useDepotData(activeTab, search);

  const slotMap = useDepotSlots(refresh);

  const { handleAdd, handleEdit, handleSalida } = useDepotMutations(
    activeTab,
    refresh
  );

  return (
    <Layout backgroundClassName="depotBackground">
      <div className={styles.pageWrap}>
        {/* TABS */}
        <DepotTabs active={activeTab} onChange={setActiveTab} />

        {/* ACTION SHORTCUTS */}
        <div className={styles.extraButtons}>
          <button
            className={`${styles.actionButton} ${styles.programButton}`}
            onClick={() => navigate("/programacion")}
          >
            📅 Programación
          </button>
          <button
            className={`${styles.actionButton} ${styles.mapButton}`}
            onClick={() => navigate("/mapa")}
          >
            🗺️ Ver Mapa
          </button>

          {activeTab === "contenedores" && (
            <button
              className={`${styles.actionButton}`}
              onClick={() => setShowMiniMap(true)}
            >
              🧭 Mapa rápido 3D
            </button>
          )}
        </div>

        {/* SEARCH + EXCEL + ADD */}
        <DepotToolbar
          activeTab={activeTab}
          search={search}
          setSearch={setSearch}
          onAddClick={openAddModal}
        />

        {/* LISTA */}
        <DepotCards
          containers={containers}
          loading={loading}
          activeTab={activeTab}
          onEdit={openEditModal}
          onSalida={openSalidaModal}
        />

        {/* PAGINATION */}
        <DepotPagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        {/* MODALS */}
        <AddContainerModal
          isOpen={modalState.add}
          onClose={closeModals}
          onAdd={handleAdd}
        />

        <EditContainerModal
          isOpen={modalState.edit}
          selectedContainer={selectedContainer}
          onClose={closeModals}
          onSubmit={handleEdit}
        />

        <SalidaContainerModal
          isOpen={modalState.salida}
          selectedContainer={selectedContainer}
          onClose={closeModals}
          onSubmit={handleSalida}
        />

        {/* 🔍 POPUP 3D MINI MAP */}
        {showMiniMap && (
          <DepotMiniMap3D
            slotMap={slotMap}
            onClose={() => setShowMiniMap(false)}
          />
        )}
      </div>
    </Layout>
  );
}