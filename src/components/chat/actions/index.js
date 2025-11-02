// src/components/chat/actions/index.js
export { default as handleDialog } from "./handleDialog.jsx";
export { default as handleGpsInfo } from "./handleGpsInfo.jsx";
export { default as handleGpsLists } from "./handleGpsLists.jsx";
export { default as handleGpsNavigate } from "./handleGpsNavigate.jsx";
export { default as handleOpenCamera } from "./handleOpenCamera.jsx";
export { default as handleShowAnnouncement } from "./handleShowAnnouncement.jsx";
export { default as handleStatic } from "./handleStatic.jsx";
export { default as handleDepotChat } from "./handleDepotChat.jsx";
export { default as handleDepotList } from "./handleDepotList.jsx";

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

// 🚗 Parking
export {
  handleParkingNearStart,
  handleParkingNext,
  handleParkingRecomputeByTime,
  parseTimeToMinutes,
} from "./handleParkingNear.jsx";

// ❗ nou: „nu ajung / otro parking -> întreabă timpul”
export { default as handleParkingAskTime } from "./handleParkingAskTime.jsx";