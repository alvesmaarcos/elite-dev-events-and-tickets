import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api/client";

const rotuloStatus = {
  VALID: "Valido",
  USED: "Utilizado",
  CANCELED: "Cancelado",
};

// Repare que esta tela NAO usa useAuth: ela e publica de proposito, porque
// quem recebeu o link nao tem conta no sistema.
export function SharedTicket() {
  const { code } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    api
      .ingressoCompartilhado(code)
      .then(setDados)
      .catch(() => setErro(true));
  }, [code]);

  if (erro) {
    return <div className="page page-narrow">Ingresso nao encontrado.</div>;
  }

  if (!dados) {
    return <div className="page page-narrow">Carregando...</div>;
  }

  return (
    <div className="page page-narrow" style={{ textAlign: "center" }}>
      <h1>{dados.eventTitle}</h1>
      <p className="muted">
        {dados.location} — {new Date(dados.eventDate).toLocaleString("pt-BR")}
      </p>

      <div
        className="card ticket-card"
        style={{ maxWidth: 300, margin: "1.5rem auto" }}
      >
        {/* Esta e a tela que o cliente costuma apresentar na portaria, entao
            o codigo aqui e o maior de todos. marginSize=4 e a zona de
            silencio exigida pela especificacao (o padrao da lib e zero). */}
        <div className="qr-area"><QRCodeSVG
          value={dados.qrPayload}
          size={240}
          marginSize={4}
          level="L"
        /></div>
        <p className="seat-badge">Poltrona {dados.seatLabel}</p>
        <p className="muted small">
          {rotuloStatus[dados.status] || dados.status}
        </p>
      </div>

      <p className="muted small">Apresente este QR na entrada.</p>
    </div>
  );
}
