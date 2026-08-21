import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const COLUNAS = 6;

// Quantos posteres DIFERENTES cada coluna usa. O numero decide o tamanho do
// laco: poucos posteres e a repeticao fica obvia, muitos e a coluna vira uma
// fita quilometrica que precisaria correr rapido demais para dar a volta.
const POR_COLUNA = 4;

/**
 * Distribui os posteres em colunas verticais.
 *
 * Cada coluna recebe a lista DUPLICADA: e isso que permite rolar ate a
 * metade e voltar ao inicio sem que se perceba o corte -- a segunda copia
 * ocupa exatamente o lugar que a primeira deixou.
 */
function montarParede(posters) {
  // Com poucos posteres a parede fica ralinha e o efeito atrapalha em vez de
  // ajudar. Nesse caso e melhor nao ter parede nenhuma.
  if (posters.length < COLUNAS * 2) return [];

  const colunas = Array.from({ length: COLUNAS }, () => []);
  posters.forEach((url, i) => colunas[i % COLUNAS].push(url));

  return colunas.map((coluna) => {
    const usados = coluna.slice(0, POR_COLUNA);
    return [...usados, ...usados];
  });
}

/**
 * Segundo botao do hero: depende de quem esta olhando.
 *
 * Quem ainda nao entrou precisa da porta de entrada; quem ja entrou precisa
 * do proprio lugar de trabalho -- e nao de um "Entrar" que nao faz sentido.
 */
function atalhoDoUsuario(session) {
  if (!session) return { para: "/login", texto: "Entrar" };
  if (session.role === "ORGANIZER") return { para: "/organizador", texto: "Painel do organizador" };
  if (session.role === "GATE") return { para: "/portaria", texto: "Abrir a portaria" };
  return { para: "/meus-ingressos", texto: "Meus ingressos" };
}

export function Landing() {
  const { session } = useAuth();
  const [parede, setParede] = useState([]);
  const [emCartaz, setEmCartaz] = useState([]);

  useEffect(() => {
    // As duas chamadas sao independentes e nenhuma delas e essencial: se a
    // TMDb estiver fora, o fundo fica liso; se nao houver sessao publicada,
    // a previa some. A pagina inicial nunca quebra por causa disso.
    api
      .vitrine()
      .then((dados) => setParede(montarParede(dados.posters || [])))
      .catch(() => {});

    api
      .listEvents()
      .then((lista) => setEmCartaz(lista.slice(0, 4)))
      .catch(() => {});
  }, []);

  const atalho = atalhoDoUsuario(session);

  return (
    <div className="landing">
      <section className="hero">
        <div className="parede" aria-hidden="true">
          {parede.map((coluna, i) => (
            <div
              key={i}
              className={`parede-coluna ${i % 2 === 0 ? "sobe" : "desce"}`}
              style={{ "--duracao": `${90 + i * 14}s` }}
            >
              {/* Sem loading="lazy" de proposito: a parede esta no alto da
                  pagina e girada, e o navegador erra a conta de "esta
                  visivel?" nesse contexto -- o resultado eram buracos no
                  lugar dos posteres. */}
              {coluna.map((url, j) => (
                <img key={j} src={url} alt="" decoding="async" />
              ))}
            </div>
          ))}
        </div>

        <div className="hero-conteudo">
          <p className="hero-marca">Elite Tickets</p>
          <h1>
            Escolha o filme.
            <br />
            Escolha a poltrona.
          </h1>
          <p className="hero-texto">
            Sessoes de cinema com mapa de sala de verdade: voce ve quais
            poltronas estao livres, reserva as suas e recebe um ingresso com
            QR Code para apresentar na portaria.
          </p>

          <div className="hero-acoes">
            <Link to="/filmes" className="botao botao-grande">
              Ver filmes em cartaz
            </Link>
            <Link to={atalho.para} className="botao botao-grande botao-vazado">
              {atalho.texto}
            </Link>
          </div>
        </div>
      </section>

      <section className="passos">
        <div>
          <span className="passo-numero">1</span>
          <h3>Escolha a sessao</h3>
          <p className="muted small">
            Filmes em cartaz com data, local e preco de cada sessao.
          </p>
        </div>
        <div>
          <span className="passo-numero">2</span>
          <h3>Marque sua poltrona</h3>
          <p className="muted small">
            O mapa da sala mostra o que esta livre. Suas poltronas ficam
            reservadas enquanto voce fecha a compra.
          </p>
        </div>
        <div>
          <span className="passo-numero">3</span>
          <h3>Entre com o QR Code</h3>
          <p className="muted small">
            O ingresso vale uma unica entrada: a portaria le o codigo e ele e
            marcado como utilizado.
          </p>
        </div>
      </section>

      {emCartaz.length > 0 && (
        <section className="previa">
          <div className="previa-topo">
            <h2>Em cartaz agora</h2>
            <Link to="/filmes">Ver todos</Link>
          </div>

          <div className="filmes-grid">
            {emCartaz.map((ev) => (
              <Link key={ev.id} to={`/filmes/${ev.id}`} className="filme-card">
                {ev.posterUrl ? (
                  <img
                    className="filme-poster"
                    src={ev.posterUrl}
                    alt={`Poster de ${ev.title}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="filme-poster filme-poster-vazio">
                    <span>sem poster</span>
                  </div>
                )}

                <div className="filme-info">
                  <h4 title={ev.title}>{ev.title}</h4>
                  <p className="muted small">
                    {new Date(ev.date).toLocaleString("pt-BR")}
                  </p>
                  <p className="price">R$ {ev.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
