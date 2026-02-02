import React from "react";
import ErrorTray from "../ui/ErrorTray.jsx";

const RAYNA_AVATAR = "/AvatarRayna.PNG";

/* ─────────────── Icon Components ─────────────── */
const IconClose = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
    close
  </span>
);

const IconStories = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
    auto_stories
  </span>
);

const IconReport = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
    report_problem
  </span>
);

const IconAttach = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
    attach_file
  </span>
);

const IconSend = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
    send
  </span>
);

/* ─────────────── Header Section ─────────────── */
function ChatHeader({ styles, goHome }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.avatarLg}>
          <img
            src={RAYNA_AVATAR}
            alt="Rayna"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        </div>
        <div className={styles.headerTitles}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Hub de Logística</div>
        </div>
      </div>

      <button className={styles.iconBtn} onClick={goHome} aria-label="Cerrar y volver al inicio">
        <IconClose />
      </button>
    </header>
  );
}

/* ─────────────── Quick Action Chips ─────────────── */
function QuickActionChips({ styles, quickAprender, quickReport }) {
  return (
    <div className={styles.chips}>
      <button
        type="button"
        className={`${styles.chip} ${styles.chipPrimary}`}
        onClick={quickAprender}
        aria-label="Abrir Aprender"
      >
        <span className={styles.chipIcon}>
          <IconStories />
        </span>
        <span className={styles.chipText}>Aprender</span>
      </button>

      <button type="button" className={styles.chip} onClick={quickReport} aria-label="Reclamar un error">
        <span className={styles.chipIcon}>
          <IconReport />
        </span>
        <span className={styles.chipText}>Reclamar</span>
      </button>
    </div>
  );
}

/* ─────────────── Message Area ─────────────── */
function MessageArea({ styles, messages, renderBot, renderUser, endRef }) {
  return (
    <main className={styles.chat}>
      {messages.map((m, i) => (m.from === "user" ? renderUser(m, i) : renderBot(m, i)))}
      <div ref={endRef} />
    </main>
  );
}

/* ─────────────── Input Footer ─────────────── */
function InputFooter({ styles, text, setText, send }) {
  return (
    <footer className={styles.inputWrap}>
      <div className={styles.inputPill}>
        <button
          className={styles.attachBtn}
          type="button"
          aria-label="Adjuntar (en desarrollo)"
          title="Adjuntar (en desarrollo)"
        >
          <IconAttach />
        </button>

        <input
          className={styles.input}
          placeholder="Escriba su consulta logística..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
          inputMode="text"
        />

        <button className={styles.sendBtn} onClick={send} type="button">
          <span className={styles.sendText}>Enviar</span>
          <IconSend />
        </button>
      </div>

      <div className={styles.safePad} />
    </footer>
  );
}

/* ─────────────── Background Layers ─────────────── */
function BackgroundLayers({ styles, bgA, bgB, showA }) {
  return (
    <>
      <div
        className={styles.bgA}
        style={{
          "--chat-bg": `url("${bgA}")`,
          opacity: showA ? 1 : 0,
        }}
      />
      <div
        className={styles.bgB}
        style={{
          "--chat-bg": `url("${bgB}")`,
          opacity: showA ? 0 : 1,
        }}
      />
      <div className={styles.bgVeil} />
    </>
  );
}

/* ─────────────── Main ChatLayout Component ─────────────── */
export default function ChatLayout({
  styles,
  bgA,
  bgB,
  showA,
  messages,
  renderBot,
  renderUser,
  endRef,
  text,
  setText,
  send,
  goHome,
  quickAprender,
  quickReport,
  isAdmin,
}) {
  return (
    <div className={styles.stage}>
      <div className={styles.shell}>
        <BackgroundLayers styles={styles} bgA={bgA} bgB={bgB} showA={showA} />
        <ChatHeader styles={styles} goHome={goHome} />
        <QuickActionChips styles={styles} quickAprender={quickAprender} quickReport={quickReport} />
        <MessageArea styles={styles} messages={messages} renderBot={renderBot} renderUser={renderUser} endRef={endRef} />
        <InputFooter styles={styles} text={text} setText={setText} send={send} />
        {isAdmin ? <ErrorTray /> : null}
      </div>
    </div>
  );
}
