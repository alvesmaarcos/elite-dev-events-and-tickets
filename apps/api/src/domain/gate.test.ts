import { describe, it, expect } from "vitest";
import { decideGateResult, GateTicketInput, normalizeGateInput } from "./gate";

const CODIGO = "921e784c-fc7f-478f-bc0d-b1516b85db27";
const ASSINATURA = "0e8b78801122334455667788990011223344556677889900112233445566778899";

describe("normalizeGateInput", () => {
  it("deixa passar o codigo digitado a mao", () => {
    expect(normalizeGateInput(CODIGO)).toBe(CODIGO);
  });

  it("preserva o formato codigo.assinatura vindo da camera", () => {
    const payload = `${CODIGO}.${ASSINATURA}`;
    expect(normalizeGateInput(payload)).toBe(payload);
  });

  it("extrai o codigo quando colam o link de compartilhamento", () => {
    expect(normalizeGateInput(`http://localhost:5173/ingresso/${CODIGO}`)).toBe(CODIGO);
  });

  it("funciona com o link do dominio publicado (https)", () => {
    expect(normalizeGateInput(`https://elite-tickets.vercel.app/ingresso/${CODIGO}`)).toBe(CODIGO);
  });

  it("ignora barra no fim, query e fragmento", () => {
    expect(normalizeGateInput(`http://localhost:5173/ingresso/${CODIGO}/`)).toBe(CODIGO);
    expect(normalizeGateInput(`http://localhost:5173/ingresso/${CODIGO}?x=1`)).toBe(CODIGO);
    expect(normalizeGateInput(`http://localhost:5173/ingresso/${CODIGO}#topo`)).toBe(CODIGO);
  });

  it("remove espacos colados por acidente", () => {
    expect(normalizeGateInput(`   ${CODIGO}  `)).toBe(CODIGO);
  });

  it("devolve vazio quando nao veio nada util", () => {
    expect(normalizeGateInput("   ")).toBe("");
  });
});

function ingresso(over: Partial<GateTicketInput> = {}): GateTicketInput {
  return { status: "VALID", usedAt: null, eventId: "evento-1", ...over };
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
