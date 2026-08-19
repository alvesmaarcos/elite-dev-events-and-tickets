import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function EventsList() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true);

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

  return (
    <div className="page">
      <h1>Eventos em cartaz</h1>

      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          carregar(q);
        }}
      >
        <input
          placeholder="Buscar por titulo ou local..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {carregando && <p>Carregando...</p>}
      {!carregando && events.length === 0 && <p>Nenhum evento encontrado.</p>}

      <div className="grid">
        {events.map((ev) => (
          <Link to={`/eventos/${ev.id}`} key={ev.id} className="card">
            <h3>{ev.title}</h3>
            <p className="muted small">{ev.location}</p>
            <p className="muted small">
              {new Date(ev.date).toLocaleString("pt-BR")}
            </p>
            <p className="price">R$ {ev.price.toFixed(2)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
