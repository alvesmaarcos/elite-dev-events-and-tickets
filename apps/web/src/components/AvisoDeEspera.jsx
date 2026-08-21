import { useEffect, useState } from "react";

/**
 * Explica a espera longa, mas so quando ela acontece.
 *
 * A API esta no plano gratuito do Render, que hiberna: a PRIMEIRA
 * requisicao depois de um tempo parado pode levar quase um minuto. Sem
 * explicacao, quem abre o site acha que esta quebrado.
 *
 * O aviso nao aparece de imediato de proposito -- numa resposta rapida ele
 * so piscaria na tela e deixaria a impressao de lentidao que nao existe.
 */
export function AvisoDeEspera({ apos = 3000 }) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMostrar(true), apos);
    return () => clearTimeout(id);
  }, [apos]);

  if (!mostrar) return null;

  return (
    <p className="muted small aviso-espera">
      O servidor gratuito hiberna quando fica sem acesso. A primeira resposta
      pode levar ate um minuto.
    </p>
  );
}
