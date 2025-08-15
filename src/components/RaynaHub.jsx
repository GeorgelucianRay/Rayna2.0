// src/components/RaynaHub.jsx
import React, { useRef, useState, useEffect } from 'react';
import Layout from './Layout';
import styles from './Chatbot.module.css';

// Iconițe minimal
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const StopIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export default function RaynaHub() {
  const [messages, setMessages] = useState([
    { id: 'sys-1', role: 'assistant', text: 'Hola 👋 Soy Rayna. ¿En qué te ayudo hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const endRef = useRef(null);

  // auto-scroll la ultimul mesaj
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isGenerating]);

  const send = async () => {
    const q = input.trim();
    if (!q || isGenerating) return;

    // adaugă mesajul userului
    const myMsg = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages(prev => [...prev, myMsg]);
    setInput('');
    setIsGenerating(true);

    // —— MOCK: aici vei chema backendul tău (Edge Function / API route)
    // Poți salva conversația în Supabase și trimite cererea la LLM.
    await new Promise(r => setTimeout(r, 800));
    const fake = { id: `a-${Date.now()}`, role: 'assistant', text: `He recibido: “${q}”. En breve conectaré con el cerebro real 🤖.` };
    setMessages(prev => [...prev, fake]);
    setIsGenerating(false);
  };

  const stop = () => setIsGenerating(false); // când vei face streaming, vei tăia streamul aici

  // quick actions (exemple – le poți schimba)
  const quickies = [
    'Buscar chófer por nombre',
    'Abrir nómina del mes',
    'Crear parte diario hoy',
    'Ver mantenimiento del camión'
  ];

  return (
    <Layout>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h1>Rayna — Chatbot</h1>
            <p className={styles.subtitle}>Centro inteligente: comandos rápidos, preguntas y automatizaciones.</p>
          </div>
          <button className={styles.newChatBtn} onClick={() => setMessages([{ id: 'sys-1', role: 'assistant', text: 'Nueva conversación iniciada.' }])}>
            <PlusIcon /> Nueva
          </button>
        </header>

        {/* Quick widgets: chip-uri de acțiune */}
        <div className={styles.chips}>
          {quickies.map((q) => (
            <button key={q} className={styles.chip} onClick={() => setInput(q)}>{q}</button>
          ))}
        </div>

        {/* Conversația */}
        <div className={styles.chat}>
          {messages.map(msg => (
            <div key={msg.id} className={`${styles.msg} ${msg.role === 'assistant' ? styles.assistant : styles.user}`}>
              <div className={styles.bubble}>{msg.text}</div>
            </div>
          ))}
          {isGenerating && (
            <div className={`${styles.msg} ${styles.assistant}`}>
              <div className={`${styles.bubble} ${styles.thinking}`}>
                <span className={styles.dot}></span><span className={styles.dot}></span><span className={styles.dot}></span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input bar */}
        <form className={styles.inputBar} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe aquí… (Enter para enviar, Shift+Enter salto de línea)"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            {isGenerating ? (
              <button type="button" className={`${styles.btn} ${styles.stop}`} onClick={stop} title="Detener">
                <StopIcon />
              </button>
            ) : (
              <button type="submit" className={`${styles.btn} ${styles.send}`} title="Enviar">
                <SendIcon />
              </button>
            )}
        </form>

        <footer className={styles.footer}>
          <small>Consejo: pronto podrás decir <em>“abre nómina de Lucian de agosto”</em> y Rayna te llevará allí.</small>
        </footer>
      </div>
    </Layout>
  );
}
