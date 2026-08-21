import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { SeatSelection } from "../components/SeatSelection";
import { FalhaAoCarregar } from "../components/FalhaAoCarregar";
import { AvisoDeEspera } from "../components/AvisoDeEspera";

/**
 * Pagina da sessao, para quem abre o link direto (/filmes/:id).
 *
 * A partir da lista de filmes o mesmo fluxo abre num modal -- mas a rota
 * continua existindo, porque um link compartilhado precisa funcionar.
 */
export function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [erro, setErro] = useState(null);

  function carregar() {
    if (!id) return;
    setErro(null);
    api.getEvent(id).then(setEvent).catch(setErro);
  }

  useEffect(carregar, [id]);

  if (erro) {
    return (
      <div className="page">
        <FalhaAoCarregar erro={erro} aoTentarDeNovo={carregar} />
      </div>
    );
  }

  // Sem o catch acima, esta linha era o fim da historia numa falha: a tela
  // ficava em "Carregando..." para sempre, sem dizer o que aconteceu.
  if (!event) {
    return (
      <div className="page">
        <p className="muted">Carregando...</p>
        <AvisoDeEspera />
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{event.title}</h1>

      <SeatSelection eventId={id} />
    </div>
  );
}
