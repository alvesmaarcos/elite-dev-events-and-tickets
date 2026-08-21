FROM node:20-alpine

# O Prisma precisa do OpenSSL para falar com o Postgres, e a imagem alpine
# nao traz por padrao. Sem esta linha o build ate passa, mas o "migrate
# deploy" falha com uma mensagem que nao menciona OpenSSL em momento nenhum.
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar so o package.json antes de instalar aproveita o cache do Docker: o
# npm install (lento) so roda de novo quando as DEPENDENCIAS mudam, e nao a
# cada alteracao de codigo.
COPY package.json ./
RUN npm install

COPY . .

# O "prisma generate" NAO conecta no banco -- ele so le o schema e escreve o
# client. Mas o prisma.config.ts usa env("DATABASE_URL"), que lanca erro se a
# variavel nao existir, e durante o build ela ainda nao existe.
#
# ARG (e nao ENV) resolve: o valor vale apenas durante a construcao da imagem
# e NAO fica no conteiner final, entao nao ha risco de mascarar a URL real
# que chega pelo ambiente em producao.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"

# prisma generate ANTES do build: o tsc precisa dos tipos gerados, senao a
# compilacao falha dizendo que nao encontra ../generated/prisma/client.
RUN npx prisma generate
RUN npm run build

EXPOSE 3333

# migrate deploy (nao "migrate dev"): aplica as migrations pendentes sem
# perguntar nada. O seed e idempotente, entao reiniciar nao duplica dados.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && node dist/index.js"]
