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

export async function searchCatalog(query: string): Promise<CatalogItem[]> {
  if (!env.tmdbApiKey) {
    const termo = (query || "").trim().toLowerCase();
    if (!termo) return CATALOGO_MOCK;
    return CATALOGO_MOCK.filter((filme) =>
      filme.title.toLowerCase().includes(termo)
    );
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", query);
  url.searchParams.set("language", "pt-BR");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.tmdbApiKey}` },
  });

  if (!res.ok) throw new Error(`TMDb respondeu ${res.status}`);

  const data = (await res.json()) as { results?: TmdbMovie[] };

  return (data.results || []).slice(0, 10).map((filme) => ({
    externalId: String(filme.id),
    title: filme.title,
    posterUrl: filme.poster_path
      ? `https://image.tmdb.org/t/p/w500${filme.poster_path}`
      : null,
    overview: filme.overview || "",
  }));
}
