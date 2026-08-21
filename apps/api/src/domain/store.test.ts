import { describe, it, expect } from "vitest";
import {
  OPCOES_PIPOCA,
  receitaDeProdutos,
  totalDoPedido,
  validarEscolha,
} from "./store";

describe("validarEscolha", () => {
  it("aceita refrigerante sem opcao", () => {
    expect(validarEscolha("REFRIGERANTE", null, 2)).toBeNull();
  });

  it("recusa refrigerante com opcao de pipoca", () => {
    expect(validarEscolha("REFRIGERANTE", "DOCE", 1)).toBe(
      "Este produto nao tem opcoes."
    );
  });

  it("exige a escolha do tipo de pipoca", () => {
    expect(validarEscolha("PIPOCA", null, 1)).toBe("Escolha o tipo da pipoca.");
  });

  it("aceita os tres tipos de pipoca previstos", () => {
    for (const opcao of OPCOES_PIPOCA) {
      expect(validarEscolha("PIPOCA", opcao, 1)).toBeNull();
    }
  });

  // A regra do enunciado: doce nao leva manteiga. Ela nao e checada por um
  // if -- a combinacao simplesmente nao existe na lista de opcoes, e este
  // teste trava isso: se alguem acrescentar "DOCE_COM_MANTEIGA", ele quebra.
  it("nao existe pipoca doce com manteiga", () => {
    expect(OPCOES_PIPOCA).not.toContain("DOCE_COM_MANTEIGA");
    expect(validarEscolha("PIPOCA", "DOCE_COM_MANTEIGA", 1)).toBe(
      "Tipo de pipoca invalido."
    );
  });

  it("recusa quantidade zero, negativa ou quebrada", () => {
    expect(validarEscolha("AGUA", null, 0)).toBe("Quantidade invalida.");
    expect(validarEscolha("AGUA", null, -3)).toBe("Quantidade invalida.");
    expect(validarEscolha("AGUA", null, 1.5)).toBe("Quantidade invalida.");
  });

  it("recusa um pedido absurdo de um item so", () => {
    expect(validarEscolha("CHOCOLATE", null, 21)).toBe(
      "Maximo de 20 unidades por item."
    );
  });
});

describe("totalDoPedido", () => {
  it("multiplica quantidade por preco e soma tudo", () => {
    expect(
      totalDoPedido([
        { quantity: 2, unitPrice: 12 },
        { quantity: 1, unitPrice: 24.5 },
      ])
    ).toBe(48.5);
  });

  it("pedido vazio custa zero", () => {
    expect(totalDoPedido([])).toBe(0);
  });
});

describe("receitaDeProdutos", () => {
  it("soma os combos das reservas que continuam de pe", () => {
    const receita = receitaDeProdutos([
      { ticketsAtivos: 2, itens: [{ quantity: 1, unitPrice: 24 }] },
      { ticketsAtivos: 1, itens: [{ quantity: 2, unitPrice: 12 }] },
    ]);

    expect(receita).toBe(48);
  });

  // Cancelou tudo: nao vai ao cinema, entao o combo foi reembolsado junto.
  it("ignora o combo de quem cancelou todos os ingressos", () => {
    const receita = receitaDeProdutos([
      { ticketsAtivos: 0, itens: [{ quantity: 3, unitPrice: 20 }] },
    ]);

    expect(receita).toBe(0);
  });

  // Cancelou parte: alguem da compra ainda vai, e a pipoca continua vendida.
  it("mantem o combo de quem cancelou so parte dos ingressos", () => {
    const receita = receitaDeProdutos([
      { ticketsAtivos: 1, itens: [{ quantity: 1, unitPrice: 18 }] },
    ]);

    expect(receita).toBe(18);
  });
});
