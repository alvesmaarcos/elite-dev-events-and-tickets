import { useEffect } from "react";

/**
 * Card flutuante sobre a pagina.
 *
 * Usado em tres lugares: escolha de poltronas (cliente), configuracao da
 * sessao (organizador) e resultado da validacao (portaria). Concentrar o
 * comportamento aqui evita repetir em cada tela as tres coisas que todo
 * modal precisa acertar: fechar no ESC, fechar no clique fora, e travar a
 * rolagem do fundo enquanto esta aberto.
 */
export function Modal({ titulo, onClose, children, largura = 640 }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", aoTeclar);

    // Sem isto, rolar dentro do modal "vaza" para a pagina de tras quando o
    // conteudo do modal acaba.
    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagemAnterior;
    };
  }, [onClose]);

  return (
    <div className="modal-fundo" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: largura }}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        // Sem o stopPropagation, clicar DENTRO do card subiria ate o fundo e
        // fecharia o modal.
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-topo">
          <h2>{titulo}</h2>
          <button
            type="button"
            className="modal-fechar"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="modal-corpo">{children}</div>
      </div>
    </div>
  );
}
