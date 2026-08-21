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

export const HOLD_DURATION_MS = 2 * 60 * 1000;

export type SeatStatusValue = "AVAILABLE" | "HELD" | "SOLD";

export interface SeatState {
  label: string;
  status: SeatStatusValue;
  holdExpiresAt: Date | null;
  holdByUserId: string | null;
}

export function isHoldExpired(seat: SeatState, now: Date): boolean {
  return (
    seat.status === "HELD" &&
    seat.holdExpiresAt !== null &&
    seat.holdExpiresAt.getTime() < now.getTime()
  );
}

export function sweepExpiredHolds(seats: SeatState[], now: Date): SeatState[] {
  return seats.map((assento) =>
    isHoldExpired(assento, now)
      ? { ...assento, status: "AVAILABLE" as const, holdExpiresAt: null, holdByUserId: null }
      : assento
  );
}


export function conflictingLabels(
  seats: SeatState[],
  requestedLabels: string[],
  userId: string,
  now: Date
): string[] {
  const atuais = sweepExpiredHolds(seats, now);
  const porLabel = new Map(atuais.map((assento) => [assento.label, assento]));

  const conflitos: string[] = [];

  for (const label of requestedLabels) {
    const assento = porLabel.get(label);

    if (!assento) {
      conflitos.push(label);
      continue;
    }

    const seguradaPorMim =
      assento.status === "HELD" && assento.holdByUserId === userId;

    const disponivel = assento.status === "AVAILABLE" || seguradaPorMim;

    if (!disponivel) conflitos.push(label);
  }

  return conflitos;
}
