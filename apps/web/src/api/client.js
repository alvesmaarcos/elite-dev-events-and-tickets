const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status}`);
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),

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

