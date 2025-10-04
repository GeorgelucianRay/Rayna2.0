// src/components/chat/actions/index.js

// ==== acțiuni simple ====
export { default as handleDialog } from "./handleDialog.jsx";
export { default as handleGpsInfo } from "./handleGpsInfo.jsx";
export { default as handleGpsLists } from "./handleGpsLists.jsx";
export { default as handleGpsNavigate } from "./handleGpsNavigate.jsx";
export { default as handleOpenCamera } from "./handleOpenCamera.jsx";
export { default as handleShowAnnouncement } from "./handleShowAnnouncement.jsx";
export { default as handleStatic } from "./handleStatic.jsx";

// ==== profil ====
export {
  handleWhoAmI,
  handleOpenMyTruck,
  handleDriverSelfInfo,
  handleVehItvTruck,
  handleVehItvTrailer,
  handleVehOilStatus,
  handleVehAdblueFilterStatus,
  handleProfileCompletionStart,
  handleWhatDoYouKnowAboutMe,
  handleShowAprenderPerfil,
  handleProfileAdvantagesVideo,
  handleProfileWizardStart,
  handleProfileWizardStep,
} from "./handleProfileStuff.jsx";

// ==== parking ====
export {
  handleParkingNearStart,
  handleParkingNext,
  handleParkingRecomputeByTime,
  parseTimeToMinutes,
} from "./handleParkingNear.jsx";