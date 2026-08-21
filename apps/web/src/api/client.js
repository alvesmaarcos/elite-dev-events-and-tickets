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

  searchCatalog: (token, q) =>
    request(`/catalog/tmdb?q=${encodeURIComponent(q)}`, { token }),

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

};

