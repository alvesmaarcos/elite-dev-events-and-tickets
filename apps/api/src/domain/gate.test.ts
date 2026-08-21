import { describe, it, expect } from "vitest";
import { decideGateResult, GateTicketInput } from "./gate";

function ingresso(over: Partial<GateTicketInput> = {}): GateTicketInput {
  return {
    status: "VALID",
    usedAt: null,
    eventId: "evento-1",
    eventCanceledAt: null,
    eventClosedAt: null,
    ...over,
  };
}

describe("decideGateResult", () => {
  it("libera um ingresso valido da sessao correta", () => {
    expect(decideGateResult(ingresso(), "evento-1").result).toBe("VALIDO");
  });

  it("libera quando a portaria nao informa a sessao", () => {
    expect(decideGateResult(ingresso()).result).toBe("VALIDO");
  });

  it("recusa ingresso de outra sessao", () => {
    expect(decideGateResult(ingresso(), "evento-2").result).toBe("EVENTO_ERRADO");
  });

  it("recusa ingresso que ja passou, informando quando", () => {
    const quando = new Date("2026-01-01T20:14:00Z");

    const decisao = decideGateResult(
      ingresso({ status: "USED", usedAt: quando }),
      "evento-1"
    );

    expect(decisao.result).toBe("JA_UTILIZADO");
    expect(decisao.usedAt).toEqual(quando);
  });

  // Este teste fixa a ORDEM das conferencias. Se alguem reorganizar os if da
  // funcao, ele quebra e obriga a decidir conscientemente qual mensagem e
  // mais util para quem esta na fila.
  it("avisa sobre a sessao errada antes de avisar que ja foi usado", () => {
    const decisao = decideGateResult(
      ingresso({ status: "USED", usedAt: new Date() }),
      "evento-2"
    );

    expect(decisao.result).toBe("EVENTO_ERRADO");
  });
});

describe("decideGateResult com cancelamentos", () => {
  it("recusa ingresso cancelado pelo cliente", () => {
    expect(decideGateResult(ingresso({ status: "CANCELED" }), "evento-1").result)
      .toBe("CANCELADO");
  });

  it("recusa quando a sessao inteira foi cancelada", () => {
    expect(decideGateResult(ingresso({ eventCanceledAt: new Date() }), "evento-1").result)
      .toBe("EVENTO_CANCELADO");
  });

  // Ordem: quem esta na fila precisa saber que a sessao caiu, e nao achar
  // que o problema e do ingresso dele em particular.
  it("avisa da sessao cancelada antes de avisar do ingresso cancelado", () => {
    const decisao = decideGateResult(
      ingresso({ status: "CANCELED", eventCanceledAt: new Date() }),
      "evento-1"
    );

    expect(decisao.result).toBe("EVENTO_CANCELADO");
  });

  it("evento errado continua tendo prioridade sobre tudo", () => {
    const decisao = decideGateResult(
      ingresso({ status: "CANCELED", eventCanceledAt: new Date() }),
      "evento-2"
    );

    expect(decisao.result).toBe("EVENTO_ERRADO");
  });
});

describe("decideGateResult com sessao encerrada", () => {
  it("recusa quando o organizador ja encerrou a sessao", () => {
    expect(decideGateResult(ingresso({ eventClosedAt: new Date() }), "evento-1").result)
      .toBe("EVENTO_ENCERRADO");
  });

  it("sessao cancelada tem prioridade sobre sessao encerrada", () => {
    const decisao = decideGateResult(
      ingresso({ eventCanceledAt: new Date(), eventClosedAt: new Date() }),
      "evento-1"
    );
    expect(decisao.result).toBe("EVENTO_CANCELADO");
  });
});
