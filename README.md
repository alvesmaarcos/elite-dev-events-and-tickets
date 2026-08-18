# Decisões de projeto


## Back-End
NodeJS com JavaScript.
Porquê: Pela conveniência de já utilizar React com JS no Front-End.


## Framework do back-end
Express
Porquê: Maior familiaridade, devido a projetos acadêmicos anteriores.


## API Externa
TMDb
Porquê: O processo da Ticketmaster era verboso e a aprovação do cadastro teria um custo de tempo que o prazo de 7 dias não me permitiria arriscar. TMDb liberava uma APIKEY instantâneamente após o cadastro. Além disso, a documentação do TMDb me pareceu menos complexa de aprender e pesquisar.


## Fluxo de reserva de ingresso
Dentre as opções, mapa de assentos e quantidade de ingressos, escolhi quantidade de ingressos.
O mapa de assentos exigiria uma grade interativa e maior robustez no momento de controle de condições de corrida, para evitar que duas ou mais pessoas tentem comprar o mesmo ingresso, pois poderia ocorrer com alta frequência. Já no controle pela quantidade de ingressos, esse problema seria rado, considerando que essas condições de corrida poderiam ocorrer apenas no último ingressso de cada lote.
<br>
- Sendo assim, por questões de otimização e prazo, o fluxo escolhido foi <b>quantidade de ingressos<b>

## Banco de Dados
PostgreSQL
Porquê: É relacional e possuo bastante familiaridade e confiança para utilizá-lo. Fácil de orquestrar utilizando Docker.
- Mapeamento: Prisma ORM, devido à praticidade.

## Organização do repositório
Monorepo com npm workspaces.
Apesar do desafio não ter mencionado este quesito, achei importante mencionar qual a organização das pastas que escolhi seguir. Aqui o objetivo foi evitar complexidade organizacional, devido à natureza do projeto.

## A decidir e planejar
Ainda não planejei com clareza como ocorrerá o fluxo de geração do QR Code do cliente e a validação da portaria.
