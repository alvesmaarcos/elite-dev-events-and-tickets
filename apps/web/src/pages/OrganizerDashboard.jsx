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

  function carregarMeusEventos() {
    if (token) api.myEvents(token).then(setMeusEventos);
  }

  useEffect(carregarMeusEventos, [token]);

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
              <h4>{ev.title}</h4>
              <p className="muted small">{ev.location}</p>
              <p className="muted small">
                {new Date(ev.date).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
