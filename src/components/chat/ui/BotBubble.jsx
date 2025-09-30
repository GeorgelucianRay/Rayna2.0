// src/components/chat/ui/BotBubble.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "../Chatbot.module.css";

export default function BotBubble({ reply_text, children }) {
  const [shown, setShown] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    const txt = reply_text || "";
    const speed = 18;
    const t = setInterval(() => {
      idx.current++;
      setShown(txt.slice(0, idx.current));
      if (idx.current >= txt.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [reply_text]);
  return (
    <div className={`${styles.bubble} ${styles.bot}`}>
      <div className={styles.botText}>
        {shown}
        {shown.length < (reply_text || "").length && <span className={styles.cursor}>▍</span>}
      </div>
      {shown.length === (reply_text || "").length && children}
    </div>
  );
}