// src/components/chat/actions/handleShowAnnouncement.jsx
import React from "react";
import AnnouncementBox from "../ui/AnnouncementBox";
import { readAnnouncement } from "../data/queries";
import { tpl } from "../helpers/templating";

export default async function handleShowAnnouncement({ intent, setMessages }) {
  const { data, error } = await readAnnouncement();
  const text = intent.response.text;
  const content = error ? "No se pudo cargar el anuncio." : data?.content || "Sin contenido.";
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: text,
      render: () => <AnnouncementBox content={tpl(intent.response.objects[0].content, { announcement: { content } })} />,
    },
  ]);
}
