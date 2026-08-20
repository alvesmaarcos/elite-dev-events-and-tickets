import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const rotuloStatus = {
  VALID: "Valido",
  USED: "Utilizado",
  CANCELED: "Cancelado",
};

export function MyTickets() {
  const { session, token } = useAuth();
  const [reservas, setReservas] = useState([]);

  useEffect(() => {
    if (token) api.meusIngressos(token).then(setReservas);
  }, [token]);

  if (!session) {
    return (
      <div className="page page-narrow">Faca login para ver seus ingressos.</div>
    );
  }

  return (
    <div className="page">
      <h1>Meus ingressos</h1>

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
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
