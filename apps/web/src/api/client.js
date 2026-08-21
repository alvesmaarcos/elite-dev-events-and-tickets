const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

/**
 * A requisicao nao chegou ao servidor: rede fora, API dormindo, CORS.
 *
 * Precisa ser distinguivel de um erro de negocio, senao a tela mostra a
 * mensagem errada -- foi o que acontecia no login, que dizia "e-mail ou
 * senha invalidos" quando o problema era o servidor nao responder.
 */
export class ErroDeRede extends Error {
  constructor() {
    super("Nao foi possivel falar com o servidor.");
    this.name = "ErroDeRede";
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  let res;

  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch so rejeita quando a resposta nao chega. Qualquer status HTTP,
    // inclusive 500, passa direto por aqui e cai na checagem abaixo.
    throw new ErroDeRede();
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const erro = new Error(data?.error || `Erro ${res.status}`);
    // O status acompanha o erro para a tela poder reagir a ele: 401 no login
    // e "senha errada", 401 em qualquer outro lugar e "sua sessao venceu".
    erro.status = res.status;
    throw erro;
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

  // Posteres da vitrine da pagina inicial. Rota publica: quem chega no site
  // ainda nao tem conta.
  vitrine: () => request("/catalog/showcase"),

  listEvents: (q) =>
    request(`/events${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  
  getEvent: (id) => 
    request(`/events/${id}`),

  myEvents: (token) => 
    request("/events/mine/list", { token }),

  createEvent: (token, payload) =>
    request("/events", { method: "POST", body: payload, token }),

  // Sem "q" a API devolve os filmes EM CARTAZ; com "q", o resultado da
  // busca. Nos dois casos vem paginado: { items, page, totalPages }.
  catalogo: (token, q, page = 1) =>
    request(
      `/catalog/tmdb?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      { token }
    ),

  getSeats: (eventId, token) =>
  request(`/events/${eventId}/seats`, token ? { token } : {}),

  holdSeats: (token, eventId, seatLabels) =>
    request(`/events/${eventId}/seats/hold`, {
      method: "POST",
      body: { seatLabels },
      token,
    }),

  releaseSeats: (token, eventId, seatLabels) =>
    request(`/events/${eventId}/seats/release`, {
      method: "POST",
      body: { seatLabels },
      token,
    }),
    
    confirmarPagamento: (token, eventId, seatLabels, outcome) =>
      request("/reservations", {
        method: "POST",
        body: { eventId, seatLabels, outcome },
        token,
      }),

    meusIngressos: (token) => request("/reservations/mine", { token }),

    // --- portaria ---
    validarIngresso: (token, payload, eventId) =>
      request("/gate/validate", {
        method: "POST",
        body: { payload, eventId },
        token,
      }),

    metricasDaPortaria: (token, eventId) =>
      request(`/gate/metricas/${eventId}`, { token }),

    // publica: quem recebeu o link compartilhado nao tem conta
    ingressoCompartilhado: (code) => request(`/tickets/share/${code}`),

    // --- cancelamento e gestao ---
    cancelarIngresso: (token, ticketId) =>
      request(`/tickets/${ticketId}/cancel`, { method: "POST", token }),

    atualizarEvento: (token, eventId, payload) =>
      request(`/events/${eventId}`, { method: "PATCH", body: payload, token }),

    cancelarEvento: (token, eventId) =>
      request(`/events/${eventId}/cancel`, { method: "POST", token }),

    encerrarEvento: (token, eventId) =>
      request(`/events/${eventId}/close`, { method: "POST", token }),

    relatorioDoEvento: (token, eventId) =>
      request(`/events/${eventId}/report`, { token }),

};

