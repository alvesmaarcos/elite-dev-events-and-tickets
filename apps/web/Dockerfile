# --- etapa 1: compilar o React ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Variaveis do Vite sao embutidas no codigo DURANTE a compilacao, nao lidas
# em tempo de execucao. Por isso a URL da API entra como argumento de build
# -- defini-la so como variavel de ambiente do container nao teria efeito.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- etapa 2: servir os arquivos prontos ---
# O React nao roda no servidor: depois do build sao so arquivos estaticos, e
# o Node deixa de ser necessario. Partir do Nginx limpo e copiar apenas a
# pasta dist deixa a imagem final em dezenas de MB, em vez de centenas.
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
