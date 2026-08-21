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

  return (
    <div className="seat-map">
      <p className="tela-indicador">TELA</p>

      {fileiras.map(([letra, assentos]) => (
        <div key={letra} className="seat-row">
          <span className="seat-row-label">{letra}</span>

          {assentos.map((assento) => {
            const seguradaPorOutro = assento.status === "HELD" && !assento.heldByMe;
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

      <div className="seat-legend">
        <span><i className="seat-swatch seat-available" /> Disponivel</span>
        <span><i className="seat-swatch seat-selected" /> Selecionado</span>
        <span><i className="seat-swatch seat-unavailable" /> Ocupado</span>
      </div>
    </div>
  );
}
