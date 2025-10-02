// src/components/chat/actions/index.js
export { default as handleDialog } from "./handleDialog.jsx";
export { default as handleGpsInfo } from "./handleGpsInfo.jsx";
export { default as handleGpsLists } from "./handleGpsLists.jsx";
export { default as handleGpsNavigate } from "./handleGpsNavigate.jsx";
export { default as handleOpenCamera } from "./handleOpenCamera.jsx";
export { default as handleShowAnnouncement } from "./handleShowAnnouncement.jsx";
export { default as handleStatic } from "./handleStatic.jsx";

export {
  handleWhoAmI,
  handleOpenMyTruck,
  handleDriverSelfInfo,
  handleVehItvTruck,
  handleVehItvTrailer,
  handleVehOilStatus,
  handleVehAdblueFilterStatus,
  handleProfileCompletionStart,
  handleWhatDoYouKnowAboutMe,   // 👈 nou
  handleShowAprenderPerfil 
} from "./handleProfileStuff.jsx";

export { handleParkingNearStart, handleParkingNext } from "./handleParkingNear.jsx";