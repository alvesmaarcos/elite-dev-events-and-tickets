import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { CardsFantasma } from "../components/CardsFantasma";
import { FalhaAoCarregar } from "../components/FalhaAoCarregar";
import { AvisoDeEspera } from "../components/AvisoDeEspera";
import { LeitorQr } from "../components/LeitorQr";

const estilo = {
  VALIDO: "gate-ok",
  INVALIDO: "gate-erro",
  JA_UTILIZADO: "gate-alerta",
  EVENTO_ERRADO: "gate-alerta",
  CANCELADO: "gate-alerta",
  EVENTO_CANCELADO: "gate-alerta",
  EVENTO_ENCERRADO: "gate-alerta",
};

const rotulo = {
  VALIDO: "Ingresso valido — pode entrar",
  INVALIDO: "Ingresso invalido",
  JA_UTILIZADO: "Ingresso ja utilizado",
  EVENTO_ERRADO: "Ingresso de outra sessao",
  CANCELADO: "Ingresso cancelado",
  EVENTO_CANCELADO: "Sessao cancelada",
  EVENTO_ENCERRADO: "Sessao encerrada",
};

// A escolha da sessao sobrevive a um recarregamento: na porta o celular
// bloqueia, cai a rede, alguem atualiza a pagina -- e refazer a escolha a
// cada vez, com fila esperando, seria o pior momento possivel.
const CHAVE_SESSAO = "elite.portaria.sessao";

