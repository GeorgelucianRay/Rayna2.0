// src/components/chat/actions/handleDialog.jsx
import React from "react"import AddCameraInline from "../ui/AddCameraInline";
import { insertCamera, updateAnnouncement } from "../data/queries";
import { tpl } from "../helpers/templating";

function isAllowed(intent, role) {
  return intent.roles_allowed ? intent.roles_allowed.includes(role) : true;
}

async function entry({ intent, role, setMessages, setAwaiting, saving, setSaving }) {
  if (!isAllowed(intent, role)) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tienes permiso para esta acción." }]);
    return true;
  }
  if (intent.dialog.form === "add_camera_inline") {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: "Perfecto. Añadamos una cámara:",
        render: () => (
          <AddCameraInline
            saving={saving}
            onSubmit={async ({ name, url }) => {
              setSaving(true);
              const { data, error } = await insertCamera({ name, url });
              setSaving(false);
              setMessages((mm) => [
                ...mm,
                { from: "bot", reply_text: error ? intent.dialog.save_err : tpl(intent.dialog.save_ok, { camera: data }) },
              ]);
            }}
          />
        ),
      },
    ]);
    return true;
  }
  if (intent.dialog.await_key === "anuncio_text") {
    setAwaiting("anuncio_text");
    setMessages((m) => [...m, { from: "bot", reply_text: intent.dialog.ask_text }]);
    return true;
  }
  return false;
}

async function stepAnuncio({ userText, role, setMessages, setAwaiting, saving, setSaving, intentsData }) {
  const di = intentsData.find((i) => i.id === "set_anuncio")?.dialog;
  if (!(role === "admin" || role === "dispecer")) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tienes permiso para actualizar anuncios." }]);
    setAwaiting(null);
    return;
  }
  setSaving(true);
  const { error } = await updateAnnouncement(userText);
  setSaving(false);
  setAwaiting(null);
  setMessages((m) => [...m, { from: "bot", reply_text: error ? di.save_err : di.save_ok }]);
}

export default { entry, stepAnuncio };
