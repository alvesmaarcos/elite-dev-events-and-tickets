import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export function OrganizerDashboard() {
  const { session, token } = useAuth();

  const [meusEventos, setMeusEventos] = useState([]);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [selecionado, setSelecionado] = useState(null);

  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState(20);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [roomRows, setRoomRows] = useState(8);
  const [roomSeatsPerRow, setRoomSeatsPerRow] = useState(12);

  const [editandoId, setEditandoId] = useState(null);
  const [formEdicao, setFormEdicao] = useState(null);
  const [erroEdicao, setErroEdicao] = useState(null);

  function carregarMeusEventos() {
    if (token) api.myEvents(token).then(setMeusEventos);
  }

  useEffect(carregarMeusEventos, [token]);

  function abrirEdicao(evento) {
    setEditandoId(evento.id);
    setErroEdicao(null);
    setFormEdicao({
      // slice(0, 16) corta a data para o formato que o datetime-local espera
      date: new Date(evento.date).toISOString().slice(0, 16),
      location: evento.location,
      description: evento.description || "",
      price: evento.price,
      roomRows: evento.roomRows,
      roomSeatsPerRow: evento.roomSeatsPerRow,
    });
  }

  async function salvarEdicao(evento) {
    setErroEdicao(null);

    const base = {
      date: new Date(formEdicao.date).toISOString(),
      location: formEdicao.location,
      description: formEdicao.description,
    };

    // Depois da primeira venda, nem enviamos os campos restritos -- o back
    // recusaria com 409 de qualquer forma.
    const payload = evento.hasSold
      ? base
      : {
          ...base,
          price: Number(formEdicao.price),
          roomRows: Number(formEdicao.roomRows),
          roomSeatsPerRow: Number(formEdicao.roomSeatsPerRow),
        };

    try {
      await api.atualizarEvento(token, evento.id, payload);
      setEditandoId(null);
      carregarMeusEventos();
    } catch (e) {
      setErroEdicao(e.message);
    }
  }

  async function cancelarEvento(evento) {
    const aviso =
      `Cancelar "${evento.title}"?\n\n` +
      "Todos os ingressos emitidos serao invalidados e as poltronas liberadas.";

    if (!window.confirm(aviso)) return;

    await api.cancelarEvento(token, evento.id);
    carregarMeusEventos();
  }

  async function buscarNoCatalogo(e) {
    e.preventDefault();
    setResultados(await api.searchCatalog(token, q));
  }

  async function publicar(e) {
    e.preventDefault();
    if (!selecionado) return;

    setErro(null);
    setOcupado(true);
    try {
      await api.createEvent(token, {
        title: selecionado.title,
        description: selecionado.overview,
        posterUrl: selecionado.posterUrl,
        externalSource: "tmdb",
        externalId: selecionado.externalId,
        date: new Date(date).toISOString(),
        location,
        price: Number(price),
        roomRows: Number(roomRows),
        roomSeatsPerRow: Number(roomSeatsPerRow),
      });
      setSelecionado(null);
      setLocation("");
      setDate("");
      carregarMeusEventos();
    } catch (e) {
      setErro("Erro ao publicar: " + e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!session || session.role !== "ORGANIZER") {
    return <div className="page page-narrow">Area restrita a organizadores.</div>;
  }

  return (
    <div className="page">
      <h1>Painel do organizador</h1>

      <section>
        <h2>1. Buscar no catalogo</h2>
        <form onSubmit={buscarNoCatalogo} className="search-bar">
          <input
            placeholder="Nome do filme..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">Buscar</button>
        </form>

        <div className="grid">
          {resultados.map((filme) => (
            <button
              type="button"
              key={filme.externalId}
              className={`card catalog-card ${
                selecionado?.externalId === filme.externalId ? "selected" : ""
              }`}
              onClick={() => setSelecionado(filme)}
            >
              <h4>{filme.title}</h4>
              <p className="muted small">{filme.overview.slice(0, 90)}...</p>
            </button>
          ))}
        </div>
      </section>

      {selecionado && (
        <section>
          <h2>2. Configurar a sessao: {selecionado.title}</h2>
          <p className="muted small">
            O catalogo fornece titulo, sinopse e poster. Data, local e preco sao
            configuracao sua.
          </p>

          <form onSubmit={publicar} className="form">
            <label>
              Data e hora
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label>
              Local
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </label>
            <label>
              Fileiras da sala
              <input
                type="number"
                min={1}
                max={26}
                value={roomRows}
                onChange={(e) => setRoomRows(e.target.value)}
                required
              />
            </label>

            <label>
              Assentos por fileira
              <input
                type="number"
                min={1}
                max={60}
                value={roomSeatsPerRow}
                onChange={(e) => setRoomSeatsPerRow(e.target.value)}
                required
              />
            </label>

            <p className="muted small">
              Total: {Number(roomRows) * Number(roomSeatsPerRow)} poltronas.
            </p>

            <label>
              Preco do ingresso (R$)
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>

            {erro && <p className="error">{erro}</p>}
            <button type="submit" disabled={ocupado}>
              {ocupado ? "Publicando..." : "Publicar evento"}
            </button>
          </form>
        </section>
      )}

      <section>
        <h2>Meus eventos publicados</h2>
        <div className="grid">
          {meusEventos.map((ev) => (
            <div key={ev.id} className="card">
              <h4>
                {ev.title}{" "}
                {ev.canceled && <span className="muted small">(cancelado)</span>}
              </h4>
              <p className="muted small">{ev.location}</p>
              <p className="muted small">
                {new Date(ev.date).toLocaleString("pt-BR")}
              </p>
              <p className="muted small">
                {ev.available}/{ev.capacity} disponiveis
              </p>

              {editandoId === ev.id ? (
                <div className="form">
                  <label>
                    Data e hora
                    <input
                      type="datetime-local"
                      value={formEdicao.date}
                      onChange={(e) =>
                        setFormEdicao({ ...formEdicao, date: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Local
                    <input
                      value={formEdicao.location}
                      onChange={(e) =>
                        setFormEdicao({ ...formEdicao, location: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Descricao
                    <input
                      value={formEdicao.description}
                      onChange={(e) =>
                        setFormEdicao({ ...formEdicao, description: e.target.value })
                      }
                    />
                  </label>

                  {ev.hasSold ? (
                    <p className="muted small">
                      Ja ha ingressos vendidos: preco e tamanho da sala nao podem
                      mais mudar.
                    </p>
                  ) : (
                    <>
                      <label>
                        Preco (R$)
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={formEdicao.price}
                          onChange={(e) =>
                            setFormEdicao({ ...formEdicao, price: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Fileiras
                        <input
                          type="number"
                          min={1}
                          max={26}
                          value={formEdicao.roomRows}
                          onChange={(e) =>
                            setFormEdicao({ ...formEdicao, roomRows: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Assentos por fileira
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={formEdicao.roomSeatsPerRow}
                          onChange={(e) =>
                            setFormEdicao({
                              ...formEdicao,
                              roomSeatsPerRow: e.target.value,
                            })
                          }
                        />
                      </label>
                    </>
                  )}

                  {erroEdicao && <p className="error">{erroEdicao}</p>}

                  <div className="button-row">
                    <button type="button" onClick={() => salvarEdicao(ev)}>
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditandoId(null)}
                    >
                      Cancelar edicao
                    </button>
                  </div>
                </div>
              ) : (
                !ev.canceled && (
                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => abrirEdicao(ev)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => cancelarEvento(ev)}
                    >
                      Cancelar evento
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
