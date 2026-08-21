import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { SeatSelection } from "../components/SeatSelection";

/**
 * Pagina do evento, para quem abre o link direto (/eventos/:id).
 *
 * A partir da lista de eventos o mesmo fluxo abre num modal -- mas a rota
 * continua existindo, porque um link compartilhado precisa funcionar.
 */
export function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (id) api.getEvent(id).then(setEvent);
  }, [id]);

  if (!event) return <div className="page">Carregando...</div>;

  return (
    <div className="page">
      <h1>{event.title}</h1>
      {event.description && <p className="muted">{event.description}</p>}

      <SeatSelection eventId={id} />
    </div>
  );
}
