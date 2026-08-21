import { useState } from "react";

// Pipoca primeiro: e o item ancora da bomboniere, e o unico que exige uma
// escolha. O resto desce em ordem de quanto costuma sair junto.
const ORDEM = ["PIPOCA", "REFRIGERANTE", "AGUA", "CHOCOLATE"];

const TITULO = {
  PIPOCA: "Pipocas",
  REFRIGERANTE: "Refrigerantes",
  AGUA: "Aguas",
  CHOCOLATE: "Chocolates",
};

function chave(productId, option) {
  return `${productId}::${option ?? ""}`;
}

/**
 * A lojinha dentro do checkout.
 *
 * As linhas do pedido sao guardadas por produto + opcao, e nao so por
 * produto: quem quer uma pipoca doce e uma salgada esta pedindo duas coisas
 * diferentes, e o balcao precisa ler assim.
 */
export function Combo({ cardapio, linhas, onChange }) {
  // Qual opcao esta selecionada AGORA em cada produto com opcoes. E so estado
  // de tela: o que vale e o que ja foi para as linhas do pedido.
  const [opcaoAtual, setOpcaoAtual] = useState({});

  function opcaoDe(produto) {
    if (produto.category !== "PIPOCA") return null;
    return opcaoAtual[produto.id] ?? cardapio.opcoesPipoca[0].valor;
  }

  function quantidadeDe(produto) {
    const linha = linhas.find(
      (l) => chave(l.productId, l.option) === chave(produto.id, opcaoDe(produto))
    );
    return linha ? linha.quantity : 0;
  }

  function ajustar(produto, delta) {
    const option = opcaoDe(produto);
    const k = chave(produto.id, option);

    const existente = linhas.find((l) => chave(l.productId, l.option) === k);
    const nova = Math.max(0, (existente?.quantity ?? 0) + delta);

    // Zerar remove a linha em vez de guardar quantidade 0: o pedido que sai
    // daqui e exatamente o que vai para a API.
    if (nova === 0) {
      onChange(linhas.filter((l) => chave(l.productId, l.option) !== k));
      return;
    }

    if (existente) {
      onChange(
        linhas.map((l) =>
          chave(l.productId, l.option) === k ? { ...l, quantity: nova } : l
        )
      );
      return;
    }

    onChange([
      ...linhas,
      { productId: produto.id, option, quantity: nova, produto },
    ]);
  }

  return (
    <div className="combo">
      {ORDEM.filter((categoria) =>
        cardapio.products.some((p) => p.category === categoria)
      ).map((categoria) => (
        <div key={categoria} className="combo-grupo">
          <h4>{TITULO[categoria]}</h4>

          {cardapio.products
            .filter((p) => p.category === categoria)
            .map((produto) => {
              const quantidade = quantidadeDe(produto);

              return (
                <div key={produto.id} className="combo-item">
                  <div className="combo-descricao">
                    <span>{produto.name}</span>
                    <span className="price small">
                      R$ {produto.price.toFixed(2)}
                    </span>

                    {produto.category === "PIPOCA" && (
                      <select
                        value={opcaoDe(produto)}
                        onChange={(e) =>
                          setOpcaoAtual({
                            ...opcaoAtual,
                            [produto.id]: e.target.value,
                          })
                        }
                      >
                        {cardapio.opcoesPipoca.map((opcao) => (
                          <option key={opcao.valor} value={opcao.valor}>
                            {opcao.rotulo}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="combo-controle">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => ajustar(produto, -1)}
                      disabled={quantidade === 0}
                      aria-label={`Tirar um ${produto.name}`}
                    >
                      −
                    </button>
                    <span className="combo-quantidade">{quantidade}</span>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => ajustar(produto, 1)}
                      aria-label={`Adicionar um ${produto.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
