import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { SeatSelection } from "../components/SeatSelection";

export function EventsList() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true);

  // Evento aberto no modal. null = nenhum, e so a lista aparece.
  const [aberto, setAberto] = useState(null);

  async function carregar(busca = "") {
    setCarregando(true);
    try {
      setEvents(await api.listEvents(busca));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function fecharModal() {
    setAberto(null);
    // A compra pode ter mudado a disponibilidade: recarrega para os numeros
    // da lista nao ficarem defasados.
    carregar(q);
  }

  return (
    <div className="page">
      <h1>Filmes em cartaz</h1>

      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          carregar(q);
        }}
      >
        <input
          placeholder="Buscar por filme ou local..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {carregando && <p>Carregando...</p>}
      {!carregando && events.length === 0 && <p>Nenhum filme em cartaz no momento.</p>}

      <div className="grid">
        {events.map((ev) => (
          <button
            type="button"
            key={ev.id}
            className="card evento-card"
            onClick={() => setAberto(ev)}
          >
            <h3>{ev.title}</h3>
            <p className="muted small">{ev.location}</p>
            <p className="muted small">
              {new Date(ev.date).toLocaleString("pt-BR")}
            </p>
            <p className="price">R$ {ev.price.toFixed(2)}</p>
            <p className="muted small">{ev.available} poltronas livres</p>
          </button>
        ))}
      </div>

      {aberto && (
        <Modal titulo={aberto.title} onClose={fecharModal} largura={780}>
          <SeatSelection eventId={aberto.id} onConcluido={fecharModal} />
        </Modal>
      )}
    </div>
  );
}
