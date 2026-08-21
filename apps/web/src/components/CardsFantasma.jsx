/**
 * Cards vazios no formato dos cards de verdade, enquanto a lista carrega.
 *
 * Melhor que a palavra "Carregando..." por dois motivos: a pagina ja nasce
 * com o layout final, entao nada pula de lugar quando os dados chegam, e a
 * espera fica com uma forma reconhecivel em vez de uma tela quase em branco.
 */
export function CardsFantasma({ quantidade = 5 }) {
  return (
    <div className="filmes-grid" aria-hidden="true">
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className="filme-card fantasma">
          <div className="filme-poster fantasma-bloco" />
          <div className="filme-info">
            <div className="fantasma-linha fantasma-bloco" />
            <div className="fantasma-linha curta fantasma-bloco" />
          </div>
        </div>
      ))}
    </div>
  );
}
