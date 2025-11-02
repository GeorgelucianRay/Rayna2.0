// src/components/chat/dispatchAction.js
import {
  handleOpenCamera,
  handleShowAnnouncement,
  handleGpsNavigate,
  handleGpsInfo,
  handleGpsLists,

  handleWhoAmI,
  handleOpenMyTruck,
  handleDriverSelfInfo,
  handleProfileCompletionStart,
  handleWhatDoYouKnowAboutMe,
  handleProfileAdvantagesVideo,
  handleProfileWizardStart,
  handleProfileWizardStep,

  handleVehItvTruck,
  handleVehItvTrailer,
  handleVehOilStatus,
  handleVehAdblueFilterStatus,

  handleParkingNearStart,
  handleParkingNext,
  handleParkingRecomputeByTime,

  handleDepotChat,
  handleDepotList,
} from "./actions";

import AddGpsWizard from "./ui/AddGpsWizard.jsx";

export async function dispatchAction({
  intent, slots, userText,
  profile, role,
  setMessages, setAwaiting, saving, setSaving,
  parkingCtx, setParkingCtx,
  askUserLocationInteractive, tryGetUserPos,
}) {
  const actionKey = (intent?.action || intent?.id || "").trim();

  const table = {
    // 📸 Camere / Anunțuri
    open_camera: () => handleOpenCamera({ intent, slots, setMessages }),
    show_announcement: () => handleShowAnnouncement({ intent, setMessages }),

    // 🧭 GPS
    gps_route_preview: () => handleGpsNavigate({ intent, slots, setMessages, userText }),
    gps_place_info:    () => handleGpsInfo({ intent, slots, setMessages }),
    gps_list:          () => handleGpsLists({ intent, setMessages }),

    // 🆕 Adăugare locație (wizard GPS)
    gps_add_place: () => {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text: "Abrimos el asistente para añadir la ubicación.",
          render: () => (
            <div className="card" style={{ padding: 0 }}>
              <AddGpsWizard
                onDone={() => {
                  setMessages((mm) => [
                    ...mm,
                    { from: "bot", reply_text: "¡Listo! He guardado la ubicación." },
                  ]);
                }}
                onCancel={() => {
                  setMessages((mm) => [
                    ...mm,
                    { from: "bot", reply_text: "He cancelado el asistente." },
                  ]);
                }}
              />
            </div>
          ),
        },
      ]);
    },

    // 👤 Profil
    who_am_i:                   () => handleWhoAmI({ profile, setMessages, setAwaiting }),
    open_my_truck:              () => handleOpenMyTruck({ profile, setMessages }),
    profile_start_completion:   () => handleProfileCompletionStart({ setMessages }),
    profile_advantages_video:   () => handleProfileAdvantagesVideo({ setMessages }),
    profile_show_advantages_video: () => handleProfileAdvantagesVideo({ setMessages }),
    profile_what_you_know:      () => handleWhatDoYouKnowAboutMe({ profile, setMessages, setAwaiting }),
    profile_complete_start:     () => handleProfileWizardStart({ setMessages, setAwaiting }),
    driver_self_info:           () => handleDriverSelfInfo({ profile, intent, setMessages }),

    // 🚛 Vehicul
    veh_itv_truck:            () => handleVehItvTruck({ profile, setMessages }),
    veh_itv_trailer:          () => handleVehItvTrailer({ profile, setMessages }),
    veh_oil_status:           () => handleVehOilStatus({ profile, setMessages }),
    veh_adblue_filter_status: () => handleVehAdblueFilterStatus({ profile, setMessages }),

    // 🅿️ Parking
    gps_find_parking_near: async () => {
      const userPos = await tryGetUserPos();
      return handleParkingNearStart({ slots, userText, setMessages, setParkingCtx, userPos });
    },
    gps_parking_next_suggestion: () =>
      handleParkingNext({ parkingCtx, setMessages }),
    gps_parking_ask_time: async () => {
      if (!parkingCtx?.dest) {
        setMessages(m => [...m, { from: "bot", reply_text: "Primero pídeme un parking cerca de un sitio." }]);
        return;
      }
      if (!parkingCtx?.userPos) {
        await askUserLocationInteractive();
        return;
      }
      setMessages(m => [
        ...m,
        { from: "bot", reply_text: "¿Cuánto disco te queda? (ej.: 1:25 o 45 min)" },
      ]);
      setAwaiting("parking_time_left");
    },

    // 🏗️ Depot
    depot_lookup: () => handleDepotChat({ userText, profile, setMessages }),
    depot_list:   () => handleDepotList({ userText, setMessages, setAwaiting }),
  };

  try {
    if (table[actionKey]) return await table[actionKey]();
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `Tengo la intención (“${actionKey}”), pero aún no tengo handler para esta acción.` },
    ]);
  } catch (err) {
    console.error("[dispatchAction] Handler error:", err);
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "Ups, algo ha fallado al ejecutar la acción. Intenta de nuevo." },
    ]);
  }
}