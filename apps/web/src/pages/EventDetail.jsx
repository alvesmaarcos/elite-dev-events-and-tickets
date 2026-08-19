import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { SeatMap } from "../components/SeatMap";

export function EventDetail() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!id) return;
    api.getEvent(id).then(setEvent);
    api.getSeats(id).then(setSeats);
  }, [id]);

  function alternarAssento(label) {
    setSelected((atual) =>
      atual.includes(label)
        ? atual.filter((l) => l !== label)
        : [...atual, label]
    );
  }

  if (!event) return <div className="page">Carregando...</div>;

  const total = event.price * selected.length;

  return (
    <div className="page page-narrow">
      <h1>{event.title}</h1>
      <p className="muted">
        {event.location} — {new Date(event.date).toLocaleString("pt-BR")}
      </p>
      {event.description && <p>{event.description}</p>}

      <p className="price">R$ {event.price.toFixed(2)} por ingresso</p>
      <p className="muted small">
        {event.available} de {event.capacity} poltronas disponiveis
      </p>

      <SeatMap seats={seats} selected={selected} onToggle={alternarAssento} />

      <div className="checkout-box">
        {selected.length === 0 ? (
          <p className="muted">Escolha suas poltronas no mapa.</p>
        ) : (
          <p>
            {selected.length} poltrona(s): <strong>{selected.join(", ")}</strong>
            <br />
            Total: <span className="price">R$ {total.toFixed(2)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
