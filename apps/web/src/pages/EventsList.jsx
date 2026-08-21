import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { SeatSelection } from "../components/SeatSelection";
import { Poster } from "../components/Poster";

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

      {/* Mesma vitrine que o organizador ve no painel: o poster e o que faz
          reconhecer o filme de relance. O que muda e a informacao embaixo --
          o cliente precisa saber onde, quando, quanto custa e quanto ainda
          sobrou. */}
      <div className="filmes-grid">
        {events.map((ev) => (
          <button
            type="button"
            key={ev.id}
            className="filme-card sessao-card"
            onClick={() => setAberto(ev)}
            // O conteudo do card e visual (poster, titulo, numeros soltos).
            // Um leitor de tela leria essa colagem fora de ordem; o rotulo
            // diz de uma vez o que o botao faz.
            aria-label={`${ev.title} - escolher poltronas`}
          >
            <Poster url={ev.posterUrl} titulo={ev.title} />

            <div className="filme-info">
              <h4 title={ev.title}>{ev.title}</h4>

              <p className="muted small">
                {new Date(ev.date).toLocaleString("pt-BR")}
              </p>
              <p className="muted small">{ev.location}</p>

              <p className="sessao-rodape">
                <span className="price">R$ {ev.price.toFixed(2)}</span>
                <span className="muted small">
                  {ev.available} {ev.available === 1 ? "livre" : "livres"}
                </span>
              </p>
            </div>
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
