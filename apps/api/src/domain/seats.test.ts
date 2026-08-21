import { describe, it, expect } from "vitest";
import { buildSeatGrid } from "./seats";

describe("buildSeatGrid", () => {
  it("gera uma poltrona para cada posicao da sala", () => {
    expect(buildSeatGrid(8, 12)).toHaveLength(96);
  });

  it("nomeia as fileiras com letras e as poltronas com numeros", () => {
    const seats = buildSeatGrid(2, 3);

    expect(seats.map((s) => s.label)).toEqual([
      "A1", "A2", "A3",
      "B1", "B2", "B3",
    ]);
  });

  it("mantem fileira e numero separados, para o mapa poder ordenar", () => {
    const seats = buildSeatGrid(2, 2);

    expect(seats[0]).toEqual({ row: "A", number: 1, label: "A1" });
    expect(seats[3]).toEqual({ row: "B", number: 2, label: "B2" });
  });

  it("suporta uma sala minima de uma poltrona", () => {
    expect(buildSeatGrid(1, 1)).toEqual([{ row: "A", number: 1, label: "A1" }]);
  });
});



import {
  conflictingLabels,
  sweepExpiredHolds,
  SeatState,
} from "./seats";

function assento(over: Partial<SeatState> = {}): SeatState {
  return {
    label: "A1",
    status: "AVAILABLE",
    holdExpiresAt: null,
    holdByUserId: null,
    ...over,
  };
}

const AGORA = new Date("2026-01-01T10:00:00Z");
const DAQUI_A_POUCO = new Date("2026-01-01T10:01:00Z");
const JA_PASSOU = new Date("2026-01-01T09:59:00Z");

describe("conflictingLabels", () => {
  it("nao acusa conflito quando a poltrona esta livre", () => {
    expect(conflictingLabels([assento()], ["A1"], "user-1", AGORA)).toEqual([]);
  });

  it("acusa conflito quando outra pessoa esta segurando", () => {
    const seats = [
      assento({ status: "HELD", holdByUserId: "user-2", holdExpiresAt: DAQUI_A_POUCO }),
    ];

    expect(conflictingLabels(seats, ["A1"], "user-1", AGORA)).toEqual(["A1"]);
  });

  it("nao acusa conflito com a propria reserva (permite acrescentar poltronas)", () => {
    const seats = [
      assento({ status: "HELD", holdByUserId: "user-1", holdExpiresAt: DAQUI_A_POUCO }),
    ];

    expect(conflictingLabels(seats, ["A1"], "user-1", AGORA)).toEqual([]);
  });

  it("trata reserva vencida como poltrona livre", () => {
    const seats = [
      assento({ status: "HELD", holdByUserId: "user-2", holdExpiresAt: JA_PASSOU }),
    ];

    expect(conflictingLabels(seats, ["A1"], "user-1", AGORA)).toEqual([]);
  });

  it("acusa conflito quando a poltrona ja foi vendida", () => {
    const seats = [assento({ status: "SOLD" })];

    expect(conflictingLabels(seats, ["A1"], "user-1", AGORA)).toEqual(["A1"]);
  });

  it("acusa apenas as poltronas problematicas do pedido", () => {
    const seats = [
      assento({ label: "A1" }),
      assento({ label: "A2", status: "SOLD" }),
      assento({ label: "A3" }),
    ];

    expect(conflictingLabels(seats, ["A1", "A2", "A3"], "user-1", AGORA)).toEqual(["A2"]);
  });

  it("acusa conflito para poltrona que nao existe na sala", () => {
    expect(conflictingLabels([assento()], ["Z9"], "user-1", AGORA)).toEqual(["Z9"]);
  });
});

describe("sweepExpiredHolds", () => {
  it("libera as vencidas e preserva as validas", () => {
    const seats = [
      assento({ label: "A1", status: "HELD", holdByUserId: "u", holdExpiresAt: JA_PASSOU }),
      assento({ label: "A2", status: "HELD", holdByUserId: "u", holdExpiresAt: DAQUI_A_POUCO }),
      assento({ label: "A3", status: "SOLD" }),
    ];

    const resultado = sweepExpiredHolds(seats, AGORA);

    expect(resultado[0]).toMatchObject({ status: "AVAILABLE", holdByUserId: null });
    expect(resultado[1]).toMatchObject({ status: "HELD" });
    expect(resultado[2]).toMatchObject({ status: "SOLD" });
  });

  it("nao altera a lista original", () => {
    const seats = [
      assento({ status: "HELD", holdByUserId: "u", holdExpiresAt: JA_PASSOU }),
    ];

    sweepExpiredHolds(seats, AGORA);

    expect(seats[0].status).toBe("HELD");
  });
});
