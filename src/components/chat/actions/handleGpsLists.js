// src/components/chat/actions/handleGpsLists.js
import SimpleList from "../ui/SimpleList";
import { listTable } from "../data/queries";
import { getMapsLinkFromRecord } from "../helpers/gps";
import React from "react";

export default async function handleGpsLists({ intent, setMessages }) {
  const map = {
    gps_list_terminale: "gps_terminale",
    gps_list_parkings: "gps_parkings",
    gps_list_servicios: "gps_servicios",
  };
  const table = map[intent.id];
  if (!table) return;

  const { data } = await listTable(table);
  const items = (data || []).map((d) => ({ ...d, _table: table, _mapsUrl: getMapsLinkFromRecord(d) }));

  const labels = {
    gps_list_terminale: "Terminales",
    gps_list_parkings: "Parkings",
    gps_list_servicios: "Servicios",
  };

  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: intent.response?.text || `${labels[intent.id]}:`, render: () => (
      <SimpleList title={labels[intent.id]} items={items} />
    ) },
  ]);
}