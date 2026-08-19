import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 3333),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-trocar-em-producao",
  qrSecret: process.env.QR_SECRET || "dev-qr-secret-trocar-em-producao",
  tmdbApiKey: process.env.TMDB_API_KEY || "",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
