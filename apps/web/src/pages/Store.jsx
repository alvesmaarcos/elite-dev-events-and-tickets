import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { LeitorQr } from "../components/LeitorQr";
import { Modal } from "../components/Modal";

const estilo = {
  PEDIDO: "gate-ok",
  SEM_PEDIDO: "gate-alerta",
  REEMBOLSADO: "gate-alerta",
  INVALIDO: "gate-erro",
};

const rotulo = {
  PEDIDO: "Pedido encontrado",
  SEM_PEDIDO: "Sem itens da loja",
  REEMBOLSADO: "Compra cancelada",
  INVALIDO: "Codigo invalido",
};

export function Store() {
  const { session, token } = useAuth();

  const [pedido, setPedido] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroEntrega, setErroEntrega] = useState(null);

  async function consultar(valor) {
    setOcupado(true);
    setErroEntrega(null);
    try {
      setPedido(await api.lojaBuscarPedido(token, valor));
    } catch (e) {
      setPedido({ result: "INVALIDO", reason: e.message });
    } finally {
      setOcupado(false);
    }
  }

  async function entregar() {
    setOcupado(true);
    setErroEntrega(null);
    try {
      await api.lojaEntregarPedido(token, pedido.reservationId);
      // Recarrega o proprio pedido para a tela mostrar o estado real vindo do
      // servidor, em vez de uma versao otimista que pode divergir se outro
      // balcao tiver entregado no mesmo instante.
      setPedido({
        ...pedido,
        pendentes: 0,
        itens: pedido.itens.map((i) => ({
          ...i,
          entregueEm: i.entregueEm ?? new Date().toISOString(),
        })),
      });
    } catch (e) {
      setErroEntrega(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!session || session.role !== "STORE") {
    return <div className="page page-narrow">Area restrita a loja.</div>;
  }

  return (
    <div className="page page-narrow">
      <h1>Loja</h1>
      <p className="muted">
        Leia o QR do ingresso do cliente. E o mesmo codigo da portaria: quem
        comprou combo nao precisa guardar um segundo comprovante.
      </p>

      <LeitorQr aoLer={consultar} ocupado={ocupado} />

      {pedido && (
        <Modal
          titulo="Pedido da loja"
          onClose={() => setPedido(null)}
          largura={430}
        >
          <div className={`gate-result ${estilo[pedido.result] || "gate-erro"}`}>
            <strong>{rotulo[pedido.result] || pedido.result}</strong>

            {pedido.cliente && <p>{pedido.cliente}</p>}
            {pedido.sessao && (
              <p className="small">
                {pedido.sessao}
                {pedido.poltrona ? ` — poltrona ${pedido.poltrona}` : ""}
              </p>
            )}
            {pedido.reason && <p className="muted small">{pedido.reason}</p>}
          </div>

          {pedido.result === "PEDIDO" && (
            <>
              <ul className="lista-combo">
                {pedido.itens.map((item) => (
                  <li key={item.id} className={item.entregueEm ? "entregue" : ""}>
                    <span className="combo-qtd">{item.quantidade}x</span>
                    <span>
                      {item.nome}
                      {item.opcao && (
                        <em className="muted small"> — {item.opcao}</em>
                      )}
                    </span>
                    {item.entregueEm && (
                      <span className="muted small">entregue</span>
                    )}
                  </li>
                ))}
              </ul>

              {erroEntrega && <p className="error">{erroEntrega}</p>}

              <div className="button-row">
                {pedido.pendentes > 0 ? (
                  <button type="button" disabled={ocupado} onClick={entregar}>
                    {ocupado ? "Registrando..." : "Entregar pedido"}
                  </button>
                ) : (
                  <p className="muted small">
                    Tudo deste pedido ja foi entregue.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="button-row">
            <button
              type="button"
              className="secondary"
              onClick={() => setPedido(null)}
            >
              Ler proximo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