export function Gate() {
  const { session, token } = useAuth();

  const [sessoes, setSessoes] = useState([]);
  const [carregandoSessoes, setCarregandoSessoes] = useState(true);
  const [falhaSessoes, setFalhaSessoes] = useState(null);
  const [escolhida, setEscolhida] = useState(() => {
    const salva = localStorage.getItem(CHAVE_SESSAO);
    return salva ? JSON.parse(salva) : null;
  });

  const [metricas, setMetricas] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregarSessoes() {
    setCarregandoSessoes(true);
    setFalhaSessoes(null);
    try {
      const lista = await api.listEvents();
      setSessoes(lista);

      // A sessao guardada pode ter sido encerrada ou cancelada desde a ultima
      // vez. Se ela sumiu da lista aberta, a portaria precisa escolher outra
      // -- continuar validando para uma sessao que nao existe mais so
      // produziria recusas sem explicacao.
      setEscolhida((atual) =>
        atual && lista.some((ev) => ev.id === atual.id) ? atual : null
      );
    } catch (e) {
      setFalhaSessoes(e);
    } finally {
      setCarregandoSessoes(false);
    }
  }

  useEffect(() => {
    carregarSessoes();
  }, []);

  // A contagem da porta aparece assim que a sessao e escolhida, e nao so
  // depois da primeira leitura.
  useEffect(() => {
    if (!escolhida || !token) return;
    api
      .metricasDaPortaria(token, escolhida.id)
      .then(setMetricas)
      .catch(() => setMetricas(null));
  }, [escolhida, token]);

  function escolher(ev) {
    const resumo = {
      id: ev.id,
      title: ev.title,
      location: ev.location,
      date: ev.date,
    };
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(resumo));
    setEscolhida(resumo);
    setResultado(null);
  }

  function trocarSessao() {
    localStorage.removeItem(CHAVE_SESSAO);
    setEscolhida(null);
    setMetricas(null);
    setResultado(null);
    carregarSessoes();
  }

  async function validar(valor) {
    if (!valor.trim() || !escolhida) return;

    setOcupado(true);
    try {
      // O id da sessao vai SEMPRE junto: e ele que permite ao servidor
      // responder "este ingresso e de outro filme" em vez de liberar a
      // entrada de quem esta na porta errada.
      const r = await api.validarIngresso(token, valor.trim(), escolhida.id);
      setResultado(r);
      if (r.metricas) setMetricas(r.metricas);
    } catch (e) {
      setResultado({ result: "INVALIDO", reason: e.message });
    } finally {
      setOcupado(false);
    }
  }

  if (!session || session.role !== "GATE") {
    return <div className="page page-narrow">Area restrita a portaria.</div>;
  }

  // --- primeiro passo: de qual sessao e esta porta? ---
  if (!escolhida) {
    return (
      <div className="page page-narrow">
        <h1>Portaria</h1>
        <p className="muted">
          Escolha o filme desta entrada. Todo ingresso lido sera conferido
          contra essa sessao.
        </p>

        {carregandoSessoes && (
          <>
            <CardsFantasma quantidade={2} />
            <AvisoDeEspera />
          </>
        )}

        {!carregandoSessoes && falhaSessoes && (
          <FalhaAoCarregar erro={falhaSessoes} aoTentarDeNovo={carregarSessoes} />
        )}

        {!carregandoSessoes && !falhaSessoes && sessoes.length === 0 && (
          <p className="muted">
            Nenhuma sessao em cartaz no momento. Sessoes encerradas ou
            canceladas nao recebem publico.
          </p>
        )}

        <div className="lista-sessoes">
          {sessoes.map((ev) => (
            <button
              key={ev.id}
              type="button"
              className="sessao-opcao"
              onClick={() => escolher(ev)}
            >
              <strong>{ev.title}</strong>
              <span className="muted small">{ev.location}</span>
              <span className="muted small">
                {new Date(ev.date).toLocaleString("pt-BR")}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- segundo passo: ler os ingressos daquela sessao ---
  return (
    <div className="page page-narrow">
      <h1>Portaria</h1>

      {/* Fixo no alto: quem esta na porta precisa ver, sem pensar, para qual
          filme esta conferindo ingresso. */}
      <div className="portaria-sessao">
        <strong>{escolhida.title}</strong>
        <p className="muted small">
          {escolhida.location} —{" "}
          {new Date(escolhida.date).toLocaleString("pt-BR")}
        </p>

        {metricas && (
          <p className="portaria-contador">
            {metricas.validados} de {metricas.esperados} ingressos validados
          </p>
        )}

        <button type="button" className="link" onClick={trocarSessao}>
          Trocar sessao
        </button>
      </div>

      <LeitorQr aoLer={validar} ocupado={ocupado} acao="Validar" acaoOcupado="Validando..." />

      {/* O resultado aparece como card flutuante: quem trabalha na portaria
          olha de relance, com fila esperando. Um bloco grande no centro da
          tela e impossivel de nao ver, e fechar ja prepara a proxima leitura. */}
      {resultado && (
        <Modal
          titulo="Resultado da validacao"
          onClose={() => setResultado(null)}
          largura={430}
        >
          <div className={`gate-result ${estilo[resultado.result] || "gate-erro"}`}>
            <strong>{rotulo[resultado.result] || resultado.result}</strong>

            {resultado.result === "VALIDO" && resultado.seatLabel && (
              <p>Poltrona: {resultado.seatLabel}</p>
            )}

            {/* Na sessao errada, dizer "nao pode entrar" resolve metade do
                problema. A outra metade e dizer para onde a pessoa deve ir. */}
            {resultado.result !== "VALIDO" && resultado.ingressoDe && (
              <div className="gate-outra-sessao">
                <p className="small">Este ingresso e de:</p>
                <p>
                  <strong>{resultado.ingressoDe.title}</strong>
                </p>
                <p className="small">
                  {resultado.ingressoDe.location} —{" "}
                  {new Date(resultado.ingressoDe.date).toLocaleString("pt-BR")}
                </p>
                <p className="small">
                  Poltrona {resultado.ingressoDe.seatLabel}
                </p>
              </div>
            )}

            {resultado.usedAt && (
              <p className="small">
                Utilizado em {new Date(resultado.usedAt).toLocaleString("pt-BR")}
              </p>
            )}

            {/* A portaria nao entrega nada -- mas quem entra direto para a
                sala esquece a pipoca que ja pagou. O aviso vive aqui porque
                este e o unico momento em que a pessoa e abordada. */}
            {resultado.result === "VALIDO" && resultado.combo && (
              <div className="gate-combo">
                <p className="small">
                  <strong>Retirar na loja:</strong>
                </p>
                {resultado.combo.itens.map((item, i) => (
                  <p key={i} className="small">
                    {item.quantidade}x {item.nome}
                    {item.opcao ? ` (${item.opcao})` : ""}
                  </p>
                ))}
              </div>
            )}
            {resultado.reason && <p className="muted small">{resultado.reason}</p>}
          </div>

          {metricas && (
            <p className="muted small portaria-metricas">
              {metricas.validados} de {metricas.esperados} ingressos ja
              validados em {escolhida.title}.
            </p>
          )}

          <div className="button-row">
            <button type="button" onClick={() => setResultado(null)}>
              Validar proximo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
