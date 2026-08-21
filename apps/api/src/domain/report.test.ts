import { describe, it, expect } from "vitest";
import { montarRelatorio, TicketDoRelatorio } from "./report";

const PRECO = 30;
const CAPACIDADE = 100;

function ingressos(...spec: [TicketDoRelatorio["status"], string][]): TicketDoRelatorio[] {
  return spec.map(([status, clientId]) => ({ status, clientId }));
}

describe("montarRelatorio", () => {
  it("conta emitidos, validados, cancelados e ausentes", () => {
    const r = montarRelatorio(
      ingressos(
        ["USED", "ana"],
        ["USED", "bia"],
        ["CANCELED", "caio"],
        ["VALID", "dora"]
      ),
      PRECO,
      CAPACIDADE
    );

    expect(r.ingressosEmitidos).toBe(4);
    expect(r.validados).toBe(2);
    expect(r.cancelados).toBe(1);
    expect(r.naoCompareceram).toBe(1);
  });

  it("conta clientes distintos, nao ingressos", () => {
    // Ana levou a familia: 3 poltronas, mas e UMA cliente.
    const r = montarRelatorio(
      ingressos(["USED", "ana"], ["USED", "ana"], ["USED", "ana"], ["USED", "bia"]),
      PRECO,
      CAPACIDADE
    );

    expect(r.ingressosEmitidos).toBe(4);
    expect(r.clientes).toBe(2);
  });

  it("nao conta cancelados na receita, porque foram reembolsados", () => {
    const r = montarRelatorio(
      ingressos(["USED", "ana"], ["VALID", "bia"], ["CANCELED", "caio"]),
      PRECO,
      CAPACIDADE
    );

    expect(r.ocupacao).toBe(2);
    expect(r.receita).toBe(60);
  });

  it("calcula a taxa de comparecimento sobre os ingressos que valiam", () => {
    // 3 validos no fim (2 usados + 1 ausente); o cancelado nao entra na conta.
    const r = montarRelatorio(
      ingressos(["USED", "ana"], ["USED", "bia"], ["VALID", "caio"], ["CANCELED", "dora"]),
      PRECO,
      CAPACIDADE
    );

    expect(r.taxaComparecimento).toBe(67);
  });

  it("evita divisao por zero quando tudo foi cancelado", () => {
    const r = montarRelatorio(ingressos(["CANCELED", "ana"]), PRECO, CAPACIDADE);

    expect(r.taxaComparecimento).toBe(0);
    expect(r.receita).toBe(0);
  });

  it("lida com sessao sem nenhum ingresso vendido", () => {
    const r = montarRelatorio([], PRECO, CAPACIDADE);

    expect(r.ingressosEmitidos).toBe(0);
    expect(r.clientes).toBe(0);
    expect(r.receita).toBe(0);
    expect(r.taxaComparecimento).toBe(0);
  });
});
