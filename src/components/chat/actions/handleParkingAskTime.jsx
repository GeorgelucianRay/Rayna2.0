// src/components/chat/actions/handleParkingAskTime.jsx
export async function handleParkingAskTime({ setMessages, setParkingCtx }) {
  // întreabă utilizatorul cât disc îi mai rămâne
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text:
        "¿Cuánto disco te queda? (Ejemplos: 1:25 · 45m · 1h 15m)",
    },
  ]);

  // punem chat-ul în modul „aștept timp”
  setParkingCtx((pc) => ({ ...(pc || {}), type: "parking", mode: "await_time" }));
}

export default handleParkingAskTime;