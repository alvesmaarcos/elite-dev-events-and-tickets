import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Modal } from "../components/Modal";
import { SeatSelection } from "../components/SeatSelection";
import { RelatorioEvento } from "../components/RelatorioEvento";

export function EventsList() {
  const { session, token } = useAuth();

  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true);

  // Evento aberto no modal de compra. null = nenhum, e so a lista aparece.
  const [aberto, setAberto] = useState(null);
  const [relatorio, setRelatorio] = useState(null);

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

  // O organizador enxerga acoes extras nas sessoes que sao dele, sem
  // precisar ir ate o painel.
  function ehMinhaSessao(ev) {
    return session?.role === "ORGANIZER" && ev.organizerId === session.id;
  }

  async function encerrar(ev) {
    const aviso =
      `Encerrar "${ev.title}"?\n\n` +
      "A sessao para de aceitar compras e validacoes na portaria, e o " +
      "relatorio final passa a ser definitivo.";

    if (!window.confirm(aviso)) return;

    await api.encerrarEvento(token, ev.id);
    setRelatorio(await api.relatorioDoEvento(token, ev.id));
    // Sessao encerrada sai da vitrine: recarrega para ela desaparecer daqui.
    carregar(q);
  }

  return (
    <div className="page">
      <h1>Sessoes disponiveis</h1>

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
      {!carregando && events.length === 0 && <p>Nenhuma sessao encontrada.</p>}

      <div className="grid">
        {events.map((ev) => (
          <div key={ev.id} className="card evento-card">
            {/* O corpo clicavel e um botao proprio, irmao das acoes do
                organizador -- botao dentro de botao seria HTML invalido. */}
            <button
              type="button"
              className="evento-corpo"
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

            {ehMinhaSessao(ev) && (
              <div className="acoes-evento">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => api.relatorioDoEvento(token, ev.id).then(setRelatorio)}
                >
                  Relatorio
                </button>
                <button type="button" onClick={() => encerrar(ev)}>
                  Encerrar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {aberto && (
        <Modal titulo={aberto.title} onClose={fecharModal} largura={780}>
          <SeatSelection eventId={aberto.id} onConcluido={fecharModal} />
        </Modal>
      )}

      {relatorio && (
        <Modal
          titulo={`Relatorio: ${relatorio.evento.title}`}
          onClose={() => setRelatorio(null)}
          largura={560}
        >
          <RelatorioEvento dados={relatorio} />
        </Modal>
      )}
    </div>
  );
}
