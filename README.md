# Elite Tickets

Plataforma de venda de ingressos para sessões de cinema, construída para o
**Desafio Elite Dev (Verzel)** em um prazo de 7 dias.

O organizador monta sessões a partir de filmes reais do catálogo da TMDb e
configura a própria sala; o cliente escolhe a poltrona num mapa, paga
(simulado) e recebe um ingresso com QR Code; a portaria valida o ingresso
pela câmera do celular, e cada ingresso só entra uma vez.

| Ambiente | Endereço |
| --- | --- |
| Aplicação (front-end) | https://elite-dev-events-and-tickets-web.vercel.app |
| API | https://elite-dev-events-and-tickets.onrender.com |

> A API está no plano gratuito do Render: se ficar um tempo sem acesso, ela
> hiberna e a **primeira** requisição pode levar até cerca de um minuto para
> responder.

---

## Índice

- [Como rodar](#como-rodar)
- [Contas de teste](#contas-de-teste)
- [Roteiro de avaliação](#roteiro-de-avaliação)
- [Como o projeto foi conduzido](#como-o-projeto-foi-conduzido)
- [Uso de IA](#uso-de-ia)
- [Decisões de projeto](#decisões-de-projeto)
- [Regras de negócio que o desafio não definiu](#regras-de-negócio-que-o-desafio-não-definiu)
- [Testes automatizados](#testes-automatizados)
- [Deploy](#deploy)
- [Melhorias depois do último módulo](#melhorias-depois-do-último-módulo)
- [O que ficou fora de escopo](#o-que-ficou-fora-de-escopo)

---

## Como rodar

### Pré-requisitos

- Node.js 20+
- Docker (para o banco)
- Uma chave da [TMDb](https://www.themoviedb.org/settings/api) — funciona
  tanto a *API Key* v3 quanto o *Read Access Token* v4; a aplicação detecta
  qual das duas foi configurada.

### Passo a passo

```bash
npm install
```

```bash
docker compose up -d db
```

Copie os arquivos de ambiente. Os exemplos já vêm com os valores de
desenvolvimento preenchidos — só falta colar a sua chave da TMDb em
`TMDB_API_KEY`, dentro de `apps/api/.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
cp apps/web/.env.example apps/web/.env
```

Crie o schema e as contas de teste:

```bash
npm run migrate --workspace apps/api
```

```bash
npm run seed --workspace apps/api
```

Suba os dois lados, em terminais separados:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

A aplicação fica em `http://localhost:5173` e a API em
`http://localhost:3333`.

Sem chave da TMDb a aplicação continua subindo: o catálogo cai em um conjunto
fixo de filmes de exemplo e a vitrine da página inicial fica sem pôsteres.

### Tudo em containers

```bash
cp .env.example .env    # a chave da TMDb, na raiz, para o compose repassar
```

```bash
docker compose up --build
```

Sobe Postgres, API e front-end (Nginx) juntos, nos mesmos endereços.

---

## Contas de teste

Criadas pelo seed. Senha de todas: `12345678`.

| Papel | E-mail | O que faz |
| --- | --- | --- |
| Organizador | `organizador@gmail.com` | publica sessões, edita, cancela, encerra e vê o relatório |
| Cliente | `cliente1@gmail.com` | compra ingresso, vê e cancela os próprios ingressos |
| Cliente | `cliente2@gmail.com` | serve para testar a disputa por poltrona |
| Portaria | `portaria@gmail.com` | valida ingressos na entrada |

Não existe cadastro aberto: os papéis são operacionais — quem trabalha no
cinema não se cadastra sozinho — e criar as contas pelo seed deixa a
avaliação direta, sem formulário intermediário.

---

## Roteiro de avaliação

O caminho mais curto para ver o sistema inteiro funcionando:

1. **Organizador** → *Painel* → escolha um filme em cartaz → *Adicionar
   sessão* → defina data, local, tamanho da sala e preço → *Publicar sessão*.
2. **Cliente 1** → *Em cartaz* → clique na sessão → marque poltronas →
   *Reservar* (o cronômetro de 2 minutos começa) → *Aprovar pagamento*.
3. **Cliente 2**, em outro navegador → tente as **mesmas poltronas** enquanto
   a reserva do cliente 1 está de pé: elas aparecem indisponíveis.
4. **Cliente 1** → *Meus ingressos* → *Ver ingresso*, e o QR Code aparece.
5. **Portaria** → *Portaria* → leia o QR pela câmera: **válido**. Leia o
   mesmo QR de novo: **já utilizado**.
6. **Organizador** → *Encerrar* a sessão → relatório com ingressos emitidos,
   clientes, validados, cancelados, quem não compareceu, ocupação e receita.

---

## Como o projeto foi conduzido

O prazo de 7 dias foi dividido de propósito, e não por acaso.

**Dias 1 a 3 — idealização.** Nenhuma linha de código de funcionalidade.
Esse tempo foi gasto lendo o documento do desafio, decidindo o nicho do
produto, escolhendo a stack, comparando as APIs externas disponíveis e
desenhando os fluxos de cada papel de usuário. A primeira versão deste
README nasceu aí: era um documento de decisões, escrito antes de existir
qualquer implementação.

**Dias 4 a 6 — funcionalidades.** Cada funcionalidade foi tratada como uma
fatia vertical: banco → back-end → tela → teste → commit. É o que o histórico
do repositório mostra — uma branch e um Pull Request por funcionalidade
(`feat-catalog`, `feat-room-seats`, `feat-temporary-hold`,
`feat-ticket-qrcode`, `feat-gate-user`, `feat-event-cancelling`), em vez de
commits organizados por camada técnica.

**Dia 7 — acabamento.** O último módulo obrigatório — *cancelamento de
eventos e ingressos* — fechou na noite do sexto dia, e logo depois veio o
primeiro deploy. A partir daí, tudo o que entrou foi **refatoração e
melhoria opcional**: coisas que o desafio não pedia, mas que considerei
importantes para o produto não parecer um protótipo. Estão listadas em
[Melhorias depois do último módulo](#melhorias-depois-do-último-módulo).

---

## Uso de IA

O desafio pede transparência sobre o uso de IA, então aqui está, sem
maquiagem: **usei IA de forma agêntica para desenvolver as funcionalidades**,
com o agente operando direto no repositório — lendo os arquivos, escrevendo
código, rodando os testes e navegando na aplicação para verificar o
resultado.

Como a divisão de trabalho funcionou na prática:

- **As decisões são minhas.** Stack, modelagem, fluxo de reserva, regras de
  negócio, o que entra e o que fica fora de escopo — tudo o que está na seção
  de decisões deste README foi decidido por mim, e várias dessas escolhas
  contrariaram a primeira sugestão que a IA havia dado.
- **Os primeiros módulos eu escrevi à mão.** Antes de delegar qualquer coisa,
  pedi um plano arquivo por arquivo e digitei o código eu mesmo. A stack
  tinha novidades para mim — Prisma 7 com driver adapter, Express 5 — e eu
  não queria revisar código de uma tecnologia que ainda não dominava.
- **Os módulos seguintes foram implementados agenticamente.** Com o padrão do
  projeto estabelecido, passei a especificar a funcionalidade (a regra, o
  fluxo, o comportamento de tela) e deixar o agente implementar de ponta a
  ponta.
- **A revisão e o teste manual são meus.** Todo módulo passou pelo navegador,
  nos três papéis de usuário, antes de virar commit. Vários problemas
  apareceram assim: QR ilegível pela câmera, tela em branco por um import
  quebrado, migration em tabela já populada.
- **O deploy foi feito por mim**, manualmente, nas plataformas descritas
  adiante.

O que eu **não** fiz: aceitar código gerado sem entender, nem deixar a IA
escolher a arquitetura. O desafio pede para evitar AI slop, e a forma que vir 
para assegurar isto é conseguir defender cada decisão que está no código.

---

## Decisões de projeto

> Esta seção nasceu no terceiro dia, antes da implementação. Mantive o texto
> original e marquei o que mudou depois, com o motivo: a evolução faz parte
> do que aconteceu.

### Back-end

NodeJS.
Porquê: pela conveniência de já utilizar React com JS no Front-End.

**O que mudou:** o back-end migrou para **TypeScript** ainda na montagem da
estrutura, antes da primeira funcionalidade. O back é onde estão as regras de
negócio — assentos, reservas, pagamento, papéis — e errar um tipo ali custa
caro; além disso o Prisma já gera os tipos a partir do schema, então o ganho
vinha quase de graça. O front-end continuou em JavaScript, porque nesta fase
ele é majoritariamente apresentação e a conversão não pagaria o tempo.

### Framework do back-end

Express.
Porquê: maior familiaridade, devido a projetos acadêmicos anteriores.

### API Externa

TMDb.
Porquê: o processo da Ticketmaster era verboso e a aprovação do cadastro
teria um custo de tempo que o prazo de 7 dias não me permitiria arriscar. A
TMDb liberava uma API Key instantaneamente após o cadastro. Além disso, a
documentação da TMDb me pareceu menos complexa de aprender e pesquisar.

### Fluxo de reserva de ingresso

Dentre as opções, mapa de assentos e quantidade de ingressos, escolhi
inicialmente **quantidade de ingressos**. O mapa de assentos exigiria uma
grade interativa e maior robustez no momento de controle de condições de
corrida, para evitar que duas ou mais pessoas tentem comprar o mesmo
ingresso, pois poderia ocorrer com alta frequência. Já no controle pela
quantidade de ingressos, esse problema seria raro, considerando que essas
condições de corrida poderiam ocorrer apenas no último ingresso de cada lote.

**O que mudou — e por quê:** entreguei **mapa de assentos**. Revi a decisão
quando percebi que o argumento que me fez recuar — a condição de corrida —
tinha uma solução conhecida e de escopo fechado: **reserva temporária mais
escrita condicional atômica**. Em vez de "ler e depois escrever", que abre a
janela para duas pessoas lerem "livre" ao mesmo tempo, a poltrona só é
marcada por um `UPDATE` com a condição de estar disponível dentro da própria
escrita: quem chega em segundo lugar atualiza zero linhas e recebe a recusa.
Com o risco resolvido, o que sobrava era o produto — escolher a poltrona
**é** a experiência de comprar ingresso de cinema, e entregar só um contador
de quantidade seria escolher o caminho mais fácil, não o melhor.

### Banco de Dados

PostgreSQL.
Porquê: é relacional e possuo bastante familiaridade e confiança para
utilizá-lo. Fácil de orquestrar utilizando Docker.

- **Mapeamento:** Prisma ORM, devido à praticidade.
- **Migrations versionadas:** cada funcionalidade trouxe a sua própria
  migration (`init_user`, `add_event`, `add_seat_and_room`, `add_seat_hold`,
  `add_reservation_and_ticket`, `add_cancellation`, `add_event_closing`), em
  vez de um `db push` que sobrescreve o schema sem deixar rastro. O histórico
  de migrations conta a mesma história que o histórico de commits.

### Organização do repositório

Monorepo com npm workspaces.
Apesar do desafio não ter mencionado este quesito, achei importante mencionar
qual a organização das pastas que escolhi seguir. Aqui o objetivo foi evitar
complexidade organizacional, devido à natureza do projeto.

```
apps/
  api/   Express + TypeScript + Prisma
    src/domain/   regras puras, sem banco e sem HTTP (é o que os testes cobrem)
    src/routes/   HTTP e transações
    src/lib/      TMDb, JWT, assinatura do QR
  web/   React + Vite (JavaScript)
```

A pasta `src/domain` existe por um motivo específico: as regras que precisam
de teste — grade de assentos, decisão da portaria, prazo de cancelamento —
ficam em funções puras, que recebem o "agora" e o estado como parâmetro. Dá
para testar "faltando uma hora para a sessão" sem esperar uma hora e sem
subir banco.

### Autenticação

JWT assinado, com o papel do usuário dentro do token.

Essa decisão não estava na versão inicial deste documento. A alternativa era
um cabeçalho simplificado com o id do usuário — mais rápido de escrever, e
que qualquer pessoa poderia forjar trocando o valor. Autenticação é um dos
poucos pontos do desafio em que "simplificação deliberada" e "falha óbvia"
ficam perto demais uma da outra, então preferi não deixar essa dúvida no ar.

### QR Code e validação na portaria

Esta é a parte que a primeira versão deste README deixou em aberto — "ainda
não planejei com clareza". Ficou assim:

O ingresso carrega um código e uma **assinatura HMAC-SHA256** gerada com um
segredo do servidor. A portaria lê o QR pela câmera (`html5-qrcode`), e o
back-end confere a assinatura antes de qualquer outra coisa: sem isso,
bastaria inventar um código e desenhar o QR correspondente para entrar. A
comparação é feita com `timingSafeEqual`, e não com `===`, para não vazar
informação pelo tempo de resposta.

A digitação manual do código continua disponível como alternativa, para o
caso de a câmera falhar ou o celular não dar permissão.

---

## Regras de negócio que o desafio não definiu

O documento do desafio descreve **o que** o sistema precisa fazer, mas deixa
em aberto uma quantidade grande de regras que só aparecem quando você tenta
usar o produto. Cada uma destas foi uma decisão minha.

**1. A reserva dura 2 minutos.** A poltrona fica segurada em nome do cliente
enquanto ele finaliza a compra, e o vencimento é conferido sob demanda — não
há job em segundo plano: ao carregar o mapa ou ao tentar segurar uma
poltrona, o back-end libera na hora o que já venceu. O número real de um
cinema seria mais perto de 5 minutos; escolhi 2 para quem for avaliar o
desafio não ficar esperando. É uma concessão consciente ao avaliador, não ao
usuário final.

**2. A reserva é tudo ou nada.** Se o cliente marca quatro poltronas e uma
delas foi tomada no meio do caminho, nenhuma é reservada. Reservar três de
quatro colocaria a pessoa numa decisão pior do que a que ela tinha antes de
clicar.

**3. A sala é dado da plataforma, não do catálogo.** A TMDb é um catálogo de
filmes, não de cinemas — ela não sabe nada sobre salas. Então o organizador
define **fileiras × poltronas por fileira** (por exemplo, 8 × 12 = 96
lugares) ao publicar a sessão. Pedir fileiras e colunas em vez de uma
capacidade total gera uma grade previsível, com poltronas identificadas por
`A1`, `B12` — a convenção que qualquer pessoa reconhece sem legenda.

**4. Disponibilidade é contada, nunca guardada.** Não existe coluna
`ingressos_restantes`. O número de poltronas livres é sempre uma contagem do
estado real dos assentos. Um contador denormalizado seria mais rápido e
começaria a mentir na primeira falha no meio de uma operação.

**5. Preço único por sessão.** Sem setores VIP nem meia-entrada: mais uma
dimensão de complexidade que não se paga dentro do prazo.

**6. O pagamento simulado tem um botão de recusa explícito.** Em vez de
sorteio ou de um "cartão mágico" documentado em algum canto, a tela oferece
*Aprovar* e *Recusar* lado a lado — quem avalia consegue reproduzir a recusa
na hora. A recusa não emite ingresso e devolve a poltrona.

**7. Editar a sessão depende de já ter havido venda.** Antes da primeira
venda, o organizador muda tudo, inclusive o tamanho da sala. Depois da
primeira venda, só data, local e descrição. Mudar preço ou encolher a sala
depois que alguém pagou quebraria a expectativa de quem comprou — a poltrona
dele poderia até deixar de existir. A regra protege o cliente, não o código.

**8. O cliente cancela até 2 horas antes da sessão.** A poltrona volta na
hora para o mapa, disponível para outra pessoa. Prazo curto de propósito: um
prazo de 24h deixaria poltronas num limbo de "vendidas, mas talvez não"
justamente perto da data.

**9. Cancelar a sessão inteira invalida os ingressos.** O organizador pode
cancelar; todos os ingressos daquela sessão deixam de valer, e a portaria
passa a recusá-los com a mensagem correspondente.

**10. A ordem das mensagens da portaria é uma decisão, não um acaso.** Quando
mais de um problema acontece ao mesmo tempo, a portaria mostra o mais útil
para quem está na fila: *sessão errada* vem antes de *sessão cancelada*, que
vem antes de *ingresso cancelado*, que vem antes de *já utilizado*. Existe um
teste automatizado só para travar essa ordem — se alguém reorganizar os `if`,
o teste quebra e obriga a decidir conscientemente.

**11. O ingresso vale uma entrada só.** A marcação de "utilizado" também é
uma escrita condicional: duas leituras simultâneas do mesmo QR não podem
liberar duas entradas.

**12. O ingresso tem link público de visualização.** Quem recebe o ingresso
compartilhado não precisa de conta para abrir — e o link continua valendo uma
entrada só.

**13. Sessão cancelada ou encerrada sai da vitrine.** Continua visível para o
organizador, no painel, com o estado marcado. Não faz sentido oferecer compra
de uma sessão que não vai acontecer.

**14. Cada papel entra pelo seu próprio começo.** Depois do login, o
organizador cai no painel, a portaria no leitor e o cliente na vitrine. A
portaria, aliás, nem vê a seção de filmes em cartaz: ela não compra ingresso.

---

## Testes automatizados

```bash
npm test --workspace apps/api
```

A cobertura é pequena e proposital: só os pontos onde um bug quebraria a
integridade do negócio, e não a aplicação inteira.

- **Grade de assentos** — 8 × 12 gera 96 poltronas rotuladas de `A1` a `H12`.
- **Concorrência** — duas pessoas disputando a mesma poltrona, reserva
  vencida tratada como livre, reserva parcial que precisa ser recusada.
- **Assinatura do QR** — código adulterado não pode passar.
- **Decisão da portaria** — todos os ramos, incluindo a ordem de precedência
  das mensagens.
- **Prazo de cancelamento** — o limite de 2 horas, com o "agora" injetado.

Testar UI ou casos triviais renderia muito menos dentro do mesmo prazo.

---

## Deploy

A aplicação está publicada, e **o deploy foi feito por mim**, à mão, em
ferramentas que eu já conhecia — foi justamente por conhecê-las que as
escolhi: o último dia do prazo não era hora de aprender plataforma nova.

| Parte | Plataforma | Como |
| --- | --- | --- |
| Front-end | **Vercel** | build do Vite, com `rewrites` para o SPA não dar 404 em rota interna |
| API | **Render** | Web Service a partir do `Dockerfile` |
| Banco | **Render** | Postgres gerenciado |

Detalhes que custaram tempo e ficam registrados:

- O `CORS_ORIGIN` da API precisa apontar para o domínio **fixo** de produção
  da Vercel, e não para a URL de um deployment específico — essa muda a cada
  publicação.
- O `Dockerfile` da API roda `prisma generate` durante o build, o que exige
  uma `DATABASE_URL` presente mesmo sem banco nenhum por perto; resolvido com
  um valor de placeholder via `ARG`, substituído em tempo de execução.
- A imagem base Alpine precisa de `openssl` instalado para o Prisma
  funcionar.

---

## Melhorias depois do último módulo

O módulo de *cancelamento de eventos e ingressos* fechou o escopo
obrigatório. Tudo o que vem abaixo entrou depois disso, no tempo que sobrou
do prazo, por decisão minha.

**Catálogo navegável para o organizador.** Antes, publicar uma sessão exigia
digitar os dados do filme. Agora o painel abre direto nos filmes **em cartaz**
da TMDb, numa grade de pôsteres com busca e *Mostrar mais* paginado — clicar
em *Adicionar sessão* já traz título, sinopse e pôster prontos.

**Fluxos em card flutuante.** Escolha de poltronas, criação de sessão e
resultado da validação da portaria passaram a acontecer em modal, sem tirar a
pessoa da página em que ela estava. O comportamento comum — fechar no ESC,
fechar no clique fora, travar a rolagem do fundo — ficou num componente só.

**Mapa de sala completo, com a tela embaixo.** A sala inteira passou a caber
na tela por mais larga que seja: o tamanho da poltrona é medido em JavaScript
a partir do espaço disponível. E a tela do cinema ganhou destaque na parte
inferior, na posição em que ela está numa sala de verdade.

**Ingresso mais utilizável.** O link cru do ingresso virou um botão *Ver
ingresso*, com *Copiar link* ao lado.

**Correção da leitura do QR pela câmera.** Foi o problema mais interessante
do projeto: o QR estava correto — extraí a matriz e decodifiquei fora do
navegador para ter certeza — mas nenhuma câmera lia. A causa era a **zona de
silêncio**: a biblioteca desenhava o código sem margem ao redor, e sobre o
fundo escuro do tema o leitor não conseguia delimitar os três quadrados
localizadores. A correção foi dar margem e área clara em volta do código.

**Encerramento de sessão e relatório final.** O organizador encerra a sessão
e vê o fechamento: ingressos emitidos, quantos clientes distintos compraram,
quantos foram validados na portaria, quantos foram cancelados, quantos não
compareceram, ocupação e receita. Ingresso cancelado é reembolsado, então não
entra na receita — e "clientes" conta pessoas, não ingressos.

**Página inicial.** A aplicação abria direto na lista de sessões, o que não
diz a ninguém o que o site é. Agora existe uma landing que explica o produto
em duas linhas e oferece as duas portas — entrar ou ver o que está em cartaz
— sobre uma parede de pôsteres reais da TMDb, servida por uma rota pública
com cache. Se a TMDb estiver fora do ar, o fundo fica liso e a página
continua de pé.

**Vocabulário do produto.** "Evento" era herança de um enunciado genérico. A
aplicação passou a falar em **filme** e **sessão**, do menu às mensagens de
erro da API. O banco continuou como está: renomear tabela não muda nada para
quem usa, e o custo cairia todo em risco de migration.

**Ajustes finais de interface.** A vitrine do cliente ganhou os mesmos cards
de pôster do painel do organizador, com substituto para o filme que não tem
imagem, e a portaria deixou de ver a seção de filmes em cartaz.

---

## O que ficou fora de escopo

Decisão explícita, não esquecimento:

- Setores de poltrona com preços diferentes (VIP, meia-entrada).
- Job ou cron ativo de limpeza de reservas vencidas — a checagem é sob
  demanda.
- Refresh token: o JWT expira e exige login novo.
- Cadastro aberto de usuários — os papéis são operacionais e vêm do seed.
- Nota fiscal, revenda entre usuários, aplicativo nativo, recuperação de
  senha e envio de ingresso por e-mail — itens que o próprio desafio coloca
  fora do escopo.
