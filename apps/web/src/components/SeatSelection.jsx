import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SeatMap } from "./SeatMap";
import { Poster } from "./Poster";
import { FalhaAoCarregar } from "./FalhaAoCarregar";
import { AvisoDeEspera } from "./AvisoDeEspera";
import { Combo } from "./Combo";

const ETAPA = {
  ESCOLHENDO: "escolhendo",
  RESERVADO: "reservado",
  CONCLUIDO: "concluido",
};

/**
 * Todo o fluxo de compra: escolher poltronas -> segurar por 2 min -> pagar.
 *
 * Vive num componente proprio porque aparece em dois lugares: dentro do
 * modal aberto pela lista de eventos, e na pagina /eventos/:id (que continua
 * existindo para quem abre o link direto). A logica e uma so.
 */
export function SeatSelection({ eventId, onConcluido }) {
  const { session, token } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [etapa, setEtapa] = useState(ETAPA.ESCOLHENDO);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [restanteMs, setRestanteMs] = useState(0);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [ingressos, setIngressos] = useState([]);
  const [falhaAoAbrir, setFalhaAoAbrir] = useState(null);
  const [cardapio, setCardapio] = useState(null);
  const [combo, setCombo] = useState([]);

  const intervaloRef = useRef(null);

  function carregarMapa() {
    if (eventId) api.getSeats(eventId, token).then(setSeats).catch(setFalhaAoAbrir);
  }

  function carregarTudo() {
    if (!eventId) return;
    setFalhaAoAbrir(null);
    // As duas juntas: sem o mapa nao da para escolher, sem a sessao nao da
    // para mostrar preco. Se qualquer uma falhar, a tela inteira precisa
    // dizer isso -- e nao abrir um modal vazio, sem explicacao.
    Promise.all([
      api.getEvent(eventId).then(setEvent),
      api.getSeats(eventId, token).then(setSeats),
    ]).catch(setFalhaAoAbrir);

    // O cardapio da lojinha nao e essencial para comprar o ingresso: se ele
    // falhar, a compra continua funcionando sem os adicionais.
    if (token) api.cardapio(token).then(setCardapio).catch(() => setCardapio(null));
  }

  useEffect(carregarTudo, [eventId, token]);

  // cronometro da reserva
  useEffect(() => {
    if (etapa !== ETAPA.RESERVADO || !holdExpiresAt) return undefined;

    function tick() {
      const restante = new Date(holdExpiresAt).getTime() - Date.now();
      setRestanteMs(Math.max(0, restante));

      if (restante <= 0) {
        clearInterval(intervaloRef.current);
        setEtapa(ETAPA.ESCOLHENDO);
        setSelected([]);
        setErro("Sua reserva expirou. Escolha as poltronas novamente.");
        carregarMapa();
      }
    }

    tick();
    intervaloRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervaloRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, holdExpiresAt]);

  function alternarAssento(label) {
    setSelected((atual) =>
      atual.includes(label)
        ? atual.filter((l) => l !== label)
        : [...atual, label]
    );
  }

  async function reservar() {
    if (!session) return navigate("/login");
    if (session.role !== "CLIENT") {
      setErro("Apenas contas de cliente podem comprar ingressos.");
      return;
    }

    setErro(null);
    setOcupado(true);
    try {
      const dados = await api.holdSeats(token, eventId, selected);
      setHoldExpiresAt(dados.holdExpiresAt);
      setEtapa(ETAPA.RESERVADO);
      carregarMapa();
    } catch (e) {
      setErro(e.message);
      setSelected([]);
      carregarMapa();
    } finally {
      setOcupado(false);
    }
  }

  async function pagar(outcome) {
    setErro(null);
    setOcupado(true);
    try {
      const dados = await api.confirmarPagamento(
        token,
        eventId,
        selected,
        outcome,
        // O servidor reconfere preco e opcoes; daqui vai so a escolha.
        combo.map(({ productId, option, quantity }) => ({
          productId,
          option,
          quantity,
        }))
      );

      if (outcome === "decline") {
        setEtapa(ETAPA.ESCOLHENDO);
        setSelected([]);
        setCombo([]);
        setErro("Pagamento recusado. As poltronas foram liberadas.");
      } else {
        setIngressos(dados.tickets);
        setEtapa(ETAPA.CONCLUIDO);
      }
    } catch (e) {
      setErro(e.message);
      setEtapa(ETAPA.ESCOLHENDO);
      setSelected([]);
    } finally {
      setOcupado(false);
      carregarMapa();
    }
  }

  if (falhaAoAbrir) {
    return <FalhaAoCarregar erro={falhaAoAbrir} aoTentarDeNovo={carregarTudo} />;
  }

  if (!event) {
    return (
      <>
        <p className="muted">Carregando...</p>
        <AvisoDeEspera />
      </>
    );
  }

  const totalIngressos = event.price * selected.length;
  const totalCombo = combo.reduce(
    (soma, linha) => soma + linha.quantity * linha.produto.price,
    0
  );
  const total = totalIngressos + totalCombo;
  const minutos = String(Math.floor(restanteMs / 60000)).padStart(2, "0");
  const segundos = String(Math.floor((restanteMs % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="compra">
      {/* O poster acompanha a compra: sem ele o modal abria so com titulo e
          mapa, e o filme -- que e o motivo da compra -- sumia da tela. */}
      <div className="compra-cabecalho">
        <div className="compra-poster">
          <Poster url={event.posterUrl} titulo={event.title} />
        </div>

        <div className="compra-dados">
          <p className="muted small">
            {event.location} — {new Date(event.date).toLocaleString("pt-BR")}
          </p>

          {event.description && (
            <p className="muted small sinopse">{event.description}</p>
          )}

          <p>
            <span className="price">R$ {event.price.toFixed(2)}</span>{" "}
            <span className="muted small">por ingresso</span>
            {"  ·  "}
            <span className="muted small">
              {event.available} de {event.capacity} poltronas livres
            </span>
          </p>
        </div>
      </div>

      {erro && <p className="error">{erro}</p>}

      <SeatMap
        seats={seats}
        selected={selected}
        onToggle={alternarAssento}
        disabled={ocupado || etapa !== ETAPA.ESCOLHENDO}
      />

      <div className="checkout-box">
        {etapa === ETAPA.ESCOLHENDO && (
          <>
            {selected.length === 0 ? (
              <p className="muted">Escolha suas poltronas no mapa acima.</p>
            ) : (
              <p>
                {selected.length} poltrona(s): <strong>{selected.join(", ")}</strong>
                <br />
                Total: <span className="price">R$ {total.toFixed(2)}</span>
              </p>
            )}

            <button disabled={ocupado || selected.length === 0} onClick={reservar}>
              {ocupado ? "Reservando..." : "Reservar assentos"}
            </button>
          </>
        )}

        {etapa === ETAPA.RESERVADO && (
          <>
            <p>
              Poltronas reservadas: <strong>{selected.join(", ")}</strong>
            </p>
            <p>
              Tempo para concluir:{" "}
              <span className="hold-timer">
                {minutos}:{segundos}
              </span>
            </p>

            {/* A lojinha fica entre a reserva e o pagamento, de proposito: e
                o momento em que a pessoa ja decidiu ir ao cinema e ainda nao
                pagou. Sem passo extra de navegacao, para nao gastar o
                cronometro da reserva. */}
            {cardapio && (
              <details className="combo-caixa" open>
                <summary>
                  Complete seu combo
                  {totalCombo > 0 && (
                    <span className="price"> +R$ {totalCombo.toFixed(2)}</span>
                  )}
                </summary>

                <Combo cardapio={cardapio} linhas={combo} onChange={setCombo} />
              </details>
            )}

            {combo.length > 0 && (
              <ul className="combo-resumo">
                {combo.map((linha) => (
                  <li key={`${linha.productId}-${linha.option ?? ""}`}>
                    {linha.quantity}x {linha.produto.name}
                    {linha.option && (
                      <em className="muted small">
                        {" "}
                        —{" "}
                        {
                          cardapio.opcoesPipoca.find(
                            (o) => o.valor === linha.option
                          )?.rotulo
                        }
                      </em>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="total-final">
              Total:{" "}
              <span className="price">R$ {total.toFixed(2)}</span>
              {totalCombo > 0 && (
                <span className="muted small">
                  {" "}
                  ({selected.length} ingresso(s) R$ {totalIngressos.toFixed(2)} +
                  loja R$ {totalCombo.toFixed(2)})
                </span>
              )}
            </p>

            <p className="muted small">
              Pagamento simulado: escolha o desfecho para testar os dois caminhos.
            </p>

            <div className="button-row">
              <button disabled={ocupado} onClick={() => pagar("approve")}>
                {ocupado ? "Processando..." : "Aprovar pagamento"}
              </button>
              <button
                className="secondary"
                disabled={ocupado}
                onClick={() => pagar("decline")}
              >
                Recusar pagamento
              </button>
            </div>
          </>
        )}

        {etapa === ETAPA.CONCLUIDO && (
          <>
            <p>
              Pagamento aprovado! {ingressos.length} ingresso(s) emitido(s).
              <br />
              Poltronas:{" "}
              <strong>{ingressos.map((i) => i.seatLabel).join(", ")}</strong>
            </p>

            <div className="button-row">
              <button onClick={() => navigate("/meus-ingressos")}>
                Ver meus ingressos
              </button>
              {onConcluido && (
                <button className="secondary" onClick={onConcluido}>
                  Fechar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
