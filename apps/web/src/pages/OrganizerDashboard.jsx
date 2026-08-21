import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Modal } from "../components/Modal";

export function OrganizerDashboard() {
  const { session, token } = useAuth();

  const [meusEventos, setMeusEventos] = useState([]);
  const [selecionado, setSelecionado] = useState(null);

  // --- catalogo de filmes (listagem paginada) ---
  const [filmes, setFilmes] = useState([]);
  const [q, setQ] = useState("");           // o que esta digitado no campo
  const [termoAtivo, setTermoAtivo] = useState(""); // o que gerou a lista atual
  const [paginaCatalogo, setPaginaCatalogo] = useState(1);
  const [temMaisFilmes, setTemMaisFilmes] = useState(false);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false);
  const [erroCatalogo, setErroCatalogo] = useState(null);

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

  // Carrega uma pagina do catalogo. "acrescentar" distingue os dois usos:
  // uma busca nova SUBSTITUI a lista; o "Mostrar mais" ACRESCENTA ao que ja
  // esta na tela.
  async function carregarCatalogo(termo, pagina, acrescentar) {
    if (!token) return;

    setCarregandoCatalogo(true);
    setErroCatalogo(null);
    try {
      const dados = await api.catalogo(token, termo, pagina);

      setFilmes((atuais) =>
        acrescentar ? [...atuais, ...dados.items] : dados.items
      );
      setPaginaCatalogo(dados.page);
      setTemMaisFilmes(dados.page < dados.totalPages);
    } catch (e) {
      setErroCatalogo("Nao foi possivel carregar o catalogo: " + e.message);
    } finally {
      setCarregandoCatalogo(false);
    }
  }

  // Ao abrir o painel o organizador ja ve os filmes em cartaz, sem precisar
  // buscar nada.
  useEffect(() => {
    carregarCatalogo("", 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function buscarNoCatalogo(e) {
    e.preventDefault();
    setTermoAtivo(q);
    carregarCatalogo(q, 1, false);
  }

  function limparBusca() {
    setQ("");
    setTermoAtivo("");
    carregarCatalogo("", 1, false);
  }

  function mostrarMais() {
    carregarCatalogo(termoAtivo, paginaCatalogo + 1, true);
  }

  // Abre o modal de configuracao da sala para o filme escolhido.
  function adicionarSessao(filme) {
    setSelecionado(filme);
    setErro(null);
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
        <h2>Criar sessoes</h2>
        <p className="muted small">
          {termoAtivo
            ? `Resultados para "${termoAtivo}".`
            : "Filmes em cartaz. Escolha um para publicar uma sessao."}
        </p>

        <form onSubmit={buscarNoCatalogo} className="search-bar">
          <input
            placeholder="Buscar outro filme..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit">Buscar</button>
          {termoAtivo && (
            <button type="button" className="secondary" onClick={limparBusca}>
              Em cartaz
            </button>
          )}
        </form>

        {erroCatalogo && <p className="error">{erroCatalogo}</p>}

        <div className="filmes-grid">
          {filmes.map((filme) => (
            <article key={filme.externalId} className="filme-card">
              {filme.posterUrl ? (
                <img
                  className="filme-poster"
                  src={filme.posterUrl}
                  alt={`Poster de ${filme.title}`}
                  loading="lazy"
                />
              ) : (
                <div className="filme-poster filme-poster-vazio">
                  <span>sem poster</span>
                </div>
              )}

              <div className="filme-info">
                <h4 title={filme.title}>{filme.title}</h4>
                <button type="button" onClick={() => adicionarSessao(filme)}>
                  Adicionar sessao
                </button>
              </div>
            </article>
          ))}
        </div>

        {carregandoCatalogo && <p className="muted">Carregando filmes...</p>}

        {!carregandoCatalogo && filmes.length === 0 && (
          <p className="muted">Nenhum filme encontrado.</p>
        )}

        {temMaisFilmes && (
          <div className="mostrar-mais">
            <button
              type="button"
              className="secondary"
              disabled={carregandoCatalogo}
              onClick={mostrarMais}
            >
              {carregandoCatalogo ? "Carregando..." : "Mostrar mais"}
            </button>
          </div>
        )}
      </section>

      {selecionado && (
        <Modal
          titulo={`Nova sessao: ${selecionado.title}`}
          onClose={() => setSelecionado(null)}
          largura={560}
        >
          <p className="muted small">
            O catalogo fornece titulo, sinopse e poster. Data, local, preco e o
            tamanho da sala sao configuracao sua.
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

            <div className="button-row">
              <button type="submit" disabled={ocupado}>
                {ocupado ? "Publicando..." : "Publicar sessao"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setSelecionado(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
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
