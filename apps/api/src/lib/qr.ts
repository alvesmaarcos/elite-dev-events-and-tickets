import crypto from "crypto";
import { env } from "../env";

export function generateTicketCode(): string {
  return crypto.randomUUID();
}

export function signCode(code: string, secret: string = env.qrSecret): string {
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

export function verifySignature(
  code: string,
  signature: string,
  secret: string = env.qrSecret
): boolean {
  const esperada = signCode(code, secret);

  const a = Buffer.from(esperada);
  const b = Buffer.from(signature);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

export function buildQrPayload(code: string, signature: string): string {
  return `${code}.${signature}`;
}

export function parseQrPayload(
  payload: string
): { code: string; signature: string } | null {
  const partes = payload.split(".");
  if (partes.length !== 2) return null;
  return { code: partes[0], signature: partes[1] };
}
