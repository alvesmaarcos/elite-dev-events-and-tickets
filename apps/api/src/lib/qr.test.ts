import { describe, it, expect } from "vitest";
import {
  buildQrPayload,
  generateTicketCode,
  parseQrPayload,
  signCode,
  verifySignature,
} from "./qr";

const CHAVE = "chave-de-teste";

describe("assinatura do ingresso", () => {
  it("aceita a assinatura que ela mesma gerou", () => {
    const code = generateTicketCode();
    expect(verifySignature(code, signCode(code, CHAVE), CHAVE)).toBe(true);
  });

  it("recusa quando o codigo foi adulterado", () => {
    const assinatura = signCode("ingresso-original", CHAVE);
    expect(verifySignature("ingresso-forjado", assinatura, CHAVE)).toBe(false);
  });

  it("recusa uma assinatura inventada", () => {
    const code = generateTicketCode();
    expect(verifySignature(code, "assinatura-inventada", CHAVE)).toBe(false);
  });

  it("recusa assinatura feita com outra chave secreta", () => {
    const code = generateTicketCode();
    const assinaturaDoImpostor = signCode(code, "chave-do-atacante");

    expect(verifySignature(code, assinaturaDoImpostor, CHAVE)).toBe(false);
  });

  it("gera codigos diferentes a cada ingresso", () => {
    const codigos = new Set([
      generateTicketCode(),
      generateTicketCode(),
      generateTicketCode(),
    ]);

    expect(codigos.size).toBe(3);
  });
});

describe("formato do QR", () => {
  it("monta e desmonta o payload sem perder nada", () => {
    const payload = buildQrPayload("abc", "def");

    expect(payload).toBe("abc.def");
    expect(parseQrPayload(payload)).toEqual({ code: "abc", signature: "def" });
  });

  it("devolve null quando o formato nao bate", () => {
    expect(parseQrPayload("sem-ponto")).toBeNull();
    expect(parseQrPayload("pontos.demais.aqui")).toBeNull();
  });
});
