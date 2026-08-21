import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SeatMap } from "../components/SeatMap";

const ETAPA = { ESCOLHENDO: "escolhendo", RESERVADO: "reservado" };

export function EventDetail() {
  const { id } = useParams();
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
  const intervaloRef = useRef(null);

  function carregarMapa() {
    if (id) api.getSeats(id, token).then(setSeats);
  }

  useEffect(() => {
    if (!id) return;
    api.getEvent(id).then(setEvent);
    api.getSeats(id, token).then(setSeats);
  }, [id, token]);

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
      const dados = await api.holdSeats(token, id, selected);
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

  async function liberar() {
    setOcupado(true);
    try {
      await api.releaseSeats(token, id, selected);
    } finally {
      setEtapa(ETAPA.ESCOLHENDO);
      setSelected([]);
      setErro(null);
      setOcupado(false);
      carregarMapa();
    }
  }

  if (!event) return <div className="page">Carregando...</div>;

  const total = event.price * selected.length;
  const minutos = String(Math.floor(restanteMs / 60000)).padStart(2, "0");
  const segundos = String(Math.floor((restanteMs % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="page page-narrow">
      <h1>{event.title}</h1>
      <p className="muted">
        {event.location} — {new Date(event.date).toLocaleString("pt-BR")}
      </p>

      <p className="price">R$ {event.price.toFixed(2)} por ingresso</p>
      <p className="muted small">
        {event.available} de {event.capacity} poltronas disponiveis
      </p>

      {erro && <p className="error">{erro}</p>}

      <SeatMap
        seats={seats}
        selected={selected}
        onToggle={alternarAssento}
        disabled={ocupado || etapa === ETAPA.RESERVADO}
      />

      <div className="checkout-box">
        {etapa === ETAPA.ESCOLHENDO && (
          <>
            {selected.length === 0 ? (
              <p className="muted">Escolha suas poltronas no mapa.</p>
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
              <br />
              Total: <span className="price">R$ {total.toFixed(2)}</span>
            </p>
            <p>
              Tempo para concluir:{" "}
              <span className="hold-timer">{minutos}:{segundos}</span>
            </p>
            <p className="muted small">
              O pagamento entra na proxima sprint.
            </p>

            <button className="secondary" disabled={ocupado} onClick={liberar}>
              Liberar poltronas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
