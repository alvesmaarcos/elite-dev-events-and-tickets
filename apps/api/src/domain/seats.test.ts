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
