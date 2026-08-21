import { useState } from "react";

/**
 * Poster do filme, com o espaco garantido.
 *
 * Duas coisas podem dar errado: a sessao pode nao ter poster nenhum (nem
 * todo filme da TMDb tem imagem) ou a URL pode falhar na hora de carregar.
 * Nos dois casos o card precisa manter exatamente a mesma altura -- senao um
 * card sem imagem encolhe e desalinha a grade inteira. Por isso o substituto
 * ocupa o mesmo retangulo, com o titulo no lugar da arte.
 */
export function Poster({ url, titulo }) {
  const [falhou, setFalhou] = useState(false);

  if (!url || falhou) {
    return (
      <div
        className="filme-poster filme-poster-vazio"
        role="img"
        aria-label={`Sem poster para ${titulo}`}
      >
        <span>sem poster</span>
      </div>
    );
  }

  return (
    <img
      className="filme-poster"
      src={url}
      alt={`Poster de ${titulo}`}
      loading="lazy"
      // A imagem pode existir na hora em que a sessao foi criada e sumir
      // depois. Trocar pelo substituto e melhor do que deixar o icone de
      // imagem quebrada no meio da vitrine.
      onError={() => setFalhou(true)}
    />
  );
}
