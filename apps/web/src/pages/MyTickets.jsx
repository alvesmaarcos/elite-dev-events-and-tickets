import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const rotuloStatus = {
  VALID: "Valido",
  USED: "Utilizado",
  CANCELED: "Cancelado",
};

const PRAZO_CANCELAMENTO_HORAS = 2;

// Esta checagem no front so serve para ESCONDER um botao que nao funcionaria.
// A regra de verdade e a do servidor: se as duas discordarem (relogio do
// usuario errado, por exemplo), quem manda e o back, e o cliente ve o motivo.
function podeCancelar(ingresso, dataDoEvento) {
  if (ingresso.status !== "VALID") return false;

  const horasRestantes =
    (new Date(dataDoEvento).getTime() - Date.now()) / (1000 * 60 * 60);

  return horasRestantes > PRAZO_CANCELAMENTO_HORAS;
}

export function MyTickets() {
  const { session, token } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [erro, setErro] = useState(null);

  function carregar() {
    if (token) api.meusIngressos(token).then(setReservas);
  }

  useEffect(carregar, [token]);

  async function cancelar(ticketId) {
    if (!window.confirm("Cancelar este ingresso? A poltrona voltara para o mapa."))
      return;

    setErro(null);
    try {
      await api.cancelarIngresso(token, ticketId);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!session) {
    return (
      <div className="page page-narrow">Faca login para ver seus ingressos.</div>
    );
  }

  return (
    <div className="page">
      <h1>Meus ingressos</h1>

      {erro && <p className="error">{erro}</p>}

      {reservas.length === 0 && (
        <p className="muted">Voce ainda nao tem ingressos.</p>
      )}

      {reservas.map((reserva) => (
        <section key={reserva.id}>
          <h3>{reserva.event.title}</h3>
          <p className="muted small">
            {reserva.event.location} —{" "}
            {new Date(reserva.event.date).toLocaleString("pt-BR")}
          </p>

          <div className="grid">
            {reserva.tickets.map((ingresso) => (
              <div key={ingresso.id} className="card ticket-card">
                {/* A seguranca toda foi feita no servidor: o front so desenha
                    o texto "codigo.assinatura" que a API ja montou. */}
                <QRCodeSVG value={ingresso.qrPayload} size={140} />

                <p className="seat-badge">Poltrona {ingresso.seatLabel}</p>
                <p className="muted small">
                  {rotuloStatus[ingresso.status] || ingresso.status}
                </p>

                {/* window.location.origin monta o link com o endereco atual:
                    funciona em localhost e no dominio publicado, sem mudar
                    nada. O onFocus seleciona tudo para copiar com um Ctrl+C. */}
                <input
                  readOnly
                  className="share-input"
                  value={`${window.location.origin}/ingresso/${ingresso.code}`}
                  onFocus={(e) => e.target.select()}
                />

                {podeCancelar(ingresso, reserva.event.date) && (
                  <button
                    className="danger"
                    style={{ marginTop: ".6rem" }}
                    onClick={() => cancelar(ingresso.id)}
                  >
                    Cancelar ingresso
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
