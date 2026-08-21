import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

/**
 * Copia texto para a area de transferencia.
 *
 * navigator.clipboard so existe em HTTPS ou localhost. Pelo IP da rede local
 * ele e undefined, entao mantemos o caminho antigo (textarea escondida +
 * execCommand) como reserva -- feio, porem e o que funciona em todo lugar.
 */
async function copiarParaAreaDeTransferencia(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }

    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const deuCerto = document.execCommand("copy");
    document.body.removeChild(campo);
    return deuCerto;
  } catch {
    return false;
  }
}

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
  // Guarda o id do ingresso recem-copiado, para dar retorno visual no botao.
  const [copiado, setCopiado] = useState(null);

  async function copiarLink(ingresso) {
    const link = `${window.location.origin}/ingresso/${ingresso.code}`;
    const deuCerto = await copiarParaAreaDeTransferencia(link);

    if (deuCerto) {
      setCopiado(ingresso.id);
      setTimeout(() => setCopiado(null), 2000);
    } else {
      setErro("Nao foi possivel copiar. O link e: " + link);
    }
  }

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
                {/* marginSize: a "zona de silencio", a borda branca ao redor
                    do codigo. O padrao da biblioteca e ZERO, e sem ela a
                    maioria dos leitores nao consegue localizar o QR -- por
                    mais nitida que a imagem esteja. A especificacao pede 4
                    modulos.

                    O tamanho tambem importa: sao 101 caracteres, o que gera
                    um codigo denso; espremido em 140px cada modulo ficava
                    com ~3px, praticamente ilegivel filmado por outra camera. */}
                <div className="qr-area"><QRCodeSVG
                  value={ingresso.qrPayload}
                  size={200}
                  marginSize={4}
                  level="L"
                /></div>

                <p className="seat-badge">Poltrona {ingresso.seatLabel}</p>
                <p className="muted small">
                  {rotuloStatus[ingresso.status] || ingresso.status}
                </p>

                <div className="ticket-acoes">
                  <Link className="botao" to={`/ingresso/${ingresso.code}`}>
                    Ver ingresso
                  </Link>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() => copiarLink(ingresso)}
                  >
                    {copiado === ingresso.id ? "Copiado!" : "Copiar link"}
                  </button>
                </div>

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
