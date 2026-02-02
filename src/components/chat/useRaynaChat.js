import { useCallback, useMemo, useRef, useState } from "react";
import { parseRequestedLimit } from "./raynahub/helpers";
import { processUserMessage } from "./raynahub/pipeline";

export default function useRaynaChat({
  profile,
  role,
  intentsData,
  ai,
  supabase,
  setSceneWithFade,
  handleDepotChat,
  handleAwaiting,
  routeIntent,
  runActionRef,
  setAwaiting,
  setSaving,
  saving,
  parkingCtx,
  setParkingCtx,
  requestedLimitRef,
  nluInitRef,
  langRef,
  awaiting,
}) {
  const [messages, setMessages] = useState([]);

  const typedDoneRef = useRef(new Set());

  const lastBotIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.from !== "user") return i;
    }
    return -1;
  }, [messages]);

  const sendMessage = useCallback(
    async (userText) => {
      const userTextLocal = String(userText || "").trim();
      if (!userTextLocal) return;

      // Set requested limit BEFORE calling pipeline (single place)
      const reqLim = parseRequestedLimit(userTextLocal);
      if (reqLim) {
        requestedLimitRef.current = reqLim;
        window.__raynaLog("ListLimit/Requested", { limit: reqLim, text: userTextLocal });
      }

      // Call pipeline (single code path)
      await processUserMessage({
        userText: userTextLocal,
        profile,
        role,
        supabase,
        ai,
        intentsData,
        langRef,
        requestedLimitRef,
        awaiting,
        setAwaiting,
        saving,
        setSaving,
        parkingCtx,
        setParkingCtx,
        setMessages,
        setSceneWithFade,
        handleDepotChat,
        handleAwaiting,
        routeIntent,
        runAction: runActionRef.current,
        nluInitRef,
      });
    },
    [
      profile,
      role,
      supabase,
      ai,
      intentsData,
      langRef,
      requestedLimitRef,
      awaiting,
      setAwaiting,
      saving,
      setSaving,
      parkingCtx,
      setParkingCtx,
      setMessages,
      setSceneWithFade,
      handleDepotChat,
      handleAwaiting,
      routeIntent,
      runActionRef,
      nluInitRef,
    ]
  );

  return { messages, setMessages, sendMessage, typedDoneRef, lastBotIndex };
}
