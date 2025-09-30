// src/components/chat/actions/handleOpenCamera.js
import ActionsRenderer from "../ui/ActionsRenderer";
import { openCameraByQuery } from "../data/queries";
import { tpl } from "../helpers/templating";

export default async function handleOpenCamera({ intent, slots, setMessages }) {
  const queryName = (slots.cameraName || "").trim();
  if (!queryName) {
    setMessages((m) => [...m, { from: "bot", reply_text: "Dime el nombre de la cámara (por ejemplo: TCB)." }]);
    return;
  }
  const { data, error } = await openCameraByQuery(queryName);
  if (error || !data) {
    setMessages((m) => [...m, { from: "bot", reply_text: tpl(intent.not_found.text, { query: queryName }) }]);
    return;
  }
  const text = tpl(intent.response.text, { camera: data });
  const card = intent.response.objects?.[0];
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: text,
      render: () => (
        <ActionsRenderer
          card={{
            type: "card",
            title: tpl(card.title, { camera: data }),
            actions: (card.actions || []).map((a) => ({
              ...a,
              label: a.label,
              route: tpl(a.route, { camera: data }),
            })),
          }}
        />
      ),
    },
  ]);
}