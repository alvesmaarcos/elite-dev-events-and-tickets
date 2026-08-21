import { useEffect, useRef, useState } from "react";

const ESPACO_ENTRE_POLTRONAS = 4; // px, precisa bater com o "gap" do CSS
const LARGURA_ROTULO_FILEIRA = 22; // px, o "A", "B"... a esquerda
const TAMANHO_MIN = 12;
const TAMANHO_MAX = 30;

function agruparPorFileira(seats) {
  const fileiras = new Map();

  for (const assento of seats) {
    if (!fileiras.has(assento.row)) fileiras.set(assento.row, []);
    fileiras.get(assento.row).push(assento);
  }

  return [...fileiras.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function SeatMap({ seats, selected, onToggle, disabled }) {
  const fileiras = agruparPorFileira(seats);

  // Quantas poltronas tem a fileira mais larga.
  const colunas = fileiras.reduce(
    (maior, [, assentos]) => Math.max(maior, assentos.length),
    0
  );

  const mapaRef = useRef(null);
  const [tamanhoPoltrona, setTamanhoPoltrona] = useState(TAMANHO_MAX);

  // Medimos a largura real do container e dividimos pelo numero de colunas.
  //
  // Fazer isso em CSS com porcentagem nao funciona: a poltrona ficaria em
  // relacao a fileira, que por sua vez se dimensiona pelo conteudo -- uma
  // dependencia circular que faz a sala vazar para fora da tela em salas
  // largas. Medindo em JS o calculo e deterministico.
  useEffect(() => {
    const elemento = mapaRef.current;
    if (!elemento || colunas === 0) return undefined;

    function medir() {
      const disponivel = elemento.clientWidth - LARGURA_ROTULO_FILEIRA;
      const bruto = Math.floor(
        (disponivel - colunas * ESPACO_ENTRE_POLTRONAS) / colunas
      );

      setTamanhoPoltrona(Math.max(TAMANHO_MIN, Math.min(TAMANHO_MAX, bruto)));
    }

    medir();

    // Recalcula quando a janela (ou o modal) muda de tamanho.
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [colunas]);

  return (
    <div
      className="seat-map"
      ref={mapaRef}
      style={{ "--tamanho-poltrona": `${tamanhoPoltrona}px` }}
    >
      <div className="seat-grid">
        {fileiras.map(([letra, assentos]) => (
          <div key={letra} className="seat-row">
            <span className="seat-row-label">{letra}</span>

            {assentos.map((assento) => {
              const seguradaPorOutro =
                assento.status === "HELD" && !assento.heldByMe;
              const indisponivel = assento.status === "SOLD" || seguradaPorOutro;
              const escolhido = selected.includes(assento.label);

              return (
                <button
                  type="button"
                  key={assento.label}
                  title={assento.label}
                  disabled={disabled || indisponivel}
                  className={`seat ${
                    escolhido
                      ? "seat-selected"
                      : indisponivel
                      ? "seat-unavailable"
                      : "seat-available"
                  }`}
                  onClick={() => onToggle(assento.label)}
                >
                  {assento.number}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* A tela fica ABAIXO das poltronas, como quem esta sentado na plateia
          enxerga: as fileiras do fundo no topo, a tela la na frente. */}
      <div className="tela">
        <div className="tela-barra" />
        <span className="tela-texto">TELA</span>
      </div>

      <div className="seat-legend">
        <span><i className="seat-swatch seat-available" /> Disponivel</span>
        <span><i className="seat-swatch seat-selected" /> Selecionado</span>
        <span><i className="seat-swatch seat-unavailable" /> Ocupado</span>
      </div>
    </div>
  );
}
