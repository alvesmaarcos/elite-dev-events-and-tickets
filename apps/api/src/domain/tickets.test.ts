import { describe, it, expect } from "vitest";
import { canCancelTicket, CancelableTicket } from "./tickets";

const AGORA = new Date("2026-01-01T12:00:00Z");

function ingresso(over: Partial<CancelableTicket> = {}): CancelableTicket {
  return {
    status: "VALID",
    eventDate: new Date("2026-01-05T20:00:00Z"),
    eventCanceledAt: null,
    ...over,
  };
}

describe("canCancelTicket", () => {
  it("permite cancelar com folga antes da sessao", () => {
    expect(canCancelTicket(ingresso(), AGORA).ok).toBe(true);
  });

  // Os dois testes a seguir sao de FRONTEIRA: regras com numero quase sempre
  // erram na borda (o classico "maior que" no lugar de "maior ou igual").
  it("permite cancelar faltando pouco mais de 2h", () => {
    const daqui3h = new Date("2026-01-01T15:00:00Z");
    expect(canCancelTicket(ingresso({ eventDate: daqui3h }), AGORA).ok).toBe(true);
  });

  it("recusa faltando menos de 2h", () => {
    const daqui1h = new Date("2026-01-01T13:00:00Z");
    const check = canCancelTicket(ingresso({ eventDate: daqui1h }), AGORA);

    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toContain("2h antes");
  });

  it("recusa quando a sessao ja aconteceu", () => {
    const ontem = new Date("2025-12-31T20:00:00Z");
    expect(canCancelTicket(ingresso({ eventDate: ontem }), AGORA).ok).toBe(false);
  });

  it("recusa ingresso que ja passou pela portaria", () => {
    expect(canCancelTicket(ingresso({ status: "USED" }), AGORA).ok).toBe(false);
  });

  it("recusa ingresso ja cancelado", () => {
    expect(canCancelTicket(ingresso({ status: "CANCELED" }), AGORA).ok).toBe(false);
  });

  it("recusa quando a sessao foi cancelada pelo organizador", () => {
    const check = canCancelTicket(ingresso({ eventCanceledAt: AGORA }), AGORA);

    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toContain("organizador");
  });
});
