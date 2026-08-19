import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (id) api.getEvent(id).then(setEvent);
  }, [id]);

  if (!event) return <div className="page">Carregando...</div>;

  return (
    <div className="page page-narrow">
      <h1>{event.title}</h1>
      <p className="muted">
        {event.location} — {new Date(event.date).toLocaleString("pt-BR")}
      </p>
      {event.description && <p>{event.description}</p>}
      <p className="price">R$ {event.price.toFixed(2)} por ingresso</p>
    </div>
  );
}
