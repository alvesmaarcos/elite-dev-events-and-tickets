import { ErroDeRede } from "../api/client";

/**
 * O que aparece quando a tela nao conseguiu carregar seus dados.
 *
 * Existe porque a alternativa era pior: sem tratamento, uma falha de rede
 * deixava a vitrine dizendo "nenhum filme em cartaz" e a pagina da sessao
 * presa em "carregando" para sempre. As duas mentem sobre o que aconteceu --
 * e a segunda nem oferece saida.
 */
export function FalhaAoCarregar({ erro, aoTentarDeNovo }) {
  const semServidor = erro instanceof ErroDeRede;

  return (
    <div className="falha-carregar">
      <p>
        {semServidor
          ? "Nao consegui falar com o servidor."
          : "Nao consegui carregar esta pagina."}
      </p>

      {semServidor ? (
        <p className="muted small">
          Ele pode estar hibernando (o plano gratuito derruba o servico depois
          de um tempo sem acesso). Tentar de novo costuma resolver.
        </p>
      ) : (
        <p className="muted small">{erro?.message}</p>
      )}

      {aoTentarDeNovo && (
        <button type="button" className="secondary" onClick={aoTentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}
