import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Modal } from "../components/Modal";
import { SeatSelection } from "../components/SeatSelection";
import { RelatorioEvento } from "../components/RelatorioEvento";
import { Poster } from "../components/Poster";
import { CardsFantasma } from "../components/CardsFantasma";
import { FalhaAoCarregar } from "../components/FalhaAoCarregar";
import { AvisoDeEspera } from "../components/AvisoDeEspera";

/**
 * A partir de quando a sessao entra em "ultimos lugares".
 *
 * Proporcional, e nao um numero fixo: 8 poltronas livres numa sala de 40 e
 * uma sessao acabando; as mesmas 8 numa sala de 300 seriam um erro de
 * contagem. O piso de 5 evita que salas minusculas nasçam alarmadas.
 */
function poucoSobrando(disponiveis, capacidade) {
  if (disponiveis === 0) return false;
  return disponiveis <= Math.max(5, Math.floor(capacidade * 0.1));
}

export function EventsList() {
  const { session, token } = useAuth();

  const [events, setEvents] = useState([]);
  const [q, setQ] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Evento aberto no modal de compra. null = nenhum, e so a lista aparece.
  const [aberto, setAberto] = useState(null);
  const [relatorio, setRelatorio] = useState(null);

  async function carregar(busca = "") {
    setCarregando(true);
    setErro(null);
    try {
      setEvents(await api.listEvents(busca));
    } catch (e) {
      // Sem este catch, uma falha de rede zerava a lista e a tela dizia
      // "nenhum filme em cartaz" -- indistinguivel de um catalogo vazio.
      setErro(e);
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

      {carregando && (
        <>
          <CardsFantasma />
          <AvisoDeEspera />
        </>
      )}

      {!carregando && erro && (
        <FalhaAoCarregar erro={erro} aoTentarDeNovo={() => carregar(q)} />
      )}

      {!carregando && !erro && events.length === 0 && (
        <p>Nenhum filme em cartaz no momento.</p>
      )}

      {/* Mesma vitrine que o organizador ve no painel: o poster e o que faz
          reconhecer o filme de relance. O que muda e a informacao embaixo --
          o cliente precisa saber onde, quando, quanto custa e quanto ainda
          sobrou. */}
      <div className="filmes-grid">
        {events.map((ev) => (
          <div key={ev.id} className="filme-card sessao-card">
            {/* O corpo clicavel e um botao proprio, irmao das acoes do
                organizador -- botao dentro de botao seria HTML invalido. */}
            <button
              type="button"
              className="sessao-corpo"
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

                  {ev.available === 0 ? (
                    <span className="selo selo-esgotado">Esgotado</span>
                  ) : poucoSobrando(ev.available, ev.capacity) ? (
                    <span className="selo selo-ultimos">
                      Ultimos {ev.available}
                    </span>
                  ) : (
                    <span className="muted small">{ev.available} livres</span>
                  )}
                </p>
              </div>
            </button>

            {ehMinhaSessao(ev) && (
              <div className="acoes-evento">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    api.relatorioDoEvento(token, ev.id).then(setRelatorio)
                  }
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
