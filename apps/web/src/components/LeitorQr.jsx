import { useEffect, useRef, useState } from "react";

/**
 * Leitura do QR do ingresso: camera, com digitacao manual como alternativa.
 *
 * Nasceu na portaria e virou componente quando a loja passou a ler o MESMO
 * codigo. As duas telas fazem perguntas diferentes ("pode entrar?" e "o que
 * esta pessoa comprou?"), mas a captura e identica -- e ela concentra os
 * detalhes chatos: camera traseira, area de leitura proporcional, lanterna,
 * limpeza do recurso ao sair.
 */
export function LeitorQr({ aoLer, ocupado, acao = "Consultar", acaoOcupado = "Consultando..." }) {
  const [codigo, setCodigo] = useState("");
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

  useEffect(() => {
    if (!camera) return undefined;
    let cancelado = false;

    // Importacao dinamica: a biblioteca so e baixada quando alguem clica em
    // "Ler com camera". Nao faz sentido todo cliente baixa-la ao abrir a
    // lista de filmes.
    import("html5-qrcode").then(({ Html5QrcodeScanner, Html5QrcodeSupportedFormats }) => {
      if (cancelado) return;

      const leitor = new Html5QrcodeScanner(
        "leitor-qr",
        {
          fps: 10,

          // No celular, sem isto a biblioteca costuma abrir a camera
          // FRONTAL -- apontada para o rosto de quem opera, e nao para o
          // ingresso do cliente. "environment" pede a traseira.
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

          // So procurar QR, em vez de tentar todos os formatos de codigo de
          // barras. Acelera bastante a deteccao -- o que importa quando o
          // QR esta na tela de outro celular, com brilho e reflexo.
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        },
        false
      );

      leitor.render(
        (texto) => {
          leitor.clear().catch(() => {});
          setCamera(false);
          aoLer(texto);
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

    // A camera e um recurso fisico: sem esta limpeza, a luz continua acesa
    // depois de sair da tela. A variavel "cancelado" cobre o caso de fechar a
    // camera enquanto a biblioteca ainda esta baixando.
    return () => {
      cancelado = true;
      if (leitorRef.current) {
        leitorRef.current.clear().catch(() => {});
        leitorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <>
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
          if (!codigo.trim()) return;
          aoLer(codigo.trim());
          setCodigo("");
        }}
      >
        <label>
          Codigo do ingresso
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </label>
        <button type="submit" disabled={ocupado}>
          {ocupado ? acaoOcupado : acao}
        </button>
      </form>
    </>
  );
}
