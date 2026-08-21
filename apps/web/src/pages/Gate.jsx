import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const estilo = {
  VALIDO: "gate-ok",
  INVALIDO: "gate-erro",
  JA_UTILIZADO: "gate-alerta",
  EVENTO_ERRADO: "gate-alerta",
};

const rotulo = {
  VALIDO: "Ingresso valido — pode entrar",
  INVALIDO: "Ingresso invalido",
  JA_UTILIZADO: "Ingresso ja utilizado",
  EVENTO_ERRADO: "Ingresso de outra sessao",
};

export function Gate() {
  const { session, token } = useAuth();

  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [camera, setCamera] = useState(false);
  const leitorRef = useRef(null);

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
        { fps: 10, qrbox: 220 },
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
        Leia o QR pela camera, ou cole abaixo o codigo do ingresso (tambem
        funciona colar o link de compartilhamento inteiro).
      </p>

      <div className="button-row">
        <button onClick={() => setCamera((v) => !v)}>
          {camera ? "Fechar camera" : "Ler com camera"}
        </button>
      </div>

      {camera && <div id="leitor-qr" className="leitor-qr" />}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          validar(codigo);
        }}
      >
        <label>
          Codigo ou link do ingresso
          <input
            value={codigo}
            placeholder="921e784c-... ou http://.../ingresso/921e784c-..."
            onChange={(e) => setCodigo(e.target.value)}
          />
        </label>
        <button type="submit" disabled={ocupado}>
          {ocupado ? "Validando..." : "Validar"}
        </button>
      </form>

      {resultado && (
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
      )}
    </div>
  );
}
