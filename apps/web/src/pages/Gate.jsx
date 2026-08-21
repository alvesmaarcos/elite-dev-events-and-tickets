import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Modal } from "../components/Modal";

const estilo = {
  VALIDO: "gate-ok",
  INVALIDO: "gate-erro",
  JA_UTILIZADO: "gate-alerta",
  EVENTO_ERRADO: "gate-alerta",
  CANCELADO: "gate-alerta",
  EVENTO_CANCELADO: "gate-alerta",
};

const rotulo = {
  VALIDO: "Ingresso valido — pode entrar",
  INVALIDO: "Ingresso invalido",
  JA_UTILIZADO: "Ingresso ja utilizado",
  EVENTO_ERRADO: "Ingresso de outra sessao",
  CANCELADO: "Ingresso cancelado",
  EVENTO_CANCELADO: "Sessao cancelada",
};

export function Gate() {
  const { session, token } = useAuth();

  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [camera, setCamera] = useState(false);
  const [erroCamera, setErroCamera] = useState(null);
  const leitorRef = useRef(null);

  // A camera do navegador so funciona em HTTPS ou em localhost. Acessando
  // pelo IP da rede (http://192.168.x.x) ela nao abre, e o erro que o
  // navegador da nao explica isso -- entao avisamos antes.
  const contextoSeguro =
    typeof window !== "undefined" &&
    (window.isSecureContext ||
      ["localhost", "127.0.0.1"].includes(window.location.hostname));

  async function validar(valor) {
    if (!valor.trim()) return;

    setOcupado(true);
    try {
      setResultado(await api.validarIngresso(token, valor.trim()));
    } catch (e) {
      setResultado({ result: "INVALIDO", reason: e.message });
    } finally {
      setOcupado(false);
      setCodigo("");
    }
  }

  useEffect(() => {
    if (!camera) return undefined;
    let cancelado = false;

    // Importacao dinamica: a biblioteca so e baixada quando alguem clica em
    // "Ler com camera". Nao faz sentido todo cliente baixa-la ao abrir a
    // lista de eventos.
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelado) return;

      const leitor = new Html5QrcodeScanner(
        "leitor-qr",
        {
          fps: 10,

          // No celular, sem isto a biblioteca costuma abrir a camera
          // FRONTAL -- apontada para o rosto de quem esta na portaria, e
          // nao para o ingresso do cliente. "environment" pede a traseira.
          videoConstraints: { facingMode: "environment" },

          // Area de leitura proporcional a tela, em vez de 220px fixos: num
          // celular estreito o quadrado fixo pode ficar maior que o video.
          qrbox: (larguraVideo, alturaVideo) => {
            const menorLado = Math.min(larguraVideo, alturaVideo);
            const lado = Math.floor(menorLado * 0.75);
            return { width: lado, height: lado };
          },

          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true, // lanterna, util na entrada a noite
        },
        false
      );

      leitor.render(
        (texto) => {
          leitor.clear().catch(() => {});
          setCamera(false);
          validar(texto);
        },
        () => {}
      );

      leitorRef.current = leitor;
    }).catch((e) => {
      // Sem isto, uma falha ao carregar a biblioteca deixa a tela em branco
      // no lugar do leitor, sem nenhuma pista do motivo.
      setErroCamera("Nao foi possivel abrir o leitor: " + e.message);
      setCamera(false);
    });

    // A camera e um recurso fisico: sem esta limpeza, a luz da webcam
    // continua acesa depois de sair da tela. A variavel "cancelado" cobre o
    // caso de fechar a camera enquanto a biblioteca ainda esta baixando.
    return () => {
      cancelado = true;
      if (leitorRef.current) {
        leitorRef.current.clear().catch(() => {});
        leitorRef.current = null;
      }
    };
  }, [camera]);

  if (!session || session.role !== "GATE") {
    return <div className="page page-narrow">Area restrita a portaria.</div>;
  }

  return (
    <div className="page page-narrow">
      <h1>Portaria</h1>
      <p className="muted">
        Leia o QR pela camera ou digite o codigo do ingresso.
      </p>

      <div className="button-row">
        <button
          onClick={() => {
            setErroCamera(null);
            setCamera((v) => !v);
          }}
          disabled={!contextoSeguro}
        >
          {camera ? "Fechar camera" : "Ler com camera"}
        </button>
      </div>

      {!contextoSeguro && (
        <p className="muted small">
          A camera exige HTTPS. Acessando pelo IP da rede local ela nao abre —
          use o endereco publicado (https://) ou digite o codigo abaixo.
        </p>
      )}

      {erroCamera && <p className="error">{erroCamera}</p>}

      {camera && <div id="leitor-qr" className="leitor-qr" />}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          validar(codigo);
        }}
      >
        <label>
          Codigo do ingresso
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </label>
        <button type="submit" disabled={ocupado}>
          {ocupado ? "Validando..." : "Validar"}
        </button>
      </form>

      {/* O resultado aparece como card flutuante: quem trabalha na portaria
          olha de relance, com fila esperando. Um bloco grande no centro da
          tela e impossivel de nao ver, e fechar ja prepara a proxima leitura. */}
      {resultado && (
        <Modal
          titulo="Resultado da validacao"
          onClose={() => setResultado(null)}
          largura={430}
        >
          <div className={`gate-result ${estilo[resultado.result] || "gate-erro"}`}>
            <strong>{rotulo[resultado.result] || resultado.result}</strong>
            {resultado.event && <p>Sessao: {resultado.event}</p>}
            {resultado.seatLabel && <p>Poltrona: {resultado.seatLabel}</p>}
            {resultado.usedAt && (
              <p className="small">
                Utilizado em {new Date(resultado.usedAt).toLocaleString("pt-BR")}
              </p>
            )}
            {resultado.reason && <p className="muted small">{resultado.reason}</p>}
          </div>

          <div className="button-row">
            <button type="button" onClick={() => setResultado(null)}>
              Validar proximo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
