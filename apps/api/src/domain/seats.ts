export interface SeatPosition {
  row: string;
  number: number;
  label: string;
}

const LETRA_A = "A".charCodeAt(0);

export function buildSeatGrid(rows: number, seatsPerRow: number): SeatPosition[] {
  const seats: SeatPosition[] = [];

  for (let r = 0; r < rows; r++) {
    const row = String.fromCharCode(LETRA_A + r);

    for (let n = 1; n <= seatsPerRow; n++) {
      seats.push({ row, number: n, label: `${row}${n}` });
    }
  }

  return seats;
}
