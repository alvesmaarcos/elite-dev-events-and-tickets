import { env } from "../env";

export interface CatalogItem {
  externalId: string;
  title: string;
  posterUrl: string | null;
  overview: string;
}

interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
}

const CATALOGO_MOCK: CatalogItem[] = [
  {
    externalId: "mock-1",
    title: "Filme 1",
    posterUrl: null,
    overview: "Descrição do filme 1.",
  },
  {
    externalId: "mock-2",
    title: "Filme 2",
    posterUrl: null,
    overview: "Descrição do filme 2.",
  },
  {
    externalId: "mock-3",
    title: "Filme 3",
    posterUrl: null,
    overview: "Descrição do filme 3.",
  },
];

/**
 * Uma "pagina" do catalogo. O organizador ve os primeiros filmes e pede mais
 * conforme rola a tela, entao a API precisa dizer nao so os itens, mas
 * tambem se ainda ha mais paginas depois desta.
 */
export interface CatalogPage {
  items: CatalogItem[];
  page: number;
  totalPages: number;
}

const POR_PAGINA_MOCK = 6;

export async function fetchCatalog(
  query: string,
  page: number
): Promise<CatalogPage> {
  const termo = (query || "").trim();
  const paginaAtual = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  if (!env.tmdbApiKey) {
    const filtrados = termo
      ? CATALOGO_MOCK.filter((filme) =>
          filme.title.toLowerCase().includes(termo.toLowerCase())
        )
      : CATALOGO_MOCK;

    const inicio = (paginaAtual - 1) * POR_PAGINA_MOCK;

    return {
      items: filtrados.slice(inicio, inicio + POR_PAGINA_MOCK),
      page: paginaAtual,
      totalPages: Math.max(1, Math.ceil(filtrados.length / POR_PAGINA_MOCK)),
    };
  }

  // Sem termo de busca, mostramos os filmes EM CARTAZ -- que e o catalogo
  // natural de quem vai montar sessoes de cinema. A busca continua servindo
  // para quem ja sabe qual filme quer.
  const caminho = termo ? "/search/movie" : "/movie/now_playing";

  const url = new URL(`https://api.themoviedb.org/3${caminho}`);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "BR");
  url.searchParams.set("page", String(paginaAtual));
  if (termo) url.searchParams.set("query", termo);

  // A TMDb oferece DUAS credenciais diferentes, e elas nao sao
  // intercambiaveis:
  //
  //   v3 "API Key"              -> 32 caracteres hexadecimais
  //                                vai como ?api_key= na URL
  //   v4 "API Read Access Token" -> um JWT longo, comeca com "eyJ"
  //                                vai no cabecalho Authorization: Bearer
  //
  // Mandar uma no lugar da outra devolve 401 "Invalid API key", sem dizer
  // que o problema e o FORMATO. Detectamos qual foi configurada e usamos do
  // jeito certo -- assim qualquer uma das duas funciona.
  const pareceTokenV4 = env.tmdbApiKey.startsWith("eyJ");

  const headers: Record<string, string> = { accept: "application/json" };

  if (pareceTokenV4) {
    headers.Authorization = `Bearer ${env.tmdbApiKey}`;
  } else {
    url.searchParams.set("api_key", env.tmdbApiKey);
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`TMDb respondeu ${res.status}: ${corpo.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: TmdbMovie[];
    page?: number;
    total_pages?: number;
  };

  return {
    items: (data.results || []).map((filme) => ({
      externalId: String(filme.id),
      title: filme.title,
      posterUrl: filme.poster_path
        ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
        : null,
      overview: filme.overview || "",
    })),
    page: data.page ?? paginaAtual,
    // A TMDb limita a navegacao a 500 paginas; nao adianta oferecer mais.
    totalPages: Math.min(data.total_pages ?? 1, 500),
  };
}
