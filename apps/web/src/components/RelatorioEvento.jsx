/**
 * Relatorio final da sessao, para o organizador.
 *
 * Recebe os numeros ja calculados pela API (ver domain/report.ts) e apenas
 * os apresenta -- nenhuma conta e refeita aqui, para nao existir uma segunda
 * versao da verdade divergindo da do servidor.
 */
export function RelatorioEvento({ dados }) {
  const {
    evento,
    ingressosEmitidos,
    clientes,
    validados,
    cancelados,
    naoCompareceram,
    ocupacao,
    capacidade,
    receita,
    taxaComparecimento,
  } = dados;

  return (
    <div>
      <p className="muted small">
        {evento.location} — {new Date(evento.date).toLocaleString("pt-BR")}
      </p>

      {evento.encerrado ? (
        <p className="muted small">
          Encerrada em {new Date(evento.closedAt).toLocaleString("pt-BR")}.
        </p>
      ) : (
        <p className="muted small">
          Sessao ainda aberta — os numeros podem mudar ate voce encerra-la.
        </p>
      )}

      <div className="relatorio-numeros">
        <div className="relatorio-item destaque">
          <strong>{validados}</strong>
          <span>validados na portaria</span>
        </div>
        <div className="relatorio-item">
          <strong>{ingressosEmitidos}</strong>
          <span>ingressos emitidos</span>
        </div>
        <div className="relatorio-item">
          <strong>{clientes}</strong>
          <span>{clientes === 1 ? "cliente" : "clientes"}</span>
        </div>
        <div className="relatorio-item">
          <strong>{cancelados}</strong>
          <span>cancelados</span>
        </div>
        <div className="relatorio-item">
          <strong>{naoCompareceram}</strong>
          <span>nao compareceram</span>
        </div>
        <div className="relatorio-item">
          <strong>{taxaComparecimento}%</strong>
          <span>comparecimento</span>
        </div>
      </div>

      <table className="relatorio-tabela">
        <tbody>
          <tr>
            <td>Ocupacao da sala</td>
            <td>
              {ocupacao} de {capacidade} poltronas
            </td>
          </tr>
          <tr>
            <td>Preco do ingresso</td>
            <td>R$ {evento.price.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Receita</td>
            <td>R$ {receita.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <p className="muted small">
        Ingressos cancelados foram reembolsados, entao nao entram na receita.
        "Nao compareceram" sao os que continuaram validos ate o fim e nunca
        passaram pela portaria.
      </p>
    </div>
  );
}
