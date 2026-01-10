// src/components/depot/DepotPage.jsx
import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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

  // ✅ așteaptă auth
  if (!sessionReady) {
    return (
      <Layout backgroundClassName="depotBackground">
        <p className={styles.loadingText}>Conectando…</p>
      </Layout>
    );
  }

  // ✅ redirect corect (fără navigate în render)
  if (!session) return <Navigate to="/login" replace />;

  const [activeTab, setActiveTab] = useState("contenedores");
  const [search, setSearch] = useState("");
  const [showMiniMap, setShowMiniMap] = useState(false);

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
  const { handleAdd, handleEdit, handleSalida } = useDepotMutations(activeTab, refresh);

  return (
    <Layout backgroundClassName="depotBackground">
      <div className={styles.pageWrap}>
        {/* Header area (look iOS) */}
        <div className={styles.topPad} />

        {/* Tabs */}
        <div className={styles.glassTop}>
          <DepotTabs active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Quick chips */}
        <div className={styles.extraButtons}>
          <button
            className={`${styles.chipBtn} ${styles.chipPrimary}`}
            onClick={() => navigate("/programacion")}
            type="button"
          >
            <span className={styles.chipIcon}>📅</span>
            Programación
          </button>

          <button
            className={`${styles.chipBtn} ${styles.chipNeutral}`}
            onClick={() => navigate("/mapa")}
            type="button"
          >
            <span className={styles.chipIcon}>🗺️</span>
            Ver mapa
          </button>

          {activeTab === "contenedores" && (
            <button
              className={`${styles.chipBtn} ${styles.chipNeutral}`}
              onClick={() => setShowMiniMap(true)}
              type="button"
            >
              <span className={styles.chipIcon}>🧭</span>
              Mapa rápido 3D
            </button>
          )}
        </div>

        {/* Search / add */}
        <div className={styles.glassBlock}>
          <DepotToolbar
            activeTab={activeTab}
            search={search}
            setSearch={setSearch}
            onAddClick={openAddModal}
          />
        </div>

        {/* List */}
        <div className={styles.cardsBlock}>
          <DepotCards
            containers={containers}
            loading={loading}
            activeTab={activeTab}
            onEdit={openEditModal}
            onSalida={openSalidaModal}
          />
        </div>

        {/* Pagination */}
        <div className={styles.glassBlock}>
          <DepotPagination
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Modals */}
        <AddContainerModal isOpen={modalState.add} onClose={closeModals} onAdd={handleAdd} />

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

        {/* Mini map */}
        {showMiniMap && <DepotMiniMap3D slotMap={slotMap} onClose={() => setShowMiniMap(false)} />}

        <div className={styles.bottomSafe} />
      </div>
    </Layout>
  );
}